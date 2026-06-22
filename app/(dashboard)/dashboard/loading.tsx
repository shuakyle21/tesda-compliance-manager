/**
 * Dashboard loading state (TES-8).
 *
 * Next.js renders this automatically (via Suspense) while the async server
 * page resolves. Skeleton mirrors the real layout: header → KPI row →
 * charts row → wide panels, using the shared surface/border tokens.
 */

const shimmer: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--color-text-muted) 12%, var(--color-surface-alt))',
  borderRadius: 'var(--radius-md)',
};

function Block({ h, style }: { h: number; style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={{ ...shimmer, height: h, ...style }} />;
}

export default function DashboardLoading() {
  return (
    <div className="dashboard-view" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-head">
        <h1>Dashboard</h1>
        <span className="subline">Loading latest snapshot…</span>
      </div>

      <section className="dash-kpi-grid" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} h={88} />
        ))}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(0, 2fr)', gap: 16, marginTop: 16 }}>
        <Block h={320} />
        <Block h={320} />
      </div>

      <Block h={170} style={{ marginTop: 16 }} />
      <Block h={210} style={{ marginTop: 16 }} />

      <section className="dash-main-grid" aria-hidden="true" style={{ marginTop: 16 }}>
        <Block h={240} />
        <Block h={240} />
        <Block h={240} />
      </section>
    </div>
  );
}
