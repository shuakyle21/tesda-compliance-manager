-- Active: 1787931874292@@aws-1-ap-northeast-2.pooler.supabase.com@5432@postgres
-- Verification setup for the create-user screen (PR #213 / commit b3361a6).
--
-- PURPOSE
-- -------
-- Makes `/users/new` reachable and its write paths executable, so the feature
-- can be observed at runtime rather than inferred from unit tests. Two
-- independent parts; read both before running either.
--
-- Part 1 is the real migration (20260904120000), made re-runnable.
-- Part 2 is a TEMPORARY role change for verification only, with its revert.
--
-- Run with:  psql "$DATABASE_URL" -f supabase/seeds/verify_user_admin_setup.sql
-- or paste into the Supabase SQL editor.
--
-- WHY THIS IS A SEED AND NOT A MIGRATION
-- --------------------------------------
-- Part 1 duplicates `supabase/migrations/20260904120000_add_user_admin_write_policies.sql`
-- and is here only so the two halves can be applied in one paste. If you are
-- applying policies to a real environment, run the MIGRATION, not this file --
-- migrations are the schema record. Part 2 hardcodes a Clerk user ID, which
-- differs between Clerk dev and production instances, so it must never enter
-- supabase/migrations/ (same reasoning as dev_profile_memberships.sql).

begin;

-- ===========================================================================
-- PART 1 -- the migration's four policies, made idempotent.
-- ===========================================================================
-- The migration uses bare `create policy`, which errors on a second run. The
-- drops below make this file safe to re-run. They are also the uninstall: run
-- the four `drop policy if exists` statements alone to return the database to
-- its pre-migration state.
--
-- Semantics are otherwise IDENTICAL to the migration. If you change one, change
-- both -- a drifted copy of a security policy is worse than no copy.

drop policy if exists "Admins can read unassigned profiles" on public.profiles;
drop policy if exists "Admins can assign roles to visible profiles" on public.profiles;
drop policy if exists "Admins can grant tenant membership" on public.profile_tenant_memberships;
drop policy if exists "Admins can revoke tenant membership" on public.profile_tenant_memberships;

-- 1. An admin may see profiles that belong to no tenant yet -- the people
--    waiting to be assigned. Without this the base "own or same-tenant" read
--    policy hides them, since an unassigned profile shares a tenant with nobody.
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

-- 2. An admin may set role / active flag on a profile they can already see.
--    `with check` repeats the admin test so the statement cannot move a
--    profile out of the admin's own visibility.
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

-- 3. An admin may grant tenant access, but only to a tenant they belong to.
--    This is what stops an admin of school A granting access to school B.
create policy "Admins can grant tenant membership"
on public.profile_tenant_memberships
for insert
to authenticated
with check (
  app_private.current_role() = 'admin'
  and app_private.can_access_tenant(tenant_id)
);

-- 4. An admin may revoke a grant they could have made -- otherwise policy 3
--    is a one-way door and a mis-assignment needs a DBA.
create policy "Admins can revoke tenant membership"
on public.profile_tenant_memberships
for delete
to authenticated
using (
  app_private.current_role() = 'admin'
  and app_private.can_access_tenant(tenant_id)
);

-- ===========================================================================
-- PART 2 -- TEMPORARY: promote the demo account to admin.
-- ===========================================================================
-- READ THIS BEFORE RUNNING.
--
-- `demo@tvicams.app` is deliberately `viewer` (dev_profile_memberships.sql,
-- ADR-005 decision 2), and that is not an arbitrary choice: scoped to one
-- tenant with the least-privilege role, the demo account doubles as the
-- tenant-isolation test -- it must see exactly ONE batch (DEV-AKB-001) and
-- none of DEV-J3ED-001/002 or DEV-NEN-001/002. 100% tenant scoping is a P0
-- metric in the PRD.
--
-- Promoting it to admin therefore degrades that canary for as long as it is
-- promoted. It is done here only because demo is the sole account whose
-- credentials exist in `.env.local`; the two real admin accounts cannot be
-- signed into for a verification run.
--
-- The membership is left ALONE. demo already holds exactly AKB, which is all
-- the screen needs -- an admin can only grant a tenant they belong to, so one
-- membership is sufficient and adding more would widen the blast radius for
-- no gain.
--
-- REVERT AS SOON AS VERIFICATION ENDS. The revert is at the bottom of this
-- file, commented out.

update public.profiles
set role = 'admin', updated_at = now()
where clerk_user_id = 'user_3IMAGVRr7TnY3avksz6FbpIfPXj'
  and role is distinct from 'admin';

commit;

-- ---------------------------------------------------------------------------
-- Check what you just did
-- ---------------------------------------------------------------------------
-- Expect: demo@tvicams.app, role = admin, exactly one tenant (AKB).
--
--   select p.email, p.role, t.code
--   from public.profiles p
--   left join public.profile_tenant_memberships m on m.profile_id = p.id
--   left join public.tenants t on t.id = m.tenant_id
--   where p.clerk_user_id = 'user_3IMAGVRr7TnY3avksz6FbpIfPXj';
--
-- Expect four rows -- the policies from Part 1:
--
--   select tablename, policyname, cmd
--   from pg_policies
--   where schemaname = 'public'
--     and policyname like 'Admins can%'
--   order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- REVERT (Part 2) -- run this when verification is finished
-- ---------------------------------------------------------------------------
--   update public.profiles
--   set role = 'viewer', updated_at = now()
--   where clerk_user_id = 'user_3IMAGVRr7TnY3avksz6FbpIfPXj'
--     and role is distinct from 'viewer';
--
-- Part 1 needs no revert -- those policies are the feature, and the real
-- migration should be applied properly via supabase/migrations/ anyway. To
-- undo them, run the four `drop policy if exists` statements at the top.
