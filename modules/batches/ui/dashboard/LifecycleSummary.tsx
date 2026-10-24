/**
 * Lifecycle summary — where each active batch stands, drawn with the one
 * lifecycle component (`LifecyclePipeline`).
 *
 * Replaces the dashboard's former pill strip, which hardcoded its counter as
 * "3/7" beside the batch's real stages and colored status with no text (audit
 * A3/C1). Stage dates are not recorded yet, so steps show their status words
 * only; no dated timeline is drawn until lifecycle event dates exist.
 */

import Link from 'next/link';
import { Icon } from '@/shared/ui/Icon';
import { pluralize } from '@/shared/text';
import { LifecyclePipeline } from '@/modules/batches/ui/LifecyclePipeline';
import type { Batch } from '@/shared/types';

const MAX_ROWS = 4;

export function LifecycleSummary({ batches, batchHref, allHref }: {
  /** Active batches, in the order they should be listed. */
  batches: readonly Batch[];
  batchHref: (batchId: string) => string;
  allHref: string;
}) {
  const shown = batches.slice(0, MAX_ROWS);
  const hidden = batches.length - shown.length;

  return (
    <section className="dash-panel" aria-labelledby="lifecycle-heading">
      <div className="dash-panel-head">
        <h2 id="lifecycle-heading" className="dash-panel-title">
          <Icon name="timeline" size={13} /> Lifecycle
        </h2>
        <div className="dash-panel-meta">{batches.length} active {pluralize(batches.length)}</div>
      </div>
      {shown.length === 0 ? (
        <p className="attention-empty">No active batches.</p>
      ) : (
        <ul className="lifecycle-rows">
          {shown.map((batch) => {
            const done = batch.lifecycle.filter((stage) => stage.status === 'done').length;
            return (
              <li key={batch.id} className="lifecycle-row">
                <div className="lifecycle-row-head">
                  <Link href={batchHref(batch.id)} className="lifecycle-batch">{batch.id}</Link>
                  <span className="lifecycle-count">{done} of {batch.lifecycle.length} stages done</span>
                </div>
                <LifecyclePipeline steps={batch.lifecycle} />
              </li>
            );
          })}
        </ul>
      )}
      {hidden > 0 && (
        <p className="attention-more">
          {hidden} more · <Link href={allHref} className="dash-link">All batches</Link>
        </p>
      )}
    </section>
  );
}
