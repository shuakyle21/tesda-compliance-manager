/**
 * Learner CSV import — the write side of FR-10. First write pipeline in the
 * codebase; `modules/batches/data/batches.ts` is still the fetch → map →
 * derive reference, adapted here as fetch (existing learners) → reconcile
 * (domain) → write (insert/update).
 *
 * Deviates from the `unconfigured` convention in that reference file: a read
 * snapshot can fall back to `shared/mocks` silently because showing cached
 * data is harmless, but an import has nothing to "fall back" to — writing to
 * a mock dataset would silently discard the file the user just uploaded. The
 * caller's job on `unconfigured` here is to disable the importer, not to
 * pretend the import ran.
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
import { parseLearnerCsv, validateRows, reconcileWithExisting, type RowError } from '../domain/learnerImport';

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

    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id, tenant_id')
      .eq('id', batchId)
      .single();
    if (batchError || !batch) {
      return { status: 'sync-failed', error: batchError?.message ?? 'Batch not found or not accessible.' };
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('learners')
      .select('id, uli')
      .eq('batch_id', batchId);
    if (existingError) return { status: 'sync-failed', error: existingError.message };

    const reconciled = reconcileWithExisting(valid, existingRows ?? []);
    const toInsert = reconciled.filter((r) => r.existingId === null);
    const toUpdate = reconciled.filter((r) => r.existingId !== null);

    if (toInsert.length > 0) {
      const inserts: LearnerInsert[] = toInsert.map(({ row }) => ({
        tenant_id: batch.tenant_id,
        batch_id: batchId,
        learner_no: row.learnerNo,
        uli: row.uli,
        last_name: row.lastName,
        first_name: row.firstName,
        middle_name: row.middleName,
        extension_name: row.extensionName,
        assessment_result: row.assessmentResult,
      }));
      const { error: insertError } = await supabase.from('learners').insert(inserts);
      if (insertError) return { status: 'sync-failed', error: insertError.message };
    }

    // No bulk "update many rows with different values" in supabase-js — each
    // reconciled match needs its own UPDATE. Fine at CSV-import scale (single
    // batch's roster); revisit if this pipeline ever takes multi-thousand-row files.
    for (const { row, existingId } of toUpdate) {
      const update: LearnerUpdate = {
        learner_no: row.learnerNo,
        last_name: row.lastName,
        first_name: row.firstName,
        middle_name: row.middleName,
        extension_name: row.extensionName,
        assessment_result: row.assessmentResult,
      };
      const { error: updateError } = await supabase.from('learners').update(update).eq('id', existingId as string);
      if (updateError) return { status: 'sync-failed', error: updateError.message };
    }

    return { status: 'ok', inserted: toInsert.length, updated: toUpdate.length, skipped: toSkipped(rowErrors) };
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}
