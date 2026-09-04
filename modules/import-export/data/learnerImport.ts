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
 * Reconciliation is keyed on ULI (the permanent learner key per
 * docs/adr) rather than a DB upsert: the only unique constraint on
 * `learners` is (tenant_id, batch_id, learner_no) — there is no unique
 * index on `uli` for Postgres to target with ON CONFLICT. Matching by ULI is
 * therefore done in application code (`reconcileWithExisting`), then applied
 * as an explicit insert or update.
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

export interface SkippedRow {
  rowNumber: number;
  uli: string | null;
  reason: string;
}

export type LearnerImportSnapshot =
  | { status: 'ok'; inserted: number; updated: number; skipped: SkippedRow[] }
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

/** Inserts the unmatched rows. Returns an error message, or `null` on success. */
async function insertLearners(
  supabase: SupabaseServerClient,
  toInsert: ReconciledRow[],
  tenantId: string,
  batchId: string,
): Promise<string | null> {
  if (toInsert.length === 0) return null;
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
  const { error } = await supabase.from('learners').insert(inserts);
  return error ? error.message : null;
}

/** Updates the ULI-matched rows one at a time (no bulk "update many rows with
 * different values" in supabase-js). Fine at CSV-import scale (single batch's
 * roster); revisit if this pipeline ever takes multi-thousand-row files.
 * Returns an error message, or `null` on success. */
async function updateLearners(supabase: SupabaseServerClient, toUpdate: ReconciledRow[]): Promise<string | null> {
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
    if (error) return error.message;
  }
  return null;
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

    const insertError = await insertLearners(supabase, toInsert, batchResult.tenantId, batchId);
    if (insertError) return { status: 'sync-failed', error: insertError };

    const updateError = await updateLearners(supabase, toUpdate);
    if (updateError) return { status: 'sync-failed', error: updateError };

    return { status: 'ok', inserted: toInsert.length, updated: toUpdate.length, skipped: toSkipped(rowErrors) };
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}
