/**
 * FOUNDATIONAL EXAMPLE — real batch data via the generated Supabase contract.
 *
 * This is the reference pattern every entity contract follows. It IS wired into
 * the dashboard — `app/(dashboard)/dashboard/page.tsx` calls `getBatchesSnapshot()`.
 * The `MOCK_BATCHES` dataset it replaced was deleted in the mock-data retirement.
 *
 * Three layers, intentionally separated:
 *   1. fetch   — getBatches(): typed Supabase query (RLS scopes to the caller).
 *   2. map     — mapBatchRow(): pure DB-row → UI-domain translation (testable).
 *   3. derive  — lifecycle/days helpers built from the single current_stage enum.
 *
 * Related Linear: TES-30 (complete data contracts), TES-60 (qualification title),
 * TES-63 (wire live signals). The `TODO(join)` documents-map gap is closed via
 * an embedded `documents(*)` select (see `modules/documents/data/documents.ts`
 * for the sibling contract that serves the same table for the Documents
 * screen); the billing-deadline `TODO(contract)` remains — see that comment.
 */

import { cache } from 'react';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type {
  Database,
  LifecycleStage as DbLifecycleStage,
  BatchStatus as DbBatchStatus,
} from '@/lib/supabase/database.types';
import type {
  Batch,
  DocRecord,
  DocumentRequirement,
  LifecycleStage,
  LifecycleStageKey,
  LifecycleStatus,
} from '@/shared/types';

type BatchRow = Database['public']['Tables']['batches']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];
type RequirementRow = Database['public']['Tables']['program_document_requirements']['Row'];

/** The join row we actually select: batch + its program (+ requirements) + its documents. */
type BatchRowWithProgram = BatchRow & {
  scholarship_programs: { code: string; program_document_requirements: RequirementRow[] | null } | null;
  documents: DocumentRow[] | null;
  attendance_records: { attendance_date: string; present: boolean }[] | null;
};

/**
 * Duplicated from `modules/documents/data/documents.ts` (`mapDocumentRow` /
 * `MISSING_DOC` / the backfill in `mapDocumentRows`) — a module's `data/`
 * layer is private to that module (import direction rule), so this pure logic
 * is kept in sync by hand rather than imported. Closes the `TODO(join)`
 * below, backfilled against the batch's program requirement catalog so every
 * requirement key resolves to a real `DocRecord` — "no row means missing" is
 * this contract's decision, not each caller's (ADR-004 D1). A key still absent
 * after the backfill is one this batch's catalog never listed; callers read
 * that as **untracked** through `modules/documents/domain/compliance.ts`,
 * never by indexing this map directly. RLS already scopes which document rows
 * this embedded select returns (see documents.ts's trainer-omission note), so
 * this mapper, like the rest of the file, stays unaware of the caller's role.
 */
const MISSING_DOC: DocRecord = { status: 'missing', url: null, updated: null, source: null };

/**
 * Maps a raw document row from the database to the UI domain DocRecord type.
 * Resolves the most recent timestamp (verification > submission > update) and
 * derives the source label from storage path or external URL.
 */
function mapDocumentRow(row: DocumentRow): DocRecord {
  return {
    status: row.status,
    url: row.storage_path ?? row.external_url,
    updated: row.verified_at ?? row.submitted_at ?? row.updated_at,
    source: row.storage_path ? 'Uploaded file' : row.external_url ? 'External link' : null,
    verifiedBy: row.verified_by,
    verifiedDate: row.verified_at,
  };
}

/**
 * Builds a complete document map for a batch, backfilling missing requirements
 * with `MISSING_DOC` so every catalog entry resolves to a real DocRecord. Closes
 * the `TODO(join)` gap by ensuring "no row means missing" is this contract's
 * decision, not each caller's.
 */
function mapDocumentsMap(
  documentRows: DocumentRow[] | null,
  requirementRows: RequirementRow[] | null | undefined,
): Record<string, DocRecord> {
  const map: Record<string, DocRecord> = {};
  for (const req of requirementRows ?? []) map[req.document_key] = MISSING_DOC;
  for (const row of documentRows ?? []) map[row.document_key] = mapDocumentRow(row);
  return map;
}

const DOCUMENT_ICONS: Partial<Record<string, string>> = {
  aou: 'send', ntp: 'file-invoice', tip_report: 'presentation', training_schedule: 'calendar',
  attendance: 'file-text', lamr: 'file-text', assessment: 'file-check', billing_report: 'receipt',
};

function mapRequirementRows(rows: RequirementRow[] | null | undefined): DocumentRequirement[] {
  return (rows ?? []).map((row) => ({
    key: row.document_key,
    label: row.document_name,
    stage: row.required_for_stage ?? '',
    critical: row.is_required,
    icon: DOCUMENT_ICONS[row.document_key] ?? 'file',
  }));
}

/**
 * Distinct attended dates are the completed sessions; no stored counter can
 * drift from attendance. Progress is **unavailable** (null) unless both halves
 * exist: a snapshotted `total_sessions`, and at least one attendance row.
 * PostgREST returns `[]` (never null) for an empty embed, so "no rows" has to
 * be read as "attendance not recorded here", not as a real 0 sessions held.
 */
function completedSessions(
  rows: BatchRowWithProgram['attendance_records'],
  totalSessions: number | null | undefined,
): number | null {
  if (!totalSessions || !rows || rows.length === 0) return null;
  return new Set(rows.filter((row) => row.present).map((row) => row.attendance_date)).size;
}

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

/**
 * Canonical UI pipeline order used to derive a lifecycle array from one stage.
 *
 * Defines the standard sequence of lifecycle stages displayed in the UI.
 */
const UI_PIPELINE: { key: LifecycleStageKey; label: string }[] = [
  { key: 'aou', label: 'AOU' },
  { key: 'ntp', label: 'NTP' },
  { key: 'tip', label: 'TIP' },
  { key: 'train', label: 'Training' },
  { key: 'entre', label: 'ENTRE' },
  { key: 'assess', label: 'Assessment' },
  { key: 'bill', label: 'Billing' },
];

/**
 * Normalizes the database batch status to the UI status type. Maps 'blocked' to
 * 'pending' since the UI has no blocked state yet.
 */
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
 * Calculates whole days from today to `dateIso`.
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

/** Same `?? ''` default repeated across most of mapBatchRow's string fields below. */
function orEmpty(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Same `?? 0` default repeated across mapBatchRow's count fields. These are typed
 * non-null by the contract, but a null slipping through at runtime would feed NaN
 * into roster totals and progress bars.
 */
function orZero(value: number | null | undefined): number {
  return value ?? 0;
}

function batchDisplayName(code: string, section: string | null): string {
  return section ? `${code} (${section})` : code;
}

// ---------------------------------------------------------------------------
// Mapper — pure, no I/O. Unit-test this against a fixture row.
// ---------------------------------------------------------------------------
export function mapBatchRow(row: BatchRowWithProgram): Batch {
  return {
    // Direct from the contract:
    id: row.batch_code, // human code (e.g. "BAT-2") for display continuity
    tenantId: row.tenant_id,
    name: batchDisplayName(row.batch_code, row.batch_section),
    qualification: row.qualification_title, // closes the TES-60 gap (AC1)
    programId: row.program_id,
    program: orEmpty(row.scholarship_programs?.code),
    ncLevel: orEmpty(row.nc_level),
    trainer: orEmpty(row.trainer_name),
    trainerId: orEmpty(row.trainer_profile_id),
    scholars: orZero(row.learner_count),
    progressPct: orZero(row.progress_percent),
    trainingStart: row.start_date ?? '',
    trainingEnd: row.end_date ?? '',
    status: normalizeStatus(row.status),
    blocked: row.status === 'blocked' || row.current_stage === 'blocked',
    bsrs: row.billing_report_status === 'verified',

    // Source-row freshness — drives the dashboard stale-data signal (TES-8 AC6, #65).
    updatedAt: row.updated_at,

    // Derived from current_stage:
    lifecycle: deriveLifecycle(row.current_stage),

    // `?? null`, not a bare read: until migration 20261024110000 is applied the
    // column is absent and `select('*')` yields `undefined`, which would slip
    // past every `!== null` "no deadline recorded" check downstream.
    billingDeadline: row.billing_deadline ?? null,
    daysToBilling: daysUntil(row.billing_deadline ?? null),

    // Closed (TES-30): joined + backfilled from the embedded selects below.
    documents: mapDocumentsMap(
      row.documents,
      row.scholarship_programs?.program_document_requirements,
    ),
    documentRequirements: mapRequirementRows(row.scholarship_programs?.program_document_requirements),

    // TODO(contract): fields the UI type requires but the contract does not yet
    // provide. Defaulted so the shape is valid; replace as the contract grows.
    trainingDays: '',
    trainingDaySchedule: [],
    notes: '',
    duration: 0,
    completedSessions: completedSessions(row.attendance_records, row.total_sessions),
    totalSessions: row.total_sessions ?? null,
    // Compatibility aliases for surfaces not yet migrated (analytics, billing
    // packet math). Never rendered as a "Day X of Y" claim — UI reads the
    // nullable fields above and shows an unavailable state instead.
    currentDay: completedSessions(row.attendance_records, row.total_sessions) ?? 0,
    totalDays: row.total_sessions ?? 0,
    ntpLag: null,
    tipDate: '',
    remark: orEmpty(row.official_system_reference),
  };
}

/**
 * `no-tenant-access` is never produced by the query below — RLS answers it
 * with an empty, successful read, which is exactly the ambiguity it resolves.
 * It is folded in by the caller via
 * `modules/tenancy/domain/access`'s `withTenantAccess`, because membership is
 * `modules/tenancy`'s fact and that module's `data/` is private to it.
 */
export type BatchesSnapshot =
  | {
      status: 'ok';
      batches: Batch[];
      /** Newest `updated_at` across the rows — when a batch was last *edited*. */
      dataAsOf: string | null;
      /** When this snapshot was read. Every request is a live read, so this is
       *  the honest "data as of" stamp; `dataAsOf` is edit recency, not staleness. */
      fetchedAt: string;
    }
  | { status: 'no-tenant-access' }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/** Never substitutes mock data — any non-`ok` snapshot renders empty. */
export function selectBatchesForDisplay(snapshot: BatchesSnapshot): Batch[] {
  return snapshot.status === 'ok' ? snapshot.batches : [];
}

/** Freshest `updated_at` across the loaded rows, or null when there are none. */
function latestUpdatedAt(batches: Batch[]): string | null {
  return batches.reduce<string | null>(
    (max, b) => (b.updatedAt && (!max || b.updatedAt > max) ? b.updatedAt : max),
    null,
  );
}

/**
 * `cache()`-wrapped so the layout and its nested page share one Supabase
 * query per request instead of each `await getBatchesSnapshot()` call firing
 * its own round-trip — both `app/(dashboard)/layout.tsx` and every route's
 * `page.tsx` call this independently for the same request.
 */
export const getBatchesSnapshot = cache(async (tenantId?: string): Promise<BatchesSnapshot> => {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('batches')
      .select('*, scholarship_programs(code, program_document_requirements(*)), documents(*), attendance_records(attendance_date, present)')
      .order('end_date', { ascending: true });
    // Scope *selection*, not authorization: RLS already limits rows to the
    // caller's schools (RULES.md §1); this picks the one school the URL is
    // about, from a scope validated against the caller's own memberships
    // (`modules/tenancy/domain/scope.ts`). Omitted = every school RLS allows,
    // which only the admin overview and trainer routes ask for.
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query;

    if (error) return { status: 'sync-failed', error: error.message };

    const batches = (data ?? []).map((row) => mapBatchRow(row as unknown as BatchRowWithProgram));
    return { status: 'ok', batches, dataAsOf: latestUpdatedAt(batches), fetchedAt: new Date().toISOString() };
  } catch (err) {
    // Network / client-construction failures land here, not in `error` above.
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
});

export async function getBatches(): Promise<Batch[]> {
  const snap = await getBatchesSnapshot();
  if (snap.status === 'ok') return snap.batches;
  if (snap.status === 'unconfigured') throw new Error('getBatches failed: Supabase is not configured');
  if (snap.status === 'no-tenant-access') throw new Error('getBatches failed: no tenant access');
  throw new Error(`getBatches failed: ${snap.error}`);
}
