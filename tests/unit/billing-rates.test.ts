import { describe, expect, it } from 'vitest';
import { buildStatement } from '@/modules/billing/domain/statement';
import { trackById } from '@/modules/billing/domain/tracks';
import { buildPacket, isOverdue, summarizePackets } from '@/modules/billing/domain/packets';
import { nominalHoursFor, trainingCostFor, tsfDaysFor } from '@/modules/billing/domain/rates';
import type { Batch, ScholarRow } from '@/shared/types';

const scholar = (n: number) => ({ lastName: `L${n}`, firstName: 'F', middleInit: '', sex: 'F' }) as unknown as ScholarRow;

function fixtureBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'BAT-1', rqmCode: null, tenantId: 't1', programId: 'p1', name: 'BAT-1',
    qualification: 'Agri Crops Production NC II', program: 'CFSP', ncLevel: 'NC II',
    trainer: 'T', trainerId: 'tr', scholars: 2, trainingDays: '', trainingDaySchedule: [], notes: '',
    trainingStart: 'Apr 21, 2026', trainingEnd: 'Jun 8, 2026', duration: 0, currentDay: 45, totalDays: 45,
    completedSessions: null, totalSessions: null, progressPct: 90, ntpLag: null, tipDate: '',
    billingDeadline: 'Jun 1, 2026', daysToBilling: 10, bsrs: false, remark: '', status: 'ongoing',
    lifecycle: [], documents: {}, documentRequirements: [], blocked: false,
    scholars_list: [scholar(1), scholar(2)],
    ...overrides,
  } as Batch;
}
const tenant = { name: 'School', region: 'Region' };

describe('billing text is built from the rate constants', () => {
  it('keeps today\'s exact track captions', () => {
    expect(trackById('training_cost').basis).toBe('60 training-day split');
    expect(trackById('tsf_allowance').basis).toBe('calendar-duration split · nets ₱160/absence');
    expect(trackById('entrepreneurship').basis).toBe('single payment · 3-day block');
  });

  it('keeps today\'s exact statement strings', () => {
    const tsf = buildStatement(fixtureBatch(), 'tsf_allowance', tenant);
    expect(tsf.columns.find((c) => c.key === 'tsf')?.label).toBe('TSF (45×₱160)');
    expect(tsf.summary.map((l) => l.label)).toEqual([
      'TSF — 45 days × ₱160 × 2',
      'New Normal Assistance — ₱1,000 × 2',
      'Accident Insurance — ₱100.80 × 2',
    ]);
    const ent = buildStatement(fixtureBatch(), 'entrepreneurship', tenant);
    expect(ent.summary[0].label).toBe('₱800 × 2 scholars');
    expect(ent.subtitle).toBe('₱800 per scholar · 2 pax');
  });
});

describe('unmapped qualification', () => {
  const unmapped = fixtureBatch({ qualification: 'Not In The Table' });

  it('mapped qualification keeps its rate', () => {
    expect(trainingCostFor('Agri Crops Production NC II')).toBe(15_390);
    expect(nominalHoursFor('Cookery NC II')).toBe(320);
    expect(tsfDaysFor('Agri Crops Production NC II')).toBe(45);
    const s = buildStatement(fixtureBatch(), 'training_cost', tenant);
    expect(s.grandTotal).toBe(30_780);
  });

  it('has no rate, never a default', () => {
    expect(trainingCostFor('Not In The Table')).toBeNull();
    expect(nominalHoursFor('Not In The Table')).toBeNull();
    expect(tsfDaysFor('Not In The Table')).toBeNull();
  });

  it('statement shows "—" and says the rate is unavailable', () => {
    const s = buildStatement(unmapped, 'training_cost', tenant);
    expect(s.grandTotal).toBeNull();
    expect(s.grandTotalLabel).toBe('—');
    expect(s.grandWords).toBe('—');
    expect(s.summary[0].label).toBe('Rate unavailable for this qualification');
    expect(s.rows[0].cells.slice(3)).toEqual(['—', '—']);
  });

  it('CFSP TSF total excludes the missing TSF and says so', () => {
    const s = buildStatement(unmapped, 'tsf_allowance', tenant);
    expect(s.grandTotal).toBe((1_000 + 100.8) * 2);
    expect(s.summary.some((l) => l.label.startsWith('Total excludes TSF'))).toBe(true);
    expect(s.summary[0].label).toBe('TSF — Rate unavailable for this qualification');
  });

  it('packet is blocked, not ready', () => {
    const packet = buildPacket(unmapped, [{ key: 'k', label: 'K', stage: 'aou' }] as never, 'S', 1);
    expect(packet.blockers).toContain('No training-cost rate is set for this qualification.');
    expect(packet.state).toBe('draft');
  });
});

describe('statement with no roster loaded', () => {
  it('shows "—" for the pax count, not "0 pax"', () => {
    const s = buildStatement(fixtureBatch({ scholars_list: undefined }), 'training_cost', tenant);
    expect(s.scholarsLabel).toBe('—');
    expect(s.subtitle).not.toContain('0 pax');
  });

  it('shows "—" for a missing program banner', () => {
    expect(buildStatement(fixtureBatch({ program: '' }), 'training_cost', tenant).programLine).toBe('—');
  });
});

describe('no deadline recorded', () => {
  const packet = buildPacket(fixtureBatch({ daysToBilling: Infinity }), [], 'S', 1);

  it('reads "No deadline recorded", never "Due in Infinityd"', () => {
    expect(packet.dueLabel).toBe('No deadline recorded');
  });

  it('is not overdue', () => {
    expect(isOverdue(packet)).toBe(false);
    expect(summarizePackets([packet]).overdueCount).toBe(0);
  });
});
