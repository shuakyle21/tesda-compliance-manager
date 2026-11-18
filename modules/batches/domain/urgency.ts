/**
 * Urgency engine (FR-05) — pure domain logic, no I/O.
 * Unit-tested with fixed as-of dates (`tests/unit/urgency.test.ts`).
 */

import { URGENCY_CRITICAL_DAYS, URGENCY_WARNING_DAYS } from '@/shared/urgency';
import type { Batch, UrgencyTier } from '@/shared/types';

export { URGENCY_CRITICAL_DAYS, URGENCY_WARNING_DAYS };

/**
 * Derive the urgency tier from days-to-billing. `Infinity` is the "no deadline
 * recorded" sentinel from the mapper and reads as `muted` — it must never be
 * styled as a deadline.
 */
export function urgencyTier(daysToBilling: number): UrgencyTier {
  if (!Number.isFinite(daysToBilling)) return 'muted';
  if (daysToBilling < 0) return 'overdue';
  if (daysToBilling <= URGENCY_CRITICAL_DAYS) return 'critical';
  if (daysToBilling <= URGENCY_WARNING_DAYS) return 'warning';
  return 'on-track';
}

/**
 * A batch still owes billing work: not completed, its billing report not yet
 * verified, and its billing stage not done. Deliberately **deadline-agnostic**
 * — an open obligation with no recorded deadline is still open; it is
 * {@link hasRecordedBillingDeadline} that decides whether it can be counted down.
 */
export function hasOpenBillingObligation(batch: Batch): boolean {
  const billingDone = batch.lifecycle.find((stage) => stage.key === 'bill')?.status === 'done';
  return batch.status !== 'completed' && !batch.bsrs && !billingDone;
}

/** True when the batch carries a recorded billing deadline that can be counted down. */
export function hasRecordedBillingDeadline(batch: Batch): boolean {
  return batch.billingDeadline !== null && Number.isFinite(batch.daysToBilling);
}
