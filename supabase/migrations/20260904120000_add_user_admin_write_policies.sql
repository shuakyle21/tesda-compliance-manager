-- User administration write policies (FR-01/FR-02).
--
-- WHY THIS EXISTS
-- ---------------
-- `modules/auth/data/provisioning.ts` creates a `profiles` row for every new
-- Clerk user with `role = 'viewer'` and *no* tenant membership, because the
-- sign-up copy promises "your registrar will assign your school and role"
-- (`modules/auth/ui/SignUpModal.tsx`). Until now nothing could perform that
-- assignment: the base migration gives `profiles` and
-- `profile_tenant_memberships` SELECT-only policies, so the Clerk-scoped anon
-- client could not write either table.
--
-- Worse, the assignment was not merely unwritable but *invisible*. The base
-- read policy ("Users can read own or same-tenant profiles") matches a row
-- only when the reader and the target share a tenant. A profile with zero
-- memberships shares a tenant with nobody, so no admin could even list the
-- users waiting to be assigned. Policy 1 below closes that hole.
--
-- Authorization stays in Postgres on purpose. The write path is a Server
-- Action, which carries a Clerk session, so it must go through the anon-key
-- client and RLS -- not `lib/supabase/service.ts`, whose service-role client
-- bypasses RLS and is reserved for the webhook (no session exists there).
-- RLS is the security boundary; the role check in the Server Action is
-- usability plus defence in depth (CLAUDE.md, RULES.md sec.1).
--
-- SCOPE DECISION: user administration is admin-only, not admin+coordinator.
-- `app_private.can_manage_tenant()` would have admitted coordinators, but a
-- coordinator who could grant tenant access while an admin alone could set
-- roles is a split boundary that drifts. One role owns the whole operation.
-- Revisit deliberately if coordinators need it.
--
-- Additive only: no existing policy is dropped or replaced. Postgres
-- OR-combines permissive policies, so policy 1 widens the existing SELECT
-- rather than loosening it for anyone already covered.

-- 1. Let an admin see profiles that belong to no tenant yet.
--
-- Deliberately NOT scoped to the admin's own tenants -- an unassigned profile
-- has no tenant to scope by, which is the whole point. The exposure is
-- bounded to name/email of users who have signed up but hold no access
-- anywhere, and it ends the moment the profile is assigned (after which the
-- base same-tenant policy governs it). In a deployment with mutually
-- distrusting tenants this pool would need an explicit owner column instead;
-- flagged rather than assumed.
create policy "Admins can read unassigned profiles"
on public.profiles
for select
to authenticated
using (
  app_private.current_role() = 'admin'
  and not exists (
    select 1
    from public.profile_tenant_memberships ptm
    where ptm.profile_id = profiles.id
  )
);

-- 2. Let an admin set the role / active flag on a profile they can already
--    see: an unassigned one (policy 1) or one sharing a tenant with them.
--
-- `using` gates which row may be updated; `with check` gates the row's state
-- afterwards. Both repeat the predicate so an admin cannot move a profile
-- out of their own visibility in the same statement.
create policy "Admins can assign roles to visible profiles"
on public.profiles
for update
to authenticated
using (
  app_private.current_role() = 'admin'
  and (
    not exists (
      select 1
      from public.profile_tenant_memberships ptm
      where ptm.profile_id = profiles.id
    )
    or exists (
      select 1
      from public.profile_tenant_memberships viewer_membership
      join public.profile_tenant_memberships target_membership
        on target_membership.tenant_id = viewer_membership.tenant_id
      where viewer_membership.profile_id = app_private.current_profile_id()
        and target_membership.profile_id = profiles.id
    )
  )
)
with check (
  app_private.current_role() = 'admin'
);

-- 3. Let an admin grant tenant access -- but only to a tenant they belong to
--    themselves.
--
-- `can_access_tenant` (membership) rather than `can_manage_tenant`
-- (membership + admin/coordinator role) because the role half is already
-- asserted on the line above, and admin-only is the scope decision recorded
-- in the header. The combination stops an admin of school A from granting
-- anyone access to school B.
create policy "Admins can grant tenant membership"
on public.profile_tenant_memberships
for insert
to authenticated
with check (
  app_private.current_role() = 'admin'
  and app_private.can_access_tenant(tenant_id)
);

-- 4. Let an admin revoke a grant they could have made. Correcting a
--    mis-assignment must not require a DBA; without this, policy 3 is a
--    one-way door.
create policy "Admins can revoke tenant membership"
on public.profile_tenant_memberships
for delete
to authenticated
using (
  app_private.current_role() = 'admin'
  and app_private.can_access_tenant(tenant_id)
);
