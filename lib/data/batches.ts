/**
 * FOUNDATIONAL EXAMPLE — real batch data via the generated Supabase contract.
 *
 * This is the reference pattern for replacing the `lib/data/mock-batches.ts`
 * MOCK_BATCHES with live data (goal: 2026-06-24). It is NOT yet wired into the
 * dashboard — `app/(dashboard)/dashboard/page.tsx` still imports the mock. Swap
 * `MOCK_BATCHES` → `await getBatches()` once this is reviewed and the gaps below
 * are closed.
 *
 * Three layers, intentionally separated:
 *   1. fetch   — getBatches(): typed Supabase query (RLS scopes to the caller).
 *   2. map     — mapBatchRow(): pure DB-row → UI-domain translation (testable).
 *   3. derive  — lifecycle/days helpers built from the single current_stage enum.
 *
 * Related Linear: TES-30 (complete data contracts), TES-60 (qualification title),
 * TES-63 (wire live signals). See gaps marked `TODO(contract)` / `TODO(join)`.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type {
  Database,
  LifecycleStage as DbLifecycleStage,
  BatchStatus as DbBatchStatus,
} from '@/lib/supabase/database.types';
import type {
  Batch,
  LifecycleStage,
  LifecycleStageKey,
  LifecycleStatus,
} from '@/lib/data/types';

type BatchRow = Database['public']['Tables']['batches']['Row'];

/** The join row we actually select: batch + its program code. */
type BatchRowWithProgram = BatchRow & {
  scholarship_programs: { code: string } | null;
};

// ---------------------------------------------------------------------------
// Enum normalization — the contract and the UI use different spellings.
// DB:  aou ntp tip training assessment billing completed blocked
// UI:  aou ntp tip train    entre      assess  bill
// 'entre' is UI-only (no contract column); it is omitted from derived pipelines.
// ---------------------------------------------------------------------------
// Total (non-Partial) map: every DbLifecycleStage MUST appear, so adding a new
// DB enum variant becomes a compile error here until its UI treatment is chosen
// (review SUGGESTION). `null` = no direct UI pipeline stage; deriveLifecycle
// gives those their own treatment (completed → all done, blocked → none active).
const DB_TO_UI_STAGE: Record<DbLifecycleStage, LifecycleStageKey | null> = {
  aou: 'aou',
  ntp: 'ntp',
  tip: 'tip',
  training: 'train',
  assessment: 'assess',
  billing: 'bill',
  completed: null,
  blocked: null,
};

/** Canonical UI pipeline order used to derive a lifecycle array from one stage. */
const UI_PIPELINE: { key: LifecycleStageKey; label: string }[] = [
  { key: 'aou', label: 'AOU' },
  { key: 'ntp', label: 'NTP' },
  { key: 'tip', label: 'TIP' },
  { key: 'train', label: 'Training' },
  { key: 'entre', label: 'ENTRE' },
  { key: 'assess', label: 'Assessment' },
  { key: 'bill', label: 'Billing' },
];

function normalizeStatus(status: DbBatchStatus): Batch['status'] {
  // UI has no 'blocked' state; surface it as 'pending' (needs attention) until
  // the UI gains a blocked tier. TODO(contract): align the two status unions.
  return status === 'blocked' ? 'pending' : status;
}

/**
 * Build the UI lifecycle array from the single `current_stage` enum: every
 * stage before the current one is 'done', the current is 'active', the rest
 * 'pending'. The full per-stage history requires the activity_log / lamr
 * tables — TODO(join) to reconstruct real dates and statuses.
 */
function deriveLifecycle(currentStage: DbLifecycleStage): LifecycleStage[] {
  const uiCurrent = DB_TO_UI_STAGE[currentStage];
  const currentIdx = uiCurrent
    ? UI_PIPELINE.findIndex((s) => s.key === uiCurrent)
    : currentStage === 'completed'
      ? UI_PIPELINE.length // everything done
      : -1; // 'blocked' → nothing marked active

  return UI_PIPELINE.map((stage, i) => {
    let status: LifecycleStatus = 'pending';
    if (currentIdx >= 0) {
      if (i < currentIdx) status = 'done';
      else if (i === currentIdx) status = 'active';
    }
    return { key: stage.key, label: stage.label, status, date: '' };
  });
}

/**
 * Whole days from today to `dateIso` (placeholder for a real billing deadline).
 * A missing date returns Infinity — the established "no known deadline" sentinel
 * that sorts last and never triggers urgency tiers. An *unparseable* date is
 * treated the same way: without the guard, `new Date('garbage').getTime()` is
 * NaN, and a NaN `daysToBilling` silently corrupts sorting and urgency math
 * downstream (review CRITICAL).
 */
function daysUntil(dateIso: string | null): number {
  if (!dateIso) return Number.POSITIVE_INFINITY;
  const ms = new Date(dateIso).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.ceil(ms / 86_400_000) : Number.POSITIVE_INFINITY;
}

/**
 * ISO date → the UI's display convention. `Batch` stores dates as pre-formatted
 * display strings (see lib/data/seed.ts: "Jun 18, 2026"; training start drops
 * the year: "Apr 21"). Passing raw ISO through would render "2026-06-18" in the
 * cards and silently defeat getMockMetrics' `, YYYY`-trimming regex.
 * Null/unparseable → '' (the UI's established empty convention).
 */
function toDisplayDate(dateIso: string | null, withYear = true): string {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' as const } : {}),
  });
}

// ---------------------------------------------------------------------------
// Mapper — pure, no I/O. Unit-test this against a fixture row.
// ---------------------------------------------------------------------------
export function mapBatchRow(row: BatchRowWithProgram): Batch {
  return {
    // Direct from the contract:
    id: row.batch_code, // human code (e.g. "BAT-2") for display continuity
    tenantId: row.tenant_id,
    name: row.batch_section ? `${row.batch_code} (${row.batch_section})` : row.batch_code,
    qualification: row.qualification_title, // closes the TES-60 gap (AC1)
    program: row.scholarship_programs?.code ?? '',
    ncLevel: row.nc_level ?? '',
    trainer: row.trainer_name ?? '',
    trainerId: row.trainer_profile_id ?? '',
    // `?? 0`: these are typed non-null by the contract, but a null slipping
    // through at runtime would feed NaN into roster totals and progress bars.
    scholars: row.learner_count ?? 0,
    progressPct: row.progress_percent ?? 0,
    trainingStart: toDisplayDate(row.start_date, false),
    trainingEnd: toDisplayDate(row.end_date),
    status: normalizeStatus(row.status),
    bsrs: row.billing_report_status === 'verified',

    // Source-row freshness — drives the dashboard stale-data signal (TES-8 AC6, #65).
    updatedAt: row.updated_at,

    // Derived from current_stage:
    lifecycle: deriveLifecycle(row.current_stage),

    // TODO(contract): no billing-deadline column exists yet — using end_date as a
    // stand-in. Add `billing_deadline` to the batches contract (TES-30).
    billingDeadline: toDisplayDate(row.end_date),
    daysToBilling: daysUntil(row.end_date),

    // TODO(join): the documents map requires a join to the `documents` table.
    // Empty until then — DocumentStatusDonut renders zero-state safely.
    documents: {},

    // TODO(contract): fields the UI type requires but the contract does not yet
    // provide. Defaulted so the shape is valid; replace as the contract grows.
    trainingDays: '',
    trainingDaySchedule: [],
    notes: '',
    duration: 0,
    currentDay: 0,
    totalDays: 0,
    ntpLag: 0,
    tipDate: '',
    remark: row.official_system_reference ?? '',
  };
}

// ---------------------------------------------------------------------------
// Fetch — server-only. RLS (Clerk JWT) scopes rows to the caller's tenant, so
// "assigned batches" filtering happens in the database, not here.
// ---------------------------------------------------------------------------

/**
 * Outcome of a dashboard batch load. The data layer owns error *shaping* so the
 * dashboard server component can map each state straight to UI (TES-8 AC6, #65):
 *   - `ok`           — live rows; `dataAsOf` is the freshest row's `updated_at`.
 *   - `sync-failed`  — Supabase is configured but the query failed → real
 *                      sync-failed callout.
 *   - `unconfigured` — no Supabase env in this environment → caller falls back
 *                      to the cached/mock snapshot *silently* (no false alarm).
 */
export type BatchesSnapshot =
  | { status: 'ok'; batches: Batch[]; dataAsOf: string | null }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/** Freshest `updated_at` across the loaded rows, or null when there are none. */
function latestUpdatedAt(batches: Batch[]): string | null {
  return batches.reduce<string | null>(
    (max, b) => (b.updatedAt && (!max || b.updatedAt > max) ? b.updatedAt : max),
    null,
  );
}

export async function getBatchesSnapshot(): Promise<BatchesSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('batches')
      .select('*, scholarship_programs(code)')
      .order('end_date', { ascending: true });

    if (error) return { status: 'sync-failed', error: error.message };

    const batches = (data ?? []).map((row) => mapBatchRow(row as BatchRowWithProgram));
    return { status: 'ok', batches, dataAsOf: latestUpdatedAt(batches) };
  } catch (err) {
    // Network / client-construction failures land here, not in `error` above.
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}

/**
 * Throwing convenience wrapper over {@link getBatchesSnapshot} for callers that
 * just want the rows (the original foundational contract). The dashboard uses
 * the snapshot directly so it can distinguish unconfigured from failed.
 */
export async function getBatches(): Promise<Batch[]> {
  const snap = await getBatchesSnapshot();
  if (snap.status === 'ok') return snap.batches;
  if (snap.status === 'unconfigured') throw new Error('getBatches failed: Supabase is not configured');
  throw new Error(`getBatches failed: ${snap.error}`);
}
