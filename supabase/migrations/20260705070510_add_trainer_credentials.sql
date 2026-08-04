create table public.trainer_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  credential_number text,
  certified_nc_levels text[] not null default '{}',
  specialization text,
  accreditation_expiry date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trainer_credentials_set_updated_at
before update on public.trainer_credentials
for each row execute function public.set_updated_at();

alter table public.trainer_credentials enable row level security;

create policy "Users can read own or same-tenant trainer credentials"
on public.trainer_credentials
for select
to authenticated
using (
  profile_id = app_private.current_profile_id()
  or (
    app_private.current_role() in ('admin', 'coordinator')
    and exists (
      select 1
      from public.profile_tenant_memberships viewer_membership
      join public.profile_tenant_memberships target_membership
        on target_membership.tenant_id = viewer_membership.tenant_id
      where viewer_membership.profile_id = app_private.current_profile_id()
        and target_membership.profile_id = trainer_credentials.profile_id
    )
  )
);

create policy "Trainers can manage own credentials"
on public.trainer_credentials
for all
to authenticated
using (
  profile_id = app_private.current_profile_id()
  and app_private.current_role() = 'trainer'
)
with check (
  profile_id = app_private.current_profile_id()
  and app_private.current_role() = 'trainer'
);
