'use client';

import { Icon } from '@/shared/ui/Icon';
import type { Batch, EgaceStage, Tenant } from '@/shared/types';
import { formatDate } from '@/shared/dates';

interface EgaceOutcomesTableProps {
  rows: Batch[];
  stages: EgaceStage[];
  isMulti: boolean;
  tenantOf: (id: string) => Tenant;
  totals: Record<string, number>;
  rate: (v: number) => number;
  asOf: string | null;
  hasOutcomes: boolean;
  egaceVal: (b: Batch, key: string) => number;
}

const colorVar = (k: string) => `var(--color-${k})`;
const colorDk = (k: string) => `var(--color-${k}-dk)`;

export function EgaceOutcomesTable({ rows, stages, isMulti, tenantOf, totals, rate, asOf, hasOutcomes, egaceVal }: EgaceOutcomesTableProps) {
  return (
    <div className="egace-table-card surface">
      <div className="egace-table-head">
        <div>
          <h2 className="egace-table-title">EGACE Outcomes</h2>
          <span className="egace-table-sub">
            {rows.length} {rows.length === 1 ? 'batch' : 'batches'} · TESDA TWSP &amp; CFSP{asOf ? ` · as of ${asOf}` : ''}
          </span>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="egace-table">
          <colgroup>
            <col style={{ width: 64 }} />
            {isMulti && <col style={{ width: 70 }} />}
            <col style={{ width: 190 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 88 }} />
            {stages.map((s) => (
              <col key={s.key} style={{ width: 84 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} className="egc-th egc-num">
                Batch No.
              </th>
              {isMulti && (
                <th rowSpan={2} className="egc-th">
                  School
                </th>
              )}
              <th rowSpan={2} className="egc-th">
                Qualification
              </th>
              <th rowSpan={2} className="egc-th">
                Trainer
              </th>
              <th colSpan={2} className="egc-th egc-group">
                Training Schedule
              </th>
              {stages.map((s) => (
                <th key={s.key} rowSpan={2} className="egc-th egc-num egc-stage" style={{ color: colorDk(s.colorKey), borderTopColor: colorVar(s.colorKey) }}>
                  {s.label}
                </th>
              ))}
            </tr>
            <tr>
              <th className="egc-th egc-sub">Start</th>
              <th className="egc-th egc-sub">End</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr key={b.id} className={i % 2 === 0 ? 'egc-row-odd' : ''}>
                <td className="egc-td egc-num egc-batchno">{i + 1}</td>
                {isMulti && <td className="egc-td egc-mono">{tenantOf(b.tenantId).code}</td>}
                <td className="egc-td">
                  <div className="egc-qual">{b.qualification}</div>
                  <div className="egc-meta">
                    {b.program} · {b.id}
                    {b.status === 'completed' ? ' · completed' : ''}
                  </div>
                </td>
                <td className="egc-td egc-trainer">{b.trainer}</td>
                <td className="egc-td egc-mono">{formatDate(b.trainingStart) ?? '—'}</td>
                <td className="egc-td egc-mono">{formatDate(b.trainingEnd) ?? '—'}</td>
                {stages.map((s) => {
                  if (s.key !== 'enrolled' && !b.egace) {
                    return (
                      <td key={s.key} className="egc-td egc-num egc-val" style={{ color: 'var(--color-text-muted)' }}>
                        —<span className="sr-only"> Not recorded yet</span>
                      </td>
                    );
                  }
                  const v = egaceVal(b, s.key);
                  return (
                    <td key={s.key} className="egc-td egc-num egc-val" style={{ color: v === 0 ? 'var(--color-text-disabled)' : colorDk(s.colorKey) }}>
                      {v === 0 ? '—' : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="egc-total-row">
              <td className="egc-td egc-total-label" colSpan={isMulti ? 5 : 4}>
                TOTAL
              </td>
              {stages.map((s) => (
                <td key={s.key} className="egc-td egc-num egc-total-val" style={{ color: colorDk(s.colorKey) }}>
                  {s.key !== 'enrolled' && !hasOutcomes ? <>—<span className="sr-only"> Not recorded yet</span></> : totals[s.key]}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="egace-footnote">
        <Icon name="info-circle" size={12} />
        <span>
          {hasOutcomes
            ? `Funnel fills as each cohort advances — columns stay blank (—) for batches still in training. Conversion vs enrolled: ${rate(totals.graduate)}% graduated · ${rate(totals.certified)}% certified · ${rate(totals.employed)}% employed.${rows.some((b) => !b.egace) ? ' Batches without recorded outcomes show a dash and are left out of the rates.' : ''}`
            : "Graduate, assessed, certified and employed counts aren't recorded in TVI-CAMS yet. Enrolled is each batch's enrolled scholar count."}
        </span>
      </div>
    </div>
  );
}

export default EgaceOutcomesTable;
