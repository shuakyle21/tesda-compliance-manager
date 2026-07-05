/**
 * EGACE Outcomes panel — the five-stage TESDA outcome funnel.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 527:2367
 * ("EGACE outcomes · dashboard panel"). Stage order, colors, and the
 * employment footnote mirror the design; values are aggregated from each
 * batch's `egace` counts so the panel is data-driven, not hardcoded.
 *
 * Reuses the existing `egace-summary-*` design-system classes and the
 * shared `EGACE_STAGES` definition rather than duplicating styling.
 */

import { Fragment } from 'react';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { EGACE_STAGES } from '@/shared/mocks/seed';
import type { Batch, EgaceCounts } from '@/shared/types';

/** Stage colorKey → design token, matching the Figma stage accents. */
const STAGE_COLOR: Record<string, string> = {
  blue: 'var(--color-blue)',
  teal: 'var(--color-teal)',
  amber: 'var(--color-amber)',
  purple: 'var(--color-purple)',
  green: 'var(--color-green)',
};

export function EgaceOutcomes({ batches }: { batches: Batch[] }) {
  // Aggregate the funnel across the in-scope cohorts.
  const totals = batches.reduce<EgaceCounts>(
    (acc, b) => {
      if (!b.egace) return acc;
      acc.enrolled += b.egace.enrolled;
      acc.graduate += b.egace.graduate;
      acc.assessed += b.egace.assessed;
      acc.certified += b.egace.certified;
      acc.employed += b.egace.employed;
      return acc;
    },
    { enrolled: 0, graduate: 0, assessed: 0, certified: 0, employed: 0 },
  );

  const enrolledBase = Math.max(1, totals.enrolled);
  // Surface the cohort currently inside its 6-month employment follow-up window.
  const followUp = batches.find((b) => b.employmentFollowUp)?.employmentFollowUp ?? null;

  return (
    <section className="dash-panel" aria-labelledby="egace-heading">
      <div className="dash-panel-head">
        <div id="egace-heading" className="dash-panel-title">
          <Icon name="certificate" size={13} />
          EGACE Outcomes
        </div>
        <div className="dash-panel-meta">J3ED cohorts · T2MIS terminal report</div>
      </div>

      <div className="dash-panel-body">
        <div className="egace-summary">
          {EGACE_STAGES.map((stage, i) => {
            const value = totals[stage.key as keyof EgaceCounts];
            const pct = Math.min(100, Math.round((value / enrolledBase) * 100));
            const color = STAGE_COLOR[stage.colorKey] ?? 'var(--color-blue)';
            return (
              <Fragment key={stage.key}>
                {i > 0 && (
                  <div className="egace-summary-arrow" aria-hidden="true">
                    ›
                  </div>
                )}
                <div
                  className="egace-summary-tile"
                  style={{ borderColor: 'var(--color-border)', borderLeft: `3px solid ${color}` }}
                >
                  <div className="egace-summary-top">
                    <span className="egace-summary-icon" style={{ color }}>
                      <Icon name={stage.icon as IconName} size={13} />
                    </span>
                    <span className="egace-summary-label" style={{ color: 'var(--color-text-muted)' }}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="egace-summary-val" style={{ color }}>
                    {value}
                  </div>
                  <div className="egace-summary-rate">
                    {i === 0 ? 'enrolled' : `${pct}% of enrolled`}
                  </div>
                  {/* Mini progress track (Figma node 527:2379) — inline-styled to
                      avoid touching the shared stylesheet mid-change. */}
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'block',
                      height: 5,
                      marginTop: 8,
                      borderRadius: 3,
                      background: 'var(--color-surface-alt)',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>

        {followUp && (
          <div className="egace-footnote">
            <Icon name="briefcase" size={13} />
            {followUp.rate}% employment rate · {followUp.employed} of {followUp.certified} certified graduates
            employed · {followUp.awaiting} awaiting 6-month follow-up
          </div>
        )}
      </div>
    </section>
  );
}

export default EgaceOutcomes;
