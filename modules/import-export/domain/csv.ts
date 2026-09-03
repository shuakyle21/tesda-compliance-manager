/**
 * Minimal RFC 4180 CSV parser — pure, no I/O. No csv dependency exists in
 * package.json; the format this module needs (quoted fields, embedded commas,
 * doubled-quote escaping) is small enough not to justify adding one.
 */

/** Mutable state threaded through the character-by-character scan below. */
type CsvParseState = { rows: string[][]; row: string[]; cell: string; inQuotes: boolean };

/** One char inside a quoted field: closing quote, escaped `""`, or literal content. */
function advanceQuoted(state: CsvParseState, char: string, isEscapedQuote: boolean): void {
  if (isEscapedQuote) {
    state.cell += '"';
  } else if (char === '"') {
    state.inQuotes = false;
  } else {
    state.cell += char;
  }
}

/** One char outside a quoted field: field/row delimiters, quote-open, or literal content. */
function advanceUnquoted(state: CsvParseState, char: string): void {
  if (char === '"') {
    state.inQuotes = true;
  } else if (char === ',') {
    state.row.push(state.cell);
    state.cell = '';
  } else if (char === '\r') {
    // swallow; \n (bare or following) ends the row
  } else if (char === '\n') {
    state.row.push(state.cell);
    state.rows.push(state.row);
    state.row = [];
    state.cell = '';
  } else {
    state.cell += char;
  }
}

/**
 * Parses CSV text into rows of raw string cells. Handles \r\n and \n line
 * endings, quoted fields, embedded commas/newlines inside quotes, and ""
 * as an escaped quote character.
 */
export function parseCsvRows(text: string): string[][] {
  const state: CsvParseState = { rows: [], row: [], cell: '', inQuotes: false };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (state.inQuotes) {
      const isEscapedQuote = char === '"' && text[i + 1] === '"';
      advanceQuoted(state, char, isEscapedQuote);
      if (isEscapedQuote) i++;
      continue;
    }
    advanceUnquoted(state, char);
  }

  // Flush a trailing cell/row that wasn't newline-terminated.
  if (state.cell.length > 0 || state.row.length > 0) {
    state.row.push(state.cell);
    state.rows.push(state.row);
  }

  return state.rows.filter((r) => !(r.length === 1 && r[0] === ''));
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
