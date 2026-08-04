-- Corrective migration (TES): reconcile the out-of-band `public.tenant` table.
--
-- `public.tenant` (singular) was created outside the migration history with
-- non-conforming columns (camelCase `"schoolType"`/`"isActive"`, int PK
-- `"tenant_Id"`, `school_name` instead of `name`) and is referenced by no
-- foreign key and no application code. The canonical tenant table is
-- `public.tenants` (plural, uuid PK, snake_case, RLS-scoped).
--
-- It held one real record (AKB Technical Vocational Inc.) that did not exist
-- in `public.tenants`. This migration copies that record into the canonical
-- table, then drops the rogue table.
--
-- Guarded, because no migration ever created `public.tenant` — it was made by
-- hand. On any database rebuilt from this history (a fresh `db reset`, CI, a
-- new environment) the table is absent and there is nothing to reconcile, so
-- the block short-circuits instead of failing. The statements that reference
-- it sit inside `do $$ … $$` for that reason: PL/pgSQL plans a statement on
-- first execution, so an unreached statement never resolves `public.tenant`,
-- whereas plain SQL is parsed immediately and would raise 42P01.
--
-- Applied to the hosted project on 2026-07-17 as version 20260717054607; this
-- file carries that version so the ledger and the repo agree and the migration
-- is not re-applied.

do $$
begin
  if to_regclass('public.tenant') is null then
    raise notice 'public.tenant absent - nothing to reconcile';
    return;
  end if;

  insert into public.tenants (code, name, region, school_type, is_active)
  select t.code, t.school_name, t.region, t."schoolType", t."isActive"
  from public.tenant t
  where not exists (
    select 1 from public.tenants existing where existing.code = t.code
  );

  drop table public.tenant;
end
$$;
