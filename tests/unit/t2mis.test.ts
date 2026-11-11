import { describe, it, expect } from 'vitest';
import {
  T2MIS_HEADERS,
  ageOn,
  buildT2misRows,
  isoToT2misDate,
  parseT2misDate,
} from '@/modules/import-export/domain/t2mis';
import { parseLearnerCsv, validateRows } from '@/modules/import-export/domain/learnerImport';
import { attachRoster, mapTenantRoster } from '@/modules/batches/data/learners';
import type { Batch, Tenant } from '@/shared/types';

/**
 * Row 1 of the T2MIS "terminal" sheet, copied verbatim (header row only — the
 * sample's data row holds a real person's details and is not committed).
 * `'Province '` carries TESDA's trailing space.
 */
const SAMPLE_HEADERS = [
  'Region', 'Province', 'Congressional District', 'Municipality City', 'Name of Provider',
  'Complete Address', 'Type of Provider', 'Classification of Provider', 'Industry Sector of Qualification',
  'TVET Program Registration Status', 'Qualification Program Title', 'Cluster', 'CTPR',
  'Training Calendar Code', 'Delivery Mode', 'Last Name', 'First Name', 'Middle Name', 'Extension Name',
  'ULI', 'Contact Number', 'E mail Address', 'Street No and Street address', 'Barangay',
  'Municipality City', 'District', 'Province ', 'Sex', 'Date of Birth', 'Age', 'Civil Status',
  'Highest Grade Completed', 'Nationality', 'Classification of Clients', 'Training Status',
  'Type of Scholarships', 'Voucher Number', 'Date Started', 'Date Finished', 'Date Assessed',
  'Assessment Results', 'Employment Status Before the Training', 'Date Of Employment', 'Occupation',
  'Name of Employer', 'Address', 'Classification', 'Salary',
];

const TENANT = {
  id: 'tenant-1', code: 'FIX', name: 'Fixture Farm School', region: 'Region XII',
  province: 'South Cotabato', cityMunicipality: 'Banga', streetAddress: 'Purok 1, Banga',
  providerType: 'Private', providerClassification: 'TVIs', congressionalDistrict: 'II',
} as Tenant;

const BATCH = {
  id: 'BAT-1', tenantId: 'tenant-1', qualification: 'Agricultural Crops Production II', program: 'CFSP',
  trainingStart: '2026-04-21', trainingEnd: '2026-06-08',
} as Batch;

// Synthetic learner — not the sample's.
const LEARNER_ROW = {
  id: 'l-1', tenant_id: 'tenant-1', batch_id: 'b-1', learner_no: null, uli: 'ABC-12-345-67890-001',
  last_name: 'Reyes', first_name: 'Ana', middle_name: 'Lim', extension_name: null,
  assessment_result: 'competent' as const, is_active: true, created_at: '', updated_at: '',
  contact_number: '0917-000-0000', email: 'ana@example.ph', street_address: 'Purok 2', barangay: 'Rizal',
  city_municipality: 'Banga', district: 'II', province: 'South Cotabato', sex: 'Female',
  date_of_birth: '1990-06-09', civil_status: 'Single', highest_grade_completed: 'High School Graduate',
  nationality: 'Filipino', client_classification: 'Farmers and Fishermen', training_status: 'Completed',
  voucher_number: null, date_assessed: '2026-06-23', employment_status_before: 'Self-Employed',
  date_employed: '2026-08-17', occupation: 'Farmer', employer_name: 'Own farm', employer_address: 'Purok 2, Banga',
  employer_classification: 'Employer in Own Family-Operated Farm or Business', salary_range: '10,000 to 20,000',
  batches: { batch_code: 'BAT-1', start_date: '2026-04-21', end_date: '2026-06-08', scholarship_programs: { name: 'Coconut Farmers Scholarship Program (CFSP)' } },
};

const FACTS = [{
  batch_code: 'BAT-1', training_calendar_code: 'TCC-1',
  tenant_qualifications: {
    copr_number: '20221263AFFACP213010', registration_status: 'WTR', delivery_mode: 'Institution-Based Training (IBT)',
    qualifications: { sector: 'Agriculture, Forestry and Fishery', cluster: null },
  },
}];

function exportedRow(): string[] {
  const roster = mapTenantRoster([LEARNER_ROW], FACTS, '2026-06-08');
  const [row] = buildT2misRows(attachRoster([BATCH], roster), () => TENANT);
  return row;
}

const cell = (row: string[], header: string) => row[T2MIS_HEADERS.indexOf(header)];

describe('T2MIS layout', () => {
  it('matches the TESDA sheet header row exactly, in order', () => {
    expect(T2MIS_HEADERS).toHaveLength(48);
    expect(T2MIS_HEADERS).toEqual(SAMPLE_HEADERS);
  });

  it('fills provider, qualification, learner, training and employment cells', () => {
    const row = exportedRow();
    expect(row).toHaveLength(48);
    expect(cell(row, 'Congressional District')).toBe('II');
    expect(cell(row, 'CTPR')).toBe('20221263AFFACP213010');
    expect(cell(row, 'Industry Sector of Qualification')).toBe('Agriculture, Forestry and Fishery');
    expect(cell(row, 'Training Calendar Code')).toBe('TCC-1');
    expect(cell(row, 'Middle Name')).toBe('Lim');
    expect(cell(row, 'Province ')).toBe('South Cotabato');
    expect(cell(row, 'Date of Birth')).toBe('06/09/1990');
    expect(cell(row, 'Age')).toBe('35'); // birthday is the day after the as-of date
    expect(cell(row, 'Type of Scholarships')).toBe('Coconut Farmers Scholarship Program (CFSP)');
    expect(cell(row, 'Date Started')).toBe('04/21/2026');
    expect(cell(row, 'Assessment Results')).toBe('Competent');
    expect(cell(row, 'Salary')).toBe('10,000 to 20,000');
  });

  it('leaves Age blank for a birth date after the as-of date', () => {
    const roster = mapTenantRoster([{ ...LEARNER_ROW, date_of_birth: '2030-01-01' }], [], '2026-06-08');
    const [row] = buildT2misRows(attachRoster([BATCH], roster), () => TENANT);
    expect(cell(row, 'Age')).toBe('');
  });

  it('leaves qualification cells blank when the batch has no qualification link', () => {
    const roster = mapTenantRoster([LEARNER_ROW], [], '2026-06-08');
    const [row] = buildT2misRows(attachRoster([BATCH], roster), () => TENANT);
    expect(cell(row, 'CTPR')).toBe('');
    expect(cell(row, 'Delivery Mode')).toBe('');
  });

  it('round-trips: an exported row re-imports to the same learner columns', () => {
    const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [T2MIS_HEADERS, exportedRow()].map((r) => r.map(quote).join(',')).join('\n');

    const parsed = parseLearnerCsv(csv);
    if (parsed.status !== 'ok') throw new Error('expected ok');
    const { valid, errors } = validateRows(parsed.rows);
    expect(errors).toEqual([]);

    const identity = ['batches', 'id', 'tenant_id', 'batch_id', 'learner_no', 'is_active', 'created_at', 'updated_at',
      'uli', 'last_name', 'first_name', 'middle_name', 'extension_name', 'assessment_result'];
    const details = Object.fromEntries(
      Object.entries(LEARNER_ROW).filter(([key, value]) => !identity.includes(key) && value !== null),
    );
    const { uli, last_name, first_name, middle_name, assessment_result } = LEARNER_ROW;
    expect(valid[0]).toMatchObject({ uli, lastName: last_name, firstName: first_name, middleName: middle_name, assessmentResult: assessment_result });
    expect(valid[0].details).toEqual(details);
  });
});

describe('T2MIS import validation', () => {
  const header = 'Last Name,First Name,ULI,Sex,Date of Birth,Assessment Results';

  it('rejects an unrecognised assessment result instead of importing it as pending', () => {
    const parsed = parseLearnerCsv(`${header}\nReyes,Ana,ABC12345678,Female,06/09/1990,Competnt\n`);
    if (parsed.status !== 'ok') throw new Error('expected ok');
    const { valid, errors } = validateRows(parsed.rows);
    expect(valid).toHaveLength(0);
    expect(errors[0].reason).toMatch(/Assessment result "Competnt"/);
  });

  it('refuses a file that spans more than one batch', () => {
    const csv = 'Last Name,First Name,ULI,Qualification Program Title\nReyes,Ana,ABC12345678,Crops NC II\nCruz,Ben,DEF12345678,Bread NC II\n';
    expect(parseLearnerCsv(csv)).toEqual({ status: 'multiple-batches', values: ['Crops NC II', 'Bread NC II'] });
  });

  it('names the field for a bad date or sex', () => {
    const parsed = parseLearnerCsv(`${header}\nReyes,Ana,ABC12345678,X,31/12/1990,\n`);
    if (parsed.status !== 'ok') throw new Error('expected ok');
    const { errors } = validateRows(parsed.rows);
    expect(errors[0].reason).toMatch(/Sex "X"/);
    expect(errors[0].reason).toMatch(/"date of birth" value "31\/12\/1990"/);
  });
});

describe('T2MIS dates', () => {
  it('reads MM/DD/YYYY, ISO and Excel serials into ISO', () => {
    expect(parseT2misDate('02/04/1961')).toBe('1961-02-04');
    expect(parseT2misDate('2026-06-23')).toBe('2026-06-23');
    expect(parseT2misDate('46251')).toBe('2026-08-17');
    expect(parseT2misDate('  ')).toBeNull();
  });

  it('rejects impossible or unreadable dates', () => {
    expect(parseT2misDate('02/30/2026')).toBe('invalid');
    expect(parseT2misDate('42')).toBe('invalid');
    expect(parseT2misDate('next week')).toBe('invalid');
  });

  it('formats ISO for the sheet and passes anything else through', () => {
    expect(isoToT2misDate('1961-02-04')).toBe('02/04/1961');
    expect(isoToT2misDate('')).toBe('');
  });

  it('computes whole-year age as of a fixed date', () => {
    expect(ageOn('1990-06-08', '2026-06-08')).toBe(36);
    expect(ageOn('1990-06-09', '2026-06-08')).toBe(35);
    expect(ageOn('', '2026-06-08')).toBeNull();
  });
});
