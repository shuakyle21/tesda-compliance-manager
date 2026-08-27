/**
 * STEP 2 — Data Layer: Mock Data Facade
 *
 * Thin facade over the ported seed module (shared/mocks/seed.ts). Components import
 * from here so that when the real backend lands, only this file changes — the
 * seed enrichment logic and the component call sites stay put.
 *
 * `MOCK_BATCHES` is the active operational set (excludes completed cohorts, sorted
 * by urgency). `ALL_BATCHES` includes completed cohorts for the Report surface.
 */

import { BATCHES, ACTIVITY } from '@/shared/mocks/seed';
import type { Batch, ActivityEvent } from '@/shared/types';

export {
  TENANTS, USERS, DOCUMENT_REQUIREMENTS, ALERTS_LOG, SNAPSHOTS,
} from '@/shared/mocks/seed';

// EGACE_STAGES / EMPLOYMENT_STATUSES are NOT re-exported here (TES-74). They are
// fixed TESDA vocabulary, not mock data — import them from '@/shared/vocab'.
// Deliberately not shimmed: a pass-through here would preserve exactly the
// "is this real or mock?" ambiguity the move exists to remove.

// Domain logic extracted (TES-68): urgencyTier -> modules/batches/domain/urgency.ts;
// isBillingReady + BILLING_READY_THRESHOLD -> modules/billing/domain/readiness.ts.
// Extracted again (TES-94): getMockMetrics -> deriveDashboardMetrics in
// modules/batches/domain/metrics.ts — it was always fed live batches by the
// dashboard despite the name, and its document-compliance half now consults
// modules/documents/domain/compliance.ts, which shared/ may not import.
// shared/ must not re-export module code (import direction rule).

/** Every batch, including completed cohorts (Report scope). */
export const ALL_BATCHES: Batch[] = BATCHES;

/** Active operational batches — excludes completed cohorts, sorted most-urgent first. */
export const MOCK_BATCHES: Batch[] = BATCHES
  .filter((b) => b.status !== 'completed')
  .slice()
  .sort((a, b) => a.daysToBilling - b.daysToBilling);

export const MOCK_ACTIVITY: ActivityEvent[] = ACTIVITY;
