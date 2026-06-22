'use client';

/**
 * SCREEN — Batch Cards (ported from App.jsx CardsView)
 *
 * The primary dashboard view: a vertical stack of full-width BatchCards sorted
 * by urgency. Owns the search/program filter state and the BatchModal that opens
 * on card click. Client Component (interactive).
 */

import { useMemo, useState } from 'react';
import { BatchCard } from '@/components/ui/BatchCard';
import { BatchModal } from '@/components/ui/BatchModal';
import { InfoCallout } from '@/components/ui/InfoCallout';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltersRow } from './FiltersRow';
import { filterBatches } from './filter';
import type { Batch } from '@/lib/data/types';

export function CardsView({ batches }: { batches: Batch[] }) {
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('all');
  const [open, setOpen] = useState<Batch | null>(null);

  const filtered = useMemo(() => filterBatches(batches, query, program), [batches, query, program]);

  return (
    <div>
      <div className="page-head">
        <h1>Batch Cards</h1>
        <span className="subline">{batches.length} active {batches.length === 1 ? 'batch' : 'batches'}</span>
      </div>

      <FiltersRow query={query} onQuery={setQuery} program={program} onProgram={setProgram} />

      {filtered.length === 0 ? (
        <EmptyState heading="No batches match" sub="Try clearing the search or program filter." />
      ) : (
        <div className="batch-stack">
          <InfoCallout variant="info">
            {filtered.length} batch records loaded at 14:02. Sorted by earliest billing deadline first.
          </InfoCallout>
          {filtered.map((b) => (
            <BatchCard key={b.id} batch={b} onClick={() => setOpen(b)} />
          ))}
        </div>
      )}

      {open && <BatchModal batch={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export default CardsView;
