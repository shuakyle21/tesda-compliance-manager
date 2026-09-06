# modules/tenancy — Tenant and Role-Based Access Control (FR-02)

Multi-tenant context and role model. Tenant context lives in the URL path segment (ADR-001); RLS is the security boundary — UI hiding is usability only.

## Contents
- `domain/profile.ts` — `Profile`, `hasTenantMembership` (role lives on `Profile.role: UserRole`, the same type `modules/auth/data/role.ts` resolves against — no separate role vocabulary)
- `data/tenancy.ts` — `getProfileSnapshot(clerkUserId)` (fetch/map, mirrors `modules/batches/data/batches.ts`'s pattern). First-sign-in provisioning is handled elsewhere: the Clerk `user.created` webhook (`app/api/webhooks/clerk/route.ts` → `modules/auth/data/provisioning.ts`) creates the `profiles` row via a service-role client, `role: 'viewer'`, no tenant membership — both stay admin-assigned. This module only reads that row.

## Planned
- Trainer-facing DTO filtering (billing/financial fields omitted server-side) is enforced here + in each module's `data/` layer

## User administration (added with the create-user screen)
- `domain/userAccess.ts` — pure rules for the create-user form: `ASSIGNABLE_ROLES`
  (the four DB roles; UI-only `owner` is excluded because `public.profile_role` has no
  such value), `validateUserAccessDraft`, and the `CreateUserFormState` contract shared
  by the Server Action and the form.
- `data/users.ts` — `findUserByEmail`, `assignUserAccess`. The write half of this module:
  sets a person's role and grants them a tenant, through the Clerk-scoped anon client so
  RLS decides. Never the service-role client — that bypasses RLS and belongs to the webhook.
- `ui/CreateUserForm.tsx` — the form. Takes the Server Action as a prop (the action lives in
  `app/(dashboard)/users/new/actions.ts` because it composes this module's `data/` with
  `modules/auth`'s, and a module's `data/` is private to it).

Migration `20260904120000_add_user_admin_write_policies.sql` adds the policies this depends
on: admins may read profiles with no tenant yet (the base "own or same-tenant" policy made
an unassigned profile invisible to everyone, so nobody could be assigned), set roles on
profiles they can see, and grant/revoke membership in tenants they belong to themselves.
**Not yet applied** — see the migration header.

## School registry and platform admin (ADR-006)

The screen `/users/new` presupposed. That one grants a person access to a school; nothing created
the school, so onboarding a TVI meant editing the canonical migration. `/schools/new` closes that.

- `domain/schoolDraft.ts` — pure rules for the add-school form: the TESDA vocabularies it suggests
  (`PROVIDER_TYPE_SUGGESTIONS`, `DELIVERY_MODE_SUGGESTIONS`, …), `validateSchoolDraft`, and the
  `CreateSchoolFormState` contract shared by the Server Action and the form. Mirrors
  `domain/userAccess.ts` field for field. Unit-tested in `tests/unit/school-draft.test.ts`.
- `data/platform.ts` — `getPlatformAdminSnapshot()` / `isPlatformAdmin()`. Answers "is the caller
  the platform operator" through the `current_user_is_platform_admin()` RPC, because
  `public.platform_admins` is deliberately unreadable through the anon client.
- `data/schools.ts` — `listQualifications`, `createSchool`. The write goes through the
  `create_school` RPC (one transaction, still `security invoker`, so RLS decides). Anon client
  only, never the service-role client.
- `ui/CreateSchoolForm.tsx` — the form, with repeatable program rows. The action lives in
  `app/(dashboard)/schools/new/actions.ts`.

**Platform admin is a different axis from `profile_role`.** Holding `admin` at a school grants
nothing on `/schools/new`, and being the operator makes you an admin nowhere. The role reaches the
school *registry* only — no policy gives it batches, learners, documents or LAMR. See ADR-006 §P3
before widening it.

Migration `20260906130000_add_school_registry_and_platform_admin.sql` adds the tables and policies
this depends on. **Not yet applied** — and neither are the three migrations before it. Enrolling
the first platform admin is a separate statement run against the project directly:

```sql
insert into public.platform_admins (profile_id)
select id from public.profiles where email = '<operator email>';
```
