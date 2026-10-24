/**
 * SCREEN ROUTE — Table View
 *
 * Server shell → interactive TableView client island. `unconfigured`/
 * `sync-failed` render empty rather than substituting mock data; `sync-failed`
 * additionally surfaces the banner below (module data-layer contract). An `ok`
 * snapshot is authoritative even when empty — see ADR-005 §5.
 */

import Link from 'next/link';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { TableView } from '@/modules/batches/ui/TableView';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { tenantAccessOf, withTenantAccess } from '@/modules/tenancy/domain/access';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { requireScope } from '../../../../tenant-scope';
import type { Batch } from '@/shared/types';

export default async function TableViewPage({ params, searchParams }: {
  params: Promise<{ tenantCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  // Each row is measured against its own program's catalog
  // (`batch.documentRequirements`), so no flat catalog is passed down.
  const batchParam = (await searchParams).batch;
  const initialBatchId = Array.isArray(batchParam) ? batchParam[0] ?? null : batchParam ?? null;

  if (batches.length === 0) {
    return (
      <div>
        <div className="page-head">
          <h1>Table View</h1>
        </div>
        {syncFailed ? (
          <InfoCallout variant="warning">
            Sync with Supabase failed — batches could not be loaded.
            <Link href={scopedPath(scope.code, 'table-view')} className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
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

  return <TableView batches={batches} initialBatchId={initialBatchId} />;
}
