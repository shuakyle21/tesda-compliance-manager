/* ============================ xlsx writer ============================ */
// A self-contained .xlsx emitter: zip-store (no compression) wrapping the
// minimal OOXML parts Excel needs. Kept dependency-free so the export matches
// the prototype byte-for-byte and ships nothing extra to the client.
//
// NOTE: does DOM/Blob/URL I/O — deliberately not in modules/reports/domain/,
// which is reserved for pure business rules (see egace.ts, employment.ts).

import type { Batch, Tenant } from '@/shared/types';
import type { ToastData } from '@/shared/ui/Toast';

type ZipEntry = { name: string; data: Uint8Array };

const _crcTable: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function _crc32(u8: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = _crcTable[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function _zipStore(files: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  files.forEach((f) => {
    const nameB = enc.encode(f.name);
    const crc = _crc32(f.data);
    const size = f.data.length;
    const local = new Uint8Array(
      ([] as number[]).concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0)),
    );
    chunks.push(local, nameB, f.data);
    const cen = new Uint8Array(
      ([] as number[]).concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)),
    );
    central.push(cen, nameB);
    offset += local.length + nameB.length + f.data.length;
  });
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(
    ([] as number[]).concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(offset), u16(0)),
  );
  const all = chunks.concat(central, [eocd]);
  const total = all.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  all.forEach((a) => {
    out.set(a, p);
    p += a.length;
  });
  return out;
}

function _xmlEsc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _colRef(i: number): string {
  let s = '';
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function buildXlsx(headers: string[], rows: string[][], sheetName: string): Blob {
  const enc = new TextEncoder();
  const rowXml = (cells: string[], r: number) =>
    `<row r="${r}">` +
    cells
      .map((v, ci) => `<c r="${_colRef(ci)}${r}" t="inlineStr"><is><t xml:space="preserve">${_xmlEsc(v)}</t></is></c>`)
      .join('') +
    '</row>';
  const body = [rowXml(headers, 1)];
  rows.forEach((row, ri) => body.push(rowXml(row, ri + 2)));
  const sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>' +
    body.join('') +
    '</sheetData></worksheet>';
  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${_xmlEsc(sheetName).slice(0, 28)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const ct =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  const zipped = _zipStore([
    { name: '[Content_Types].xml', data: enc.encode(ct) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ]);
  return new Blob([zipped as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* T2MIS terminal-report column order (matches the imported file) */
const T2MIS_HEADERS = [
  'Region', 'Province', 'Congressional District', 'Municipality City', 'Name of Provider',
  'Complete Address', 'Type of Provider', 'Classification of Provider', 'Industry Sector of Qualification',
  'TVET Program Registration Status', 'Qualification Program Title', 'Cluster', 'CTPR',
  'Training Calendar Code', 'Delivery Mode', 'Last Name', 'First Name', 'Middle Name', 'Extension Name',
  'ULI', 'Contact Number', 'E mail Address', 'Street No and Street address', 'Barangay', 'District',
  'Province ', 'Sex', 'Date of Birth', 'Age', 'Civil Status', 'Highest Grade Completed', 'Nationality',
  'Classification of Clients', 'Training Status', 'Type of Scholarships', 'Voucher Number',
  'Date Started', 'Date Finished', 'Date Assessed', 'Assessment Results',
  'Employment Status Before the Training', 'Date Of Employment', 'Occupation', 'Name of Employer',
  'Address', 'Classification', 'Salary',
];

/** Builds and downloads the T2MIS EGACE + employment .xlsx, then reports the result via `onResult`. */
export function exportXlsx(rows: Batch[], tenantOf: (id: string) => Tenant, onResult: (toast: ToastData) => void): void {
  const data: string[][] = [];
  rows.forEach((b) => {
    const t = tenantOf(b.tenantId);
    const reg = (t.region || '').split('·');
    const region = (reg[0] || '').trim();
    const province = (reg[1] || '').trim();
    (b.scholars_list || []).forEach((s) => {
      data.push([
        region, province, '', '', t.name,
        t.region || '', 'Private', 'TVIs', 'Agriculture, Forestry and Fishery',
        'WTR', b.qualification, '', '',
        b.id, 'Institution-Based Training (IBT)',
        s.lastName, s.firstName, s.middleInit, s.extName,
        s.uli, s.contact, s.email, '', '', '',
        province, s.sex, s.dob, String(s.age), s.civilStatus, s.education, s.nationality,
        s.clientClass, s.trainingStatus, s.scholarshipType, '',
        s.dateStarted, s.dateFinished, s.dateAssessed, s.assessmentResult,
        s.empStatusBefore, s.dateEmployed, s.occupation, s.employer,
        s.employer && s.employer !== 'Self-employed' ? t.region || '' : '', s.empClassification, s.salary,
      ]);
    });
  });
  try {
    const blob = buildXlsx(T2MIS_HEADERS, data, 'EGACE-Employment');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TESDA-T2MIS-EGACE-Employment-Report.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onResult({
      title: 'Excel export ready',
      message: `TESDA-T2MIS-EGACE-Employment-Report.xlsx downloaded — ${data.length} scholar records across ${rows.length} batches.`,
    });
  } catch {
    onResult({ title: 'Export failed', message: 'Could not build the workbook in this browser.' });
  }
}
