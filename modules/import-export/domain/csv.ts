/**
 * Minimal RFC 4180 CSV parser — pure, no I/O. No csv dependency exists in
 * package.json; the format this module needs (quoted fields, embedded commas,
 * doubled-quote escaping) is small enough not to justify adding one.
 */

/**
 * Parses CSV text into rows of raw string cells. Handles \r\n and \n line
 * endings, quoted fields, embedded commas/newlines inside quotes, and ""
 * as an escaped quote character.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\r') {
      // swallow; \n (bare or following) ends the row
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  // Flush a trailing cell/row that wasn't newline-terminated.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/**
 * Converts parsed CSV rows into record objects keyed by (trimmed, lowercased)
 * headers. The first row is treated as the header row. Enables case-insensitive
 * column lookup.
 */
export function rowsToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => h.trim().toLowerCase());
  return dataRows.map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = (cells[i] ?? '').trim();
    });
    return record;
  });
}
