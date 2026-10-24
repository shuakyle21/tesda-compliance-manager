/**
 * EGACE Outcomes panel — the five-stage TESDA outcome funnel.
 *
 * Figma source of truth: file vZKyWXSipBHmiQFuHl5e1O, node 527:2367
 * ("EGACE outcomes · dashboard panel"). Values are aggregated from each
 * batch's `egace` counts. The panel stays hidden until a source record exists,
 * so missing data is never presented as a verified zero.
 *
 * Reuses the existing `egace-summary-*` design-system classes and the
 * shared `EGACE_STAGES` definition rather than duplicating styling.
 */

import { Fragment } from 'react';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { EGACE_STAGES } from '@/shared/vocab';
import type { Batch, EgaceCounts } from '@/shared/types';

export function EgaceOutcomes({ batches }: { batches: Batch[] }) {
  if (!batches.some((batch) => batch.egace !== undefined)) return null;

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
        <div className="dash-panel-meta">Reported cohort outcomes</div>
      </div>

      <div className="dash-panel-body">
        <div className="egace-summary">
          {EGACE_STAGES.map((stage, i) => {
            const value = totals[stage.key as keyof EgaceCounts];
            const pct = Math.min(100, Math.round((value / enrolledBase) * 100));
            return (
              <Fragment key={stage.key}>
                {i > 0 && (
                  <div className="egace-summary-arrow" aria-hidden="true">
                    ›
                  </div>
                )}
                <div className="egace-summary-tile">
                  <div className="egace-summary-top">
                    <span className="egace-summary-icon">
                      <Icon name={stage.icon as IconName} size={13} />
                    </span>
                    <span className="egace-summary-label">
                      {stage.label}
                    </span>
                  </div>
                  <div className="egace-summary-val">
                    {value}
                  </div>
                  <div className="egace-summary-rate">
                    {i === 0 ? 'enrolled' : `${pct}% of enrolled`}
                  </div>
                  <span className="egace-summary-track" aria-hidden="true">
                    <span className="egace-summary-fill" style={{ width: `${pct}%` }} />
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
