/**
 * TES-40 — School dashboard, scoped to one school: `/t/<code>/dashboard`.
 *
 * Figma references:
 * - Coordinator dashboard: file vZKyWXSipBHmiQFuHl5e1O, node 522:2367
 * - Viewer dashboard: file vZKyWXSipBHmiQFuHl5e1O, node 394:723
 * (Admins land on `/overview`, the cross-school view; they reach this page
 * from there or from the school switcher.)
 *
 * A calm operations view that shows only verified signals: one KPI row, the
 * Needs-attention queue, a lifecycle summary, and panels that render only when
 * their source data exists. Every derivation lives in `modules/*\/domain`; this
 * route fetches, folds the guard states, and composes.
 *
 * Role authority is `profiles.role` (the role RLS reads); Clerk is identity
 * only. `?state=` remains a preview override for the guard states.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardHeaderPlain } from '@/modules/batches/ui/dashboard/DashboardHeader';
import { DashboardCallouts } from '@/modules/batches/ui/dashboard/DashboardCallouts';
import { NeedsAttentionQueue } from '@/modules/batches/ui/dashboard/NeedsAttentionQueue';
import { LifecycleSummary } from '@/modules/batches/ui/dashboard/LifecycleSummary';
import { DocumentStatusDonut } from '@/modules/batches/ui/dashboard/DocumentStatusDonut';
import { ProgramBreakdown } from '@/modules/batches/ui/dashboard/ProgramBreakdown';
import { EgaceOutcomes } from '@/modules/batches/ui/dashboard/EgaceOutcomes';
import { KpiSummary } from '@/modules/batches/ui/KpiSummary';
import { RecentActivityPanel } from '@/modules/activity/ui/RecentActivityPanel';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { formatDateTime } from '@/shared/dates';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import { attentionItems } from '@/modules/batches/domain/attention';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { getActivitySnapshot } from '@/modules/activity/data/activity';
import { firstParam, toOfficeRole, type OfficeRole } from '@/modules/auth/data/role';
import { tenantAccessOf, withTenantAccess } from '@/modules/tenancy/domain/access';
import { scopedPath, type TenantScope } from '@/modules/tenancy/domain/scope';
import { requireScope } from '../../../tenant-scope';
import type { Batch } from '@/shared/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ tenantCode: string }>;

// Screen-reader statement of what this role can do here — the visible page
// carries no role chrome, but the read-only boundary must still be stated.
const ROLE_NOTE: Record<OfficeRole, string> = {
  coordinator: 'Coordinator view. Batch, document, and billing actions are enabled for this school.',
  admin: 'Admin view of one school. Use the overview for every school you manage.',
  viewer: 'Read-only view. Write actions are hidden and server-denied.',
};

function linksFor(scope: TenantScope) {
  const batches = scopedPath(scope.code, 'table-view');
  return {
    batches,
    batch: (batchId: string) => scopedPath(scope.code, 'table-view', `?batch=${encodeURIComponent(batchId)}`),
    documents: scopedPath(scope.code, 'documents'),
    activity: scopedPath(scope.code, 'activity-log'),
    retry: scopedPath(scope.code, 'dashboard'),
    attention: '#needs-attention',
  };
}

/** Most pressing first: soonest recorded deadline, then batches with none. */
function byBillingUrgency(a: Batch, b: Batch): number {
  return a.daysToBilling - b.daysToBilling;
}

export default async function SchoolDashboardPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const resolved = await requireScope(params);
  if (!resolved) return null;
  const { scope, profile } = resolved;
  if (profile.role === 'trainer') redirect('/trainer');
  const role = toOfficeRole(profile.role);
  const forcedState = firstParam((await searchParams).state);
  const links = linksFor(scope);
  const header = <DashboardHeaderPlain />;

  const snapshot = withTenantAccess(await getBatchesSnapshot(scope.tenantId), tenantAccessOf(profile));
  const batches = selectBatchesForDisplay(snapshot);
  const syncFailed = forcedState === 'sync-failed' || snapshot.status === 'sync-failed';

  const guard = guardState({ forcedState, syncFailed, noTenantAccess: snapshot.status === 'no-tenant-access', batchCount: batches.length, role, scope, retryHref: links.retry });
  if (guard) return <GuardView header={header}>{guard}</GuardView>;

  const active = batches.filter((b) => b.status === 'ongoing');
  const metrics = deriveDashboardMetrics(batches);
  const items = attentionItems(batches, { syncFailed });
  const activity = await getActivitySnapshot(6, 0, scope.tenantId);
  const fetchedAt = snapshot.status === 'ok' ? formatDateTime(snapshot.fetchedAt) : null;

  return (
    <div className="dashboard-view">
      {header}
      <p className="dash-context">
        <span><strong>{scope.name}</strong> · {scope.code.toUpperCase()}</span>
        {fetchedAt && <span className="dash-context-stamp">Data as of {fetchedAt}</span>}
      </p>
      <span className="sr-only">{ROLE_NOTE[role]}</span>

      <DashboardCallouts syncFailed={syncFailed} isShowingCachedFallback={snapshot.status !== 'ok'} retryHref={links.retry} />

      <KpiSummary
        metrics={metrics}
        links={links}
        attention={{ total: items.length, urgent: items.filter((i) => i.severity === 'urgent').length }}
      />

      <div className="dash-ops-grid">
        <NeedsAttentionQueue items={items} links={links} />
        <LifecycleSummary batches={[...active].sort(byBillingUrgency)} batchHref={links.batch} allHref={links.batches} />
      </div>

      <div className="dash-pair">
        <DocumentStatusDonut batches={active} />
        <section className="dash-panel" aria-labelledby="programs-heading">
          <div className="dash-panel-head">
            <h2 id="programs-heading" className="dash-panel-title"><Icon name="folders" size={13} /> Programs</h2>
          </div>
          <div className="dash-panel-body"><ProgramBreakdown batches={active} /></div>
        </section>
      </div>

      <EgaceOutcomes batches={batches} />

      <RecentActivityPanel events={activity.status === 'ok' ? activity.events : []} viewAllHref={links.activity} />
    </div>
  );
}

/**
 * Guard states, in precedence order: a failure is never masked by a tidier
 * explanation (RULES.md rule 19 — check sync-failed before "empty"). Null
 * means the dashboard has data to show.
 */
function guardState({ forcedState, syncFailed, noTenantAccess, batchCount, role, scope, retryHref }: {
  forcedState: string | null;
  syncFailed: boolean;
  noTenantAccess: boolean;
  batchCount: number;
  role: OfficeRole;
  scope: TenantScope;
  retryHref: string;
}): ReactNode {
  if (forcedState === 'denied') {
    return <EmptyState iconName="shield-off" heading="Access restricted" sub="Your role can't view this school's dashboard. Ask a coordinator for access." />;
  }
  if (syncFailed && batchCount === 0) {
    return (
      <EmptyState iconName="refresh" heading="Unable to load data" sub="Batch data for this school isn't available right now. Try again in a moment."
        action={<Link href={retryHref} className="btn primary" style={{ marginTop: 12 }}>Try again</Link>} />
    );
  }
  if (forcedState === 'no-tenant-access' || noTenantAccess) return <NoTenantAccessState subject="this dashboard" />;
  if (forcedState === 'empty' || batchCount === 0) {
    const viewer = role === 'viewer';
    return (
      <EmptyState iconName="folders" heading="No batches yet"
        sub={viewer
          ? 'Batches appear here once a coordinator imports or assigns them.'
          : 'Import or assign a batch and its deadlines, documents, and lifecycle appear here.'}
        action={viewer ? undefined : <Link href={scopedPath(scope.code, 'batch-cards')} className="btn primary" style={{ marginTop: 12 }}>Go to batches</Link>} />
    );
  }
  return null;
}

function GuardView({ header, children }: { header: ReactNode; children: ReactNode }) {
  return <div className="dashboard-view">{header}{children}</div>;
}
