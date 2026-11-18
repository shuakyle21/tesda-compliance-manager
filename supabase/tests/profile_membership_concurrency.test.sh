#!/usr/bin/env bash
# Concurrency test for the first-membership trigger in migration
# 20261117120000_harden_profile_and_membership_policies.sql (section 8).
#
# Two admins of different schools add the same unassigned person at the same
# time. The script holds session A's transaction open with a gate and only
# releases it once session B is seen waiting on A. Exactly one must win. The loser must fail with SQLSTATE 42501.
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

# Every call the script makes for itself (probes, cleanup, gate release) is
# capped at 5 seconds, so a stuck connection cannot hang the failure path.
QUICK=(timeout 5 "${PSQL[@]}")

cleanup() {
  "${QUICK[@]}" <<SQL >/dev/null 2>&1
select pg_terminate_backend(pid) from pg_stat_activity
  where datname = current_database()
    and application_name in ('conc_gate', 'conc_a', 'conc_b');
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

# One session: act as the admin and insert the person into the school.
# Session A then waits on a gate (an advisory lock held by a third session),
# so its insert stays uncommitted until the script lets it go.
session() { # <sub> <tenant> <app name> <gate: yes|no>
  local gate=""
  [ "$4" = yes ] && gate="select pg_advisory_xact_lock($GATE_KEY);"
  PGAPPNAME=$3 "${PSQL[@]}" -v VERBOSITY=verbose <<SQL
begin isolation level read committed;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', true);
insert into public.profile_tenant_memberships (tenant_id, profile_id, is_default)
  values ('$2', '$P_PERSON', false);
reset role;
$gate
commit;
SQL
}

# Wait until the session named $1 matches the SQL condition $2. Gives up
# after 10 seconds of wall-clock time. A give-up is reported as a TIMEOUT so
# it is not mistaken for a trigger failure.
wait_until_blocked() { # <app name> <condition on pg_stat_activity columns>
  local deadline=$((SECONDS + 10))
  while [ "$SECONDS" -lt "$deadline" ]; do
    n=$("${QUICK[@]}" -c "select count(*) from pg_stat_activity a where a.datname = current_database() and a.application_name = '$1' and $2")
    [ "$n" = 1 ] && return 0
    sleep 0.1
  done
  return 1
}

GATE_KEY=912345
OUT_A=$(mktemp); OUT_B=$(mktemp)
fails=0
check() { if [ "$2" = ok ]; then echo "PASS: $1"; else echo "FAIL: $1"; fails=$((fails+1)); fi; }

# The gate: a session that holds the advisory lock until it is terminated.
PGAPPNAME=conc_gate "${PSQL[@]}" -c "select pg_advisory_lock($GATE_KEY); select pg_sleep(60);" >/dev/null 2>&1 & PID_GATE=$!
wait_until_blocked conc_gate "wait_event = 'PgSleep'" || { echo "TIMEOUT: gate session did not start within 10 s (setup problem, not a trigger result)"; exit 2; }

# A inserts, then parks on the gate with its insert uncommitted.
session user_conc_admin_a "$T_A" conc_a yes >"$OUT_A" 2>&1 & PID_A=$!
wait_until_blocked conc_a "wait_event = 'advisory'" || { echo "TIMEOUT: session A did not reach the gate within 10 s (setup problem, not a trigger result)"; exit 2; }

# B inserts while A is in flight. With the trigger, B must block on the
# person's profile row lock that A holds. "Blocked by A" is checked with
# pg_blocking_pids, not just the wait type, so a lock held by some other
# session cannot pass for it.
session user_conc_admin_b "$T_B" conc_b no >"$OUT_B" 2>&1 & PID_B=$!
BLOCKED_BY_A="wait_event in ('transactionid', 'tuple') and exists (
  select 1 from pg_stat_activity x
  where x.datname = current_database() and x.application_name = 'conc_a'
    and x.pid = any (pg_blocking_pids(a.pid)))"
if wait_until_blocked conc_b "$BLOCKED_BY_A"; then
  check "session B waited on session A's lock" ok
else
  check "session B waited on session A's lock (not seen within 10 s)" bad
fi

# Open the gate: A commits, then B's trigger re-checks and sees A's row.
"${QUICK[@]}" -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = current_database() and application_name = 'conc_gate'" >/dev/null
wait $PID_GATE 2>/dev/null
wait $PID_A; RC_A=$?
wait $PID_B; RC_B=$?

COUNT=$("${PSQL[@]}" -c "select count(*) from public.profile_tenant_memberships where profile_id = '$P_PERSON'")

echo "session A (school A): exit $RC_A"; sed 's/^/  /' "$OUT_A"
echo "session B (school B): exit $RC_B"; sed 's/^/  /' "$OUT_B"
echo "memberships for the person afterwards: $COUNT"

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
