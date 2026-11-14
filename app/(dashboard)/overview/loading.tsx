/**
 * Overview loading state. Mirrors the real layout — title → filters → KPI row
 * → queue → schools table → panel pair — with the same grid classes, so
 * nothing jumps when the data lands.
 */

import { SkeletonBlock } from '@/shared/ui/Skeleton';

export default function OverviewLoading() {
  return (
    <>
      <span className="sr-only" role="status">Loading overview</span>
      <div className="dashboard-view" aria-busy="true">
        <div className="page-head">
          <h1>Managed TVI overview</h1>
        </div>
        <div aria-hidden="true"><SkeletonBlock h={34} /></div>
        <section className="dash-kpi-grid" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} h={96} />)}
        </section>
        <div aria-hidden="true"><SkeletonBlock h={280} /></div>
        <div aria-hidden="true"><SkeletonBlock h={220} /></div>
        <div className="dash-pair" aria-hidden="true">
          <SkeletonBlock h={220} />
          <SkeletonBlock h={220} />
        </div>
      </div>
    </>
  );
}
