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

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Database, AssessmentResult as DbAssessmentResult } from '@/lib/supabase/database.types';
import type { ScholarRow } from '@/shared/types';

type LearnerRow = Database['public']['Tables']['learners']['Row'];

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
export function mapLearnerRow(row: LearnerRow, seq: number): ScholarRow {
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
// Fetch — server-only, same snapshot shaping as BatchesSnapshot (TES-8 AC6).
// ---------------------------------------------------------------------------
export type LearnersSnapshot =
  | { status: 'ok'; learners: ScholarRow[] }
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
