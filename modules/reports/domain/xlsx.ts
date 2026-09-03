/**
 * Zero-dependency .xlsx emitter — a zip-store (no compression) wrapping the
 * minimal OOXML parts Excel needs. Kept dependency-free so the export matches
 * the prototype byte-for-byte and ships nothing extra to the client.
 *
 * Moved verbatim out of `modules/reports/ui/ReportView.tsx` (it originally
 * lived inside the screen component) into the module's `domain/` layer so it
 * is unit-testable (RULES.md #35) and importable as part of the module's
 * public surface (RULES.md #8).
 */

export type ZipEntry = { name: string; data: Uint8Array };

const _crcTable: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (IEEE). Classic check vector: crc32('123456789') === 0xCBF43926. */
export function crc32(u8: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = _crcTable[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  files.forEach((f) => {
    const nameB = enc.encode(f.name);
    const crc = crc32(f.data);
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

function xmlEsc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colRef(i: number): string {
  let s = '';
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

/**
 * Builds a single-sheet .xlsx (inline strings, no shared-strings part) as a
 * Blob. The header occupies row 1; data rows follow from row 2. The sheet
 * name is truncated to Excel's 28-char limit after escaping.
 */
export function buildXlsx(headers: string[], rows: string[][], sheetName: string): Blob {
  const enc = new TextEncoder();
  const rowXml = (cells: string[], r: number) =>
    `<row r="${r}">` +
    cells
      .map((v, ci) => `<c r="${colRef(ci)}${r}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`)
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
    `<sheets><sheet name="${xmlEsc(sheetName).slice(0, 28)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
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
  const zipped = zipStore([
    { name: '[Content_Types].xml', data: enc.encode(ct) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ]);
  return new Blob([zipped as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
