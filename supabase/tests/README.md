# Database tests

`profile_membership_hardening.test.sql` covers migration
`20261117120000_harden_profile_and_membership_policies.sql` (security
remediation item 1.1, findings F-01 and F-02). It is plain SQL, not pgTAP:
one `PASS:` or `FAIL:` notice per case, a summary, and a non-zero exit when
any case fails. It runs in a transaction that is rolled back.

Each case does what PostgREST does: sets `request.jwt.claims` to a persona's
`sub` and runs `set local role authenticated` (or `service_role`), so the real
policies and column privileges apply. Personas use fake values
(`user_test_admin_a`, `admin.a@example.test`).

**Never run these against the hosted Supabase project** (RULES.md rule 36).

## Local Supabase stack

```
supabase start
supabase db reset        # LOCAL stack only: applies supabase/migrations/ in order
psql "$(supabase status -o env | grep ^DB_URL | cut -d= -f2- | tr -d '"')" \
  -q -o /dev/null -v ON_ERROR_STOP=1 \
  -f supabase/tests/profile_membership_hardening.test.sql
```

## Plain Postgres 16 (what the migration was developed against)

1. Create a cluster and a database. Create roles `anon`, `authenticated`
   (both `nologin`), and `service_role` (`nologin bypassrls`).
2. Before the migrations, create what Supabase provides:
   - schemas `extensions`, `auth`, `storage`;
   - `auth.jwt()` returning
     `coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb`,
     plus `auth.uid()` and `auth.role()`;
   - `storage.buckets`, `storage.objects` (RLS enabled) and
     `storage.foldername(text)` (`string_to_array(name, '/')`);
   - Supabase's default privileges (one object class per statement):
     `alter default privileges in schema public grant all on tables to anon, authenticated, service_role;`
     `alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`
     `alter default privileges in schema public grant all on functions to anon, authenticated, service_role;`
3. Apply every file in `supabase/migrations/` in filename order, stopping on
   the first error. Apply the hardening migration with `psql -1`.
4. Run the test file as a superuser:
   `psql -q -o /dev/null -v ON_ERROR_STOP=1 -d <db> -f supabase/tests/profile_membership_hardening.test.sql`

To prove the tests detect the vulnerability, run the same file against a
database built WITHOUT `20261117120000`: the security cases must fail.

## Concurrency test (first-membership trigger)

`profile_membership_concurrency.test.sh` covers section 8 of the migration:
two admins of different schools adding the same unassigned person at the same
moment. One psql session cannot show that race, so the script opens two
and controls their order without timing guesses: session A inserts and then
waits on a gate (an advisory lock a third session holds), the script starts
session B and waits until B is seen blocked on A's lock, then opens the gate.
Each wait gives up after 10 seconds with a clear FAIL. It then checks that exactly one membership exists and that session B
failed with SQLSTATE 42501.

```
PGHOST=<socket dir or host> PGPORT=<port> PGUSER=<superuser> \
  supabase/tests/profile_membership_concurrency.test.sh <dbname>
```

The database needs every migration applied, including `20261117120000`. It
must be throwaway: the script commits its own fixture rows (tenants `CONC_A`,
`CONC_B` and three `*.example.test` profiles) and deletes them on exit. It
exits non-zero on failure. To see it detect the problem, drop the trigger
first (`drop trigger profile_tenant_memberships_serialize_first on
public.profile_tenant_memberships;`): both inserts succeed and it reports two
memberships.
