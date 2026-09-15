# Seeds

**Nothing in this directory runs automatically.** These are scripts you execute
deliberately, by hand, against a database you have chosen.

`supabase/config.toml` `[db.seed]` points at `../seed.sql`, which is an
intentional placeholder — it exists only so `supabase db reset` has a valid
configured path. It is deliberately *not* a glob over this directory: these
files are ad-hoc dev and verification scripts, not idempotent seed data, and
auto-running them on every reset would be wrong.

Real reference data (tenants, TWSP/CFSP programs, the document-requirement
catalog, billing rules, the storage bucket) is seeded idempotently by
`../migrations/20260528160300_create_tenant_scoped_schema.sql`, which is where
it belongs.

## Contents

| File | What it is |
| --- | --- |
| `20260831120000_seed_dev_operational_data.sql` | Dev fixture: batches, learners, documents. Derived from the retired `shared/mocks/seed.ts`. |
| `dev_profile_memberships.sql` | Dev helper for profile/tenant memberships. |
| `verify_user_admin_setup.sql` | Verification script for the create-user screen (PR #213). Not a seed. |

## Why the dev fixture moved here (#230)

`20260831120000_seed_dev_operational_data.sql` used to live in `migrations/`.
Its own header calls it *"a DEV fixture, not real data"*. As a migration,
tooling treats it as something to apply to every database — including the one
hosted project, which holds real tenant data and has no staging counterpart.

It appears to have already reached that project: `batches`, `learners` and
`documents` hold rows no other migration creates. Moving the file does not undo
that — **the rows are still there** — it only stops a future `db push` from
doing it again, and makes the file's absence from the applied list read as
correct rather than as drift.

Deciding what to do about the fixture rows already in the hosted project is
tracked on #230.

## Running one

These are plain SQL. Run them the way you would any statement against this
project — and note RULES.md rule 36: an agent must not execute them against the
live project without explicit permission.
