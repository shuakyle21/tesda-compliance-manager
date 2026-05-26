/* global React, Icon */
/* Charts — simple SVG bar charts for the Analytics view. No external chart lib. */

const COLORS = {
  amber: '#C7600F',
  blue:  '#185FA5',
  green: '#3B6D11',
  bgAlt: '#EEECEA',
  text:  '#5A5950',
  muted: '#97968E',
  faint: '#E8E6E2',
  red:   '#C81F1F',
};

const BATCH_COLOR = ['amber', 'blue', 'green'];

function HBar({ rows, max = 100, unit = '%' }) {
  // rows: [{ label, value, colorKey }]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)',
            marginBottom: 4,
          }}>
            <span>{r.label}</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{r.value}{unit}</span>
          </div>
          <div style={{
            height: 20, borderRadius: 3, background: COLORS.bgAlt,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${Math.min(100, (r.value / max) * 100)}%`,
              background: COLORS[r.colorKey], borderRadius: 3,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VBar({ rows, max, unit = '', referenceLine }) {
  const w = 360, h = 180, pad = { l: 32, r: 12, t: 8, b: 28 };
  const chartW = w - pad.l - pad.r, chartH = h - pad.t - pad.b;
  const colW = chartW / rows.length;

  const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max].map(v => Math.round(v));

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace' }}>
      {/* horizontal grid */}
      {ticks.map((t, i) => {
        const y = pad.t + chartH - (t / max) * chartH;
        return (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={COLORS.faint} strokeWidth="1" />
            <text x={pad.l - 6} y={y + 3} fontSize="9" fill={COLORS.muted} textAnchor="end">{t}{unit}</text>
          </g>
        );
      })}
      {referenceLine != null && (() => {
        const y = pad.t + chartH - (referenceLine / max) * chartH;
        return <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={COLORS.red} strokeWidth="1" strokeDasharray="3 3" />;
      })()}
      {rows.map((r, i) => {
        const barW = colW * 0.55;
        const x = pad.l + i * colW + (colW - barW) / 2;
        const barH = (r.value / max) * chartH;
        const y = pad.t + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 2)} rx="3" fill={COLORS[r.colorKey]} />
            <text x={x + barW / 2} y={y - 4} fontSize="9" fill={COLORS.text} textAnchor="middle" fontWeight="500">{r.value}{unit}</text>
            <text x={x + barW / 2} y={h - pad.b + 14} fontSize="9" fill={COLORS.muted} textAnchor="middle">{r.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedBar({ rows, max }) {
  // rows: [{label, elapsed, remaining, colorKey}]
  const w = 360, h = 180, pad = { l: 32, r: 12, t: 8, b: 28 };
  const chartW = w - pad.l - pad.r, chartH = h - pad.t - pad.b;
  const colW = chartW / rows.length;
  const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max].map(v => Math.round(v));

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace' }}>
      {ticks.map((t, i) => {
        const y = pad.t + chartH - (t / max) * chartH;
        return (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={COLORS.faint} />
            <text x={pad.l - 6} y={y + 3} fontSize="9" fill={COLORS.muted} textAnchor="end">{t}</text>
          </g>
        );
      })}
      {rows.map((r, i) => {
        const barW = colW * 0.55;
        const x = pad.l + i * colW + (colW - barW) / 2;
        const elapsedH = (r.elapsed / max) * chartH;
        const remainH  = (r.remaining / max) * chartH;
        const totalH = elapsedH + remainH;
        const yTop = pad.t + chartH - totalH;
        return (
          <g key={i}>
            <rect x={x} y={pad.t + chartH - elapsedH} width={barW} height={elapsedH} fill={COLORS[r.colorKey]} rx="2" />
            <rect x={x} y={yTop} width={barW} height={remainH} fill={COLORS.bgAlt} rx="2" />
            <text x={x + barW / 2} y={yTop - 4} fontSize="9" fill={COLORS.text} textAnchor="middle" fontWeight="500">{r.elapsed}/{r.elapsed + r.remaining}</text>
            <text x={x + barW / 2} y={h - pad.b + 14} fontSize="9" fill={COLORS.muted} textAnchor="middle">{r.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ChartLegend({ items }) {
  return (
    <div style={{
      display: 'flex', gap: 14, marginBottom: 12,
      fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-text-muted)',
    }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: COLORS[it.colorKey] }} />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

window.HBar = HBar;
window.VBar = VBar;
window.StackedBar = StackedBar;
window.ChartLegend = ChartLegend;
window.BATCH_COLOR = BATCH_COLOR;
