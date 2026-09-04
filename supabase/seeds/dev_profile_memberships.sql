-- DRAFT — NOT APPLIED. Review before running. See "Open decisions" at the end.
--
-- Dev tenant assignment: gives real Clerk users a profile row and a tenant
-- membership, so RLS has something to match and seeded batches become visible.
--
-- WHY THIS IS NOT IN supabase/migrations/
-- ---------------------------------------
-- It hardcodes Clerk user IDs, and Clerk development and production instances
-- issue *different* IDs for the same person. A migration carrying these values
-- would run in production and insert rows keyed to users that cannot exist
-- there -- dead identities in the table RLS trusts most. Migrations are for
-- schema and reference data; this is environment-specific fixture data.
--
-- The real fix is an admin-facing tenant-assignment flow. Nothing in the app
-- performs assignment today: upsertProfileFromClerkUser grants `viewer` with no
-- membership by design, on the assumption "an admin assigns later", and that
-- admin path was never built. This script is a stopgap for the dev tenant, not
-- a substitute for that feature.
--
-- Run with:  psql "$DATABASE_URL" -f supabase/seeds/dev_profile_memberships.sql
-- or paste into the Supabase SQL editor.

begin;

-- ---------------------------------------------------------------------------
-- 1. Profiles for the real Clerk users
-- ---------------------------------------------------------------------------
-- clerk_user_id is UNIQUE, so the profile upsert is safely re-runnable.
-- Memberships need the explicit delete below to be re-runnable -- see there.
--
-- Roles per ADR-005 decisions 2 and 4. `role` drives trainer field omission and viewer
-- write-denial, so an over-generous role here silently widens what the app
-- shows.
--   demo      = viewer      -- least privilege. viewer is NOT denied billing,
--                              only read-only, so it can still read every
--                              screen the isolation assertion checks.
--   the humans = admin      -- the school's proprietor. Note that `admin` and
--                              `coordinator` are indistinguishable in every
--                              current policy (each check pairs them), so this
--                              records who someone IS, not what they may do --
--                              and these rows will silently gain any future
--                              admin-only capability.
insert into public.profiles (clerk_user_id, full_name, email, role, is_active)
values
  ('user_3IMAGVRr7TnY3avksz6FbpIfPXj', 'TVI-CAMS Demo',       'demo@tvicams.app',        'viewer',      true),
  ('user_3FLVb1HfpRn9G7eYFQJKkpclhhm', 'Joshua Klyne Pudadera','klynejoshua13@gmail.com', 'admin',       true),
  ('user_3FJecAYAxYEtyjNlidloQeo7U8G', 'Nenita',               'nenitarmo@gmail.com',     'admin',       true)
on conflict (clerk_user_id) do update set
  full_name  = excluded.full_name,
  email      = excluded.email,
  role       = excluded.role,
  is_active  = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. Tenant memberships
-- ---------------------------------------------------------------------------
-- Tenants are resolved by `code`, never by hardcoded UUID -- the UUIDs differ
-- per environment and this file should stay portable.
--
-- One membership per profile (ADR-005 decision 1) -- NOT the mock USERS shape, which
-- has a coordinator spanning all three schools ("Karina Cruz"). Multi-membership
-- stays out of scope per CONTEXT.md: can_access_tenant grants on ANY membership
-- and ignores is_default, while the Sidebar switcher is cosmetic, so a second
-- membership merges tenants into one unscoped list rather than making them
-- switchable. `is_default` is therefore redundant here -- with a single row the
-- `find(is_default) ?? [0]` fallback always resolves to it -- and is set true
-- for forward compatibility only.
-- ###########################################################################
-- WARNING -- THIS FILE NO LONGER MATCHES THE DEV DATABASE.
--
-- The dev database was converged to decision 2 ONLY (demo = viewer, AKB). The
-- developer account deliberately KEEPS its AKB + J3ED + NEN grants, because
-- nothing in the app performs tenant assignment yet -- dropping them means
-- hand-writing SQL to get back into either school, and J3ED would fall to zero
-- members. Recorded on PR #174; see "Open deviation" at the end of this file.
--
-- The delete below is UNCONDITIONAL for all three managed accounts. Running
-- this file as written WILL remove those two grants. That is a real change,
-- not a no-op -- decide before you run it, not after.
--
-- To apply decision 2 alone, the whole diff is one statement:
--
--   update public.profiles
--   set role = 'viewer', updated_at = now()
--   where clerk_user_id = 'user_3IMAGVRr7TnY3avksz6FbpIfPXj'
--     and role is distinct from 'viewer';
--
-- demo's membership already holds exactly AKB, so the delete-then-insert below
-- churns five rows to arrive where it started.
-- ###########################################################################

-- Converge to exactly the grants in the CTE below. `on conflict do update` alone cannot
-- do this: it can add and amend rows but never remove one, so if an earlier
-- draft of this script was applied (it granted the developer J3ED and NEN),
-- those rows would survive a re-run -- and can_access_tenant grants on ANY
-- membership, which is the exact harm decision 1 exists to prevent. Scoped to the three
-- clerk_user_ids this script manages, so the two orphaned rows noted at the
-- bottom are left untouched.
delete from public.profile_tenant_memberships m
using public.profiles p
where m.profile_id = p.id
  and p.clerk_user_id in (
    'user_3IMAGVRr7TnY3avksz6FbpIfPXj',
    'user_3FLVb1HfpRn9G7eYFQJKkpclhhm',
    'user_3FJecAYAxYEtyjNlidloQeo7U8G'
  );

with assignment (clerk_user_id, tenant_code, is_default) as (
  values
    -- demo: AKB ONLY, deliberately. An all-tenants demo account makes tenant
    -- isolation untestable -- and 100% tenant scoping is a P0 metric in the
    -- PRD. Scoped to one tenant, this account doubles as the isolation test:
    -- it must see exactly ONE batch (DEV-AKB-001) and must NOT see the other
    -- four: DEV-J3ED-001, DEV-J3ED-002, DEV-NEN-001, DEV-NEN-002. A scoping
    -- regression shows five.
    --
    -- Note the verification query below CANNOT confirm this on its own: it
    -- joins through profile_tenant_memberships, so a tenant nobody is a member
    -- of never appears in its output. J3ED has no member here by design, so its
    -- two batches are invisible to that check. Verify in the app, signed in.
    ('user_3IMAGVRr7TnY3avksz6FbpIfPXj', 'AKB',  true),
    -- developer: AKB only. The draft granted all three; ADR-005 rejected that.
    ('user_3FLVb1HfpRn9G7eYFQJKkpclhhm', 'AKB',  true),
    -- Nenita: her own school only
    ('user_3FJecAYAxYEtyjNlidloQeo7U8G', 'NEN',  true)
)
insert into public.profile_tenant_memberships (profile_id, tenant_id, is_default)
select p.id, t.id, a.is_default
from assignment a
join public.profiles p on p.clerk_user_id = a.clerk_user_id
join public.tenants  t on t.code          = a.tenant_code
on conflict (tenant_id, profile_id) do update set
  is_default = excluded.is_default;

-- ---------------------------------------------------------------------------
-- 3. Verification -- read this before committing the transaction
-- ---------------------------------------------------------------------------
select t.code as tenant, p.email, p.role, m.is_default,
       (select count(*) from public.batches b where b.tenant_id = t.id) as batches_visible
from public.profile_tenant_memberships m
join public.profiles p on p.id = m.profile_id
join public.tenants  t on t.id = m.tenant_id
order by p.email, t.code;

commit;

-- ===========================================================================
-- DECISIONS -- settled in ADR-005, and one item still open
-- ===========================================================================
--
-- Settled (docs/adr/ADR-005-demo-account-tenant-scoping.md):
--   1.  One tenant membership per profile. The draft's three-tenant grant for
--       the developer is removed.
--   2.  demo@tvicams.app = viewer, AKB only.
--   3.  The demo account is INTERNAL ONLY -- development and isolation testing.
--       Not for a panel, evaluator, or TESDA reviewer. Two reasons, both
--       recorded in the ADR: the `?role=` preview override outranks the
--       database role, so demo's `viewer` is not enforced against anyone who
--       edits the URL; and 8 of 10 dashboard routes still render MOCK_BATCHES
--       for all three schools regardless of RLS.
--   4.  The human accounts keep `admin`, defined as the school's proprietor.
--
-- OPEN DEVIATION -- decision 1 is NOT applied to the dev database:
--       klynejoshua13@gmail.com keeps AKB + J3ED + NEN (3 memberships).
--    can_access_tenant grants on ANY membership and ignores is_default, so that
--    account still sees all three schools merged into one unscoped list -- the
--    exact harm decision 1 exists to prevent, left open on one account until an
--    admin tenant-assignment flow exists. It does NOT affect the isolation
--    assertion, which runs as demo and is AKB-scoped either way.
--    Recorded on PR #174.
--
-- STILL OPEN -- two orphaned profile rows, deliberately left alone:
--       user_3FKZdxAzFzE5fIWK9uUKElsZONq  admin,  1 membership (AKB, default)
--       user_2g7np7Hrk0SN6kj5EDMLDaKNL0S  viewer, 0 memberships
--    Neither Clerk ID exists in the current instance. They grant access to
--    nobody today, because no token can carry those `sub` values -- so they are
--    inert, not a live hole. But an orphaned admin membership on AKB is exactly
--    the kind of row that becomes a real grant if an ID is ever reused, and it
--    makes the memberships table lie about who can reach AKB.
--    Deleting them is a separate, deliberate change. Not folded in here.
--
-- AFTER RUNNING, verify the isolation assertion in the app, not just in SQL:
--    sign in as demo@tvicams.app and open /dashboard -- exactly one batch
--    (DEV-AKB-001) must be listed, and neither NEN batch. A scoping regression
--    shows five. Check /dashboard rather than /billing: billing's mock fallback
--    made zero rows indistinguishable from all rows until ADR-005 decision 5
--    removed it, so a stale deployment there would hide the very failure this
--    assertion is meant to catch.
--
--    CAVEAT -- the assertion is only meaningful when Supabase is configured and
--    the snapshot returns `ok`. On the fallback path (`unconfigured` or
--    `sync-failed`) app/(dashboard)/dashboard/page.tsx hands a `viewer` the
--    FULL unscoped mock set, while narrowing it for every other role -- and an
--    unresolved role also defaults to viewer. So demo, now a viewer, is exactly
--    the role that sees all schools' mock data there. Seeing five batches on
--    that path is the mock fallback, not a scoping regression. Confirm the
--    "Data as of" stamp is present before trusting the count.
