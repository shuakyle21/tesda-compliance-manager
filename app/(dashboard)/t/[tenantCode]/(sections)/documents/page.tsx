/**
 * SCREEN ROUTE — Documents Matrix
 * Server shell → interactive DocumentsView client island (preview + verify flow).
 */

import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { DocumentsView } from '@/modules/documents/ui/DocumentsView';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { tenantAccessOf, withTenantAccess } from '@/modules/tenancy/domain/access';
import { requirementCatalogOf } from '@/modules/documents/domain/compliance';
import { requireScope } from '../../../../tenant-scope';
import type { Batch } from '@/shared/types';

export default async function DocumentsPage({ params }: { params: Promise<{ tenantCode: string }> }) {
  // One school, validated against the caller's memberships by the segment layout.
  const resolved = await requireScope(params);
  if (!resolved) return null;
  const { scope, profile } = resolved;
  // `unconfigured`/`sync-failed` render empty rather than substituting mock
  // data; `sync-failed` additionally surfaces the banner inside the view
  // (module data-layer contract). An `ok` snapshot is authoritative even when
  // empty — see ADR-005 §5.
  // `withTenantAccess` rewrites only an `ok` snapshot, so "you belong to no
  // school" never masks a real fetch failure — see the fold's own note.
  const snapshot = withTenantAccess(await getBatchesSnapshot(scope.tenantId), tenantAccessOf(profile));
  const batches: Batch[] = selectBatchesForDisplay(snapshot);

  // Each batch carries its own program's requirement catalog (mapped in
  // `mapBatchRow`). The matrix columns are their union; a column outside a
  // batch's program renders as "Not tracked", never "missing" (ADR-004). With
  // no catalog on any batch the matrix shows its "requirements unavailable"
  // state, never a fabricated compliance figure.
  const documentRequirements = requirementCatalogOf(batches);

  // The compliance matrix has no honest shape for someone attached to no
  // school: an all-blank grid reads as "your batches are missing every
  // document" rather than "you have no batches to check".
  if (snapshot.status === 'no-tenant-access') {
    return <NoTenantAccessState subject="the document matrix" />;
  }

  return (
    <DocumentsView
      batches={batches}
      documentRequirements={documentRequirements}
      syncFailed={snapshot.status === 'sync-failed'}
    />
  );
}
