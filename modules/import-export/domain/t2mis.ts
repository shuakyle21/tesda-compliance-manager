/**
 * T2MIS terminal-report layout (FR-10, TES-49) — pure, no I/O.
 *
 * One ordered column list is the single source of truth for the sheet: the
 * export writes it left to right, and the header test pins it against the
 * file TESDA hands back (48 columns, sheet "terminal"). Header strings are
 * TESDA's, verbatim — including `'Province '` with its trailing space and the
 * two columns both called "Municipality City" — so do not tidy them.
 *
 * This is an internal working copy. Producing the file is not a submission.
 */

import type { Batch, ScholarRow, Tenant } from '@/shared/types';

export interface T2misRowContext {
  tenant: Tenant;
  batch: Batch;
  scholar: ScholarRow;
}

interface T2misColumn {
  header: string;
  value: (c: T2misRowContext) => string;
}

/** ISO `YYYY-MM-DD` -> `MM/DD/YYYY`, the sheet's date format. Anything else passes through. */
export function isoToT2misDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Reads a date cell into ISO `YYYY-MM-DD`. Accepts `MM/DD/YYYY` (the sheet's
 * format), ISO, and a bare Excel serial number — the sample's "Date Of
 * Employment" arrives as `46251` because that cell was left unformatted.
 * Returns `null` for a blank cell and `'invalid'` for anything unreadable.
 */
export function parseT2misDate(cell: string): string | null | 'invalid' {
  const text = cell.trim();
  if (!text) return null;

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const parts = us ? [+us[3], +us[1], +us[2]] : iso ? [+iso[1], +iso[2], +iso[3]] : null;
  if (parts) {
    const [y, m, d] = parts;
    return isRealDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : 'invalid';
  }

  // Excel serial: days since 1899-12-30. Bounded to 1954..2119 so a stray
  // small integer (an age, a count) is rejected rather than read as a date.
  if (/^\d{5}$/.test(text) && +text >= 20000 && +text <= 80000) {
    return new Date(Date.UTC(1899, 11, 30) + +text * 86_400_000).toISOString().slice(0, 10);
  }
  return 'invalid';
}

/** Whole years between an ISO birth date and an ISO as-of date; `null` when either is unusable. */
export function ageOn(dobIso: string, asOfIso: string): number | null {
  const dob = /^(\d{4})-(\d{2})-(\d{2})/.exec(dobIso);
  const asOf = /^(\d{4})-(\d{2})-(\d{2})/.exec(asOfIso);
  if (!dob || !asOf) return null;
  const hadBirthday = asOf[2] + asOf[3] >= dob[2] + dob[3];
  const age = +asOf[1] - +dob[1] - (hadBirthday ? 0 : 1);
  return age >= 0 ? age : null;
}

/**
 * `tenants.region` is free text shaped like "Region IV-A · Laguna" for the
 * schools seeded before the dedicated province column existed (migration
 * 20260906114735), so it is split as a fallback.
 */
function regionParts(t: Tenant): { region: string; province: string } {
  const [region = '', province = ''] = (t.region || '').split('·').map((p) => p.trim());
  return { region, province: t.province || province };
}

export const T2MIS_COLUMNS: T2misColumn[] = [
  // Provider
  { header: 'Region', value: ({ tenant }) => regionParts(tenant).region },
  { header: 'Province', value: ({ tenant }) => regionParts(tenant).province },
  { header: 'Congressional District', value: ({ tenant }) => tenant.congressionalDistrict },
  { header: 'Municipality City', value: ({ tenant }) => tenant.cityMunicipality },
  { header: 'Name of Provider', value: ({ tenant }) => tenant.name },
  { header: 'Complete Address', value: ({ tenant }) => tenant.streetAddress || tenant.region },
  { header: 'Type of Provider', value: ({ tenant }) => tenant.providerType },
  { header: 'Classification of Provider', value: ({ tenant }) => tenant.providerClassification },
  // Qualification as registered at this school. Blank until the batch is
  // linked to its `tenant_qualifications` row — never guessed.
  { header: 'Industry Sector of Qualification', value: ({ batch }) => batch.t2mis?.sector ?? '' },
  { header: 'TVET Program Registration Status', value: ({ batch }) => batch.t2mis?.registrationStatus ?? '' },
  { header: 'Qualification Program Title', value: ({ batch }) => batch.qualification },
  { header: 'Cluster', value: ({ batch }) => batch.t2mis?.cluster ?? '' },
  { header: 'CTPR', value: ({ batch }) => batch.t2mis?.ctpr ?? '' },
  { header: 'Training Calendar Code', value: ({ batch }) => batch.t2mis?.trainingCalendarCode ?? '' },
  { header: 'Delivery Mode', value: ({ batch }) => batch.t2mis?.deliveryMode ?? '' },
  // Learner
  { header: 'Last Name', value: ({ scholar }) => scholar.lastName },
  { header: 'First Name', value: ({ scholar }) => scholar.firstName },
  { header: 'Middle Name', value: ({ scholar }) => scholar.middleName },
  { header: 'Extension Name', value: ({ scholar }) => scholar.extName },
  { header: 'ULI', value: ({ scholar }) => scholar.uli },
  { header: 'Contact Number', value: ({ scholar }) => scholar.contact },
  { header: 'E mail Address', value: ({ scholar }) => scholar.email },
  { header: 'Street No and Street address', value: ({ scholar }) => scholar.streetAddress },
  { header: 'Barangay', value: ({ scholar }) => scholar.barangay },
  { header: 'Municipality City', value: ({ scholar }) => scholar.cityMunicipality },
  { header: 'District', value: ({ scholar }) => scholar.district },
  { header: 'Province ', value: ({ scholar }) => scholar.province },
  { header: 'Sex', value: ({ scholar }) => scholar.sex },
  { header: 'Date of Birth', value: ({ scholar }) => isoToT2misDate(scholar.dob) },
  { header: 'Age', value: ({ scholar }) => (scholar.dob ? String(scholar.age) : '') },
  { header: 'Civil Status', value: ({ scholar }) => scholar.civilStatus },
  { header: 'Highest Grade Completed', value: ({ scholar }) => scholar.education },
  { header: 'Nationality', value: ({ scholar }) => scholar.nationality },
  { header: 'Classification of Clients', value: ({ scholar }) => scholar.clientClass },
  // Training
  { header: 'Training Status', value: ({ scholar }) => scholar.trainingStatus },
  { header: 'Type of Scholarships', value: ({ scholar, batch }) => scholar.scholarshipType || batch.program },
  { header: 'Voucher Number', value: ({ scholar }) => scholar.voucherNumber },
  { header: 'Date Started', value: ({ scholar, batch }) => isoToT2misDate(scholar.dateStarted || batch.trainingStart) },
  { header: 'Date Finished', value: ({ scholar, batch }) => isoToT2misDate(scholar.dateFinished || batch.trainingEnd) },
  { header: 'Date Assessed', value: ({ scholar }) => isoToT2misDate(scholar.dateAssessed) },
  { header: 'Assessment Results', value: ({ scholar }) => scholar.assessmentResult },
  // Employment
  { header: 'Employment Status Before the Training', value: ({ scholar }) => scholar.empStatusBefore },
  { header: 'Date Of Employment', value: ({ scholar }) => isoToT2misDate(scholar.dateEmployed) },
  { header: 'Occupation', value: ({ scholar }) => scholar.occupation },
  { header: 'Name of Employer', value: ({ scholar }) => scholar.employer },
  { header: 'Address', value: ({ scholar }) => scholar.employerAddress },
  { header: 'Classification', value: ({ scholar }) => scholar.empClassification },
  { header: 'Salary', value: ({ scholar }) => scholar.salary },
];

export const T2MIS_HEADERS: string[] = T2MIS_COLUMNS.map((c) => c.header);

/** One sheet row per scholar, in batch order, each cell in `T2MIS_COLUMNS` order. */
export function buildT2misRows(batches: Batch[], tenantOf: (id: string) => Tenant): string[][] {
  return batches.flatMap((batch) => {
    const tenant = tenantOf(batch.tenantId);
    return (batch.scholars_list ?? []).map((scholar) =>
      // `?? ''`: a tenant the caller has no catalog row for arrives as a
      // partial placeholder (ReportView's `tenantOf` fallback).
      T2MIS_COLUMNS.map((col) => col.value({ tenant, batch, scholar }) ?? ''),
    );
  });
}
