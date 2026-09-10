-- ADR-001 billing and domain model: Phase 0.1 schema (#36, EPIC #19).
--
-- WHY THIS EXISTS
-- ---------------
-- `docs/IMPLEMENTATION_PLAN.md` Phase 0 opens with "Nothing in Phases 1-5 is
-- trustworthy until this is done." Every table ADR-001 sec.11 requires is
-- missing. The consequences are concrete, not theoretical:
--
--   * The trainer attendance route has nowhere to write, so `progress_percent`
--     on `batches` is a number a human typed rather than a fact derived from
--     attendance. ADR-001 B2 says progress is attendance-derived and explicitly
--     "not manually typed" -- today the schema cannot honour that.
--   * The billing engine (ADR-001 V2) generates official TESDA documents from
--     cost components and a scholar list. Neither the components nor the
--     generation log has a home, so nothing it produces can be reproduced or
--     audited afterwards.
--   * `batches` carries no RQM/NTP authorization, though ADR-001 locks "one RQM
--     code = one batch" as a domain fact.
--
-- This migration is additive. It creates seven tables, adds columns to three
-- existing ones, widens one RLS helper, and closes a storage-policy gap. It
-- alters no existing column and drops nothing.
--
-- THREE THINGS THIS MIGRATION DELIBERATELY DOES NOT DO
-- ----------------------------------------------------
-- 1. No `batches.billing_deadline`, though issue #130 asks for one. ADR-003 P5:
--    "`due_date` is derived, never stored -- computed on read from the batch's
--    tranche schedule". Per RULES.md sec.7 the ADR outranks the issue. #130's
--    real defect is that `modules/batches/data/batches.ts` substitutes
--    `end_date`; that is a mapper bug, and a column would make it permanent.
--
-- 2. No `batches.sessions_held`. ADR-001 sec.11 and TRD:267 both list
--    `total_sessions` and stop. With `attendance_records` created below,
--    sessions held is a count over that table. Storing it would create a second
--    source of truth for progress, free to drift from the attendance it claims
--    to summarise -- the same failure mode as (1).
--
-- 3. No `lamr_reports.module_id` FK. ADR-001 sec.11 requires it, but it alters a
--    table holding live rows and changes its uniqueness. That earns its own
--    migration and its own review; folding a destructive change into an
--    additive one hides it.
--
-- APPLYING THIS
-- -------------
-- Unapplied and unexecuted as of writing. There is one hosted project and no
-- staging (RULES.md rule 36), so this file has never been parsed by Postgres.
-- Read it before it runs.
--
-- THIS FILE IS SINGLE-SHOT, NOT RE-RUNNABLE.
-- `add column` and `create index` are guarded with `if not exists`, but
-- `create type`, `create table`, `create trigger` and `create policy` are not --
-- Postgres offers no `if not exists` for policies, so guarding only some of it
-- would give a false impression that a re-run is safe. It is not: a second run
-- fails at `create type public.billing_type`.
--
-- This is fine when the migration runs inside a transaction, which is how the
-- Supabase CLI and the MCP `apply_migration` tool both apply it -- a failure
-- rolls the whole file back and the re-run starts clean. If you run it any
-- other way (piping to psql without an explicit BEGIN, say), a partial failure
-- leaves objects behind that you must drop by hand before retrying. The
-- likeliest failure point is the `storage.objects` policy in section 9, which
-- requires ownership of that table.
--
-- Note also (2026-09-10) that the repo and the database have drifted: three
-- checked-in migrations are unapplied, and the school registry is applied under
-- version 20260906114735 while its file is named 20260906130000. Reconcile that
-- before assuming a clean `db push`.

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------

-- Mirrors `BillingTrackId` in `modules/billing/domain/tracks.ts` exactly, so the
-- mapper needs no enum bridge (contrast `DB_TO_UI_STAGE`, which exists because
-- lifecycle_stage and the UI stage keys diverged).
--
-- Assessment fee is absent by design: ADR-001 sec.4 TVI-scope assigns it to the
-- Assessment Center, not the TVI. Adding it here would imply the app generates
-- billing it must not generate.
create type public.billing_type as enum (
  'training_cost',
  'tsf_allowance',
  'entrepreneurship'
);

-- ---------------------------------------------------------------------------
-- 2. Reference tables (no tenant_id -- global, not tenant-scoped)
-- ---------------------------------------------------------------------------
--
-- `program_modules` and `scholarship_cost_schedule` describe TESDA programs and
-- TESDA rates. They are the same for every school. Giving them a `tenant_id`
-- would not be extra safety, it would assert that two schools can hold
-- different official rates for the same qualification -- which is exactly the
-- kind of drift a compliance tool exists to prevent.
--
-- Note `qualification_code` references `public.qualifications`, the TESDA
-- *qualification* registry (Organic Agriculture Production NC II, ...), NOT
-- `public.scholarship_programs`, which holds the *funding* programs TWSP/CFSP.
-- The school-registry migration argues that distinction at length; collapsing
-- the two axes corrupts the billing model.

create table public.program_modules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.scholarship_programs(id) on delete cascade,
  qualification_code text not null references public.qualifications(code),
  module_title text not null,
  module_order integer not null default 0,
  nominal_hours numeric(8, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, qualification_code, module_order)
);

comment on table public.program_modules is
  'Fixed module list per program + qualification (ADR-001 sec.11). One LAMR is '
  'expected per module per batch; the lamr_reports.module_id FK that enforces '
  'that lands in a separate migration.';

-- ADR-001 BB1-prune: no `circular_no` / `effectivity_date`. Version-safety lives
-- in the batch snapshot (the batch copies its rates at creation), so this table
-- holds *current rates only*. Adding effectivity columns here would create a
-- second, competing versioning mechanism.
create table public.scholarship_cost_schedule (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.scholarship_programs(id) on delete cascade,
  qualification_code text not null references public.qualifications(code),
  training_hours integer not null check (training_hours > 0),
  training_days integer not null check (training_days > 0),
  training_cost numeric(12, 2) not null check (training_cost >= 0),
  assessment_fee numeric(12, 2) check (assessment_fee >= 0),
  tsf_day_rate numeric(12, 2) not null default 160 check (tsf_day_rate >= 0),
  new_normal numeric(12, 2) check (new_normal >= 0),
  insurance_fee numeric(12, 2) check (insurance_fee >= 0),
  entrepreneurship_fee numeric(12, 2) check (entrepreneurship_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, qualification_code)
);

comment on table public.scholarship_cost_schedule is
  'TESDA Schedule of Cost, current rates only (ADR-001 sec.3 BB1). The batch '
  'snapshots its matching row at creation; this table is reference data. '
  'assessment_fee is recorded for completeness but the app never bills it '
  '(ADR-001 TVI-scope: the Assessment Center does).';

-- ADR-001 Q1: a thin global identity dimension, a FUTURE SEAM ONLY. ULI
-- uniqueness is by value, not by shared row -- the same person at two schools is
-- two tenant-scoped `learners` rows carrying the same ULI. This table does NOT
-- perform cross-school double-enrollment detection, and TESDA's systems remain
-- the authoritative lifetime record.
--
-- It is created empty and stays empty in MVP. See the RLS section: it is
-- deliberately granted no policy at all.
create table public.learner_identities (
  uli text primary key,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learner_identities is
  'Future seam (ADR-001 Q1). Created empty, unpopulated in MVP, and RLS-denied '
  'to every role until it has an agreed purpose.';

-- ---------------------------------------------------------------------------
-- 3. Tenant-scoped tables
-- ---------------------------------------------------------------------------

-- ADR-001 C2: attendance is recorded per learner per session date, capturing
-- time_in/time_out. PathA: OCR is deferred, so trainers enter these manually and
-- upload the signed paper sheet as evidence. When OCR lands it writes these same
-- rows -- the schema does not change, only the writer does.
--
-- X2: rows stay mutable in place, including after billing (Y-hybrid). There is
-- deliberately no lock flag; corrections are expected and each one appends an
-- `activity_log` event.
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  attendance_date date not null,
  time_in time,
  time_out time,
  present boolean not null default false,
  notes text,
  marked_by uuid references public.profiles(id) on delete set null,
  marked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, batch_id, learner_id, attendance_date)
);

-- ADR-001 M2: trainers are scoped to batches through this join, which supports
-- co-trainers and trainers who work across schools. It supersedes the single
-- `batches.trainer_profile_id` pointer, which is retained (still populated,
-- still read for display) so nothing breaks -- see the helper widening below.
create table public.batch_trainer_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  trainer_profile_id uuid not null references public.profiles(id) on delete cascade,
  is_lead boolean not null default false,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, batch_id, trainer_profile_id)
);

-- ADR-001 NoLedger: this is a GENERATION LOG, not an accounts-receivable
-- ledger. There is no running envelope, no over-billing guard, no balance --
-- the TESDA Provincial Office reconciles totals, and the app must not appear to
-- do so.
--
-- Y-hybrid: append-only. Re-generating after an attendance correction writes a
-- NEW row at the next `version`; nothing is overwritten, so the history shows
-- the correction (the "student 5 forgotten" case: 137,000 -> 145,200).
--
-- That append-only property is enforced in the DATABASE, not by convention: the
-- RLS section below grants SELECT and INSERT and deliberately grants no UPDATE
-- and no DELETE policy. Code cannot mutate a snapshot even if it tries.
create table public.billing_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  billing_type public.billing_type not null,
  tranche integer not null default 1 check (tranche >= 1),
  version integer not null default 1 check (version >= 1),
  amount numeric(14, 2) not null check (amount >= 0),
  scholar_snapshot jsonb not null default '[]'::jsonb,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- No `updated_at` column and no set_updated_at trigger, unlike every sibling
  -- table here. This table has no UPDATE policy, so a row is never updated and
  -- the column could only ever mirror created_at. Its absence is part of the
  -- append-only signal rather than an oversight.
  unique (tenant_id, batch_id, billing_type, tranche, version)
);

comment on table public.billing_records is
  'Append-only generation log (ADR-001 NoLedger / Y-hybrid). Not a ledger and '
  'not an invoice table. Append-only is enforced by the absence of UPDATE and '
  'DELETE policies -- do not add them.';

-- Per-school document settings: signatories, letterhead and addressee for the
-- generated .docx (ADR-001 W1 keeps the school's own template), plus the
-- tenant-level overrides ADR-001 allows.
--
-- `max_absences` here OVERRIDES `program_billing_rules.max_absences` when set.
-- Null means "use the program rule" -- a nullable override, never a duplicate
-- default, so the two cannot silently disagree.
create table public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  prepared_by text,
  prepared_by_title text,
  approved_by text,
  approved_by_title text,
  letterhead_ref text,
  addressee text,
  partial_billing_enabled boolean not null default false,
  max_absences integer check (max_absences >= 0),
  progress_threshold_percent integer check (progress_threshold_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.tenant_settings.max_absences is
  'Tenant override for program_billing_rules.max_absences (ADR-001 Elig). Null '
  'means inherit the program rule.';

-- ---------------------------------------------------------------------------
-- 4. Columns on existing tables (additive)
-- ---------------------------------------------------------------------------

-- RQM / NTP authorization and the cost snapshot. Every column is nullable
-- except the boolean: existing batches predate these facts, and defaulting them
-- to a made-up value would be worse than an honest null in a compliance tool.
alter table public.batches
  add column if not exists rqm_code text,
  add column if not exists ntp_number text,
  add column if not exists approved_slots integer check (approved_slots >= 0),
  add column if not exists total_amount numeric(14, 2) check (total_amount >= 0),
  add column if not exists indicative_start_date date,
  add column if not exists ntp_approval_date date,
  add column if not exists ntp_received_date date,
  -- ADR-001 D3: the weekly pattern is customizable per batch, so this stays
  -- free text rather than an enum. It affects how fast sessions are consumed
  -- and the calendar duration -- never the session count (which E2 fixes).
  add column if not exists schedule_pattern text,
  -- E2: nominal hours / 8, snapshotted at creation, immune to later circular
  -- changes. 360 hrs -> 45 sessions.
  add column if not exists total_sessions integer check (total_sessions > 0),
  -- BB1 cost snapshot: extends E2 to every cost component.
  add column if not exists training_cost_snapshot numeric(12, 2) check (training_cost_snapshot >= 0),
  add column if not exists tsf_day_rate_snapshot numeric(12, 2) check (tsf_day_rate_snapshot >= 0),
  add column if not exists new_normal_snapshot numeric(12, 2) check (new_normal_snapshot >= 0),
  add column if not exists insurance_fee_snapshot numeric(12, 2) check (insurance_fee_snapshot >= 0),
  add column if not exists entrepreneurship_fee_snapshot numeric(12, 2) check (entrepreneurship_fee_snapshot >= 0),
  -- Batch-level marker that entrepreneurship was delivered; triggers the
  -- entrepreneurship billing track (ADR-001 sec.11).
  add column if not exists entrepreneurship_delivered boolean not null default false;

comment on column public.batches.rqm_code is
  'NTP authorization code. Locked domain fact: one RQM code = one batch.';

-- "One RQM code = one batch", enforced per tenant. Partial so the existing rows
-- (all null) do not collide with each other.
create unique index if not exists batches_tenant_rqm_code_key
  on public.batches (tenant_id, rqm_code)
  where rqm_code is not null;

-- `uli` already exists on `learners` (canonical migration). It is the permanent
-- learner key (ADR-001 Q1), so it needs the index it never got.
alter table public.learners
  add column if not exists entrepreneurship_completed boolean not null default false;

create index if not exists learners_uli_idx
  on public.learners (uli)
  where uli is not null;

-- ADR-001 Elig: "ineligible for allowance if absences >= 5 ... stored as
-- max_absences = 4 in program rules; tenant override allowed". ADR-001:187 puts
-- the cap on the program/qualification axis. The default is 4, not 5 -- the rule
-- is `absences > max_absences`, i.e. a 5th absence disqualifies.
alter table public.program_billing_rules
  add column if not exists max_absences integer not null default 4 check (max_absences >= 0);

comment on column public.program_billing_rules.max_absences is
  'ADR-001 Elig. A scholar with more than this many absences is ineligible for '
  'allowance -- default 4, so the 5th absence disqualifies. Overridable per '
  'tenant via tenant_settings.max_absences.';

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------

create index if not exists attendance_records_tenant_batch_idx
  on public.attendance_records (tenant_id, batch_id);
create index if not exists attendance_records_learner_date_idx
  on public.attendance_records (tenant_id, learner_id, attendance_date desc);
create index if not exists batch_trainer_assignments_batch_idx
  on public.batch_trainer_assignments (tenant_id, batch_id);
create index if not exists batch_trainer_assignments_trainer_idx
  on public.batch_trainer_assignments (trainer_profile_id);
create index if not exists billing_records_tenant_batch_idx
  on public.billing_records (tenant_id, batch_id, billing_type);
create index if not exists program_modules_program_idx
  on public.program_modules (program_id, qualification_code);
create index if not exists scholarship_cost_schedule_program_idx
  on public.scholarship_cost_schedule (program_id, qualification_code);

-- ---------------------------------------------------------------------------
-- 6. updated_at triggers (reusing public.set_updated_at from the canonical migration)
-- ---------------------------------------------------------------------------

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

create trigger batch_trainer_assignments_set_updated_at
before update on public.batch_trainer_assignments
for each row execute function public.set_updated_at();

-- No billing_records trigger -- see the table definition: append-only, so a
-- `before update` trigger could never fire.

create trigger tenant_settings_set_updated_at
before update on public.tenant_settings
for each row execute function public.set_updated_at();

create trigger program_modules_set_updated_at
before update on public.program_modules
for each row execute function public.set_updated_at();

create trigger scholarship_cost_schedule_set_updated_at
before update on public.scholarship_cost_schedule
for each row execute function public.set_updated_at();

create trigger learner_identities_set_updated_at
before update on public.learner_identities
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Widen can_trainer_write_batch (ADR-001 M2)
-- ---------------------------------------------------------------------------
--
-- ORDER MATTERS. Backfill first, replace the function second.
--
-- The backfill copies every existing `batches.trainer_profile_id` into the join,
-- so at the moment the widened function takes effect the assignment set is
-- exactly equal to the pointer set it is joining. The widened predicate
-- therefore grants NOBODY new access on the day this applies -- it is a no-op
-- with respect to who can write what. It only becomes meaningful when someone
-- adds a co-trainer row later.
--
-- That is what makes an edit to the security boundary safe to ship without a
-- staging rehearsal. The `OR` (rather than replacing the pointer check outright)
-- is a second belt: even if the backfill missed a row, no trainer loses access.

insert into public.batch_trainer_assignments (tenant_id, batch_id, trainer_profile_id, is_lead)
select b.tenant_id, b.id, b.trainer_profile_id, true
from public.batches b
where b.trainer_profile_id is not null
on conflict (tenant_id, batch_id, trainer_profile_id) do nothing;

create or replace function app_private.can_trainer_write_batch(target_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.batches b
    where b.id = target_batch_id
      and app_private.current_role() = 'trainer'
      and app_private.can_access_tenant(b.tenant_id)
      and (
        b.trainer_profile_id = app_private.current_profile_id()
        or exists (
          select 1
          from public.batch_trainer_assignments bta
          where bta.batch_id = b.id
            and bta.tenant_id = b.tenant_id
            and bta.trainer_profile_id = app_private.current_profile_id()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------
--
-- RLS is the security boundary (RULES.md rule 1). Every predicate below goes
-- through an existing app_private helper; none filters by tenant by hand.

alter table public.attendance_records enable row level security;
alter table public.batch_trainer_assignments enable row level security;
alter table public.billing_records enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.program_modules enable row level security;
alter table public.scholarship_cost_schedule enable row level security;
alter table public.learner_identities enable row level security;

grant select, insert, update, delete on public.attendance_records to authenticated;
grant select, insert, update, delete on public.batch_trainer_assignments to authenticated;
grant select, insert on public.billing_records to authenticated;
grant select, insert, update, delete on public.tenant_settings to authenticated;
grant select, insert, update, delete on public.program_modules to authenticated;
grant select, insert, update, delete on public.scholarship_cost_schedule to authenticated;

-- attendance_records ---------------------------------------------------------
-- Read follows can_read_batch, which already encodes "a trainer sees only their
-- own batches" -- so a trainer cannot read another trainer's attendance.

create policy "Tenant users can read scoped attendance"
on public.attendance_records
for select
to authenticated
using (app_private.can_read_batch(batch_id));

create policy "Assigned trainers can record attendance"
on public.attendance_records
for insert
to authenticated
with check (
  app_private.can_trainer_write_batch(batch_id)
  or app_private.can_manage_tenant(tenant_id)
);

-- X2: attendance is mutable in place, never locked, even post-billing.
create policy "Assigned trainers can correct attendance"
on public.attendance_records
for update
to authenticated
using (
  app_private.can_trainer_write_batch(batch_id)
  or app_private.can_manage_tenant(tenant_id)
)
with check (
  app_private.can_trainer_write_batch(batch_id)
  or app_private.can_manage_tenant(tenant_id)
);

-- Deleting an attendance row destroys billing evidence, so it is restricted to
-- admin/coordinator. A trainer corrects by updating `present`, not by deleting.
create policy "Admins and coordinators can delete attendance"
on public.attendance_records
for delete
to authenticated
using (app_private.can_manage_tenant(tenant_id));

-- batch_trainer_assignments --------------------------------------------------

create policy "Tenant users can read trainer assignments"
on public.batch_trainer_assignments
for select
to authenticated
using (app_private.can_access_tenant(tenant_id));

create policy "Admins and coordinators can manage trainer assignments"
on public.batch_trainer_assignments
for all
to authenticated
using (app_private.can_manage_tenant(tenant_id))
with check (app_private.can_manage_tenant(tenant_id));

-- billing_records ------------------------------------------------------------
-- SELECT and INSERT only. The absence of UPDATE and DELETE policies is what
-- makes the log append-only (ADR-001 NoLedger / Y-hybrid). Adding either would
-- silently turn a generation log into a mutable ledger.
--
-- Read deliberately does NOT use can_read_batch: RULES.md rule 5 keeps financial
-- fields away from trainers server-side, and can_read_batch admits the assigned
-- trainer, who would then read the billing amounts for their own batch.
--
-- It is an explicit role allowlist rather than can_manage_tenant, because
-- can_manage_tenant is admin/coordinator only and would lock out `viewer` --
-- which rule 4 makes read-only, not blind, and rule 5 excludes trainers alone
-- from financial fields. Spelling the roles out also means a fifth role added
-- later needs a decision here instead of silently inheriting one.
create policy "Non-trainer tenant users can read billing records"
on public.billing_records
for select
to authenticated
using (
  app_private.can_access_tenant(tenant_id)
  and app_private.current_role() in ('admin', 'coordinator', 'viewer')
);

create policy "Admins and coordinators can append billing records"
on public.billing_records
for insert
to authenticated
with check (app_private.can_manage_tenant(tenant_id));

-- tenant_settings ------------------------------------------------------------

create policy "Tenant users can read tenant settings"
on public.tenant_settings
for select
to authenticated
using (app_private.can_access_tenant(tenant_id));

create policy "Admins and coordinators can manage tenant settings"
on public.tenant_settings
for all
to authenticated
using (app_private.can_manage_tenant(tenant_id))
with check (app_private.can_manage_tenant(tenant_id));

-- Reference tables -----------------------------------------------------------
-- Tenant-less, so they follow the existing scholarship_programs pattern:
-- readable by any authenticated user, writable by admin/coordinator.

create policy "Authenticated users can read program modules"
on public.program_modules
for select
to authenticated
using (is_active = true);

create policy "Admins and coordinators can manage program modules"
on public.program_modules
for all
to authenticated
using (app_private.current_role() in ('admin', 'coordinator'))
with check (app_private.current_role() in ('admin', 'coordinator'));

create policy "Authenticated users can read the cost schedule"
on public.scholarship_cost_schedule
for select
to authenticated
using (true);

create policy "Admins and coordinators can manage the cost schedule"
on public.scholarship_cost_schedule
for all
to authenticated
using (app_private.current_role() in ('admin', 'coordinator'))
with check (app_private.current_role() in ('admin', 'coordinator'));

-- learner_identities ---------------------------------------------------------
-- RLS is enabled and NO policy is created, and no grant is issued. In Postgres
-- that denies everything to `authenticated` by default. This is intentional:
-- the table is an unpopulated future seam (ADR-001 Q1), and a seam nobody can
-- read cannot leak cross-school learner data by accident. Opening it up is a
-- deliberate act that should come with the decision that justifies it.

-- ---------------------------------------------------------------------------
-- 9. Storage: the missing DELETE policy
-- ---------------------------------------------------------------------------
--
-- The canonical migration created SELECT, INSERT and UPDATE policies on
-- storage.objects for the `compliance-evidence` bucket and no DELETE. The
-- practical effect is that nobody can remove a file uploaded in error -- it can
-- be overwritten but never deleted. Filed during the #41 evidence-storage work.
--
-- Scoped tighter than its siblings: they use can_access_tenant, this uses
-- can_manage_tenant. Reading and uploading evidence is ordinary work for a
-- trainer; destroying evidence in a compliance tool is not.

create policy "Admins and coordinators can delete scoped evidence objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'compliance-evidence'
  and app_private.can_manage_tenant((storage.foldername(name))[1]::uuid)
);

-- ---------------------------------------------------------------------------
-- 10. Seed: scholarship_cost_schedule -- traceable values only
-- ---------------------------------------------------------------------------
--
-- Every figure below appears verbatim in ADR-001 sec.3, which cites Circular 015
-- s.2026: 360 hrs -> 45 days; TSF 45 x P160 = P7,200; New Normal P1,000;
-- Insurance P100.80; Entrepreneurship P800; Training Cost P15,390 (carried from
-- the source template "BILLING - FULL TRAINING COST.docx").
--
-- WHAT IS DELIBERATELY NOT SEEDED
-- `modules/billing/domain/rates.ts` also carries training costs for Rice
-- Machinery Operations and Cookery, but its own header calls them
-- "representative stand-ins". They are not seeded here. A missing rate row is a
-- visible gap that stops a billing document from generating; a wrong rate row
-- generates an official TESDA document with a wrong peso amount on it. Supply
-- the remaining qualifications from Circular 015 s.2026.
--
-- CODE DISCREPANCY, UNRESOLVED
-- ADR-001 sec.3 writes Agricultural Crops Production NC II as `AFFACP213`. The
-- school-registry migration seeded the same qualification as `AFFACP211`. This
-- seed uses AFFACP211 because that is the row that exists and the FK requires
-- it. Which code is correct against TESDA's registry has NOT been verified --
-- if it is AFFACP213, both this seed and the registry seed need correcting.
--
-- THIS SEED MAY INSERT NOTHING, AND THAT IS SAFE
-- It is a `select` from `scholarship_programs`, so if TWSP/CFSP are not present
-- it inserts zero rows rather than failing. As of writing, introspection reports
-- `scholarship_programs` empty and `20260831120000_seed_dev_operational_data`
-- unapplied -- so on the current database this seed is likely inert until the
-- program rows exist. Re-run it (it is idempotent) after seeding programs.
--
-- CFSP-only components (New Normal, Insurance, Entrepreneurship) are left null
-- on the TWSP row rather than zeroed: null reads as "does not apply to this
-- program", zero reads as "applies, and is free".

insert into public.scholarship_cost_schedule (
  program_id,
  qualification_code,
  training_hours,
  training_days,
  training_cost,
  tsf_day_rate,
  new_normal,
  insurance_fee,
  entrepreneurship_fee
)
select
  p.id,
  'AFFACP211',
  360,
  45,
  15390.00,
  160.00,
  case when p.code = 'CFSP' then 1000.00 end,
  case when p.code = 'CFSP' then 100.80 end,
  case when p.code = 'CFSP' then 800.00 end
from public.scholarship_programs p
where p.code in ('TWSP', 'CFSP')
  and exists (select 1 from public.qualifications q where q.code = 'AFFACP211')
on conflict (program_id, qualification_code) do update set
  training_hours = excluded.training_hours,
  training_days = excluded.training_days,
  training_cost = excluded.training_cost,
  tsf_day_rate = excluded.tsf_day_rate,
  new_normal = excluded.new_normal,
  insurance_fee = excluded.insurance_fee,
  entrepreneurship_fee = excluded.entrepreneurship_fee,
  updated_at = now();
