/**
 * SCREEN — Analytics (charts ported from App.jsx AnalyticsView, now rendered
 * via Tremor — see modules/analytics/ui/AnalyticsView.tsx and the
 * analytics_tremor_decision project memory for why this module alone departs
 * from the app's hand-rolled chart primitives).
 *
 * Stays a Server Component: it only fetches the live batch snapshot and hands
 * the rows to the client-rendered AnalyticsView.
 */

import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { AnalyticsView } from '@/modules/analytics/ui/AnalyticsView';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { Icon } from '@/shared/ui/Icon';
import { withTenantAccess } from '@/modules/tenancy/domain/access';
import { resolveTenantAccess } from '../tenant-access';
import type { Batch, DocumentRequirement } from '@/shared/types';

export default async function AnalyticsPage() {
  // `unconfigured`/`sync-failed` chart nothing rather than substituting mock
  // data; `sync-failed` additionally surfaces the banner below (module
  // data-layer contract). An `ok` snapshot is authoritative even when empty —
  // see ADR-005 §5.
  // `withTenantAccess` rewrites only an `ok` snapshot, so "you belong to no
  // school" never masks a real fetch failure — see the fold's own note.
  const snapshot = withTenantAccess(await getBatchesSnapshot(), await resolveTenantAccess());
  const batches: Batch[] = selectBatchesForDisplay(snapshot);

  // No live per-program document-requirement catalog exists yet: the real
  // contract (`getDocumentRequirementsSnapshot`) is scoped per scholarship
  // program and needs a program id that `Batch` doesn't carry
  // (TES-34-adjacent gap). An empty catalog leaves the document-compliance
  // chart in its "cannot be scored" state per ADR-004, never at a fabricated
  // percentage.
  const documentRequirements: DocumentRequirement[] = [];

  return (
    <div>
      <Header />
      {snapshot.status === 'sync-failed' && (
        <InfoCallout variant="warning">
          Sync with the compliance database failed, so no charts can be drawn. Reload to try again.
        </InfoCallout>
      )}
      {/* Charting an empty series for someone who belongs to no school would
          render four "cannot be scored" panels as if they described their
          school. Say why instead. */}
      {snapshot.status === 'no-tenant-access' && <NoTenantAccessState subject="analytics" />}
      {snapshot.status !== 'no-tenant-access' &&
        !(snapshot.status === 'sync-failed' && batches.length === 0) && (
          <AnalyticsView batches={batches} documentRequirements={documentRequirements} />
        )}
    </div>
  );
}

function Header() {
  return (
    <div className="page-head">
      <h1>Analytics</h1>
      <span className="subline">4 charts · tenant-scoped</span>
      <div style={{ marginLeft: 'auto' }}>
        <button className="btn secondary"><Icon name="download" size={14} />Export</button>
      </div>
    </div>
  );
}
