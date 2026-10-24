/**
 * Session progress (ADR-001 B2) — pure domain logic, no I/O.
 *
 * Progress is `sessions held / total sessions`: attendance-derived, never the
 * hand-typed `progress_percent`. When either half has no source the answer is
 * `null` — "not recorded" — and every surface says so instead of printing
 * "Day 0 of 0" (audit A2).
 */

import type { Batch } from '@/shared/types';

export interface SessionProgress {
  held: number;
  total: number;
  /** 0–100, capped: a recording error must not draw a bar past full. */
  pct: number;
}

export function sessionProgress(batch: Batch): SessionProgress | null {
  if (batch.completedSessions === null || !batch.totalSessions) return null;
  const held = batch.completedSessions;
  const total = batch.totalSessions;
  return { held, total, pct: Math.min(100, Math.round((held / total) * 100)) };
}

/** "12 of 45 sessions held", or the unavailable state. */
export function describeSessionProgress(batch: Batch): string {
  const progress = sessionProgress(batch);
  return progress ? `${progress.held} of ${progress.total} sessions held` : 'Sessions not recorded';
}
