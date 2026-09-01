-- Active: 1787931874292@@aws-1-ap-northeast-2.pooler.supabase.com@5432@postgres
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
-- clerk_user_id is UNIQUE, so this is safely re-runnable. Roles are the
-- load-bearing part: `role` drives trainer field omission and viewer
-- write-denial, so an over-generous role here silently widens what the app
-- will show. Start least-privileged and widen deliberately.
insert into public.profiles (clerk_user_id, full_name, email, role, is_active)
values
  ('user_3IMAGVRr7TnY3avksz6FbpIfPXj', 'TVI-CAMS Demo',       'demo@tvicams.app',        'coordinator', true),
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
-- Mirrors the mock USERS shape: an admin per school, plus one coordinator with
-- visibility across all three (the "Karina Cruz" role in shared/mocks/seed.ts).
with assignment (clerk_user_id, tenant_code, is_default) as (
  values
    -- demo: AKB ONLY, deliberately. An all-tenants demo account makes tenant
    -- isolation untestable -- and 100% tenant scoping is a P0 metric in the
    -- PRD. Scoped to one tenant, this account doubles as the isolation test:
    -- it must see DEV-AKB-001 and must NOT see the other four batches.
    ('user_3IMAGVRr7TnY3avksz6FbpIfPXj', 'AKB',  true),
    -- developer: admin across all three
    ('user_3FLVb1HfpRn9G7eYFQJKkpclhhm', 'AKB',  true),
    ('user_3FLVb1HfpRn9G7eYFQJKkpclhhm', 'J3ED', false),
    ('user_3FLVb1HfpRn9G7eYFQJKkpclhhm', 'NEN',  false),
    -- Nenita: admin of her own school only
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
-- OPEN DECISIONS -- resolve these before running
-- ===========================================================================
--
-- 1. ROLES. Drafted as: demo=coordinator, klynejoshua13=admin, nenitarmo=admin.
--    `role` is load-bearing, not cosmetic -- it governs trainer field omission
--    (billing deadline, NTP lag, BSRS, financials) and viewer write-denial.
--    Confirm each one. If you want to exercise the trainer view, one of these
--    should be `trainer` instead, since that path has the weakest server-side
--    enforcement today and is the one most worth testing.
--
-- 2. TWO ORPHANED PROFILE ROWS, deliberately left alone:
--       user_3FKZdxAzFzE5fIWK9uUKElsZONq  admin,  1 membership (AKB, default)
--       user_2g7np7Hrk0SN6kj5EDMLDaKNL0S  viewer, 0 memberships
--    Neither Clerk ID exists in the current instance. They grant access to
--    nobody today, because no token can carry those `sub` values -- so they are
--    inert, not a live hole. But an orphaned admin membership on AKB is exactly
--    the kind of row that becomes a real grant if an ID is ever reused, and it
--    makes the memberships table lie about who can reach AKB.
--    Deleting them is a separate, deliberate change. Not folded in here.
--
-- 3. SCOPE (resolved). demo is scoped to AKB only, so it doubles as the tenant
--    isolation test: it must see exactly 1 batch (DEV-AKB-001) and must not see
--    the 4 batches belonging to J3ED and NEN. Widen it later only if a demo
--    genuinely needs the full portfolio -- and if you do, keep a single-tenant
--    account around, because isolation cannot be proven without one.
