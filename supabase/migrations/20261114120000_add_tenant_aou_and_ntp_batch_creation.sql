-- ===========================================================================
-- Create batches from a Notice to Proceed, with the school's Affidavit of
-- Undertaking (TES-105; ADR-009 AOU1, AOU2, NTP1-NTP8, PRG1, DOC1).
-- ===========================================================================
--
-- Additive only. NOT APPLIED by the assistant: the author applies it
-- (RULES.md rule 36), then regenerates/re-checks database.types.ts (rule 20).
--
-- 1. tenant_aou      one AOU per school per fiscal year, always with its file
-- 2. batches.ntp_date the "Date:" line of the NTP
-- 3. RTES            the rice program, with the common eight requirements
-- 4. aou rename      "Affidavit of Undertaking" (Circular 014-2026, Annex H)
-- 5. create_batches_from_ntp  one transaction, still behind RLS

-- ---------------------------------------------------------------------------
-- 1. tenant_aou
-- ---------------------------------------------------------------------------
-- storage_path is NOT NULL on purpose: the server stores the file before the
-- transaction that writes this row (ADR-009 NTP8), so a record without its
-- file cannot exist.

create table if not exists public.tenant_aou (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  fiscal_year integer not null check (fiscal_year between 2000 and 2100),
  storage_path text not null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, fiscal_year)
);

comment on table public.tenant_aou is
  'The school''s Affidavit of Undertaking, one per fiscal year (ADR-009 AOU1). Every row has its file.';

create trigger tenant_aou_set_updated_at
before update on public.tenant_aou
for each row execute function public.set_updated_at();

alter table public.tenant_aou enable row level security;
grant select, insert on public.tenant_aou to authenticated;

create policy "Tenant users can read the school AOU"
on public.tenant_aou
for select
to authenticated
using (app_private.can_access_tenant(tenant_id));

create policy "Admins and coordinators can record the school AOU"
on public.tenant_aou
for insert
to authenticated
with check (app_private.can_manage_tenant(tenant_id));

-- ---------------------------------------------------------------------------
-- 2. batches.ntp_date
-- ---------------------------------------------------------------------------

alter table public.batches
  add column if not exists ntp_date date;

comment on column public.batches.ntp_date is
  'The date printed on the Notice to Proceed ("Date:" line above the school).';

-- ---------------------------------------------------------------------------
-- 3. RTES — Rice Training and Extension Services (Circular 014-2026 §1, program 6)
-- ---------------------------------------------------------------------------
-- The older code RESP on 2024 NTPs is deliberately not seeded (ADR-009 PRG1).
-- Its checklist is the common eight, copied from CFSP's, not CFSP-specific items.
-- No billing rule: that is a separate ticket.

insert into public.scholarship_programs (code, name, description)
values ('RTES', 'Rice Training and Extension Services', 'Rice program under the Rice Competitiveness Enhancement Fund (Circular 014-2026).')
on conflict (code) do nothing;

insert into public.program_document_requirements (
  program_id, document_key, document_name, description, required_for_stage, audience, is_required, sort_order
)
select rtes.id, r.document_key, r.document_name, r.description, r.required_for_stage, r.audience, r.is_required, r.sort_order
from public.program_document_requirements r
join public.scholarship_programs cfsp on cfsp.id = r.program_id and cfsp.code = 'CFSP'
cross join (select id from public.scholarship_programs where code = 'RTES') rtes
on conflict (program_id, document_key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. The AOU's name
-- ---------------------------------------------------------------------------

update public.program_document_requirements
set document_name = 'Affidavit of Undertaking'
where document_key = 'aou';

-- ---------------------------------------------------------------------------
-- 5. create_batches_from_ntp — one transaction, still behind RLS
-- ---------------------------------------------------------------------------
-- security invoker: every insert below is checked by the caller's own RLS
-- policies (batches, documents, tenant_aou all require can_manage_tenant), so
-- the function adds atomicity, not privilege. RLS stays the boundary.
--
-- The server generates the batch ids and stores the files first (ADR-009
-- NTP8); the function only checks that each path sits under
-- {tenant}/{first batch id}/{ntp|aou}/.
--
-- p_rows: [{"id": uuid, "rqm_code": text, "program_code": text,
--           "qualification_title": text, "approved_slots": int,
--           "total_amount": text, "indicative_start_date": date}, ...]
--
-- Refusals are raised with SQLSTATE P0001 and a message starting "ntp:" so the
-- data layer can map them without parsing prose. A duplicate RQM or batch code
-- surfaces as the unique violation 23505.

create or replace function public.create_batches_from_ntp(
  p_tenant_id uuid,
  p_receipt_date date,
  p_ntp_date date,
  p_ntp_approval_date date,
  p_ntp_path text,
  p_aou_path text,
  p_rows jsonb
)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_year integer := extract(year from p_receipt_date)::integer;
  v_first uuid;
  v_prefix text;
  v_aou_path text;
  v_unknown text;
  v_ids uuid[];
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception using errcode = 'P0001', message = 'ntp:no-rows';
  end if;
  if p_receipt_date is null or p_ntp_date is null or p_ntp_approval_date is null
     or p_receipt_date < p_ntp_date then
    raise exception using errcode = 'P0001', message = 'ntp:bad-dates';
  end if;

  v_first := (p_rows -> 0 ->> 'id')::uuid;
  v_prefix := p_tenant_id::text || '/' || v_first::text || '/';
  if p_ntp_path is null or left(p_ntp_path, length(v_prefix) + 4) <> v_prefix || 'ntp/' then
    raise exception using errcode = 'P0001', message = 'ntp:bad-path';
  end if;

  select string_agg(distinct e ->> 'program_code', ', ')
  into v_unknown
  from jsonb_array_elements(p_rows) as e
  where not exists (
    select 1 from public.scholarship_programs sp
    where sp.code = e ->> 'program_code' and sp.is_active
  );
  if v_unknown is not null then
    raise exception using errcode = 'P0001', message = 'ntp:unknown-program', detail = v_unknown;
  end if;

  -- The school's AOU for the year: reuse it, or record the supplied one.
  select storage_path into v_aou_path
  from public.tenant_aou
  where tenant_id = p_tenant_id and fiscal_year = v_year;

  if v_aou_path is null then
    if p_aou_path is null then
      raise exception using errcode = 'P0001', message = 'ntp:aou-required', detail = v_year::text;
    end if;
    if left(p_aou_path, length(v_prefix) + 4) <> v_prefix || 'aou/' then
      raise exception using errcode = 'P0001', message = 'ntp:bad-path';
    end if;
    insert into public.tenant_aou (tenant_id, fiscal_year, storage_path, recorded_by)
    values (p_tenant_id, v_year, p_aou_path, app_private.current_profile_id())
    on conflict (tenant_id, fiscal_year) do nothing;
    -- Ours, or the one a concurrent save recorded a moment earlier.
    select storage_path into v_aou_path
    from public.tenant_aou
    where tenant_id = p_tenant_id and fiscal_year = v_year;
  end if;

  with inserted as (
    insert into public.batches (
      id, tenant_id, program_id, batch_code, rqm_code, qualification_title,
      approved_slots, total_amount, indicative_start_date,
      ntp_date, ntp_approval_date, ntp_received_date,
      current_stage, created_by, updated_by
    )
    select
      (e ->> 'id')::uuid,
      p_tenant_id,
      sp.id,
      e ->> 'rqm_code',
      e ->> 'rqm_code',
      e ->> 'qualification_title',
      (e ->> 'approved_slots')::integer,
      (e ->> 'total_amount')::numeric,
      (e ->> 'indicative_start_date')::date,
      p_ntp_date,
      p_ntp_approval_date,
      p_receipt_date,
      'ntp'::public.lifecycle_stage,
      app_private.current_profile_id(),
      app_private.current_profile_id()
    from jsonb_array_elements(p_rows) as e
    join public.scholarship_programs sp on sp.code = e ->> 'program_code'
    where (e ->> 'approved_slots')::integer >= 1
    returning id, program_id
  ),
  docs(document_key, storage_path) as (
    values ('ntp', p_ntp_path), ('aou', v_aou_path)
  ),
  inserted_docs as (
    insert into public.documents (
      tenant_id, batch_id, requirement_id, document_key, document_name,
      status, audience, storage_path, submitted_by, submitted_at
    )
    select
      p_tenant_id,
      b.id,
      r.id,
      d.document_key,
      coalesce(r.document_name, d.document_key),
      'submitted'::public.document_status,
      coalesce(r.audience, 'all'::public.document_audience),
      d.storage_path,
      app_private.current_profile_id(),
      now()
    from inserted b
    cross join docs d
    left join public.program_document_requirements r
      on r.program_id = b.program_id and r.document_key = d.document_key
    returning batch_id
  )
  select array_agg(distinct batch_id) into v_ids from inserted_docs;

  if coalesce(array_length(v_ids, 1), 0) <> jsonb_array_length(p_rows) then
    raise exception using errcode = 'P0001', message = 'ntp:bad-row';
  end if;

  return v_ids;
end;
$$;

revoke execute on function public.create_batches_from_ntp(uuid, date, date, date, text, text, jsonb) from public, anon;
grant execute on function public.create_batches_from_ntp(uuid, date, date, date, text, text, jsonb) to authenticated;
