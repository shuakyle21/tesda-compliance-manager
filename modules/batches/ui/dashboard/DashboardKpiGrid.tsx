/**
 * The six-card dashboard KPI row.
 *
 * The per-card subtext and severity-variant rules travel with the grid rather
 * than living in the route: each is a small named derivation over already
 * computed metrics, and keeping them beside their only caller is what stops
 * `app/` accumulating presentation rules (CLAUDE.md — `app/` is thin routes).
 */

import { MetricCard } from '@/shared/ui/MetricCard';
import type { DashboardMetrics, UserRole } from '@/shared/types';

type Variant = 'critical' | 'warning' | 'neutral';

function docComplianceVariant(criticalMissing: number, criticalPending: number): Variant {
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

function billingUrgencyVariant(daysToEarliestBilling: number): Variant {
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

function billingReadySubtext(role: UserRole): string {
  return role === 'viewer' ? 'read-only visibility' : 'billing prep queue';
}

function billingReadyVariant(billingReadyCount: number): 'warning' | 'neutral' {
  return billingReadyCount ? 'warning' : 'neutral';
}

interface DashboardKpiGridProps {
  metrics: DashboardMetrics;
  role: UserRole;
  billingReadyCount: number;
  earliestBatchId: string | undefined;
}

export function DashboardKpiGrid({
  metrics,
  role,
  billingReadyCount,
  earliestBatchId,
}: DashboardKpiGridProps) {
  const criticalMissing = metrics.docMissing;
  const criticalPending = metrics.docPending;
  // ADR-004: a null percentage means *nothing* is tracked — unknown, not 0%
  // and not 100%.
  const docsTracked = metrics.docCompliancePct !== null;

  return (
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
        sub={earliestBillingSubtext(earliestBatchId, metrics.daysToEarliestBilling)}
        iconName="receipt"
        variant={billingUrgencyVariant(metrics.daysToEarliestBilling)}
      />
      <MetricCard
        label="Billing-Ready"
        value={billingReadyCount}
        sub={billingReadySubtext(role)}
        iconName="send"
        variant={billingReadyVariant(billingReadyCount)}
      />
    </section>
  );
}
