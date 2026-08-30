import { describe, it, expect } from 'vitest';
import { parseCsvRows, rowsToRecords } from '@/modules/import-export/domain/csv';
import {
  parseLearnerCsv,
  validateRows,
  reconcileWithExisting,
  type ParsedLearnerRow,
} from '@/modules/import-export/domain/learnerImport';

describe('parseCsvRows', () => {
  it('splits plain comma-separated rows', () => {
    expect(parseCsvRows('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with embedded commas and escaped quotes', () => {
    expect(parseCsvRows('name,note\n"Dela Cruz, Maria","Says ""hi"""\n')).toEqual([
      ['name', 'note'],
      ['Dela Cruz, Maria', 'Says "hi"'],
    ]);
  });

  it('handles a trailing row with no newline', () => {
    expect(parseCsvRows('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('rowsToRecords', () => {
  it('keys records by lowercased trimmed header', () => {
    expect(rowsToRecords([[' Last Name ', 'ULI'], ['Cruz', '12345678']])).toEqual([
      { 'last name': 'Cruz', uli: '12345678' },
    ]);
  });
});

const HEADER = 'Last Name,First Name,ULI,Assessment Result';

describe('parseLearnerCsv', () => {
  it('reports empty for a header-only or blank file', () => {
    expect(parseLearnerCsv('')).toEqual({ status: 'empty' });
    expect(parseLearnerCsv(HEADER)).toEqual({ status: 'empty' });
  });

  it('reports missing required columns', () => {
    const result = parseLearnerCsv('Last Name,First Name\nCruz,Maria\n');
    expect(result).toEqual({ status: 'missing-columns', missing: ['uli'] });
  });

  it('parses valid rows and defaults a blank assessment result to pending', () => {
    const result = parseLearnerCsv(`${HEADER}\nDela Cruz,Maria,ABC12345678,Competent\nSantos,Ana,DEF87654321,\n`);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ rowNumber: 2, lastName: 'Dela Cruz', uli: 'ABC12345678', assessmentResult: 'competent' });
    expect(result.rows[1]).toMatchObject({ rowNumber: 3, assessmentResult: 'pending' });
  });
});

function row(overrides: Partial<ParsedLearnerRow> = {}): ParsedLearnerRow {
  return {
    rowNumber: 2,
    learnerNo: null,
    uli: 'ABC12345678',
    lastName: 'Dela Cruz',
    firstName: 'Maria',
    middleName: null,
    extensionName: null,
    assessmentResult: 'pending',
    ...overrides,
  };
}

describe('validateRows', () => {
  it('accepts a well-formed row', () => {
    const { valid, errors } = validateRows([row()]);
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it('rejects a row missing last or first name', () => {
    const { valid, errors } = validateRows([row({ lastName: '' })]);
    expect(valid).toHaveLength(0);
    expect(errors[0].reason).toMatch(/last name or first name/i);
  });

  it('rejects a row with a malformed or missing ULI', () => {
    const { valid, errors } = validateRows([row({ uli: 'x' })]);
    expect(valid).toHaveLength(0);
    expect(errors[0].reason).toMatch(/ULI/);
  });

  it('rejects the second occurrence of a duplicate ULI within the file', () => {
    const { valid, errors } = validateRows([row({ rowNumber: 2 }), row({ rowNumber: 3 })]);
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].rowNumber).toBe(3);
    expect(errors[0].reason).toMatch(/Duplicate ULI/);
  });
});

describe('reconcileWithExisting', () => {
  it('matches by ULI to mark an update, and leaves unmatched rows as inserts', () => {
    const rows = [row({ uli: 'MATCH-0001' }), row({ uli: 'NEW-0002' })];
    const existing = [{ id: 'learner-1', uli: 'MATCH-0001' }, { id: 'learner-2', uli: null }];

    const reconciled = reconcileWithExisting(rows, existing);
    expect(reconciled.find((r) => r.row.uli === 'MATCH-0001')?.existingId).toBe('learner-1');
    expect(reconciled.find((r) => r.row.uli === 'NEW-0002')?.existingId).toBeNull();
  });
});
