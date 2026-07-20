-- Corrective migration (TES): reconcile the out-of-band `public.tenant` table.
--
-- `public.tenant` (singular) was created outside the migration history with
-- non-conforming columns (camelCase `"schoolType"`/`"isActive"`, int PK
-- `"tenant_Id"`, `school_name` instead of `name`) and is referenced by no
-- foreign key and no application code. The canonical tenant table is
-- `public.tenants` (plural, uuid PK, snake_case, RLS-scoped).
--
-- It held one real record (AKB Technical Vocational Institute) that did not
-- exist in `public.tenants`. This migration copies that record into the
-- canonical table, then drops the rogue table. Runs in a single transaction:
-- if the insert fails, the drop is rolled back and no data is lost.

insert into public.tenants (code, name, region, school_type, is_active)
select t.code, t.school_name, t.region, t."schoolType", t."isActive"
from public.tenant t
where not exists (
  select 1 from public.tenants existing where existing.code = t.code
);

drop table public.tenant;
