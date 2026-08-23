import { describe, it, expect } from 'vitest';
import { isBillingReady, billingGate, BILLING_READY_THRESHOLD } from '@/modules/billing/domain/readiness';
import type { Batch } from '@/shared/types';

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
    trainingStart: 'Jan 1',
    trainingEnd: 'Jun 1, 2026',
    duration: 0,
    currentDay: 0,
    totalDays: 0,
    progressPct: 80,
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

describe('isBillingReady', () => {
  it('is ready once progress meets the threshold on an ongoing batch', () => {
    expect(isBillingReady(fixtureBatch({ status: 'ongoing', progressPct: BILLING_READY_THRESHOLD }))).toBe(true);
  });

  it('is not ready one point below the threshold', () => {
    expect(isBillingReady(fixtureBatch({ status: 'ongoing', progressPct: BILLING_READY_THRESHOLD - 1 }))).toBe(false);
  });

  it('is not ready when progress is met but the batch is not ongoing', () => {
    expect(isBillingReady(fixtureBatch({ status: 'completed', progressPct: 100 }))).toBe(false);
    expect(isBillingReady(fixtureBatch({ status: 'pending', progressPct: 100 }))).toBe(false);
  });
});

describe('billingGate', () => {
  it('is ready only when both the progress threshold and document verification are met', () => {
    const batch = fixtureBatch({ status: 'ongoing', progressPct: 80 });
    const gate = billingGate(batch, { verified: 3, requiredTotal: 3 });
    expect(gate).toEqual({
      thresholdMet: true,
      progressPct: 80,
      docsVerified: true,
      verifiedCount: 3,
      requiredTotal: 3,
      ready: true,
    });
  });

  it('is not ready when the threshold is met but documents are incomplete', () => {
    const batch = fixtureBatch({ status: 'ongoing', progressPct: 80 });
    const gate = billingGate(batch, { verified: 2, requiredTotal: 3 });
    expect(gate.thresholdMet).toBe(true);
    expect(gate.docsVerified).toBe(false);
    expect(gate.ready).toBe(false);
  });

  it('is not ready when documents are complete but the threshold is unmet', () => {
    const batch = fixtureBatch({ status: 'ongoing', progressPct: 50 });
    const gate = billingGate(batch, { verified: 3, requiredTotal: 3 });
    expect(gate.thresholdMet).toBe(false);
    expect(gate.docsVerified).toBe(true);
    expect(gate.ready).toBe(false);
  });

  it('treats a zero-requirement catalog as not verified (never auto-ready)', () => {
    const batch = fixtureBatch({ status: 'ongoing', progressPct: 100 });
    const gate = billingGate(batch, { verified: 0, requiredTotal: 0 });
    expect(gate.docsVerified).toBe(false);
    expect(gate.ready).toBe(false);
  });
});
