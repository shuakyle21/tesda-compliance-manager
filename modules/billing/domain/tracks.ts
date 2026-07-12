/**
 * Billing tracks (FR-09, ADR-001 §TVI-scope) — pure, no I/O.
 *
 * The TVI bills three document types: ① Training Cost, ② TSF/Allowance,
 * ③ Entrepreneurship. The Assessment Center bills the Assessment Fee separately,
 * so it is NOT a track here. Entrepreneurship is CFSP-only (TWSP routes it via
 * PAFSE, out of scope) — so the applicable track set is program-aware.
 */

export type BillingTrackId = 'training_cost' | 'tsf_allowance' | 'entrepreneurship';

export interface BillingTrack {
  id: BillingTrackId;
  /** Sentence-case chip/tab label. */
  label: string;
  /** Short mono caption describing the release schedule (portrayal, not math). */
  basis: string;
  /** Statement cover heading, letter-spaced uppercase in the preview. */
  docTitle: string;
}

const TRAINING_COST: BillingTrack = {
  id: 'training_cost',
  label: 'Training Cost',
  basis: '60 training-day split',
  docTitle: 'Full Training Cost',
};

const TSF_ALLOWANCE: BillingTrack = {
  id: 'tsf_allowance',
  label: 'TSF / Allowance',
  basis: 'calendar-duration split · nets ₱160/absence',
  docTitle: 'TSF & New Normal Allowance',
};

const ENTREPRENEURSHIP: BillingTrack = {
  id: 'entrepreneurship',
  label: 'Entrepreneurship',
  basis: 'single payment · 3-day block',
  docTitle: 'Entrepreneurship Fee',
};

const BY_ID: Record<BillingTrackId, BillingTrack> = {
  training_cost: TRAINING_COST,
  tsf_allowance: TSF_ALLOWANCE,
  entrepreneurship: ENTREPRENEURSHIP,
};

/** Look up one track definition by id. */
export function trackById(id: BillingTrackId): BillingTrack {
  return BY_ID[id];
}

/** True when the program is CFSP (case-insensitive) — gates Entrepreneurship. */
export function isCfsp(program: string): boolean {
  return program.trim().toUpperCase() === 'CFSP';
}

/**
 * The billing tracks that apply to a program. Training Cost + TSF/Allowance
 * always; Entrepreneurship only for CFSP.
 */
export function tracksForProgram(program: string): BillingTrack[] {
  const tracks = [TRAINING_COST, TSF_ALLOWANCE];
  if (isCfsp(program)) tracks.push(ENTREPRENEURSHIP);
  return tracks;
}
