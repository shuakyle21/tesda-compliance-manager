import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mapBatchRow } from '@/modules/batches/data/batches';

// batches.ts keeps its join-row type module-private; derive the fixture's
// shape from the function signature instead of duplicating it by hand.
type BatchRowWithProgram = Parameters<typeof mapBatchRow>[0];

function fixtureRow(overrides: Partial<BatchRowWithProgram> = {}): BatchRowWithProgram {
  return {
    id: 'row-1',
    tenant_id: 'tenant-1',
    program_id: 'program-1',
    batch_code: 'BAT-2',
    batch_section: null,
    qualification_title: 'Agricultural Crops Production NC II',
    nc_level: 'NC II',
    trainer_profile_id: 'trainer-1',
    trainer_name: 'Jane Dela Cruz',
    learner_count: 25,
    start_date: '2026-01-15',
    end_date: '2026-06-18',
    current_stage: 'training',
    status: 'ongoing',
    progress_percent: 60,
    billing_report_status: 'missing',
    official_system_reference: null,
    created_by: null,
    updated_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    scholarship_programs: { code: 'TWSP', program_document_requirements: [] },
    documents: [],
    ...overrides,
  };
}

describe('mapBatchRow', () => {
  it('gives the batch its display id and name from batch_code (no section)', () => {
    const batch = mapBatchRow(fixtureRow({ batch_code: 'BAT-2', batch_section: null }));
    expect(batch.id).toBe('BAT-2');
    expect(batch.name).toBe('BAT-2');
  });

  it('appends the section to the display name when present', () => {
    const batch = mapBatchRow(fixtureRow({ batch_code: 'BAT-2', batch_section: 'Morning' }));
    expect(batch.name).toBe('BAT-2 (Morning)');
  });

  it('bridges the DB lifecycle stage to the UI pipeline and marks it active', () => {
    const batch = mapBatchRow(fixtureRow({ current_stage: 'training' }));
    const train = batch.lifecycle.find((s) => s.key === 'train');
    const tip = batch.lifecycle.find((s) => s.key === 'tip');
    const assess = batch.lifecycle.find((s) => s.key === 'assess');
    expect(train?.status).toBe('active');
    expect(tip?.status).toBe('done');
    expect(assess?.status).toBe('pending');
  });

  it('marks every pipeline stage done when the batch is completed', () => {
    const batch = mapBatchRow(fixtureRow({ current_stage: 'completed' }));
    expect(batch.lifecycle.every((s) => s.status === 'done')).toBe(true);
  });

  it('marks no stage active when the batch is blocked', () => {
    const batch = mapBatchRow(fixtureRow({ current_stage: 'blocked' }));
    expect(batch.lifecycle.some((s) => s.status === 'active')).toBe(false);
  });

  it('normalizes DB status "blocked" to UI status "pending" (no UI blocked tier yet)', () => {
    const batch = mapBatchRow(fixtureRow({ status: 'blocked' }));
    expect(batch.status).toBe('pending');
  });

  it('backfills every catalog requirement as missing, then overlays submitted rows', () => {
    const batch = mapBatchRow(
      fixtureRow({
        scholarship_programs: {
          code: 'TWSP',
          program_document_requirements: [
            {
              id: 'req-1',
              program_id: 'program-1',
              document_key: 'aou',
              document_name: 'Authority to Operate',
              description: null,
              required_for_stage: 'aou',
              audience: 'all',
              is_required: true,
              sort_order: 10,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'req-2',
              program_id: 'program-1',
              document_key: 'ntp',
              document_name: 'Notice to Proceed',
              description: null,
              required_for_stage: 'ntp',
              audience: 'all',
              is_required: true,
              sort_order: 20,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
        documents: [
          {
            id: 'doc-1',
            tenant_id: 'tenant-1',
            batch_id: 'row-1',
            requirement_id: 'req-1',
            document_key: 'aou',
            document_name: 'Authority to Operate',
            status: 'verified',
            audience: 'all',
            storage_path: 'tenant-1/row-1/aou.pdf',
            external_url: null,
            notes: null,
            submitted_by: null,
            submitted_at: null,
            verified_by: null,
            verified_at: '2026-02-01T00:00:00.000Z',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    expect(batch.documents.aou.status).toBe('verified');
    expect(batch.documents.ntp.status).toBe('missing');
  });
});

describe('mapBatchRow — days-to-billing (as-of date sensitive)', () => {
  beforeEach(() => {
    // Fixed as-of date per PRD T-010/T-011: freeze the clock so daysUntil()'s
    // internal Date.now() call is deterministic, not the runner's real clock.
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes daysToBilling as whole days from the fixed as-of date to end_date', () => {
    const batch = mapBatchRow(fixtureRow({ end_date: '2026-06-18' }));
    expect(batch.daysToBilling).toBe(17);
  });

  it('returns Infinity (no known deadline) when end_date is null', () => {
    const batch = mapBatchRow(fixtureRow({ end_date: null }));
    expect(batch.daysToBilling).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns Infinity rather than NaN for an unparseable end_date', () => {
    const batch = mapBatchRow(fixtureRow({ end_date: 'not-a-date' }));
    expect(batch.daysToBilling).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(batch.daysToBilling)).toBe(false);
  });

  // NOTE: billingDeadline currently stands in as end_date (TODO(contract) in
  // batches.ts, tracked on TES-30 — see the LAMR/program_modules chain in
  // Linear). This assertion pins today's known stand-in behavior, not the
  // intended contract; update it once a real billing_deadline column lands.
  it('stands in billingDeadline with end_date until a real column exists', () => {
    const batch = mapBatchRow(fixtureRow({ end_date: '2026-06-18' }));
    expect(batch.billingDeadline).toBe('Jun 18, 2026');
  });
});
