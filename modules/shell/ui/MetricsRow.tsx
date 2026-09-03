/**
 * STEP 7b — Shell Component: MetricsRow
 *
 * Renders the 5-card KPI summary in the `.metrics` grid (5 → 3 → 2 → 1 columns
 * responsive, from design-system.css). Server Component — derives metrics from
 * the mock data layer at render time. Mirrors the prototype's App.jsx metrics.
 */

import { MetricCard } from '@/shared/ui/MetricCard';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import { MOCK_BATCHES, DOCUMENT_REQUIREMENTS } from '@/shared/mocks';
import type { DashboardMetrics } from '@/shared/types';

/**
 * Generate the sub-text for the Doc Compliance metric card.
 *
 * 'All verified' must not appear when there is nothing to verify (TES-74) —
 * on a compliance tool that reads as a cleared checklist rather than an empty
 * one. ADR-004 extends the same reasoning to untracked requirements: no tracked
 * documents is "unknown", and a partially tracked set says how much it covers.
 *
 * @param metrics - The dashboard metrics
 * @param hasBatches - Whether there are any batches
 * @returns Sub-text like "5 missing" or "All on file"
 */
function docComplianceSub(metrics: DashboardMetrics, hasBatches: boolean): string {
  if (!hasBatches) return 'No batches';
  if (metrics.docCompliancePct === null) return 'Document sync pending';
  if (metrics.docMissing > 0) return `${metrics.docMissing} missing`;
  if (metrics.docUntracked > 0) {
    return `${metrics.docTracked} of ${metrics.docTracked + metrics.docUntracked} tracked`;
  }
  return 'All on file';
}

/**
 * Determine the variant styling for the Doc Compliance card.
 *
 * @param metrics - The dashboard metrics
 * @returns Variant: 'critical' if missing, 'warning' if pending, else 'neutral'
 */
function docComplianceVariant(metrics: DashboardMetrics): 'critical' | 'warning' | 'neutral' {
  if (metrics.docMissing > 0) return 'critical';
  if (metrics.docPending > 0) return 'warning';
  return 'neutral';
}

/**
 * Determine the variant styling for the Avg Progress card.
 *
 * @param hasBatches - Whether there are any batches
 * @param avgProgress - The average progress percentage
 * @returns Variant: 'warning' if progress is below 60%, else 'neutral'
 */
function avgProgressVariant(hasBatches: boolean, avgProgress: number): 'warning' | 'neutral' {
  if (!hasBatches) return 'neutral';
  return avgProgress < 60 ? 'warning' : 'neutral';
}

/**
 * Generate the sub-text for the Earliest Billing card.
 *
 * @param hasBatches - Whether there are any batches
 * @param daysToEarliestBilling - Days until the earliest billing deadline
 * @returns Sub-text like "5 days remaining" or "No batches"
 */
function billingSub(hasBatches: boolean, daysToEarliestBilling: number): string {
  return hasBatches ? `${daysToEarliestBilling} days remaining` : 'No batches';
}

/**
 * Determine the variant styling for the Earliest Billing card.
 *
 * `hasBatches` guard is load-bearing (TES-74): with no batches,
 * daysToEarliestBilling is 0, which would otherwise style an empty state
 * as a critical billing deadline — a red card raising an alarm about a
 * deadline that does not exist.
 *
 * @param hasBatches - Whether there are any batches
 * @param daysToEarliestBilling - Days until the earliest billing deadline
 * @returns Variant: 'critical' if ≤6 days, 'warning' if ≤21 days, else 'neutral'
 */
function billingVariant(hasBatches: boolean, daysToEarliestBilling: number): 'critical' | 'warning' | 'neutral' {
  if (!hasBatches) return 'neutral';
  if (daysToEarliestBilling <= 6) return 'critical';
  return daysToEarliestBilling <= 21 ? 'warning' : 'neutral';
}

/**
 * Dashboard metrics row component displaying 5-card KPI summary.
 *
 * Renders the KPI summary in a responsive grid (5 → 3 → 2 → 1 columns). Server
 * Component that derives metrics from the provided data. Mirrors the prototype's
 * App.jsx metrics. Trainer-facing routes hide the billing card via the
 * `hideBilling` prop (server-side omission, not CSS).
 *
 * @param metrics - The dashboard metrics to display (defaults to derived from mock batches)
 * @param hideBilling - Whether to hide the billing deadline card (for trainer routes)
 */
export function MetricsRow({
  metrics = deriveDashboardMetrics(MOCK_BATCHES, DOCUMENT_REQUIREMENTS),
  hideBilling = false,
}: {
  metrics?: DashboardMetrics;
  /**
   * Trainer-facing routes must omit billing figures server-side, not via CSS
   * (CLAUDE.md role rules). This row is mounted once by the shared `(dashboard)`
   * layout for every route including `/trainer/*`, so the layout — not this
   * component — decides when that applies; see `app/(dashboard)/layout.tsx`.
   */
  hideBilling?: boolean;
}) {
  // Derived from the injected metrics, never from the mock array (TES-74). Reading
  // MOCK_BATCHES here made the empty state unreachable for any caller passing real
  // data, since the mock set is never empty.
  const hasBatches = metrics.totalBatches > 0;
  return (
    <div className={hideBilling ? 'metrics metrics-4' : 'metrics'}>
      <MetricCard
        label="TOTAL BATCHES"
        value={metrics.totalBatches}
        sub={hasBatches ? 'All training ongoing' : 'No batches yet'}
        iconName="folders"
      />
      <MetricCard label="TOTAL SCHOLARS" value={metrics.totalScholars} iconName="users" />
      <MetricCard
        label="AVG PROGRESS"
        value={`${metrics.avgProgress}%`}
        sub="On plan for Q2"
        iconName="chart-dots"
        variant={avgProgressVariant(hasBatches, metrics.avgProgress)}
      />
      {!hideBilling && (
        <MetricCard
          label="EARLIEST BILLING"
          value={metrics.earliestBillingDeadline}
          sub={billingSub(hasBatches, metrics.daysToEarliestBilling)}
          iconName="receipt"
          variant={billingVariant(hasBatches, metrics.daysToEarliestBilling)}
        />
      )}
      <MetricCard
        label="DOC COMPLIANCE"
        // null = nothing tracked → unknown, not 0% (ADR-004 / TES-94).
        value={metrics.docCompliancePct === null ? '—' : `${metrics.docCompliancePct}%`}
        sub={docComplianceSub(metrics, hasBatches)}
        iconName="file-check"
        variant={docComplianceVariant(metrics)}
      />
    </div>
  );
}

export default MetricsRow;
