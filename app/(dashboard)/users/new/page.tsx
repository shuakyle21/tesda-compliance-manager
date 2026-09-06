/**
 * SCREEN ROUTE — Add a user (FR-01/FR-02).
 *
 * The screen the sign-up flow already promises: `modules/auth/ui/SignUpModal`
 * tells a new user "your registrar will assign your school and role", and
 * until now nothing performed that assignment. A self sign-up lands as a
 * `viewer` with no tenant membership (`modules/auth/data/provisioning.ts`),
 * which under RLS means no data at all.
 *
 * Server Component: resolves the caller's identity and role, hands the form
 * the schools they may assign, and composes the client island. No business
 * logic here — validation is `modules/tenancy/domain/userAccess.ts`, the write
 * is `modules/tenancy/data/users.ts`, and the Server Action that joins them
 * to Clerk is `./actions.ts`.
 */

import Link from 'next/link';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getAuthUserId } from '@/modules/auth/data/auth';
import { resolveTrustedRole } from '@/modules/auth/data/role';
import { getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import { CreateUserForm } from '@/modules/tenancy/ui/CreateUserForm';
import { createUserAction } from './actions';

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Add user</h1>
      </div>
      {children}
    </div>
  );
}

export default async function NewUserPage() {
  const clerkUserId = await getAuthUserId();
  if (!clerkUserId) {
    return (
      <PageShell>
        <EmptyState
          iconName="shield-off"
          heading="Sign in to manage users"
          sub="You need to be signed in as an admin for this school."
          action={
            <Link href="/sign-in" className="btn primary" style={{ marginTop: 12 }}>
              Sign in
            </Link>
          }
        />
      </PageShell>
    );
  }

  const profileSnapshot = await getProfileSnapshot(clerkUserId);

  // Honest empty states, never substituted data: `unconfigured` means no
  // Supabase in this environment, `sync-failed` means it errored. Both render
  // as themselves; `sync-failed` additionally offers the retry.
  if (profileSnapshot.status === 'unconfigured') {
    return (
      <PageShell>
        <EmptyState
          iconName="file-off"
          heading="User records aren't available here"
          sub="This environment has no connection to the records store, so users can't be added."
        />
      </PageShell>
    );
  }

  if (profileSnapshot.status === 'sync-failed') {
    return (
      <PageShell>
        <EmptyState
          iconName="refresh"
          heading="Couldn't load your account"
          sub="User administration isn't available right now. Try again in a moment."
          action={
            <Link href="/users/new" className="btn primary" style={{ marginTop: 12 }}>
              Retry
            </Link>
          }
        />
      </PageShell>
    );
  }

  const profile = profileSnapshot.status === 'ok' ? profileSnapshot.profile : null;

  // Gated on `resolveTrustedRole`, never `resolveRouteRole` — the latter
  // honours a `?role=` preview override, and this screen must not be
  // previewable into existence by a non-admin. RLS would still refuse the
  // write, but the Clerk invitation branch of the action has no RLS behind
  // it, so the gate matters here as well as in the action.
  const trustedRole = await resolveTrustedRole(profile?.role ?? null);

  if (trustedRole !== 'admin') {
    return (
      <PageShell>
        <EmptyState
          iconName="shield-off"
          heading="Only admins can add users"
          sub="Ask an admin for your school to give someone access."
        />
      </PageShell>
    );
  }

  const tenants = (profile?.tenants ?? []).map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    code: tenant.code,
  }));

  // An admin with no school of their own has nothing to grant: every path
  // would fail at the RLS check that a grant targets a tenant the caller
  // belongs to. Say so rather than render a form whose only outcome is a
  // denial.
  if (tenants.length === 0) {
    return (
      <PageShell>
        <EmptyState
          iconName="users"
          heading="You're not assigned to a school yet"
          sub="You can give someone access once your own account is assigned to a school."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <p className="user-form-intro">
        Give someone access to this workspace. They sign in with their own
        account; you choose what they can see.
      </p>
      <CreateUserForm action={createUserAction} tenants={tenants} />
    </PageShell>
  );
}
