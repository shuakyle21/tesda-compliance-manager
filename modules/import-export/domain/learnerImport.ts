/**
 * Learner CSV import — pure validation and reconciliation rules, no I/O.
 *
 * Reads two shapes with one parser: the narrow roster CSV (names, ULI,
 * assessment result) and the T2MIS terminal-report sheet saved as CSV. The
 * T2MIS learner, training and employment columns land in `details`; its
 * provider and qualification columns are ignored, because an import targets
 * one batch the user already chose.
 */

import { parseCsvRows, rowsToRecords } from './csv';
import { parseT2misDate } from './t2mis';

export type ImportAssessmentResult = 'competent' | 'not_yet_competent' | 'pending';

export interface ParsedLearnerRow {
  rowNumber: number; // 1-based, counting the header as row 1 (matches what a user sees in a spreadsheet)
  learnerNo: string | null;
  uli: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  extensionName: string | null;
  assessmentResult: ImportAssessmentResult;
  /** Non-blank T2MIS cells, keyed by `learner_details` column. Dates are ISO. */
  details: LearnerDetails;
  /** Cells that could not be read. Any entry rejects the row in {@link validateRows}. */
  problems: string[];
}

/**
 * T2MIS header (trimmed, lowercased) -> `learner_details` column. The sheet repeats
 * "Municipality City" and "Province" for the provider and the learner;
 * `rowsToRecords` keeps the later (learner) cell, which is the one wanted here.
 */
const DETAIL_COLUMNS = {
  'contact number': 'contact_number',
  'e mail address': 'email',
  'street no and street address': 'street_address',
  'barangay': 'barangay',
  'municipality city': 'city_municipality',
  'district': 'district',
  'province': 'province',
  'sex': 'sex',
  'date of birth': 'date_of_birth',
  'civil status': 'civil_status',
  'highest grade completed': 'highest_grade_completed',
  'nationality': 'nationality',
  'classification of clients': 'client_classification',
  'training status': 'training_status',
  'voucher number': 'voucher_number',
  'date assessed': 'date_assessed',
  'employment status before the training': 'employment_status_before',
  'date of employment': 'date_employed',
  'occupation': 'occupation',
  'name of employer': 'employer_name',
  'address': 'employer_address',
  'classification': 'employer_classification',
  'salary': 'salary_range',
} as const;

type DetailHeader = keyof typeof DETAIL_COLUMNS;
export type LearnerDetailColumn = (typeof DETAIL_COLUMNS)[DetailHeader];
export type LearnerDetails = Partial<Record<LearnerDetailColumn, string>>;

const DATE_COLUMNS: ReadonlySet<LearnerDetailColumn> = new Set(['date_of_birth', 'date_assessed', 'date_employed']);
const SEX_ALIASES: Record<string, string> = { male: 'Male', m: 'Male', female: 'Female', f: 'Female' };

export interface RowError {
  rowNumber: number;
  uli: string | null;
  reason: string;
}

// Required headers. ULI is required per the locked domain fact that it is the
// permanent learner key — a row without one cannot be reconciled against
// existing learners on re-import, so it is rejected rather than imported blind.
const REQUIRED_HEADERS = ['last name', 'first name', 'uli'];
const HEADER_ALIASES: Record<string, string> = {
  'learner no': 'learner no',
  'learner number': 'learner no',
  'learner no.': 'learner no',
  'last name': 'last name',
  'surname': 'last name',
  'first name': 'first name',
  'middle name': 'middle name',
  'extension name': 'extension name',
  'ext name': 'extension name',
  'ext.': 'extension name',
  'uli': 'uli',
  'assessment result': 'assessment result',
  'assessment results': 'assessment result',
};

/** Soft check: ULIs in the wild are alphanumeric with dashes, ~10-20 chars.
 * Not the canonical TESDA ULI algorithm — just enough to reject empty/garbage cells. */
const ULI_PATTERN = /^[A-Za-z0-9-]{8,20}$/;

const ASSESSMENT_RESULT_ALIASES: Record<string, ImportAssessmentResult> = {
  'competent': 'competent',
  'c': 'competent',
  'not yet competent': 'not_yet_competent',
  'not_yet_competent': 'not_yet_competent',
  'nyc': 'not_yet_competent',
  'pending': 'pending',
  '': 'pending',
};

export type LearnerCsvParseResult =
  | { status: 'ok'; rows: ParsedLearnerRow[] }
  | { status: 'missing-columns'; missing: string[] }
  /** The file spans more than one batch (e.g. a whole-school T2MIS export). */
  | { status: 'multiple-batches'; values: string[] }
  | { status: 'empty' };

/**
 * Normalizes a CSV header to the canonical key, applying aliases for common
 * variations (e.g., "surname" → "last name").
 */
function normalizeHeader(header: string): string {
  return HEADER_ALIASES[header] ?? header;
}

/**
 * Reads a required field from a record. Returns the trimmed value, or an
 * empty string when absent.
 */
function readField(record: Record<string, string>, key: string): string {
  return record[key]?.trim() ?? '';
}

/**
 * Reads an optional field from a record. Returns the trimmed value, or `null`
 * when absent or blank.
 */
function readOptionalField(record: Record<string, string>, key: string): string | null {
  return record[key]?.trim() || null;
}

/**
 * Reads the assessment result cell. A blank cell is 'pending'; a value that
 * matches no known alias is a problem, not a silent 'pending' — importing
 * "Competnt" as pending would quietly understate the batch's results.
 */
function readAssessmentResult(record: Record<string, string>, problems: string[]): ImportAssessmentResult {
  const raw = record['assessment result']?.trim() ?? '';
  const result = ASSESSMENT_RESULT_ALIASES[raw.toLowerCase()];
  if (result) return result;
  problems.push(`Assessment result "${raw}" is not recognised (use Competent, Not Yet Competent, or leave blank)`);
  return 'pending';
}

/** Reads the T2MIS detail cells, normalising dates to ISO and sex to Male/Female. */
function readDetails(record: Record<string, string>, problems: string[]): LearnerDetails {
  const details: LearnerDetails = {};
  for (const header of Object.keys(DETAIL_COLUMNS) as DetailHeader[]) {
    const column = DETAIL_COLUMNS[header];
    const cell = record[header]?.trim() ?? '';
    if (!cell) continue;

    if (DATE_COLUMNS.has(column)) {
      const iso = parseT2misDate(cell);
      if (iso === 'invalid') problems.push(`"${header}" value "${cell}" is not a date (use MM/DD/YYYY)`);
      else if (iso) details[column] = iso;
    } else if (column === 'sex') {
      const sex = SEX_ALIASES[cell.toLowerCase()];
      if (sex) details.sex = sex;
      else problems.push(`Sex "${cell}" is not recognised (use Male or Female)`);
    } else {
      details[column] = cell;
    }
  }
  return details;
}

/**
 * Parses raw CSV text into candidate learner rows. Row-level content
 * validation (blank names, bad ULI shape, duplicates) happens in {@link validateRows}.
 */
export function parseLearnerCsv(text: string): LearnerCsvParseResult {
  const rows = parseCsvRows(text);
  if (rows.length <= 1) return { status: 'empty' };

  const rawHeaders = rows[0].map((h) => h.trim().toLowerCase());
  const normalizedHeaders = new Set(rawHeaders.map(normalizeHeader));
  const missing = REQUIRED_HEADERS.filter((h) => !normalizedHeaders.has(h));
  if (missing.length > 0) return { status: 'missing-columns', missing };

  // Re-key each record by its normalized header name before reading fields.
  const records = rowsToRecords(rows).map((record) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      normalized[normalizeHeader(key)] = value;
    }
    return normalized;
  });

  // An import targets one batch. A whole-school T2MIS export carries every
  // batch in one sheet; importing it would file all of them under the target.
  for (const key of ['training calendar code', 'qualification program title']) {
    const values = [...new Set(records.map((r) => r[key]).filter(Boolean))];
    if (values.length > 1) return { status: 'multiple-batches', values };
  }

  const parsedRows: ParsedLearnerRow[] = records.map((record, i) => {
    const problems: string[] = [];
    return {
      rowNumber: i + 2, // +1 for 0-index, +1 for the header row
      learnerNo: readOptionalField(record, 'learner no'),
      uli: readField(record, 'uli'),
      lastName: readField(record, 'last name'),
      firstName: readField(record, 'first name'),
      middleName: readOptionalField(record, 'middle name'),
      extensionName: readOptionalField(record, 'extension name'),
      assessmentResult: readAssessmentResult(record, problems),
      details: readDetails(record, problems),
      problems,
    };
  });

  return { status: 'ok', rows: parsedRows };
}

/**
 * Validates parsed learner rows, splitting them into valid rows (fit to write)
 * and errors (rejected with a reason). Checks for missing required fields
 * (name, ULI), invalid ULI format, unreadable cells (`problems`), and
 * duplicate ULIs within the file.
 */
export function validateRows(rows: ParsedLearnerRow[]): { valid: ParsedLearnerRow[]; errors: RowError[] } {
  const errors: RowError[] = [];
  const valid: ParsedLearnerRow[] = [];
  const seenUli = new Set<string>();

  for (const row of rows) {
    if (!row.lastName || !row.firstName) {
      errors.push({ rowNumber: row.rowNumber, uli: row.uli || null, reason: 'Missing last name or first name' });
      continue;
    }
    if (!ULI_PATTERN.test(row.uli)) {
      errors.push({ rowNumber: row.rowNumber, uli: row.uli || null, reason: 'ULI is missing or not a valid format' });
      continue;
    }
    if (row.problems.length > 0) {
      errors.push({ rowNumber: row.rowNumber, uli: row.uli, reason: row.problems.join('; ') });
      continue;
    }
    if (seenUli.has(row.uli)) {
      errors.push({ rowNumber: row.rowNumber, uli: row.uli, reason: 'Duplicate ULI within this file' });
      continue;
    }
    seenUli.add(row.uli);
    valid.push(row);
  }

  return { valid, errors };
}

export interface ExistingLearner {
  id: string;
  uli: string | null;
}

export interface ReconciledRow {
  row: ParsedLearnerRow;
  existingId: string | null; // null = insert; set = update that learner row
}

/**
 * Matches validated learner rows against the batch's existing learners by ULI
 * (the permanent learner key), not by learner_no which is only unique per-batch
 * and isn't guaranteed present in a source report. Returns reconciled rows with
 * existingId set for updates and null for inserts.
 */
export function reconcileWithExisting(rows: ParsedLearnerRow[], existing: ExistingLearner[]): ReconciledRow[] {
  const byUli = new Map(existing.filter((l) => l.uli).map((l) => [l.uli as string, l.id]));
  return rows.map((row) => ({ row, existingId: byUli.get(row.uli) ?? null }));
}
