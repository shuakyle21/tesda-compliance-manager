/**
 * SCREEN — Analytics (ported from App.jsx AnalyticsView)
 *
 * Six dependency-free SVG charts derived from the active batch set. Pure render,
 * so this stays a Server Component — the charts compute from MOCK_BATCHES at
 * render time.
 */

import { MOCK_BATCHES, DOCUMENT_REQUIREMENTS } from '@/lib/data/mock-batches';
import { HBar, VBar, StackedBar, ChartLegend, BATCH_COLOR } from '@/components/ui/Charts';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';

export default function AnalyticsPage() {
  const batches = MOCK_BATCHES;

  if (!batches.length) {
    return (
      <div>
        <Header />
        <EmptyState heading="No data to chart" sub="Import a CSV to populate analytics." />
      </div>
    );
  }

  const progressRows = batches.slice().sort((a, b) => b.progressPct - a.progressPct)
    .map((b, i) => ({ label: b.id, value: b.progressPct, colorKey: BATCH_COLOR[i % BATCH_COLOR.length] }));

  const daysRows = batches.map((b) => ({
    label: b.id, elapsed: b.currentDay, remaining: b.totalDays - b.currentDay,
    colorKey: BATCH_COLOR[batches.indexOf(b) % BATCH_COLOR.length],
  }));

  const ntpRows = batches.map((b) => ({
    label: b.id, value: b.ntpLag, colorKey: b.ntpLag === 0 ? 'green' : b.ntpLag <= 7 ? 'amber' : 'red',
  }));

  const scholarRows = batches.map((b, i) => ({ label: b.id, value: b.scholars, colorKey: BATCH_COLOR[i % BATCH_COLOR.length] }));
  const avgSch = scholarRows.reduce((s, r) => s + r.value, 0) / scholarRows.length;

  const docRows = batches.map((b, i) => {
    const crit = DOCUMENT_REQUIREMENTS.filter((r) => r.critical);
    const ok = crit.filter((r) => b.documents[r.key].status === 'verified').length;
    return { label: b.id, value: Math.round((ok / crit.length) * 100), colorKey: BATCH_COLOR[i % BATCH_COLOR.length] };
  });

  return (
    <div>
      <Header />
      <div className="analytics-grid">
        <div className="surface chart-card">
          <div className="chart-head"><div className="chart-title">Training progress by batch</div><div className="chart-sub">% complete · descending</div></div>
          <HBar rows={progressRows} max={100} />
        </div>
        <div className="surface chart-card">
          <div className="chart-head"><div className="chart-title">Days elapsed vs remaining</div><div className="chart-sub">solid = elapsed · light = remaining</div></div>
          <ChartLegend items={progressRows.map((r) => ({ label: r.label, colorKey: r.colorKey }))} />
          <StackedBar rows={daysRows} max={50} />
        </div>
        <div className="surface chart-card">
          <div className="chart-head"><div className="chart-title">NTP → Training start lag</div><div className="chart-sub">15-day rule reference</div></div>
          <VBar rows={ntpRows} max={15} unit="d" referenceLine={15} />
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, fontStyle: 'italic' }}>
            BAT-2 started same day as NTP receipt.
          </div>
        </div>
        <div className="surface chart-card">
          <div className="chart-head"><div className="chart-title">Document compliance</div><div className="chart-sub">critical docs verified · %</div></div>
          <HBar rows={docRows} max={100} />
        </div>
        <div className="surface chart-card">
          <div className="chart-head"><div className="chart-title">Enrolled scholars by batch</div><div className="chart-sub">avg {avgSch.toFixed(1)} per batch</div></div>
          <VBar rows={scholarRows} max={20} referenceLine={avgSch} />
        </div>
        <div className="surface chart-card">
          <div className="chart-head"><div className="chart-title">Alerts sent (30 days)</div><div className="chart-sub">by category</div></div>
          <HBar
            rows={[
              { label: 'Billing critical', value: 8, colorKey: 'red' },
              { label: 'Doc missing', value: 6, colorKey: 'amber' },
              { label: 'BSRS approved', value: 3, colorKey: 'green' },
              { label: 'NTP lag', value: 2, colorKey: 'red' },
              { label: 'Weekly digest', value: 4, colorKey: 'blue' },
            ]}
            max={10}
          />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="page-head">
      <h1>Analytics</h1>
      <span className="subline">4 charts · tenant-scoped</span>
      <div style={{ marginLeft: 'auto' }}>
        <button className="btn secondary"><Icon name="download" size={14} />Export</button>
      </div>
    </div>
  );
}
