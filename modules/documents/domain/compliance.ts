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
 *     batch's catalog never claimed. This case is real, not hypothetical: a caller's
 *     requirement catalog and a batch's own tracked document keys can
 *     legitimately diverge (a requirement added after the batch started, a
 *     per-program catalog that doesn't cover every batch uniformly) — see the
 *     note in `modules/documents/data/documents.ts`.
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

// ---------------------------------------------------------------------------
// Blocking strip (TES-40 / FR-06 AC-2) — "which documents are holding this
// batch up, by name?"
//
// This is a **gate**, not a measurement, so it follows ADR-004 D4 rather than
// D2: an untracked requirement counts as blocking. Measurement declines to
// judge a requirement nobody recorded; a gate must fail closed on it. That is
// why this reads through `isDocOnFile` (which already treats untracked as
// not-on-file) rather than counting statuses the way `summarizeDocCompliance`
// does — the two give deliberately different answers about the same batch,
// and that divergence is the ADR, not a bug.
//
// It lives in this file rather than a new one because ADR-004 D6 puts the
// untracked rule in exactly one module, and a blocker list is that rule
// applied.
// ---------------------------------------------------------------------------

/**
 * Why one requirement is blocking.
 *
 * Deliberately not a subset of `DocStatus`: `untracked` is a state no row can
 * carry (ADR-004 D5), and the two on-file statuses never block, so this is a
 * smaller, gate-shaped vocabulary of its own.
 */
export type DocBlockerReason = 'untracked' | 'missing' | 'pending';

export interface DocBlocker {
  /**
   * The requirement key. Internal — fine as a React key or a test handle, but
   * **never rendered**: FR-06 AC-1 forbids showing a raw `document_key` to a
   * user. Render {@link DocBlocker.label} instead.
   */
  key: string;
  /** The configured display name (`document_name`), e.g. "Notice to Proceed". */
  label: string;
  /** Lifecycle stage the requirement belongs to, for grouping in the strip. */
  stage: string;
  /** Compliance-bearing requirements sort first and drive `criticalCount`. */
  critical: boolean;
  reason: DocBlockerReason;
}

export interface BatchBlockerSummary {
  /** Critical first, then original catalog order within each group. */
  blockers: DocBlocker[];
  /** Total blocking requirements — the batch card's blocker count. */
  count: number;
  /** Size of the critical subset, for "N critical" emphasis in the strip. */
  criticalCount: number;
}

/**
 * Which blocking reason applies to one requirement, or `null` when it is on
 * file and therefore not blocking.
 */
function blockerReasonFor(batch: Batch, key: string): DocBlockerReason | null {
  const record = docRecordFor(batch, key);
  if (record === null) return 'untracked';
  if (isDocOnFile(batch, key)) return null;
  // Narrowed by elimination: `missing` and `pending` are the only members of
  // `DocStatus` left once the two on-file statuses are excluded.
  return record.status === 'pending' ? 'pending' : 'missing';
}

/**
 * The named list of documents blocking one batch, plus counts.
 *
 * Answers FR-06 AC-2 ("missing documents are named explicitly; batch card
 * shows blocker count") for whatever catalog the caller passes. Pass
 * {@link criticalRequirements} to restrict the strip to compliance-bearing
 * documents; pass the full catalog for the complete picture.
 *
 * An empty `requirements` yields an empty summary, not a blocked batch — the
 * caller asked about nothing, which is not evidence of a problem. (Contrast
 * ADR-004 D3: *measuring* nothing yields `null`/unknown, because a percentage
 * of nothing is unanswerable, whereas a list of nothing is simply empty.)
 */
export function blockingDocuments(
  batch: Batch,
  requirements: readonly DocumentRequirement[],
): BatchBlockerSummary {
  const blockers: DocBlocker[] = [];

  for (const req of requirements) {
    const reason = blockerReasonFor(batch, req.key);
    if (reason === null) continue;
    blockers.push({
      key: req.key,
      label: req.label,
      stage: req.stage,
      critical: req.critical,
      reason,
    });
  }

  // Stable partition rather than a comparator: expressing "critical first,
  // catalog order within" as two filters states the intent without depending
  // on sort stability.
  const ordered = [...blockers.filter((b) => b.critical), ...blockers.filter((b) => !b.critical)];

  return {
    blockers: ordered,
    count: ordered.length,
    criticalCount: ordered.filter((b) => b.critical).length,
  };
}

/**
 * Just the blocker count — the batch card's badge.
 *
 * A separate entry point so a card rendering only a number does not build and
 * discard the whole list.
 */
export function blockerCount(
  batch: Batch,
  requirements: readonly DocumentRequirement[],
): number {
  let count = 0;
  for (const req of requirements) {
    if (blockerReasonFor(batch, req.key) !== null) count += 1;
  }
  return count;
}

/**
 * Human-readable names of the blocking documents, in strip order.
 *
 * The function a screen should call to *render* names, so no caller is tempted
 * to reach for `.key`. Returns display names only (FR-06 AC-1).
 */
export function blockingDocumentNames(
  batch: Batch,
  requirements: readonly DocumentRequirement[],
): string[] {
  return blockingDocuments(batch, requirements).blockers.map((b) => b.label);
}
