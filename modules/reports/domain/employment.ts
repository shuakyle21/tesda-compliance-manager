/**
 * Post-training employment follow-up (FR-15) — pure domain logic, no I/O.
 *
 * Selects the cohorts due for follow-up and their certified scholars, then
 * rolls up employment outcomes for the Report screen's Employment section.
 */

import type { Batch } from '@/shared/types';
import { EMPLOYMENT_STATUSES } from '@/shared/vocab';

type EmploymentStatuses = typeof EMPLOYMENT_STATUSES;
export type EmploymentScholar = { batch: Batch; s: NonNullable<Batch['scholars_list']>[number] };

/** Batches with an employment follow-up window open. */
export function selectEmploymentCohorts(rows: Batch[]): Batch[] {
  return rows.filter((b) => b.employmentFollowUp);
}

/** Certified (assessment-passed) scholars across the given cohorts. */
export function selectCertifiedScholars(cohorts: Batch[]): EmploymentScholar[] {
  const empScholars: EmploymentScholar[] = [];
  cohorts.forEach((b) => {
    (b.scholars_list || []).forEach((s) => {
      if (s.assessmentResult === 'Competent') empScholars.push({ batch: b, s });
    });
  });
  return empScholars;
}

/** Rolls up certified scholars into employed / awaiting / unemployed counts. */
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

/** Employed count as a percentage of certified scholars. */
export function employmentRate(empTotals: { certified: number; employed: number }): number {
  return empTotals.certified ? Math.round((empTotals.employed / empTotals.certified) * 100) : 0;
}

/** Badge tone for an employment status. */
export function empTone(status: string, ES: EmploymentStatuses): string {
  if (status === ES.wage) return 'green';
  if (status === ES.self) return 'teal';
  if (status === ES.awaiting) return 'amber';
  if (status === ES.unemployed) return 'red';
  return 'neutral';
}
