/**
 * Shell Component: MetricsRow
 *
 * Thin placement wrapper around `KpiSummary`, the one KPI row. Used by the
 * trainer dashboard only; the school dashboard renders `KpiSummary` itself
 * (with the Needs-attention card). No other screen shows a KPI row.
 */

import { KpiSummary, type KpiLinks } from '@/modules/batches/ui/KpiSummary';
import type { TrainerDashboardMetrics } from '@/shared/types';

export function MetricsRow({
  metrics,
  links,
}: {
  /** Trainer summary: carries no billing figures (RULES.md rule 5). */
  metrics: TrainerDashboardMetrics;
  links: KpiLinks;
}) {
  return (
    <div className="shell-kpis">
      <KpiSummary metrics={metrics} links={links} />
    </div>
  );
}

export default MetricsRow;
