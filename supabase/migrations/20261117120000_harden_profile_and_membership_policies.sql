-- Harden profile and membership policies (security remediation item 1.1).
--
-- Closes: F-01 (a school admin can edit user profiles in every school,
--               including the login link) and
--         F-02 (membership insert checks the school but not the person).
--         See docs/security/FINDINGS.md and docs/security/REMEDIATION_PLAN.md
--         section "1.1 in detail". The two findings are fixed together on
--         purpose: F-02 re-opens F-01 (an admin who can add anyone to their
--         school can then edit that person).
--
-- STATUS: NOT APPLIED: needs owner approval. Do not run this against the
--         hosted project without it (RULES.md rule 36). It was tested only on
--         a throwaway local Postgres 16 (supabase/tests/README.md).
--
-- REPLACES (policy text is restored verbatim by
-- supabase/rollbacks/20261117120000_harden_profile_and_membership_policies.rollback.sql):
--   public.profiles
--     "Admins can read unassigned profiles"                 (20260904120000)
--     "Admins can assign roles to visible profiles"         (20260904120000)
--     "Platform admins can read unassigned profiles"        (20260906114735)
--   public.profile_tenant_memberships
--     "Admins can grant tenant membership"                  (20260904120000)
--     "Platform admins can seat a tenant's first members"   (20260906114735)
--   Grants: the table-wide UPDATE (and INSERT, DELETE) that `authenticated`
--   holds on public.profiles from the canonical migration, and anything
--   `anon` holds there.
--
-- WHY THE OLD POLICIES WERE WRONG (one paragraph)
-- A subquery inside a policy runs as the caller, so RLS on the table it reads
-- applies to it too. "This profile has no membership" therefore meant "no
-- membership that I may see", and an admin may only see their own schools'
-- memberships. Every person in another school (and the platform admin, who has
-- no school by design, ADR-006) looked unassigned, so any admin could read and
-- update them. The update policy's WITH CHECK only re-checked "caller is
-- admin", and the table-wide UPDATE grant let that update reach clerk_user_id
-- (the login link) and email.
--
-- THE FIX, IN FOUR TOOLS
--   1. SECURITY DEFINER yes/no helpers (section 1). They see every row, answer
--      with a boolean only, and fix the "no membership" test.
--   2. Column privileges (section 2). `authenticated` may update only
--      role, is_active, full_name. clerk_user_id, email and id are unreachable
--      from the API.
--   3. Rewritten policies (sections 3 to 5) with the same predicate in USING
--      and WITH CHECK.
--   4. A trigger backstop (section 6) and a one-default-per-person index
--      (section 7).
--
-- ONE ROLE IS STILL GLOBAL (F-03, not fixed here). profiles.role applies in
-- every school the person belongs to, so an admin may change a person's role
-- only when EVERY school that person belongs to is one the caller belongs to.
-- Per-school roles need an ADR (plan item 3.1).
--
-- PRE-CHECK for section 7 (run before applying; expect zero rows). If it
-- returns rows, section 7 skips itself with a NOTICE and you must clean the
-- data, then create the index by hand (statement is in section 7):
--
--   select profile_id, count(*) as default_memberships
--   from public.profile_tenant_memberships
--   where is_default
--   group by profile_id
--   having count(*) > 1;
--
-- Not in this file (outside item 1.1): per-school roles (F-03), the unassigned
-- pool becoming an exact-email lookup (plan 3.7), the single "assign user" RPC
-- (plan 3.2), `can_access_tenant` requiring an active school (plan 1.13).

-- ===========================================================================
-- 1. Trusted yes/no helpers
-- ===========================================================================
--
-- SECURITY DEFINER so they read profiles / profile_tenant_memberships /
-- platform_admins without RLS getting in the way. Boolean results only: a
-- caller learns nothing from them that they could not already ask the
-- policies. `app_private` is not exposed by PostgREST, so they are reachable
-- only from policy evaluation. Same shape as the helpers in the canonical
-- migration: `set search_path = ''`, schema-qualified names, stable.

-- Does this profile belong to any school at all, in any tenant?
create or replace function app_private.profile_has_any_membership(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_tenant_memberships ptm
    where ptm.profile_id = target_profile_id
  );
$$;

-- Is this profile a platform admin (ADR-006)? Deliberately not filtered on
-- is_active: a deactivated platform admin is still not an ordinary user and
-- must stay out of every school-admin path.
create or replace function app_private.profile_is_platform_admin(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.profile_id = target_profile_id
  );
$$;

-- Is this profile active?
create or replace function app_private.profile_is_active(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and p.is_active = true
  );
$$;

-- Is the caller an admin, and is every school the target belongs to a school
-- the caller belongs to? A target with no membership passes (nothing to be
-- outside of), which is how "truly unassigned" is covered. The caller's
-- membership is read by profile id, not through can_access_tenant, so this
-- is the whole question in one place.
create or replace function app_private.caller_is_admin_over_all_schools_of(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app_private.current_role() = 'admin', false)
    and not exists (
      select 1
      from public.profile_tenant_memberships target_membership
      where target_membership.profile_id = target_profile_id
        and not exists (
          select 1
          from public.profile_tenant_memberships caller_membership
          where caller_membership.profile_id = app_private.current_profile_id()
            and caller_membership.tenant_id = target_membership.tenant_id
        )
    );
$$;

revoke execute on function app_private.profile_has_any_membership(uuid) from public, anon;
revoke execute on function app_private.profile_is_platform_admin(uuid) from public, anon;
revoke execute on function app_private.profile_is_active(uuid) from public, anon;
revoke execute on function app_private.caller_is_admin_over_all_schools_of(uuid) from public, anon;

grant execute on function app_private.profile_has_any_membership(uuid) to authenticated;
grant execute on function app_private.profile_is_platform_admin(uuid) to authenticated;
grant execute on function app_private.profile_is_active(uuid) to authenticated;
grant execute on function app_private.caller_is_admin_over_all_schools_of(uuid) to authenticated;

-- ===========================================================================
-- 2. Column privileges on public.profiles
-- ===========================================================================
--
-- UPDATE: table-wide grant removed; only the three columns the assign-user
-- screen writes (modules/tenancy/data/users.ts: role, full_name, is_active
-- via restorePriorRole's role write). The webhook uses the service role and
-- is unaffected. `updated_at` is set by the profiles_set_updated_at trigger,
-- which is not subject to the caller's column privileges.
--
-- INSERT and DELETE: no policy on public.profiles allows either for
-- `authenticated` (there is no INSERT or DELETE policy at all), and no
-- authenticated code path uses them (profiles are created and deactivated by
-- modules/auth/data/provisioning.ts on the service-role client). The grants
-- were inert, so they are removed: a future permissive policy then still
-- cannot hand out row creation or deletion by accident.
--
-- anon: has no policy on this table, so RLS already denies it. Hosted
-- Supabase also hands `anon` table privileges through default privileges, so
-- they are revoked here to make "none" a property of the grants as well.
revoke update, insert, delete on public.profiles from authenticated;
grant update (role, is_active, full_name) on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- ===========================================================================
-- 3. public.profiles: who an admin may see
-- ===========================================================================
--
-- The base policy "Users can read own or same-tenant profiles" already
-- covers "shares a school with me" for admins and coordinators, so it is not
-- duplicated here. This policy adds only the unassigned pool, and the pool is
-- now truly unassigned (definer helper), active, and never a platform admin.
drop policy if exists "Admins can read unassigned profiles" on public.profiles;
create policy "Admins can read unassigned profiles"
on public.profiles
for select
to authenticated
using (
  app_private.current_role() = 'admin'
  and profiles.is_active = true
  and not app_private.profile_has_any_membership(profiles.id)
  and not app_private.profile_is_platform_admin(profiles.id)
);

-- ===========================================================================
-- 4. public.profiles: who an admin may change
-- ===========================================================================
--
-- An admin may update a profile only if
--   - it is not a platform admin's profile (never, ADR-006), and
--   - every school it belongs to is a school the caller belongs to, or it
--     belongs to none (caller_is_admin_over_all_schools_of), and
--   - it is a person this admin could see: unassigned profiles must also be
--     active (matches the pool read policy), assigned ones may be inactive so
--     an admin can still reactivate a colleague.
-- WITH CHECK repeats USING, so a row cannot be moved out of scope by the same
-- statement. Which COLUMNS may change is section 2, not this policy.
--
-- SELF-EDIT, decided deliberately: an admin may still change their own
-- role / is_active / full_name, exactly as before. Their own profile passes
-- the predicate (every school they belong to is one they belong to). Blocking
-- it would be a new rule that can lock out the only admin of a school, and
-- the Critical finding is about other people's rows. A last-admin guard
-- belongs with the single "assign user" function (plan item 3.2).
--
-- A side effect of repeating USING in WITH CHECK: an admin cannot
-- deactivate a person who has no school yet (the row would stop being a visible
-- unassigned profile). Add the person to the school first, then deactivate.
drop policy if exists "Admins can assign roles to visible profiles" on public.profiles;
create policy "Admins can assign roles to visible profiles"
on public.profiles
for update
to authenticated
using (
  app_private.current_role() = 'admin'
  and not app_private.profile_is_platform_admin(profiles.id)
  and app_private.caller_is_admin_over_all_schools_of(profiles.id)
  and (
    profiles.is_active = true
    or app_private.profile_has_any_membership(profiles.id)
  )
)
with check (
  app_private.current_role() = 'admin'
  and not app_private.profile_is_platform_admin(profiles.id)
  and app_private.caller_is_admin_over_all_schools_of(profiles.id)
  and (
    profiles.is_active = true
    or app_private.profile_has_any_membership(profiles.id)
  )
);

-- ===========================================================================
-- 5. public.profile_tenant_memberships: who may be added where
-- ===========================================================================

-- School admin adds a person to their own school. The person must be active,
-- not a platform admin, and have no membership anywhere yet. Anyone who
-- already belongs to a school is out of reach until per-school roles exist
-- (F-03); the platform admin seats cross-school cases.
--
-- is_default is NOT restricted. The target is guaranteed to have no other
-- membership, so this is their first school and `is_default = true` is
-- correct (it is what the invitation path writes), and `false` also lands
-- correctly because mapProfileRow falls back to the first membership. The
-- partial unique index in section 7 is what guarantees at most one default
-- per person, including under two admins adding the same person at once.
drop policy if exists "Admins can grant tenant membership" on public.profile_tenant_memberships;
create policy "Admins can grant tenant membership"
on public.profile_tenant_memberships
for insert
to authenticated
with check (
  app_private.current_role() = 'admin'
  and app_private.can_access_tenant(tenant_id)
  and app_private.profile_is_active(profile_id)
  and not app_private.profile_is_platform_admin(profile_id)
  and not app_private.profile_has_any_membership(profile_id)
);

-- Platform admin seating: unchanged (never themselves, only into a school
-- with no members yet) plus: the person seated is active, is not a platform
-- admin, and has no membership anywhere, i.e. comes from the unassigned pool.
-- That is the only pool the platform admin can read, and the only people the
-- school-creation flow hands to a new school, so no real flow is narrowed.
-- It stops the platform admin from attaching someone who already works at
-- another school (their global role would then apply in the new school too).
drop policy if exists "Platform admins can seat a tenant's first members" on public.profile_tenant_memberships;
create policy "Platform admins can seat a tenant's first members"
on public.profile_tenant_memberships
for insert
to authenticated
with check (
  app_private.is_platform_admin()
  and profile_id <> app_private.current_profile_id()
  and app_private.profile_is_active(profile_id)
  and not app_private.profile_is_platform_admin(profile_id)
  and not app_private.profile_has_any_membership(profile_id)
  and not exists (
    select 1
    from public.profile_tenant_memberships existing
    where existing.tenant_id = profile_tenant_memberships.tenant_id
  )
);

-- Platform admin reads the unassigned pool through the definer helper, so
-- the answer no longer depends on which memberships a sibling SELECT policy
-- happens to show them.
drop policy if exists "Platform admins can read unassigned profiles" on public.profiles;
create policy "Platform admins can read unassigned profiles"
on public.profiles
for select
to authenticated
using (
  app_private.is_platform_admin()
  and not app_private.profile_has_any_membership(profiles.id)
);

-- ===========================================================================
-- 6. Backstop: identity columns are immutable for API roles
-- ===========================================================================
--
-- Section 2 already makes id and clerk_user_id impossible to update through
-- the API. This trigger is the safety net for the day someone re-runs a
-- table-wide grant (the canonical migration does exactly that, and it is a
-- pattern people copy). It is SECURITY INVOKER on purpose, so current_user is
-- the real caller. Allowed: service_role (the Clerk webhook), a superuser, or
-- the table owner (migrations and the dashboard SQL editor).
create or replace function app_private.guard_profile_identity_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id is distinct from old.id
      or new.clerk_user_id is distinct from old.clerk_user_id)
     and not (
       current_user = 'service_role'
       or exists (
         select 1 from pg_catalog.pg_roles r
         where r.rolname = current_user and r.rolsuper
       )
       or current_user = (
         select pg_catalog.pg_get_userbyid(c.relowner)
         from pg_catalog.pg_class c
         where c.oid = 'public.profiles'::pg_catalog.regclass
       )
     )
  then
    raise exception 'profiles.id and profiles.clerk_user_id cannot be changed by this role'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function app_private.guard_profile_identity_columns() from public, anon;

drop trigger if exists profiles_guard_identity_columns on public.profiles;
create trigger profiles_guard_identity_columns
before update on public.profiles
for each row execute function app_private.guard_profile_identity_columns();

-- ===========================================================================
-- 7. At most one default membership per profile
-- ===========================================================================
--
-- Guarded, not blind: if existing data already holds a profile with two
-- default memberships a plain CREATE UNIQUE INDEX would fail and take the
-- whole migration (and every policy above) down with it. The block below
-- skips the index with a NOTICE in that case. The security fix does not
-- depend on the index, it only keeps the data clean and closes the
-- two-admins-at-once race. Create it by hand once the duplicates are fixed:
--
--   create unique index profile_tenant_memberships_one_default_per_profile
--     on public.profile_tenant_memberships (profile_id) where is_default;
do $$
begin
  if exists (
    select 1
    from public.profile_tenant_memberships
    where is_default
    group by profile_id
    having count(*) > 1
  ) then
    raise notice 'profile_tenant_memberships_one_default_per_profile NOT created: some profile has more than one is_default membership. Fix the data, then create the index by hand (see the comment above this block).';
  else
    create unique index if not exists profile_tenant_memberships_one_default_per_profile
      on public.profile_tenant_memberships (profile_id)
      where is_default;
  end if;
end;
$$;
