/**
 * Creating batches from a Notice to Proceed (NTP) — ADR-009 NTP1-NTP8. Pure.
 *
 * The browser reads the PDF text (`ui/ntpPdfText.ts`), `parseNtpText` turns it
 * into an editable draft, the coordinator corrects it, and `validateNtpSubmission`
 * decides what may be saved. The Server Action runs the same validation again,
 * because nothing from the browser is trusted.
 */

import { RQM_CODE_PATTERN, findRqmCodes, normalizeRqmCode } from './rqm';

/** One allocation row as the coordinator edits it. Every field is text so an unread value can be typed. */
export type NtpDraftRow = {
  rqmCode: string;
  qualification: string;
  approvedSlots: string;
  totalAmount: string;
  /** yyyy-mm-dd, or '' when the PDF value could not be read. */
  indicativeStartDate: string;
};

export type NtpDraft = {
  schoolName: string;
  /** The "Date:" line above the school (yyyy-mm-dd or ''). */
  ntpDate: string;
  /** "approved by TESDA on <date>" (yyyy-mm-dd or ''). */
  approvalDate: string;
  rows: NtpDraftRow[];
};

/** A row that passed validation, ready for the create-batches function. */
export type NtpBatchInput = {
  rqmCode: string;
  /** The program segment of the RQM code, e.g. CFSP. */
  programCode: string;
  qualificationTitle: string;
  approvedSlots: number;
  /** Decimal text with at most two places, e.g. "416343.60"; kept as text so no float rounding reaches `numeric`. */
  totalAmount: string;
  indicativeStartDate: string;
};

export type NtpSubmission = {
  receiptDate: string;
  ntpDate: string;
  approvalDate: string;
  rows: NtpBatchInput[];
};

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// U+2010..U+2015, U+2212, U+FF0D -> '-'; the NTP prints U+2010 everywhere.
const DASHES = /[‐-―−－]/g;

function isRealDate(y: number, m: number, d: number): boolean {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function iso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * "03 February 2024" or "2024-02-03" to yyyy-mm-dd. Anything else, including a
 * numeric 03/02/2024 (day-month or month-day?), is null: the coordinator types it.
 */
export function parseNtpDate(input: string): string | null {
  const s = input.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (isoMatch) {
    const [y, m, d] = [Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])];
    return isRealDate(y, m, d) ? iso(y, m, d) : null;
  }
  const named = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s);
  if (!named) return null;
  const month = MONTHS.indexOf(named[2]!.toLowerCase()) + 1;
  const [y, d] = [Number(named[3]), Number(named[1])];
  return month > 0 && isRealDate(y, month, d) ? iso(y, month, d) : null;
}

const NAMED_DATE = String.raw`\d{1,2}\s+[A-Za-z]+\s+\d{4}`;

/** The text between the table header and the commencement footer, or all text when either is missing. */
function tableRegion(text: string): string {
  const header = /Indicative\s+Start\s+Date/i.exec(text);
  const start = header ? header.index + header[0].length : 0;
  const footer = /The\s+TVET\s+Provider\s+shall\s+commence/i.exec(text.slice(start));
  return footer ? text.slice(start, start + footer.index) : text.slice(start);
}

/**
 * One table row, its cells joined with single spaces:
 * "<no> <code> <province + qualification> <slots> <amount> <start date>".
 * Province and qualification run together in the text layer, so the school's
 * own province (known from the registry) is what splits them; when the row does
 * not start with it, the whole run is offered as the qualification to correct.
 */
function parseRow(chunk: string, province: string): NtpDraftRow | null {
  const code = findRqmCodes(chunk)[0];
  if (!code) return null;
  const flat = chunk.replace(/\s+/g, ' ').trim();
  const tail = new RegExp(String.raw`\s(\d+)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(${NAMED_DATE})$`).exec(flat);

  // Everything after the code (the code itself may be split around a hyphen).
  const codeEnd = new RegExp(code.split('-').join(String.raw`\s*-\s*`)).exec(flat);
  const afterCode = codeEnd ? flat.slice(codeEnd.index + codeEnd[0].length) : '';
  let middle = (tail ? afterCode.slice(0, afterCode.length - tail[0].length) : afterCode).trim();
  if (province && middle.toLowerCase().startsWith(province.toLowerCase())) middle = middle.slice(province.length).trim();

  return {
    rqmCode: code,
    qualification: middle,
    approvedSlots: tail?.[1] ?? '',
    totalAmount: tail ? tail[2]!.replace(/,/g, '') : '',
    indicativeStartDate: tail ? (parseNtpDate(tail[3]!) ?? '') : '',
  };
}

/**
 * Best-effort read of the NTP text layer into an editable draft. Never throws
 * and never guesses a value it cannot read: an unread field is ''.
 */
export function parseNtpText(raw: string, opts: { province: string }): NtpDraft {
  const text = raw.replace(DASHES, '-');
  const ntpDate = /Date:\s*(\S.*)/.exec(text)?.[1]?.trim() ?? '';
  const schoolName = /School:\s*(\S.*)/.exec(text)?.[1]?.trim() ?? '';
  const approval = new RegExp(String.raw`approved\s+by\s+TESDA\s+on\s+(${NAMED_DATE})`, 'i').exec(text)?.[1] ?? '';

  // A row starts at a line that opens with its row number and the code.
  const region = tableRegion(text);
  const starts = [...region.matchAll(/(?:^|\n)\s*\d+\s+RQM/g)].map((m) => m.index!);
  const rows = starts
    .map((at, i) => parseRow(region.slice(at, starts[i + 1] ?? region.length), opts.province.trim()))
    .filter((r): r is NtpDraftRow => r !== null);

  return {
    schoolName,
    ntpDate: parseNtpDate(ntpDate) ?? '',
    approvalDate: parseNtpDate(approval) ?? '',
    rows,
  };
}

/** Today's date in the Philippines (UTC+8, no daylight saving), as yyyy-mm-dd. */
export function manilaToday(now: Date): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The program segment of a five-part RQM code (RQM3-2026-CFSP-1263-0009 gives CFSP). */
export function programOfRqmCode(code: string): string {
  return code.split('-')[2] ?? '';
}

export type NtpValidation = { ok: true; value: NtpSubmission } | { ok: false; error: string };

const MAX_QUALIFICATION_LENGTH = 200;
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

function rowError(row: NtpDraftRow, n: number): string | NtpBatchInput {
  const at = `Row ${n}`;
  const code = normalizeRqmCode(row.rqmCode);
  if (!RQM_CODE_PATTERN.test(code)) return `${at}: the RQM code should look like RQM3-2026-CFSP-0000-0001.`;
  const qualification = row.qualification.replace(/\s+/g, ' ').trim();
  if (!qualification) return `${at}: enter the qualification.`;
  if (qualification.length > MAX_QUALIFICATION_LENGTH) return `${at}: the qualification is too long.`;
  const slots = row.approvedSlots.trim();
  if (!/^\d+$/.test(slots) || Number(slots) < 1) return `${at}: approved slots must be a whole number of at least 1.`;
  const amount = row.totalAmount.replace(/[₱,\s]/g, '');
  if (!AMOUNT_PATTERN.test(amount)) return `${at}: the total amount must be a number of pesos, not negative.`;
  const start = parseNtpDate(row.indicativeStartDate);
  if (!start) return `${at}: enter the indicative start date.`;
  return {
    rqmCode: code,
    programCode: programOfRqmCode(code),
    qualificationTitle: qualification,
    approvedSlots: Number(slots),
    totalAmount: amount,
    indicativeStartDate: start,
  };
}

/**
 * What may be saved. `today` is the Manila date (see `manilaToday`). Any failed
 * row rejects the whole NTP (ADR-009 NTP1). The first problem found is reported.
 */
export function validateNtpSubmission(
  input: { receiptDate: string; ntpDate: string; approvalDate: string; rows: NtpDraftRow[] },
  today: string,
): NtpValidation {
  const ntpDate = parseNtpDate(input.ntpDate);
  if (!ntpDate) return { ok: false, error: 'Enter the date shown on the Notice to Proceed.' };
  const approvalDate = parseNtpDate(input.approvalDate);
  if (!approvalDate) return { ok: false, error: 'Enter the approval date shown on the Notice to Proceed.' };
  const receiptDate = parseNtpDate(input.receiptDate);
  if (!receiptDate) return { ok: false, error: 'Enter the date your school received the Notice to Proceed.' };
  if (receiptDate > today) return { ok: false, error: 'The receipt date cannot be in the future.' };
  if (receiptDate < ntpDate) return { ok: false, error: 'The receipt date cannot be before the date on the Notice to Proceed.' };
  if (input.rows.length === 0) return { ok: false, error: 'No allocation rows were found in this Notice to Proceed.' };

  const rows: NtpBatchInput[] = [];
  const seen = new Set<string>();
  for (const [i, row] of input.rows.entries()) {
    const checked = rowError(row, i + 1);
    if (typeof checked === 'string') return { ok: false, error: checked };
    if (seen.has(checked.rqmCode)) return { ok: false, error: `${checked.rqmCode} appears more than once in this Notice to Proceed.` };
    seen.add(checked.rqmCode);
    rows.push(checked);
  }
  return { ok: true, value: { receiptDate, ntpDate, approvalDate, rows } };
}

/**
 * The rows field the modal posts, as JSON. It is untrusted: anything that is
 * not an array of objects becomes no rows, and a non-text field becomes ''.
 * `validateNtpSubmission` then refuses whatever is missing.
 */
export function draftRowsFromJson(raw: string): NtpDraftRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((r) => {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const s = (k: keyof NtpDraftRow) => (typeof o[k] === 'string' ? (o[k] as string) : '');
    return {
      rqmCode: s('rqmCode'),
      qualification: s('qualification'),
      approvedSlots: s('approvedSlots'),
      totalAmount: s('totalAmount'),
      indicativeStartDate: s('indicativeStartDate'),
    };
  });
}

/** What the create-batches action hands back to the modal. Types only. */
export type NtpFormState =
  | { status: 'idle' }
  | { status: 'saved'; codes: string[]; logFailed: boolean }
  /** The input is the problem: fix it and save again. */
  | { status: 'invalid'; message: string }
  /** No Affidavit of Undertaking is on file for the year and none was attached. */
  | { status: 'aou-required'; year: number }
  | { status: 'error'; message: string }
  | { status: 'denied' };
