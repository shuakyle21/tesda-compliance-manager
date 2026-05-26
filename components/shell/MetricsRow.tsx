/**
 * STEP 7b — Shell Component: MetricsRow
 *
 * WHY THIS COMPONENT EXISTS:
 * The MetricsRow renders 5 equal-width metric cards across the top of the
 * dashboard, below the Topbar. It summarizes the entire batch pipeline at a
 * glance: total batches, total scholars, average progress, active batches,
 * and the earliest billing deadline.
 *
 * SERVER vs CLIENT: Server Component. It receives data as props from the
 * DashboardLayout (which calls getMockMetrics). No interactivity needed.
 *
 * SPEC RULES:
 *   - 5 equal columns, full-width, no scroll
 *   - Metric values use t-metric-value class → IBM Plex Mono, 24px, semibold
 *   - Labels use t-metric-label class → uppercase, muted, 11px
 *   - Billing deadline value turns red if < 7 days (use inline style or
 *     conditional class: text-[var(--color-red)])
 *   - No card borders between metrics — just vertical dividers (1px border-r)
 *
 * REFERENCE: See ui_kits/admin/MetricCard.jsx for the existing implementation.
 * Port it here rather than rewriting from scratch.
 */

import type { DashboardMetrics } from '@/lib/data/types';

interface MetricsRowProps {
  metrics: DashboardMetrics;
}

// TODO 7b-1: Build each MetricCard as a local sub-component (not exported).
// LEARN Ch 7 — Fetching Data (cards pattern): https://nextjs.org/learn/dashboard-app/fetching-data
//
// A MetricCard has:
//   - An optional icon (Tabler icon, 13px, left of label)
//   - A label (t-metric-label)
//   - A value (t-metric-value)
//   - An optional sub-label (t-body, muted)
//
// TIP: Make a simple `MetricCard` interface:
//   { label: string; value: string | number; subLabel?: string; urgent?: boolean }
// Then map over an array of 5 config objects in MetricsRow.

export function MetricsRow({ metrics }: MetricsRowProps) {
  // TODO 7b-2: Replace this placeholder with real metric cards.
  //
  // The 5 cards (from the spec sample copy):
  //   1. TOTAL BATCHES    | value: metrics.totalBatches   | sub: "2026 cycle"
  //   2. TOTAL SCHOLARS   | value: metrics.totalScholars  | sub: "across all batches"
  //   3. AVG PROGRESS     | value: `${metrics.avgProgress}%` | sub: "training days"
  //   4. ACTIVE BATCHES   | value: metrics.activeBatches  | sub: "all training ongoing"
  //   5. EARLIEST BILLING | value: metrics.earliestBillingDeadline | urgent if < 7 days
  return (
    <div className="grid grid-cols-5 divide-x divide-[var(--color-border)] py-4 px-6">
      {/* TODO 7b-2: map over metric config array and render MetricCard */}
      <div className="px-4 first:pl-0">
        <p className="t-metric-label">TOTAL BATCHES</p>
        <p className="t-metric-value">—</p>
      </div>
    </div>
  );
}
