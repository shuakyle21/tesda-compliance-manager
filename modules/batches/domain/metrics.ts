/**
 * Dashboard metric derivation — the one canonical KPI summary, computed from a
 * batch set (never hardcoded, so the numbers cannot drift from the records).
 * Both the dashboard KPI grid and the shell's metrics row read this; neither
 * re-derives a number of its own.
 *
 * One population: every count, roster and average describes the **active**
 * (`ongoing`) batches. Mixing "active batches" with "all-status scholars" put
 * a completed cohort's roster beside an active-batch count (audit B1).
 *
 * Only verified signals: session progress comes from attendance (ADR-001 B2),
 * never the hand-typed `progress_percent`; a deadline counts down only when one
 * was recorded. Anything without a source is `null` — "not yet tracked".
 */

import { summarizeOwnCatalogCompliance } from '@/modules/documents/domain/compliance';
import { hasOpenBillingObligation, hasRecordedBillingDeadline, urgencyTier } from './urgency';
import type { Batch, DashboardMetrics } from '@/shared/types';

function isActive(batch: Batch): boolean {
  return batch.status === 'ongoing';
}

/** Mean session completion over the batches that have attendance, or null when none do. */
function sessionProgress(batches: readonly Batch[]): { pct: number | null; tracked: number } {
  const tracked = batches.filter((b) => b.completedSessions !== null && b.totalSessions);
  if (tracked.length === 0) return { pct: null, tracked: 0 };
  const sum = tracked.reduce((s, b) => s + Math.min(1, b.completedSessions! / b.totalSessions!), 0);
  return { pct: Math.round((sum / tracked.length) * 100), tracked: tracked.length };
}

export function deriveDashboardMetrics(batches: readonly Batch[]): DashboardMetrics {
  const active = batches.filter(isActive);
  const open = batches.filter(hasOpenBillingObligation);
  const dated = open
    .filter(hasRecordedBillingDeadline)
    .sort((a, b) => a.daysToBilling - b.daysToBilling);
  const next = dated[0] ?? null;
  const progress = sessionProgress(active);

  // Critical-document compliance (ADR-004), each batch against its own
  // program's catalog: untracked keys are excluded, and the percentage is
  // null — "unknown" — when nothing is tracked at all.
  const docs = summarizeOwnCatalogCompliance(active);

  return {
    totalBatches: batches.length,
    activeBatches: active.length,
    activeScholars: active.reduce((s, b) => s + b.scholars, 0),
    sessionProgressPct: progress.pct,
    sessionTrackedBatches: progress.tracked,
    nextBilling: next && next.billingDeadline
      ? { batchId: next.id, deadline: next.billingDeadline, daysToBilling: next.daysToBilling }
      : null,
    openBillingObligations: open.length,
    billingDeadlinesMissing: open.length - dated.length,
    overdueBilling: dated.filter((b) => urgencyTier(b.daysToBilling) === 'overdue').length,
    docCompliancePct: docs.onFilePct,
    docMissing: docs.missing,
    docPending: docs.pending,
    docTracked: docs.tracked,
    docUntracked: docs.untracked,
  };
}
