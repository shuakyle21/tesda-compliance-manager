/**
 * Billing rate reference (FR-09, ADR-001 §BB1) — pure constants, no I/O.
 *
 * ADR-001 pins version-safety to the *batch snapshot*, so this reference table
 * holds **current rates only** (no circular_no / effectivity_date). Only
 * billing-relevant components for the two MVP programs (TWSP + CFSP) live here.
 *
 * Per ADR-002 this prototype runs on mock data: the one value carried verbatim
 * from the source billing template ("BILLING - FULL TRAINING COST.docx") is
 * Agricultural Crops Production NC II → ₱15,390 per scholar. The other
 * per-qualification training costs are representative stand-ins until the real
 * `program_qualification_rates` table lands.
 */

/** TSF is released per attended day at this flat rate (ADR-001 §BB1, both programs). */
export const TSF_DAY_RATE = 160;

/** New Normal Assistance — CFSP only, one-time per scholar. */
export const NEW_NORMAL_ASSISTANCE = 1_000;

/** Accident Insurance — CFSP only, one-time per scholar. */
export const ACCIDENT_INSURANCE = 100.8;

/** Entrepreneurship Fee — CFSP only; ₱800 per scholar not flagged dual-trained. */
export const ENTREPRENEURSHIP_FEE = 800;

/** One TESDA session is 8 nominal hours (E2: total_sessions = nominal hours ÷ 8). */
export const NOMINAL_SESSION_HOURS = 8;

/**
 * Nominal program hours by qualification — drives TSF day count
 * (`days = nominalHours ÷ 8`). CFSP farm qualifications run 360 hrs (→ 45 days,
 * the ADR-001 §BB1 worked example: 45 × ₱160 = ₱7,200).
 */
export const NOMINAL_HOURS_BY_QUALIFICATION: Record<string, number> = {
  'Agri Crops Production NC I': 360,
  'Agri Crops Production NC II': 360,
  'Rice Machinery Operations NC II': 360,
  'Cookery NC II': 320,
};

/**
 * Full Training Cost per scholar, keyed by qualification (ADR-001: Training Cost
 * is billed per qualification). ₱15,390 is the verbatim source-docx value.
 */
export const TRAINING_COST_BY_QUALIFICATION: Record<string, number> = {
  'Agri Crops Production NC I': 15_390,
  'Agri Crops Production NC II': 15_390,
  'Rice Machinery Operations NC II': 16_800,
  'Cookery NC II': 18_500,
};

/**
 * Nominal training hours for a qualification, or `null` when it is not in the
 * reference table — never a guessed default.
 */
export function nominalHoursFor(qualification: string): number | null {
  return NOMINAL_HOURS_BY_QUALIFICATION[qualification] ?? null;
}

/**
 * Billable TSF days: nominal hours ÷ 8 (E2), or `null` for an unmapped
 * qualification. One TESDA session equals 8 nominal hours.
 */
export function tsfDaysFor(qualification: string): number | null {
  const hours = nominalHoursFor(qualification);
  return hours === null ? null : Math.round(hours / NOMINAL_SESSION_HOURS);
}

/**
 * TSF days for a batch: the batch's own snapshotted `total_sessions` (ADR-001 E2,
 * nominal hours ÷ 8 fixed at creation) when positive, else the qualification
 * table, else `null`.
 */
export function tsfDaysForBatch(batch: { totalSessions: number | null; qualification: string }): number | null {
  const own = batch.totalSessions;
  return own !== null && Number.isFinite(own) && own > 0 ? own : tsfDaysFor(batch.qualification);
}

/**
 * Per-scholar Training Cost for a qualification, or `null` when it is not in
 * the reference table — the caller must show "Rate unavailable", not a default.
 */
export function trainingCostFor(qualification: string): number | null {
  return TRAINING_COST_BY_QUALIFICATION[qualification] ?? null;
}

/** Training Cost is released in a split over this many training days (ADR-001 §BB1). */
export const TRAINING_COST_SPLIT_DAYS = 60;

/** Entrepreneurship is paid once, as a block of this many days (ADR-001 §BB1). */
export const ENTREPRENEURSHIP_BLOCK_DAYS = 3;

/** Peso amount for running text: whole amounts drop the decimals ("₱160"), others keep two ("₱100.80"). */
export function pesoLabel(n: number): string {
  const fixed = n.toLocaleString('en-PH', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  return `₱${fixed}`;
}

export const RATE_UNAVAILABLE = 'Rate unavailable for this qualification';

/** Shown instead of any scholar-dependent amount when the roster was never attached. */
export const ROSTER_NOT_LOADED = 'Scholar roster not loaded';
