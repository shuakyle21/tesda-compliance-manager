/**
 * Alerts engine (FR-05) — pure domain logic, no I/O.
 *
 * Alerts are computed on read from `batches` (never a stored notification
 * log, per the repo's "alerts are computed on read" rule) so any screen
 * showing an alert count or breakdown can never drift out of sync with the
 * batches driving it. Originated in `AlertsPanel` (TES-93/TES-94); pulled
 * out here so `AnalyticsView`'s alerts-by-category chart can share the same
 * source of truth instead of a hand-maintained duplicate.
 */

import { isBillingReady } from '@/modules/billing/domain/readiness';
import { urgencyTier } from '@/modules/batches/domain/urgency';
import { criticalRequirements, summarizeBatchDocCompliance } from '@/modules/documents/domain/compliance';
import type { Batch, DocumentRequirement } from '@/shared/types';

export type AlertTone = 'green' | 'amber' | 'red';
export type AlertCategory = 'billing-ready' | 'bsrs-approved' | 'billing-critical' | 'doc-missing' | 'ntp-lag';
export type AlertRow = { text: string; tone: AlertTone; category: AlertCategory };

export const ALERT_CATEGORY_LABEL: Record<AlertCategory, string> = {
  'billing-ready': 'Billing ready',
  'bsrs-approved': 'BSRS approved',
  'billing-critical': 'Billing critical',
  'doc-missing': 'Doc missing',
  'ntp-lag': 'NTP lag',
};

export function batchAlerts(b: Batch, criticalDocs: DocumentRequirement[]): AlertRow[] {
  const rows: AlertRow[] = [];
  // isBillingReady() is the threshold-only prep signal (see readiness.ts) —
  // it does not check documents, so this row must not claim the batch is
  // actually ready to bill. billingGate() is the compound gate for that claim.
  if (isBillingReady(b)) {
    rows.push({ tone: 'green', category: 'billing-ready', text: `${b.id} reached the billing progress threshold.` });
  }
  if (b.bsrs) rows.push({ tone: 'green', category: 'bsrs-approved', text: `${b.id} BSRS approved — eligible for billing.` });
  // Same "billing stage already done" guard BatchTimeline uses to hide
  // completed cohorts — without it, a finished batch's now-negative
  // daysToBilling reads as a critical alert instead of disappearing.
  const billDone = b.lifecycle.find((s) => s.key === 'bill')?.status === 'done';
  if (!billDone && urgencyTier(b.daysToBilling) === 'critical') {
    rows.push({ tone: 'red', category: 'billing-critical', text: `${b.id} billing window opens in ${b.daysToBilling} days.` });
  }
  // Only flag missing critical docs once this batch actually tracks at least
  // one critical requirement — an untracked key (ADR-004) means "not synced
  // yet", not "missing" (see the docsTracked guard in page.tsx for the same
  // distinction). summarizeBatchDocCompliance() excludes untracked keys from
  // both `missing` and its denominator, so this can't fire on a batch whose
  // catalog just doesn't overlap the critical-doc keys.
  const docCompliance = summarizeBatchDocCompliance(b, criticalDocs);
  if (docCompliance.tracked > 0 && docCompliance.missing > 0) {
    rows.push({
      tone: 'amber',
      category: 'doc-missing',
      text: `${b.id} missing ${docCompliance.missing} critical document${docCompliance.missing > 1 ? 's' : ''}.`,
    });
  }
  if (b.ntpLag > 7) rows.push({ tone: 'red', category: 'ntp-lag', text: `${b.id} NTP-to-start lag exceeded 7 days.` });
  return rows;
}

/** Alert counts per category across all batches, for chart/summary views. */
export function alertCategoryCounts(
  batches: Batch[],
  documentRequirements: DocumentRequirement[],
): Record<AlertCategory, number> {
  const criticalDocs = criticalRequirements(documentRequirements);
  const counts: Record<AlertCategory, number> = {
    'billing-ready': 0,
    'bsrs-approved': 0,
    'billing-critical': 0,
    'doc-missing': 0,
    'ntp-lag': 0,
  };
  for (const b of batches) {
    for (const row of batchAlerts(b, criticalDocs)) counts[row.category]++;
  }
  return counts;
}
