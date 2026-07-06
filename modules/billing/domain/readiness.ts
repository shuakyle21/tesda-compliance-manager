/**
 * Billing readiness (FR-09, ADR-001) — pure domain logic, no I/O.
 * Readiness is a preparation signal; the billing document engine itself is
 * planned here per ADR-001 (see modules/billing/README.md).
 */

import type { Batch } from '@/shared/types';

/** Threshold (training progress %) at which a batch is flagged billing-ready. */
export const BILLING_READY_THRESHOLD = 80;

/** A batch is billing-ready once training progress crosses the threshold. */
export function isBillingReady(b: Batch): boolean {
  return b.status === 'ongoing' && b.progressPct >= BILLING_READY_THRESHOLD;
}
