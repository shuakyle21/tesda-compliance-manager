import { describe, it, expect } from 'vitest';
import { isSessionExistsError } from '@/modules/auth/domain/sessionExists';

describe('isSessionExistsError', () => {
  it('matches Clerk session_exists in an errors array', () => {
    expect(isSessionExistsError({ errors: [{ code: 'session_exists' }] })).toBe(true);
  });

  it('matches when session_exists is not the first error', () => {
    expect(isSessionExistsError({ errors: [{ code: 'form_x' }, { code: 'session_exists' }] })).toBe(true);
  });

  it('ignores other Clerk error codes', () => {
    expect(isSessionExistsError({ errors: [{ code: 'form_password_incorrect' }] })).toBe(false);
  });

  it('ignores non-Clerk and empty values', () => {
    expect(isSessionExistsError(new Error('Failed to fetch'))).toBe(false);
    expect(isSessionExistsError(null)).toBe(false);
    expect(isSessionExistsError(undefined)).toBe(false);
    expect(isSessionExistsError({ errors: [] })).toBe(false);
  });
});
