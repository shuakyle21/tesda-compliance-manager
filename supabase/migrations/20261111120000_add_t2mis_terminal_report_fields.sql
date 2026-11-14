-- T2MIS terminal-report fields (TES-49, export half of TES-15).
--
-- APPLIED 2026-11-11 and recorded as version 20261111120000. It went in
-- piecemeal through the SQL editor rather than in one run, so the live objects
-- were verified against this file afterwards (columns, both foreign keys, both
-- policies, the trigger, all three indexes).
--
-- The T2MIS "terminal" sheet has 48 columns; before this migration the schema
-- stored about 14 of them. Everything here is additive (new nullable columns
-- and one new table), so existing rows stay valid and an empty value keeps meaning "not recorded".
--
-- Coded values (civil status, client classification, training status, ...)
-- are plain text with no CHECK on purpose: TESDA's full value lists are not
-- confirmed, and a wrong CHECK would reject rows T2MIS itself accepts. `sex`
-- is the exception.
--
-- Age is not stored (derived from date_of_birth). Date Started / Date Finished
-- come from batches.start_date / end_date.

-- Provider -----------------------------------------------------------------
alter table public.tenants
  add column if not exists congressional_district text;

alter table public.qualifications
  add column if not exists cluster text;

-- Batch --------------------------------------------------------------------
-- The link is what makes sector, registration status, CTPR (copr_number) and
-- delivery mode reachable from a batch. batches.qualification_title stays as
-- the display title (ADR-006); this column is nullable and nothing reads it
-- except the T2MIS export.
--
-- The foreign key is composite on purpose: it includes tenant_id, so a batch
-- can only link to a registry row of its own school. `on delete restrict`
-- (not `set null`) means deleting a registry row never rewrites a `batches`
-- row -- a platform admin has no write path into compliance tables (ADR-006
-- P3, RULES.md rule 30); a row still in use simply cannot be deleted.
alter table public.tenant_qualifications
  add constraint tenant_qualifications_id_tenant_key unique (id, tenant_id);

alter table public.batches
  add column if not exists training_calendar_code text,
  add column if not exists tenant_qualification_id uuid;

alter table public.batches
  add constraint batches_tenant_qualification_fkey
    foreign key (tenant_qualification_id, tenant_id)
    references public.tenant_qualifications (id, tenant_id)
    on delete restrict;

create index if not exists batches_tenant_qualification_id_idx
  on public.batches (tenant_qualification_id)
  where tenant_qualification_id is not null;

-- Learner details -----------------------------------------------------------
-- The T2MIS personal, training and employment fields live in their own
-- one-to-one table rather than on `learners`, because the two need different
-- readers. `learners` is readable by a trainer for their own batches
-- (app_private.can_read_batch), and RLS filters rows, not columns -- on
-- `learners` these fields (contact, address, date of birth, employer, salary
-- range) would be one API call away from any assigned trainer. Here only the
-- office roles can read them (RULES.md rules 1 and 5).
--
-- Not the global `learner_identities` either: that table is policy-less and
-- stays unused per ADR-001.
alter table public.learners
  add constraint learners_id_tenant_key unique (id, tenant_id);

create table public.learner_details (
  learner_id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contact_number text,
  email text,
  street_address text,
  barangay text,
  city_municipality text,
  district text,
  province text,
  sex text check (sex in ('Male', 'Female')),
  date_of_birth date,
  civil_status text,
  highest_grade_completed text,
  nationality text,
  client_classification text,
  training_status text,
  voucher_number text,
  date_assessed date,
  employment_status_before text,
  date_employed date,
  occupation text,
  employer_name text,
  employer_address text,
  employer_classification text,
  salary_range text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite, so a details row can never name a different school than its learner.
  foreign key (learner_id, tenant_id)
    references public.learners (id, tenant_id) on delete cascade
);

create index learner_details_tenant_id_idx on public.learner_details (tenant_id);

create trigger learner_details_set_updated_at
before update on public.learner_details
for each row execute function public.set_updated_at();

alter table public.learner_details enable row level security;
grant select, insert, update, delete on public.learner_details to authenticated;

-- Trainers are deliberately absent from the read policy.
create policy "Office roles can read learner details"
on public.learner_details
for select
to authenticated
using (
  app_private.current_role() in ('admin', 'coordinator', 'viewer')
  and app_private.can_access_tenant(tenant_id)
);

create policy "Admins and coordinators can manage learner details"
on public.learner_details
for all
to authenticated
using (app_private.can_manage_tenant(tenant_id))
with check (app_private.can_manage_tenant(tenant_id));

-- ULI is the permanent learner key; one learner appears once per batch. This
-- fails (and the whole migration rolls back) if a batch already holds the same
-- ULI twice -- check before applying:
--   select tenant_id, batch_id, uli, count(*) from public.learners
--   where uli is not null group by 1, 2, 3 having count(*) > 1;
create unique index if not exists learners_tenant_batch_uli_key
  on public.learners (tenant_id, batch_id, uli)
  where uli is not null;
