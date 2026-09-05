/**
 * SCREEN ROUTE — Documents Matrix
 * Server shell → interactive DocumentsView client island (preview + verify flow).
 */

import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { DocumentsView } from '@/modules/documents/ui/DocumentsView';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { withTenantAccess } from '@/modules/tenancy/domain/access';
import { resolveTenantAccess } from '../tenant-access';
import type { Batch, DocumentRequirement } from '@/shared/types';

export default async function DocumentsPage() {
  // `unconfigured`/`sync-failed` render empty rather than substituting mock
  // data; `sync-failed` additionally surfaces the banner inside the view
  // (module data-layer contract). An `ok` snapshot is authoritative even when
  // empty — see ADR-005 §5.
  // `withTenantAccess` rewrites only an `ok` snapshot, so "you belong to no
  // school" never masks a real fetch failure — see the fold's own note.
  const snapshot = withTenantAccess(await getBatchesSnapshot(), await resolveTenantAccess());
  const batches: Batch[] = selectBatchesForDisplay(snapshot);

  // No live per-program document-requirement catalog exists yet: the real
  // contract (`getDocumentRequirementsSnapshot`) is scoped per scholarship
  // program and needs a program id that `Batch` doesn't carry
  // (TES-34-adjacent gap). An empty catalog collapses the matrix into its
  // "requirements unavailable" state per ADR-004 — never a fabricated
  // compliance percentage. (Each batch's own `documents` status map is live;
  // only this flat row catalog is missing.)
  const documentRequirements: DocumentRequirement[] = [];

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
