-- Apply an invitation membership only while the profile has no membership.
-- Locking the parent profile gives every call for that profile one shared
-- serialization point, including calls that propose different tenants.
create or replace function public.ensure_profile_tenant_membership(
  target_profile_id uuid,
  target_tenant_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform p.id
  from public.profiles p
  where p.id = target_profile_id
  for update;

  if exists (
    select 1
    from public.profile_tenant_memberships membership
    where membership.profile_id = target_profile_id
  ) then
    return;
  end if;

  insert into public.profile_tenant_memberships (profile_id, tenant_id, is_default)
  values (target_profile_id, target_tenant_id, true);
end;
$$;

revoke execute on function public.ensure_profile_tenant_membership(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.ensure_profile_tenant_membership(uuid, uuid)
to service_role;
