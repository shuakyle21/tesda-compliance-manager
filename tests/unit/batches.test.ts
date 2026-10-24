import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mapBatchRow, selectBatchesForDisplay } from '@/modules/batches/data/batches';

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
    billing_deadline: '2026-06-20',
    total_sessions: 45,
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
    attendance_records: [],
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

  it('computes daysToBilling as whole days from the fixed as-of date to billing_deadline', () => {
    const batch = mapBatchRow(fixtureRow({ end_date: '2026-06-18', billing_deadline: '2026-06-20' }));
    expect(batch.daysToBilling).toBe(19);
  });

  it('returns Infinity (no known deadline) when billing_deadline is null', () => {
    const batch = mapBatchRow(fixtureRow({ billing_deadline: null }));
    expect(batch.daysToBilling).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns Infinity rather than NaN for an unparseable billing_deadline', () => {
    const batch = mapBatchRow(fixtureRow({ billing_deadline: 'not-a-date' }));
    expect(batch.daysToBilling).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(batch.daysToBilling)).toBe(false);
  });

  it('preserves the canonical billing deadline instead of substituting end_date', () => {
    const batch = mapBatchRow(fixtureRow({ end_date: '2026-06-18', billing_deadline: '2026-06-20' }));
    expect(batch.billingDeadline).toBe('2026-06-20');
  });

  it('derives completed sessions from distinct attended dates', () => {
    const batch = mapBatchRow(fixtureRow({
      attendance_records: [
        { attendance_date: '2026-01-15', present: true },
        { attendance_date: '2026-01-15', present: true },
        { attendance_date: '2026-01-16', present: false },
        { attendance_date: '2026-01-17', present: true },
      ],
    }));
    expect(batch.completedSessions).toBe(2);
    expect(batch.totalSessions).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// selectBatchesForDisplay — see the docstring on the function itself, and
// docs/adr/ADR-005-demo-account-tenant-scoping.md decision 5, for why this rule
// exists. Not restated here: the same argument in two places drifts the way the
// two inlined copies of this logic did.
//
// The load-bearing case is the first test: `ok` is authoritative even when it
// carries zero rows. `unconfigured`/`sync-failed` never substitute mock data
// (RULES.md rule 19) — both render empty instead.
// ---------------------------------------------------------------------------
describe('selectBatchesForDisplay', () => {
  it('returns an empty list — not a substitute — when ok carries zero rows', () => {
    const result = selectBatchesForDisplay({ status: 'ok', batches: [], dataAsOf: null, fetchedAt: '2026-10-24T00:00:00.000Z' });
    expect(result).toEqual([]);
  });

  it('returns live batches when the snapshot is ok and non-empty', () => {
    const live = [mapBatchRow(fixtureRow({ id: 'live-1', batch_code: 'LIVE-1' }))];
    const result = selectBatchesForDisplay({ status: 'ok', batches: live, dataAsOf: null, fetchedAt: '2026-10-24T00:00:00.000Z' });
    expect(result.map((b) => b.id)).toEqual(['LIVE-1']);
  });

  it('renders empty — never mock data — when the snapshot is unconfigured', () => {
    const result = selectBatchesForDisplay({ status: 'unconfigured' });
    expect(result).toEqual([]);
  });

  it('renders empty — never mock data — when the snapshot is sync-failed', () => {
    const result = selectBatchesForDisplay({ status: 'sync-failed', error: 'boom' });
    expect(result).toEqual([]);
  });
});

describe('mapBatchRow — dashboard contract (unavailable is null, never zero)', () => {
  it('reads an absent billing_deadline column (migration not applied) as not recorded', () => {
    const row = fixtureRow();
    delete (row as Partial<BatchRowWithProgram>).billing_deadline;
    const batch = mapBatchRow(row);
    expect(batch.billingDeadline).toBeNull();
    expect(batch.daysToBilling).toBe(Number.POSITIVE_INFINITY);
  });

  it('reports session progress as unavailable when no attendance is recorded', () => {
    const batch = mapBatchRow(fixtureRow({ total_sessions: 45, attendance_records: [] }));
    expect(batch.completedSessions).toBeNull();
    expect(batch.totalSessions).toBe(45);
  });

  it('reports session progress as unavailable when total_sessions is not snapshotted', () => {
    const batch = mapBatchRow(fixtureRow({
      total_sessions: null,
      attendance_records: [{ attendance_date: '2026-02-01', present: true }],
    }));
    expect(batch.completedSessions).toBeNull();
  });

  it('keeps the blocked fact that status normalization folds into pending', () => {
    expect(mapBatchRow(fixtureRow({ status: 'blocked' })).blocked).toBe(true);
    expect(mapBatchRow(fixtureRow({ current_stage: 'blocked' })).blocked).toBe(true);
    expect(mapBatchRow(fixtureRow()).blocked).toBe(false);
  });

  it('maps the program catalog, treating is_required as the critical measure', () => {
    const batch = mapBatchRow(fixtureRow({
      scholarship_programs: {
        code: 'TWSP',
        program_document_requirements: [
          { id: 'r1', program_id: 'program-1', document_key: 'ntp', document_name: 'Notice to Proceed', description: null, required_for_stage: 'ntp', audience: 'all', is_required: true, sort_order: 1, created_at: '', updated_at: '' },
          { id: 'r2', program_id: 'program-1', document_key: 'photos', document_name: 'Photos', description: null, required_for_stage: null, audience: 'all', is_required: false, sort_order: 2, created_at: '', updated_at: '' },
        ],
      } as unknown as BatchRowWithProgram['scholarship_programs'],
    }));
    expect(batch.documentRequirements).toEqual([
      expect.objectContaining({ key: 'ntp', label: 'Notice to Proceed', stage: 'ntp', critical: true }),
      expect.objectContaining({ key: 'photos', critical: false, stage: '' }),
    ]);
  });

  it('never claims an NTP lag it has no dates for', () => {
    expect(mapBatchRow(fixtureRow()).ntpLag).toBeNull();
  });
});
