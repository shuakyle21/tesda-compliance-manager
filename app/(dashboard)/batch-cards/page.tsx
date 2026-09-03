/**
 * SCREEN ROUTE — Batch Cards
 *
 * Server Component shell: reads the live batch snapshot and hands it to the
 * interactive CardsView client island. `unconfigured`/`sync-failed` render
 * empty rather than substituting mock data; `sync-failed` additionally
 * surfaces the banner below (module data-layer contract). An `ok` snapshot is
 * authoritative even when empty — see ADR-005 §5.
 */

import Link from 'next/link';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { CardsView } from '@/modules/batches/ui/CardsView';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import type { Batch } from '@/shared/types';

export default async function BatchCardsPage() {
  const snapshot = await getBatchesSnapshot();
  const batches: Batch[] = selectBatchesForDisplay(snapshot);
  const syncFailed = snapshot.status === 'sync-failed';

  if (batches.length === 0) {
    return (
      <div>
        <div className="page-head">
          <h1>Batch Cards</h1>
        </div>
        {syncFailed ? (
          <InfoCallout variant="warning">
            Sync with Supabase failed — batches could not be loaded.
            <Link href="/batch-cards" className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
          </InfoCallout>
        ) : (
          <EmptyState
            iconName="folders"
            heading="No batches yet"
            sub="Once a batch is imported or assigned to you, its readiness, lifecycle, and documents appear here."
          />
        )}
      </div>
    );
  }

  return <CardsView batches={batches} />;
}
