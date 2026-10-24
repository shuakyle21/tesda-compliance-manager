/**
 * Dashboard loading state (TES-8).
 *
 * Next.js renders this automatically (via Suspense) while the async server
 * page resolves. Skeleton mirrors the real layout — title → KPI row →
 * Needs attention + lifecycle → panel pair — using the same grid classes, so
 * nothing jumps when the data lands.
 */

const shimmer: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--color-text-muted) 12%, var(--color-surface-alt))',
  borderRadius: 'var(--radius-lg)',
};

function Block({ h }: { h: number }) {
  return <div aria-hidden="true" style={{ ...shimmer, height: h }} />;
}

export default function DashboardLoading() {
  return (
    <div className="dashboard-view" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      <section className="dash-kpi-grid" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => <Block key={i} h={96} />)}
      </section>

      <div className="dash-ops-grid" aria-hidden="true">
        <Block h={320} />
        <Block h={320} />
      </div>

      <div className="dash-pair" aria-hidden="true">
        <Block h={220} />
        <Block h={220} />
      </div>
    </div>
  );
}
