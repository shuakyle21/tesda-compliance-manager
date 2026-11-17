-- Tests for migration 20261117120000_harden_profile_and_membership_policies.sql
-- (security remediation item 1.1, findings F-01 and F-02).
--
-- Plain SQL, not pgTAP (pgTAP is not installed on the local test cluster). One
-- "PASS:" or "FAIL:" notice per case, then a summary. The last statement raises
-- an exception when any case failed, so `psql -v ON_ERROR_STOP=1` exits
-- non-zero. Everything runs inside one transaction that is rolled back, so the
-- database is left exactly as it was found.
--
-- HOW EACH CASE WORKS. The file connects as a superuser, builds fixtures, then
-- for every case does what PostgREST does for a request: sets
-- `request.jwt.claims` to the persona's `sub` and runs `set local role
-- authenticated` (or `service_role`), so the real RLS policies and column
-- privileges are evaluated. Each statement runs in its own sub-transaction
-- that is rolled back afterwards, so cases do not affect each other.
--
-- HOW TO RUN
--   Local Postgres 16 with the Supabase-style roles (anon, authenticated,
--   service_role) and `auth.jwt()` stub, all migrations applied in order:
--       psql -v ON_ERROR_STOP=1 -d <db> -f supabase/tests/profile_membership_hardening.test.sql
--   Local Supabase stack (never the hosted project, RULES.md rule 36):
--       supabase db reset            # applies supabase/migrations/ to the LOCAL stack
--       psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--            -v ON_ERROR_STOP=1 -f supabase/tests/profile_membership_hardening.test.sql
--   (check `supabase status` for the local DB URL.) See supabase/tests/README.md.
--
-- Running it against a database WITHOUT the migration must fail the security
-- cases. That is the proof the tests detect the vulnerability.
--
-- All persona values are fake (user_test_*, *@example.test).

\set ON_ERROR_STOP on
\pset pager off
begin;

create temp table results (n serial, name text, ok boolean);

create function pg_temp.check(p_name text, p_ok boolean) returns void
language plpgsql as $$
begin
  insert into results (name, ok) values (p_name, coalesce(p_ok, false));
  raise notice '%: %', case when coalesce(p_ok, false) then 'PASS' else 'FAIL' end, p_name;
end $$;

-- Runs p_sql as an API role with the persona's JWT sub, in a sub-transaction
-- that is always rolled back. Returns rows affected (or returned, for a
-- select); the SQLSTATE and message if it raised; and, when p_verify is given,
-- the boolean that statement returns AFTER p_sql ran or failed, evaluated as
-- the superuser before the rollback.
create function pg_temp.run_as(
  p_role text, p_sub text, p_sql text, p_verify text default null,
  out affected int, out err text, out err_msg text, out verified boolean)
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', p_role)::text, true);
  begin
    execute format('set local role %I', p_role);
    begin
      execute p_sql;
      get diagnostics affected = row_count;
    exception when others then
      affected := -1;
      err := sqlstate;
      err_msg := sqlerrm;
    end;
    reset role;
    if p_verify is not null then
      execute p_verify into verified;
    end if;
    raise exception 'rollback_sentinel';
  exception when others then
    if sqlerrm <> 'rollback_sentinel' then
      raise;
    end if;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;

create function pg_temp.state_unchanged() returns boolean
language plpgsql as $$
begin
  return
    (select coalesce(string_agg(x::text, ',' order by x::text), '') from public.profiles x)
      = (select coalesce(string_agg(x::text, ',' order by x::text), '') from snap_profiles x)
    and
    (select coalesce(string_agg(x::text, ',' order by x::text), '') from public.profile_tenant_memberships x)
      = (select coalesce(string_agg(x::text, ',' order by x::text), '') from snap_memberships x);
end $$;

-- Assertions built on run_as.
create function pg_temp.allow(p_name text, p_sub text, p_sql text, p_role text default 'authenticated')
returns void language plpgsql as $$
declare r record;
begin
  select * into r from pg_temp.run_as(p_role, p_sub, p_sql);
  perform pg_temp.check('ALLOW ' || p_name, r.err is null and r.affected >= 1);
end $$;

-- A denial must be of the EXPECTED KIND and must leave the data untouched:
--   deny_zero   the statement ran and affected 0 rows (row hidden by RLS USING)
--   deny_rls    "new row violates row-level security policy" (42501, WITH CHECK)
--   deny_perm   "permission denied ..." (42501, a column or table privilege)
--   deny_unique unique violation (23505)
create function pg_temp.deny_kind(p_kind text, p_name text, p_sub text, p_sql text)
returns void language plpgsql as $$
declare
  r record;
  kind_ok boolean;
begin
  select * into r from pg_temp.run_as('authenticated', p_sub, p_sql, 'select pg_temp.state_unchanged()');
  kind_ok := case p_kind
    when 'zero'   then r.err is null and r.affected = 0
    when 'rls'    then r.err = '42501' and r.err_msg like '%row-level security%'
    when 'perm'   then r.err = '42501' and r.err_msg like 'permission denied%'
    when 'unique' then r.err = '23505'
  end;
  perform pg_temp.check('DENY  ' || p_name || ' [' || p_kind || ', data unchanged]',
    coalesce(kind_ok, false) and r.verified is true);
end $$;
create function pg_temp.deny_zero(p_name text, p_sub text, p_sql text) returns void
language sql as $$ select pg_temp.deny_kind('zero', p_name, p_sub, p_sql) $$;
create function pg_temp.deny_rls(p_name text, p_sub text, p_sql text) returns void
language sql as $$ select pg_temp.deny_kind('rls', p_name, p_sub, p_sql) $$;
create function pg_temp.deny_perm(p_name text, p_sub text, p_sql text) returns void
language sql as $$ select pg_temp.deny_kind('perm', p_name, p_sub, p_sql) $$;

-- The set of profile ids a persona can select must equal p_expected.
create function pg_temp.sees_exactly(p_name text, p_sub text, p_expected uuid[])
returns void language plpgsql as $$
declare
  seen uuid[];
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select coalesce(array_agg(id order by id), '{}') into seen from public.profiles;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.check('SEES   ' || p_name,
    seen = (select coalesce(array_agg(x order by x), '{}') from unnest(p_expected) x));
end $$;

-- ---------------------------------------------------------------------------
-- Fixtures (superuser, bypasses RLS)
-- ---------------------------------------------------------------------------
insert into public.tenants (id, code, name) values
  ('11111111-1111-4111-8111-111111111111', 'TEST_A', 'Test School A'),
  ('22222222-2222-4222-8222-222222222222', 'TEST_B', 'Test School B'),
  ('33333333-3333-4333-8333-333333333333', 'TEST_EMPTY', 'Test School Empty');

insert into public.profiles (id, clerk_user_id, full_name, email, role, is_active) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'user_test_admin_a',       'Admin A',        'admin.a@example.test',       'admin',       true),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'user_test_admin_b',       'Admin B',        'admin.b@example.test',       'admin',       true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'user_test_coord_a',       'Coordinator A',  'coord.a@example.test',       'coordinator', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'user_test_trainer_a',     'Trainer A',      'trainer.a@example.test',     'trainer',     true),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'user_test_viewer_a',      'Viewer A',       'viewer.a@example.test',      'viewer',      true),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'user_test_viewer_b',      'Viewer B',       'viewer.b@example.test',      'viewer',      true),
  ('dddddddd-0000-4000-8000-000000000001', 'user_test_dual',          'Dual AB',        'dual.ab@example.test',       'coordinator', true),
  ('eeeeeeee-0000-4000-8000-000000000001', 'user_test_platform',      'Platform Admin', 'platform@example.test',      'viewer',      true),
  ('eeeeeeee-0000-4000-8000-000000000002', 'user_test_platform_2',    'Platform Two',   'platform2@example.test',     'viewer',      true),
  ('ffffffff-0000-4000-8000-000000000001', 'user_test_unassigned',    'Unassigned',     'unassigned@example.test',    'viewer',      true),
  ('ffffffff-0000-4000-8000-000000000002', 'user_test_inactive',      'Inactive',       'inactive@example.test',      'viewer',      false);

insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', true),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000002', true),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000003', true),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000004', true),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-0000-4000-8000-000000000001', true),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-0000-4000-8000-000000000002', true),
  ('11111111-1111-4111-8111-111111111111', 'dddddddd-0000-4000-8000-000000000001', true),
  ('22222222-2222-4222-8222-222222222222', 'dddddddd-0000-4000-8000-000000000001', false);

insert into public.platform_admins (profile_id) values
  ('eeeeeeee-0000-4000-8000-000000000001'),
  ('eeeeeeee-0000-4000-8000-000000000002');

-- Snapshot of the fixture state. Every denied statement must leave the
-- profiles and memberships tables exactly as they were.
create temp table snap_profiles as select * from public.profiles;
create temp table snap_memberships as select * from public.profile_tenant_memberships;

-- Short names for the test bodies.
\set tA   '''11111111-1111-4111-8111-111111111111'''
\set tB   '''22222222-2222-4222-8222-222222222222'''
\set tE   '''33333333-3333-4333-8333-333333333333'''
\set pAdminA   '''aaaaaaaa-0000-4000-8000-000000000001'''
\set pCoordA   '''aaaaaaaa-0000-4000-8000-000000000002'''
\set pTrainerA '''aaaaaaaa-0000-4000-8000-000000000003'''
\set pViewerA  '''aaaaaaaa-0000-4000-8000-000000000004'''
\set pAdminB   '''bbbbbbbb-0000-4000-8000-000000000001'''
\set pViewerB  '''bbbbbbbb-0000-4000-8000-000000000002'''
\set pDual     '''dddddddd-0000-4000-8000-000000000001'''
\set pPlat     '''eeeeeeee-0000-4000-8000-000000000001'''
\set pPlat2    '''eeeeeeee-0000-4000-8000-000000000002'''
\set pUnassigned '''ffffffff-0000-4000-8000-000000000001'''
\set pInactive '''ffffffff-0000-4000-8000-000000000002'''

-- ===========================================================================
-- A. What admin A can SEE (F-01: read side)
-- ===========================================================================
select pg_temp.sees_exactly('admin A: own school, dual-school person and the unassigned pool only',
  'user_test_admin_a', array[
    :pAdminA, :pCoordA, :pTrainerA, :pViewerA, :pDual, :pUnassigned]::uuid[]);
select pg_temp.sees_exactly('admin B: own school, dual-school person only (no school A-only people, no pool of platform admins)',
  'user_test_admin_b', array[:pAdminB, :pViewerB, :pDual, :pUnassigned]::uuid[]);
select pg_temp.deny_zero('admin A cannot see admin B',
  'user_test_admin_a', format('select 1 from public.profiles where id = %L', 'bbbbbbbb-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('admin A cannot see a school-B-only profile',
  'user_test_admin_a', format('select 1 from public.profiles where id = %L', 'bbbbbbbb-0000-4000-8000-000000000002'));
select pg_temp.deny_zero('admin A cannot see the platform admin profile',
  'user_test_admin_a', format('select 1 from public.profiles where id = %L', 'eeeeeeee-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('admin A cannot see a second platform admin profile',
  'user_test_admin_a', format('select 1 from public.profiles where id = %L', 'eeeeeeee-0000-4000-8000-000000000002'));
select pg_temp.allow('admin A can see a truly unassigned active user',
  'user_test_admin_a', format('select 1 from public.profiles where id = %L', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('admin A cannot see an unassigned INACTIVE user',
  'user_test_admin_a', format('select 1 from public.profiles where id = %L', 'ffffffff-0000-4000-8000-000000000002'));
select pg_temp.allow('admin A can still see the person who is in both schools (shares school A)',
  'user_test_admin_a', format('select 1 from public.profiles where id = %L', 'dddddddd-0000-4000-8000-000000000001'));

-- ===========================================================================
-- B. What admin A can CHANGE on profiles (F-01: write side)
-- ===========================================================================
select pg_temp.deny_zero('admin A cannot update role on a school-B-only profile',
  'user_test_admin_a', format('update public.profiles set role = %L where id = %L', 'admin', 'bbbbbbbb-0000-4000-8000-000000000002'));
select pg_temp.deny_zero('admin A cannot update is_active on a school-B-only profile',
  'user_test_admin_a', format('update public.profiles set is_active = false where id = %L', 'bbbbbbbb-0000-4000-8000-000000000002'));
select pg_temp.deny_zero('admin A cannot update full_name on a school-B-only profile',
  'user_test_admin_a', format('update public.profiles set full_name = %L where id = %L', 'Renamed', 'bbbbbbbb-0000-4000-8000-000000000002'));
select pg_temp.deny_zero('admin A cannot update admin B',
  'user_test_admin_a', format('update public.profiles set role = %L where id = %L', 'viewer', 'bbbbbbbb-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('admin B cannot update admin A',
  'user_test_admin_b', format('update public.profiles set role = %L where id = %L', 'viewer', 'aaaaaaaa-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('admin A cannot update the platform admin role',
  'user_test_admin_a', format('update public.profiles set role = %L where id = %L', 'admin', 'eeeeeeee-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('admin A cannot deactivate the platform admin',
  'user_test_admin_a', format('update public.profiles set is_active = false where id = %L', 'eeeeeeee-0000-4000-8000-000000000001'));
select pg_temp.deny_perm('admin A cannot update clerk_user_id on the platform admin',
  'user_test_admin_a', format('update public.profiles set clerk_user_id = %L where id = %L', 'user_test_attacker', 'eeeeeeee-0000-4000-8000-000000000001'));
select pg_temp.deny_perm('admin A cannot update clerk_user_id on a school-B-only profile',
  'user_test_admin_a', format('update public.profiles set clerk_user_id = %L where id = %L', 'user_test_attacker', 'bbbbbbbb-0000-4000-8000-000000000002'));
select pg_temp.deny_perm('admin A cannot update clerk_user_id on their OWN profile',
  'user_test_admin_a', format('update public.profiles set clerk_user_id = %L where id = %L', 'user_test_attacker', 'aaaaaaaa-0000-4000-8000-000000000001'));
select pg_temp.deny_perm('admin A cannot update clerk_user_id on a same-school profile',
  'user_test_admin_a', format('update public.profiles set clerk_user_id = %L where id = %L', 'user_test_attacker', 'aaaaaaaa-0000-4000-8000-000000000002'));
select pg_temp.deny_perm('admin A cannot update clerk_user_id on an unassigned profile',
  'user_test_admin_a', format('update public.profiles set clerk_user_id = %L where id = %L', 'user_test_attacker', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.deny_perm('admin A cannot update email on their OWN profile',
  'user_test_admin_a', format('update public.profiles set email = %L where id = %L', 'x@example.test', 'aaaaaaaa-0000-4000-8000-000000000001'));
select pg_temp.deny_perm('admin A cannot update email on a same-school profile',
  'user_test_admin_a', format('update public.profiles set email = %L where id = %L', 'x@example.test', 'aaaaaaaa-0000-4000-8000-000000000002'));
select pg_temp.deny_perm('admin A cannot update email on an unassigned profile',
  'user_test_admin_a', format('update public.profiles set email = %L where id = %L', 'x@example.test', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.deny_perm('admin A cannot update id on any profile',
  'user_test_admin_a', format('update public.profiles set id = gen_random_uuid() where id = %L', 'aaaaaaaa-0000-4000-8000-000000000002'));
select pg_temp.deny_zero('admin A cannot change the role of the person who is in both A and B',
  'user_test_admin_a', format('update public.profiles set role = %L where id = %L', 'admin', 'dddddddd-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('admin A cannot change is_active of the person who is in both A and B',
  'user_test_admin_a', format('update public.profiles set is_active = false where id = %L', 'dddddddd-0000-4000-8000-000000000001'));
select pg_temp.allow('admin A can set the role and name of a truly unassigned user (setTargetRole)',
  'user_test_admin_a', format('update public.profiles set role = %L, full_name = %L where id = %L returning id',
    'coordinator', 'Unassigned Person', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('admin A cannot update an unassigned INACTIVE user',
  'user_test_admin_a', format('update public.profiles set role = %L where id = %L', 'admin', 'ffffffff-0000-4000-8000-000000000002'));
select pg_temp.allow('admin A can still set the role of a same-school-only person (regression)',
  'user_test_admin_a', format('update public.profiles set role = %L where id = %L returning id', 'viewer', 'aaaaaaaa-0000-4000-8000-000000000002'));
select pg_temp.allow('admin A can still update their own full_name (documented: self-edit is kept)',
  'user_test_admin_a', format('update public.profiles set full_name = %L where id = %L', 'Admin A Renamed', 'aaaaaaaa-0000-4000-8000-000000000001'));

-- ===========================================================================
-- C. Adding people to a school (F-02)
-- ===========================================================================
select pg_temp.allow('admin A can add a truly unassigned active user to school A (is_default = false, what the app wrote before)',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '11111111-1111-4111-8111-111111111111', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.allow('admin A can add a truly unassigned active user to school A (is_default = true, first school)',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '11111111-1111-4111-8111-111111111111', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('admin A cannot add a school-B-only member to school A',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-000000000002'));
select pg_temp.deny_rls('admin A cannot add admin B to school A',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('admin A cannot add the dual-school person (already in A and B) to school A',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '11111111-1111-4111-8111-111111111111', 'dddddddd-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('admin A cannot add a school-A member to school B (the school they are missing)',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000002'));
select pg_temp.deny_rls('admin A cannot add an unassigned user to school B (not their school)',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '22222222-2222-4222-8222-222222222222', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('admin A cannot add an inactive unassigned profile to school A',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '11111111-1111-4111-8111-111111111111', 'ffffffff-0000-4000-8000-000000000002'));
select pg_temp.deny_rls('admin A cannot add the platform admin to school A',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '11111111-1111-4111-8111-111111111111', 'eeeeeeee-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('admin A cannot add the platform admin to school A (is_default = true)',
  'user_test_admin_a', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '11111111-1111-4111-8111-111111111111', 'eeeeeeee-0000-4000-8000-000000000001'));
select pg_temp.allow('admin A can still remove a school-A membership (delete policy unchanged)',
  'user_test_admin_a', format('delete from public.profile_tenant_memberships where tenant_id = %L and profile_id = %L',
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000004'));
select pg_temp.deny_zero('admin A cannot remove a school-B membership (delete policy unchanged)',
  'user_test_admin_a', format('delete from public.profile_tenant_memberships where tenant_id = %L and profile_id = %L',
    '22222222-2222-4222-8222-222222222222', 'bbbbbbbb-0000-4000-8000-000000000002'));

-- ===========================================================================
-- D. Other roles can do none of the admin actions
-- ===========================================================================
do $$
declare
  persona text;
begin
  foreach persona in array array['user_test_coord_a', 'user_test_trainer_a', 'user_test_viewer_a'] loop
    perform pg_temp.deny_zero(persona || ' cannot see the unassigned pool',
      persona, format('select 1 from public.profiles where id = %L', 'ffffffff-0000-4000-8000-000000000001'));
    perform pg_temp.deny_zero(persona || ' cannot set the role of an unassigned user',
      persona, format('update public.profiles set role = %L where id = %L', 'admin', 'ffffffff-0000-4000-8000-000000000001'));
    perform pg_temp.deny_zero(persona || ' cannot update a same-school profile',
      persona, format('update public.profiles set role = %L where id = %L', 'viewer', 'aaaaaaaa-0000-4000-8000-000000000004'));
    perform pg_temp.deny_zero(persona || ' cannot update their own role',
      persona, format('update public.profiles set role = %L where id = %L', 'admin',
        (select id from public.profiles where clerk_user_id = persona)));
    perform pg_temp.deny_rls(persona || ' cannot add a member to school A',
      persona, format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
        '11111111-1111-4111-8111-111111111111', 'ffffffff-0000-4000-8000-000000000001'));
    perform pg_temp.deny_zero(persona || ' cannot remove a membership',
      persona, format('delete from public.profile_tenant_memberships where tenant_id = %L and profile_id = %L',
        '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000004'));
  end loop;
end $$;

-- Same-school reads that worked before still work for every role.
select pg_temp.sees_exactly('coordinator A: school A people only',
  'user_test_coord_a', array[:pAdminA, :pCoordA, :pTrainerA, :pViewerA, :pDual]::uuid[]);
select pg_temp.sees_exactly('trainer A: own profile only',
  'user_test_trainer_a', array[:pTrainerA]::uuid[]);
select pg_temp.sees_exactly('viewer A: own profile only',
  'user_test_viewer_a', array[:pViewerA]::uuid[]);

-- ===========================================================================
-- E. Platform admin (ADR-006): same reach as before, minus the new guards
-- ===========================================================================
select pg_temp.allow('platform admin can still read an unassigned active profile',
  'user_test_platform', format('select 1 from public.profiles where id = %L', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.allow('platform admin can still read an unassigned inactive profile (unchanged)',
  'user_test_platform', format('select 1 from public.profiles where id = %L', 'ffffffff-0000-4000-8000-000000000002'));
select pg_temp.deny_zero('platform admin still cannot read a school member profile (unchanged)',
  'user_test_platform', format('select 1 from public.profiles where id = %L', 'bbbbbbbb-0000-4000-8000-000000000002'));
select pg_temp.allow('platform admin can seat an unassigned user as first member of a brand-new empty school',
  'user_test_platform', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '33333333-3333-4333-8333-333333333333', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('platform admin cannot seat themselves',
  'user_test_platform', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '33333333-3333-4333-8333-333333333333', 'eeeeeeee-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('platform admin cannot seat another platform admin',
  'user_test_platform', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '33333333-3333-4333-8333-333333333333', 'eeeeeeee-0000-4000-8000-000000000002'));
select pg_temp.deny_rls('platform admin cannot seat a person who already has a school (admin B) into an empty school',
  'user_test_platform', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '33333333-3333-4333-8333-333333333333', 'bbbbbbbb-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('platform admin cannot seat a person who already has a school (dual-school person) into an empty school',
  'user_test_platform', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '33333333-3333-4333-8333-333333333333', 'dddddddd-0000-4000-8000-000000000001'));
select pg_temp.deny_rls('platform admin cannot seat an inactive person into an empty school',
  'user_test_platform', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '33333333-3333-4333-8333-333333333333', 'ffffffff-0000-4000-8000-000000000002'));
select pg_temp.deny_rls('platform admin cannot seat into a school that already has members (unchanged)',
  'user_test_platform', format('insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '11111111-1111-4111-8111-111111111111', 'ffffffff-0000-4000-8000-000000000001'));
select pg_temp.deny_zero('platform admin cannot edit profiles (unchanged)',
  'user_test_platform', format('update public.profiles set role = %L where id = %L', 'admin', 'ffffffff-0000-4000-8000-000000000001'));

-- ===========================================================================
-- F. One default membership per profile (partial unique index)
-- ===========================================================================
do $$
declare
  r record;
begin
  -- The dual-school person already has a default in school A. A second default
  -- in school C (empty school) must be rejected, even for service_role, which
  -- bypasses RLS: the index is a data rule, not a policy.
  select * into r from pg_temp.run_as('service_role', 'user_test_service', format(
    'insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, true)',
    '33333333-3333-4333-8333-333333333333', 'dddddddd-0000-4000-8000-000000000001'),
    'select pg_temp.state_unchanged()');
  perform pg_temp.check('DENY  a second is_default = true membership for one profile [unique, data unchanged]',
    r.err = '23505' and r.verified is true);
  select * into r from pg_temp.run_as('service_role', 'user_test_service', format(
    'insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values (%L, %L, false)',
    '33333333-3333-4333-8333-333333333333', 'dddddddd-0000-4000-8000-000000000001'));
  perform pg_temp.check('ALLOW a second membership with is_default = false', r.err is null and r.affected = 1);
end $$;

-- ===========================================================================
-- G. service_role paths (Clerk webhook) keep working
-- ===========================================================================
select pg_temp.allow('service_role can still update clerk_user_id (webhook path)',
  'user_test_service', format('update public.profiles set clerk_user_id = %L where id = %L', 'user_test_rebound', 'ffffffff-0000-4000-8000-000000000001'),
  'service_role');
select pg_temp.allow('service_role can still update email and full_name (webhook sync)',
  'user_test_service', format('update public.profiles set email = %L, full_name = %L where id = %L', 'new@example.test', 'New Name', 'ffffffff-0000-4000-8000-000000000001'),
  'service_role');
select pg_temp.allow('service_role can still insert a profile (webhook provisioning)',
  'user_test_service', format('insert into public.profiles (clerk_user_id, email, role) values (%L, %L, %L)', 'user_test_new', 'new.user@example.test', 'viewer'),
  'service_role');
select pg_temp.allow('service_role can still deactivate a profile (user.deleted webhook)',
  'user_test_service', format('update public.profiles set is_active = false where clerk_user_id = %L', 'user_test_unassigned'),
  'service_role');
do $$
declare
  r record;
begin
  select * into r from pg_temp.run_as('service_role', 'user_test_service',
    format('select public.ensure_profile_tenant_membership(%L, %L)', 'ffffffff-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111'),
    format('select exists (select 1 from public.profile_tenant_memberships where profile_id = %L and tenant_id = %L and is_default)',
      'ffffffff-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111'));
  perform pg_temp.check('ALLOW ensure_profile_tenant_membership still seats an unassigned profile with is_default = true',
    r.err is null and r.verified is true);

  select * into r from pg_temp.run_as('service_role', 'user_test_service',
    format('select public.ensure_profile_tenant_membership(%L, %L)', 'aaaaaaaa-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222'),
    format('select not exists (select 1 from public.profile_tenant_memberships where profile_id = %L and tenant_id = %L)',
      'aaaaaaaa-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222'));
  perform pg_temp.check('ALLOW ensure_profile_tenant_membership still does nothing when the profile already has a school',
    r.err is null and r.verified is true);
end $$;
-- The table owner / superuser path (migrations, dashboard SQL) keeps working.
do $$
declare
  n int;
begin
  update public.profiles set clerk_user_id = 'user_test_owner_rebound'
  where id = 'ffffffff-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  perform pg_temp.check('ALLOW table owner / superuser can update clerk_user_id (dashboard SQL, migrations)', n = 1);
end $$;

-- ===========================================================================
-- H. Backstop trigger: works even if a table-wide grant comes back
-- ===========================================================================
do $$
declare
  r record;
  clerk_err text;
  id_err text;
  clerk_msg text;
  id_msg text;
begin
  -- The sub-transaction below is rolled back (it undoes the grant), which also
  -- undoes any row written to `results` inside it, so the outcomes are kept in
  -- variables and recorded after the rollback.
  begin
    -- Simulate a later migration re-running the canonical table-wide grant.
    grant update on public.profiles to authenticated;
    select * into r from pg_temp.run_as('authenticated', 'user_test_admin_a', format(
      'update public.profiles set clerk_user_id = %L where id = %L', 'user_test_attacker', 'aaaaaaaa-0000-4000-8000-000000000002'));
    clerk_err := r.err;
    clerk_msg := r.err_msg;
    select * into r from pg_temp.run_as('authenticated', 'user_test_admin_a', format(
      'update public.profiles set id = gen_random_uuid() where id = %L', 'aaaaaaaa-0000-4000-8000-000000000002'));
    id_err := r.err;
    id_msg := r.err_msg;
    raise exception 'rollback_grant';
  exception when others then
    if sqlerrm <> 'rollback_grant' then raise; end if;
  end;
  perform pg_temp.check('DENY  clerk_user_id change is still blocked if table-wide UPDATE is re-granted (trigger backstop)',
    clerk_err = '42501' and clerk_msg like '%cannot be changed by this role%');
  perform pg_temp.check('DENY  id change is still blocked if table-wide UPDATE is re-granted (trigger backstop)',
    id_err = '42501' and id_msg like '%cannot be changed by this role%');
end $$;

-- ===========================================================================
-- I. Grants
-- ===========================================================================
select pg_temp.check('GRANT  anon holds no privilege on public.profiles',
  not exists (select 1 from information_schema.role_table_grants
              where table_schema = 'public' and table_name = 'profiles' and grantee = 'anon'));
select pg_temp.check('GRANT  authenticated has no table-wide UPDATE on public.profiles',
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'));
select pg_temp.check('GRANT  authenticated can update role, is_active, full_name and nothing else',
  has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'is_active', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'clerk_user_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'));

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
do $$
declare
  total int;
  failed int;
begin
  select count(*), count(*) filter (where not ok) into total, failed from results;
  raise notice '----------------------------------------';
  raise notice 'SUMMARY: % cases, % passed, % failed', total, total - failed, failed;
  if failed > 0 then
    raise exception 'FAIL: % of % cases failed', failed, total;
  end if;
  raise notice 'ALL PASS';
end $$;

rollback;
