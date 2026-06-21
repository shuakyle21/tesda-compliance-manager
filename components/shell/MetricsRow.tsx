/**
 * STEP 7b — Shell Component: MetricsRow
 *
 * Renders the 5-card KPI summary in the `.metrics` grid (5 → 3 → 2 → 1 columns
 * responsive, from design-system.css). Server Component — derives metrics from
 * the mock data layer at render time. Mirrors the prototype's App.jsx metrics.
 */

import { MetricCard } from '@/components/ui/MetricCard';
import { getMockMetrics, MOCK_BATCHES } from '@/lib/data/mock-batches';
import type { DashboardMetrics } from '@/lib/data/types';

export function MetricsRow({ metrics = getMockMetrics() }: { metrics?: DashboardMetrics }) {
  const hasBatches = MOCK_BATCHES.length > 0;
  return (
    <div className="metrics">
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
      <MetricCard
        label="EARLIEST BILLING"
        value={metrics.earliestBillingDeadline}
        sub={hasBatches ? `${metrics.daysToEarliestBilling} days remaining` : 'No batches'}
        iconName="receipt"
        variant={metrics.daysToEarliestBilling <= 6 ? 'critical' : metrics.daysToEarliestBilling <= 21 ? 'warning' : 'neutral'}
      />
      <MetricCard
        label="DOC COMPLIANCE"
        value={`${metrics.docCompliancePct}%`}
        sub={metrics.docMissing > 0 ? `${metrics.docMissing} missing` : 'All verified'}
        iconName="file-check"
        variant={metrics.docMissing > 0 ? 'critical' : metrics.docPending > 0 ? 'warning' : 'neutral'}
      />
    </div>
  );
}

export default MetricsRow;
