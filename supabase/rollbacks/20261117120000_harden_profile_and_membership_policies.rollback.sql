-- ROLLBACK for 20261117120000_harden_profile_and_membership_policies.sql
--
-- WARNING: ROLLING THIS BACK RE-OPENS THE CRITICAL FINDING F-01 (and F-02).
-- After it runs, any school admin can read and edit user profiles in every
-- school, including the platform admin's profile and the clerk_user_id login
-- link, and can add any profile to their own school. Use it only if the
-- assign-user flow is broken for real users, and switch the Add user screen
-- off at the same time.
--
-- This file lives outside supabase/migrations/ on purpose so it is never
-- applied automatically. Run it by hand, with owner approval (RULES.md
-- rule 36). It restores, verbatim, the policy text from 20260904120000 and
-- 20260906114735 and the table-wide grants from the canonical migration, then
-- drops everything the hardening migration added.
--
-- NOT restored: the revoke of anon's privileges on public.profiles. anon has
-- no policy on that table (RLS denied it before and still does), and "none"
-- is the intended state, so re-granting would only add risk.

-- 1. Drop the new policies (they depend on the helpers, so they go first).
drop policy if exists "Admins can read unassigned profiles" on public.profiles;
drop policy if exists "Admins can assign roles to visible profiles" on public.profiles;
drop policy if exists "Platform admins can read unassigned profiles" on public.profiles;
drop policy if exists "Admins can grant tenant membership" on public.profile_tenant_memberships;
drop policy if exists "Platform admins can seat a tenant's first members" on public.profile_tenant_memberships;

-- 2. Restore the previous policies (verbatim from the earlier migrations).

-- from 20260904120000 policy 1
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

-- from 20260904120000 policy 2
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

-- from 20260904120000 policy 3
create policy "Admins can grant tenant membership"
on public.profile_tenant_memberships
for insert
to authenticated
with check (
  app_private.current_role() = 'admin'
  and app_private.can_access_tenant(tenant_id)
);

-- from 20260906114735
create policy "Platform admins can seat a tenant's first members"
on public.profile_tenant_memberships
for insert
to authenticated
with check (
  app_private.is_platform_admin()
  and profile_id <> app_private.current_profile_id()
  and not exists (
    select 1
    from public.profile_tenant_memberships existing
    where existing.tenant_id = profile_tenant_memberships.tenant_id
  )
);

-- from 20260906114735
create policy "Platform admins can read unassigned profiles"
on public.profiles
for select
to authenticated
using (
  app_private.is_platform_admin()
  and not exists (
    select 1
    from public.profile_tenant_memberships ptm
    where ptm.profile_id = profiles.id
  )
);

-- 3. Restore the table-wide grants from the canonical migration
--    (grant select, insert, update, delete on all tables in schema public
--    to authenticated). Column-level grants are removed first.
revoke update (role, is_active, full_name) on public.profiles from authenticated;
grant insert, update, delete on public.profiles to authenticated;

-- 4. Drop the triggers, the index and the helpers.
drop trigger if exists profile_tenant_memberships_serialize_first on public.profile_tenant_memberships;
drop function if exists app_private.serialize_first_membership();
drop trigger if exists profiles_guard_identity_columns on public.profiles;
drop function if exists app_private.guard_profile_identity_columns();
drop index if exists public.profile_tenant_memberships_one_default_per_profile;
drop function if exists app_private.caller_is_admin_over_all_schools_of(uuid);
drop function if exists app_private.profile_is_active(uuid);
drop function if exists app_private.profile_is_platform_admin(uuid);
drop function if exists app_private.profile_has_any_membership(uuid);
