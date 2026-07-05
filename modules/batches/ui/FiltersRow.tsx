'use client';

/**
 * SCREEN PART — FiltersRow (ported from App.jsx FiltersRow + Pill)
 *
 * Search input + program pills + secondary actions. Controlled by the parent
 * screen component, which owns the query/program state.
 */

import { Icon } from '@/shared/ui/Icon';

export function FiltersRow({
  query, onQuery, program, onProgram,
}: {
  query: string;
  onQuery: (v: string) => void;
  program: string;
  onProgram: (v: string) => void;
}) {
  return (
    <div className="filters">
      <div className="input-wrap">
        <Icon name="search" size={14} className="icn" />
        <input
          className="input search"
          placeholder="Search batches, trainers, qualifications…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>
      <Pill label="All programs" active={program === 'all'} onClick={() => onProgram('all')} />
      <Pill label="TWSP" active={program === 'TWSP'} onClick={() => onProgram('TWSP')} />
      <Pill label="CFSP" active={program === 'CFSP'} onClick={() => onProgram('CFSP')} />
      <div style={{ flex: 1 }} />
      <button className="btn secondary"><Icon name="filter" size={14} />More filters</button>
      <button className="btn secondary"><Icon name="download" size={14} />Export</button>
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32, padding: '0 12px',
        border: '1px solid ' + (active ? 'var(--color-blue)' : 'var(--color-border)'),
        background: active ? 'var(--color-blue-lt)' : 'var(--color-surface)',
        color: active ? 'var(--color-blue-dk)' : 'var(--color-text-secondary)',
        borderRadius: 'var(--radius-lg)',
        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export default FiltersRow;
