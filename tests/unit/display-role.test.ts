/**
 * `resolveDisplayRole` — the presentation-variant picker extracted from
 * `app/(dashboard)/dashboard/page.tsx`.
 *
 * Worth pinning because its fallback is a least-privilege rule, not a
 * cosmetic default: an unresolved role must render the read-only `viewer`
 * variant, never a write-enabled one. These are usability assertions — the
 * security boundary is RLS plus the route's own trusted-role redirect, which
 * this function is deliberately not part of.
 */

import { describe, expect, it } from 'vitest';
import { resolveDisplayRole } from '@/modules/auth/data/role';

describe('resolveDisplayRole', () => {
  it('falls back to viewer when neither source names an office role', () => {
    expect(resolveDisplayRole(null, null)).toBe('viewer');
  });

  it('falls back to viewer for a trainer, who has no office variant', () => {
    // The route redirects trainers away before reaching here; this only
    // guarantees the fallback is least-privileged if one ever arrives.
    expect(resolveDisplayRole(null, 'trainer')).toBe('viewer');
  });

  it('uses the trusted role when no preview override is given', () => {
    expect(resolveDisplayRole(null, 'admin')).toBe('admin');
    expect(resolveDisplayRole(null, 'coordinator')).toBe('coordinator');
  });

  it('lets ?role= pick a different variant to preview', () => {
    expect(resolveDisplayRole('coordinator', 'admin')).toBe('coordinator');
  });

  it('ignores an unrecognised ?role= rather than treating it as a role', () => {
    expect(resolveDisplayRole('superuser', 'coordinator')).toBe('coordinator');
    expect(resolveDisplayRole('', 'admin')).toBe('admin');
  });

  it('does not let ?role=trainer select a trainer variant', () => {
    expect(resolveDisplayRole('trainer', 'admin')).toBe('admin');
  });

  it('degrades to viewer when an unrecognised override meets an unset role', () => {
    expect(resolveDisplayRole('superuser', null)).toBe('viewer');
  });
});
