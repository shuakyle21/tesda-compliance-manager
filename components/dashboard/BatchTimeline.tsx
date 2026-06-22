/**
 * Batch Timeline — lifecycle Gantt across the active batches.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 716:2177 (714:227).
 * Month ruler · today marker · milestone dots (completed/upcoming) · TRAINING
 * /ENTRE bars · per-lane progress connector. Built on the existing `tl-*`
 * design-system classes and positioned from each batch's real milestone dates,
 * so it tracks the data rather than tracing the Figma's flattened pixels.
 *
 * The Figma renders dots/icons as images; here they're CSS (`tl-node-dot`,
 * `tl-swatch`) — no raster assets, consistent with the project's conventions.
 */

import { Icon } from '@/components/ui/Icon';
import type { Batch } from '@/lib/data/types';

// Fixed inner width (px) so the lane geometry is deterministic; the wrapping
// `.tl-scroll` provides horizontal scroll on narrow viewports (Figma: 936px).
const INNER_W = 920;
const GUTTER = 108; // sticky lane-label column
const RIGHT_PAD = 24;
const PLOT_L = GUTTER;
const PLOT_W = INNER_W - GUTTER - RIGHT_PAD;
const LANE_H = 96;
const BAR_Y = 14;
const LINE_Y = 56;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(value: string | undefined | null, fallbackYear = 2026): Date | null {
  if (!value) return null;
  const clean = value.replace(/^by\s+/i, '').trim();
  const m = clean.match(/([A-Za-z]{3,})\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  if (!m) return null;
  const mon = MONTHS.indexOf(m[1].slice(0, 3));
  if (mon < 0) return null;
  return new Date(m[3] ? Number(m[3]) : fallbackYear, mon, Number(m[2]));
}

const dayMs = 86_400_000;
const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

export function BatchTimeline({ batches }: { batches: Batch[] }) {
  // "Today" anchored to the data (billingDeadline − daysToBilling), not the wall clock.
  const anchor = batches[0];
  const anchorBill = parseDate(anchor?.billingDeadline);
  const today = anchorBill ? new Date(anchorBill.getTime() - (anchor?.daysToBilling ?? 0) * dayMs) : new Date(2026, 5, 19);

  // Collect every milestone date to size the window.
  const allDates: Date[] = [];
  for (const b of batches) {
    for (const v of [b.aouDate, b.ntpDate, b.tipDate, b.trainingStart, b.trainingEnd, b.assessedDate, b.billingDeadline]) {
      const d = parseDate(v);
      if (d) allDates.push(d);
    }
  }
  if (!allDates.length) {
    return (
      <section className="dash-panel" aria-labelledby="timeline-heading">
        <div className="dash-panel-head">
          <div id="timeline-heading" className="dash-panel-title"><Icon name="timeline" size={13} />Batch Timeline</div>
        </div>
        <div className="dash-panel-body"><p className="t-body">No active batches to plot.</p></div>
      </section>
    );
  }

  const minD = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxD = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const windowStart = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const windowEnd = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0); // last day of max month
  const span = Math.max(1, windowEnd.getTime() - windowStart.getTime());

  const xOf = (d: Date) => PLOT_L + ((d.getTime() - windowStart.getTime()) / span) * PLOT_W;

  // Month gridlines/labels across the window.
  const months: { x: number; label: string }[] = [];
  for (let y = windowStart.getFullYear(), m = windowStart.getMonth(); ; m++) {
    if (m > 11) { m = 0; y++; }
    const first = new Date(y, m, 1);
    if (first > windowEnd) break;
    const label = m === windowStart.getMonth() && y === windowStart.getFullYear() ? `${MONTHS[m]} ${y}` : MONTHS[m];
    months.push({ x: xOf(first < windowStart ? windowStart : first), label });
    if (y === windowEnd.getFullYear() && m === windowEnd.getMonth()) break;
  }

  const todayX = xOf(today);
  const bodyH = batches.length * LANE_H;

  return (
    <section className="dash-panel" aria-labelledby="timeline-heading">
      <div className="dash-panel-head tl-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="dash-panel-title" id="timeline-heading">
          <Icon name="timeline" size={13} />
          Batch Timeline
          <span className="tl-count">{batches.length} {batches.length === 1 ? 'BATCH' : 'BATCHES'}</span>
        </div>
        <div className="tl-legend">
          <span className="tl-legend-item"><span className="tl-swatch" style={{ background: 'var(--color-blue)' }} />Completed</span>
          <span className="tl-legend-item"><span className="tl-swatch" style={{ background: 'var(--color-amber)' }} />In progress</span>
          <span className="tl-legend-item"><span className="tl-swatch tl-swatch-pending" />Upcoming</span>
        </div>
      </div>

      <div className="tl-scroll">
        <div className="tl-inner" style={{ width: INNER_W }}>
          {/* Month ruler */}
          <div className="tl-ruler" style={{ height: 28 }}>
            {months.map((mo) => (
              <span key={mo.label + mo.x} className="tl-month" style={{ left: mo.x }}>{mo.label}</span>
            ))}
            <span className="tl-ruler-today" style={{ left: todayX, height: 28 }}>
              <span className="tl-today-flag">Today</span>
            </span>
          </div>

          {/* Lanes */}
          <div className="tl-body">
            <div className="tl-body-inner" style={{ height: bodyH }}>
              {months.map((mo) => (
                <span key={`g-${mo.label}-${mo.x}`} className="tl-gridline" style={{ left: mo.x }} />
              ))}
              <span className="tl-today" style={{ left: todayX }} />

              {batches.map((b, i) => (
                <BatchLane key={b.id} batch={b} top={i * LANE_H} xOf={xOf} today={today} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tl-foot">
        <Icon name="info-circle" size={13} />
        Positioned by milestone dates · the red line marks today · completed cohorts are hidden. Scroll sideways to see the full window.
      </div>
    </section>
  );
}

function BatchLane({ batch, top, xOf, today }: { batch: Batch; top: number; xOf: (d: Date) => number; today: Date }) {
  const tStart = parseDate(batch.trainingStart);
  const tEnd = parseDate(batch.trainingEnd);

  const milestones = [
    { label: 'AOU', date: parseDate(batch.aouDate) },
    { label: 'NTP', date: parseDate(batch.ntpDate) },
    { label: 'TIP', date: parseDate(batch.tipDate) },
    { label: 'ASSESS', date: parseDate(batch.assessedDate) ?? tEnd },
    { label: 'BILLING', date: parseDate(batch.billingDeadline) },
  ].filter((m): m is { label: string; date: Date } => m.date != null);

  const connectorL = milestones.length ? xOf(milestones[0].date) : PLOT_L;
  const connectorR = milestones.length ? xOf(milestones[milestones.length - 1].date) : PLOT_L;
  const fillR = Math.max(connectorL, Math.min(connectorR, xOf(today)));

  const isCompleted = batch.status === 'completed';
  const barColor = isCompleted ? 'var(--color-blue)' : 'var(--color-amber)';
  const barBg = `color-mix(in srgb, ${barColor} 16%, var(--color-surface))`;
  const barText = isCompleted ? 'var(--color-blue-dk)' : 'var(--color-amber-dk)';

  return (
    <div className="tl-lane" style={{ top, height: LANE_H }}>
      {/* Sticky lane label */}
      <div className="tl-lane-label" style={{ width: GUTTER }}>
        <span className="tl-lane-id">{batch.id}</span>
        <span className="tl-lane-meta">
          <span className="batch-tag" style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 4, background: 'color-mix(in srgb, var(--color-green) 14%, var(--color-surface))', color: 'var(--color-green-dk)', fontWeight: 600, letterSpacing: '0.04em' }}>
            {batch.program}
          </span>
          <span className="tl-lane-pct">{batch.progressPct}%</span>
        </span>
      </div>

      {/* Progress connector + fill */}
      <span className="tl-connector" style={{ left: connectorL, width: Math.max(0, connectorR - connectorL), top: LINE_Y }} />
      <span className="tl-connector-fill" style={{ left: connectorL, width: Math.max(0, fillR - connectorL), top: LINE_Y, background: 'var(--color-blue)' }} />

      {/* Training bar */}
      {tStart && tEnd && (
        <span
          className="tl-bar"
          style={{ left: xOf(tStart), width: Math.max(24, xOf(tEnd) - xOf(tStart)), top: BAR_Y, background: barBg, borderColor: barColor }}
        >
          <span className="tl-bar-label" style={{ color: barText }}>
            {isCompleted ? 'TRAINING' : `TRAINING · Day ${batch.currentDay}/${batch.totalDays}`}
          </span>
        </span>
      )}

      {/* ENTRE bar (entrepreneurship window), if present */}
      {parseDate(batch.entreStart) && parseDate(batch.entreEnd) && (
        <span
          className="tl-bar"
          style={{ left: xOf(parseDate(batch.entreStart)!), width: Math.max(20, xOf(parseDate(batch.entreEnd)!) - xOf(parseDate(batch.entreStart)!)), top: BAR_Y, background: 'color-mix(in srgb, var(--color-purple) 14%, var(--color-surface))', borderColor: 'var(--color-purple)' }}
        >
          <span className="tl-bar-label" style={{ color: 'var(--color-purple-dk)' }}>ENTRE</span>
        </span>
      )}

      {/* Milestone nodes — alternate rows so close dates don't collide */}
      {milestones.map((m, idx) => {
        const done = m.date.getTime() <= today.getTime();
        const rowOffset = idx % 2 === 0 ? 0 : 22;
        const dotColor = done ? 'var(--color-blue)' : 'var(--color-border-strong)';
        return (
          <span key={m.label} className="tl-node" style={{ left: xOf(m.date), top: LINE_Y + rowOffset }}>
            <span
              className="tl-node-dot"
              style={{ borderColor: dotColor, background: done ? dotColor : 'var(--color-surface)', borderStyle: done ? 'solid' : 'dashed' }}
            />
            <span className="tl-node-text">
              <span className="tl-node-label" style={{ color: done ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{m.label}</span>
              <span className="tl-node-date">{m.label === 'BILLING' && !done ? `by ${fmt(m.date)}` : done ? fmt(m.date) : 'pending'}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default BatchTimeline;
