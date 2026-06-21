/**
 * Progress & Compliance Trend — dual-line chart over the last 6 weeks.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 8:4656.
 * Two series — Avg training progress (blue) and Doc compliance (green) — with
 * 0–100% gridlines, weekly x-axis (W-5 … Now), and a legend below.
 *
 * Data-driven from `SNAPSHOTS`: progress uses `progressPct`; compliance is
 * `docsComplete` over the required-doc count. Dependency-free inline SVG,
 * matching the project's no-chart-library convention. The Figma renders the
 * plot as flattened image vectors — rebuilt here so it tracks the data.
 */

import { Icon } from '@/components/ui/Icon';
import { DOCUMENT_REQUIREMENTS } from '@/lib/data/mock-batches';
import { SNAPSHOTS } from '@/lib/data/seed';

const WEEK_LABELS = ['W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'];
const GRID = [100, 75, 50, 25, 0];

// SVG coordinate space (scaled responsively via viewBox).
const W = 880;
const H = 200;
const PAD_L = 50;
const PAD_R = 16;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 160;

export function ProgressTrend() {
  const docTotal = Math.max(1, DOCUMENT_REQUIREMENTS.length);
  const points = SNAPSHOTS.slice(0, 6);
  const n = Math.max(2, points.length);

  const progress = points.map((s) => s.progressPct);
  const compliance = points.map((s) => Math.round((s.docsComplete / docTotal) * 100));

  const xOf = (i: number) => PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R);
  const yOf = (v: number) => PLOT_BOTTOM - (Math.max(0, Math.min(100, v)) / 100) * (PLOT_BOTTOM - PLOT_TOP);
  const polyline = (series: number[]) => series.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');

  return (
    <section className="dash-panel" aria-labelledby="trend-heading">
      <div className="dash-panel-head">
        <div id="trend-heading" className="dash-panel-title">
          <Icon name="chart-dots" size={13} />
          Progress &amp; Compliance Trend
        </div>
        <div className="dash-panel-meta">last 6 weeks</div>
      </div>

      <div className="dash-panel-body">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Training progress and document compliance over the last 6 weeks" style={{ display: 'block' }}>
          {/* Gridlines + y labels */}
          {GRID.map((g) => {
            const y = yOf(g);
            return (
              <g key={g}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--color-border-faint)" strokeWidth={1} />
                <text x={PAD_L - 8} y={y + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill="var(--color-text-muted)">
                  {g}%
                </text>
              </g>
            );
          })}

          {/* X labels */}
          {WEEK_LABELS.slice(0, n).map((label, i) => (
            <text key={label} x={xOf(i)} y={H - 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="var(--color-text-secondary)">
              {label}
            </text>
          ))}

          {/* Compliance (green) then progress (blue) so progress sits on top */}
          <polyline points={polyline(compliance)} fill="none" stroke="var(--color-green)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={polyline(progress)} fill="none" stroke="var(--color-blue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {compliance.map((v, i) => (
            <circle key={`c-${i}`} cx={xOf(i)} cy={yOf(v)} r={3} fill="var(--color-surface)" stroke="var(--color-green)" strokeWidth={1.5} />
          ))}
          {progress.map((v, i) => (
            <circle key={`p-${i}`} cx={xOf(i)} cy={yOf(v)} r={3} fill="var(--color-surface)" stroke="var(--color-blue)" strokeWidth={1.5} />
          ))}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 10 }}>
          <LegendLine color="var(--color-blue)" label="Avg training progress" />
          <LegendLine color="var(--color-green)" label="Doc compliance" />
        </div>
      </div>
    </section>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 14, height: 3, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</span>
    </span>
  );
}

export default ProgressTrend;
