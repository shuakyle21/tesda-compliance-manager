import { describe, it, expect } from 'vitest';
import { buildXlsx, crc32 } from '@/modules/reports/domain/xlsx';

const enc = new TextEncoder();

/** The writer uses zip STORE (no compression), so the XML parts are visible
 * as plain text inside the archive bytes. */
async function decoded(blob: Blob): Promise<string> {
  return new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));
}

describe('crc32', () => {
  it('matches the classic check vector', () => {
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
  });

  it('is zero for an empty payload', () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('buildXlsx', () => {
  it('emits an xlsx-typed Blob of stored (uncompressed) zip bytes', async () => {
    const blob = buildXlsx(['A'], [['1']], 'Sheet');
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // Local file header magic "PK\x03\x04"...
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // ...and the end-of-central-directory record closes the archive.
    expect([...bytes.slice(-22, -18)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it('wraps the five minimal OOXML parts', async () => {
    const text = await decoded(buildXlsx(['A'], [], 'S'));
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(text).toContain(part);
    }
  });

  it('numbers the header row 1 and data rows from 2', async () => {
    const text = await decoded(buildXlsx(['H1', 'H2'], [['a', 'b'], ['c', 'd']], 'S'));
    expect(text).toContain('<row r="1">');
    expect(text).toContain('<row r="2">');
    expect(text).toContain('<row r="3">');
    expect(text).toContain('<c r="A1"');
    expect(text).toContain('<c r="B3"');
  });

  it('escapes XML entities in cell values', async () => {
    const text = await decoded(buildXlsx(['H'], [['héllo & <w> "q"']], 'S'));
    expect(text).toContain('héllo &amp; &lt;w&gt; &quot;q&quot;');
  });

  it('derives spreadsheet column letters past Z (col 27 → AA)', async () => {
    const headers = Array.from({ length: 27 }, (_, i) => `c${i + 1}`);
    const text = await decoded(buildXlsx(headers, [], 'S'));
    expect(text).toContain('<c r="AA1"');
  });

  it("truncates the sheet name to Excel's 28-char limit", async () => {
    const text = await decoded(buildXlsx(['A'], [], 'EGACE-Employment-with-a-very-long-name'));
    expect(text).not.toContain('EGACE-Employment-with-a-very-long-name');
  });
});
