#!/usr/bin/env bash
# Concurrency test for the first-membership trigger in migration
# 20261117120000_harden_profile_and_membership_policies.sql (section 8).
#
# Two admins of different schools add the same unassigned person at the same
# time, each in a transaction held open for a few seconds. Exactly one must
# win. The loser must fail with SQLSTATE 42501.
#
# A single psql session cannot show this race, so this runs two sessions.
#
# Usage: PGHOST=... PGPORT=... PGUSER=... profile_membership_concurrency.test.sh <dbname>
# The database must have every migration applied. It must be a throwaway
# database: the script commits its own rows and deletes them at the end.
# NEVER run it against the hosted Supabase project (RULES.md rule 36).
set -uo pipefail

DB=${1:?usage: $0 <dbname>}
PSQL=(psql -X -q -t -A -d "$DB" -v ON_ERROR_STOP=1)

T_A=11111111-1111-4111-8111-1111111111c1
T_B=22222222-2222-4222-8222-2222222222c2
P_ADMIN_A=aaaaaaaa-0000-4000-8000-0000000000c1
P_ADMIN_B=bbbbbbbb-0000-4000-8000-0000000000c2
P_PERSON=ffffffff-0000-4000-8000-0000000000c3

cleanup() {
  "${PSQL[@]}" <<SQL >/dev/null 2>&1
delete from public.profile_tenant_memberships where tenant_id in ('$T_A', '$T_B');
delete from public.profiles where id in ('$P_ADMIN_A', '$P_ADMIN_B', '$P_PERSON');
delete from public.tenants where id in ('$T_A', '$T_B');
SQL
}
trap cleanup EXIT
cleanup

"${PSQL[@]}" <<SQL || { echo "FAIL: fixture setup"; exit 2; }
insert into public.tenants (id, code, name) values
  ('$T_A', 'CONC_A', 'Concurrency School A'),
  ('$T_B', 'CONC_B', 'Concurrency School B');
insert into public.profiles (id, clerk_user_id, full_name, email, role, is_active) values
  ('$P_ADMIN_A', 'user_conc_admin_a', 'Conc Admin A', 'conc.admin.a@example.test', 'admin', true),
  ('$P_ADMIN_B', 'user_conc_admin_b', 'Conc Admin B', 'conc.admin.b@example.test', 'admin', true),
  ('$P_PERSON',  'user_conc_person',  'Conc Person',  'conc.person@example.test',  'viewer', true);
insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default) values
  ('$T_A', '$P_ADMIN_A', true),
  ('$T_B', '$P_ADMIN_B', true);
SQL

# One session: act as the admin, insert the person into the school, hold the
# transaction open for $3 seconds, then commit.
session() { # <sub> <tenant> <sleep seconds>
  "${PSQL[@]}" -v VERBOSITY=verbose <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', true);
insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default)
  values ('$2', '$P_PERSON', false);
select pg_sleep($3);
commit;
SQL
}

OUT_A=$(mktemp); OUT_B=$(mktemp)
session user_conc_admin_a "$T_A" 3 >"$OUT_A" 2>&1 & PID_A=$!
sleep 1
session user_conc_admin_b "$T_B" 0 >"$OUT_B" 2>&1 & PID_B=$!
wait $PID_A; RC_A=$?
wait $PID_B; RC_B=$?

COUNT=$("${PSQL[@]}" -c "select count(*) from public.profile_tenant_memberships where profile_id = '$P_PERSON'")

echo "session A (school A): exit $RC_A"; sed 's/^/  /' "$OUT_A"
echo "session B (school B): exit $RC_B"; sed 's/^/  /' "$OUT_B"
echo "memberships for the person afterwards: $COUNT"

fails=0
check() { if [ "$2" = ok ]; then echo "PASS: $1"; else echo "FAIL: $1"; fails=$((fails+1)); fi; }

[ "$COUNT" = 1 ] && check "exactly one membership exists" ok || check "exactly one membership exists (found $COUNT)" bad
[ "$RC_A" = 0 ] && check "session A (first) succeeded" ok || check "session A (first) succeeded" bad
# VERBOSITY=verbose prints "ERROR:  <SQLSTATE>: <message>".
if [ "$RC_B" != 0 ] && grep -q 'ERROR:  42501: This person already belongs to a school' "$OUT_B"; then
  check "session B failed with SQLSTATE 42501 and the trigger's message" ok
else
  check "session B failed with SQLSTATE 42501 and the trigger's message" bad
fi
rm -f "$OUT_A" "$OUT_B"
[ "$fails" = 0 ] && echo "ALL PASS" || { echo "FAILED: $fails check(s)"; exit 1; }
