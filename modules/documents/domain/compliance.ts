/**
 * Document-compliance rules — the single home for "what does it mean when a
 * batch has no record for a required document?" (TES-94, ADR-004).
 *
 * Pure domain logic, no I/O. `domain/` is public across modules (unlike
 * `data/`), so every surface that counts documents — dashboard KPI, donut,
 * table, matrix, analytics, billing gates — routes through here instead of
 * re-deciding the question locally.
 *
 * The rule (ADR-004), in one line each:
 *
 *   - **Present key** → the record's own status. The data layer already
 *     guarantees that every key in *the batch's own* requirement catalog
 *     resolves to a real `DocRecord` (absent row → `'missing'`); see
 *     `mapDocumentsMap` in `modules/batches/data/batches.ts`.
 *   - **Absent key** → **untracked**: neither verified nor missing. It is
 *     excluded from compliance measurement entirely (out of numerator *and*
 *     denominator), because the caller is asking about a requirement this
 *     batch's catalog never claimed. This case is real, not hypothetical: the
 *     UI iterates the 12-key mock catalog in `shared/mocks/seed.ts` while live
 *     maps are keyed by the migration's 8 DB keys, and the two only partly
 *     overlap (`training_sched` vs `training_schedule`). Merging those
 *     catalogs is a separate change — see the note in
 *     `modules/documents/data/documents.ts`.
 *   - **Nothing tracked at all** → compliance is **unknown**, expressed as
 *     `null`, never `0` and never `100`. Callers render "—", not a percentage.
 *
 * Measurement vs gating — deliberately opposite, and both fail safe:
 *   - *Measuring* (a percentage, a donut, a KPI) excludes untracked keys, so a
 *     partial catalog never reads as a cleared checklist or a false alarm.
 *   - *Gating* (billing readiness, packet blockers) treats untracked as **not
 *     satisfied** via {@link isDocOnFile} — a gate must never open on evidence
 *     nobody has seen.
 *
 * There is deliberately no `'untracked'` member of `DocStatus`: that union
 * mirrors the DB enum and is assigned straight off the row, so a UI-only
 * variant no row can produce would force every consumer to handle a phantom
 * case. Untracked is represented as *absence*, and read only through here.
 */

import type { Batch, DocRecord, DocStatus, DocumentRequirement } from '@/shared/types';

/** Statuses that count as "the document is in hand" (ADR-001 §7.2.4). */
const ON_FILE_STATUSES: ReadonlySet<DocStatus> = new Set<DocStatus>(['verified', 'submitted']);

export interface DocComplianceSummary {
  /** Requirement keys that resolved to a record on the batch(es) asked about. */
  tracked: number;
  /** Requirement keys with no record — untracked, excluded from every percentage. */
  untracked: number;
  verified: number;
  submitted: number;
  pending: number;
  missing: number;
  /** `verified + submitted` ÷ tracked, or `null` when nothing is tracked. */
  onFilePct: number | null;
  /** `verified` ÷ tracked, or `null` when nothing is tracked. */
  verifiedPct: number | null;
}

/**
 * The record for one requirement key, or `null` when the batch does not track
 * it. Read document status through this rather than indexing `batch.documents`
 * directly — an unguarded `batch.documents[key].status` throws on any batch
 * whose catalog lacks the key.
 */
export function docRecordFor(batch: Batch, key: string): DocRecord | null {
  return batch.documents[key] ?? null;
}

/** True when the batch tracks this requirement at all (regardless of status). */
export function isDocTracked(batch: Batch, key: string): boolean {
  return docRecordFor(batch, key) !== null;
}

/**
 * Gate predicate: is this document in hand? Untracked reads as **false** —
 * a readiness gate must stay closed on evidence that was never recorded.
 */
export function isDocOnFile(batch: Batch, key: string): boolean {
  const record = docRecordFor(batch, key);
  return record !== null && ON_FILE_STATUSES.has(record.status);
}

/**
 * Calculates a percentage (rounded to nearest integer), or null when the
 * denominator is zero. Used for compliance percentages where "no data" should
 * render as "—", not "0%".
 */
function pct(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/**
 * Summarize `requirements` across `batches`. Untracked keys are counted in
 * `untracked` and excluded from every other figure, so a percentage is always
 * "of what is actually tracked" — and `null` when that is nothing.
 */
export function summarizeDocCompliance(
  batches: readonly Batch[],
  requirements: readonly DocumentRequirement[],
): DocComplianceSummary {
  const counts: Record<DocStatus, number> = { verified: 0, submitted: 0, pending: 0, missing: 0 };
  let tracked = 0;
  let untracked = 0;

  for (const batch of batches) {
    for (const req of requirements) {
      const record = docRecordFor(batch, req.key);
      if (record) {
        counts[record.status] += 1;
        tracked += 1;
      } else {
        untracked += 1;
      }
    }
  }

  return {
    tracked,
    untracked,
    ...counts,
    onFilePct: pct(counts.verified + counts.submitted, tracked),
    verifiedPct: pct(counts.verified, tracked),
  };
}

/** {@link summarizeDocCompliance} for a single batch. */
export function summarizeBatchDocCompliance(
  batch: Batch,
  requirements: readonly DocumentRequirement[],
): DocComplianceSummary {
  return summarizeDocCompliance([batch], requirements);
}

/** The critical subset of a requirement catalog — the compliance-bearing docs. */
export function criticalRequirements(
  requirements: readonly DocumentRequirement[],
): DocumentRequirement[] {
  return requirements.filter((r) => r.critical);
}
