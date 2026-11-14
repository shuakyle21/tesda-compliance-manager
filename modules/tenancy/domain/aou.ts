/**
 * The school's Affidavit of Undertaking (AOU) — ADR-009 AOU1, AOU2. Pure.
 *
 * One AOU per school per fiscal year, for every program. The fiscal year is
 * the government's (1 January to 31 December), so it is the calendar year of
 * the NTP receipt date. Every recorded AOU has its file (ADR-009 NTP8).
 */

/** Fiscal year of a yyyy-mm-dd date. A plain date has no time zone, so 31 December stays in its own year. */
export function fiscalYearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

/** True when the school already has an AOU for the receipt date's fiscal year. */
export function aouOnFile(yearsOnFile: readonly number[], receiptDate: string): boolean {
  return yearsOnFile.includes(fiscalYearOf(receiptDate));
}
