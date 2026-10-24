/**
 * Leaf-level date display helpers — pure formatting, no data and no domain rules.
 *
 * Dates travel through the data and domain layers as canonical ISO strings
 * (`2025-12-15`, or a full timestamp) and are formatted only at the UI edge.
 * Every display form carries the year: a compliance deadline printed as
 * "Dec 15" reads as upcoming even when it is a year overdue.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses an ISO date or timestamp, or returns null for a missing/unparseable
 * value. A date-only string is pinned to UTC so it never shifts a day in a
 * timezone west of UTC.
 */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** "Dec 15, 2025", or null when there is no usable date — callers pick the copy. */
export function formatDate(value: string | null | undefined): string | null {
  const date = parseIsoDate(value);
  if (!date) return null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(value && DATE_ONLY.test(value) ? { timeZone: 'UTC' } : {}),
  });
}

/** "Dec 15, 2025 · 14:02" (24-hour) for a timestamp, or null. */
export function formatDateTime(value: string | null | undefined): string | null {
  const date = parseIsoDate(value);
  if (!date) return null;
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${formatDate(value)} · ${time}`;
}
