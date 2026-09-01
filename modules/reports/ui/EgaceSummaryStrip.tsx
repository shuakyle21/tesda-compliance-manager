'use client';

import { Icon, type IconName } from '@/shared/ui/Icon';
import type { EgaceStage } from '@/shared/types';

interface EgaceSummaryStripProps {
  stages: EgaceStage[];
  totals: Record<string, number>;
  rate: (v: number) => number;
}

const colorVar = (k: string) => `var(--color-${k})`;
const colorLt = (k: string) => `var(--color-${k}-lt)`;
const colorDk = (k: string) => `var(--color-${k}-dk)`;

export function EgaceSummaryStrip({ stages, totals, rate }: EgaceSummaryStripProps) {
  return (
    <div className="egace-summary">
      {stages.map((s, i) => {
        const val = totals[s.key];
        const pct = i === 0 ? 100 : rate(val);
        return (
          <div key={s.key} style={{ display: 'contents' }}>
            <div className="egace-summary-tile" style={{ background: colorLt(s.colorKey), borderColor: colorVar(s.colorKey) }}>
              <div className="egace-summary-top">
                <span className="egace-summary-icon" style={{ color: colorDk(s.colorKey) }}>
                  <Icon name={s.icon as IconName} size={14} />
                </span>
                <span className="egace-summary-label" style={{ color: colorDk(s.colorKey) }}>
                  {s.label}
                </span>
              </div>
              <div className="egace-summary-val" style={{ color: colorDk(s.colorKey) }}>
                {val}
              </div>
              <div className="egace-summary-rate" style={{ color: colorDk(s.colorKey) }}>
                {i === 0 ? 'of cohort' : pct + '% of enrolled'}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="egace-summary-arrow">
                <Icon name="chevron-right" size={16} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default EgaceSummaryStrip;
