import { describe, expect, it } from 'vitest';
import { ganttData } from '@/modules/batches/ui/dashboard/BatchTimeline';
import type { Batch, LifecycleStage } from '@/shared/types';

function fixtureBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'BAT-1',
    tenantId: 'tenant-1',
    name: 'BAT-1',
    qualification: 'Agricultural Crops Production NC II',
    program: 'TWSP',
    ncLevel: 'NC II',
    trainer: 'Jane Dela Cruz',
    trainerId: 'trainer-1',
    scholars: 25,
    trainingDays: '',
    trainingDaySchedule: [],
    notes: '',
    trainingStart: 'Feb 1',
    trainingEnd: 'May 1, 2026',
    duration: 0,
    currentDay: 30,
    totalDays: 90,
    progressPct: 40,
    ntpLag: 0,
    tipDate: '',
    billingDeadline: 'Jun 1, 2026',
    daysToBilling: 10,
    bsrs: false,
    remark: '',
    status: 'ongoing',
    lifecycle: [],
    documents: {},
    ...overrides,
  };
}

function lifecycleWith(key: string, status: LifecycleStage['status']): LifecycleStage[] {
  return [{ key: key as LifecycleStage['key'], label: key, status, date: '' }];
}

describe('ganttData', () => {
  it('omits the prep phase when aou/ntp dates are missing', () => {
    const [row] = ganttData([fixtureBatch({ aouDate: undefined, ntpDate: undefined })]);
    expect(row.phases.find((p) => p.key === 'prep')).toBeUndefined();
    expect(row.phases.find((p) => p.key === 'train')).toBeDefined();
  });

  it('includes prep, train, entre, and bill phases when all date pairs are present', () => {
    const [row] = ganttData([
      fixtureBatch({
        aouDate: 'Jan 1, 2026',
        ntpDate: 'Jan 15, 2026',
        entreStart: 'May 2, 2026',
        entreEnd: 'May 20, 2026',
        billingDeadline: 'Jun 1, 2026',
      }),
    ]);
    expect(row.phases.map((p) => p.key)).toEqual(['prep', 'train', 'entre', 'bill']);
  });

  it('omits the bill phase when the billing deadline is not after the billing-window start', () => {
    const [row] = ganttData([
      fixtureBatch({
        entreStart: 'May 2, 2026',
        entreEnd: 'May 20, 2026',
        billingDeadline: 'May 20, 2026', // same as entreEnd — not strictly after
      }),
    ]);
    expect(row.phases.find((p) => p.key === 'bill')).toBeUndefined();
  });

  it('uses trainingEnd as the billing-window start when there is no entre phase', () => {
    const [row] = ganttData([
      fixtureBatch({ trainingEnd: 'May 1, 2026', billingDeadline: 'Jun 1, 2026' }),
    ]);
    const bill = row.phases.find((p) => p.key === 'bill');
    expect(bill?.s).toEqual(new Date(2026, 4, 1));
  });

  it('hides a batch whose billing stage is already done', () => {
    const rows = ganttData([fixtureBatch({ lifecycle: lifecycleWith('bill', 'done') })]);
    expect(rows).toHaveLength(0);
  });

  it('keeps a batch whose billing stage is not done', () => {
    const rows = ganttData([fixtureBatch({ lifecycle: lifecycleWith('bill', 'active') })]);
    expect(rows).toHaveLength(1);
  });
});
