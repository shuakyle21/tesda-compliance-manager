import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findTakenRqmCodes } from '@/modules/batches/data/createBatches';

const m = vi.hoisted(() => ({ configured: true, results: {} as Record<string, unknown>, inCalls: [] as unknown[][], eqCalls: [] as unknown[][] }));

vi.mock('@/lib/supabase/server', () => ({
  isSupabaseConfigured: () => m.configured,
  // `select(column)` picks the canned result for that column; `.in` is the terminal call.
  createSupabaseServerClient: async () => ({
    from: () => ({
      select: (column: string) => {
        const chain = {
          eq: (...a: unknown[]) => (m.eqCalls.push(a), chain),
          in: async (...a: unknown[]) => (m.inCalls.push(a), m.results[column]),
        };
        return chain;
      },
    }),
  }),
}));

const A = 'RQM3-2026-CFSP-1263-0009';
const B = 'RQM3-2026-CFSP-1263-0010';
const C = 'RQM3-2026-CFSP-1263-0011';

describe('findTakenRqmCodes', () => {
  beforeEach(() => {
    m.configured = true;
    m.inCalls = [];
    m.eqCalls = [];
    m.results = { rqm_code: { data: [], error: null }, batch_code: { data: [], error: null } };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns the used codes from either column, once each, in submitted order', async () => {
    m.results = { rqm_code: { data: [{ rqm_code: C }, { rqm_code: A }], error: null }, batch_code: { data: [{ batch_code: A }], error: null } };
    expect(await findTakenRqmCodes('t-1', [A, B, C])).toEqual({ status: 'ok', codes: [A, C] });
    expect(m.eqCalls).toEqual([['tenant_id', 't-1'], ['tenant_id', 't-1']]);
    expect(m.inCalls).toEqual([['rqm_code', [A, B, C]], ['batch_code', [A, B, C]]]);
  });

  it('reports a code found in both columns once, even when it was submitted twice', async () => {
    m.results = { rqm_code: { data: [{ rqm_code: A }], error: null }, batch_code: { data: [{ batch_code: A }], error: null } };
    expect(await findTakenRqmCodes('t-1', [B, A, A])).toEqual({ status: 'ok', codes: [A] });
  });

  it('is empty when nothing is taken, and skips the query for no codes', async () => {
    expect(await findTakenRqmCodes('t-1', [A])).toEqual({ status: 'ok', codes: [] });
    m.inCalls = [];
    expect(await findTakenRqmCodes('t-1', [])).toEqual({ status: 'ok', codes: [] });
    expect(m.inCalls).toEqual([]);
  });

  it('reports sync-failed, without the error, when either query fails', async () => {
    m.results.batch_code = { data: null, error: { message: 'secret detail' } };
    expect(await findTakenRqmCodes('t-1', [A])).toEqual({ status: 'sync-failed' });
  });

  it('reports unconfigured when Supabase is not set up', async () => {
    m.configured = false;
    expect(await findTakenRqmCodes('t-1', [A])).toEqual({ status: 'unconfigured' });
  });
});
