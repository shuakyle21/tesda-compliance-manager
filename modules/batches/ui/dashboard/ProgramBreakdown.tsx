/**
 * Program Breakdown panel body — batch and scholar counts per TESDA program,
 * plus the average-progress snap line.
 *
 * PROGRAMS is a closed set (TWSP and CFSP are the two scholarship programs
 * this tool covers), so it is iterated rather than branched on.
 */

import { pluralize } from '@/shared/text';
import type { Batch } from '@/shared/types';

const PROGRAMS = ['TWSP', 'CFSP'] as const;

function ProgramTile({ program, batches }: { program: string; batches: readonly Batch[] }) {
  const programBatches = batches.filter((batch) => batch.program === program);
  const scholars = programBatches.reduce((sum, batch) => sum + batch.scholars, 0);

  return (
    <div className="surface" style={{ padding: 14 }}>
      <div className="t-label">{program}</div>
      <div className="t-metric-value" style={{ marginTop: 8 }}>{programBatches.length}</div>
      <div className="t-body">{pluralize(programBatches.length)} · {scholars} scholars</div>
    </div>
  );
}

interface ProgramBreakdownProps {
  batches: readonly Batch[];
  avgProgress: number;
}

export function ProgramBreakdown({ batches, avgProgress }: ProgramBreakdownProps) {
  return (
    <>
      <div className="dash-program-grid">
        {PROGRAMS.map((program) => (
          <ProgramTile key={program} program={program} batches={batches} />
        ))}
      </div>
      <div className="snap-line" style={{ marginTop: 12, gridTemplateColumns: '48px 1fr 42px' }}>
        <span className="snap-date">BAT-2</span>
        <span className="snap-bar">
          <span style={{ width: `${Math.min(100, avgProgress)}%` }} />
        </span>
        <span className="snap-meta">{avgProgress}%</span>
      </div>
    </>
  );
}
