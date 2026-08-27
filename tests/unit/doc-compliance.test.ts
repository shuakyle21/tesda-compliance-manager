/**
 * TES-94 / ADR-004 — "a batch with no tracked document records" semantics.
 *
 * The rules under test: untracked is neither verified nor missing; it is
 * excluded from measurement (percentages) and treated as not-satisfied by
 * gates; nothing tracked at all yields `null` (unknown), never 0 or 100.
 */

import { describe, it, expect } from 'vitest';
import {
  criticalRequirements,
  docRecordFor,
  isDocOnFile,
  isDocTracked,
  summarizeBatchDocCompliance,
  summarizeDocCompliance,
} from '@/modules/documents/domain/compliance';
import { deriveDashboardMetrics } from '@/modules/batches/domain/metrics';
import type { Batch, DocRecord, DocStatus, DocumentRequirement } from '@/shared/types';

function req(key: string, critical = true): DocumentRequirement {
  return { key, label: key, stage: 'train', critical, icon: 'file' };
}

function doc(status: DocStatus): DocRecord {
  return { status, url: null, updated: null, source: null };
}

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

const REQS = [req('aou'), req('ntp'), req('attendance'), req('optional_extra', false)];

describe('untracked lookups', () => {
  it('reports an absent key as untracked rather than throwing', () => {
    const batch = fixtureBatch();
    expect(docRecordFor(batch, 'aou')).toBeNull();
    expect(isDocTracked(batch, 'aou')).toBe(false);
  });

  it('reports a present key as tracked, whatever its status', () => {
    const batch = fixtureBatch({ documents: { aou: doc('missing') } });
    expect(isDocTracked(batch, 'aou')).toBe(true);
    expect(docRecordFor(batch, 'aou')?.status).toBe('missing');
  });
});

describe('gating — isDocOnFile', () => {
  it.each<[DocStatus, boolean]>([
    ['verified', true],
    ['submitted', true],
    ['pending', false],
    ['missing', false],
  ])('%s → on file: %s', (status, expected) => {
    expect(isDocOnFile(fixtureBatch({ documents: { aou: doc(status) } }), 'aou')).toBe(expected);
  });

  it('keeps the gate closed for an untracked document', () => {
    // The deliberate opposite of the measurement rule: a gate must never open
    // on evidence nobody recorded.
    expect(isDocOnFile(fixtureBatch(), 'aou')).toBe(false);
  });
});

describe('summarizeBatchDocCompliance', () => {
  it('returns null percentages when nothing is tracked — unknown, not 0% or 100%', () => {
    const summary = summarizeBatchDocCompliance(fixtureBatch(), REQS);
    expect(summary.tracked).toBe(0);
    expect(summary.untracked).toBe(REQS.length);
    expect(summary.onFilePct).toBeNull();
    expect(summary.verifiedPct).toBeNull();
    expect(summary.missing).toBe(0);
  });

  it('excludes untracked keys from both numerator and denominator', () => {
    // Two of four requirements tracked: one verified, one missing. The two
    // untracked keys must not drag the percentage down (as "missing" would)
    // nor prop it up (as the old "absent = verified" count did).
    const batch = fixtureBatch({ documents: { aou: doc('verified'), ntp: doc('missing') } });
    const summary = summarizeBatchDocCompliance(batch, REQS);

    expect(summary.tracked).toBe(2);
    expect(summary.untracked).toBe(2);
    expect(summary.verified).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.verifiedPct).toBe(50);
    expect(summary.onFilePct).toBe(50);
  });

  it('counts submitted as on file but not as verified (ADR-001 §7.2.4)', () => {
    const batch = fixtureBatch({ documents: { aou: doc('submitted'), ntp: doc('pending') } });
    const summary = summarizeBatchDocCompliance(batch, REQS);

    expect(summary.onFilePct).toBe(50);
    expect(summary.verifiedPct).toBe(0);
    expect(summary.pending).toBe(1);
  });

  it('never reads a fully untracked batch as compliant', () => {
    const summary = summarizeBatchDocCompliance(fixtureBatch(), REQS);
    expect(summary.onFilePct).not.toBe(100);
  });
});

describe('summarizeDocCompliance across batches', () => {
  it('sums tracked and untracked slots over the batch set', () => {
    const summary = summarizeDocCompliance(
      [
        fixtureBatch({ id: 'BAT-1', documents: { aou: doc('verified'), ntp: doc('verified') } }),
        fixtureBatch({ id: 'BAT-2', documents: {} }),
      ],
      criticalRequirements(REQS), // 3 critical requirements
    );

    expect(summary.tracked).toBe(2);
    expect(summary.untracked).toBe(4); // 1 uncovered on BAT-1 + 3 on BAT-2
    expect(summary.onFilePct).toBe(100);
  });

  it('is null-safe on an empty batch set', () => {
    const summary = summarizeDocCompliance([], criticalRequirements(REQS));
    expect(summary.tracked).toBe(0);
    expect(summary.onFilePct).toBeNull();
  });
});

describe('deriveDashboardMetrics — document fields', () => {
  it('reports unknown compliance when no batch tracks a critical document', () => {
    const metrics = deriveDashboardMetrics([fixtureBatch()], REQS);
    expect(metrics.docCompliancePct).toBeNull();
    expect(metrics.docTracked).toBe(0);
    expect(metrics.docUntracked).toBe(3);
    expect(metrics.docMissing).toBe(0);
  });

  it('ignores non-critical requirements', () => {
    const batch = fixtureBatch({
      documents: { aou: doc('verified'), ntp: doc('verified'), attendance: doc('verified'), optional_extra: doc('missing') },
    });
    const metrics = deriveDashboardMetrics([batch], REQS);

    expect(metrics.docCompliancePct).toBe(100);
    expect(metrics.docMissing).toBe(0);
    expect(metrics.docUntracked).toBe(0);
  });
});
