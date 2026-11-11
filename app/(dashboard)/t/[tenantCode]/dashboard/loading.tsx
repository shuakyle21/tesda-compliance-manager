/**
 * Dashboard loading state (TES-8).
 *
 * Next.js renders this automatically (via Suspense) while the async server
 * page resolves. Skeleton mirrors the real layout — title → KPI row →
 * Needs attention + lifecycle → panel pair — using the same grid classes, so
 * nothing jumps when the data lands.
 */

import { SkeletonBlock } from '@/shared/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <>
      <span className="sr-only" role="status">Loading dashboard</span>
      <div className="dashboard-view" aria-busy="true">
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      <section className="dash-kpi-grid" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} h={96} />)}
      </section>

      <div className="dash-ops-grid" aria-hidden="true">
        <SkeletonBlock h={320} />
        <SkeletonBlock h={320} />
      </div>

      <div className="dash-pair" aria-hidden="true">
        <SkeletonBlock h={220} />
        <SkeletonBlock h={220} />
      </div>
      </div>
    </>
  );
}
