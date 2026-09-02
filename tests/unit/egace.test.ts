import { describe, it, expect } from 'vitest';
import {
  egaceVal,
  egaceTotals,
  egaceRate,
  employmentRoster,
  employmentTotals,
  employmentRate,
  employmentTone,
} from '@/modules/reports/domain/egace';
import { EMPLOYMENT_STATUSES } from '@/shared/vocab';
import type { Batch, ScholarRow } from '@/shared/types';

const EGACE = { enrolled: 15, graduate: 10, assessed: 8, certified: 6, employed: 3 };

function fixtureScholar(overrides: Partial<ScholarRow> = {}): ScholarRow {
  return {
    seq: 1,
    lastName: 'Dela Cruz',
    firstName: 'Juan',
    middleInit: 'M',
    extName: '',
    uli: 'ULI-0001',
    sex: 'Male',
    dob: '2001-05-14',
    age: 25,
    civilStatus: 'Single',
    education: 'High School',
    nationality: 'Filipino',
    clientClass: 'Out-of-School Youth',
    scholarshipType: 'TWSP',
    contact: '0917-000-0000',
    email: 'juan@example.com',
    trainingStatus: 'Ongoing',
    dateStarted: 'Apr 21, 2026',
    dateFinished: 'Jun 8, 2026',
    dateAssessed: 'Jun 10, 2026',
    assessmentResult: 'Competent',
    empStatusBefore: 'Unemployed',
    employmentStatus: 'Wage-Employed',
    dateEmployed: 'Jul 1, 2026',
    occupation: 'Cook',
    employer: 'Jollibee',
    empClassification: 'Wage-Employed',
    salary: '15000',
    ...overrides,
  };
}

function fixtureBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'BAT-1',
    tenantId: 'tenant-1',
    name: 'BAT-1',
    qualification: 'Cookery NC II',
    program: 'TWSP',
    ncLevel: 'NC II',
    trainer: 'Archelyn Gagula',
    trainerId: 'trainer-1',
    scholars: 15,
    trainingDays: '',
    trainingDaySchedule: [],
    notes: '',
    trainingStart: 'Apr 21',
    trainingEnd: 'Jun 8, 2026',
    duration: 0,
    currentDay: 0,
    totalDays: 0,
    progressPct: 74,
    ntpLag: 0,
    tipDate: '',
    billingDeadline: 'Jun 8, 2026',
    daysToBilling: 10,
    bsrs: false,
    remark: '',
    status: 'ongoing',
    lifecycle: [],
    documents: {},
    ...overrides,
  };
}

describe('egaceVal', () => {
  it('reads a stage count from the batch', () => {
    expect(egaceVal(fixtureBatch({ egace: EGACE }), 'certified')).toBe(6);
  });

  it('is 0 for a batch without egace counts or an unknown stage', () => {
    expect(egaceVal(fixtureBatch(), 'certified')).toBe(0);
    expect(egaceVal(fixtureBatch({ egace: EGACE }), 'nope')).toBe(0);
  });
});

describe('egaceTotals', () => {
  it('sums each stage across batches, treating missing egace as zeros', () => {
    const totals = egaceTotals([
      fixtureBatch({ egace: EGACE }),
      fixtureBatch({ id: 'BAT-2', egace: { enrolled: 5, graduate: 2, assessed: 1, certified: 1, employed: 1 } }),
      fixtureBatch({ id: 'BAT-3' }),
    ]);
    expect(totals).toEqual({ enrolled: 20, graduate: 12, assessed: 9, certified: 7, employed: 4 });
  });
});

describe('egaceRate', () => {
  it('converts vs enrolled in whole percent', () => {
    expect(egaceRate({ enrolled: 20, graduate: 12 }, 12)).toBe(60);
  });

  it('is 0 when nothing is enrolled', () => {
    expect(egaceRate({ enrolled: 0, graduate: 12 }, 12)).toBe(0);
  });
});

describe('employmentRoster', () => {
  it('keeps only Competent scholars from batches with a follow-up window', () => {
    const followUp = { due: null, certified: 1, employed: 0, awaiting: 0, unemployed: 0, rate: 0, reported: 0 };
    const rows = employmentRoster([
      fixtureBatch({ employmentFollowUp: followUp, scholars_list: [fixtureScholar()] }),
      fixtureBatch({ id: 'BAT-2', employmentFollowUp: null, scholars_list: [fixtureScholar({ seq: 9 })] }),
      fixtureBatch({ id: 'BAT-3', scholars_list: [fixtureScholar({ assessmentResult: 'Not Yet Competent' })] }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].s.uli).toBe('ULI-0001');
    expect(rows[0].batch.id).toBe('BAT-1');
  });
});

describe('employmentTotals / employmentRate', () => {
  const ES = EMPLOYMENT_STATUSES;
  const roster = (statuses: string[]) =>
    statuses.map((st, i) => ({
      batch: fixtureBatch({ id: `BAT-${i}` }),
      s: fixtureScholar({ seq: i + 1, employmentStatus: st }),
    }));

  it('counts wage and self-employment as employed; awaiting and unemployed separately', () => {
    const totals = employmentTotals(roster([ES.wage, ES.self, ES.awaiting, ES.unemployed, ES.na]));
    expect(totals).toEqual({ certified: 5, employed: 2, awaiting: 1, unemployed: 1 });
  });

  it('computes the employed share of certified scholars', () => {
    expect(employmentRate(employmentTotals(roster([ES.wage, ES.awaiting])))).toBe(50);
  });

  it('is 0 when no one has been followed up', () => {
    expect(employmentRate({ certified: 0, employed: 0, awaiting: 0, unemployed: 0 })).toBe(0);
  });
});

describe('employmentTone', () => {
  const ES = EMPLOYMENT_STATUSES;
  it('maps every known status to its badge tone', () => {
    expect(employmentTone(ES.wage)).toBe('green');
    expect(employmentTone(ES.self)).toBe('teal');
    expect(employmentTone(ES.awaiting)).toBe('amber');
    expect(employmentTone(ES.unemployed)).toBe('red');
    expect(employmentTone(ES.na)).toBe('neutral');
  });

  it('renders unknown statuses neutral', () => {
    expect(employmentTone('Somewhere Else')).toBe('neutral');
  });
});
