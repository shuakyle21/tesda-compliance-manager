-- T2MIS terminal-report fields (TES-49, export half of TES-15).
--
-- NOT APPLIED -- RULES.md rule 36 requires explicit permission.
--
-- The T2MIS "terminal" sheet has 48 columns; before this migration the schema
-- stored about 14 of them. Everything here is additive and nullable, so
-- existing rows stay valid and an empty value keeps meaning "not recorded".
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
alter table public.batches
  add column if not exists training_calendar_code text,
  add column if not exists tenant_qualification_id uuid
    references public.tenant_qualifications(id) on delete set null;

create index if not exists batches_tenant_qualification_id_idx
  on public.batches (tenant_qualification_id)
  where tenant_qualification_id is not null;

-- Learner ------------------------------------------------------------------
-- Personal data lives on the tenant-scoped `learners` row, under its existing
-- RLS policies -- not on the global, policy-less `learner_identities`.
alter table public.learners
  add column if not exists contact_number text,
  add column if not exists email text,
  add column if not exists street_address text,
  add column if not exists barangay text,
  add column if not exists city_municipality text,
  add column if not exists district text,
  add column if not exists province text,
  add column if not exists sex text check (sex in ('Male', 'Female')),
  add column if not exists date_of_birth date,
  add column if not exists civil_status text,
  add column if not exists highest_grade_completed text,
  add column if not exists nationality text,
  add column if not exists client_classification text,
  add column if not exists training_status text,
  add column if not exists voucher_number text,
  add column if not exists date_assessed date,
  add column if not exists employment_status_before text,
  add column if not exists date_employed date,
  add column if not exists occupation text,
  add column if not exists employer_name text,
  add column if not exists employer_address text,
  add column if not exists employer_classification text,
  add column if not exists salary_range text;

-- ULI is the permanent learner key; one learner appears once per batch. This
-- fails (and the whole migration rolls back) if a batch already holds the same
-- ULI twice -- check before applying:
--   select tenant_id, batch_id, uli, count(*) from public.learners
--   where uli is not null group by 1, 2, 3 having count(*) > 1;
create unique index if not exists learners_tenant_batch_uli_key
  on public.learners (tenant_id, batch_id, uli)
  where uli is not null;
