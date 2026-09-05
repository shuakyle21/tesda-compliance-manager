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
import { withTenantAccess } from '@/modules/tenancy/domain/access';
import { resolveTenantAccess } from '../tenant-access';
import type { Batch, DocumentRequirement } from '@/shared/types';

export default async function TableViewPage() {
  // `withTenantAccess` rewrites only an `ok` snapshot, so "you belong to no
  // school" never masks a real fetch failure — see the fold's own note.
  const snapshot = withTenantAccess(await getBatchesSnapshot(), await resolveTenantAccess());
  const batches: Batch[] = selectBatchesForDisplay(snapshot);
  const syncFailed = snapshot.status === 'sync-failed';
  const noTenantAccess = snapshot.status === 'no-tenant-access';

  // No live per-program document-requirement catalog exists yet — the real
  // `getDocumentRequirementsSnapshot` is scoped per scholarship program and
  // needs a program id `Batch` doesn't carry (TES-34-adjacent gap). An empty
  // catalog reads as "unknown"/"—" per ADR-004, never as a fabricated
  // compliance figure.
  const documentRequirements: DocumentRequirement[] = [];

  if (batches.length === 0) {
    return (
      <div>
        <div className="page-head">
          <h1>Table View</h1>
        </div>
        {syncFailed ? (
          <InfoCallout variant="warning">
            Sync with Supabase failed — batches could not be loaded.
            <Link href="/table-view" className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
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

  return <TableView batches={batches} documentRequirements={documentRequirements} />;
}
