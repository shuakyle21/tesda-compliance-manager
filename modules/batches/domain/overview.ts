/**
 * Cross-school overview (admin landing) — pure domain logic, no I/O.
 *
 * The one place batches from several schools are read together. Per-school
 * figures use the same `deriveDashboardMetrics` / `attentionItems` rules the
 * school dashboard uses, so the overview and a school's own dashboard cannot
 * disagree about that school. Totals across schools are allowed only where the
 * UI states their population ("across N schools").
 *
 * Filters only ever select among the batches and schools the caller was
 * already handed (RLS decided those); an unknown value means "All", never an
 * error and never a wider read.
 */

import { attentionItems, type AttentionItem } from './attention';
import { deriveDashboardMetrics } from './metrics';
import type { Batch, DashboardMetrics } from '@/shared/types';

export interface SchoolRef {
  tenantId: string;
  code: string;
  name: string;
}

export interface SchoolSummary {
  school: SchoolRef;
  metrics: DashboardMetrics;
  attention: AttentionItem[];
  urgent: number;
  /** Batches still recorded as ongoing after their recorded training end date. */
  pastTrainingEnd: number;
}

export interface SchoolException {
  school: SchoolRef;
  item: AttentionItem;
}

/**
 * A recorded contradiction, not an inferred deadline: the batch is still
 * `ongoing` but its recorded training end date has passed. No end date → false.
 */
export function isPastTrainingEnd(batch: Batch, todayIso: string): boolean {
  return batch.status === 'ongoing' && batch.trainingEnd !== '' && batch.trainingEnd.slice(0, 10) < todayIso;
}

/** One summary per school the caller belongs to — schools with no batches included, so none silently drops out. */
export function schoolSummaries(batches: readonly Batch[], schools: readonly SchoolRef[], todayIso: string): SchoolSummary[] {
  return schools
    .map((school) => {
      const own = batches.filter((b) => b.tenantId === school.tenantId);
      const attention = attentionItems(own, { syncFailed: false });
      return {
        school,
        metrics: deriveDashboardMetrics(own),
        attention,
        urgent: attention.filter((item) => item.severity === 'urgent').length,
        pastTrainingEnd: own.filter((b) => isPastTrainingEnd(b, todayIso)).length,
      };
    })
    // Most urgent school first, then most open items, then name for a stable order.
    .sort((a, b) => b.urgent - a.urgent || b.attention.length - a.attention.length || a.school.name.localeCompare(b.school.name));
}

/**
 * Every school's open items, labelled with their school: urgent before due,
 * otherwise in school order and each school's own queue order (stable sort).
 */
export function crossSchoolQueue(summaries: readonly SchoolSummary[]): SchoolException[] {
  return summaries
    .flatMap((summary) => summary.attention.map((item) => ({ school: summary.school, item })))
    .sort((a, b) => Number(b.item.severity === 'urgent') - Number(a.item.severity === 'urgent'));
}

// ---------------------------------------------------------------------------
// Filters — school, scholarship program, qualification.
// ---------------------------------------------------------------------------

export interface OverviewFilters {
  /** School code. */
  school: string | null;
  program: string | null;
  qualification: string | null;
}

export interface OverviewFilterOptions {
  schools: SchoolRef[];
  programs: string[];
  qualifications: string[];
}

/** Schools type their own titles, so "NC II" and "nc ii " must be one choice, not two. */
function norm(value: string): string {
  return value.trim().toLowerCase();
}

/** Distinct by trimmed, case-insensitive value; the first spelling seen is the label. */
function distinct(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    if (value.trim() && !seen.has(norm(value))) seen.set(norm(value), value.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** The choices each filter offers: the caller's schools, and the programs and qualifications present in their batches. */
export function overviewFilterOptions(batches: readonly Batch[], schools: readonly SchoolRef[]): OverviewFilterOptions {
  return {
    schools: [...schools].sort((a, b) => a.name.localeCompare(b.name)),
    programs: distinct(batches.map((b) => b.program)),
    qualifications: distinct(batches.map((b) => b.qualification)),
  };
}

/** First value, trimmed, matched case-insensitively to an offered option; anything else is `null` ("All"). */
function pick(raw: string | string[] | undefined, allowed: readonly string[]): string | null {
  const value = norm((Array.isArray(raw) ? raw[0] : raw) ?? '');
  if (!value) return null;
  return allowed.find((option) => norm(option) === value) ?? null;
}

export function parseOverviewFilters(
  params: Record<string, string | string[] | undefined>,
  options: OverviewFilterOptions,
): OverviewFilters {
  return {
    school: pick(params.school, options.schools.map((s) => s.code)),
    program: pick(params.program, options.programs),
    qualification: pick(params.qualification, options.qualifications),
  };
}

export function hasActiveFilters(filters: OverviewFilters): boolean {
  return filters.school !== null || filters.program !== null || filters.qualification !== null;
}

/**
 * Narrows batches and schools to the filters. The school filter keeps that one
 * school. A program or qualification filter drops schools left with no
 * matching batch and counts them, so the table can say how many were hidden.
 */
export function applyOverviewFilters(
  batches: readonly Batch[],
  schools: readonly SchoolRef[],
  filters: OverviewFilters,
): { batches: Batch[]; schools: SchoolRef[]; hiddenSchools: number } {
  const inScope = filters.school ? schools.filter((s) => s.code === filters.school) : [...schools];
  const tenantIds = new Set(inScope.map((s) => s.tenantId));
  const matching = batches.filter((b) =>
    tenantIds.has(b.tenantId)
    && (filters.program === null || norm(b.program) === norm(filters.program))
    && (filters.qualification === null || norm(b.qualification) === norm(filters.qualification)));

  if (filters.program === null && filters.qualification === null) {
    return { batches: matching, schools: inScope, hiddenSchools: 0 };
  }
  const withMatches = new Set(matching.map((b) => b.tenantId));
  const shown = inScope.filter((s) => withMatches.has(s.tenantId));
  return { batches: matching, schools: shown, hiddenSchools: inScope.length - shown.length };
}

// ---------------------------------------------------------------------------
// Stage distribution — where the batches stand.
// ---------------------------------------------------------------------------

export interface StageCount {
  key: string;
  label: string;
  count: number;
}

/**
 * Batches counted once each by where they stand: blocked, completed, or their
 * active lifecycle stage. Every lifecycle stage is listed (a real zero is
 * data); Blocked, Completed and "Stage not recorded" appear only when counted.
 */
export function stageDistribution(batches: readonly Batch[]): StageCount[] {
  const template = batches.find((b) => b.lifecycle.length > 0)?.lifecycle ?? [];
  const stages: StageCount[] = template.map((stage) => ({ key: stage.key, label: stage.label, count: 0 }));
  const extra = { blocked: 0, completed: 0, unrecorded: 0 };

  for (const batch of batches) {
    const active = batch.lifecycle.find((stage) => stage.status === 'active');
    const row = active && stages.find((stage) => stage.key === active.key);
    // Every stage done is a recorded completion even if `status` lags behind it.
    const allDone = batch.lifecycle.length > 0 && batch.lifecycle.every((stage) => stage.status === 'done');
    if (batch.blocked) extra.blocked += 1;
    else if (batch.status === 'completed' || allDone) extra.completed += 1;
    else if (row) row.count += 1;
    else extra.unrecorded += 1;
  }

  return [
    ...stages,
    ...(extra.blocked ? [{ key: 'blocked', label: 'Blocked', count: extra.blocked }] : []),
    ...(extra.completed ? [{ key: 'completed', label: 'Completed', count: extra.completed }] : []),
    ...(extra.unrecorded ? [{ key: 'unrecorded', label: 'Stage not recorded', count: extra.unrecorded }] : []),
  ];
}
