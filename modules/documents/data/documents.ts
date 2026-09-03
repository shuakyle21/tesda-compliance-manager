/**
 * Documents data contract (TES-30) — the requirement catalog and per-batch
 * status map that `modules/documents/ui/DocumentsView.tsx` and the
 * `Batch.documents` map (closing `batches.ts`'s `TODO(join)`) both need.
 *
 * Same three layers as `modules/batches/data/batches.ts`:
 *   1. fetch   — typed Supabase queries; RLS scopes rows to the caller.
 *   2. map     — pure DB-row -> UI-domain translation (testable).
 *   3. (no derive layer here — nothing time-based to compute)
 *
 * Trainer omission note: `documents.audience` and `program_document_requirements
 * .audience` are enforced by RLS policies "Tenant users can read scoped
 * documents" / trainer write policies in the migration — a trainer's query
 * simply never receives admin/coordinator-only rows (e.g. `billing_report`).
 * This file does not re-filter by role in JS; RLS is the security boundary
 * (CLAUDE.md), so this data layer stays as unaware of "who is asking" as
 * `batches.ts` is.
 */

import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Database, LifecycleStage as DbLifecycleStage } from '@/lib/supabase/database.types';
import type { DocRecord, DocumentRequirement } from '@/shared/types';

type RequirementRow = Database['public']['Tables']['program_document_requirements']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];

// ---------------------------------------------------------------------------
// Icon is a presentation concern the contract does not carry (no DB column) —
// looked up by `document_key`. These 8 keys are the ones the migration's own
// seed data uses (supabase/migrations/..._create_tenant_scoped_schema.sql,
// the `requirements` CTE ~line 789). A key outside this set falls back to a
// generic icon rather than failing; `document_key` is per-program configured
// data, not a closed enum, so unlike `DB_TO_UI_STAGE` in batches.ts this is
// deliberately a Partial map, not total.
// ---------------------------------------------------------------------------
const DOCUMENT_ICONS: Partial<Record<string, string>> = {
  aou: 'send',
  ntp: 'file-invoice',
  tip_report: 'presentation',
  training_schedule: 'calendar',
  attendance: 'file-text',
  lamr: 'file-text',
  assessment: 'file-check',
  billing_report: 'receipt',
};
const DEFAULT_DOCUMENT_ICON = 'file';

/** Total map: every DB lifecycle stage has a UI stage string, mirroring batches.ts's bridge. */
const STAGE_TO_UI: Record<DbLifecycleStage, string> = {
  aou: 'aou',
  ntp: 'ntp',
  tip: 'tip',
  training: 'train',
  assessment: 'assess',
  billing: 'bill',
  completed: '',
  blocked: '',
};

// ---------------------------------------------------------------------------
// Mappers — pure, no I/O.
// ---------------------------------------------------------------------------

/**
 * Maps a program document requirement row to the UI domain type. Resolves the
 * lifecycle stage from DB enum to UI stage key and looks up the icon from the
 * local reference table.
 */
export function mapRequirementRow(row: RequirementRow): DocumentRequirement {
  return {
    key: row.document_key,
    label: row.document_name,
    stage: row.required_for_stage ? STAGE_TO_UI[row.required_for_stage] : '',
    critical: row.is_required,
    icon: DOCUMENT_ICONS[row.document_key] ?? DEFAULT_DOCUMENT_ICON,
  };
}

/**
 * Maps a submitted document row to the UI domain DocRecord type. Derives the
 * most recent timestamp (verification > submission > update) and the source
 * label from storage path or external URL.
 */
export function mapDocumentRow(row: DocumentRow): DocRecord {
  return {
    status: row.status,
    url: row.storage_path ?? row.external_url,
    // Most recent thing that happened to the document: verification supersedes
    // submission. Falls back to updated_at so a row always has a timestamp.
    updated: row.verified_at ?? row.submitted_at ?? row.updated_at,
    source: row.storage_path ? 'Uploaded file' : row.external_url ? 'External link' : null,
    verifiedBy: row.verified_by,
    verifiedDate: row.verified_at,
  };
}

/** The DocRecord for a requirement with no submitted row — never `undefined`. */
const MISSING_DOC: DocRecord = { status: 'missing', url: null, updated: null, source: null };

/**
 * Builds a complete document map keyed by `document_key`, the shape `Batch.documents` requires.
 * Backfilled against `requirements` so every catalog entry resolves to a real
 * `DocRecord` (status `'missing'`) rather than being absent from the map —
 * deciding "no row means missing" is this contract's job, not each caller's
 * (ADR-004 D1). A key that is *still* absent after the backfill is one this
 * batch's catalog never listed, and callers must read it as **untracked** via
 * `modules/documents/domain/compliance.ts` — not as verified, not as missing.
 * A submitted row outside the catalog (a stale or ad hoc upload) is still
 * included, keyed by its own `document_key`.
 *
 * @param rows - The document rows from the database
 * @param requirements - The requirement definitions
 * @returns Keyed map of document records
 */
function mapDocumentRows(
  rows: DocumentRow[],
  requirements: DocumentRequirement[],
): Record<string, DocRecord> {
  const map: Record<string, DocRecord> = {};
  for (const req of requirements) map[req.key] = MISSING_DOC;
  for (const row of rows) map[row.document_key] = mapDocumentRow(row);
  return map;
}

// ---------------------------------------------------------------------------
// Fetch — server-only, same snapshot shaping as BatchesSnapshot (TES-8 AC6).
// ---------------------------------------------------------------------------
export type DocumentRequirementsSnapshot =
  | { status: 'ok'; requirements: DocumentRequirement[] }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

export type BatchDocumentsSnapshot =
  | { status: 'ok'; documents: Record<string, DocRecord> }
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };

/** The requirement catalog for one scholarship program, in display order. */
export async function getDocumentRequirementsSnapshot(
  programId: string,
): Promise<DocumentRequirementsSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('program_document_requirements')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order', { ascending: true });

    if (error) return { status: 'sync-failed', error: error.message };
    return { status: 'ok', requirements: (data ?? []).map(mapRequirementRow) };
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}

/**
 * The document-status map for one batch, keyed by `document_key` — every key
 * in `requirements` is guaranteed present (backfilled `'missing'` when no row
 * exists). Callers already holding the batch's requirement catalog (e.g. from
 * {@link getDocumentRequirementsSnapshot}) pass it in rather than have this
 * re-fetch it, since the two are usually loaded together for one screen.
 */
export async function getBatchDocumentsSnapshot(
  batchId: string,
  requirements: DocumentRequirement[],
): Promise<BatchDocumentsSnapshot> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('batch_id', batchId);

    if (error) return { status: 'sync-failed', error: error.message };
    return { status: 'ok', documents: mapDocumentRows(data ?? [], requirements) };
  } catch (err) {
    return { status: 'sync-failed', error: err instanceof Error ? err.message : 'unknown error' };
  }
}
