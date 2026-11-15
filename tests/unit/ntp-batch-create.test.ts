import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  draftRowsFromJson,
  MAX_APPROVED_SLOTS,
  MAX_NTP_ROWS,
  manilaToday,
  normalizeForMatch,
  parseNtpDate,
  parseNtpText,
  programOfRqmCode,
  tooLargeToSend,
  validateNtpSubmission,
  type NtpDraftRow,
} from '@/modules/batches/domain/ntp';
import { aouOnFile, fiscalYearOf } from '@/modules/tenancy/domain/aou';

const fixture = (name: string) => readFileSync(join(__dirname, '..', 'fixtures', name), 'utf8');

describe('parseNtpDate', () => {
  it('reads a day, month name and year', () => {
    expect(parseNtpDate('03 February 2024')).toBe('2024-02-03');
    expect(parseNtpDate('5 april 2026')).toBe('2026-04-05');
  });
  it('reads yyyy-mm-dd', () => expect(parseNtpDate('2026-04-15')).toBe('2026-04-15'));
  it('refuses a numeric date, whose day and month order is ambiguous', () => expect(parseNtpDate('03/02/2024')).toBeNull());
  it('refuses an impossible date', () => {
    expect(parseNtpDate('31 February 2024')).toBeNull();
    expect(parseNtpDate('2024-02-30')).toBeNull();
  });
});

describe('parseNtpText', () => {
  it('reads the one-row 2026 NTP', () => {
    const draft = parseNtpText(fixture('ntp-2026-one-row.txt'), { province: 'South Cotabato' });
    expect(draft).toEqual({
      schoolName: 'NENITA FARM RICE-BASED FARM',
      ntpDate: '2026-04-15',
      approvalDate: '2026-04-06',
      rows: [
        {
          rqmCode: 'RQM3-2026-CFSP-1263-0009',
          province: 'South Cotabato',
          qualification: 'Agricultural Crops Production NC II',
          approvedSlots: '17',
          totalAmount: '416343.60',
          indicativeStartDate: '2026-04-15',
        },
      ],
    });
  });

  it('reads rows whose code, province and qualification wrap across lines', () => {
    const draft = parseNtpText(fixture('ntp-2024-wrapped.txt'), { province: 'South Cotabato' });
    expect(draft.rows.map((r) => r.rqmCode)).toEqual(['RQM2-2024-RESP-1263-0029', 'RQM2-2024-RESP-1263-0035']);
    expect(draft.rows[0]).toMatchObject({
      qualification: 'Production of High-Quality Inbred Rice, and Seed Certification, and Farm Mechanization',
      approvedSlots: '25',
      totalAmount: '318000.00',
      indicativeStartDate: '2024-02-06',
    });
    expect(draft.rows[1]).toMatchObject({ qualification: 'Rice Machinery Operations NC II', indicativeStartDate: '2024-03-19' });
  });

  it('leaves the province in the qualification when it is not the school province, for the coordinator to correct', () => {
    const draft = parseNtpText(fixture('ntp-2026-one-row.txt'), { province: 'Laguna' });
    expect(draft.rows[0]!.qualification).toBe('South Cotabato Agricultural Crops Production NC II');
  });

  it('sets the row province only when the row starts with the school province', () => {
    const text = fixture('ntp-2026-one-row.txt');
    expect(parseNtpText(text, { province: 'south cotabato' }).rows[0]!.province).toBe('south cotabato');
    expect(parseNtpText(text, { province: 'Laguna' }).rows[0]!.province).toBe('');
    expect(parseNtpText(text, { province: '' }).rows[0]!.province).toBe('');
  });

  it('returns no rows and empty dates for text that is not an NTP', () => {
    expect(parseNtpText('Hello\nworld', { province: '' })).toEqual({ schoolName: '', ntpDate: '', approvalDate: '', rows: [] });
  });
});

const ROW: NtpDraftRow = {
  rqmCode: 'RQM3-2026-CFSP-1263-0009',
  province: 'South Cotabato',
  qualification: 'Agricultural Crops Production NC II',
  approvedSlots: '17',
  totalAmount: '416343.60',
  indicativeStartDate: '2026-04-15',
};
const SCHOOL = { name: 'Nenita Farm Rice-Based Farm', province: 'South Cotabato' };
const BASE = { schoolName: 'NENITA FARM RICE\u2010BASED FARM', receiptDate: '2026-04-16', ntpDate: '2026-04-15', approvalDate: '2026-04-06', rows: [ROW] };
const TODAY = '2026-04-20';

describe('validateNtpSubmission', () => {
  it('accepts a valid NTP and derives the program from the code', () => {
    expect(validateNtpSubmission(BASE, SCHOOL, TODAY)).toEqual({
      ok: true,
      value: {
        receiptDate: '2026-04-16',
        ntpDate: '2026-04-15',
        approvalDate: '2026-04-06',
        rows: [
          {
            rqmCode: 'RQM3-2026-CFSP-1263-0009',
            programCode: 'CFSP',
            qualificationTitle: 'Agricultural Crops Production NC II',
            approvedSlots: 17,
            totalAmount: '416343.60',
            indicativeStartDate: '2026-04-15',
          },
        ],
      },
    });
  });

  it('accepts a receipt date already past the 15-day window', () => {
    expect(validateNtpSubmission({ ...BASE, receiptDate: '2026-04-16' }, SCHOOL, '2026-06-01').ok).toBe(true);
  });

  it.each([
    ['a receipt date in the future', { receiptDate: '2026-04-21' }, 'cannot be in the future'],
    ['a receipt date before the NTP date', { receiptDate: '2026-04-14' }, 'cannot be before'],
    ['a missing receipt date', { receiptDate: '' }, 'received the Notice'],
    ['a missing NTP date', { ntpDate: '' }, 'date shown'],
    ['no rows', { rows: [] }, 'No allocation rows'],
    ['zero slots', { rows: [{ ...ROW, approvedSlots: '0' }] }, 'at least 1'],
    ['a negative amount', { rows: [{ ...ROW, totalAmount: '-5' }] }, 'not negative'],
    ['a malformed code', { rows: [{ ...ROW, rqmCode: 'RQM3-2026-CFSP-1263' }] }, 'should look like'],
    ['a missing start date', { rows: [{ ...ROW, indicativeStartDate: '' }] }, 'indicative start date'],
    ['a duplicate code', { rows: [ROW, ROW] }, 'more than once'],
    ['slots above the limit', { rows: [{ ...ROW, approvedSlots: '1001' }] }, 'Row 1: approved slots cannot be more than 1,000.'],
    ['a 20-digit slot count', { rows: [{ ...ROW, approvedSlots: '99999999999999999999' }] }, 'cannot be more than 1,000'],
    ['an over-long RQM code', { rows: [{ ...ROW, rqmCode: `RQM3-2026-CFSP-1263-${'1'.repeat(60)}` }] }, 'should look like'],
  ])('refuses %s', (_label, change, message) => {
    const result = validateNtpSubmission({ ...BASE, ...change }, SCHOOL, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it('rejects the whole NTP when one row of several is bad', () => {
    const second = { ...ROW, rqmCode: 'RQM3-2026-CFSP-1263-0010', approvedSlots: 'x' };
    const result = validateNtpSubmission({ ...BASE, rows: [ROW, second] }, SCHOOL, TODAY);
    expect(result).toEqual({ ok: false, error: 'Row 2: approved slots must be a whole number of at least 1.' });
  });

  it('accepts slots at the limit and reads leading zeros as a number', () => {
    const at = (approvedSlots: string) => validateNtpSubmission({ ...BASE, rows: [{ ...ROW, approvedSlots }] }, SCHOOL, TODAY);
    const slots = (r: ReturnType<typeof at>) => (r.ok ? r.value.rows[0]!.approvedSlots : null);
    expect(slots(at(String(MAX_APPROVED_SLOTS)))).toBe(1000);
    expect(slots(at('0017'))).toBe(17);
  });

  it('refuses more rows than the limit', () => {
    const rows = Array.from({ length: MAX_NTP_ROWS + 1 }, (_, i) => ({ ...ROW, rqmCode: `RQM3-2026-CFSP-1263-${String(i + 1).padStart(4, '0')}` }));
    expect(validateNtpSubmission({ ...BASE, rows }, SCHOOL, TODAY)).toEqual({
      ok: false,
      error: 'A Notice to Proceed can have at most 100 rows here. This one has 101.',
    });
    expect(validateNtpSubmission({ ...BASE, rows: rows.slice(0, MAX_NTP_ROWS) }, SCHOOL, TODAY).ok).toBe(true);
  });

  it('strips peso signs and commas from the amount', () => {
    const result = validateNtpSubmission({ ...BASE, rows: [{ ...ROW, totalAmount: '₱416,343.60' }] }, SCHOOL, TODAY);
    expect(result.ok && result.value.rows[0]!.totalAmount).toBe('416343.60');
  });
});

describe('normalizeForMatch', () => {
  it('ignores case, punctuation, Unicode hyphens and extra spaces', () => {
    const forms = ['NENITA FARM RICE\u2010BASED FARM', 'Nenita Farm Rice-Based Farm', '  nenita farm, rice based farm. '];
    expect(forms.map(normalizeForMatch)).toEqual(Array(3).fill('nenita farm rice based farm'));
  });
  it('keeps letters and digits, folding accents', () => {
    expect(normalizeForMatch('Niño #2 (Cotabato)')).toBe('nino 2 cotabato');
    expect(normalizeForMatch('...')).toBe('');
  });
});

describe('validateNtpSubmission, the school and its province', () => {
  const run = (change: object, school = SCHOOL) => validateNtpSubmission({ ...BASE, ...change }, school, TODAY);
  const error = (r: ReturnType<typeof run>) => (r.ok ? null : r.error);

  it('refuses a Notice to Proceed for a different school, naming both', () => {
    expect(error(run({ schoolName: 'Other Training Center' }))).toBe(
      'This Notice to Proceed is for a different school. It names "Other Training Center", and this school is "Nenita Farm Rice-Based Farm".',
    );
  });
  it('asks for the school name when the NTP one is empty after normalising', () => {
    expect(error(run({ schoolName: ' - ' }))).toBe('Enter the school name shown on the Notice to Proceed.');
  });
  it('refuses when the school has no province on record', () => {
    expect(error(run({}, { ...SCHOOL, province: ' ' }))).toBe('This school has no province on record. Set the province before recording a Notice to Proceed.');
  });
  it('refuses an empty row province and a different one', () => {
    expect(error(run({ rows: [ROW, { ...ROW, province: '' }] }))).toBe('Row 2: enter the province shown on this row.');
    expect(error(run({ rows: [{ ...ROW, province: 'Laguna' }] }))).toBe('Row 1 is for a different province. This school is in South Cotabato.');
  });
  it('accepts a row province that differs only in case and punctuation', () => {
    expect(run({ rows: [{ ...ROW, province: 'south-cotabato.' }] }).ok).toBe(true);
  });
  it('reports in order: school, province, row error, duplicate', () => {
    const badRow = { ...ROW, province: 'Laguna', approvedSlots: '0' };
    expect(error(run({ schoolName: 'Other', rows: [badRow] }))).toContain('different school');
    expect(error(run({ rows: [ROW, badRow] }))).toContain('different province');
    expect(error(run({ rows: [{ ...ROW, approvedSlots: '0' }, { ...ROW, province: '' }] }))).toBe('Row 2: enter the province shown on this row.');
    expect(error(run({ rows: [ROW, ROW, { ...ROW, qualification: '' }] }))).toBe('Row 3: enter the qualification.');
    expect(error(run({ rows: [ROW, ROW] }))).toContain('more than once');
  });
});

describe('validateNtpSubmission, where the date checks sit in the order', () => {
  const error = (change: object) => {
    const r = validateNtpSubmission({ ...BASE, ...change }, SCHOOL, TODAY);
    return r.ok ? null : r.error;
  };
  it('reports a province mismatch before a bad date', () => {
    expect(error({ ntpDate: '', rows: [{ ...ROW, province: 'Laguna' }] })).toContain('different province');
  });
  it('reports a bad date before a row error', () => {
    expect(error({ ntpDate: '', rows: [{ ...ROW, approvedSlots: '0' }] })).toBe('Enter the date shown on the Notice to Proceed.');
    expect(error({ receiptDate: '2026-04-21', rows: [{ ...ROW, approvedSlots: '0' }] })).toContain('cannot be in the future');
  });
});

describe('normalizeForMatch, accents', () => {
  it('treats composed, decomposed and unaccented spellings as the same', () => {
    const composed = 'Para\u00f1aque';
    const decomposed = 'Para\u006e\u0303aque';
    expect(composed).not.toBe(decomposed);
    expect(normalizeForMatch(composed)).toBe('paranaque');
    expect(normalizeForMatch(decomposed)).toBe('paranaque');
    expect(normalizeForMatch('Paranaque')).toBe('paranaque');
  });
  it('matches a school name across those forms', () => {
    const school = { name: 'Las Pi\u00f1as Farm School', province: 'South Cotabato' };
    const named = (schoolName: string) => validateNtpSubmission({ ...BASE, schoolName }, school, TODAY).ok;
    expect(named('LAS PI\u006e\u0303AS FARM SCHOOL')).toBe(true);
    expect(named('Las Pinas Farm School')).toBe(true);
  });
});

describe('validateNtpSubmission, the real NTP fixture', () => {
  it('refuses the school name printed on the real NTP for a school registered as "Nenita Farm Rice-Based School" (the seed data name)', () => {
    const draft = parseNtpText(fixture('ntp-2026-one-row.txt'), { province: 'South Cotabato' });
    const result = validateNtpSubmission({ ...BASE, schoolName: draft.schoolName, rows: draft.rows }, { name: 'Nenita Farm Rice-Based School', province: 'South Cotabato' }, TODAY);
    expect(result).toEqual({
      ok: false,
      error: 'This Notice to Proceed is for a different school. It names "NENITA FARM RICE-BASED FARM", and this school is "Nenita Farm Rice-Based School".',
    });
  });
});

describe('manilaToday', () => {
  it('is already the next day in Manila between 16:00 and 24:00 UTC', () => {
    expect(manilaToday(new Date('2026-04-15T16:30:00Z'))).toBe('2026-04-16');
  });
  it('is the same day as UTC before 16:00 UTC', () => {
    expect(manilaToday(new Date('2026-04-15T15:59:00Z'))).toBe('2026-04-15');
  });
});

describe('draftRowsFromJson', () => {
  it('keeps text fields and blanks anything else', () => {
    expect(draftRowsFromJson(JSON.stringify([{ rqmCode: 'X', approvedSlots: 17, extra: 'y' }]))).toEqual([
      { rqmCode: 'X', province: '', qualification: '', approvedSlots: '', totalAmount: '', indicativeStartDate: '' },
    ]);
  });
  it('treats non-JSON and non-arrays as no rows', () => {
    expect(draftRowsFromJson('{oops')).toEqual([]);
    expect(draftRowsFromJson('{"a":1}')).toEqual([]);
  });
});

describe('tooLargeToSend', () => {
  it('keeps the files together under the Server Action body limit', () => {
    expect(tooLargeToSend([2 * 1024 * 1024, 3 * 1024 * 1024])).toBe(false);
    expect(tooLargeToSend([3 * 1024 * 1024, 3 * 1024 * 1024])).toBe(true);
  });
});

describe('programOfRqmCode', () => {
  it('reads the program segment', () => expect(programOfRqmCode('RQM2-2024-RESP-1263-0029')).toBe('RESP'));
});

describe('fiscal year of the AOU', () => {
  it('is the calendar year of the receipt date, at the year boundary too', () => {
    expect(fiscalYearOf('2026-12-31')).toBe(2026);
    expect(fiscalYearOf('2027-01-01')).toBe(2027);
  });
  it('is on file only for the receipt date year', () => {
    expect(aouOnFile([2026], '2026-12-31')).toBe(true);
    expect(aouOnFile([2026], '2027-01-01')).toBe(false);
  });
});
