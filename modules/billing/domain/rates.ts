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

/** Fallback nominal hours for an unmapped qualification. */
export const DEFAULT_NOMINAL_HOURS = 360;

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

/** Fallback per-scholar Training Cost for an unmapped qualification. */
export const DEFAULT_TRAINING_COST = 15_000;

/** Nominal training hours for a qualification (mapped, else the default). */
export function nominalHoursFor(qualification: string): number {
  return NOMINAL_HOURS_BY_QUALIFICATION[qualification] ?? DEFAULT_NOMINAL_HOURS;
}

/** Billable TSF days = nominal hours ÷ 8 (E2). */
export function tsfDaysFor(qualification: string): number {
  return Math.round(nominalHoursFor(qualification) / NOMINAL_SESSION_HOURS);
}

/** Per-scholar Training Cost for a qualification (mapped, else the default). */
export function trainingCostFor(qualification: string): number {
  return TRAINING_COST_BY_QUALIFICATION[qualification] ?? DEFAULT_TRAINING_COST;
}
