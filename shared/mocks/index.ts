/**
 * STEP 2 — Data Layer: Mock Data Facade
 *
 * Thin facade over the ported seed module (lib/data/seed.ts). Components import
 * from here so that when the real backend lands, only this file changes — the
 * seed enrichment logic and the component call sites stay put.
 *
 * `MOCK_BATCHES` is the active operational set (excludes completed cohorts, sorted
 * by urgency). `ALL_BATCHES` includes completed cohorts for the Report surface.
 */

import { BATCHES, ACTIVITY, DOCUMENT_REQUIREMENTS } from '@/shared/mocks/seed';
import type { Batch, ActivityEvent, DashboardMetrics, UrgencyTier } from '@/shared/types';

export {
  TENANTS, USERS, DOCUMENT_REQUIREMENTS, ALERTS_LOG, SNAPSHOTS,
  EGACE_STAGES, EMPLOYMENT_STATUSES,
} from '@/shared/mocks/seed';

/** Threshold (training progress %) at which a batch is flagged billing-ready. */
export const BILLING_READY_THRESHOLD = 80;

/** Derive the urgency tier from days-to-billing. Drives the card left-border. */
export function urgencyTier(daysToBilling: number): UrgencyTier {
  if (daysToBilling <= 6) return 'critical';
  if (daysToBilling <= 21) return 'warning';
  return 'on-track';
}

/** A batch is billing-ready once training progress crosses the threshold. */
export function isBillingReady(b: Batch): boolean {
  return b.status === 'ongoing' && b.progressPct >= BILLING_READY_THRESHOLD;
}

/** Every batch, including completed cohorts (Report scope). */
export const ALL_BATCHES: Batch[] = BATCHES;

/** Active operational batches — excludes completed cohorts, sorted most-urgent first. */
export const MOCK_BATCHES: Batch[] = BATCHES
  .filter((b) => b.status !== 'completed')
  .slice()
  .sort((a, b) => a.daysToBilling - b.daysToBilling);

export const MOCK_ACTIVITY: ActivityEvent[] = ACTIVITY;

/**
 * Derive the 5-card dashboard metrics from the active batch set. Computed, never
 * hardcoded, so the numbers can never drift from the underlying records.
 */
export function getMockMetrics(batches: Batch[] = MOCK_BATCHES): DashboardMetrics {
  const totalBatches = batches.length;
  const totalScholars = batches.reduce((s, b) => s + b.scholars, 0);
  const avgProgress = totalBatches
    ? Math.round(batches.reduce((s, b) => s + b.progressPct, 0) / totalBatches)
    : 0;
  const activeBatches = batches.filter((b) => b.status === 'ongoing').length;

  const earliest = totalBatches
    ? batches.slice().sort((a, b) => a.daysToBilling - b.daysToBilling)[0]
    : null;

  // Critical-document compliance summary
  const critReqs = DOCUMENT_REQUIREMENTS.filter((r) => r.critical);
  let missing = 0;
  let pending = 0;
  batches.forEach((b) => {
    critReqs.forEach((r) => {
      const st = b.documents[r.key]?.status;
      if (st === 'missing') missing++;
      if (st === 'pending') pending++;
    });
  });
  const critTotal = critReqs.length * totalBatches;
  const verified = critTotal - missing - pending;
  const docCompliancePct = critTotal ? Math.round((verified / critTotal) * 100) : 0;

  return {
    totalBatches,
    totalScholars,
    avgProgress,
    earliestBillingDeadline: earliest ? earliest.billingDeadline.replace(/, \d+$/, '') : '—',
    daysToEarliestBilling: earliest ? earliest.daysToBilling : 0,
    activeBatches,
    docCompliancePct,
    docMissing: missing,
    docPending: pending,
  };
}
