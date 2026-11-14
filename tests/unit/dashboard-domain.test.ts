import { describe, expect, it } from 'vitest';
import { attentionItems, BILLING_DUE_WINDOW_DAYS } from '@/modules/batches/domain/attention';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import {
  applyOverviewFilters, crossSchoolQueue, isPastTrainingEnd, overviewFilterOptions,
  parseOverviewFilters, schoolSummaries, stageDistribution,
} from '@/modules/batches/domain/overview';
import { describeSessionProgress, sessionProgress } from '@/modules/batches/domain/progress';
import { hasOpenBillingObligation, hasRecordedBillingDeadline, urgencyTier } from '@/modules/batches/domain/urgency';
import type { Batch, DocRecord, DocumentRequirement, LifecycleStage } from '@/shared/types';

// `daysToBilling` is precomputed by the mapper against the fetch time, so
// every case below is fixed-as-of by construction — no clock is read.

const REQS: DocumentRequirement[] = [
  { key: 'ntp', label: 'Notice to Proceed', stage: 'ntp', critical: true, icon: 'file' },
  { key: 'tip', label: 'TIP Report', stage: 'tip', critical: true, icon: 'file' },
  { key: 'photos', label: 'Photos', stage: '', critical: false, icon: 'file' },
];

function doc(status: DocRecord['status']): DocRecord {
  return { status, url: null, updated: null, source: null };
}

function lifecycle(billStatus: LifecycleStage['status'] = 'pending'): LifecycleStage[] {
  return [{ key: 'bill', label: 'Billing', status: billStatus, date: '' }];
}

function batch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'BAT-1', rqmCode: null, tenantId: 'tenant-1', programId: 'program-1', name: 'BAT-1',
    qualification: 'Agricultural Crops Production NC II', program: 'TWSP', ncLevel: 'NC II',
    trainer: '', trainerId: '', scholars: 20, trainingDays: '', trainingDaySchedule: [], notes: '',
    trainingStart: '2026-01-15', trainingEnd: '2026-06-18', duration: 0,
    completedSessions: null, totalSessions: null, currentDay: 0, totalDays: 0,
    progressPct: 0, ntpLag: null, tipDate: '',
    billingDeadline: null, daysToBilling: Number.POSITIVE_INFINITY,
    bsrs: false, remark: '', status: 'ongoing', blocked: false,
    lifecycle: lifecycle(), documents: {}, documentRequirements: [],
    ...overrides,
  };
}

function dated(days: number, overrides: Partial<Batch> = {}): Batch {
  return batch({ billingDeadline: '2026-11-01', daysToBilling: days, ...overrides });
}

describe('urgency', () => {
  it('reads the no-deadline sentinel as muted, never as a deadline tier', () => {
    expect(urgencyTier(Number.POSITIVE_INFINITY)).toBe('muted');
  });

  it('keeps an obligation open with or without a recorded deadline', () => {
    expect(hasOpenBillingObligation(batch())).toBe(true);
    expect(hasRecordedBillingDeadline(batch())).toBe(false);
    expect(hasRecordedBillingDeadline(dated(10))).toBe(true);
  });

  it('closes the obligation once completed, BSRS-verified, or billed', () => {
    expect(hasOpenBillingObligation(batch({ status: 'completed' }))).toBe(false);
    expect(hasOpenBillingObligation(batch({ bsrs: true }))).toBe(false);
    expect(hasOpenBillingObligation(batch({ lifecycle: lifecycle('done') }))).toBe(false);
  });
});

describe('attentionItems', () => {
  it('flags an overdue open obligation as urgent, with days overdue as a positive count', () => {
    const [item] = attentionItems([dated(-5)], { syncFailed: false });
    expect(item).toMatchObject({ kind: 'billing-overdue', severity: 'urgent', batchId: 'BAT-1', daysOverdue: 5 });
  });

  it('flags deadlines inside the due window and ignores those beyond it', () => {
    const items = attentionItems([
      dated(BILLING_DUE_WINDOW_DAYS, { id: 'IN' }),
      dated(BILLING_DUE_WINDOW_DAYS + 1, { id: 'OUT' }),
    ], { syncFailed: false });
    expect(items.map((i) => ('batchId' in i ? i.batchId : null))).toEqual(['IN']);
    expect(items[0]).toMatchObject({ kind: 'billing-due', severity: 'due' });
  });

  it('raises nothing for a completed batch whose deadline has passed', () => {
    expect(attentionItems([dated(-300, { status: 'completed' })], { syncFailed: false })).toEqual([]);
  });

  it('groups open batches without a recorded deadline into one data-gap item', () => {
    const items = attentionItems([batch({ id: 'A' }), batch({ id: 'B' })], { syncFailed: false });
    expect(items).toEqual([{ kind: 'billing-deadline-missing', severity: 'due', batchIds: ['A', 'B'], batchLabels: ['A', 'B'] }]);
  });

  it('labels attention items with the RQM code while ids stay the internal code', () => {
    const RQM = 'RQM3-2026-CFSP-0000-0001';
    const missing = attentionItems([batch({ id: 'A', rqmCode: RQM }), batch({ id: 'B' })], { syncFailed: false });
    expect(missing).toEqual([{ kind: 'billing-deadline-missing', severity: 'due', batchIds: ['A', 'B'], batchLabels: [RQM, 'B'] }]);
    const docs = attentionItems([dated(60, {
      rqmCode: RQM, documentRequirements: REQS, documents: { ntp: doc('missing') },
    })], { syncFailed: false });
    expect(docs).toEqual([{ kind: 'documents-missing', severity: 'due', batchId: 'BAT-1', batchLabel: RQM, documents: ['Notice to Proceed'] }]);
  });

  it('names required documents recorded as missing — not untracked or optional ones', () => {
    const items = attentionItems([dated(60, {
      documentRequirements: REQS,
      documents: { ntp: doc('missing'), photos: doc('missing') }, // tip untracked
    })], { syncFailed: false });
    expect(items).toEqual([{ kind: 'documents-missing', severity: 'due', batchId: 'BAT-1', batchLabel: 'BAT-1', documents: ['Notice to Proceed'] }]);
  });

  it('lists a blocked batch as urgent', () => {
    expect(attentionItems([dated(60, { blocked: true })], { syncFailed: false })[0]).toMatchObject({ kind: 'blocked', severity: 'urgent' });
  });

  it('puts a sync failure first, then urgent before due, most overdue first', () => {
    const items = attentionItems([
      dated(3, { id: 'DUE' }),
      dated(-2, { id: 'LATE' }),
      dated(-40, { id: 'LATER' }),
    ], { syncFailed: true });
    expect(items.map((i) => i.kind)).toEqual(['sync-failed', 'billing-overdue', 'billing-overdue', 'billing-due']);
    expect(items.slice(1, 3).map((i) => ('batchId' in i ? i.batchId : ''))).toEqual(['LATER', 'LATE']);
  });
});

describe('deriveDashboardMetrics', () => {
  it('describes one population — active batches — across counts and roster', () => {
    const metrics = deriveDashboardMetrics([
      batch({ id: 'A', scholars: 15 }),
      batch({ id: 'B', scholars: 20 }),
      batch({ id: 'DONE', scholars: 25, status: 'completed' }),
    ]);
    expect(metrics.totalBatches).toBe(3);
    expect(metrics.activeBatches).toBe(2);
    expect(metrics.activeScholars).toBe(35);
  });

  it('reports session progress as not tracked when no active batch has attendance', () => {
    const metrics = deriveDashboardMetrics([batch({ progressPct: 90 })]);
    expect(metrics.sessionProgressPct).toBeNull();
    expect(metrics.sessionTrackedBatches).toBe(0);
  });

  it('averages attendance-derived progress only over batches that have it', () => {
    const metrics = deriveDashboardMetrics([
      batch({ completedSessions: 9, totalSessions: 45 }),   // 20%
      batch({ completedSessions: 27, totalSessions: 45 }),  // 60%
      batch(),                                              // untracked
    ]);
    expect(metrics.sessionProgressPct).toBe(40);
    expect(metrics.sessionTrackedBatches).toBe(2);
  });

  it('picks the soonest recorded deadline among open obligations and counts the undated ones', () => {
    const metrics = deriveDashboardMetrics([
      dated(30, { id: 'LATER' }),
      dated(-4, { id: 'OVERDUE' }),
      dated(-200, { id: 'BILLED', bsrs: true }),
      batch({ id: 'UNDATED' }),
    ]);
    expect(metrics.nextBilling).toEqual({ batchId: 'OVERDUE', batchLabel: 'OVERDUE', deadline: '2026-11-01', daysToBilling: -4 });
    expect(metrics.openBillingObligations).toBe(3);
    const RQM = 'RQM3-2026-CFSP-0000-0001';
    const labelled = deriveDashboardMetrics([dated(-4, { id: 'OVERDUE', rqmCode: RQM })]);
    expect(labelled.nextBilling).toMatchObject({ batchId: 'OVERDUE', batchLabel: RQM });
    expect(metrics.billingDeadlinesMissing).toBe(1);
    expect(metrics.overdueBilling).toBe(1);
  });

  it('measures each batch against its own program catalog', () => {
    const metrics = deriveDashboardMetrics([
      batch({ documentRequirements: REQS, documents: { ntp: doc('verified'), tip: doc('missing') } }),
      batch({ documentRequirements: [], documents: { ntp: doc('missing') } }), // other program: no catalog
    ]);
    expect(metrics.docTracked).toBe(2);
    expect(metrics.docMissing).toBe(1);
    expect(metrics.docCompliancePct).toBe(50);
  });

  it('reports no next billing and nothing open for an empty set', () => {
    const metrics = deriveDashboardMetrics([]);
    expect(metrics.nextBilling).toBeNull();
    expect(metrics.openBillingObligations).toBe(0);
    expect(metrics.docCompliancePct).toBeNull();
  });
});

describe('sessionProgress', () => {
  it('is unavailable without attendance or a session total', () => {
    expect(sessionProgress(batch())).toBeNull();
    expect(describeSessionProgress(batch())).toBe('Sessions not recorded');
  });

  it('caps the percentage at full', () => {
    expect(sessionProgress(batch({ completedSessions: 50, totalSessions: 45 }))?.pct).toBe(100);
    expect(describeSessionProgress(batch({ completedSessions: 12, totalSessions: 45 }))).toBe('12 of 45 sessions held');
  });
});

describe('schoolSummaries', () => {
  const AKB = { tenantId: 'akb', code: 'AKB', name: 'AKB School' };
  const NEN = { tenantId: 'nen', code: 'NEN', name: 'NEN School' };
  const EMPTY = { tenantId: 'empty', code: 'EMP', name: 'Empty School' };
  const TODAY = '2026-11-13';

  it('groups every figure by school, keeps schools with no batches, and sorts the most urgent first', () => {
    const summaries = schoolSummaries([
      dated(10, { id: 'A1', tenantId: 'akb' }),
      dated(-3, { id: 'N1', tenantId: 'nen' }),
      dated(60, { id: 'N2', tenantId: 'nen' }),
    ], [AKB, NEN, EMPTY], TODAY);

    expect(summaries.map((s) => s.school.code)).toEqual(['NEN', 'AKB', 'EMP']);
    expect(summaries[0].metrics.activeBatches).toBe(2);
    expect(summaries[0].urgent).toBe(1);
    expect(summaries[2].metrics.activeBatches).toBe(0);
  });

  it('counts batches still ongoing past their recorded training end, per school', () => {
    const summaries = schoolSummaries([
      batch({ id: 'A1', tenantId: 'akb', trainingEnd: '2026-11-12' }),
      batch({ id: 'A2', tenantId: 'akb', trainingEnd: '2026-12-01' }),
      batch({ id: 'N1', tenantId: 'nen', trainingEnd: '' }),
    ], [AKB, NEN], TODAY);
    expect(summaries.find((s) => s.school.code === 'AKB')?.pastTrainingEnd).toBe(1);
    expect(summaries.find((s) => s.school.code === 'NEN')?.pastTrainingEnd).toBe(0);
  });

  it('queues every open item with its school, urgent before due', () => {
    // AKB sorts first (2 urgent) and also holds a due item, so only the
    // queue's own sort can lift NEN's urgent item above it.
    const queue = crossSchoolQueue(schoolSummaries([
      dated(-9, { id: 'A1', tenantId: 'akb', documentRequirements: REQS, documents: { ntp: doc('missing') } }),
      dated(-2, { id: 'A2', tenantId: 'akb' }),
      dated(-3, { id: 'N1', tenantId: 'nen' }),
    ], [AKB, NEN], TODAY));
    expect(queue.map((entry) => [entry.school.code, entry.item.kind])).toEqual([
      ['AKB', 'billing-overdue'],
      ['AKB', 'billing-overdue'],
      ['NEN', 'billing-overdue'],
      ['AKB', 'documents-missing'],
    ]);
  });

  it('treats only an ongoing batch with a passed end date as past training end', () => {
    expect(isPastTrainingEnd(batch({ trainingEnd: '2026-11-12' }), TODAY)).toBe(true);
    expect(isPastTrainingEnd(batch({ trainingEnd: '2026-11-13' }), TODAY)).toBe(false);
    expect(isPastTrainingEnd(batch({ trainingEnd: '' }), TODAY)).toBe(false);
    expect(isPastTrainingEnd(batch({ trainingEnd: '2026-11-12', status: 'completed' }), TODAY)).toBe(false);
  });
});

describe('overview filters', () => {
  const AKB = { tenantId: 'akb', code: 'AKB', name: 'AKB School' };
  const NEN = { tenantId: 'nen', code: 'NEN', name: 'NEN School' };
  const BATCHES = [
    batch({ id: 'A1', tenantId: 'akb', program: 'TWSP', qualification: 'Organic Agriculture Production NC II' }),
    batch({ id: 'N1', tenantId: 'nen', program: 'CFSP', qualification: 'Rice Machinery Operations NC II' }),
    batch({ id: 'X1', tenantId: 'not-mine', program: 'TWSP' }),
  ];
  const options = overviewFilterOptions(BATCHES, [NEN, AKB]);

  it('offers the schools by name and the distinct programs and qualifications', () => {
    expect(options.schools.map((s) => s.code)).toEqual(['AKB', 'NEN']);
    expect(options.programs).toEqual(['CFSP', 'TWSP']);
    expect(options.qualifications).toHaveLength(3);
  });

  it('accepts only offered values, case-insensitively, and reads anything else as All', () => {
    expect(parseOverviewFilters({ program: 'twsp', school: ['nen', 'akb'] }, options))
      .toEqual({ school: 'NEN', program: 'TWSP', qualification: null });
    expect(parseOverviewFilters({ school: 'not-mine', program: '', qualification: 'Welding' }, options))
      .toEqual({ school: null, program: null, qualification: null });
  });

  it('treats spellings that differ only by case or spacing as one choice that matches every batch', () => {
    const mixed = [
      batch({ id: 'A1', tenantId: 'akb', program: 'TWSP', qualification: 'Organic Agriculture Production NC II' }),
      batch({ id: 'N1', tenantId: 'nen', program: ' twsp', qualification: 'organic agriculture production NC II ' }),
    ];
    const opts = overviewFilterOptions(mixed, [AKB, NEN]);
    expect(opts.qualifications).toEqual(['Organic Agriculture Production NC II']);
    expect(opts.programs).toEqual(['TWSP']);

    const filters = parseOverviewFilters({ qualification: 'ORGANIC agriculture production nc ii', program: 'twsp' }, opts);
    expect(applyOverviewFilters(mixed, [AKB, NEN], filters).batches.map((b) => b.id)).toEqual(['A1', 'N1']);
  });

  it('never returns a batch outside the given schools', () => {
    const all = applyOverviewFilters(BATCHES, [AKB, NEN], { school: null, program: null, qualification: null });
    expect(all.batches.map((b) => b.id)).toEqual(['A1', 'N1']);
    expect(all.hiddenSchools).toBe(0);
  });

  it('keeps one school for the school filter, and hides schools with no match for a program filter', () => {
    const one = applyOverviewFilters(BATCHES, [AKB, NEN], { school: 'NEN', program: null, qualification: null });
    expect(one.schools).toEqual([NEN]);
    expect(one.batches.map((b) => b.id)).toEqual(['N1']);

    const twsp = applyOverviewFilters(BATCHES, [AKB, NEN], { school: null, program: 'TWSP', qualification: null });
    expect(twsp.schools).toEqual([AKB]);
    expect(twsp.hiddenSchools).toBe(1);
  });
});

describe('stageDistribution', () => {
  const steps = (active: string): LifecycleStage[] => ['train', 'assess', 'bill'].map((key) => ({
    key: key as LifecycleStage['key'], label: key, status: key === active ? 'active' : 'pending', date: '',
  }));

  it('counts each batch once: blocked, completed, or its active stage', () => {
    const rows = stageDistribution([
      batch({ lifecycle: steps('train') }),
      batch({ lifecycle: steps('train') }),
      batch({ lifecycle: steps('assess'), blocked: true }),
      batch({ lifecycle: steps(''), status: 'completed' }),
    ]);
    expect(rows.map((row) => [row.key, row.count])).toEqual([
      ['train', 2], ['assess', 0], ['bill', 0], ['blocked', 1], ['completed', 1],
    ]);
  });

  it('counts a batch with every stage done as completed, and one with no active stage as not recorded', () => {
    const done: LifecycleStage[] = steps('').map((stage) => ({ ...stage, status: 'done' }));
    const rows = stageDistribution([batch({ lifecycle: steps('train') }), batch({ lifecycle: done }), batch({ lifecycle: steps('') })]);
    expect(rows.slice(3).map((row) => [row.key, row.count])).toEqual([['completed', 1], ['unrecorded', 1]]);
  });
});
