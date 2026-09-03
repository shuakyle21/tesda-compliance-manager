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
import { InfoCallout } from '@/shared/ui/InfoCallout';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { MetricCard } from '@/shared/ui/MetricCard';
import { EgaceOutcomes } from '@/modules/batches/ui/dashboard/EgaceOutcomes';
import { DocumentStatusDonut } from '@/modules/batches/ui/dashboard/DocumentStatusDonut';
import { ProgressTrend, type TrendSeries } from '@/modules/batches/ui/dashboard/ProgressTrend';
import { BatchTimeline } from '@/modules/batches/ui/dashboard/BatchTimeline';
import { AlertsPanel } from '@/modules/batches/ui/dashboard/AlertsPanel';
import { EmptyState } from '@/shared/ui/EmptyState';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import { isBillingReady } from '@/modules/billing/domain/readiness';
import { getBatchesSnapshot, selectBatchesForDisplay } from '@/modules/batches/data/batches';
import { getActivitySnapshot } from '@/modules/activity/data/activity';
import { getCurrentUser } from '@/modules/auth/data/auth';
import type { Batch, DocumentRequirement, UserRole } from '@/shared/types';

type DashboardRole = Extract<UserRole, 'admin' | 'coordinator' | 'viewer'>;
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

// Shown when running on the cached/mock snapshot (no live `updated_at` to read),
// e.g. in environments where Supabase isn't configured.
const DATA_AS_OF_FALLBACK = 'cached snapshot';

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

function pluralize(count: number, singular = 'batch', plural = 'batches'): string {
  return count === 1 ? singular : plural;
}

// ---------------------------------------------------------------------------
// Render-derivation helpers — pulled out of DashboardPage's body (was CC 35,
// almost entirely independent ternary/&&/|| expressions with no shared state
// machine) so each derivation is named and separately measured, following
// the formatDataStamp/isDataStale convention this file already established.
// ---------------------------------------------------------------------------

interface DashboardViewState {
  isDenied: boolean;
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
    isEmpty: isEmptyDashboard(forcedState, batchCount),
    syncFailed: isSyncFailedDashboard(forcedState, snapshot),
    isStale: isStaleDashboard(forcedState, dataAsOfDate),
    dataAsOfLabel,
    syncFailedMessage: syncFailedMessageFor(dataAsOfLabel),
  };
}

function docComplianceVariant(criticalMissing: number, criticalPending: number): 'critical' | 'warning' | 'neutral' {
  if (criticalMissing) return 'critical';
  if (criticalPending) return 'warning';
  return 'neutral';
}

// The percentage covers tracked requirements only (ADR-004), so say so
// rather than implying a cleared checklist.
function docComplianceSubtext(
  docsTracked: boolean,
  criticalMissing: number,
  docTracked: number,
  docUntracked: number,
): string {
  if (!docsTracked) return 'document sync pending';
  if (criticalMissing) return `${criticalMissing} critical missing`;
  if (docUntracked > 0) return `${docTracked} of ${docTracked + docUntracked} tracked`;
  return 'All critical docs on file';
}

function billingUrgencyVariant(daysToEarliestBilling: number): 'critical' | 'warning' | 'neutral' {
  if (daysToEarliestBilling <= 6) return 'critical';
  if (daysToEarliestBilling <= 21) return 'warning';
  return 'neutral';
}

function earliestBillingSubtext(earliestBatchId: string | undefined, daysToEarliestBilling: number): string {
  if (!earliestBatchId) return 'No batches';
  // Infinity is the "no known deadline" sentinel from daysUntil(); sound for
  // sorting/urgency, but never printable copy.
  return Number.isFinite(daysToEarliestBilling)
    ? `${earliestBatchId} · ${daysToEarliestBilling} days left`
    : `${earliestBatchId} · no deadline set`;
}

function billingReadySubtext(dashboardRole: DashboardRole): string {
  return dashboardRole === 'viewer' ? 'read-only visibility' : 'billing prep queue';
}

function billingReadyVariant(billingReadyCount: number): 'warning' | 'neutral' {
  return billingReadyCount ? 'warning' : 'neutral';
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const role = await resolveDashboardRole(params);

  if (role === 'trainer') {
    redirect('/trainer');
  }

  // Conservative least-privilege fallback until the tenant-role resolver lands
  // (TES-34): an unresolved role renders the read-only viewer variant rather
  // than a write-enabled one. Use `?role=` to preview other variants.
  const dashboardRole = role ?? 'viewer';
  const roleCopy = ROLE_COPY[dashboardRole];

  // ---- Live load (TES-8 AC6) ----
  // Attempt the real Supabase fetch. `ok` → live rows (already RLS-scoped, so
  // no manual tenant filter). `sync-failed`/`unconfigured` render empty —
  // never mock data (RULES.md rule 19).
  const snapshot = await getBatchesSnapshot();
  const batches: Batch[] = selectBatchesForDisplay(snapshot);
  // No live per-program document-requirement catalog exists yet
  // (TES-34-adjacent gap) — an empty catalog reads as "unknown"/"pending"
  // per ADR-004, never as a fabricated compliance percentage. Shared with
  // DocumentStatusDonut/AlertsPanel below so every doc-derived reading on
  // this page degrades the same way.
  const documentRequirements: DocumentRequirement[] = [];
  const metrics = deriveDashboardMetrics(batches, documentRequirements);
  const criticalMissing = metrics.docMissing;
  const criticalPending = metrics.docPending;
  // ADR-004: a null percentage means *nothing* is tracked — unknown, not 0%
  // and not 100%. The rule lives in modules/documents/domain/compliance.ts;
  // this route only renders the two cases.
  const docsTracked = metrics.docCompliancePct !== null;
  const billingReady = batches.filter(isBillingReady);
  const earliestBatch = batches.slice().sort((a, b) => a.daysToBilling - b.daysToBilling)[0];

  // Recent Activity panel (6 most recent events) — never mock data.
  const activitySnapshot = await getActivitySnapshot(6);
  const recentActivity = activitySnapshot.status === 'ok' ? activitySnapshot.events : [];

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
  const { isDenied, isEmpty, syncFailed, isStale, dataAsOfLabel, syncFailedMessage } =
    deriveDashboardViewState(forcedState, snapshot, batches.length);

  const header = (
    <div className="page-head">
      <h1>Dashboard</h1>
      <span className="subline">
        {roleCopy.roleLabel} workspace · {metrics.activeBatches} active {pluralize(metrics.activeBatches)}
        {' · '}Data as of {dataAsOfLabel ?? DATA_AS_OF_FALLBACK}
        <StaleBadge isStale={isStale} />
      </span>
    </div>
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
  // still falls through to the inline SyncFailedCallout below, unaffected.
  if (syncFailed && batches.length === 0) {
    return <SyncFailedView header={header} message={syncFailedMessage} />;
  }

  // Empty — no assigned batches; surface the next administrative action.
  if (isEmpty) {
    return <EmptyBatchesView header={header} />;
  }

  return (
    <div className="dashboard-view">
      {header}

      <SyncFailedCallout syncFailed={syncFailed} message={syncFailedMessage} />

      <CriticalDocsCallout criticalMissing={criticalMissing} batchCount={batches.length} />

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

      <section className="dash-kpi-grid" aria-label="Dashboard key metrics">
        <MetricCard label="Active Batches" value={metrics.activeBatches} sub="tenant-scoped" iconName="folders" />
        <MetricCard label="Total Scholars" value={metrics.totalScholars} sub="current active roster" iconName="users" />
        <MetricCard label="Avg Progress" value={`${metrics.avgProgress}%`} sub="training completion" iconName="chart-dots" />
        <MetricCard
          label="Doc Compliance"
          value={docsTracked ? `${metrics.docCompliancePct}%` : '—'}
          sub={docComplianceSubtext(docsTracked, criticalMissing, metrics.docTracked, metrics.docUntracked)}
          iconName="file-check"
          variant={docComplianceVariant(criticalMissing, criticalPending)}
        />
        <MetricCard
          label="Earliest Billing"
          value={metrics.earliestBillingDeadline || '—'}
          sub={earliestBillingSubtext(earliestBatch?.id, metrics.daysToEarliestBilling)}
          iconName="receipt"
          variant={billingUrgencyVariant(metrics.daysToEarliestBilling)}
        />
        <MetricCard
          label="Billing-Ready"
          value={billingReady.length}
          sub={billingReadySubtext(dashboardRole)}
          iconName="send"
          variant={billingReadyVariant(billingReady.length)}
        />
      </section>

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
          <div className="dash-program-grid">
            {['TWSP', 'CFSP'].map((program) => {
              const programBatches = batches.filter((batch) => batch.program === program);
              const scholars = programBatches.reduce((sum, batch) => sum + batch.scholars, 0);
              return (
                <div key={program} className="surface" style={{ padding: 14 }}>
                  <div className="t-label">{program}</div>
                  <div className="t-metric-value" style={{ marginTop: 8 }}>{programBatches.length}</div>
                  <div className="t-body">{programBatches.length === 1 ? 'batch' : 'batches'} · {scholars} scholars</div>
                </div>
              );
            })}
          </div>
          <div className="snap-line" style={{ marginTop: 12, gridTemplateColumns: '48px 1fr 42px' }}>
            <span className="snap-date">BAT-2</span>
            <span className="snap-bar">
              <span style={{ width: `${Math.min(100, metrics.avgProgress)}%` }} />
            </span>
            <span className="snap-meta">{metrics.avgProgress}%</span>
          </div>
        </DashboardPanel>

        <DashboardPanel title={SUMMARY_CARDS[2].title} icon={SUMMARY_CARDS[2].icon}>
          <LifecyclePanel earliestBatch={earliestBatch} />
        </DashboardPanel>
      </section>

      <section className="dash-panel" aria-labelledby="recent-activity-heading">
        <div className="dash-panel-head">
          <div id="recent-activity-heading" className="dash-panel-title">
            <Icon name="timeline" size={13} />
            Recent Activity
          </div>
          <Link href="/activity-log" className="dash-link">View all</Link>
        </div>
        <div className="dash-panel-body">
          {recentActivity.length === 0 ? (
            <p className="t-body">No recent activity yet.</p>
          ) : (
            <div className="activity">
              {recentActivity.map((event) => (
                <div key={event.id} className="activity-item">
                  <span className={`activity-dot ${event.tone}`} />
                  <div className="activity-body">
                    <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: '19px' }}>
                      <span className="who">{event.who}</span>
                      <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                        · {event.role}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)' }}> - {event.text}</span>
                    </div>
                    <div className="meta">{event.when}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

async function resolveDashboardRole(params: Awaited<SearchParams>): Promise<DashboardRole | 'trainer' | null> {
  const queryRole = firstParam(params.role);
  if (isDashboardRole(queryRole) || queryRole === 'trainer') return queryRole;

  const user = await getCurrentUser().catch(() => null);
  const metadataRole = typeof user?.publicMetadata?.role === 'string'
    ? user.publicMetadata.role.toLowerCase()
    : null;

  if (isDashboardRole(metadataRole) || metadataRole === 'trainer') return metadataRole;
  return null;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.toLowerCase() ?? null;
  return value?.toLowerCase() ?? null;
}

function isDashboardRole(role: string | null): role is DashboardRole {
  return role === 'admin' || role === 'coordinator' || role === 'viewer';
}

function StaleBadge({ isStale }: { isStale: boolean }) {
  if (!isStale) return null;
  return (
    <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-amber) 18%, var(--color-surface))', color: 'var(--color-amber-dk)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em' }}>
      STALE
    </span>
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

function SyncFailedCallout({ syncFailed, message }: { syncFailed: boolean; message: string }) {
  if (!syncFailed) return null;
  return (
    <InfoCallout variant="warning">
      Sync with Supabase failed — showing the last cached snapshot{message}.
      <Link href="/dashboard" className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
    </InfoCallout>
  );
}

function CriticalDocsCallout({ criticalMissing, batchCount }: { criticalMissing: number; batchCount: number }) {
  if (criticalMissing <= 0) return null;
  return (
    <InfoCallout variant="warning">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, minWidth: 240 }}>
          {criticalMissing} critical document missing across {batchCount} {pluralize(batchCount)}.
          {' '}Document audit is required before billing release.
        </span>
        <Link
          href="/documents"
          className="btn secondary sm"
          // `.btn.secondary` is gray by default; tinted amber here since
          // this button only ever sits inside the amber callout above.
          style={{ flexShrink: 0, color: 'var(--color-amber-dk)', borderColor: 'var(--color-amber-border)', background: 'var(--color-surface)' }}
        >
          Review docs
          <Icon name="arrow-narrow-right" size={14} />
        </Link>
      </div>
    </InfoCallout>
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
