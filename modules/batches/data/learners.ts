/**
 * Learner roster contract (TES-30) — fills `Batch.scholars_list` (`shared/types.ts`),
 * consumed today by the billing statement builder (`modules/billing/domain/statement.ts`,
 * name only) and the EGACE report screen (`modules/reports/ui/ReportView.tsx`, the
 * full T2MIS roster: sex, dob, employment outcome, etc.).
 *
 * Same three layers as `modules/batches/data/batches.ts`:
 *   1. fetch   — typed Supabase query; RLS scopes rows to the caller.
 *   2. map     — pure DB-row -> UI-domain translation (testable).
 *   3. (no derive layer — nothing time-based to compute)
 *
 * The T2MIS roster fields (sex, dob, address, employment before training, ...)
 * live in `learner_details` (migration 20261111120000), a one-to-one table
 * trainers cannot read. Only the tenant roster fetch embeds it; a row without
 * it — the per-batch fetch, a learner with no details yet, or the migration
 * not applied — maps those fields to ''. `employmentStatus` (the
 * post-training outcome) is not a T2MIS terminal-report column and still has
 * no source.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Database, AssessmentResult as DbAssessmentResult } from '@/lib/supabase/database.types';
import { ageOn } from '@/modules/import-export/domain/t2mis';
import type { Batch, BatchT2misFacts, ScholarRow } from '@/shared/types';

type LearnerDetailsRow = Database['public']['Tables']['learner_details']['Row'];
/** The embed arrives as an object for a one-to-one relationship; an array is tolerated. */
type LearnerRow = Database['public']['Tables']['learners']['Row'] & {
  learner_details?: LearnerDetailsRow | LearnerDetailsRow[] | null;
};

/** Total map: every DB assessment_result value has a UI string (`''` = not yet assessed). */
const ASSESSMENT_RESULT_TO_UI: Record<DbAssessmentResult, string> = {
  competent: 'Competent',
  not_yet_competent: 'Not Yet Competent',
  pending: '',
};

// ---------------------------------------------------------------------------
// Mapper — pure, no I/O. `seq` is the roster's 1-based position, matching the
// mock convention (shared/mocks/seed.ts), since the contract has no sequence
// column; `index` must come from the row's position in the already-ordered
// fetch result, not be recomputed per-row.
// ---------------------------------------------------------------------------

/** Null (not recorded) and undefined (column not migrated yet) both read as ''. */
const orEmpty = (value: string | null | undefined): string => value ?? '';

/** Batch-level facts a scholar row repeats on every T2MIS line. */
export interface LearnerBatchContext {
  scholarshipType: string;
  dateStarted: string;
  dateFinished: string;
  /** ISO date `age` is computed against. Passed in so the mapper stays pure. */
  asOf: string;
}

/**
 * Map a database learner row to a ScholarRow. Dates stay ISO; '' = not recorded.
 *
 * `seq` is the roster's 1-based position — the contract has no sequence
 * column, so it must come from the row's position in the already-ordered
 * fetch result. `ctx` is omitted by callers that only need identity fields
 * (billing statements).
 */
export function mapLearnerRow(row: LearnerRow, seq: number, ctx?: LearnerBatchContext): ScholarRow {
  const embedded = row.learner_details;
  const details: Partial<LearnerDetailsRow> = (Array.isArray(embedded) ? embedded[0] : embedded) ?? {};
  const dob = orEmpty(details.date_of_birth);
  return {
    seq,
    lastName: row.last_name,
    firstName: row.first_name,
    middleInit: row.middle_name ? `${row.middle_name.trim().charAt(0)}.` : '',
    middleName: orEmpty(row.middle_name),
    extName: orEmpty(row.extension_name),
    uli: orEmpty(row.uli),
    assessmentResult: ASSESSMENT_RESULT_TO_UI[row.assessment_result],

    sex: orEmpty(details.sex),
    dob,
    age: (ctx && ageOn(dob, ctx.asOf)) || 0,
    civilStatus: orEmpty(details.civil_status),
    education: orEmpty(details.highest_grade_completed),
    nationality: orEmpty(details.nationality),
    clientClass: orEmpty(details.client_classification),
    contact: orEmpty(details.contact_number),
    email: orEmpty(details.email),
    streetAddress: orEmpty(details.street_address),
    barangay: orEmpty(details.barangay),
    cityMunicipality: orEmpty(details.city_municipality),
    district: orEmpty(details.district),
    province: orEmpty(details.province),
    trainingStatus: orEmpty(details.training_status),
    voucherNumber: orEmpty(details.voucher_number),
    dateAssessed: orEmpty(details.date_assessed),
    empStatusBefore: orEmpty(details.employment_status_before),
    dateEmployed: orEmpty(details.date_employed),
    occupation: orEmpty(details.occupation),
    employer: orEmpty(details.employer_name),
    employerAddress: orEmpty(details.employer_address),
    empClassification: orEmpty(details.employer_classification),
    salary: orEmpty(details.salary_range),

    scholarshipType: orEmpty(ctx?.scholarshipType),
    dateStarted: orEmpty(ctx?.dateStarted),
    dateFinished: orEmpty(ctx?.dateFinished),

    // TODO(contract): post-training employment outcome has no column yet.
    employmentStatus: '',
  };
}

// ---------------------------------------------------------------------------
// Fetch — server-only, same snapshot shaping as BatchesSnapshot (TES-8 AC6).
// ---------------------------------------------------------------------------
/** `no-tenant-access` is folded in by the caller — see the note on `BatchesSnapshot`. */
export type LearnersSnapshot =
  | { status: 'ok'; learners: ScholarRow[] }
  | { status: 'no-tenant-access' }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/**
 * The full roster for one batch, ordered by last name (then first name, then
 * `id`) for a stable, readable, and — critically — deterministic sequence:
 * `last_name` alone ties for learners who share a surname, and an unordered
 * tiebreak would let `seq` reshuffle between identical queries (the contract
 * has no explicit ordinal column). Returns every learner regardless of
 * `is_active` — whether a dropped-out scholar belongs on a given screen (e.g.
 * excluded from a billing roster) is a caller/domain policy decision, not a
 * fetch-time filter this contract should make silently.
 */
export async function getBatchLearnersSnapshot(batchId: string): Promise<LearnersSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('learners')
      .select('*')
      .eq('batch_id', batchId)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .order('id', { ascending: true });

    if (error) return { status: 'sync-failed', error: error.message };
    return { status: 'ok', learners: (data ?? []).map((row, i) => mapLearnerRow(row, i + 1)) };
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Tenant roster — every batch's scholars for one school, for the T2MIS export.
// ---------------------------------------------------------------------------

type LearnerRowWithBatch = LearnerRow & {
  batches: {
    batch_code: string;
    start_date: string | null;
    end_date: string | null;
    scholarship_programs: { name: string } | null;
  } | null;
};

type BatchFactsRow = {
  batch_code: string;
  training_calendar_code: string | null;
  tenant_qualifications: {
    copr_number: string | null;
    registration_status: string | null;
    delivery_mode: string | null;
    qualifications: { sector: string | null; cluster: string | null } | null;
  } | null;
};

/** Keyed by batch code — the same value `mapBatchRow` puts in `Batch.id`. */
export type TenantRoster = Record<string, { scholars: ScholarRow[]; t2mis?: BatchT2misFacts }>;

export type TenantRosterSnapshot =
  | { status: 'ok'; roster: TenantRoster }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

const ROSTER_PAGE = 1000;

/** Postgres undefined column / table, and PostgREST's unknown relationship / column / table. */
const NOT_MIGRATED_CODES = new Set(['42703', '42P01', 'PGRST200', 'PGRST204', 'PGRST205']);

/** Today as ISO `YYYY-MM-DD` in the schools' timezone — a UTC date is a day behind until 08:00 there. */
function todayInManila(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

/** Pure: groups ordered learner rows by batch code and maps each. */
export function mapTenantRoster(rows: LearnerRowWithBatch[], facts: BatchFactsRow[], asOf: string): TenantRoster {
  const roster: TenantRoster = {};
  for (const row of rows) {
    if (!row.batches) continue;
    const entry = (roster[row.batches.batch_code] ??= { scholars: [] });
    entry.scholars.push(
      mapLearnerRow(row, entry.scholars.length + 1, {
        scholarshipType: orEmpty(row.batches.scholarship_programs?.name),
        dateStarted: orEmpty(row.batches.start_date),
        dateFinished: orEmpty(row.batches.end_date),
        asOf,
      }),
    );
  }
  for (const f of facts) {
    const entry = roster[f.batch_code];
    if (!entry) continue;
    const registered = f.tenant_qualifications;
    const qualification = registered?.qualifications;
    entry.t2mis = {
      sector: orEmpty(qualification?.sector),
      cluster: orEmpty(qualification?.cluster),
      registrationStatus: orEmpty(registered?.registration_status),
      ctpr: orEmpty(registered?.copr_number),
      deliveryMode: orEmpty(registered?.delivery_mode),
      trainingCalendarCode: orEmpty(f.training_calendar_code),
    };
  }
  return roster;
}

/** Pure: hangs each batch's scholars and T2MIS facts on the batch. Batches with no roster are unchanged. */
export function attachRoster(batches: Batch[], roster: TenantRoster): Batch[] {
  return batches.map((b) => (roster[b.id] ? { ...b, scholars_list: roster[b.id].scholars, t2mis: roster[b.id].t2mis } : b));
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Every learner row for one school, all pages. */
async function fetchRosterRows(
  supabase: SupabaseServerClient,
  tenantId: string,
): Promise<{ rows: LearnerRowWithBatch[] } | { error: string }> {
  // Paged: the API caps a response at 1000 rows and drops the rest without
  // an error, which would silently shorten a large school's export.
  // `learner_details` is embedded unless the first page says it does not
  // exist yet (migration not applied) — then the roster is read without it.
  const rows: LearnerRowWithBatch[] = [];
  let embedDetails = true;
  for (let from = 0; ; ) {
    const { data, error } = await supabase
      .from('learners')
      .select(`*, ${embedDetails ? 'learner_details(*), ' : ''}batches(batch_code, start_date, end_date, scholarship_programs(name))`)
      .eq('tenant_id', tenantId)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + ROSTER_PAGE - 1);
    if (error && embedDetails && NOT_MIGRATED_CODES.has(error.code)) {
      embedDetails = false;
      continue;
    }
    if (error) return { error: error.message };
    rows.push(...((data ?? []) as unknown as LearnerRowWithBatch[]));
    if ((data ?? []).length < ROSTER_PAGE) break;
    from += ROSTER_PAGE;
  }
  return { rows };
}

/**
 * Every learner in one school, grouped by batch. `tenantId` is scope
 * selection on top of RLS (RULES.md rule 2), from a validated `TenantScope`.
 *
 * Carries contact, address and employment data. RLS returns no
 * `learner_details` to a trainer, and the one caller (the report route)
 * redirects trainers before fetching.
 */
export async function getTenantRosterSnapshot(tenantId: string): Promise<TenantRosterSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();

    const page = await fetchRosterRows(supabase, tenantId);
    if ('error' in page) return { status: 'sync-failed', error: page.error };
    const { rows } = page;

    // Separate query on purpose: it names columns from migration
    // 20261111120000, so it errors until that is applied. Only that specific
    // "column/relationship does not exist" failure leaves the qualification
    // cells blank; any other error fails the snapshot, because blank cells
    // would be indistinguishable from "not recorded".
    const facts = await supabase
      .from('batches')
      .select('batch_code, training_calendar_code, tenant_qualifications(copr_number, registration_status, delivery_mode, qualifications(sector, cluster))')
      .eq('tenant_id', tenantId);
    if (facts.error && !NOT_MIGRATED_CODES.has(facts.error.code)) {
      return { status: 'sync-failed', error: facts.error.message };
    }

    return {
      status: 'ok',
      roster: mapTenantRoster(rows, (facts.data ?? []) as unknown as BatchFactsRow[], todayInManila()),
    };
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}
