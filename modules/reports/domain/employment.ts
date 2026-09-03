/**
 * Post-training employment follow-up (FR-15) — pure domain logic, no I/O.
 *
 * Selects cohorts with employment follow-up data and their certified scholars,
 * then rolls up employment outcomes for the Report screen's Employment section.
 */

import type { Batch } from '@/shared/types';
import { EMPLOYMENT_STATUSES } from '@/shared/vocab';

type EmploymentStatuses = typeof EMPLOYMENT_STATUSES;
export type EmploymentScholar = { batch: Batch; s: NonNullable<Batch['scholars_list']>[number] };

/**
 * Filters batches to those with an employment follow-up record. In the mock
 * data, that record exists whenever the batch has at least one certified
 * scholar; `followUpDue` is metadata and does not restrict this selection.
 */
export function selectEmploymentCohorts(rows: Batch[]): Batch[] {
  return rows.filter((b) => b.employmentFollowUp);
}

/**
 * Selects certified (assessment-passed) scholars from the given cohorts.
 * Only scholars with "Competent" assessment result are included.
 */
export function selectCertifiedScholars(cohorts: Batch[]): EmploymentScholar[] {
  const empScholars: EmploymentScholar[] = [];
  cohorts.forEach((b) => {
    (b.scholars_list || []).forEach((s) => {
      if (s.assessmentResult === 'Competent') empScholars.push({ batch: b, s });
    });
  });
  return empScholars;
}

/**
 * Computes employment totals from a list of certified scholars. Rolls them up
 * into certified, employed (wage + self-employed), awaiting, and unemployed counts.
 */
export function computeEmploymentTotals(scholars: EmploymentScholar[], ES: EmploymentStatuses) {
  const empTotals = { certified: 0, employed: 0, awaiting: 0, unemployed: 0 };
  scholars.forEach((r) => {
    empTotals.certified++;
    if (r.s.employmentStatus === ES.wage || r.s.employmentStatus === ES.self) empTotals.employed++;
    else if (r.s.employmentStatus === ES.awaiting) empTotals.awaiting++;
    else if (r.s.employmentStatus === ES.unemployed) empTotals.unemployed++;
  });
  return empTotals;
}

/**
 * Calculates the employment rate as a percentage of certified scholars who are
 * employed. Returns 0 when there are no certified scholars.
 */
export function employmentRate(empTotals: { certified: number; employed: number }): number {
  return empTotals.certified ? Math.round((empTotals.employed / empTotals.certified) * 100) : 0;
}

/**
 * Returns the badge tone (color) for an employment status. Maps wage-employed
 * to green, self-employed to teal, awaiting to amber, unemployed to red, and
 * unknown statuses to neutral.
 */
export function empTone(status: string, ES: EmploymentStatuses): string {
  if (status === ES.wage) return 'green';
  if (status === ES.self) return 'teal';
  if (status === ES.awaiting) return 'amber';
  if (status === ES.unemployed) return 'red';
  return 'neutral';
}
