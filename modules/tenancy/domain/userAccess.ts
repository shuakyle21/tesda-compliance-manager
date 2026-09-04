/**
 * User-access rules (FR-02) — pure, no I/O.
 *
 * The "create user" form's whole contract lives here: which roles an admin may
 * assign, what a submitted draft must satisfy, and how a raw form payload
 * becomes a validated command. Kept out of `data/` and `ui/` so the rules are
 * unit-testable without Supabase or React, and so the Server Action and the
 * client form can enforce exactly the same thing rather than drifting apart.
 *
 * Validation here is a usability contract, not a security one. Postgres RLS
 * (migration 20260904120000) decides what an admin may actually write.
 */

import type { UserRole } from '@/shared/types';

/**
 * The roles an admin may assign through the UI.
 *
 * Deliberately narrower than `UserRole`, which carries a UI-only `'owner'`
 * with no `public.profile_role` enum value behind it — offering it would
 * produce a write Postgres rejects. Typed as the tuple so `AssignableRole`
 * below is derived from the same list the form renders, and adding a DB enum
 * variant means editing one place.
 */
export const ASSIGNABLE_ROLES = [
  'admin',
  'coordinator',
  'trainer',
  'viewer',
] as const satisfies readonly UserRole[];

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * What each role means in plain language, shown beside the choice in the form.
 *
 * Copy rule (RULES.md sec.4): describes what the person can do in *this*
 * internal tool. It must never imply TESDA approval authority — TESDA
 * SIS/T2MIS/BSRS remain the authoritative systems.
 */
export const ROLE_DESCRIPTIONS: Record<AssignableRole, string> = {
  admin: 'Full access, including user administration and billing figures.',
  coordinator: 'Manages batches, documents and billing preparation for the school.',
  trainer: 'Sees only their assigned batches. Billing figures are withheld.',
  viewer: 'Read-only. Cannot change any record.',
};

export function isAssignableRole(value: unknown): value is AssignableRole {
  return typeof value === 'string' && (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

/** A form submission before validation — every field is whatever the form sent. */
export interface UserAccessDraft {
  fullName: unknown;
  email: unknown;
  role: unknown;
  tenantId: unknown;
}

/** A validated command, safe to hand to the data layer. */
export interface UserAccessCommand {
  fullName: string | null;
  email: string;
  role: AssignableRole;
  tenantId: string;
}

/** Field-keyed messages, so the form can render each one against its input. */
export type UserAccessFieldErrors = Partial<Record<keyof UserAccessDraft, string>>;

export type UserAccessValidation =
  | { ok: true; command: UserAccessCommand }
  | { ok: false; errors: UserAccessFieldErrors };

/**
 * Lowercases and trims an email for comparison and storage.
 *
 * `profiles.clerk_user_id` is unique but `profiles.email` is not, so the
 * duplicate check in `data/users.ts` is a lookup rather than a constraint —
 * it only works if both sides normalize identically. Casing is the realistic
 * divergence: Clerk stores what the user typed, an admin types it differently.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * A deliberately permissive email shape check: one `@`, something either side,
 * a dot in the domain, no whitespace.
 *
 * Not RFC 5322 — the real verification is that Clerk delivers the invitation
 * and the person clicks it. A stricter regex here would only reject valid
 * addresses that Clerk would have accepted.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validates a raw form payload against the assignable tenants the caller
 * actually belongs to.
 *
 * `allowedTenantIds` is passed in rather than fetched because this file is
 * pure. It matters: without it a submitted `tenantId` would be accepted for
 * any school, and while RLS would still reject the insert, the user would see
 * a generic failure instead of "pick a school you belong to". Every message is
 * phrased for a coordinator, not a developer, and none leaks a table name or
 * an internal id.
 */
export function validateUserAccessDraft(
  draft: UserAccessDraft,
  allowedTenantIds: readonly string[],
): UserAccessValidation {
  const errors: UserAccessFieldErrors = {};

  const fullName = asTrimmedString(draft.fullName);
  const email = normalizeEmail(asTrimmedString(draft.email));
  const tenantId = asTrimmedString(draft.tenantId);

  if (!email) {
    errors.email = 'Enter an email address.';
  } else if (!looksLikeEmail(email)) {
    errors.email = 'Enter a valid email address, for example name@school.edu.ph.';
  }

  if (!isAssignableRole(draft.role)) {
    errors.role = 'Choose a role.';
  }

  if (!tenantId) {
    errors.tenantId = 'Choose a school.';
  } else if (!allowedTenantIds.includes(tenantId)) {
    errors.tenantId = 'Choose a school you have access to.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    command: {
      // Empty stays null rather than becoming an empty string: `profiles`
      // makes `full_name` nullable, and the Clerk webhook writes null for a
      // user who has not set a name. One representation of "unknown".
      fullName: fullName || null,
      email,
      role: draft.role as AssignableRole,
      tenantId,
    },
  };
}

// ---------------------------------------------------------------------------
// Form state — the contract between the Server Action and the client form.
// ---------------------------------------------------------------------------

/**
 * What the create-user Server Action reports back.
 *
 * Declared here, in `domain/`, rather than beside the action in `app/`,
 * because `modules/tenancy/ui` needs the type and the import direction runs
 * `app -> modules -> shared` — UI may not reach into a route. The page passes
 * the action down as a prop typed by `CreateUserAction` below.
 *
 * Two success states, kept distinct because they mean different things to the
 * person at the desk: `assigned` means the user can sign in right now,
 * `invited` means nothing happens until they accept an email. Collapsing them
 * into one "Saved" would leave an admin believing access exists when it does
 * not.
 */
export type CreateUserFormState =
  | { status: 'idle' }
  | { status: 'invalid'; errors: UserAccessFieldErrors }
  | { status: 'assigned'; email: string; alreadyMember: boolean }
  | { status: 'invited'; email: string }
  | { status: 'duplicate'; email: string }
  | { status: 'denied' }
  | { status: 'unconfigured' }
  | { status: 'failed' };

export const IDLE_CREATE_USER_STATE: CreateUserFormState = { status: 'idle' };

/** Signature of the Server Action, shaped for React's `useActionState`. */
export type CreateUserAction = (
  previous: CreateUserFormState,
  formData: FormData,
) => Promise<CreateUserFormState>;
