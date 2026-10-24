/**
 * Shell Component: MetricsRow
 *
 * The KPI row the `(dashboard)` layout mounts above every route except
 * /dashboard (which renders its own, with the Needs-attention card). It is a
 * thin placement wrapper around `KpiSummary` — it used to be a second KPI
 * implementation with its own sub-copy ("On plan for Q2", "All training
 * ongoing") and its own variant rules, so the same tenant saw the same number
 * styled differently per route (audit B2/B3). There is now one row.
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
   * that applies; see `app/(dashboard)/layout.tsx`.
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
