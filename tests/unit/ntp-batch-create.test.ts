import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  draftRowsFromJson,
  manilaToday,
  parseNtpDate,
  parseNtpText,
  programOfRqmCode,
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

  it('returns no rows and empty dates for text that is not an NTP', () => {
    expect(parseNtpText('Hello\nworld', { province: '' })).toEqual({ schoolName: '', ntpDate: '', approvalDate: '', rows: [] });
  });
});

const ROW: NtpDraftRow = {
  rqmCode: 'RQM3-2026-CFSP-1263-0009',
  qualification: 'Agricultural Crops Production NC II',
  approvedSlots: '17',
  totalAmount: '416343.60',
  indicativeStartDate: '2026-04-15',
};
const BASE = { receiptDate: '2026-04-16', ntpDate: '2026-04-15', approvalDate: '2026-04-06', rows: [ROW] };
const TODAY = '2026-04-20';

describe('validateNtpSubmission', () => {
  it('accepts a valid NTP and derives the program from the code', () => {
    expect(validateNtpSubmission(BASE, TODAY)).toEqual({
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
    expect(validateNtpSubmission({ ...BASE, receiptDate: '2026-04-16' }, '2026-06-01').ok).toBe(true);
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
  ])('refuses %s', (_label, change, message) => {
    const result = validateNtpSubmission({ ...BASE, ...change }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it('rejects the whole NTP when one row of several is bad', () => {
    const second = { ...ROW, rqmCode: 'RQM3-2026-CFSP-1263-0010', approvedSlots: 'x' };
    const result = validateNtpSubmission({ ...BASE, rows: [ROW, second] }, TODAY);
    expect(result).toEqual({ ok: false, error: 'Row 2: approved slots must be a whole number of at least 1.' });
  });

  it('strips peso signs and commas from the amount', () => {
    const result = validateNtpSubmission({ ...BASE, rows: [{ ...ROW, totalAmount: '₱416,343.60' }] }, TODAY);
    expect(result.ok && result.value.rows[0]!.totalAmount).toBe('416343.60');
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
      { rqmCode: 'X', qualification: '', approvedSlots: '', totalAmount: '', indicativeStartDate: '' },
    ]);
  });
  it('treats non-JSON and non-arrays as no rows', () => {
    expect(draftRowsFromJson('{oops')).toEqual([]);
    expect(draftRowsFromJson('{"a":1}')).toEqual([]);
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
