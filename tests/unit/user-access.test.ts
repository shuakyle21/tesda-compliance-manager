/**
 * The create-user rules: what an admin may submit, and what a Clerk
 * invitation is allowed to grant on acceptance.
 *
 * Both are access-control adjacent, so the assertions worth pinning are the
 * refusals rather than the happy path. `validateUserAccessDraft` is a
 * usability contract — RLS is the real boundary — but
 * `parseInvitationGrant` is read by the webhook, which runs with the
 * service-role client and no RLS above it, so its all-or-nothing behaviour
 * is genuinely load-bearing.
 */

import { describe, expect, it } from 'vitest';
import {
  ASSIGNABLE_ROLES,
  isAssignableRole,
  normalizeEmail,
  validateUserAccessDraft,
} from '@/modules/tenancy/domain/userAccess';
import {
  buildInvitationMetadata,
  parseInvitationGrant,
} from '@/modules/auth/domain/invitationMetadata';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

function draft(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    fullName: 'Maria Santos',
    email: 'maria@school.edu.ph',
    role: 'coordinator',
    tenantId: TENANT_A,
    ...overrides,
  };
}

describe('assignable roles', () => {
  it('excludes the UI-only owner role', () => {
    // `owner` exists in `UserRole` but has no `public.profile_role` value, so
    // offering it would build a write Postgres rejects.
    expect(ASSIGNABLE_ROLES).not.toContain('owner');
    expect(isAssignableRole('owner')).toBe(false);
  });

  it('accepts exactly the four DB roles', () => {
    expect([...ASSIGNABLE_ROLES]).toEqual(['admin', 'coordinator', 'trainer', 'viewer']);
  });

  it('rejects non-string and unknown values', () => {
    expect(isAssignableRole(undefined)).toBe(false);
    expect(isAssignableRole(null)).toBe(false);
    expect(isAssignableRole('Admin')).toBe(false);
    expect(isAssignableRole('superuser')).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims so lookups match what the webhook stored', () => {
    expect(normalizeEmail('  Maria@School.EDU.ph ')).toBe('maria@school.edu.ph');
  });
});

describe('validateUserAccessDraft', () => {
  it('accepts a complete draft for a school the caller belongs to', () => {
    const result = validateUserAccessDraft(draft(), [TENANT_A, TENANT_B]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.command).toEqual({
      fullName: 'Maria Santos',
      email: 'maria@school.edu.ph',
      role: 'coordinator',
      tenantId: TENANT_A,
    });
  });

  it('normalizes the email into the command', () => {
    const result = validateUserAccessDraft(draft({ email: ' Maria@School.edu.PH ' }), [TENANT_A]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.command.email).toBe('maria@school.edu.ph');
  });

  it('turns a blank name into null rather than an empty string', () => {
    // `profiles.full_name` is nullable and the webhook writes null for a user
    // with no name — one representation of "unknown", not two.
    const result = validateUserAccessDraft(draft({ fullName: '   ' }), [TENANT_A]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.command.fullName).toBeNull();
  });

  it('refuses a school the caller does not belong to', () => {
    // The RLS policy would refuse this too; failing here is what turns a bare
    // denial into a message pointing at the field.
    const result = validateUserAccessDraft(draft({ tenantId: TENANT_B }), [TENANT_A]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.tenantId).toBeTruthy();
  });

  it('refuses a role outside the assignable set', () => {
    const result = validateUserAccessDraft(draft({ role: 'owner' }), [TENANT_A]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.role).toBeTruthy();
  });

  it('reports every bad field at once, not just the first', () => {
    const result = validateUserAccessDraft(
      { fullName: '', email: 'not-an-email', role: null, tenantId: '' },
      [TENANT_A],
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.role).toBeTruthy();
    expect(result.errors.tenantId).toBeTruthy();
  });

  it('names no table, column or id in any message', () => {
    const result = validateUserAccessDraft(
      { fullName: '', email: '', role: null, tenantId: 'nope' },
      [TENANT_A],
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    for (const message of Object.values(result.errors)) {
      expect(message).not.toMatch(/profiles|tenant_id|profile_tenant_memberships|uuid/i);
    }
  });
});

describe('parseInvitationGrant', () => {
  it('round-trips a grant the inviting admin authored', () => {
    const metadata = buildInvitationMetadata({ role: 'trainer', tenantId: TENANT_A });

    expect(parseInvitationGrant(metadata)).toEqual({ role: 'trainer', tenantId: TENANT_A });
  });

  it('returns null for a self sign-up carrying no metadata', () => {
    // The webhook's fallback is `viewer` with no membership, so null here is
    // what keeps self sign-up from granting itself access.
    expect(parseInvitationGrant(undefined)).toBeNull();
    expect(parseInvitationGrant(null)).toBeNull();
    expect(parseInvitationGrant({})).toBeNull();
  });

  it('refuses a half-formed grant rather than applying part of it', () => {
    // A role with no school, or a school with no role, must cost an admin one
    // manual assignment — never hand out an unintended grant.
    expect(parseInvitationGrant({ tvicamsRole: 'admin' })).toBeNull();
    expect(parseInvitationGrant({ tvicamsTenantId: TENANT_A })).toBeNull();
    expect(parseInvitationGrant({ tvicamsRole: 'admin', tvicamsTenantId: '   ' })).toBeNull();
  });

  it('refuses a role outside the DB enum', () => {
    expect(
      parseInvitationGrant({ tvicamsRole: 'owner', tvicamsTenantId: TENANT_A }),
    ).toBeNull();
    expect(
      parseInvitationGrant({ tvicamsRole: 'superuser', tvicamsTenantId: TENANT_A }),
    ).toBeNull();
  });

  it('ignores unrelated metadata on the same user', () => {
    // Namespaced keys mean metadata set for some other purpose can never be
    // mistaken for an access grant.
    expect(parseInvitationGrant({ role: 'admin', tenantId: TENANT_A })).toBeNull();
    expect(parseInvitationGrant({ theme: 'dark' })).toBeNull();
  });

  it('accepts a grant alongside unrelated keys', () => {
    expect(
      parseInvitationGrant({
        theme: 'dark',
        tvicamsRole: 'viewer',
        tvicamsTenantId: TENANT_A,
      }),
    ).toEqual({ role: 'viewer', tenantId: TENANT_A });
  });
});
