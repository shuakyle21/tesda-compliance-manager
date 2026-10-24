/**
 * The one KPI row. The dashboard and the shell's metrics row both render this
 * over the same `deriveDashboardMetrics` summary, so a number can no longer
 * read one way on /dashboard and another on /batch-cards (audit B2).
 *
 * Each card is label · value · one verified status line, linked to the screen
 * that explains it. A metric with no source shows "—" and says what is missing;
 * it never shows a zero it cannot vouch for.
 */

import { MetricCard } from '@/shared/ui/MetricCard';
import { UrgencyIndicator } from '@/shared/ui/UrgencyIndicator';
import { formatDate } from '@/shared/dates';
import { pluralize } from '@/shared/text';
import { urgencyTier } from '@/modules/batches/domain/urgency';
import type { DashboardMetrics } from '@/shared/types';

type Variant = 'critical' | 'warning' | 'neutral';

export interface KpiLinks {
  batches: string;
  attention: string;
  documents: string;
}

export interface AttentionCounts {
  total: number;
  urgent: number;
}

function ActiveBatchesCard({ metrics, href }: { metrics: DashboardMetrics; href: string }) {
  const scholars = `${metrics.activeScholars} ${pluralize(metrics.activeScholars, 'scholar', 'scholars')} enrolled`;
  return (
    <MetricCard
      label="Active batches"
      value={metrics.activeBatches}
      sub={scholars}
      iconName="folders"
      href={href}
      ariaLabel={`Active batches: ${metrics.activeBatches}. ${scholars}.`}
    />
  );
}

function AttentionCard({ attention, href }: { attention: AttentionCounts; href: string }) {
  const variant: Variant = attention.urgent ? 'critical' : attention.total ? 'warning' : 'neutral';
  const sub = attention.urgent
    ? `${attention.urgent} overdue or blocked`
    : attention.total ? 'Coming due or needs a record' : 'No open items in recorded data';
  return (
    <MetricCard
      label="Needs attention"
      value={attention.total}
      sub={sub}
      iconName="alert-triangle"
      variant={variant}
      href={href}
      ariaLabel={`Needs attention: ${attention.total}. ${sub}.`}
    />
  );
}

function billingVariant(days: number): Variant {
  const tier = urgencyTier(days);
  if (tier === 'overdue' || tier === 'critical') return 'critical';
  return tier === 'warning' ? 'warning' : 'neutral';
}

function NextBillingCard({ metrics, href }: { metrics: DashboardMetrics; href: string }) {
  const next = metrics.nextBilling;
  if (!next) {
    const sub = metrics.openBillingObligations
      ? `Deadline not recorded for ${metrics.billingDeadlinesMissing} open ${pluralize(metrics.billingDeadlinesMissing)}`
      : 'No open billing work';
    return (
      <MetricCard label="Next billing due" value="—" sub={sub} iconName="receipt" href={href} ariaLabel={`Next billing due: none recorded. ${sub}.`} />
    );
  }
  const date = formatDate(next.deadline) ?? '—';
  return (
    <MetricCard
      label="Next billing due"
      value={date}
      sub={<><span>{next.batchId}</span><UrgencyIndicator days={next.daysToBilling} variant="badge" /></>}
      iconName="receipt"
      variant={billingVariant(next.daysToBilling)}
      href={href}
      ariaLabel={`Next billing due: ${date}, ${next.batchId}, ${next.daysToBilling < 0 ? `${-next.daysToBilling} days overdue` : `${next.daysToBilling} days left`}.`}
    />
  );
}

function documentStatus(metrics: DashboardMetrics): { sub: string; variant: Variant } {
  if (metrics.docCompliancePct === null) return { sub: 'Not yet tracked', variant: 'neutral' };
  if (metrics.docMissing) return { sub: `${metrics.docMissing} required missing`, variant: 'critical' };
  if (metrics.docPending) return { sub: `${metrics.docPending} awaiting review`, variant: 'warning' };
  return { sub: 'All required documents on file', variant: 'neutral' };
}

function DocumentsCard({ metrics, href }: { metrics: DashboardMetrics; href: string }) {
  const value = metrics.docCompliancePct === null ? '—' : `${metrics.docCompliancePct}%`;
  const { sub, variant } = documentStatus(metrics);
  return (
    <MetricCard
      label="Required documents"
      value={value}
      sub={sub}
      iconName="file-check"
      variant={variant}
      href={href}
      ariaLabel={`Required documents on file: ${value === '—' ? 'not tracked' : value}. ${sub}.`}
    />
  );
}

function ProgressCard({ metrics }: { metrics: DashboardMetrics }) {
  const value = metrics.sessionProgressPct === null ? '—' : `${metrics.sessionProgressPct}%`;
  const sub = metrics.sessionProgressPct === null
    ? 'Attendance not recorded yet'
    : `Sessions held · ${metrics.sessionTrackedBatches} of ${metrics.activeBatches} active ${pluralize(metrics.activeBatches)}`;
  return (
    <MetricCard
      label="Session progress"
      value={value}
      sub={sub}
      iconName="chart-dots"
      ariaLabel={`Session progress: ${value === '—' ? 'not tracked' : value}. ${sub}.`}
    />
  );
}

interface KpiSummaryProps {
  metrics: DashboardMetrics;
  links: KpiLinks;
  /** Dashboard only — the shell row has no queue to point at. */
  attention?: AttentionCounts;
  /** Trainer routes omit billing figures server-side (CLAUDE.md role rules). */
  hideBilling?: boolean;
}

export function KpiSummary({ metrics, links, attention, hideBilling = false }: KpiSummaryProps) {
  return (
    <section className="dash-kpi-grid" aria-label="Key metrics">
      <ActiveBatchesCard metrics={metrics} href={links.batches} />
      {attention && <AttentionCard attention={attention} href={links.attention} />}
      {!hideBilling && <NextBillingCard metrics={metrics} href={links.batches} />}
      <DocumentsCard metrics={metrics} href={links.documents} />
      <ProgressCard metrics={metrics} />
    </section>
  );
}
