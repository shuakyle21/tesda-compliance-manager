/**
 * Batches by stage — where every batch in view stands, one bar per lifecycle
 * stage (`stageDistribution`). A horizontal bar list, because the stages are
 * an ordered set of categories read by name, and the count is printed beside
 * each bar so the figure never depends on bar length or color.
 *
 * Bars are neutral blue: a stage is a position, not a status. Only Blocked is
 * tinted, and it carries its icon and its word as well.
 */

import { Icon } from '@/shared/ui/Icon';
import { pluralize } from '@/shared/text';
import { stageDistribution } from '@/modules/batches/domain/overview';
import type { Batch } from '@/shared/types';

export function BatchStageDistribution({ batches }: { batches: readonly Batch[] }) {
  const rows = stageDistribution(batches);
  if (batches.length === 0 || rows.length === 0) return null;
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <section className="dash-panel" aria-labelledby="stage-dist-heading">
      <div className="dash-panel-head">
        <h2 id="stage-dist-heading" className="dash-panel-title"><Icon name="chart-bar" size={13} /> Batches by stage</h2>
        <div className="dash-panel-meta">{batches.length} {pluralize(batches.length)}</div>
      </div>
      <div className="dash-panel-body">
        <ul className="stage-dist">
          {rows.map((row) => (
            <li key={row.key} className={row.key === 'blocked' ? 'stage-dist-row stage-dist-blocked' : 'stage-dist-row'}>
              <span className="stage-dist-label">
                {row.key === 'blocked' && <Icon name="alert-triangle" size={12} />}
                {row.label}
              </span>
              <span className="stage-dist-track" aria-hidden="true">
                <span className="stage-dist-fill" style={{ width: `${(row.count / max) * 100}%` }} />
              </span>
              <span className="stage-dist-count">{row.count} <span className="sr-only">{pluralize(row.count)}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
