/**
 * Learner CSV import — the write side of FR-10. First write pipeline in the
 * codebase; `modules/batches/data/batches.ts` is still the fetch → map →
 * derive reference, adapted here as fetch (existing learners) → reconcile
 * (domain) → write (insert/update).
 *
 * Deviates from the `unconfigured` convention in that reference file only in
 * degree: a read snapshot renders an empty state, but an import has nothing
 * to render at all — the caller's job on `unconfigured` here is to disable
 * the importer, not to pretend the import ran.
 *
 * Reconciliation is keyed on ULI (the permanent learner key per docs/adr)
 * in application code (`reconcileWithExisting`), then applied as an explicit
 * insert or update. Migration 20261111120000 adds a unique index on
 * (tenant_id, batch_id, uli) as the backstop; it is partial (`where uli is
 * not null`), so it is still not an ON CONFLICT target for supabase-js upsert.
 *
 * TODO before a UI calls this: `sync-failed` and `partial` carry the raw database message
 * (table, column and constraint names). Map it to user copy at the action
 * boundary (RULES.md rule 6).
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import {
  parseLearnerCsv,
  validateRows,
  reconcileWithExisting,
  type RowError,
  type ExistingLearner,
  type ReconciledRow,
} from '../domain/learnerImport';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type LearnerInsert = Database['public']['Tables']['learners']['Insert'];
type LearnerUpdate = Database['public']['Tables']['learners']['Update'];
type LearnerDetailsInsert = Database['public']['Tables']['learner_details']['Insert'];

export interface SkippedRow {
  rowNumber: number;
  uli: string | null;
  reason: string;
}

export type LearnerImportSnapshot =
  | { status: 'ok'; inserted: number; updated: number; skipped: SkippedRow[] }
  /** Stopped part-way: `inserted` / `updated` rows ARE saved, the rest are not.
   * The two tables are written in separate requests, so there is no rollback.
   * Re-importing the same file is safe (rows match on ULI and details upsert). */
  | { status: 'partial'; inserted: number; updated: number; skipped: SkippedRow[]; error: string }
  | { status: 'validation-failed'; errors: string[] }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

function toSkipped(errors: RowError[]): SkippedRow[] {
  return errors.map((e) => ({ rowNumber: e.rowNumber, uli: e.uli, reason: e.reason }));
}

type BatchTenantResult = { ok: true; tenantId: string } | { ok: false; error: string };

/** Reads the batch's tenant_id via an RLS-scoped SELECT, so a write can never
 * target a tenant the caller didn't already have read access to. */
async function fetchBatchTenant(supabase: SupabaseServerClient, batchId: string): Promise<BatchTenantResult> {
  const { data: batch, error } = await supabase.from('batches').select('id, tenant_id').eq('id', batchId).single();
  if (error || !batch) return { ok: false, error: error?.message ?? 'Batch not found or not accessible.' };
  return { ok: true, tenantId: batch.tenant_id };
}

type ExistingLearnersResult = { ok: true; rows: ExistingLearner[] } | { ok: false; error: string };

async function fetchExistingLearners(supabase: SupabaseServerClient, batchId: string): Promise<ExistingLearnersResult> {
  const { data, error } = await supabase.from('learners').select('id, uli').eq('batch_id', batchId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: data ?? [] };
}

/**
 * Writes one learner's T2MIS details (`learner_details`, office-only). Skipped
 * when the file filled none, so a names-only CSV never touches that table.
 * One row per call: a single-object upsert updates only the columns it
 * carries, so re-importing a sparser file does not blank earlier details.
 */
async function writeDetails(
  supabase: SupabaseServerClient,
  learnerId: string,
  tenantId: string,
  row: ReconciledRow['row'],
): Promise<string | null> {
  if (Object.keys(row.details).length === 0) return null;
  const details: LearnerDetailsInsert = { learner_id: learnerId, tenant_id: tenantId, ...row.details };
  const { error } = await supabase.from('learner_details').upsert(details, { onConflict: 'learner_id' });
  return error ? error.message : null;
}

/** How many learner rows a write step saved before it finished or stopped. */
interface WriteResult {
  saved: number;
  error: string | null;
}

/** Inserts the unmatched rows, then their details. */
async function insertLearners(
  supabase: SupabaseServerClient,
  toInsert: ReconciledRow[],
  tenantId: string,
  batchId: string,
): Promise<WriteResult> {
  if (toInsert.length === 0) return { saved: 0, error: null };
  const inserts: LearnerInsert[] = toInsert.map(({ row }) => ({
    tenant_id: tenantId,
    batch_id: batchId,
    learner_no: row.learnerNo,
    uli: row.uli,
    last_name: row.lastName,
    first_name: row.firstName,
    middle_name: row.middleName,
    extension_name: row.extensionName,
    assessment_result: row.assessmentResult,
  }));
  const { data, error } = await supabase.from('learners').insert(inserts).select('id, uli');
  if (error) return { saved: 0, error: error.message };

  // From here the learner rows are committed, so every exit reports them as saved.
  const saved = toInsert.length;
  // ULIs are unique within the file (validateRows), so they key the new ids.
  const idByUli = new Map((data ?? []).map((l) => [l.uli, l.id]));
  for (const { row } of toInsert) {
    const id = idByUli.get(row.uli);
    if (!id) return { saved, error: `Row ${row.rowNumber}: the learner was saved but its details could not be linked.` };
    const detailsError = await writeDetails(supabase, id, tenantId, row);
    if (detailsError) return { saved, error: detailsError };
  }
  return { saved, error: null };
}

/** Updates the ULI-matched rows one at a time (no bulk "update many rows with
 * different values" in supabase-js). Fine at CSV-import scale (single batch's
 * roster); revisit if this pipeline ever takes multi-thousand-row files.
 * `saved` counts rows whose learner AND details both went through. */
async function updateLearners(supabase: SupabaseServerClient, toUpdate: ReconciledRow[], tenantId: string): Promise<WriteResult> {
  let saved = 0;
  for (const { row, existingId } of toUpdate) {
    const update: LearnerUpdate = {
      learner_no: row.learnerNo,
      last_name: row.lastName,
      first_name: row.firstName,
      middle_name: row.middleName,
      extension_name: row.extensionName,
      assessment_result: row.assessmentResult,
    };
    const { error } = await supabase.from('learners').update(update).eq('id', existingId as string);
    if (error) return { saved, error: error.message };
    const detailsError = await writeDetails(supabase, existingId as string, tenantId, row);
    if (detailsError) return { saved, error: detailsError };
    saved += 1;
  }
  return { saved, error: null };
}

/** Pure: `ok` when both steps finished, `sync-failed` when nothing was saved,
 * otherwise `partial` with the real counts. */
export function summariseWrites(inserted: WriteResult, updated: WriteResult, skipped: SkippedRow[]): LearnerImportSnapshot {
  const error = inserted.error ?? updated.error;
  const counts = { inserted: inserted.saved, updated: updated.saved, skipped };
  if (!error) return { status: 'ok', ...counts };
  if (inserted.saved + updated.saved === 0) return { status: 'sync-failed', error };
  return { status: 'partial', ...counts, error };
}

/** Imports a learner CSV into a single batch. `batchId` scopes both the
 * reconciliation read and the write; tenant_id for inserted rows is read
 * back off the batch itself (an RLS-scoped SELECT) rather than accepted as a
 * parameter, so the write can never target a tenant the caller didn't already
 * have read access to. */
export async function importLearnersCsv(batchId: string, csvText: string): Promise<LearnerImportSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  const parsed = parseLearnerCsv(csvText);
  if (parsed.status === 'empty') {
    return { status: 'validation-failed', errors: ['The file has no data rows.'] };
  }
  if (parsed.status === 'missing-columns') {
    return { status: 'validation-failed', errors: [`Missing required column(s): ${parsed.missing.join(', ')}`] };
  }

  if (parsed.status === 'multiple-batches') {
    return {
      status: 'validation-failed',
      errors: [`This file covers more than one batch (${parsed.values.join('; ')}). Import one batch at a time.`],
    };
  }

  const { valid, errors: rowErrors } = validateRows(parsed.rows);
  if (valid.length === 0) {
    return { status: 'validation-failed', errors: rowErrors.map((e) => `Row ${e.rowNumber}: ${e.reason}`) };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const batchResult = await fetchBatchTenant(supabase, batchId);
    if (!batchResult.ok) return { status: 'sync-failed', error: batchResult.error };

    const existingResult = await fetchExistingLearners(supabase, batchId);
    if (!existingResult.ok) return { status: 'sync-failed', error: existingResult.error };

    const reconciled = reconcileWithExisting(valid, existingResult.rows);
    const toInsert = reconciled.filter((r) => r.existingId === null);
    const toUpdate = reconciled.filter((r) => r.existingId !== null);

    const inserted = await insertLearners(supabase, toInsert, batchResult.tenantId, batchId);
    const updated = inserted.error ? { saved: 0, error: null } : await updateLearners(supabase, toUpdate, batchResult.tenantId);

    return summariseWrites(inserted, updated, toSkipped(rowErrors));
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}
