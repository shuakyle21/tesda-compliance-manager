'use client';

/**
 * Batch Timeline — lifecycle Gantt across the active batches.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 716:2177 (714:227).
 * Ported from the Claude Design prototype's `drawGantt()`/`ganttData()`
 * (project e3ea69aa, TVI-CAMS.dc.html) for visual fidelity: a Preparation →
 * Training → ENTRE → Billing window phase bar per batch, diamond milestone
 * markers (AOU/NTP/TIP/BILLING), a month ruler, and a TODAY flag.
 *
 * That fidelity — draw-on bar animation and hover tooltips — needs real DOM
 * manipulation, which is why this is a Client Component built on
 * d3-selection (unlike the Server-Component-friendly scale-math-only
 * components elsewhere in this module).
 *
 * Two deliberate departures from the ported source:
 *  - "Today" is derived from the data (`billingDeadline − daysToBilling`),
 *    not `new Date()` — this repo forbids reading the wall clock during
 *    render (see the `page.tsx` comment on `isDataStale`).
 *  - Milestone status (done/active/pending) comes from each batch's real
 *    `lifecycle` stage status, not a today-vs-date comparison — so an
 *    NTP dated in the past that's still administratively pending renders
 *    as pending, not done.
 *  - Phase/milestone labels stay in the accessible tree via <title> even
 *    when a bar is too narrow to show its text inline, and the Training/
 *    ENTRE/Billing window/Milestone legend is always visible (not
 *    hover-only) — status must be conveyed by text, not hover alone.
 */

import { useEffect, useMemo, useRef } from 'react';
import { select } from 'd3-selection';
import 'd3-transition';
import { scaleTime } from 'd3-scale';
import { timeMonth } from 'd3-time';
import { timeFormat } from 'd3-time-format';
import { easeCubicOut } from 'd3-ease';
import { Icon } from '@/shared/ui/Icon';
import type { Batch, LifecycleStatus } from '@/shared/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayMs = 86_400_000;

function parseDate(value: string | undefined | null, fallbackYear = 2026): Date | null {
  if (!value) return null;
  const clean = value.replace(/^by\s+/i, '').trim();
  const m = clean.match(/([A-Za-z]{3,})\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  if (!m) return null;
  const mon = MONTHS.indexOf(m[1].slice(0, 3));
  if (mon < 0) return null;
  return new Date(m[3] ? Number(m[3]) : fallbackYear, mon, Number(m[2]));
}

type Phase = {
  key: 'prep' | 'train' | 'entre' | 'bill';
  label: string;
  s: Date;
  e: Date;
  fillVar: string;
  strokeVar: string;
  fgVar: string;
  pct?: number;
  detail?: string;
};
type Milestone = { label: string; at: Date; status: LifecycleStatus };
type GanttRow = { id: string; program: string; pct: number; phases: Phase[]; milestones: Milestone[] };

function lifecycleStatus(batch: Batch, key: string): LifecycleStatus {
  return batch.lifecycle.find((s) => s.key === key)?.status ?? 'pending';
}

function ganttData(batches: Batch[]): GanttRow[] {
  return batches
    .map((b): GanttRow => {
      const aou = parseDate(b.aouDate);
      const ntp = parseDate(b.ntpDate);
      const tip = parseDate(b.tipDate);
      const ts = parseDate(b.trainingStart);
      const te = parseDate(b.trainingEnd);
      const es = parseDate(b.entreStart);
      const ee = parseDate(b.entreEnd);
      const bill = parseDate(b.billingDeadline);

      const phases: Phase[] = [];
      if (aou && ntp) {
        phases.push({ key: 'prep', label: 'Preparation', s: aou, e: ntp, fillVar: '--color-surface-alt', strokeVar: '--color-border', fgVar: '--color-text-muted' });
      }
      if (ts && te) {
        phases.push({ key: 'train', label: 'Training', s: ts, e: te, fillVar: '--color-amber-lt', strokeVar: '--color-amber-border', fgVar: '--color-amber-dk', pct: b.progressPct, detail: `Day ${b.currentDay}/${b.totalDays}` });
      }
      if (es && ee) {
        phases.push({ key: 'entre', label: 'ENTRE', s: es, e: ee, fillVar: '--color-purple-lt', strokeVar: '--color-purple', fgVar: '--color-purple-dk' });
      }
      const billStart = ee ?? te;
      if (billStart && bill && bill.getTime() > billStart.getTime()) {
        phases.push({ key: 'bill', label: 'Billing window', s: billStart, e: bill, fillVar: '--color-green-lt', strokeVar: '--color-green-border', fgVar: '--color-green-dk', detail: b.daysToBilling != null ? `${b.daysToBilling} days remaining` : undefined });
      }

      const milestoneDefs: [string, Date | null, string][] = [
        ['AOU', aou, 'aou'],
        ['NTP', ntp, 'ntp'],
        ['TIP', tip, 'tip'],
        ['BILLING', bill, 'bill'],
      ];
      const milestones: Milestone[] = milestoneDefs
        .filter((m): m is [string, Date, string] => m[1] != null)
        .map(([label, at, key]) => ({ label, at, status: lifecycleStatus(b, key) }));

      return { id: b.id, program: b.program, pct: b.progressPct, phases, milestones };
    })
    .filter((r) => r.phases.length || r.milestones.length);
}

function cssVar(el: Element, name: string): string {
  return getComputedStyle(el.ownerDocument.documentElement).getPropertyValue(name).trim() || '#888';
}

// The hover tooltip is built as an HTML string (`tip.html(...)`, not `.text()`)
// so it can mix a bold label with a `<br>`-separated date/detail line. Every
// value interpolated into that string is currently a hardcoded phase/milestone
// label or a number/date formatted by d3-time-format, so there is no live HTML
// injection path today — but escape defensively so that stays true if a future
// caller starts feeding this a free-text field (e.g. a batch/program name).
function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function BatchTimeline({ batches }: { batches: Batch[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  // "Today" anchored to the data (billingDeadline − daysToBilling), not the wall clock.
  // Memoized on the underlying primitives (not the Date object) so useEffect
  // below doesn't re-run on every render over an equal-but-new Date instance.
  const anchor = batches[0];
  const anchorBill = parseDate(anchor?.billingDeadline);
  const todayMs = anchorBill ? anchorBill.getTime() - (anchor?.daysToBilling ?? 0) * dayMs : new Date(2026, 5, 19).getTime();
  const today = useMemo(() => new Date(todayMs), [todayMs]);

  const rows = useMemo(() => ganttData(batches), [batches]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !rows.length) return;

    function draw() {
      if (!host) return;
      const LBL = 142, ROW = 62, AX = 44, PAD = 22;
      const w = Math.max(host.clientWidth || 860, 720);
      const h = AX + rows.length * ROW + 10;

      const allDates: number[] = [];
      rows.forEach((r) => {
        r.phases.forEach((p) => { allDates.push(p.s.getTime(), p.e.getTime()); });
        r.milestones.forEach((m) => allDates.push(m.at.getTime()));
      });
      const domain: [Date, Date] = [new Date(Math.min(...allDates)), new Date(Math.max(...allDates))];
      const x = scaleTime().domain(domain).range([LBL, w - PAD]).nice(timeMonth);

      // `draw()` re-runs on every ResizeObserver tick; without `.interrupt()`
      // an in-flight draw-on transition from the previous run keeps its timer
      // alive on nodes this call is about to remove (a rapid resize replays
      // the bar/milestone animation from scratch instead of just resizing).
      select(host).selectAll('*').interrupt().remove();
      const svg = select(host).append('svg').attr('width', w).attr('height', h).attr('role', 'img').attr('aria-label', 'Batch lifecycle timeline').style('display', 'block');
      const tip = select(host)
        .append('div')
        .style('position', 'absolute').style('pointer-events', 'none').style('opacity', '0').style('z-index', '9')
        .style('background', '#2A2926').style('color', '#fff').style('border-radius', 'var(--radius-md)')
        .style('padding', '7px 10px').style('white-space', 'nowrap').style('box-shadow', 'var(--shadow-lg)')
        .style('font-family', 'var(--font-mono)').style('font-size', '10.5px');
      const show = (ev: MouseEvent, html: string) => {
        const r = host.getBoundingClientRect();
        tip.html(html).style('opacity', '1').style('left', `${ev.clientX - r.left + 12}px`).style('top', `${ev.clientY - r.top - 10}px`);
      };
      const hide = () => tip.style('opacity', '0');

      const [d0, d1] = x.domain();
      const months = timeMonth.range(timeMonth.floor(d0), timeMonth.offset(d1, 1));
      svg.append('g').selectAll('line').data(months).enter().append('line')
        .attr('x1', (m) => x(m)).attr('x2', (m) => x(m)).attr('y1', AX - 22).attr('y2', h - 6)
        .attr('stroke', cssVar(host, '--color-border-faint'));
      svg.append('g').selectAll('text').data(months).enter().append('text')
        .attr('x', (m) => x(m) + 7).attr('y', AX - 26).attr('fill', cssVar(host, '--color-text-secondary'))
        .style('font-family', 'var(--font-mono)').style('font-size', '10px').style('letter-spacing', '0.04em')
        .text((m) => timeFormat('%b')(m).toUpperCase());
      svg.append('text').attr('x', 15).attr('y', AX - 26).attr('fill', cssVar(host, '--color-text-muted'))
        .style('font-family', 'var(--font-sans)').style('font-size', '9px').style('font-weight', '600').style('letter-spacing', '0.08em').text('BATCH');

      if (today >= x.domain()[0] && today <= x.domain()[1]) {
        svg.append('line').attr('x1', x(today)).attr('x2', x(today)).attr('y1', AX - 18).attr('y2', h - 6)
          .attr('stroke', cssVar(host, '--color-red')).attr('stroke-width', 1).attr('stroke-dasharray', '3 3');
        const flag = svg.append('g').attr('transform', `translate(${x(today)},${AX - 4})`);
        flag.append('rect').attr('x', -22).attr('y', -14).attr('width', 44).attr('height', 15).attr('rx', 3).attr('fill', cssVar(host, '--color-red'));
        flag.append('text').attr('y', -3).attr('text-anchor', 'middle').attr('fill', '#fff')
          .style('font-family', 'var(--font-mono)').style('font-size', '8.5px').style('letter-spacing', '0.06em').text('TODAY');
      }

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      rows.forEach((r, i) => {
        const y0 = AX + i * ROW;
        const g = svg.append('g');
        if (i % 2 === 1) g.append('rect').attr('x', 0).attr('y', y0).attr('width', w).attr('height', ROW).attr('fill', cssVar(host, '--color-surface-alt')).attr('opacity', 0.55);
        g.append('text').attr('x', 15).attr('y', y0 + 22).attr('fill', cssVar(host, '--color-text-primary'))
          .style('font-family', 'var(--font-mono)').style('font-size', '11.5px').text(r.id);
        const tw = r.program === 'TWSP';
        g.append('rect').attr('x', 15).attr('y', y0 + 30).attr('width', 44).attr('height', 15).attr('rx', 3).attr('fill', cssVar(host, tw ? '--color-blue-lt' : '--color-green-lt'));
        g.append('text').attr('x', 37).attr('y', y0 + 41).attr('text-anchor', 'middle').attr('fill', cssVar(host, tw ? '--color-blue-dk' : '--color-green-dk'))
          .style('font-family', 'var(--font-sans)').style('font-size', '9px').style('font-weight', '600').style('letter-spacing', '0.04em').text(r.program);
        g.append('text').attr('x', 66).attr('y', y0 + 41).attr('fill', cssVar(host, '--color-text-muted'))
          .style('font-family', 'var(--font-mono)').style('font-size', '10px').text(`${r.pct}%`);

        const bandY = y0 + 14, bandH = 22;
        r.phases.forEach((p) => {
          const x0 = x(p.s), x1 = Math.max(x(p.e), x0 + 10);
          const dateRange = `${timeFormat('%b %e')(p.s).trim()} → ${timeFormat('%b %e')(p.e).trim()}`;
          const bar = g.append('g').style('cursor', 'default')
            .on('mousemove', (ev) => show(ev, `<b>${escapeHtml(p.label)}</b><br>${escapeHtml(dateRange)}${p.detail ? `<br>${escapeHtml(p.detail)}` : ''}`))
            .on('mouseleave', hide);
          bar.append('title').text(`${p.label}: ${dateRange}${p.detail ? ` — ${p.detail}` : ''}`);
          const rect = bar.append('rect').attr('x', x0).attr('y', bandY).attr('height', bandH).attr('rx', 4)
            .attr('fill', cssVar(host, p.fillVar)).attr('stroke', cssVar(host, p.strokeVar)).attr('width', reduceMotion ? x1 - x0 : 0);
          if (!reduceMotion) rect.transition().duration(400).ease(easeCubicOut).attr('width', x1 - x0);
          if (p.key === 'train' && p.pct != null) {
            const fw = ((x1 - x0) * Math.min(100, p.pct)) / 100;
            bar.append('rect').attr('x', x0).attr('y', bandY).attr('height', bandH).attr('rx', 4)
              .attr('fill', cssVar(host, '--color-amber')).attr('opacity', 0.22).attr('width', reduceMotion ? fw : 0)
              .transition().duration(reduceMotion ? 0 : 500).ease(easeCubicOut).attr('width', fw);
          }
          if (x1 - x0 > 62) {
            bar.append('text').attr('x', x0 + 8).attr('y', bandY + 15).attr('fill', cssVar(host, p.fgVar))
              .style('font-family', 'var(--font-mono)').style('font-size', '9.5px').style('pointer-events', 'none')
              .text(p.key === 'train' && p.detail ? `TRAINING · ${p.detail}` : p.label.toUpperCase());
          }
        });

        if (r.milestones.length) {
          const mY = y0 + 50;
          const times = r.milestones.map((m) => m.at.getTime());
          g.append('line').attr('x1', x(new Date(Math.min(...times)))).attr('x2', x(new Date(Math.max(...times))))
            .attr('y1', mY).attr('y2', mY).attr('stroke', cssVar(host, '--color-border'));
          let lastLab = -Infinity;
          r.milestones.forEach((m) => {
            const mx = x(m.at);
            const low = mx - lastLab < 70;
            if (!low) lastLab = mx;
            const done = m.status === 'done', active = m.status === 'active';
            const dateLabel = timeFormat('%b %e, %Y')(m.at);
            const mg = g.append('g').attr('transform', `translate(${mx},${mY})`)
              .on('mousemove', (ev) => show(ev, `<b>${escapeHtml(m.label)}</b><br>${escapeHtml(dateLabel)}`))
              .on('mouseleave', hide);
            mg.append('title').text(`${m.label}: ${dateLabel} — ${done ? 'done' : active ? 'in progress' : 'pending'}`);
            mg.append('rect').attr('x', -4.5).attr('y', -4.5).attr('width', 9).attr('height', 9).attr('transform', 'rotate(45)')
              .attr('fill', done ? cssVar(host, '--color-blue') : active ? cssVar(host, '--color-amber') : cssVar(host, '--color-surface'))
              .attr('stroke', done ? cssVar(host, '--color-blue') : active ? cssVar(host, '--color-amber') : cssVar(host, '--color-border-strong'))
              .attr('stroke-width', 1.2)
              .attr('stroke-dasharray', done || active ? null : '2 2');
            mg.append('text').attr('x', low ? -6 : 8).attr('y', low ? 16 : 3).attr('text-anchor', low ? 'end' : 'start')
              .attr('fill', done || active ? cssVar(host, '--color-text-secondary') : cssVar(host, '--color-text-muted'))
              .style('font-family', 'var(--font-sans)').style('font-size', '9px').style('font-weight', '600')
              .style('letter-spacing', '0.03em').style('pointer-events', 'none').text(m.label);
          });
        }
      });
    }

    draw();
    const ro = new ResizeObserver(() => draw());
    ro.observe(host);
    return () => {
      ro.disconnect();
      select(host).selectAll('*').interrupt().remove();
    };
  }, [rows, today]);

  if (!rows.length) {
    return (
      <section className="dash-panel" aria-labelledby="timeline-heading">
        <div className="dash-panel-head">
          <div id="timeline-heading" className="dash-panel-title"><Icon name="timeline" size={13} />Batch Timeline</div>
        </div>
        <div className="dash-panel-body"><p className="t-body">No active batches to plot.</p></div>
      </section>
    );
  }

  return (
    <section className="dash-panel" aria-labelledby="timeline-heading">
      <div className="dash-panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="dash-panel-title" id="timeline-heading">
          <Icon name="timeline" size={13} />
          Batch Timeline
          <span className="tl-count">{rows.length} {rows.length === 1 ? 'BATCH' : 'BATCHES'}</span>
        </div>
        {/* Legend — always visible (not hover-only), per Rule 23. */}
        <div className="tl-legend">
          <LegendChip color="var(--color-amber-lt)" border="var(--color-amber-border)" label="Training" />
          <LegendChip color="var(--color-purple-lt)" border="var(--color-purple)" label="ENTRE" />
          <LegendChip color="var(--color-green-lt)" border="var(--color-green-border)" label="Billing window" />
          <span className="tl-legend-item">
            <span style={{ width: 8, height: 8, background: 'var(--color-blue)', transform: 'rotate(45deg)', display: 'inline-block' }} />
            Milestone
          </span>
        </div>
      </div>

      <div className="tl-scroll">
        <div ref={hostRef} aria-label="Batch lifecycle timeline" style={{ position: 'relative', minWidth: 720 }} />
      </div>

      <div className="tl-foot">
        <Icon name="info-circle" size={13} />
        Positioned by milestone dates and lifecycle status · the red line marks today · scroll sideways to see the full window.
      </div>
    </section>
  );
}

function LegendChip({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <span className="tl-legend-item">
      <span style={{ width: 12, height: 8, borderRadius: 2, background: color, border: `1px solid ${border}`, display: 'inline-block' }} />
      {label}
    </span>
  );
}

export default BatchTimeline;
