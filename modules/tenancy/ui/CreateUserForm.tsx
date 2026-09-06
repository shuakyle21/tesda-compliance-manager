'use client';

/**
 * Create-user form (FR-01/FR-02) — the admin's screen for giving a person
 * access to a school.
 *
 * Client island because it needs `useActionState` for pending/result state.
 * It holds no rules of its own: the roles it renders and the messages it
 * shows come from `modules/tenancy/domain/userAccess.ts`, the same module the
 * Server Action validates with, so what the form accepts and what the server
 * accepts cannot drift.
 *
 * The action arrives as a prop rather than an import: it lives under `app/`
 * (it composes two modules) and the import direction runs `app -> modules`,
 * so the page passes it down.
 *
 * Copy rule (RULES.md sec.4): this grants access to *this* internal tool only.
 * Nothing here may read as TESDA authorisation.
 */

import { useActionState, useId } from 'react';
import { Icon, type IconName } from '@/shared/ui/Icon';
import {
  ASSIGNABLE_ROLES,
  IDLE_CREATE_USER_STATE,
  ROLE_DESCRIPTIONS,
  type CreateUserAction,
  type CreateUserFormState,
} from '@/modules/tenancy/domain/userAccess';

export interface CreateUserFormProps {
  action: CreateUserAction;
  /** The schools the signed-in admin may assign — their own memberships. */
  tenants: { id: string; name: string; code: string }[];
}

/**
 * One result banner spec: which icon, which tone class, what it says.
 *
 * Every state names its own icon and its own words. Tone is carried by the
 * class *in addition to* the icon and the sentence, never alone — a
 * coordinator who cannot distinguish the greens from the reds still reads
 * "invited" versus "couldn't", which is the whole point of the rule.
 */
type Banner = { icon: IconName; tone: string; text: string };

function bannerFor(state: CreateUserFormState): Banner | null {
  switch (state.status) {
    case 'assigned':
      return {
        icon: 'check',
        tone: 'success',
        text: state.alreadyMember
          ? `${state.email} already had access to this school. Their role has been updated.`
          : `${state.email} now has access. It applies the next time they open the app.`,
      };
    case 'invited':
      return {
        icon: 'send',
        tone: 'info',
        text: `Invitation sent to ${state.email}. They get access once they accept it and sign up.`,
      };
    case 'duplicate':
      // Reached when the lookup found nothing but Clerk did. Usually that
      // means a pending invitation — but it also covers someone who already
      // has an account at a school this admin cannot see, because the profile
      // lookup is RLS-scoped and reports "not registered" for anyone outside
      // the caller's reach. The wording has to be true in both cases, so it
      // does not send anyone to check an inbox that may hold nothing.
      return {
        icon: 'alert-triangle',
        tone: '',
        text: `${state.email} already has an account or a pending invitation, so nothing was sent. If they can't reach this school, an admin who already works with them can add it.`,
      };
    case 'denied':
      return {
        icon: 'alert-circle',
        tone: 'critical',
        text: 'You do not have permission to add users. Only an admin for this school can.',
      };
    case 'unconfigured':
      return {
        icon: 'alert-circle',
        tone: 'critical',
        text: 'User records are not available in this environment, so nothing was saved.',
      };
    case 'failed':
      return {
        icon: 'refresh',
        tone: 'critical',
        text: 'Something went wrong and nothing was saved. Try again in a moment.',
      };
    case 'invalid':
    case 'idle':
      return null;
  }
}

export function CreateUserForm({ action, tenants }: CreateUserFormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE_CREATE_USER_STATE);
  const fieldId = useId();

  const errors = state.status === 'invalid' ? state.errors : {};
  const banner = bannerFor(state);

  // Clearing the form on success would hide which address was just added and
  // force a re-type for the common "add three people from one list" case, so
  // the fields keep their values and the banner names the address instead.
  const nameId = `${fieldId}-name`;
  const emailId = `${fieldId}-email`;
  const schoolId = `${fieldId}-school`;

  return (
    <form action={formAction} className="user-form" noValidate>
      {banner && (
        <div
          className={`banner${banner.tone ? ` ${banner.tone}` : ''}`}
          // Results of the admin's own submit: announced, but not urgently
          // enough to interrupt what a screen reader is already saying.
          role="status"
          aria-live="polite"
        >
          <Icon name={banner.icon} size={16} />
          <span className="grow">{banner.text}</span>
        </div>
      )}

      <div className="user-form-field">
        <label className="user-form-label" htmlFor={nameId}>
          Full name <span className="user-form-optional">optional</span>
        </label>
        <input
          id={nameId}
          name="fullName"
          type="text"
          className="input"
          autoComplete="off"
          placeholder="Maria Santos"
        />
        <p className="user-form-hint">
          Used only until they set a name on their own account.
        </p>
      </div>

      <div className="user-form-field">
        <label className="user-form-label" htmlFor={emailId}>
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          className="input"
          autoComplete="off"
          required
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          placeholder="name@school.edu.ph"
        />
        {errors.email && <FieldError id={`${emailId}-error`}>{errors.email}</FieldError>}
        <p className="user-form-hint">
          If they have already signed up, access applies right away. If not, they
          are sent an invitation.
        </p>
      </div>

      <RoleField idPrefix={fieldId} error={errors.role} />

      <div className="user-form-field">
        <label className="user-form-label" htmlFor={schoolId}>
          School
        </label>
        <select
          id={schoolId}
          name="tenantId"
          className="input"
          required
          defaultValue={tenants.length === 1 ? tenants[0].id : ''}
          aria-invalid={errors.tenantId ? true : undefined}
          aria-describedby={errors.tenantId ? `${schoolId}-error` : undefined}
        >
          <option value="" disabled>
            Choose a school
          </option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name} ({tenant.code})
            </option>
          ))}
        </select>
        {errors.tenantId && <FieldError id={`${schoolId}-error`}>{errors.tenantId}</FieldError>}
      </div>

      <div className="user-form-actions">
        <button
          type="submit"
          className={`btn primary${pending ? ' loading' : ''}`}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? 'Adding…' : 'Add user'}
        </button>
        <p className="user-form-note">
          Grants access to this workspace only. It is not a TESDA registration
          and changes nothing in SIS, T2MIS or BSRS.
        </p>
      </div>
    </form>
  );
}

/**
 * The role choice, as radios rather than a select: each option carries a
 * sentence saying what it grants, and a select cannot show those while you
 * are choosing. Split out of `CreateUserForm` to keep that function's
 * branching under the repo's complexity ceiling.
 *
 * Defaults to `viewer` — the least-privileged role — so an admin who submits
 * without reading grants read-only access rather than write access.
 */
function RoleField({ idPrefix, error }: { idPrefix: string; error?: string }) {
  const errorId = `${idPrefix}-role-error`;

  return (
    <fieldset
      className="user-form-field user-form-roles"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="user-form-label">Role</legend>
      {ASSIGNABLE_ROLES.map((role) => (
        <label key={role} className="user-form-role" htmlFor={`${idPrefix}-${role}`}>
          <input
            id={`${idPrefix}-${role}`}
            type="radio"
            name="role"
            value={role}
            defaultChecked={role === 'viewer'}
          />
          <span>
            <span className="user-form-role-name">{role}</span>
            <span className="user-form-role-desc">{ROLE_DESCRIPTIONS[role]}</span>
          </span>
        </label>
      ))}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}

/**
 * A field-level message. `role="alert"` because it appears in response to the
 * admin's submit and names the input they must go back and fix; the icon
 * carries the same "this is a problem" signal as the colour.
 */
function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p className="user-form-error" id={id} role="alert">
      <Icon name="alert-circle" size={14} />
      <span>{children}</span>
    </p>
  );
}

export default CreateUserForm;
