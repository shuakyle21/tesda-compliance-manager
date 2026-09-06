/**
 * TES-40 — Role-aware dashboard landing route.
 *
 * Figma references:
 * - Coordinator dashboard: file vZKyWXSipBHmiQFuHl5e1O, node 522:2367
 * - Admin dashboard: file vZKyWXSipBHmiQFuHl5e1O, node 382:3
 * - Viewer dashboard: file vZKyWXSipBHmiQFuHl5e1O, node 394:723
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { EgaceOutcomes } from '@/modules/batches/ui/dashboard/EgaceOutcomes';
import { DocumentStatusDonut } from '@/modules/batches/ui/dashboard/DocumentStatusDonut';
import { ProgressTrend, type TrendSeries } from '@/modules/batches/ui/dashboard/ProgressTrend';
import { BatchTimeline } from '@/modules/batches/ui/dashboard/BatchTimeline';
import { AlertsPanel } from '@/modules/batches/ui/dashboard/AlertsPanel';
import { DashboardCallouts } from '@/modules/batches/ui/dashboard/DashboardCallouts';
import { DashboardKpiGrid } from '@/modules/batches/ui/dashboard/DashboardKpiGrid';
import { ProgramBreakdown } from '@/modules/batches/ui/dashboard/ProgramBreakdown';
import { DashboardHeader, DashboardHeaderPlain } from '@/modules/batches/ui/dashboard/DashboardHeader';
import { RecentActivityPanel } from '@/modules/activity/ui/RecentActivityPanel';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NoTenantAccessState } from '@/shared/ui/NoTenantAccessState';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import { isBillingReady } from '@/modules/billing/domain/readiness';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { getActivitySnapshot } from '@/modules/activity/data/activity';
import { getCurrentUser } from '@/modules/auth/data/auth';
import { withTenantAccess } from '@/modules/tenancy/domain/access';
import { resolveTenantAccess } from '../tenant-access';
import {
  firstParam,
  isOfficeRole,
  resolveDisplayRole,
  type OfficeRole,
} from '@/modules/auth/data/role';
import type { ActivityEvent, Batch, DocumentRequirement } from '@/shared/types';

// The three office roles this route renders. Shared with every other
// dashboard-tree route via `modules/auth/data/role` rather than restated here.
type DashboardRole = OfficeRole;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ROLE_COPY: Record<DashboardRole, {
  name: string;
  roleLabel: string;
  subtitle: string;
  permissionNote: string;
  figmaNode: string;
}> = {
  // Full names, matching the identity Sidebar's user card shows for each role
  // (design's `ROLES[role].name` in TVI-CAMS.dc.html) — the greeting row
  // below reads as "who is this" the same way the sidebar does, not a
  // separate "Good day" salutation.
  coordinator: {
    name: 'Karina Cruz',
    roleLabel: 'Coordinator',
    subtitle: 'Monitor assigned schools, urgent billing windows, and document readiness.',
    permissionNote: 'Coordinator actions enabled for assigned tenants.',
    figmaNode: '522:2367',
  },
  admin: {
    name: 'Rodel Esteban',
    roleLabel: 'Admin',
    subtitle: 'School-level oversight for operational readiness and compliance blockers.',
    permissionNote: 'Admin controls available for the active school.',
    figmaNode: '382:3',
  },
  viewer: {
    name: 'Rosa C. Mendiola',
    roleLabel: 'Viewer',
    subtitle: 'Read-only audit view of batch readiness, evidence, and recent activity.',
    permissionNote: 'Read-only access. Write actions are hidden and server-denied.',
    figmaNode: '394:723',
  },
};

const SUMMARY_CARDS: { title: string; icon: IconName; meta?: string }[] = [
  { title: 'Document Status Distribution', icon: 'file-check', meta: 'critical docs' },
  { title: 'Program Breakdown', icon: 'folders' },
  { title: 'Lifecycle', icon: 'timeline' },
];

// Data older than this is surfaced as "stale" (TES-8 AC6). The real timestamp
// now comes from the freshest batch row's `updated_at`; this is only the policy
// threshold, not the data itself.
const DATA_STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

// "Jun 19, 2026 · 14:02"-style stamp from a real timestamp.
function formatDataStamp(date: Date): string {
  const d = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  // hourCycle 'h23' (not hour12: false, which implies 'h24') so midnight is
  // "00:02", never "24:02".
  const t = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${d} · ${t}`;
}

// Wraps the `Date.now()` clock read so it stays out of the component body
// (react-hooks/purity forbids impure calls during render).
function isDataStale(asOf: Date | null): boolean {
  return asOf ? Date.now() - asOf.getTime() > DATA_STALE_AFTER_MS : false;
}

// ---------------------------------------------------------------------------
// Render-derivation helpers — pulled out of DashboardPage's body (was CC 35,
// almost entirely independent ternary/&&/|| expressions with no shared state
// machine) so each derivation is named and separately measured, following
// the formatDataStamp/isDataStale convention this file already established.
// ---------------------------------------------------------------------------

interface DashboardViewState {
  isDenied: boolean;
  hasNoTenantAccess: boolean;
  isEmpty: boolean;
  syncFailed: boolean;
  isStale: boolean;
  dataAsOfLabel: string | null;
  syncFailedMessage: string;
}

function resolveDataAsOfDate(snapshot: Awaited<ReturnType<typeof getBatchesSnapshot>>): Date | null {
  return snapshot.status === 'ok' && snapshot.dataAsOf ? new Date(snapshot.dataAsOf) : null;
}

// A real stamp when we have live data; null on the cached/mock path so copy
// can fall back gracefully instead of printing a fake precise timestamp.
function dataAsOfLabelFor(dataAsOfDate: Date | null): string | null {
  return dataAsOfDate ? formatDataStamp(dataAsOfDate) : null;
}

function isEmptyDashboard(forcedState: string | null, batchCount: number): boolean {
  return forcedState === 'empty' || batchCount === 0;
}

/**
 * "You belong to no school yet" — distinct from "your school has no batches".
 * The snapshot only ever carries this because `withTenantAccess` folded the
 * membership verdict in; the query itself cannot tell the two apart.
 */
function hasNoTenantAccessDashboard(
  forcedState: string | null,
  snapshot: Awaited<ReturnType<typeof getBatchesSnapshot>>,
): boolean {
  return forcedState === 'no-tenant-access' || snapshot.status === 'no-tenant-access';
}

function isSyncFailedDashboard(
  forcedState: string | null,
  snapshot: Awaited<ReturnType<typeof getBatchesSnapshot>>,
): boolean {
  return forcedState === 'sync-failed' || snapshot.status === 'sync-failed';
}

function isStaleDashboard(forcedState: string | null, dataAsOfDate: Date | null): boolean {
  return forcedState === 'stale' || isDataStale(dataAsOfDate);
}

function syncFailedMessageFor(dataAsOfLabel: string | null): string {
  return dataAsOfLabel ? ` from ${dataAsOfLabel}` : '';
}

function deriveDashboardViewState(
  forcedState: string | null,
  snapshot: Awaited<ReturnType<typeof getBatchesSnapshot>>,
  batchCount: number,
): DashboardViewState {
  const dataAsOfDate = resolveDataAsOfDate(snapshot);
  const dataAsOfLabel = dataAsOfLabelFor(dataAsOfDate);

  return {
    // TODO(#32): wire to real role resolver
    isDenied: forcedState === 'denied',
    hasNoTenantAccess: hasNoTenantAccessDashboard(forcedState, snapshot),
    isEmpty: isEmptyDashboard(forcedState, batchCount),
    syncFailed: isSyncFailedDashboard(forcedState, snapshot),
    isStale: isStaleDashboard(forcedState, dataAsOfDate),
    dataAsOfLabel,
    syncFailedMessage: syncFailedMessageFor(dataAsOfLabel),
  };
}

/** Events on the `ok` path; empty otherwise — never a fabricated feed. */
function selectRecentActivity(snapshot: Awaited<ReturnType<typeof getActivitySnapshot>>): ActivityEvent[] {
  return snapshot.status === 'ok' ? snapshot.events : [];
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  // Redirect gate: Clerk's role only. `?role=` must never decide this — a real
  // trainer requesting `?role=admin` must still be sent to /trainer.
  //
  // `resolveTrustedDashboardRole()` can fail to reach Clerk (network blip,
  // transient API error) as distinct from succeeding and finding no role set.
  // Those are not the same thing: collapsing both to `null` would let a real
  // trainer whose lookup happened to fail fall through to the office
  // dashboard as 'viewer' instead of being redirected — the lookup failing
  // means we don't know they're *not* a trainer, so fail closed before any
  // data loads rather than defaulting to a permissive fallback. This is
  // separate from `isDenied` below, which is the (not-yet-built) real
  // tenant/role resolver from TES-34 — this is only about the trusted lookup
  // itself erroring out.
  const trustedResult = await resolveTrustedDashboardRole();
  if (trustedResult.status === 'lookup-failed') {
    return <RoleLookupFailedView header={<DashboardHeaderPlain />} />;
  }

  const trustedRole = trustedResult.role;
  if (trustedRole === 'trainer') {
    redirect('/trainer');
  }

  // Display only, past this point. `?role=` may pick a different dashboard
  // variant to preview; it never overrides the redirect above. Conservative
  // least-privilege fallback until the tenant-role resolver lands (TES-34):
  // an unresolved-but-confirmed role (lookup succeeded, no role set) renders
  // the read-only viewer variant rather than a write-enabled one.
  const dashboardRole = resolveDisplayRole(firstParam(params.role), trustedRole);
  const roleCopy = ROLE_COPY[dashboardRole];

  // ---- Live load (TES-8 AC6) ----
  // Attempt the real Supabase fetch. `ok` → live rows (already RLS-scoped, so
  // no manual tenant filter). `sync-failed`/`unconfigured` render empty —
  // never mock data (RULES.md rule 19).
  //
  // Membership is `modules/tenancy`'s fact and its `data/` is private to that
  // module, so the route composes the two reads and folds the verdict in —
  // the same shape `resolveTrustedRole(dbRole)` already uses for the role.
  // `withTenantAccess` only ever rewrites an `ok` snapshot, so a real fetch
  // failure still reads as a failure.
  const tenantAccess = await resolveTenantAccess();
  const snapshot = withTenantAccess(await getBatchesSnapshot(), tenantAccess);
  const batches: Batch[] = selectBatchesForDisplay(snapshot);
  // No live per-program document-requirement catalog exists yet
  // (TES-34-adjacent gap) — an empty catalog reads as "unknown"/"pending"
  // per ADR-004, never as a fabricated compliance percentage. Shared with
  // DocumentStatusDonut/AlertsPanel below so every doc-derived reading on
  // this page degrades the same way.
  const documentRequirements: DocumentRequirement[] = [];
  const metrics = deriveDashboardMetrics(batches, documentRequirements);
  // Drives the critical-docs callout below. The ADR-004 "untracked means
  // unknown, not 0%" reading of `docCompliancePct` lives in DashboardKpiGrid,
  // alongside the only card that renders it.
  const criticalMissing = metrics.docMissing;
  const billingReady = batches.filter(isBillingReady);
  const earliestBatch = batches.slice().sort((a, b) => a.daysToBilling - b.daysToBilling)[0];

  // Recent Activity panel (6 most recent events) — never mock data.
  const recentActivity = selectRecentActivity(
    withTenantAccess(await getActivitySnapshot(6), tenantAccess),
  );

  // Progress & Compliance Trend (last 6 weeks): no live weekly-snapshot data
  // source exists yet, so this always renders ProgressTrend's own "No trend
  // data yet." empty state rather than fabricating history.
  const trendSeries: TrendSeries[] = [];

  // ---- Dashboard states (TES-8 AC6) ----
  // `?state=` remains a manual preview override for every state. Beyond that:
  //   - sync-failed: real Supabase fetch failure (configured-but-errored).
  //   - stale:       real data freshness from the freshest row's `updated_at`.
  //   - denied:      still preview-only — derives from the tenant/role resolver,
  //                  which does not exist yet (blocked by TES-34 / #32).
  const forcedState = firstParam(params.state);
  const {
    isDenied,
    hasNoTenantAccess,
    isEmpty,
    syncFailed,
    isStale,
    dataAsOfLabel,
    syncFailedMessage,
  } = deriveDashboardViewState(forcedState, snapshot, batches.length);
  // `syncFailed` can be true via the `?state=` preview override while the
  // real snapshot is still `ok` (live rows) — only claim "cached" when the
  // rows actually came from the mock/cached fallback, not the live table.
  const isShowingCachedFallback = snapshot.status !== 'ok';

  const header = (
    <DashboardHeader
      roleLabel={roleCopy.roleLabel}
      activeBatches={metrics.activeBatches}
      dataAsOfLabel={dataAsOfLabel}
      isStale={isStale}
    />
  );

  // Permission denied — full-page guard state.
  if (isDenied) {
    return <DeniedView header={header} />;
  }

  // A real sync failure yields zero batches (no mock fallback), which would
  // otherwise satisfy the empty guard below and hide the retry banner behind
  // a misleading "no batches — import one" message. Check this first so a
  // failed fetch always reads as a failure, never as an empty tenant
  // (RULES.md rule 19: sync-failed must surface the banner). The
  // `?state=sync-failed` preview override with a real non-empty snapshot
  // still falls through to DashboardCallouts below, unaffected.
  if (syncFailed && batches.length === 0) {
    return <SyncFailedView header={header} message={syncFailedMessage} />;
  }

  // No school assigned yet. This must be checked *before* the empty guard: the
  // two look identical from the query's side (both yield zero batches), but
  // only one of them is a fact about the data. Telling someone with no
  // membership to "import a batch" names an action they cannot perform and
  // hides the one that would actually help them.
  if (hasNoTenantAccess) {
    return <NoTenantAccessView header={header} />;
  }

  // Empty — the tenant is assigned but holds no batches; surface the next
  // administrative action.
  if (isEmpty) {
    return <EmptyBatchesView header={header} />;
  }

  return (
    <div className="dashboard-view">
      {header}

      <DashboardCallouts
        syncFailed={syncFailed}
        isShowingCachedFallback={isShowingCachedFallback}
        syncFailedMessage={syncFailedMessage}
        criticalMissing={criticalMissing}
        batchCount={batches.length}
      />

      {/* Compact identity row — name + role, matching the design's greeting
          card exactly. `subtitle`/`permissionNote` still exist on ROLE_COPY
          for the a11y label below (screen-reader only), so the read-only
          boundary is still communicated to a viewer, just not as visible
          card copy the design doesn't show. */}
      <section className="dash-greeting" aria-labelledby="dashboard-role-heading">
        <div id="dashboard-role-heading" className="dash-greeting-title">
          {roleCopy.name}
          <span className={`dash-greeting-role role-tag ${dashboardRole}`}>
            {roleCopy.roleLabel}
          </span>
        </div>
        <span className="sr-only">{roleCopy.subtitle} {roleCopy.permissionNote}</span>
      </section>

      <DashboardKpiGrid
        metrics={metrics}
        role={dashboardRole}
        billingReadyCount={billingReady.length}
        earliestBatchId={earliestBatch?.id}
      />

      <section
        className="dash-charts-row"
        aria-label="Document status and progress trend"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(0, 2fr)', gap: 16 }}
      >
        <DocumentStatusDonut batches={batches} documentRequirements={documentRequirements} />
        <ProgressTrend series={trendSeries} />
      </section>

      <EgaceOutcomes batches={batches} />

      <BatchTimeline batches={batches} />

      <section className="dash-main-grid" aria-label="Dashboard summaries">
        <AlertsPanel batches={batches} documentRequirements={documentRequirements} />

        <DashboardPanel title={SUMMARY_CARDS[1].title} icon={SUMMARY_CARDS[1].icon}>
          <ProgramBreakdown batches={batches} avgProgress={metrics.avgProgress} />
        </DashboardPanel>

        <DashboardPanel title={SUMMARY_CARDS[2].title} icon={SUMMARY_CARDS[2].icon}>
          <LifecyclePanel earliestBatch={earliestBatch} />
        </DashboardPanel>
      </section>

      <RecentActivityPanel events={recentActivity} />
    </div>
  );
}

type TrustedRoleResult =
  | { status: 'ok'; role: DashboardRole | 'trainer' | null } // role: null = confirmed, no role set
  | { status: 'lookup-failed' }; // getCurrentUser() itself errored — identity unknown

// Trusted source only (Clerk `publicMetadata.role`) — never `?role=`, which
// would let a real trainer skip the redirect above by requesting `?role=admin`.
// Distinguishes "looked up, no role set" (`role: null`) from "the lookup
// itself failed" (`status: 'lookup-failed'`) so the caller can fail closed on
// the latter instead of silently treating both the same way.
async function resolveTrustedDashboardRole(): Promise<TrustedRoleResult> {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return { status: 'lookup-failed' };
  }

  const metadataRole = typeof user?.publicMetadata?.role === 'string'
    ? user.publicMetadata.role.toLowerCase()
    : null;

  return {
    status: 'ok',
    role: isOfficeRole(metadataRole) || metadataRole === 'trainer' ? metadataRole : null,
  };
}

function RoleLookupFailedView({ header }: { header: React.ReactNode }) {
  return (
    <div className="dashboard-view">
      {header}
      <EmptyState
        iconName="alert-triangle"
        heading="Couldn't verify your access"
        sub="We weren't able to confirm your role just now — this is usually temporary. Try again in a moment."
        action={<Link href="/dashboard" className="btn primary" style={{ marginTop: 12 }}>Retry</Link>}
      />
    </div>
  );
}

function DeniedView({ header }: { header: React.ReactNode }) {
  return (
    <div className="dashboard-view">
      {header}
      <EmptyState
        iconName="shield-off"
        heading="Access denied"
        sub="Your role does not have access to this school's dashboard. Contact a coordinator to request access."
      />
    </div>
  );
}

function NoTenantAccessView({ header }: { header: React.ReactNode }) {
  return (
    <div className="dashboard-view">
      {header}
      <NoTenantAccessState subject="your dashboard" />
    </div>
  );
}

function EmptyBatchesView({ header }: { header: React.ReactNode }) {
  return (
    <div className="dashboard-view">
      {header}
      <EmptyState
        iconName="folders"
        heading="No assigned batches"
        sub="Once a batch is imported or assigned to you, its readiness, lifecycle, and documents appear here."
        action={<Link href="/batch-cards" className="btn primary" style={{ marginTop: 12 }}>Import a batch</Link>}
      />
    </div>
  );
}

function SyncFailedView({ header, message }: { header: React.ReactNode; message: string }) {
  return (
    <div className="dashboard-view">
      {header}
      <EmptyState
        iconName="refresh"
        heading="Couldn't reach Supabase"
        sub={`Batch data isn't available right now${message}. Try again in a moment.`}
        action={<Link href="/dashboard" className="btn primary" style={{ marginTop: 12 }}>Retry</Link>}
      />
    </div>
  );
}


function DashboardPanel({
  title,
  icon,
  meta,
  children,
}: {
  title: string;
  icon: IconName;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div className="dash-panel-title">
          <Icon name={icon} size={13} />
          {title}
        </div>
        {meta && <div className="dash-panel-meta">{meta}</div>}
      </div>
      <div className="dash-panel-body">{children}</div>
    </div>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
      <span style={{ width: 10, height: 6, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

function LifecyclePanel({ earliestBatch }: { earliestBatch: Batch | undefined }) {
  if (!earliestBatch) return <p className="t-body">No active lifecycle data.</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
        <span>{earliestBatch.id}</span>
        <span>3/7</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginTop: 10 }}>
        {earliestBatch.lifecycle.map((stage) => (
          <span
            key={stage.key}
            title={`${stage.label}: ${stage.status}`}
            style={{
              height: 8,
              borderRadius: 999,
              background:
                stage.status === 'done' ? 'var(--color-green)'
                  : stage.status === 'active' ? 'var(--color-blue)'
                    : 'var(--color-border-faint)',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <LegendDot label="Done" color="var(--color-green)" />
        <LegendDot label="Active" color="var(--color-blue)" />
        <LegendDot label="Pending" color="var(--color-border-strong)" />
      </div>
    </div>
  );
}
