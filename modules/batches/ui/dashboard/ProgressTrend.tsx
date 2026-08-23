'use client';

/**
 * Progress & Compliance Trend — dual-line chart over the last 6 weeks.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 8:4656. Ported
 * from the Claude Design prototype's `drawTrend()` (project e3ea69aa,
 * TVI-CAMS.dc.html) for visual fidelity: monotone lines with a soft area
 * fill, D3-generated axes/gridlines, a draw-on line animation, per-series
 * end-of-line % labels, and a hover crosshair with a per-week tooltip.
 *
 * That fidelity — animation and pointer-driven hover state — needs real DOM
 * manipulation, which is why this is a Client Component built on d3-selection
 * (unlike the Server-Component-friendly scale-math-only components elsewhere
 * in this module). `series` is computed by the caller and passed in as a
 * prop specifically so the mock dataset it derives from doesn't itself need
 * to ship into the client bundle.
 */

import { useEffect, useRef } from 'react';
import { select, pointer } from 'd3-selection';
import 'd3-transition';
import { scaleLinear, scalePoint } from 'd3-scale';
import { line as d3Line, area as d3Area, curveMonotoneX } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { easeCubicOut } from 'd3-ease';
import { Icon } from '@/shared/ui/Icon';

export type TrendSeries = {
  /** CSS custom-property name, e.g. '--color-blue' — resolved at draw time. */
  varName: string;
  label: string;
  values: number[];
};

const WEEK_LABELS = ['W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'now'];
const MARGIN = { t: 16, r: 16, b: 26, l: 32 };

function cssVar(el: Element, name: string): string {
  return getComputedStyle(el.ownerDocument.documentElement).getPropertyValue(name).trim() || '#888';
}

// The hover tooltip is built as an HTML string (`tip.html(...)`), so it can
// mix per-series colored bullets with a `<br>`-separated readout line. Every
// value interpolated into it today is a `series.label` set by the caller
// (currently hardcoded in page.tsx), a resolved CSS custom property, or a
// number — no live injection path — but escape defensively so that stays
// true if a future caller starts feeding this a free-text field.
function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function ProgressTrend({ series }: { series: TrendSeries[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !series.length) return;

    function draw() {
      if (!host) return;
      const w = host.clientWidth || 520;
      const h = 188;
      const iw = w - MARGIN.l - MARGIN.r;
      const ih = h - MARGIN.t - MARGIN.b;
      const n = Math.max(2, series[0]?.values.length ?? 0);
      const labels = WEEK_LABELS.slice(-n);

      const faint = cssVar(host, '--color-border-faint');
      const muted = cssVar(host, '--color-text-muted');
      const surface = cssVar(host, '--color-surface');

      // `draw()` re-runs on every ResizeObserver tick; without `.interrupt()`
      // an in-flight draw-on transition from the previous run keeps its timer
      // alive on nodes this call is about to remove (a rapid resize replays
      // the line-draw animation from scratch instead of just resizing).
      select(host).selectAll('*').interrupt().remove();
      const svg = select(host)
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .attr('viewBox', `0 0 ${w} ${h}`)
        .attr('role', 'img')
        .attr('aria-label', 'Training progress and document compliance over the last 6 weeks')
        .style('display', 'block');
      const g = svg.append('g').attr('transform', `translate(${MARGIN.l},${MARGIN.t})`);

      const x = scalePoint<number>().domain(Array.from({ length: n }, (_, i) => i)).range([0, iw]);
      const y = scaleLinear().domain([0, 100]).range([ih, 0]);

      g.append('g')
        .call(axisLeft(y).tickValues([0, 25, 50, 75, 100]).tickSize(-iw).tickPadding(7))
        .call((sel) => sel.select('.domain').remove())
        .call((sel) => sel.selectAll('line').attr('stroke', faint))
        .call((sel) => sel.selectAll('text').attr('fill', muted).style('font-family', 'var(--font-mono)').style('font-size', '9px'));
      g.append('g')
        .attr('transform', `translate(0,${ih})`)
        .call(axisBottom(x).tickSize(0).tickPadding(9).tickFormat((d) => labels[d as number] ?? ''))
        .call((sel) => sel.select('.domain').remove())
        .call((sel) => sel.selectAll('text').attr('fill', muted).style('font-family', 'var(--font-mono)').style('font-size', '9px'));

      const line = d3Line<number>().x((_, i) => x(i) ?? 0).y((v) => y(v)).curve(curveMonotoneX);
      const area = d3Area<number>().x((_, i) => x(i) ?? 0).y0(ih).y1((v) => y(v)).curve(curveMonotoneX);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const drawn = series.map((sr) => {
        const col = cssVar(host, sr.varName);
        g.append('path').datum(sr.values).attr('fill', col).attr('fill-opacity', 0.07).attr('d', area);
        const p = g.append('path')
          .datum(sr.values)
          .attr('fill', 'none')
          .attr('stroke', col)
          .attr('stroke-width', 2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('d', line);
        if (!reduceMotion) {
          const node = p.node();
          const len = node ? node.getTotalLength() : 0;
          p.attr('stroke-dasharray', `${len} ${len}`)
            .attr('stroke-dashoffset', len)
            .transition()
            .duration(450)
            .ease(easeCubicOut)
            .attr('stroke-dashoffset', 0);
        }
        g.selectAll(null)
          .data(sr.values)
          .enter()
          .append('circle')
          .attr('cx', (_, i) => x(i) ?? 0)
          .attr('cy', (v) => y(v))
          .attr('r', (_, i) => (i === sr.values.length - 1 ? 3.5 : 2))
          .attr('fill', col)
          .attr('stroke', surface)
          .attr('stroke-width', 1.2);
        const last = sr.values[sr.values.length - 1];
        g.append('text')
          .attr('x', (x(sr.values.length - 1) ?? 0) - 6)
          .attr('y', y(last) - 9)
          .attr('text-anchor', 'end')
          .attr('fill', col)
          .style('font-family', 'var(--font-mono)')
          .style('font-size', '10px')
          .style('font-weight', 600)
          .text(`${last}%`);
        return { ...sr, col };
      });

      // Hover crosshair + per-week readout tooltip.
      const tip = select(host)
        .append('div')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('z-index', '9')
        .style('background', '#2A2926')
        .style('color', '#fff')
        .style('border-radius', 'var(--radius-md)')
        .style('padding', '7px 10px')
        .style('white-space', 'nowrap')
        .style('box-shadow', 'var(--shadow-lg)')
        .style('font-family', 'var(--font-mono)')
        .style('font-size', '10.5px');
      const rule = g.append('line')
        .attr('y1', 0).attr('y2', ih)
        .attr('stroke', cssVar(host, '--color-border-strong'))
        .attr('stroke-dasharray', '3 3')
        .style('opacity', '0');
      const focus = g.selectAll(null)
        .data(drawn)
        .enter()
        .append('circle')
        .attr('r', 4.5)
        .attr('fill', (d) => d.col)
        .attr('stroke', surface)
        .attr('stroke-width', 2)
        .style('opacity', '0');

      svg.append('rect')
        .attr('x', MARGIN.l).attr('y', MARGIN.t).attr('width', iw).attr('height', ih)
        .attr('fill', 'transparent')
        .on('mousemove', (ev) => {
          const [px] = pointer(ev, g.node());
          let i = 0, best = Infinity;
          for (let k = 0; k < n; k++) {
            const d = Math.abs((x(k) ?? 0) - px);
            if (d < best) { best = d; i = k; }
          }
          rule.attr('x1', x(i) ?? 0).attr('x2', x(i) ?? 0).style('opacity', '1');
          focus.attr('cx', x(i) ?? 0).attr('cy', (d) => y(d.values[i])).style('opacity', '1');
          const rows = drawn.map((d) => `<span style="color:${d.col}">■</span> ${escapeHtml(d.label)} <b>${escapeHtml(d.values[i])}%</b>`).join('<br>');
          tip.html(`<div style="opacity:.6;margin-bottom:3px">${escapeHtml(labels[i])}</div>${rows}`)
            .style('opacity', '1')
            .style('left', `${Math.min(w - 140, (x(i) ?? 0) + MARGIN.l + 12)}px`)
            .style('top', `${MARGIN.t + 8}px`);
        })
        .on('mouseleave', () => {
          rule.style('opacity', '0');
          focus.style('opacity', '0');
          tip.style('opacity', '0');
        });
    }

    draw();
    const ro = new ResizeObserver(() => draw());
    ro.observe(host);
    return () => {
      ro.disconnect();
      select(host).selectAll('*').interrupt().remove();
    };
  }, [series]);

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
        {series.length ? (
          <div ref={hostRef} aria-label="Progress and compliance trend" style={{ position: 'relative', width: '100%', height: 188 }} />
        ) : (
          <p className="t-body">No trend data yet.</p>
        )}

        {/* Legend — always visible (not hover-only), per Rule 23. */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 10 }}>
          {series.map((sr) => (
            <LegendLine key={sr.label} color={`var(${sr.varName})`} label={sr.label} />
          ))}
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
