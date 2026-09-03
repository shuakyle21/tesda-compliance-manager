/**
 * EGACE funnel totals (FR-15) — pure domain logic, no I/O.
 *
 * Enrolled · Graduate · Assessed · Certified · Employed, summed across a
 * portfolio of batches for the Report screen's summary strip and table footer.
 */

import type { Batch, EgaceCounts, EgaceStage } from '@/shared/types';

/**
 * Reads one EGACE stage count from a batch, defaulting to 0 when the batch does
 * not track EGACE data or the specific key is absent.
 */
export function egaceVal(b: Batch, key: string): number {
  return b.egace ? b.egace[key as keyof EgaceCounts] ?? 0 : 0;
}

/**
 * Sums each EGACE stage count (enrolled, graduate, assessed, certified, employed)
 * across every batch in the portfolio.
 */
export function computeEgaceTotals(rows: Batch[], stages: EgaceStage[]): Record<string, number> {
  const totals: Record<string, number> = { enrolled: 0, graduate: 0, assessed: 0, certified: 0, employed: 0 };
  rows.forEach((b) => stages.forEach((s) => (totals[s.key] += egaceVal(b, s.key))));
  return totals;
}

/**
 * Calculates a stage's value as a percentage of the enrolled total. Returns 0
 * when there are no enrolled scholars.
 */
export function egaceRate(totals: Record<string, number>, v: number): number {
  return totals.enrolled ? Math.round((v / totals.enrolled) * 100) : 0;
}
