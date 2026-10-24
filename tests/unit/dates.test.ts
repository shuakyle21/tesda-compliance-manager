import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, parseIsoDate } from '@/shared/dates';

describe('formatDate', () => {
  it('always prints the year, so a past deadline cannot read as upcoming', () => {
    expect(formatDate('2025-12-15')).toBe('Dec 15, 2025');
  });

  it('pins a date-only value to its calendar day regardless of timezone', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
  });

  it('returns null for a missing or unparseable value, leaving the copy to the caller', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate('')).toBeNull();
    expect(formatDate('not a date')).toBeNull();
    expect(parseIsoDate('garbage')).toBeNull();
  });

  it('formats a timestamp with its date and a 24-hour time', () => {
    expect(formatDateTime('2026-10-24T06:02:00.000Z')).toMatch(/^Oct 24, 2026 · \d{2}:02$/);
    expect(formatDateTime(null)).toBeNull();
  });
});
