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
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { createBatchesFromNtpAction, setBatchRqmCodeAction } from '../../actions';
import { getAouYears } from '@/modules/tenancy/data/tenantAou';
import { AddBatch, type AddBatchProps } from '@/modules/batches/ui/AddBatch';
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
  // Usability only — the action re-checks the role and RLS refuses the write.
  // Trusted role (`profiles.role`), never the `?role=` preview override.
  const trustedRole = await resolveTrustedRole(profile.role);
  const rqmEdit =
    trustedRole === 'admin' || trustedRole === 'coordinator'
      ? { tenantCode: scope.code, action: setBatchRqmCodeAction }
      : undefined;
  // "Add new batch" (TES-105): admin/coordinator, and only over an authoritative `ok` snapshot.
  const addBatch: AddBatchProps | undefined =
    rqmEdit && snapshot.status === 'ok'
      ? {
          tenantCode: scope.code,
          province: profile.tenants.find((t) => t.id === scope.tenantId)?.province ?? '',
          // A failed read shows the AOU field; the action re-checks on the server either way.
          aouYears: await getAouYears(scope.tenantId).then((r) => (r.status === 'ok' ? r.years : [])),
          action: createBatchesFromNtpAction,
        }
      : undefined;
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
            Batch data could not be loaded.
            <Link href={scopedPath(scope.code, 'batch-cards')} className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
          </InfoCallout>
        ) : noTenantAccess ? (
          <NoTenantAccessState subject="batches" />
        ) : (
          <EmptyState
            iconName="folders"
            heading="No batches yet"
            sub={
              addBatch
                ? 'Upload a Notice to Proceed to create the first batch. Each allocation row becomes one batch.'
                : 'Once a batch is imported or assigned to you, its readiness, lifecycle, and documents appear here.'
            }
            action={addBatch && <div style={{ marginTop: 8 }}><AddBatch {...addBatch} /></div>}
          />
        )}
      </div>
    );
  }

  return <CardsView batches={batches} loadedAt={snapshot.status === 'ok' ? formatDateTime(snapshot.fetchedAt) : null} rqmEdit={rqmEdit} addBatch={addBatch} />;
}
