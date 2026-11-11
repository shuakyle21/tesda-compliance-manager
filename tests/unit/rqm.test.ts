import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRqmCode, findRqmCodes, normalizeRqmCode } from '@/modules/batches/domain/rqm';
import { setBatchRqmCode } from '@/modules/batches/data/batches';

const { selectMock, isMock, eqMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  isMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => {
  // Every filter returns the same chain; `select` is the terminal call.
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = eqMock.mockImplementation(() => chain);
  chain.is = isMock.mockImplementation(() => chain);
  chain.select = selectMock;
  return {
    isSupabaseConfigured: () => true,
    createSupabaseServerClient: async () => ({ from: () => chain }),
  };
});

const CODE = 'RQM3-2026-CFSP-0000-0001';
const CTX = { program: 'CFSP', providerCode: '0000' };

describe('normalizeRqmCode', () => {
  it('folds Unicode dashes to ASCII hyphens', () => {
    expect(normalizeRqmCode('RQM3‐2026‑CFSP‒0000–1—' + '0001')).toBe('RQM3-2026-CFSP-0000-1-0001');
    expect(normalizeRqmCode('RQM3‐2026‐CFSP‐0000‐0001')).toBe(CODE);
    expect(normalizeRqmCode('RQM3−2026-CFSP-0000-0001')).toBe(CODE);
  });
  it('drops soft hyphens, upper-cases and trims', () => {
    expect(normalizeRqmCode('  rqm3-2026-cfsp-0000-00­01 ')).toBe(CODE);
  });
  it('removes spaces, including around hyphens and NBSP', () => {
    expect(normalizeRqmCode('RQM3 - 2026 -CFSP- 0000 - 0001')).toBe(CODE);
  });
});

describe('checkRqmCode', () => {
  it('accepts a well-formed code and returns it normalized', () => {
    expect(checkRqmCode(' rqm3‐2026‐cfsp‐0000‐0001 ', CTX)).toEqual({ ok: true, code: CODE, warnings: [] });
  });
  it('rejects empty input', () => {
    expect(checkRqmCode('  ', CTX)).toEqual({ ok: false, error: 'Enter the RQM code from the Notice to Proceed.' });
  });
  it('rejects the wrong shape', () => {
    const r = checkRqmCode('RQM3-2026-0000-0001', CTX);
    expect(r).toEqual({ ok: false, error: "That doesn't look like an RQM code. It should look like RQM3-2026-CFSP-0000-0001." });
  });
  it('gives the four-part request number its own message', () => {
    expect(checkRqmCode('RQM3-2026-CFSP-12', CTX)).toEqual({
      ok: false,
      error: 'That is the request number. Use the RQM code from the table row, which has five parts.',
    });
  });
  it('caps the length at 64', () => {
    const long = `RQM3-2026-CFSP-${'1'.repeat(60)}-0001`;
    expect(checkRqmCode(long, CTX).ok).toBe(false);
  });
  it('warns, without blocking, when the program differs', () => {
    expect(checkRqmCode(CODE, { program: 'TWSP', providerCode: '0000' })).toEqual({
      ok: true,
      code: CODE,
      warnings: ["The code's program (CFSP) differs from this batch's program (TWSP)."],
    });
  });
  it('warns when the provider number differs', () => {
    expect(checkRqmCode(CODE, { program: 'CFSP', providerCode: '1263' })).toEqual({
      ok: true,
      code: CODE,
      warnings: ["The code's provider number (0000) differs from this school's TESDA provider code (1263)."],
    });
  });
  it('does not warn about the provider when none is recorded, or about an unknown program', () => {
    expect(checkRqmCode(CODE, { program: 'CFSP', providerCode: null })).toMatchObject({ warnings: [] });
    expect(checkRqmCode(CODE, { program: 'CFSP', providerCode: '' })).toMatchObject({ warnings: [] });
    expect(checkRqmCode(CODE, { program: '', providerCode: null })).toMatchObject({ warnings: [] });
  });
});

describe('findRqmCodes', () => {
  it('finds nothing in text without a code', () => {
    expect(findRqmCodes('Notice to Proceed for the following programs')).toEqual([]);
  });
  it('finds one code with U+2010 hyphens inside a table row', () => {
    const row = '1 RQM3‐2026‐CFSP‐1263‐0009 South Cotabato Agricultural Crops Production NC II 17 416,343.60 15 April 2026';
    expect(findRqmCodes(row)).toEqual(['RQM3-2026-CFSP-1263-0009']);
  });
  it('finds several, de-duplicated, in order of first appearance', () => {
    const text = 'b RQM3-2026-CFSP-0000-0002 a RQM3-2026-CFSP-0000-0001 again rqm3-2026-cfsp-0000-0002';
    expect(findRqmCodes(text)).toEqual(['RQM3-2026-CFSP-0000-0002', 'RQM3-2026-CFSP-0000-0001']);
  });
  it('never returns a four-part request number', () => {
    expect(findRqmCodes('the following programs in RQM3‐2026‐CFSP‐12 have been approved')).toEqual([]);
  });
  it('does not return the four-part prefix of a five-part code separately', () => {
    expect(findRqmCodes('Request RQM3-2026-CFSP-12: RQM3-2026-CFSP-12-0001')).toEqual(['RQM3-2026-CFSP-12-0001']);
  });
});

describe('setBatchRqmCode', () => {
  const args = { tenantId: 't-1', batchCode: 'BAT-2', expectedPrevious: null, next: CODE };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports saved with the batch uuid when a row is updated', async () => {
    selectMock.mockResolvedValue({ data: [{ id: 'uuid-1' }], error: null });
    expect(await setBatchRqmCode(args)).toEqual({ status: 'saved', batchUuid: 'uuid-1', from: null, to: CODE });
    expect(isMock).toHaveBeenCalledWith('rqm_code', null);
  });
  it('guards on the previous value when there is one', async () => {
    selectMock.mockResolvedValue({ data: [{ id: 'uuid-1' }], error: null });
    await setBatchRqmCode({ ...args, expectedPrevious: 'OLD' });
    expect(eqMock).toHaveBeenCalledWith('rqm_code', 'OLD');
    expect(isMock).not.toHaveBeenCalled();
  });
  it('treats zero rows as conflict-or-denied', async () => {
    selectMock.mockResolvedValue({ data: [], error: null });
    expect(await setBatchRqmCode(args)).toEqual({ status: 'conflict-or-denied' });
  });
  it('maps unique violation 23505 to duplicate', async () => {
    selectMock.mockResolvedValue({ data: null, error: { code: '23505', message: 'raw detail' } });
    expect(await setBatchRqmCode(args)).toEqual({ status: 'duplicate' });
  });
  it('returns sync-failed for other errors without leaking the message', async () => {
    selectMock.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'raw detail' } });
    const result = await setBatchRqmCode(args);
    expect(result).toEqual({ status: 'sync-failed' });
    expect(JSON.stringify(result)).not.toContain('raw detail');
  });
});
