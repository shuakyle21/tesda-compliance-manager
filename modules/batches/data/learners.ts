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
 * Contract gap (TES-30, not closed here): the `learners` table only carries
 * identity + assessment result. `ScholarRow` also models the full T2MIS EGACE
 * roster — sex, dob, civil status, education, nationality, client class,
 * scholarship type, contact/email, training dates, and the post-training
 * employment-outcome fields — none of which have columns yet. Those fields are
 * defaulted below (mirroring batches.ts's own `TODO(contract)` defaults) so the
 * shape stays valid; billing statements only read name fields (safe today),
 * but the EGACE report screen will render blank until the schema grows.
 */

'use client';

// The one browser-side fetcher in a `data/` folder of server-side ones
// (`batches.ts`, `metrics.ts`). Marked so the distinction is visible at the top
// of the file rather than inferable only from which Supabase client it imports.

import {
  isSupabaseConfiguredInBrowser,
  type BrowserSupabaseClient,
} from '@/lib/supabase/client';
import type { Database, AssessmentResult as DbAssessmentResult } from '@/lib/supabase/database.types';
import type { ScholarRow } from '@/shared/types';

type LearnerRow = Database['public']['Tables']['learners']['Row'];

/**
 * The only columns the roster mapper reads, named explicitly because this query
 * runs in the browser.
 *
 * `select('*')` would be harmless today — `learners` currently carries identity
 * plus `assessment_result` and nothing else. But `ScholarRow` already models
 * `salary`, `contact`, `email`, and `dob` (see the header's contract gap), and
 * RLS is row-level: the day a migration adds those columns, `select('*')` would
 * begin shipping salary and contact details to every browser that opens a
 * roster, in a diff that touches only SQL and so reads as unrelated. Naming the
 * columns makes that a compile-time decision instead of a silent one.
 */
export const LEARNER_ROSTER_COLUMNS =
  'id, last_name, first_name, middle_name, extension_name, uli, assessment_result' as const;

/**
 * Exactly the projection {@link LEARNER_ROSTER_COLUMNS} returns.
 *
 * `id` is selected even though the mapper ignores it. The fetch orders by it as
 * its final tiebreak, and ordering by an unprojected column is a PostgREST
 * behaviour this code would rather not depend on — a rejected order would come
 * back as a request error and surface as `sync-failed`, which reads to the user
 * as an outage rather than as the bug it is. Requesting the column costs one
 * field and removes the question.
 */
type LearnerRosterRow = Pick<
  LearnerRow,
  | 'id'
  | 'last_name'
  | 'first_name'
  | 'middle_name'
  | 'extension_name'
  | 'uli'
  | 'assessment_result'
>;

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

/**
 * Map a database learner row to a ScholarRow.
 *
 * `seq` is the roster's 1-based position, matching the mock convention, since
 * the contract has no sequence column. It must come from the row's position in
 * the already-ordered fetch result, not be recomputed per-row.
 *
 * @param row - The database learner row
 * @param seq - The 1-based sequence number for this scholar
 * @returns Mapped scholar row with identity, assessment result, and placeholder fields
 */
export function mapLearnerRow(row: LearnerRosterRow, seq: number): ScholarRow {
  return {
    seq,
    lastName: row.last_name,
    firstName: row.first_name,
    middleInit: row.middle_name ? `${row.middle_name.trim().charAt(0)}.` : '',
    extName: row.extension_name ?? '',
    uli: row.uli ?? '',
    assessmentResult: ASSESSMENT_RESULT_TO_UI[row.assessment_result],

    // TODO(contract): fields the UI type requires but `learners` does not yet
    // provide (see file header). Defaulted so the shape is valid.
    sex: '',
    dob: '',
    age: 0,
    civilStatus: '',
    education: '',
    nationality: '',
    clientClass: '',
    scholarshipType: '',
    contact: '',
    email: '',
    trainingStatus: '',
    dateStarted: '',
    dateFinished: '',
    dateAssessed: '',
    empStatusBefore: '',
    employmentStatus: '',
    dateEmployed: '',
    occupation: '',
    employer: '',
    empClassification: '',
    salary: '',
  };
}

// ---------------------------------------------------------------------------
// Fetch — browser-side, same snapshot shaping as BatchesSnapshot (TES-8 AC6).
// The roster is an on-demand drill-in read, so it runs through the Clerk-wired
// browser client and is cached by TanStack Query. RLS still scopes every row.
// ---------------------------------------------------------------------------
/**
 * `no-tenant-access` is currently unreachable: the routes that can open a batch
 * short-circuit to `NoTenantAccessState` before rendering the island this query
 * runs in, so a caller with no school never gets this far. The arm is kept
 * because a URL-addressed drill-in (`/trainer/classes/[batchId]/...`) takes its
 * id from the URL rather than from an already-authorized list, and will need to
 * fold it in exactly as the page routes do.
 */
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
 * has no explicit ordinal column).
 *
 * Returns every learner regardless of `is_active`, and — because `is_active` is
 * not in the projection — gives the caller no way to tell an active scholar
 * from a dropped-out one. That is a deliberate narrowing, not an oversight: the
 * roster reads as a plain list of who is on the batch. A screen that must act
 * on the ADR-007 dropout distinction (excluding a dropout from a billing
 * roster, say) has to widen {@link LEARNER_ROSTER_COLUMNS} and carry the flag
 * through `ScholarRow` first. It must not infer the distinction from what is
 * here.
 */
export async function fetchBatchLearners(
  supabase: BrowserSupabaseClient,
  batchId: string,
): Promise<LearnersSnapshot> {
  if (!isSupabaseConfiguredInBrowser()) return { status: 'unconfigured' };

  try {
    const { data, error } = await supabase
      .from('learners')
      .select(LEARNER_ROSTER_COLUMNS)
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
