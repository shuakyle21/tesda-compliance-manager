/**
 * TES-40 / FR-06 AC-2 — the document blocking strip.
 *
 * The rule under test is ADR-004 **D4**, not D2. A blocker list is a *gate*,
 * so an untracked requirement blocks; the same batch measured by
 * `summarizeDocCompliance` excludes that requirement entirely. Those two
 * answers are supposed to disagree, and the "gate and measurement disagree"
 * test below pins that down so a future refactor cannot quietly align them.
 *
 * FR-06 AC-1 ("no raw `document_key` … shown to users") is enforced by
 * `blockingDocumentNames` returning labels; a test asserts it never leaks a key.
 */

import { describe, it, expect } from 'vitest';
import {
  blockerCount,
  blockingDocumentNames,
  blockingDocuments,
  criticalRequirements,
  summarizeBatchDocCompliance,
} from '@/modules/documents/domain/compliance';
import type { Batch, DocRecord, DocStatus, DocumentRequirement } from '@/shared/types';

function req(key: string, label: string, critical = true, stage = 'train'): DocumentRequirement {
  return { key, label, stage, critical, icon: 'file' };
}

function doc(status: DocStatus): DocRecord {
  return { status, url: null, updated: null, source: null };
}

function batchWith(documents: Record<string, DocRecord>): Batch {
  return { documents } as unknown as Batch;
}

/** A catalog covering every blocking reason plus both on-file statuses. */
const CATALOG: DocumentRequirement[] = [
  req('ntp', 'Notice to Proceed'),
  req('aou', 'Agreement of Undertaking'),
  req('tip_report', 'Training Induction Program Report', false),
  req('lamr', 'Learner Attendance and Monitoring Report'),
  req('training_schedule', 'Training Schedule', false),
];

describe('blockingDocuments — what blocks', () => {
  it('treats missing and pending as blocking, verified and submitted as clear', () => {
    const batch = batchWith({
      ntp: doc('verified'),
      aou: doc('submitted'),
      tip_report: doc('missing'),
      lamr: doc('pending'),
      training_schedule: doc('verified'),
    });

    const result = blockingDocuments(batch, CATALOG);
    expect(result.count).toBe(2);
    expect(result.blockers.map((b) => b.key).sort()).toEqual(['lamr', 'tip_report']);
    expect(result.blockers.find((b) => b.key === 'lamr')?.reason).toBe('pending');
    expect(result.blockers.find((b) => b.key === 'tip_report')?.reason).toBe('missing');
  });

  it('treats an untracked requirement as blocking (ADR-004 D4 — gates fail closed)', () => {
    // `aou` has no record at all. A gate must not open on evidence nobody recorded.
    const batch = batchWith({ ntp: doc('verified') });
    const result = blockingDocuments(batch, [req('ntp', 'Notice to Proceed'), req('aou', 'AOU')]);

    expect(result.count).toBe(1);
    expect(result.blockers[0]).toMatchObject({ key: 'aou', reason: 'untracked' });
  });

  it('returns nothing for a fully satisfied batch', () => {
    const batch = batchWith(
      Object.fromEntries(CATALOG.map((r) => [r.key, doc('verified')])) as Record<string, DocRecord>,
    );
    expect(blockingDocuments(batch, CATALOG)).toEqual({
      blockers: [],
      count: 0,
      criticalCount: 0,
    });
  });

  it('returns an empty summary for an empty catalog, not a blocked batch', () => {
    // Asking about nothing is not evidence of a problem — contrast ADR-004 D3,
    // where *measuring* nothing is unknown rather than empty.
    expect(blockingDocuments(batchWith({}), [])).toEqual({
      blockers: [],
      count: 0,
      criticalCount: 0,
    });
  });

  it('blocks every requirement when the batch tracks nothing at all', () => {
    const result = blockingDocuments(batchWith({}), CATALOG);
    expect(result.count).toBe(CATALOG.length);
    expect(result.blockers.every((b) => b.reason === 'untracked')).toBe(true);
  });
});

describe('blockingDocuments — ordering and counts', () => {
  it('puts critical blockers first, preserving catalog order within each group', () => {
    const batch = batchWith({});
    const result = blockingDocuments(batch, CATALOG);

    expect(result.blockers.map((b) => b.key)).toEqual([
      'ntp',
      'aou',
      'lamr', // critical, in catalog order
      'tip_report',
      'training_schedule', // non-critical, in catalog order
    ]);
  });

  it('counts only the critical subset in criticalCount', () => {
    const result = blockingDocuments(batchWith({}), CATALOG);
    expect(result.count).toBe(5);
    expect(result.criticalCount).toBe(3);
  });

  it('honours a caller that narrows the catalog with criticalRequirements', () => {
    const result = blockingDocuments(batchWith({}), criticalRequirements(CATALOG));
    expect(result.count).toBe(3);
    expect(result.criticalCount).toBe(3);
  });
});

describe('blockerCount', () => {
  it('agrees with blockingDocuments().count on every fixture', () => {
    const fixtures: Batch[] = [
      batchWith({}),
      batchWith({ ntp: doc('verified') }),
      batchWith({ ntp: doc('missing'), aou: doc('pending'), lamr: doc('submitted') }),
      batchWith(
        Object.fromEntries(CATALOG.map((r) => [r.key, doc('verified')])) as Record<
          string,
          DocRecord
        >,
      ),
    ];
    for (const batch of fixtures) {
      expect(blockerCount(batch, CATALOG)).toBe(blockingDocuments(batch, CATALOG).count);
    }
  });
});

describe('blockingDocumentNames — FR-06 AC-1', () => {
  it('returns display names, never raw document keys', () => {
    const batch = batchWith({ ntp: doc('missing') });
    const names = blockingDocumentNames(batch, [req('ntp', 'Notice to Proceed')]);

    expect(names).toEqual(['Notice to Proceed']);
    expect(names).not.toContain('ntp');
  });

  it('leaks no requirement key for any blocker in the catalog', () => {
    const names = blockingDocumentNames(batchWith({}), CATALOG);
    for (const key of CATALOG.map((r) => r.key)) {
      expect(names).not.toContain(key);
    }
    expect(names).toHaveLength(CATALOG.length);
  });

  it('preserves strip order (critical first)', () => {
    expect(blockingDocumentNames(batchWith({}), CATALOG)[0]).toBe('Notice to Proceed');
  });
});

describe('gate and measurement deliberately disagree (ADR-004 D2 vs D4)', () => {
  it('excludes untracked from compliance but counts it as a blocker', () => {
    // One requirement tracked and verified, one never recorded.
    const batch = batchWith({ ntp: doc('verified') });
    const catalog = [req('ntp', 'Notice to Proceed'), req('aou', 'Agreement of Undertaking')];

    // Measurement (D2): untracked leaves the numerator AND denominator, so the
    // batch reads as fully compliant on what it actually tracks.
    const measured = summarizeBatchDocCompliance(batch, catalog);
    expect(measured.tracked).toBe(1);
    expect(measured.untracked).toBe(1);
    expect(measured.onFilePct).toBe(100);

    // Gating (D4): the same batch is blocked by the untracked requirement.
    expect(blockerCount(batch, catalog)).toBe(1);

    // 100% compliant and still blocked is the correct, intended answer.
  });
});
