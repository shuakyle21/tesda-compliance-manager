/**
 * Shell Component: MetricsRow
 *
 * Thin placement wrapper around `KpiSummary`, the one KPI row. Used by the
 * trainer dashboard only; the school dashboard renders `KpiSummary` itself
 * (with the Needs-attention card). No other screen shows a KPI row.
 */

import { KpiSummary, type KpiLinks } from '@/modules/batches/ui/KpiSummary';
import type { DashboardMetrics } from '@/shared/types';

export function MetricsRow({
  metrics,
  links,
  hideBilling = false,
}: {
  metrics: DashboardMetrics;
  links: KpiLinks;
  /**
   * Trainer-facing routes must omit billing figures server-side, not via CSS
   * (CLAUDE.md role rules). The layout — not this component — decides when
   * that applies; see `app/(dashboard)/trainer/page.tsx`.
   */
  hideBilling?: boolean;
}) {
  return (
    <div className="shell-kpis">
      <KpiSummary metrics={metrics} links={links} hideBilling={hideBilling} />
    </div>
  );
}

export default MetricsRow;
