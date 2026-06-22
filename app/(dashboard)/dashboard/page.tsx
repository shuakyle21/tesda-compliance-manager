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
import {
  DOCUMENT_REQUIREMENTS,
  MOCK_ACTIVITY,
  MOCK_BATCHES,
  getMockMetrics,
  isBillingReady,
} from '@/lib/data/mock-batches';
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
  const batches = dashboardRole === 'viewer'
    ? MOCK_BATCHES
    : MOCK_BATCHES.filter((batch) => dashboardRole === 'coordinator' || batch.tenantId === 'tnt_j3ed');
  const metrics = getMockMetrics(batches);
  const criticalRequirements = DOCUMENT_REQUIREMENTS.filter((requirement) => requirement.critical);
  const criticalTotal = Math.max(1, criticalRequirements.length * Math.max(1, batches.length));
  const criticalMissing = metrics.docMissing;
  const criticalPending = metrics.docPending;
  const criticalVerified = Math.max(0, criticalTotal - criticalMissing - criticalPending);
  const billingReady = batches.filter(isBillingReady);
  const earliestBatch = batches.slice().sort((a, b) => a.daysToBilling - b.daysToBilling)[0];

  return (
    <div className="dashboard-view">
      <div className="page-head">
        <h1>Dashboard</h1>
        <span className="subline">
          {roleCopy.roleLabel} workspace · {metrics.activeBatches} active {metrics.activeBatches === 1 ? 'batch' : 'batches'} · as of today 14:02
        </span>
      </div>

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
            Good afternoon, {roleCopy.name}
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
          label="Doc Readiness"
          value={`${metrics.docCompliancePct}%`}
          sub={criticalMissing ? `${criticalMissing} critical missing` : 'All critical docs verified'}
          iconName="file-check"
          variant={criticalMissing ? 'critical' : criticalPending ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Earliest Billing"
          value={metrics.earliestBillingDeadline}
          sub={earliestBatch ? `${earliestBatch.id} · ${metrics.daysToEarliestBilling} days left` : 'No batches'}
          iconName="receipt"
          variant={metrics.daysToEarliestBilling <= 6 ? 'critical' : metrics.daysToEarliestBilling <= 21 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Ready Signals"
          value={billingReady.length}
          sub={dashboardRole === 'viewer' ? 'read-only visibility' : 'billing prep queue'}
          iconName="send"
          variant={billingReady.length ? 'warning' : 'neutral'}
        />
      </section>

      <section className="dash-main-grid" aria-label="Dashboard summaries">
        <DashboardPanel title={SUMMARY_CARDS[0].title} icon={SUMMARY_CARDS[0].icon} meta={SUMMARY_CARDS[0].meta}>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { label: 'Verified', value: criticalVerified, color: 'var(--color-green)' },
              { label: 'Pending', value: criticalPending, color: 'var(--color-amber)' },
              { label: 'Missing', value: criticalMissing, color: 'var(--color-red)' },
            ].map((item) => (
              <div key={item.label} className="snap-line" style={{ gridTemplateColumns: '70px 1fr 36px' }}>
                <span className="snap-date">{item.label}</span>
                <span className="snap-bar">
                  <span style={{ width: `${Math.round((item.value / criticalTotal) * 100)}%`, background: item.color }} />
                </span>
                <span className="snap-meta">{item.value}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>

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
