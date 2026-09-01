/**
 * Unit tests for modules/reports/domain/ — the pure logic extracted out of
 * ReportView during the complexity refactor (RULES.md #35: module domain/
 * layers must be unit-tested).
 *
 * No I/O and no dates are involved here, so there is no as-of date to fix.
 * These are total functions over fixture batches and scholar rows.
 */
import { describe, it, expect } from 'vitest';
import { egaceVal, computeEgaceTotals, egaceRate } from '@/modules/reports/domain/egace';
import {
  selectEmploymentCohorts,
  selectCertifiedScholars,
  computeEmploymentTotals,
  employmentRate,
  empTone,
} from '@/modules/reports/domain/employment';
import { EGACE_STAGES, EMPLOYMENT_STATUSES as ES } from '@/shared/vocab';
import type { Batch, ScholarRow } from '@/shared/types';

function fixtureBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'BAT-1', tenantId: 'tenant-1', name: 'BAT-1',
    qualification: 'Agricultural Crops Production NC II', program: 'TWSP', ncLevel: 'NC II',
    trainer: 'Jane Dela Cruz', trainerId: 'trainer-1', scholars: 25,
    trainingDays: '', trainingDaySchedule: [], notes: '',
    trainingStart: 'Jan 1', trainingEnd: 'Jun 1, 2026',
    duration: 0, currentDay: 0, totalDays: 0, progressPct: 80, ntpLag: 0, tipDate: '',
    billingDeadline: 'Jun 1, 2026', daysToBilling: 10, bsrs: false,
    remark: '', status: 'ongoing', lifecycle: [], documents: {},
    ...overrides,
  };
}

function fixtureScholar(overrides: Partial<ScholarRow> = {}): ScholarRow {
  return {
    seq: 1, lastName: 'Dela Cruz', firstName: 'Juan', middleInit: 'P', extName: '',
    uli: 'ULI-0001', sex: 'M', dob: '1998-01-01', age: 28, civilStatus: 'Single',
    education: 'High School Graduate', nationality: 'Filipino', clientClass: 'Farmer',
    scholarshipType: 'TWSP', contact: '09170000000', email: 'juan@example.ph',
    trainingStatus: 'Graduated', dateStarted: 'Jan 1', dateFinished: 'Jun 1',
    dateAssessed: 'Jun 10', assessmentResult: 'Competent',
    empStatusBefore: ES.unemployed, employmentStatus: ES.wage,
    dateEmployed: 'Jul 1', occupation: 'Farm Technician', employer: 'Coop',
    empClassification: 'Regular', salary: '15000',
    ...overrides,
  };
}

const FULL_EGACE = { enrolled: 20, graduate: 18, assessed: 16, certified: 15, employed: 9 };

const FOLLOW_UP = {
  due: 'Jun 15, 2026', certified: 15, employed: 9, awaiting: 4, unemployed: 2, rate: 60, reported: 15,
};

describe('egaceVal', () => {
  it('reads a tracked stage count off the batch', () => {
    expect(egaceVal(fixtureBatch({ egace: FULL_EGACE }), 'certified')).toBe(15);
  });

  it('is 0 when the batch has no EGACE block at all', () => {
    expect(egaceVal(fixtureBatch(), 'certified')).toBe(0);
  });

  it('is 0 for a key the EGACE block does not track', () => {
    expect(egaceVal(fixtureBatch({ egace: FULL_EGACE }), 'not_a_stage')).toBe(0);
  });

  it('distinguishes a real zero from an untracked stage only by the batch, not the value', () => {
    // Both return 0. This is deliberate for the summary strip, but it means a
    // caller cannot tell "0 employed" from "employment not tracked" — the same
    // untracked/zero ambiguity flagged elsewhere in this codebase.
    const tracked = fixtureBatch({ egace: { ...FULL_EGACE, employed: 0 } });
    expect(egaceVal(tracked, 'employed')).toBe(0);
    expect(egaceVal(fixtureBatch(), 'employed')).toBe(0);
  });
});

describe('computeEgaceTotals', () => {
  it('sums every stage across the portfolio', () => {
    const rows = [
      fixtureBatch({ id: 'BAT-1', egace: FULL_EGACE }),
      fixtureBatch({ id: 'BAT-2', egace: { enrolled: 10, graduate: 9, assessed: 8, certified: 7, employed: 3 } }),
    ];
    expect(computeEgaceTotals(rows, EGACE_STAGES)).toEqual({
      enrolled: 30, graduate: 27, assessed: 24, certified: 22, employed: 12,
    });
  });

  it('returns a fully zeroed shape for an empty portfolio', () => {
    expect(computeEgaceTotals([], EGACE_STAGES)).toEqual({
      enrolled: 0, graduate: 0, assessed: 0, certified: 0, employed: 0,
    });
  });

  it('treats a batch with no EGACE block as zero rather than skipping it', () => {
    const rows = [fixtureBatch({ id: 'BAT-1', egace: FULL_EGACE }), fixtureBatch({ id: 'BAT-2' })];
    expect(computeEgaceTotals(rows, EGACE_STAGES)).toEqual(FULL_EGACE);
  });

  it('does not mutate the batches it sums', () => {
    const egace = { ...FULL_EGACE };
    computeEgaceTotals([fixtureBatch({ egace })], EGACE_STAGES);
    expect(egace).toEqual(FULL_EGACE);
  });
});

describe('egaceRate', () => {
  it('expresses a stage as a percentage of enrolled', () => {
    expect(egaceRate({ enrolled: 20, certified: 15 }, 15)).toBe(75);
  });

  it('rounds to the nearest whole percent', () => {
    expect(egaceRate({ enrolled: 3 }, 1)).toBe(33);
    expect(egaceRate({ enrolled: 3 }, 2)).toBe(67);
  });

  it('is 0 rather than NaN when nobody is enrolled', () => {
    // The guard that matters: without it the UI renders "NaN%" on an empty
    // portfolio, which in a compliance report reads as data corruption.
    expect(egaceRate({ enrolled: 0 }, 0)).toBe(0);
    expect(egaceRate({ enrolled: 0 }, 5)).toBe(0);
  });
});

describe('selectEmploymentCohorts', () => {
  it('keeps only batches with an open follow-up window', () => {
    const withWindow = fixtureBatch({ id: 'BAT-1', employmentFollowUp: FOLLOW_UP });
    const rows = [
      withWindow,
      fixtureBatch({ id: 'BAT-2' }),
      fixtureBatch({ id: 'BAT-3', employmentFollowUp: null }),
    ];
    expect(selectEmploymentCohorts(rows).map((b) => b.id)).toEqual(['BAT-1']);
  });

  it('is empty when no cohort is due', () => {
    expect(selectEmploymentCohorts([fixtureBatch()])).toEqual([]);
  });
});

describe('selectCertifiedScholars', () => {
  it('keeps only scholars who passed assessment', () => {
    const cohort = fixtureBatch({
      scholars_list: [
        fixtureScholar({ seq: 1, assessmentResult: 'Competent' }),
        fixtureScholar({ seq: 2, assessmentResult: 'Not Yet Competent' }),
        fixtureScholar({ seq: 3, assessmentResult: '' }),
      ],
    });
    expect(selectCertifiedScholars([cohort]).map((r) => r.s.seq)).toEqual([1]);
  });

  it('carries the owning batch alongside each scholar', () => {
    const cohort = fixtureBatch({ id: 'BAT-7', scholars_list: [fixtureScholar()] });
    expect(selectCertifiedScholars([cohort])[0].batch.id).toBe('BAT-7');
  });

  it('tolerates a cohort with no roster', () => {
    expect(selectCertifiedScholars([fixtureBatch()])).toEqual([]);
  });

  it('flattens across multiple cohorts', () => {
    const a = fixtureBatch({ id: 'A', scholars_list: [fixtureScholar({ seq: 1 })] });
    const b = fixtureBatch({ id: 'B', scholars_list: [fixtureScholar({ seq: 2 })] });
    expect(selectCertifiedScholars([a, b])).toHaveLength(2);
  });
});

describe('computeEmploymentTotals', () => {
  const rows = (...statuses: string[]) =>
    statuses.map((employmentStatus, i) => ({
      batch: fixtureBatch(),
      s: fixtureScholar({ seq: i + 1, employmentStatus }),
    }));

  it('counts wage-employed and self-employed together as employed', () => {
    expect(computeEmploymentTotals(rows(ES.wage, ES.self), ES)).toEqual({
      certified: 2, employed: 2, awaiting: 0, unemployed: 0,
    });
  });

  it('separates awaiting follow-up from unemployed', () => {
    expect(computeEmploymentTotals(rows(ES.awaiting, ES.unemployed), ES)).toEqual({
      certified: 2, employed: 0, awaiting: 1, unemployed: 1,
    });
  });

  it('counts an unrecorded status toward certified but no outcome bucket', () => {
    // The buckets deliberately do not sum to `certified`. A scholar whose
    // employment status was never captured is certified-but-unclassified, and
    // must not be silently counted as unemployed — that would overstate a
    // negative outcome in a TESDA report.
    const totals = computeEmploymentTotals(rows(ES.wage, ES.na), ES);
    expect(totals).toEqual({ certified: 2, employed: 1, awaiting: 0, unemployed: 0 });
    expect(totals.employed + totals.awaiting + totals.unemployed).toBeLessThan(totals.certified);
  });

  it('is all zeroes for an empty cohort', () => {
    expect(computeEmploymentTotals([], ES)).toEqual({
      certified: 0, employed: 0, awaiting: 0, unemployed: 0,
    });
  });
});

describe('employmentRate', () => {
  it('expresses employed as a percentage of certified', () => {
    expect(employmentRate({ certified: 20, employed: 15 })).toBe(75);
  });

  it('rounds to the nearest whole percent', () => {
    expect(employmentRate({ certified: 3, employed: 1 })).toBe(33);
  });

  it('is 0 rather than NaN when no one is certified', () => {
    expect(employmentRate({ certified: 0, employed: 0 })).toBe(0);
  });
});

describe('empTone', () => {
  it('maps each known status to its badge tone', () => {
    expect(empTone(ES.wage, ES)).toBe('green');
    expect(empTone(ES.self, ES)).toBe('teal');
    expect(empTone(ES.awaiting, ES)).toBe('amber');
    expect(empTone(ES.unemployed, ES)).toBe('red');
  });

  it('falls back to neutral for an unrecorded or unknown status', () => {
    // Neutral, not red: an absent status is not evidence of unemployment.
    expect(empTone(ES.na, ES)).toBe('neutral');
    expect(empTone('Something Else', ES)).toBe('neutral');
  });
});
