import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRqmCode,
  findRqmCodes,
  joinPdfTextItems,
  normalizeRqmCode,
  ntpReadOutcome,
  takenRqmCodes,
  type PdfTextPiece,
} from '@/modules/batches/domain/rqm';
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

describe('normalizeRqmCode, invisible and wide characters', () => {
  it('folds U+2015 and U+FF0D to a hyphen', () => {
    expect(normalizeRqmCode('RQM3\u20152026\uFF0DCFSP-0000-0001')).toBe(CODE);
  });
  it('strips zero-width characters', () => {
    expect(normalizeRqmCode('RQM3\u200B-2026\u200C-CFSP\u200D-0000\uFEFF-0001')).toBe(CODE);
  });
});

describe('checkRqmCode', () => {
  it('rejects a six-part value', () => {
    expect(checkRqmCode('RQM3-2026-CFSP-0000-0001-0002', CTX).ok).toBe(false);
  });
  it('does not warn when the provider numbers are numerically equal', () => {
    expect(checkRqmCode('RQM3-2026-CFSP-01263-0001', { program: 'CFSP', providerCode: '1263' })).toMatchObject({ warnings: [] });
    expect(checkRqmCode('RQM3-2026-CFSP-1263-0001', { program: 'CFSP', providerCode: '01263' })).toMatchObject({ warnings: [] });
  });
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
    const row = '1 RQM3‐2026‐CFSP‐0000‐0001 Sample Province Sample Qualification NC II 10 100,000.00 01 January 2026';
    expect(findRqmCodes(row)).toEqual(['RQM3-2026-CFSP-0000-0001']);
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

describe('findRqmCodes, hardening', () => {
  it('does not return a truncated code glued to letters or digits', () => {
    expect(findRqmCodes('RQM3-2026-CFSP-0000-0009ABC')).toEqual([]);
    expect(findRqmCodes('xRQM3-2026-CFSP-0000-0009')).toEqual([]);
  });
  it('does not return either code of two glued together', () => {
    expect(findRqmCodes('RQM3-2026-CFSP-0000-0001RQM3-2026-CFSP-0000-0002')).toEqual([]);
  });
  it('does not return a six-part value', () => {
    expect(findRqmCodes('RQM3-2026-CFSP-0000-0001-0002')).toEqual([]);
  });
  it('finds a code split across a line break after a hyphen', () => {
    expect(findRqmCodes('row RQM3-2026-CFSP-0000-\n0001 Sample Province')).toEqual(['RQM3-2026-CFSP-0000-0001']);
  });
  it('finds a code with spaces around its hyphens, without joining neighbouring words', () => {
    expect(findRqmCodes('Total - RQM3 - 2026 - CFSP - 0000 - 0001 end')).toEqual([CODE]);
  });
  it('folds U+2015, U+FF0D and zero-width characters', () => {
    expect(findRqmCodes('RQM3\u20152026\uFF0DCFSP-0000\u200B-0001')).toEqual([CODE]);
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

describe('ntpReadOutcome', () => {
  const A = 'RQM3-2026-CFSP-0000-0001';
  const B = 'RQM3-2026-CFSP-0000-0002';
  const C = 'RQM3-2026-CFSP-0000-0003';
  const read = (text: string) => ({ ok: true as const, text });

  it('says so when the text holds no five-part code', () => {
    expect(ntpReadOutcome(read('Request RQM3-2026-CFSP-12 only'), null)).toEqual({
      kind: 'message',
      message: 'No RQM code was found in this PDF. Type the code from the document.',
    });
  });
  it('offers one code', () => {
    expect(ntpReadOutcome(read(`1 ${A} Course`), null)).toEqual({ kind: 'options', options: [{ code: A, mark: null, disabled: false }] });
  });
  it('keeps several codes in document order', () => {
    const out = ntpReadOutcome(read(`${B} x ${A} y ${C}`), null);
    expect(out.kind === 'options' && out.options.map((o) => o.code)).toEqual([B, A, C]);
  });
  it('marks and disables a code taken by another batch', () => {
    const out = ntpReadOutcome(read(`${A} ${B}`), null, [B]);
    expect(out).toEqual({
      kind: 'options',
      options: [{ code: A, mark: null, disabled: false }, { code: B, mark: 'taken', disabled: true }],
    });
  });
  it("marks this batch's current code without disabling it", () => {
    const out = ntpReadOutcome(read(`${A} ${B}`), A, [A, B]);
    expect(out).toEqual({
      kind: 'options',
      options: [{ code: A, mark: 'current', disabled: false }, { code: B, mark: 'taken', disabled: true }],
    });
  });
  it.each([
    ['no-text', 'This PDF has no readable text (it may be a scan). Type the code from the document.'],
    ['unreadable', "This PDF couldn't be read. Type the code from the document."],
    ['too-large', 'This file is too large to read.'],
    ['not-pdf', 'Choose a PDF file.'],
  ] as const)('maps %s to its message', (reason, message) => {
    expect(ntpReadOutcome({ ok: false, reason }, null)).toEqual({ kind: 'message', message });
  });
});

it('ntpReadOutcome carries truncated through, and only when set', () => {
  const text = 'RQM3-2026-CFSP-0000-0001';
  expect(ntpReadOutcome({ ok: true, text, truncated: true }, null)).toMatchObject({ kind: 'options', truncated: true });
  expect(ntpReadOutcome({ ok: true, text: 'nothing', truncated: true }, null)).toMatchObject({ kind: 'message', truncated: true });
  expect(ntpReadOutcome({ ok: true, text }, null)).not.toHaveProperty('truncated');
});

describe('joinPdfTextItems with findRqmCodes', () => {
  // height 10: a gap over 2.5 is a cell break, a line offset over 5 is a new line.
  const piece = (str: string, x: number, y = 100, over: Partial<PdfTextPiece> = {}): PdfTextPiece => ({
    str,
    x,
    y,
    width: str.length * 5,
    height: 10,
    hasEOL: false,
    ...over,
  });
  const codes = (items: PdfTextPiece[]) => findRqmCodes(joinPdfTextItems(items));

  it('rejoins a code split across adjacent items and keeps the next cell apart', () => {
    const first = piece('RQM3-2026-CFSP-0000-00', 0);
    const second = piece('01', first.x + first.width);
    expect(codes([first, second, piece('Sample Province', second.x + second.width + 40)])).toEqual(['RQM3-2026-CFSP-0000-0001']);
  });
  it('rejoins a split inside a segment', () => {
    const first = piece('RQM3-2026-CFSP-00', 0);
    expect(codes([first, piece('00-0001', first.x + first.width)])).toEqual([CODE]);
  });
  it('rejoins one item per character', () => {
    expect(codes([...CODE].map((ch, i) => piece(ch, i * 5)))).toEqual([CODE]);
  });
  it('does not glue a code to a distant cell', () => {
    const code = piece(CODE, 0);
    expect(codes([code, piece('Sample', code.x + code.width + 30)])).toEqual([CODE]);
  });
  it('reads two rows on different lines as two codes, in order', () => {
    const second = 'RQM3-2026-CFSP-0000-0002';
    expect(codes([piece(second, 0, 200), piece(CODE, 0, 180)])).toEqual([second, CODE]);
  });
  it('starts a new line after hasEOL even when y is equal', () => {
    expect(joinPdfTextItems([piece('a', 0, 100, { hasEOL: true }), piece('b', 5)])).toBe('a\nb');
  });
  it('keeps a single space for whitespace items and treats overlap as adjacent', () => {
    expect(joinPdfTextItems([piece('a', 0), piece(' ', 5), piece('', 6), piece('b', 10)])).toBe('a b');
    expect(joinPdfTextItems([piece('a', 0), piece('b', 3)])).toBe('ab');
  });
});

describe('takenRqmCodes', () => {
  it("returns other batches' codes, skipping this batch, null and empty", () => {
    const batches = [
      { id: 'B1', rqmCode: 'RQM3-2026-CFSP-0000-0001' },
      { id: 'B2', rqmCode: 'RQM3-2026-CFSP-0000-0002' },
      { id: 'B3', rqmCode: null },
      { id: 'B4', rqmCode: '' },
    ];
    expect(takenRqmCodes(batches, 'B1')).toEqual(['RQM3-2026-CFSP-0000-0002']);
    expect(takenRqmCodes(batches, 'other')).toEqual(['RQM3-2026-CFSP-0000-0001', 'RQM3-2026-CFSP-0000-0002']);
  });
});
