/**
 * Learner CSV import — pure validation and reconciliation rules, no I/O.
 * Scope note: `learners` (see the migration) only has learner_no, uli, names,
 * and assessment_result — it does not carry sex/DOB/employment/etc., so this
 * pipeline imports that narrower column set, not the full T2MIS/BSRS report
 * shape. Widening it is a schema change (new migration), not a parser change.
 */

import { parseCsvRows, rowsToRecords } from './csv';

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
}

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
 * Reads the assessment result field from a record and normalizes it to the
 * internal enum (competent, not_yet_competent, pending). Unrecognized values
 * fall back to 'pending'.
 */
function readAssessmentResult(record: Record<string, string>): ImportAssessmentResult {
  const key = record['assessment result']?.trim().toLowerCase() ?? '';
  return ASSESSMENT_RESULT_ALIASES[key] ?? 'pending';
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

  const parsedRows: ParsedLearnerRow[] = records.map((record, i) => ({
    rowNumber: i + 2, // +1 for 0-index, +1 for the header row
    learnerNo: readOptionalField(record, 'learner no'),
    uli: readField(record, 'uli'),
    lastName: readField(record, 'last name'),
    firstName: readField(record, 'first name'),
    middleName: readOptionalField(record, 'middle name'),
    extensionName: readOptionalField(record, 'extension name'),
    assessmentResult: readAssessmentResult(record),
  }));

  return { status: 'ok', rows: parsedRows };
}

/**
 * Validates parsed learner rows, splitting them into valid rows (fit to write)
 * and errors (rejected with a reason). Checks for missing required fields
 * (name, ULI), invalid ULI format, and duplicate ULIs within the file.
 * A raw `assessment result` cell that didn't match a known alias silently
 * fell back to 'pending' during parse — this validator only enforces structural
 * rules, not value normalization.
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
