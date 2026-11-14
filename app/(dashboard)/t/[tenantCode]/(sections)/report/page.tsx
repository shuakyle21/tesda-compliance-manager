/**
 * SCREEN ROUTE — Report (TESDA EGACE + Employment)
 *
 * Server Component shell: reads the portfolio batch set from the live batches
 * contract and hands it to the interactive ReportView client island, which
 * builds the EGACE funnel/table, the post-training employment report, and the
 * real .xlsx (T2MIS) export.
 *
 * `unconfigured`/`sync-failed` render empty rather than substituting mock data
 * (module data-layer contract); `sync-failed` additionally surfaces the banner
 * below. An `ok` snapshot is authoritative even when empty — see ADR-005 §5.
 * The snapshot is unfiltered by status, so the report still spans completed
 * and historical cohorts, not just active ones.
 */

import { EmptyState } from '@/shared/ui/EmptyState';
import { SnapshotStatusNotice } from '@/shared/ui/SnapshotStatusNotice';
import { tenantAccessOf, withTenantAccess } from '@/modules/tenancy/domain/access';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { attachRoster, getTenantRosterSnapshot } from '@/modules/batches/data/learners';
import { ReportView } from '@/modules/reports/ui/ReportView';
import { scopedPath } from '@/modules/tenancy/domain/scope';
import { requireOfficeScope } from '../../../../tenant-scope';
import type { Batch } from '@/shared/types';

export default async function ReportPage({ params }: { params: Promise<{ tenantCode: string }> }) {
  // Scope + trainer redirect (ADR-001 §9): EGACE/employment outcomes are
  // per-scholar financial and employment data, so trainers never reach them.
  const resolved = await requireOfficeScope(params);
  if (!resolved) return null;
  const { scope, profile } = resolved;

  // `withTenantAccess` rewrites only an `ok` snapshot, so "you belong to no
  // school" never masks a real fetch failure.
  const snapshot = withTenantAccess(await getBatchesSnapshot(scope.tenantId), tenantAccessOf(profile));
  // Scholars are fetched here, not in the shared batches snapshot: the roster
  // carries contact and employment data that no other screen should load.
  const rosterSnapshot = await getTenantRosterSnapshot(scope.tenantId);
  const batches: Batch[] = attachRoster(
    selectBatchesForDisplay(snapshot),
    rosterSnapshot.status === 'ok' ? rosterSnapshot.roster : {},
  );
  // Either fetch failing makes the whole report possibly incomplete.
  const status = snapshot.status === 'sync-failed' || rosterSnapshot.status === 'sync-failed' ? 'sync-failed' : snapshot.status;
  const subject = 'EGACE and employment reporting';
  const retryHref = scopedPath(scope.code, 'report');

  if (batches.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">Report</h1>
        </div>
        <SnapshotStatusNotice
          status={status}
          hasRows={false}
          subject={subject}
          retryHref={retryHref}
          emptyFallback={
            <EmptyState
              iconName="certificate"
              heading="No batches to report"
              sub="EGACE outcomes and the post-training employment report appear here once a batch is imported or assigned to you."
            />
          }
        />
      </div>
    );
  }

  return (
    <>
      <SnapshotStatusNotice status={status} hasRows subject={subject} retryHref={retryHref} emptyFallback={null} />
      <ReportView batches={batches} tenants={profile.tenants} />
    </>
  );
}
