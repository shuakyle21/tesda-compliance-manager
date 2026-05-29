create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;

create type public.profile_role as enum (
  'admin',
  'coordinator',
  'trainer',
  'viewer'
);

create type public.lifecycle_stage as enum (
  'aou',
  'ntp',
  'tip',
  'training',
  'assessment',
  'billing',
  'completed',
  'blocked'
);

create type public.batch_status as enum (
  'pending',
  'ongoing',
  'completed',
  'blocked'
);

create type public.document_status as enum (
  'missing',
  'pending',
  'submitted',
  'verified'
);

create type public.document_audience as enum (
  'admin',
  'coordinator',
  'trainer',
  'viewer',
  'all'
);

create type public.assessment_result as enum (
  'competent',
  'not_yet_competent',
  'pending'
);

create type public.activity_action as enum (
  'created',
  'updated',
  'uploaded',
  'verified',
  'submitted',
  'deleted',
  'system_note'
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  region text,
  school_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  full_name text,
  email text,
  role public.profile_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, profile_id)
);

create table public.scholarship_programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_document_requirements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.scholarship_programs(id) on delete cascade,
  document_key text not null,
  document_name text not null,
  description text,
  required_for_stage public.lifecycle_stage,
  audience public.document_audience not null default 'all',
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, document_key)
);

create table public.program_billing_rules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.scholarship_programs(id) on delete cascade,
  progress_threshold_percent integer not null default 80 check (
    progress_threshold_percent between 0 and 100
  ),
  label text not null default 'Billing Preparation',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id)
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  program_id uuid not null references public.scholarship_programs(id),
  batch_code text not null,
  batch_section text,
  qualification_title text not null,
  nc_level text,
  trainer_profile_id uuid references public.profiles(id) on delete set null,
  trainer_name text,
  learner_count integer not null default 0 check (learner_count >= 0),
  start_date date,
  end_date date,
  current_stage public.lifecycle_stage not null default 'aou',
  status public.batch_status not null default 'pending',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  billing_report_status public.document_status not null default 'missing',
  official_system_reference text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, batch_code)
);

create table public.learners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  learner_no text,
  uli text,
  last_name text not null,
  first_name text not null,
  middle_name text,
  extension_name text,
  assessment_result public.assessment_result not null default 'pending',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, batch_id, learner_no)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  requirement_id uuid references public.program_document_requirements(id) on delete set null,
  document_key text not null,
  document_name text not null,
  status public.document_status not null default 'missing',
  audience public.document_audience not null default 'all',
  storage_path text,
  external_url text,
  notes text,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lamr_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  tvi_name text not null,
  program_title text not null,
  batch_section text,
  module_title text not null,
  schedule_text text,
  prepared_by text,
  approved_by text,
  source_document_id uuid references public.documents(id) on delete set null,
  source_storage_path text,
  source_external_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lamr_outcomes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lamr_report_id uuid not null references public.lamr_reports(id) on delete cascade,
  outcome_code text not null,
  outcome_title text not null,
  hours numeric(8, 2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, lamr_report_id, outcome_code)
);

create table public.lamr_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lamr_report_id uuid not null references public.lamr_reports(id) on delete cascade,
  outcome_id uuid not null references public.lamr_outcomes(id) on delete cascade,
  activity_code text not null,
  activity_title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, outcome_id, activity_code)
);

create table public.lamr_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lamr_report_id uuid not null references public.lamr_reports(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  activity_id uuid not null references public.lamr_activities(id) on delete cascade,
  is_completed boolean not null default false,
  assessment_result public.assessment_result not null default 'pending',
  notes text,
  marked_by uuid references public.profiles(id) on delete set null,
  marked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, learner_id, activity_id)
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  action public.activity_action not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profile_tenant_memberships_tenant_id_idx on public.profile_tenant_memberships (tenant_id);
create index profile_tenant_memberships_profile_id_idx on public.profile_tenant_memberships (profile_id);
create index program_document_requirements_program_id_idx on public.program_document_requirements (program_id);
create index program_billing_rules_program_id_idx on public.program_billing_rules (program_id);
create index batches_tenant_id_idx on public.batches (tenant_id);
create index batches_program_id_idx on public.batches (program_id);
create index batches_trainer_profile_id_idx on public.batches (trainer_profile_id);
create index learners_tenant_batch_idx on public.learners (tenant_id, batch_id);
create index documents_tenant_batch_idx on public.documents (tenant_id, batch_id);
create index lamr_reports_tenant_batch_idx on public.lamr_reports (tenant_id, batch_id);
create index lamr_outcomes_report_idx on public.lamr_outcomes (tenant_id, lamr_report_id);
create index lamr_activities_report_idx on public.lamr_activities (tenant_id, lamr_report_id);
create index lamr_entries_report_idx on public.lamr_entries (tenant_id, lamr_report_id);
create index activity_log_tenant_created_at_idx on public.activity_log (tenant_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger scholarship_programs_set_updated_at
before update on public.scholarship_programs
for each row execute function public.set_updated_at();

create trigger program_document_requirements_set_updated_at
before update on public.program_document_requirements
for each row execute function public.set_updated_at();

create trigger program_billing_rules_set_updated_at
before update on public.program_billing_rules
for each row execute function public.set_updated_at();

create trigger batches_set_updated_at
before update on public.batches
for each row execute function public.set_updated_at();

create trigger learners_set_updated_at
before update on public.learners
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger lamr_reports_set_updated_at
before update on public.lamr_reports
for each row execute function public.set_updated_at();

create trigger lamr_outcomes_set_updated_at
before update on public.lamr_outcomes
for each row execute function public.set_updated_at();

create trigger lamr_activities_set_updated_at
before update on public.lamr_activities
for each row execute function public.set_updated_at();

create trigger lamr_entries_set_updated_at
before update on public.lamr_entries
for each row execute function public.set_updated_at();

create or replace function app_private.current_clerk_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'sub', ''),
    nullif(auth.jwt() ->> 'clerk_user_id', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'clerk_user_id', '')
  );
$$;

create or replace function app_private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.clerk_user_id = app_private.current_clerk_user_id()
    and p.is_active = true
  limit 1;
$$;

create or replace function app_private.current_role()
returns public.profile_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = app_private.current_profile_id()
  limit 1;
$$;

create or replace function app_private.can_access_tenant(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_tenant_memberships ptm
    join public.profiles p on p.id = ptm.profile_id
    where ptm.tenant_id = target_tenant_id
      and ptm.profile_id = app_private.current_profile_id()
      and p.is_active = true
  );
$$;

create or replace function app_private.can_manage_tenant(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.current_role() in ('admin', 'coordinator')
    and app_private.can_access_tenant(target_tenant_id);
$$;

create or replace function app_private.can_read_batch(target_batch_id uuid)
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
      and app_private.can_access_tenant(b.tenant_id)
      and (
        app_private.current_role() in ('admin', 'coordinator', 'viewer')
        or (
          app_private.current_role() = 'trainer'
          and b.trainer_profile_id = app_private.current_profile_id()
        )
      )
  );
$$;

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
      and b.trainer_profile_id = app_private.current_profile_id()
      and app_private.current_role() = 'trainer'
      and app_private.can_access_tenant(b.tenant_id)
  );
$$;

revoke execute on function public.set_updated_at() from anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on all functions in schema app_private to authenticated;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_tenant_memberships enable row level security;
alter table public.scholarship_programs enable row level security;
alter table public.program_document_requirements enable row level security;
alter table public.program_billing_rules enable row level security;
alter table public.batches enable row level security;
alter table public.learners enable row level security;
alter table public.documents enable row level security;
alter table public.lamr_reports enable row level security;
alter table public.lamr_outcomes enable row level security;
alter table public.lamr_activities enable row level security;
alter table public.lamr_entries enable row level security;
alter table public.activity_log enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy "Users can read assigned tenants"
on public.tenants
for select
to authenticated
using (app_private.can_access_tenant(id));

create policy "Users can read own or same-tenant profiles"
on public.profiles
for select
to authenticated
using (
  id = app_private.current_profile_id()
  or (
    app_private.current_role() in ('admin', 'coordinator')
    and exists (
      select 1
      from public.profile_tenant_memberships viewer_membership
      join public.profile_tenant_memberships target_membership
        on target_membership.tenant_id = viewer_membership.tenant_id
      where viewer_membership.profile_id = app_private.current_profile_id()
        and target_membership.profile_id = profiles.id
    )
  )
);

create policy "Users can read assigned tenant memberships"
on public.profile_tenant_memberships
for select
to authenticated
using (app_private.can_access_tenant(tenant_id));

create policy "Authenticated users can read active programs"
on public.scholarship_programs
for select
to authenticated
using (is_active = true);

create policy "Admins and coordinators can manage programs"
on public.scholarship_programs
for all
to authenticated
using (app_private.current_role() in ('admin', 'coordinator'))
with check (app_private.current_role() in ('admin', 'coordinator'));

create policy "Authenticated users can read document requirements"
on public.program_document_requirements
for select
to authenticated
using (true);

create policy "Admins and coordinators can manage document requirements"
on public.program_document_requirements
for all
to authenticated
using (app_private.current_role() in ('admin', 'coordinator'))
with check (app_private.current_role() in ('admin', 'coordinator'));

create policy "Authenticated users can read billing rules"
on public.program_billing_rules
for select
to authenticated
using (is_active = true);

create policy "Admins and coordinators can manage billing rules"
on public.program_billing_rules
for all
to authenticated
using (app_private.current_role() in ('admin', 'coordinator'))
with check (app_private.current_role() in ('admin', 'coordinator'));

create policy "Tenant users can read scoped batches"
on public.batches
for select
to authenticated
using (app_private.can_read_batch(id));

create policy "Admins and coordinators can create batches"
on public.batches
for insert
to authenticated
with check (app_private.can_manage_tenant(tenant_id));

create policy "Admins and coordinators can update batches"
on public.batches
for update
to authenticated
using (app_private.can_manage_tenant(tenant_id))
with check (app_private.can_manage_tenant(tenant_id));

create policy "Admins and coordinators can delete batches"
on public.batches
for delete
to authenticated
using (app_private.can_manage_tenant(tenant_id));

create policy "Tenant users can read scoped learners"
on public.learners
for select
to authenticated
using (app_private.can_read_batch(batch_id));

create policy "Admins and coordinators can manage learners"
on public.learners
for all
to authenticated
using (app_private.can_manage_tenant(tenant_id))
with check (app_private.can_manage_tenant(tenant_id));

create policy "Tenant users can read scoped documents"
on public.documents
for select
to authenticated
using (
  app_private.can_manage_tenant(tenant_id)
  or app_private.current_role() = 'viewer' and app_private.can_access_tenant(tenant_id)
  or (
    app_private.can_trainer_write_batch(batch_id)
    and audience in ('trainer', 'all')
  )
);

create policy "Admins and coordinators can manage documents"
on public.documents
for all
to authenticated
using (app_private.can_manage_tenant(tenant_id))
with check (app_private.can_manage_tenant(tenant_id));

create policy "Trainers can submit assigned training documents"
on public.documents
for insert
to authenticated
with check (
  app_private.can_trainer_write_batch(batch_id)
  and audience in ('trainer', 'all')
);

create policy "Trainers can update own assigned training documents"
on public.documents
for update
to authenticated
using (
  app_private.can_trainer_write_batch(batch_id)
  and submitted_by = app_private.current_profile_id()
  and audience in ('trainer', 'all')
)
with check (
  app_private.can_trainer_write_batch(batch_id)
  and submitted_by = app_private.current_profile_id()
  and audience in ('trainer', 'all')
);

create policy "Tenant users can read scoped LAMR reports"
on public.lamr_reports
for select
to authenticated
using (app_private.can_read_batch(batch_id));

create policy "Admins coordinators and assigned trainers can manage LAMR reports"
on public.lamr_reports
for all
to authenticated
using (
  app_private.can_manage_tenant(tenant_id)
  or app_private.can_trainer_write_batch(batch_id)
)
with check (
  app_private.can_manage_tenant(tenant_id)
  or app_private.can_trainer_write_batch(batch_id)
);

create policy "Tenant users can read scoped LAMR outcomes"
on public.lamr_outcomes
for select
to authenticated
using (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_outcomes.lamr_report_id
      and app_private.can_read_batch(r.batch_id)
  )
);

create policy "Admins coordinators and assigned trainers can manage LAMR outcomes"
on public.lamr_outcomes
for all
to authenticated
using (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_outcomes.lamr_report_id
      and (
        app_private.can_manage_tenant(r.tenant_id)
        or app_private.can_trainer_write_batch(r.batch_id)
      )
  )
)
with check (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_outcomes.lamr_report_id
      and r.tenant_id = lamr_outcomes.tenant_id
      and (
        app_private.can_manage_tenant(r.tenant_id)
        or app_private.can_trainer_write_batch(r.batch_id)
      )
  )
);

create policy "Tenant users can read scoped LAMR activities"
on public.lamr_activities
for select
to authenticated
using (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_activities.lamr_report_id
      and app_private.can_read_batch(r.batch_id)
  )
);

create policy "Admins coordinators and assigned trainers can manage LAMR activities"
on public.lamr_activities
for all
to authenticated
using (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_activities.lamr_report_id
      and (
        app_private.can_manage_tenant(r.tenant_id)
        or app_private.can_trainer_write_batch(r.batch_id)
      )
  )
)
with check (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_activities.lamr_report_id
      and r.tenant_id = lamr_activities.tenant_id
      and (
        app_private.can_manage_tenant(r.tenant_id)
        or app_private.can_trainer_write_batch(r.batch_id)
      )
  )
);

create policy "Tenant users can read scoped LAMR entries"
on public.lamr_entries
for select
to authenticated
using (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_entries.lamr_report_id
      and app_private.can_read_batch(r.batch_id)
  )
);

create policy "Admins coordinators and assigned trainers can manage LAMR entries"
on public.lamr_entries
for all
to authenticated
using (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_entries.lamr_report_id
      and (
        app_private.can_manage_tenant(r.tenant_id)
        or app_private.can_trainer_write_batch(r.batch_id)
      )
  )
)
with check (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_entries.lamr_report_id
      and r.tenant_id = lamr_entries.tenant_id
      and (
        app_private.can_manage_tenant(r.tenant_id)
        or app_private.can_trainer_write_batch(r.batch_id)
      )
  )
);

create policy "Tenant users can read activity log"
on public.activity_log
for select
to authenticated
using (app_private.can_access_tenant(tenant_id));

create policy "Tenant users can append activity log"
on public.activity_log
for insert
to authenticated
with check (app_private.can_access_tenant(tenant_id));

insert into public.tenants (code, name, region, school_type)
values
  ('AKB', 'AKB Technical Vocational Inc.', 'Region IV-A, Laguna', 'Technical-vocational institute'),
  ('J3ED', 'J3ED Farm School', 'Region IV-A, Quezon', 'Farm school'),
  ('NEN', 'Nenita Farm Rice-Based School', 'Region III, Nueva Ecija', 'Rice-based farm school')
on conflict (code) do update set
  name = excluded.name,
  region = excluded.region,
  school_type = excluded.school_type,
  updated_at = now();

insert into public.scholarship_programs (code, name, description)
values
  ('TWSP', 'Training for Work Scholarship Program', 'Initial MVP seed scholarship program.'),
  ('CFSP', 'Coconut Farmers Scholarship Program', 'Initial MVP seed scholarship program.')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

with programs as (
  select id, code from public.scholarship_programs where code in ('TWSP', 'CFSP')
),
requirements(document_key, document_name, required_for_stage, audience, sort_order) as (
  values
    ('aou', 'Authority to Undertake evidence', 'aou'::public.lifecycle_stage, 'all'::public.document_audience, 10),
    ('ntp', 'Notice to Proceed evidence', 'ntp'::public.lifecycle_stage, 'all'::public.document_audience, 20),
    ('tip_report', 'Training Induction Program report', 'tip'::public.lifecycle_stage, 'all'::public.document_audience, 30),
    ('training_schedule', 'Approved training schedule evidence', 'training'::public.lifecycle_stage, 'all'::public.document_audience, 40),
    ('attendance', 'Attendance or equivalent blended learning evidence', 'training'::public.lifecycle_stage, 'trainer'::public.document_audience, 50),
    ('lamr', 'Learners Achievement Monitoring Report', 'training'::public.lifecycle_stage, 'trainer'::public.document_audience, 60),
    ('assessment', 'Assessment evidence', 'assessment'::public.lifecycle_stage, 'all'::public.document_audience, 70),
    ('billing_report', 'Internal billing preparation document', 'billing'::public.lifecycle_stage, 'admin'::public.document_audience, 80)
)
insert into public.program_document_requirements (
  program_id,
  document_key,
  document_name,
  required_for_stage,
  audience,
  sort_order
)
select p.id, r.document_key, r.document_name, r.required_for_stage, r.audience, r.sort_order
from programs p
cross join requirements r
on conflict (program_id, document_key) do update set
  document_name = excluded.document_name,
  required_for_stage = excluded.required_for_stage,
  audience = excluded.audience,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.program_billing_rules (
  program_id,
  progress_threshold_percent,
  label,
  description
)
select
  id,
  80,
  'Billing Preparation',
  'Internal billing preparation signal only; this is not official TESDA billing approval.'
from public.scholarship_programs
where code in ('TWSP', 'CFSP')
on conflict (program_id) do update set
  progress_threshold_percent = excluded.progress_threshold_percent,
  label = excluded.label,
  description = excluded.description,
  updated_at = now();

insert into storage.buckets (id, name, public, file_size_limit)
values ('compliance-evidence', 'compliance-evidence', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

create policy "Tenant users can read scoped evidence objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'compliance-evidence'
  and app_private.can_access_tenant((storage.foldername(name))[1]::uuid)
);

create policy "Tenant users can upload scoped evidence objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'compliance-evidence'
  and app_private.can_access_tenant((storage.foldername(name))[1]::uuid)
);

create policy "Tenant users can update scoped evidence objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'compliance-evidence'
  and app_private.can_access_tenant((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'compliance-evidence'
  and app_private.can_access_tenant((storage.foldername(name))[1]::uuid)
);
