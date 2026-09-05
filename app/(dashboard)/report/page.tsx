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

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { deriveTenantAccess } from '@/modules/tenancy/data/tenancy';
import { withTenantAccess } from '@/modules/tenancy/domain/access';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { getAuthUserId } from '@/modules/auth/data/auth';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import { ReportView } from '@/modules/reports/ui/ReportView';
import type { Batch } from '@/shared/types';

export default async function ReportPage() {
  // EGACE/employment outcomes are per-scholar financial and employment data —
  // the same trainer-omission boundary billing enforces (CLAUDE.md's
  // load-bearing role rule; ADR-001 §9 Scope) applies here too. This route had
  // no redirect prior to this change; while the page rendered mock data that
  // was low-risk, but now that it reads live batches it must be server-denied
  // for trainers like every other financial/preparation surface — not merely
  // hidden from the nav (Sidebar.tsx's comment already assumed this redirect
  // existed).
  //
  // Gated on `resolveTrustedRole` (dbRole/Clerk only), never `resolveRouteRole`
  // — the latter's `?role=` preview override would let a real trainer request
  // `?role=admin` and skip this redirect entirely.
  const clerkUserId = await getAuthUserId();
  const profileSnapshot = clerkUserId ? await getProfileSnapshot(clerkUserId) : null;
  const dbRole = profileSnapshot?.status === 'ok' ? profileSnapshot.profile.role : null;
  const trustedRole = await resolveTrustedRole(dbRole);
  if (trustedRole === 'trainer') {
    redirect('/trainer');
  }

  // This route already holds the profile snapshot for the trainer redirect
  // above, so the membership verdict is derived from it rather than fetched a
  // second time. `withTenantAccess` rewrites only an `ok` snapshot, so "you
  // belong to no school" never masks a real fetch failure.
  const tenantAccess = profileSnapshot ? deriveTenantAccess(profileSnapshot) : 'unknown';
  const snapshot = withTenantAccess(await getBatchesSnapshot(), tenantAccess);
  const batches: Batch[] = selectBatchesForDisplay(snapshot);
  const syncFailed = snapshot.status === 'sync-failed';

  if (batches.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">Report</h1>
        </div>
        {syncFailed && <SyncFailedCallout />}
        {snapshot.status === 'no-tenant-access' ? (
          <NoTenantAccessState subject="EGACE and employment reporting" />
        ) : (
          <EmptyState
            iconName="certificate"
            heading="No batches to report"
            sub="EGACE outcomes and the post-training employment report appear here once a batch is imported or assigned to you."
          />
        )}
      </div>
    );
  }

  return (
    <>
      {syncFailed && <SyncFailedCallout />}
      <ReportView batches={batches} />
    </>
  );
}

function SyncFailedCallout() {
  return (
    <InfoCallout variant="warning">
      Sync with Supabase failed — this report may be incomplete.
      <Link href="/report" className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
    </InfoCallout>
  );
}
