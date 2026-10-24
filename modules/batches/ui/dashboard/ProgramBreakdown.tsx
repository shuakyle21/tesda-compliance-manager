/**
 * Program Breakdown panel body — active batch and scholar counts per TESDA
 * program, for side-by-side comparison.
 *
 * PROGRAMS is a closed set (TWSP and CFSP are the two scholarship programs
 * this tool covers), so it is iterated rather than branched on. The
 * all-batch average-progress line that used to sit under the tiles is gone:
 * it duplicated a KPI and was labelled with a hardcoded batch code ("BAT-2").
 */

import { pluralize } from '@/shared/text';
import type { Batch } from '@/shared/types';

const PROGRAMS = ['TWSP', 'CFSP'] as const;

function ProgramTile({ program, batches }: { program: string; batches: readonly Batch[] }) {
  const programBatches = batches.filter((batch) => batch.program === program);
  const scholars = programBatches.reduce((sum, batch) => sum + batch.scholars, 0);

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div className="t-label">{program}</div>
      <div className="t-metric-value" style={{ marginTop: 8 }}>{programBatches.length}</div>
      <div className="t-body">
        active {pluralize(programBatches.length)} · {scholars} {pluralize(scholars, 'scholar', 'scholars')}
      </div>
    </div>
  );
}

/** `batches` should be the active set — the same population as the KPI row. */
export function ProgramBreakdown({ batches }: { batches: readonly Batch[] }) {
  return (
    <div className="dash-program-grid">
      {PROGRAMS.map((program) => (
        <ProgramTile key={program} program={program} batches={batches} />
      ))}
    </div>
  );
}
