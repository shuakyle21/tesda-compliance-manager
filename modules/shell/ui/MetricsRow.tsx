/**
 * STEP 7b — Shell Component: MetricsRow
 *
 * Renders the 5-card KPI summary in the `.metrics` grid (5 → 3 → 2 → 1 columns
 * responsive, from design-system.css). Server Component — derives metrics from
 * the mock data layer at render time. Mirrors the prototype's App.jsx metrics.
 */

import { MetricCard } from '@/shared/ui/MetricCard';
import { getMockMetrics } from '@/shared/mocks';
import type { DashboardMetrics } from '@/shared/types';

export function MetricsRow({
  metrics = getMockMetrics(),
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
        variant={!hasBatches ? 'neutral' : metrics.avgProgress < 60 ? 'warning' : 'neutral'}
      />
      {!hideBilling && (
        <MetricCard
          label="EARLIEST BILLING"
          value={metrics.earliestBillingDeadline}
          sub={hasBatches ? `${metrics.daysToEarliestBilling} days remaining` : 'No batches'}
          iconName="receipt"
          // `hasBatches` guard is load-bearing (TES-74): with no batches,
          // daysToEarliestBilling is 0, which would otherwise style an empty state
          // as a critical billing deadline — a red card raising an alarm about a
          // deadline that does not exist.
          variant={!hasBatches ? 'neutral' : metrics.daysToEarliestBilling <= 6 ? 'critical' : metrics.daysToEarliestBilling <= 21 ? 'warning' : 'neutral'}
        />
      )}
      <MetricCard
        label="DOC COMPLIANCE"
        value={`${metrics.docCompliancePct}%`}
        // 'All verified' must not appear when there is nothing to verify (TES-74) —
        // on a compliance tool that reads as a cleared checklist rather than an
        // empty one.
        sub={!hasBatches ? 'No batches' : metrics.docMissing > 0 ? `${metrics.docMissing} missing` : 'All verified'}
        iconName="file-check"
        variant={metrics.docMissing > 0 ? 'critical' : metrics.docPending > 0 ? 'warning' : 'neutral'}
      />
    </div>
  );
}

export default MetricsRow;
