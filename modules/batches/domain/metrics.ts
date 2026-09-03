/**
 * Dashboard metric derivation — the 5/6-card KPI summary, computed from a batch
 * set (never hardcoded, so the numbers cannot drift from the records).
 *
 * Moved out of `shared/mocks/index.ts` (TES-94) for two reasons: it was called
 * `getMockMetrics` while the dashboard already fed it **live** batches, and its
 * document-compliance half had to consult `modules/documents/domain/compliance`
 * — an import `shared/` is not allowed to make. Same precedent as TES-68 moving
 * `urgencyTier` and `isBillingReady` out of `shared/`.
 */

import { criticalRequirements, summarizeDocCompliance } from '@/modules/documents/domain/compliance';
import type { Batch, DashboardMetrics, DocumentRequirement } from '@/shared/types';

/**
 * Derives the 5-card dashboard metrics from a batch set and requirement catalog.
 * All numbers are computed from the inputs (never hardcoded), so they cannot
 * drift from the underlying records. Document compliance routes through the
 * compliance domain module to apply the ADR-004 untracked-exclusion rule.
 */
export function deriveDashboardMetrics(
  batches: readonly Batch[],
  requirements: readonly DocumentRequirement[],
): DashboardMetrics {
  const totalBatches = batches.length;
  const totalScholars = batches.reduce((s, b) => s + b.scholars, 0);
  const avgProgress = totalBatches
    ? Math.round(batches.reduce((s, b) => s + b.progressPct, 0) / totalBatches)
    : 0;
  const activeBatches = batches.filter((b) => b.status === 'ongoing').length;

  const earliest = totalBatches
    ? batches.slice().sort((a, b) => a.daysToBilling - b.daysToBilling)[0]
    : null;

  // Critical-document compliance (ADR-004): untracked requirement keys are
  // excluded from the percentage rather than counted as verified, and
  // `docCompliancePct` is null — "unknown" — when nothing is tracked at all.
  const docs = summarizeDocCompliance(batches, criticalRequirements(requirements));

  return {
    totalBatches,
    totalScholars,
    avgProgress,
    earliestBillingDeadline: earliest ? earliest.billingDeadline.replace(/, \d+$/, '') : '—',
    daysToEarliestBilling: earliest ? earliest.daysToBilling : 0,
    activeBatches,
    docCompliancePct: docs.onFilePct,
    docMissing: docs.missing,
    docPending: docs.pending,
    docTracked: docs.tracked,
    docUntracked: docs.untracked,
  };
}
