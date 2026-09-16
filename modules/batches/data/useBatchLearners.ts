'use client';

/**
 * Cached, on-demand roster read for one batch.
 *
 * The roster is drill-in data — it is only wanted once someone opens a specific
 * batch, so fetching it for every batch on the list screen would be waste. That
 * is why this read lives on the client while the batch list itself stays in a
 * Server Component.
 *
 * Tenant access is deliberately *not* re-checked here. Every route folds it
 * server-side and short-circuits to `NoTenantAccessState` before rendering the
 * island that opens a batch (see `app/(dashboard)/table-view/page.tsx`), so a
 * caller with no school never reaches this hook. A future URL-addressed drill-in
 * route — `/trainer/classes/[batchId]/...` — must do that same server-side fold
 * before rendering, because there the id comes from the URL rather than from an
 * already-authorized list.
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@/lib/supabase/client';
import { fetchBatchLearners } from '@/modules/batches/data/learners';
import { unwrapSnapshot } from '@/shared/snapshotQuery';

/** Hierarchical, so a future write to this batch can invalidate `['batch', id]`. */
export function batchLearnersKey(batchId: string) {
  return ['batch', batchId, 'learners'] as const;
}

export function useBatchLearners(batchId: string) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: batchLearnersKey(batchId),
    queryFn: async () => unwrapSnapshot(await fetchBatchLearners(supabase, batchId)),
  });
}
