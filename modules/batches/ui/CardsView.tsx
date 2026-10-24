'use client';

/**
 * SCREEN — Batch Cards (ported from App.jsx CardsView)
 *
 * The primary dashboard view: a vertical stack of full-width BatchCards sorted
 * by urgency. Owns the search/program filter state and the BatchModal that opens
 * on card click. Client Component (interactive).
 */

import { useMemo, useState } from 'react';
import { BatchCard } from '@/modules/batches/ui/BatchCard';
import { BatchModal } from '@/modules/batches/ui/BatchModal';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FiltersRow } from './FiltersRow';
import { filterBatches } from './filter';
import { pluralize } from '@/shared/text';
import type { Batch } from '@/shared/types';

/**
 * `loadedAt` is the snapshot's real fetch time, formatted on the server (so
 * the client never re-formats it in another timezone). It replaced a
 * hardcoded "loaded at 14:02" (audit A19).
 */
export function CardsView({ batches, loadedAt }: { batches: Batch[]; loadedAt: string | null }) {
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('all');
  const [open, setOpen] = useState<Batch | null>(null);

  const filtered = useMemo(() => filterBatches(batches, query, program), [batches, query, program]);

  return (
    <div>
      <div className="page-head">
        <h1>Batch Cards</h1>
        <span className="subline">{batches.length} {pluralize(batches.length)} · {batches.filter((b) => b.status === 'ongoing').length} active</span>
      </div>

      <FiltersRow query={query} onQuery={setQuery} program={program} onProgram={setProgram} />

      {filtered.length === 0 ? (
        <EmptyState heading="No batches match" sub="Try clearing the search or program filter." />
      ) : (
        <div className="batch-stack">
          <InfoCallout variant="info">
            {filtered.length} batch {pluralize(filtered.length, 'record', 'records')}{loadedAt ? ` loaded ${loadedAt}` : ''}. Sorted by earliest billing deadline first.
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
