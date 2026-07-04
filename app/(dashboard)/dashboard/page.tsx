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
import { InfoCallout } from '@/components/ui/InfoCallout';
import { Icon, type IconName } from '@/components/ui/Icon';
import { MetricCard } from '@/components/ui/MetricCard';
import { EgaceOutcomes } from '@/components/dashboard/EgaceOutcomes';
import { DocumentStatusDonut } from '@/components/dashboard/DocumentStatusDonut';
import { ProgressTrend } from '@/components/dashboard/ProgressTrend';
import { BatchTimeline } from '@/components/dashboard/BatchTimeline';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  MOCK_ACTIVITY,
  MOCK_BATCHES,
  getMockMetrics,
  isBillingReady,
} from '@/lib/data/mock-batches';
import { getBatchesSnapshot } from '@/lib/data/batches';
import { getCurrentUser } from '@/lib/auth';
import type { UserRole } from '@/lib/data/types';

type DashboardRole = Extract<UserRole, 'admin' | 'coordinator' | 'viewer'>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ROLE_COPY: Record<DashboardRole, {
  name: string;
  roleLabel: string;
  subtitle: string;
  permissionNote: string;
  figmaNode: string;
}> = {
  coordinator: {
    name: 'Karina',
    roleLabel: 'Coordinator',
    subtitle: 'Monitor assigned schools, urgent billing windows, and document readiness.',
    permissionNote: 'Coordinator actions enabled for assigned tenants.',
    figmaNode: '522:2367',
  },
  admin: {
    name: 'Rodel',
    roleLabel: 'Admin',
    subtitle: 'School-level oversight for operational readiness and compliance blockers.',
    permissionNote: 'Admin controls available for the active school.',
    figmaNode: '382:3',
  },
  viewer: {
    name: 'Rosa',
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
  // Attempt the real Supabase fetch. `ok` → live rows (already RLS-scoped, so no
  // manual tenant filter). `sync-failed`/`unconfigured` → fall back to the mock
  // snapshot, applying the role filter the database would otherwise enforce.
  const snapshot = await getBatchesSnapshot();
  const mockScoped = dashboardRole === 'viewer'
    ? MOCK_BATCHES
    : MOCK_BATCHES.filter((batch) => dashboardRole === 'coordinator' || batch.tenantId === 'tnt_j3ed');
  const batches = snapshot.status === 'ok' ? snapshot.batches : mockScoped;
  const metrics = getMockMetrics(batches);
  const criticalMissing = metrics.docMissing;
  const criticalPending = metrics.docPending;
  // Live rows carry no document records until the documents join lands
  // (TODO(join) in lib/data/batches.ts), and getMockMetrics counts absent
  // records as verified — so an untracked set would read as 100% compliant.
  // Distinguish "no document data yet" from "all docs verified".
  const docsTracked = batches.some((b) => Object.keys(b.documents).length > 0);
  const billingReady = batches.filter(isBillingReady);
  const earliestBatch = batches.slice().sort((a, b) => a.daysToBilling - b.daysToBilling)[0];

  // ---- Dashboard states (TES-8 AC6) ----
  // `?state=` remains a manual preview override for every state. Beyond that:
  //   - sync-failed: real Supabase fetch failure (configured-but-errored).
  //   - stale:       real data freshness from the freshest row's `updated_at`.
  //   - denied:      still preview-only — derives from the tenant/role resolver,
  //                  which does not exist yet (blocked by TES-34 / #32).
  const forcedState = firstParam(params.state);

  const dataAsOfDate = snapshot.status === 'ok' && snapshot.dataAsOf
    ? new Date(snapshot.dataAsOf)
    : null;
  // A real stamp when we have live data; null on the cached/mock path so copy
  // can fall back gracefully instead of printing a fake precise timestamp.
  const dataAsOfLabel = dataAsOfDate ? formatDataStamp(dataAsOfDate) : null;

  const isDenied = forcedState === 'denied'; // TODO(#32): wire to real role resolver
  const isEmpty = forcedState === 'empty' || batches.length === 0;
  const syncFailed = forcedState === 'sync-failed' || snapshot.status === 'sync-failed';
  const isStale = forcedState === 'stale' || isDataStale(dataAsOfDate);

  const header = (
    <div className="page-head">
      <h1>Dashboard</h1>
      <span className="subline">
        {roleCopy.roleLabel} workspace · {metrics.activeBatches} active {metrics.activeBatches === 1 ? 'batch' : 'batches'}
        {' · '}Data as of {dataAsOfLabel ?? DATA_AS_OF_FALLBACK}
        {isStale && (
          <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-amber) 18%, var(--color-surface))', color: 'var(--color-amber-dk)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em' }}>
            STALE
          </span>
        )}
      </span>
    </div>
  );

  // Permission denied — full-page guard state.
  if (isDenied) {
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

  // Empty — no assigned batches; surface the next administrative action.
  if (isEmpty) {
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

  return (
    <div className="dashboard-view">
      {header}

      {syncFailed && (
        <InfoCallout variant="warning">
          Sync with Supabase failed — showing the last cached snapshot{dataAsOfLabel ? ` from ${dataAsOfLabel}` : ''}.
          <Link href="/dashboard" className="dash-link" style={{ marginLeft: 10 }}>Retry</Link>
        </InfoCallout>
      )}

      {criticalMissing > 0 && (
        <InfoCallout variant="error">
          {criticalMissing} critical document missing across {batches.length} {batches.length === 1 ? 'batch' : 'batches'}.
          {' '}Document audit is required before billing release.
          <Link href="/documents" className="dash-link" style={{ marginLeft: 10 }}>
            Review docs
          </Link>
        </InfoCallout>
      )}

      <section className="dash-greeting" aria-labelledby="dashboard-role-heading">
        <div>
          <div id="dashboard-role-heading" className="dash-greeting-title">
            Good day, {roleCopy.name}
            <span className={`dash-greeting-role role-tag ${dashboardRole}`}>
              {roleCopy.roleLabel}
            </span>
          </div>
          <div className="dash-greeting-sub">{roleCopy.subtitle}</div>
        </div>
        <div className="perm-note">
          <Icon name={dashboardRole === 'viewer' ? 'shield-off' : 'shield-check'} size={13} />
          {roleCopy.permissionNote}
        </div>
      </section>

      <section className="dash-kpi-grid" aria-label="Dashboard key metrics">
        <MetricCard label="Active Batches" value={metrics.activeBatches} sub="tenant-scoped" iconName="folders" />
        <MetricCard label="Total Scholars" value={metrics.totalScholars} sub="current active roster" iconName="users" />
        <MetricCard label="Avg Progress" value={`${metrics.avgProgress}%`} sub="training completion" iconName="chart-dots" />
        <MetricCard
          label="Doc Compliance"
          value={docsTracked ? `${metrics.docCompliancePct}%` : '—'}
          sub={!docsTracked
            ? 'document sync pending'
            : criticalMissing ? `${criticalMissing} critical missing` : 'All critical docs verified'}
          iconName="file-check"
          variant={criticalMissing ? 'critical' : criticalPending ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Earliest Billing"
          value={metrics.earliestBillingDeadline || '—'}
          sub={!earliestBatch
            ? 'No batches'
            // Infinity is the "no known deadline" sentinel from daysUntil();
            // sound for sorting/urgency, but never printable copy.
            : Number.isFinite(metrics.daysToEarliestBilling)
              ? `${earliestBatch.id} · ${metrics.daysToEarliestBilling} days left`
              : `${earliestBatch.id} · no deadline set`}
          iconName="receipt"
          variant={metrics.daysToEarliestBilling <= 6 ? 'critical' : metrics.daysToEarliestBilling <= 21 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Billing-Ready"
          value={billingReady.length}
          sub={dashboardRole === 'viewer' ? 'read-only visibility' : 'billing prep queue'}
          iconName="send"
          variant={billingReady.length ? 'warning' : 'neutral'}
        />
      </section>

      <section
        className="dash-charts-row"
        aria-label="Document status and progress trend"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(0, 2fr)', gap: 16 }}
      >
        <DocumentStatusDonut batches={batches} />
        <ProgressTrend />
      </section>

      <EgaceOutcomes batches={batches} />

      <BatchTimeline batches={batches} />

      <section className="dash-main-grid" aria-label="Dashboard summaries">
        <AlertsPanel />

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
          {earliestBatch ? (
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
          ) : (
            <p className="t-body">No active lifecycle data.</p>
          )}
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
          <div className="activity">
            {MOCK_ACTIVITY.slice(0, 6).map((event) => (
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
