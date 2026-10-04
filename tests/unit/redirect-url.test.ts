import { describe, it, expect } from 'vitest';
import { sanitizeRedirectUrl } from '@/modules/auth/domain/redirectUrl';

describe('sanitizeRedirectUrl', () => {
  it('accepts same-origin relative paths', () => {
    expect(sanitizeRedirectUrl('/dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectUrl('/batches?tab=2')).toBe('/batches?tab=2');
    expect(sanitizeRedirectUrl('/sign-in#mfa')).toBe('/sign-in#mfa');
  });

  it('trims surrounding whitespace before validating', () => {
    expect(sanitizeRedirectUrl('  /dashboard  ')).toBe('/dashboard');
  });

  it('falls back to "/" when the param is missing or empty', () => {
    expect(sanitizeRedirectUrl(null)).toBe('/');
    expect(sanitizeRedirectUrl('')).toBe('/');
    expect(sanitizeRedirectUrl('   ')).toBe('/');
  });

  it('rejects absolute URLs with a scheme', () => {
    expect(sanitizeRedirectUrl('https://evil.com')).toBe('/');
    expect(sanitizeRedirectUrl('http://evil.com/phish')).toBe('/');
    expect(sanitizeRedirectUrl('javascript:alert(1)')).toBe('/');
    expect(sanitizeRedirectUrl('data:text/html,<h1>x</h1>')).toBe('/');
  });

  it('rejects protocol-relative origins', () => {
    expect(sanitizeRedirectUrl('//evil.com')).toBe('/');
    expect(sanitizeRedirectUrl('//evil.com/dashboard')).toBe('/');
  });

  it('rejects backslash tricks browsers normalize to a cross-origin origin', () => {
    expect(sanitizeRedirectUrl('/\\evil.com')).toBe('/');
    expect(sanitizeRedirectUrl('/\\evil.com/dashboard')).toBe('/');
  });

  it('rejects hostnames and paths that do not start with a slash', () => {
    expect(sanitizeRedirectUrl('evil.com')).toBe('/');
    expect(sanitizeRedirectUrl('dashboard')).toBe('/');
  });
});
