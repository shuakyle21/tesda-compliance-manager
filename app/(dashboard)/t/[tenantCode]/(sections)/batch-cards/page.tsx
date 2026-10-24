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
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { tenantAccessOf, withTenantAccess } from '@/modules/tenancy/domain/access';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { requireScope } from '../../../../tenant-scope';
import { formatDateTime } from '@/shared/dates';
import type { Batch } from '@/shared/types';

export default async function BatchCardsPage({ params }: { params: Promise<{ tenantCode: string }> }) {
  // One school, validated against the caller's memberships by the segment layout.
  const resolved = await requireScope(params);
  if (!resolved) return null;
  const { scope, profile } = resolved;
  // `withTenantAccess` rewrites only an `ok` snapshot, so "you belong to no
  // school" never masks a real fetch failure — see the fold's own note.
  const snapshot = withTenantAccess(await getBatchesSnapshot(scope.tenantId), tenantAccessOf(profile));
  const batches: Batch[] = selectBatchesForDisplay(snapshot);
  const syncFailed = snapshot.status === 'sync-failed';
  const noTenantAccess = snapshot.status === 'no-tenant-access';

  if (batches.length === 0) {
    return (
      <div>
        <div className="page-head">
          <h1>Batch Cards</h1>
        </div>
        {syncFailed ? (
          <InfoCallout variant="warning">
            Sync with Supabase failed — batches could not be loaded.
            <Link href={scopedPath(scope.code, 'batch-cards')} className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
          </InfoCallout>
        ) : noTenantAccess ? (
          <NoTenantAccessState subject="batches" />
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

  return <CardsView batches={batches} loadedAt={snapshot.status === 'ok' ? formatDateTime(snapshot.fetchedAt) : null} />;
}
