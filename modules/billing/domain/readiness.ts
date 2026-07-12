/**
 * Billing readiness (FR-09, ADR-001) — pure domain logic, no I/O.
 *
 * Two levels:
 *  - `isBillingReady` — the threshold-only *prep signal* the dashboard counts.
 *  - `billingGate`    — the ADR-001 §Ready *compound gate* the Billing screen
 *                       enforces before a document can be generated.
 */

import type { Batch } from '@/shared/types';

/** Threshold (training progress %) at which a batch is flagged billing-ready. */
export const BILLING_READY_THRESHOLD = 80;

/**
 * A batch is billing-ready once training progress crosses the threshold.
 *
 * NOTE: this is the *prep signal* used by the dashboard "Billing-Ready" metric
 * (app/(dashboard)/dashboard/page.tsx). It intentionally does NOT fold in
 * document verification — the compound release rule lives in {@link billingGate}
 * so the dashboard count and the screen's generate-gate can differ.
 */
export function isBillingReady(b: Batch): boolean {
  return b.status === 'ongoing' && b.progressPct >= BILLING_READY_THRESHOLD;
}

/**
 * Verified-document readiness for a batch's billing-supporting documents.
 * Computed by the caller (data/UI) from the document matrix and passed in, so
 * this module stays I/O-free.
 */
export interface DocReadiness {
  /** Verified required documents. */
  verified: number;
  /** Required documents total. */
  requiredTotal: number;
}

/**
 * The compound billing gate (ADR-001 §Ready): "billing-ready" = batch threshold
 * reached AND all of the tranche's supporting documents verified. Returns the
 * two component signals alongside the combined `ready` flag so the UI can show
 * each with its own text + icon (never color alone).
 */
export interface BillingGate {
  thresholdMet: boolean;
  progressPct: number;
  docsVerified: boolean;
  verifiedCount: number;
  requiredTotal: number;
  ready: boolean;
}

export function billingGate(b: Batch, docs: DocReadiness): BillingGate {
  const thresholdMet = isBillingReady(b);
  const docsVerified = docs.requiredTotal > 0 && docs.verified >= docs.requiredTotal;
  return {
    thresholdMet,
    progressPct: b.progressPct,
    docsVerified,
    verifiedCount: docs.verified,
    requiredTotal: docs.requiredTotal,
    ready: thresholdMet && docsVerified,
  };
}
