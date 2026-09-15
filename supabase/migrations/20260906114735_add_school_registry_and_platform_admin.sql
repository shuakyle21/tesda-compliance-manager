-- Active: 1787931874292@@aws-1-ap-northeast-2.pooler.supabase.com@5432@postgres
-- Active: 1788015995997@@136.85.45.192@5432
-- School registry and platform admin (FR-02, ADR-006).
--
-- WHY THIS EXISTS
-- ---------------
-- `/users/new` grants someone access to a school that already exists. Nothing
-- creates the school. The three tenants in the system (AKB, J3ED, NEN) were
-- inserted by hand at the bottom of the canonical migration, so onboarding a
-- new TVI today means editing SQL and redeploying.
--
-- Two structural facts make this more than a missing form:
--
--   1. `public.tenants` has no INSERT policy at all, and its SELECT policy is
--      `app_private.can_access_tenant(id)` -- membership-scoped. A freshly
--      created school has no members, so even with an INSERT policy the
--      creator could not read back the row they just wrote. Creation
--      genuinely requires an actor outside the tenant boundary.
--
--   2. `public.scholarship_programs` is TWSP/CFSP -- the *funding* programs
--      ADR-001 builds the billing engine on. A school's "programs based on
--      their CTPR" (Organic Agriculture Production NC II, Welding NC II) are
--      TESDA-registered *qualifications*: a different concept on a different
--      axis. Reusing that table would corrupt the billing model.
--
-- SCOPE DECISION: a platform admin ("Super Admin") now exists.
-- ----------------------------------------------------------
-- `docs/MASTER_PRD_SRS.md` FR-02 said "Super Admin is not implemented and
-- must not be assumed in production behavior." ADR-006 reverses that, and per
-- RULES.md sec.7 (docs precedence) the ADR wins. The operating model is the
-- one TESDA itself uses for T2MIS/BSRS accounts: the platform operator
-- provisions a school on request, then hands it to that school's own admin.
--
-- The boundary is drawn deliberately narrow. A platform admin can see and
-- write the school *registry* and nothing else. Nothing below grants them
-- `batches`, `learners`, `documents`, `lamr_*`, or `activity_log` -- they can
-- create a school and read its name and programs, and cannot read a single
-- scholar record inside it. That is what keeps this a provisioning role
-- rather than a god-mode role. If a future policy adds `is_platform_admin()`
-- to a compliance table, that is a boundary change and needs its own ADR.
--
-- WHY A SEPARATE TABLE AND NOT A FIFTH `profile_role`
-- ---------------------------------------------------
-- `public.profile_role` is a *tenant-scoped* vocabulary: every policy in the
-- base migration switches on `app_private.current_role()`, and adding a value
-- would silently widen or narrow each one until audited. Platform admin is a
-- different axis entirely -- it is not "a bigger admin", it is "not in any
-- tenant". `shared/types.ts`'s UI-only `UserRole` value `'owner'` is likewise
-- NOT repurposed here: doing so would make `Profile.role` mean two different
-- scopes at once.
--
-- Additive only. No existing policy is dropped or replaced; Postgres
-- OR-combines permissive policies, so each new policy widens access for the
-- platform admin without loosening anything for anyone already covered.
--
-- NOTE ON GRANTS. The base migration's `grant ... on all tables in schema
-- public to authenticated` and `grant execute on all functions in schema
-- app_private` were one-time statements over the objects that existed then.
-- Every new table and function below therefore carries its own grant.

-- ===========================================================================
-- 1. Platform admin
-- ===========================================================================

create table public.platform_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- Intentionally NO POLICIES. RLS is enabled and no policy is ever created, so
-- every operation is denied for `anon` and `authenticated`: platform admin
-- cannot be self-granted through any application path. Membership is conferred
-- only by a statement run against the project directly, which RULES.md rule 36
-- already gates behind explicit human approval. The `security definer` function
-- below is the only way the app learns the answer.
--
-- NOT by withholding grants. Supabase ships `alter default privileges in schema
-- public grant all on tables to anon, authenticated, service_role`, so this
-- table receives SELECT/INSERT/UPDATE/DELETE for both roles the moment it is
-- created, whatever this file does or does not say. Verified against the live
-- project after applying: `authenticated` holds all seven privileges here, and
-- `insert into public.platform_admins values (<a real profile id>)` as
-- `authenticated` still fails with "new row violates row-level security policy".
-- The deny comes entirely from RLS-with-no-policies.
--
-- CONSEQUENCE: the Supabase linter reports `rls_enabled_no_policy` (INFO) for
-- this table. That finding is the design, not a defect. Do not "fix" it by
-- adding a policy -- any policy here is a way in.

create or replace function app_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins pa
    join public.profiles p on p.id = pa.profile_id
    where pa.profile_id = app_private.current_profile_id()
      and p.is_active = true
  );
$$;

revoke execute on function app_private.is_platform_admin() from public, anon;
grant execute on function app_private.is_platform_admin() to authenticated;

-- The application needs to ask a question it cannot answer with a SELECT,
-- because `platform_admins` is deliberately unreadable. This exposes only the
-- boolean about the *caller* -- never the membership list.
create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_platform_admin();
$$;

revoke execute on function public.current_user_is_platform_admin() from public, anon;
grant execute on function public.current_user_is_platform_admin() to authenticated;

-- ===========================================================================
-- 2. `tenants` -- new columns
-- ===========================================================================
--
-- Everything except `tesda_provider_code` exists to unblock the T2MIS export,
-- which today hardcodes 'Private', 'TVIs' and 'Agriculture, Forestry and
-- Fishery' and leaves the CTPR column blank
-- (`modules/reports/ui/exportXlsx.ts`). Those literals are correct for the
-- three seeded schools and wrong for any fourth.
--
-- `tesda_provider_code` is the school's TESDA provider number, e.g. '1263'.
-- It appears inside both the COPR number (20221263AFFOAP212009-R) and the
-- batch RQM code (RQM3-2026-CFSP-1263-0009), so it is the join between a
-- school's certificates and its batches. Nothing parses it yet; the column
-- records the fact so a later validator has something to check against.
--
-- `school_type` is deliberately left as free text rather than promoted to an
-- enum: TESDA's provider vocabulary shifts between issuances, and the three
-- seeded values are already inconsistent with `provider_classification`. The
-- form offers a suggestion list without rejecting an unknown value.

alter table public.tenants
  add column tesda_provider_code text,
  add column province text,
  add column city_municipality text,
  add column street_address text,
  add column provider_type text,
  add column provider_classification text;

comment on column public.tenants.tesda_provider_code is
  'TESDA provider number, e.g. 1263. Appears inside COPR numbers and batch RQM codes.';

-- ===========================================================================
-- 3. `qualifications` -- the national registry
-- ===========================================================================
--
-- Shared reference data, not tenant data: every school picks from the same
-- national list, and "Organic Agriculture Production NC II" means the same
-- thing at AKB as at J3ED. Storing it per-tenant would produce three spellings
-- of one qualification and make cross-school analytics meaningless.

create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  nc_level text,
  sector text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.qualifications.code is
  'TESDA qualification code, e.g. AFFOAP212 for Organic Agriculture Production NC II.';

create trigger qualifications_set_updated_at
before update on public.qualifications
for each row execute function public.set_updated_at();

alter table public.qualifications enable row level security;
grant select, insert, update, delete on public.qualifications to authenticated;

create policy "Authenticated users can read active qualifications"
on public.qualifications
for select
to authenticated
using (is_active = true);

create policy "Platform admins can manage qualifications"
on public.qualifications
for all
to authenticated
using (app_private.is_platform_admin())
with check (app_private.is_platform_admin());

-- ===========================================================================
-- 4. `tenant_qualifications` -- school to qualification, carrying the COPR
-- ===========================================================================
--
-- NAMING. The certificate is a Certificate of Program Registration (COPR),
-- e.g. 20221263AFFOAP212009-R. The existing import and export code calls the
-- same field CTPR (`modules/import-export/ui/ImportCsvModal.tsx`,
-- `modules/reports/ui/exportXlsx.ts`). They are the same number. The column
-- takes the name on the certificate; the export's 'CTPR' header string stays
-- as it is because it has to match the file TESDA hands back. Do not
-- "fix" either one into agreement with the other.
--
-- `copr_number` is nullable on purpose: a school is routinely entered while
-- its certificate is still being issued, and forcing the field would make the
-- operator invent a number. For the same reason the unique constraint is on
-- (tenant_id, qualification_id) and not on the COPR.

create table public.tenant_qualifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  qualification_id uuid not null references public.qualifications(id),
  copr_number text,
  registration_status text,
  delivery_mode text,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, qualification_id)
);

comment on column public.tenant_qualifications.copr_number is
  'Certificate of Program Registration number, e.g. 20221263AFFOAP212009-R. Exported as the T2MIS "CTPR" column.';

create index tenant_qualifications_tenant_id_idx
  on public.tenant_qualifications (tenant_id);

create trigger tenant_qualifications_set_updated_at
before update on public.tenant_qualifications
for each row execute function public.set_updated_at();

alter table public.tenant_qualifications enable row level security;
grant select, insert, update, delete on public.tenant_qualifications to authenticated;

-- A school's own people read their own program list; the platform admin reads
-- every school's, because they maintain it.
create policy "Tenant users and platform admins can read tenant qualifications"
on public.tenant_qualifications
for select
to authenticated
using (
  app_private.can_access_tenant(tenant_id)
  or app_private.is_platform_admin()
);

-- SCOPE DECISION: writes are platform-admin-only for now, matching the
-- operating model above (schools request a program registration, the operator
-- records it). Letting a school admin maintain their own list is a
-- deliberate follow-up -- one additional policy -- not an oversight.
create policy "Platform admins can manage tenant qualifications"
on public.tenant_qualifications
for all
to authenticated
using (app_private.is_platform_admin())
with check (app_private.is_platform_admin());

-- ===========================================================================
-- 5. Platform admin policies on existing tables
-- ===========================================================================

-- This is the policy that makes school creation work at all: it lets the
-- creator read back the row they just inserted, by policy rather than by
-- membership. Without it, `insert(...).select()` returns zero rows and the
-- operator cannot tell a successful write from a failed one -- and no
-- `security definer` bypass is needed anywhere in the create path.
create policy "Platform admins can read every tenant"
on public.tenants
for select
to authenticated
using (app_private.is_platform_admin());

create policy "Platform admins can create tenants"
on public.tenants
for insert
to authenticated
with check (app_private.is_platform_admin());

create policy "Platform admins can update tenants"
on public.tenants
for update
to authenticated
using (app_private.is_platform_admin())
with check (app_private.is_platform_admin());

-- Without this, a newly created school is permanently unstaffable. The
-- existing grant policy (migration 20260904120000, policy 3) requires
-- `can_access_tenant(tenant_id)`, which a platform admin -- who belongs to no
-- tenant by design -- can never satisfy.
--
-- No matching DELETE policy: revoking a membership is the school admin's
-- operation, and they already have one. The platform admin seats the first
-- admin and steps back out.
--
-- THE TWO GUARDS BELOW ARE THE WHOLE BOUNDARY. `with check` on
-- `is_platform_admin()` alone constrains the *actor* and says nothing about
-- the *row*, and this is the one table where that distinction is fatal:
-- `app_private.can_access_tenant()` resolves purely from
-- `profile_tenant_memberships`, so an operator who could insert an arbitrary
-- row could seat *themselves* into any school and, in the same motion, hand
-- themselves everything `can_access_tenant` gates -- batches, learners,
-- documents, LAMR. That is the escalation ADR-006 sec.P3 promises cannot
-- happen, and only these predicates stop it.
--
--   1. `profile_id <> current_profile_id()` -- the operator may seat other
--      people, never themselves. This is what closes the escalation.
--   2. the tenant has no members yet -- "first members", as the policy name
--      says. Provisioning a new school is the job; injecting an account into
--      an established one is not. Racy under concurrent inserts (two calls
--      can both see an empty tenant), which is tolerable because guard 1
--      holds regardless and the outcome is at worst two seated members.
--
-- Compare `20260904120000` policy 3, which carries
-- `and app_private.can_access_tenant(tenant_id)` for exactly this reason. A
-- platform admin cannot use that containment -- they belong to no tenant --
-- so they need their own, and it must not be weaker.
--
-- ORDERING NOTE. Guard 2's subquery reads `profile_tenant_memberships`, so it
-- is itself filtered by that table's SELECT policies. It is correct only
-- because "Platform admins can read tenant memberships" (below) shows the
-- caller every row -- an operator who could not see an existing membership
-- would read the tenant as empty and seat into it anyway. Deleting or
-- narrowing that SELECT policy silently weakens this INSERT policy. Neither
-- SELECT policy recurses: both resolve through `security definer` helpers
-- that read `platform_admins` / `profiles`, never back into this table.
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

-- Reading the membership rows they just wrote, and finding the profile to
-- seat. `profiles` policy 1 from 20260904120000 already exposes unassigned
-- profiles, but only to `current_role() = 'admin'` -- a tenant-scoped role a
-- platform admin need not hold.
create policy "Platform admins can read tenant memberships"
on public.profile_tenant_memberships
for select
to authenticated
using (app_private.is_platform_admin());

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

-- ===========================================================================
-- 6. `create_school` -- one transaction, still behind RLS
-- ===========================================================================
--
-- `security invoker`, NOT `security definer`. The function exists for
-- transactionality, not for authorization: a school and its program list
-- must land together or not at all, because a partial write leaves a school
-- with no registered program (which cannot legally run a batch) and the
-- operator no way to know. RLS still decides every statement inside, so the
-- security boundary stays exactly where RULES.md sec.1 puts it -- a caller
-- who is not a platform admin gets a policy violation from the INSERT, not a
-- privilege from this function.
--
-- Qualifications arrive as jsonb because the count is variable:
--   [{"qualification_id": "...", "copr_number": "...",
--     "registration_status": "...", "delivery_mode": "..."}, ...]
create or replace function public.create_school(
  p_code text,
  p_name text,
  p_region text,
  p_school_type text,
  p_tesda_provider_code text,
  p_province text,
  p_city_municipality text,
  p_street_address text,
  p_provider_type text,
  p_provider_classification text,
  p_qualifications jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_tenant_id uuid;
begin
  insert into public.tenants (
    code, name, region, school_type, tesda_provider_code,
    province, city_municipality, street_address,
    provider_type, provider_classification
  )
  values (
    p_code, p_name, p_region, p_school_type, p_tesda_provider_code,
    p_province, p_city_municipality, p_street_address,
    p_provider_type, p_provider_classification
  )
  returning id into new_tenant_id;

  insert into public.tenant_qualifications (
    tenant_id, qualification_id, copr_number, registration_status, delivery_mode
  )
  select
    new_tenant_id,
    (entry ->> 'qualification_id')::uuid,
    nullif(entry ->> 'copr_number', ''),
    nullif(entry ->> 'registration_status', ''),
    nullif(entry ->> 'delivery_mode', '')
  from jsonb_array_elements(coalesce(p_qualifications, '[]'::jsonb)) as entry;

  return new_tenant_id;
end;
$$;

revoke execute on function public.create_school(
  text, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon;
grant execute on function public.create_school(
  text, text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;

-- ===========================================================================
-- 7. Seed the qualifications the existing schools actually run
-- ===========================================================================
--
-- Deliberately not a full national registry -- that is a data-entry task, not
-- a migration. These are the qualifications appearing in current batch rows,
-- plus the Organic Agriculture code that prompted this work. Codes follow
-- TESDA's own scheme (sector prefix + qualification + level).

insert into public.qualifications (code, title, nc_level, sector)
values
  ('AFFOAP212', 'Organic Agriculture Production NC II', 'NC II', 'Agriculture, Forestry and Fishery'),
  ('AFFRCP210', 'Rice Machinery Operations NC II', 'NC II', 'Agriculture, Forestry and Fishery'),
  ('AFFACP211', 'Agricultural Crops Production NC II', 'NC II', 'Agriculture, Forestry and Fishery'),
  ('MEEWLD214', 'Shielded Metal Arc Welding (SMAW) NC II', 'NC II', 'Metals and Engineering'),
  ('ELCICS216', 'Computer Systems Servicing NC II', 'NC II', 'Electronics'),
  ('TRSBRW319', 'Bread and Pastry Production NC II', 'NC II', 'Tourism')
on conflict (code) do update set
  title = excluded.title,
  nc_level = excluded.nc_level,
  sector = excluded.sector,
  updated_at = now();
