/**
 * Urgency engine (FR-05) — pure domain logic, no I/O.
 * Unit-test with fixed as-of dates once the test runner lands (Phase 0.4).
 */

import type { UrgencyTier } from '@/shared/types';

/** Derive the urgency tier from days-to-billing. Drives the card left-border. */
export function urgencyTier(daysToBilling: number): UrgencyTier {
  if (daysToBilling <= 6) return 'critical';
  if (daysToBilling <= 21) return 'warning';
  return 'on-track';
}
