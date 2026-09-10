# Migrations

`20260528160300_create_tenant_scoped_schema.sql` is canonical for schema + RLS.
New migrations are additive. After any migration: regenerate
`lib/supabase/database.types.ts`, then update affected mappers and domain types
(RULES.md rule 20).

## The directory listing is not the deployed schema

Supabase records applied migrations in a table keyed on the **version string**
— the numeric prefix of the filename. Two consequences that have already bitten
this repo (#230):

- **Renaming a migration file makes it look unapplied.** The recorded version no
  longer matches any filename, so `db push` tries to run it again against a
  database that already has its objects.
- **Applying SQL by hand records nothing.** The objects exist; the migration
  table does not know. The database ends up *ahead* of its own records, and
  neither the directory nor the migration table can answer "what is deployed?"

A `-- Active: <connection string>` header at the top of a migration is the
marker a SQL editor writes when a buffer is executed against a live connection.
It means that file was probably run by hand.

## Check before you push

Read-only, and permitted under RULES.md rule 36:

```
list_migrations     # recorded versions
list_tables         # tables + rls_enabled
```

`list_tables` row counts are `reltuples` **planner estimates, not counts** — they
have been wrong here by whole orders of magnitude (a table reporting 0 held 16
rows). Never conclude a table is empty from that number; a real `count(*)`
requires `execute_sql`, which rule 36 gates behind explicit permission.

To confirm a specific migration actually landed, check its objects **by name** —
`pg_proc` for functions, `pg_policies` for policies. Do not compare policy
*sets*: several migrations add policies to the same tables, so a set comparison
returns a superset and reads as a match no matter what is missing.

## State as of 2026-09-10 (#230)

Verified by catalog query, not inferred:

| File | Recorded | Objects present |
| --- | --- | --- |
| `20260528160300_create_tenant_scoped_schema` | ✅ | ✅ |
| `20260705070510_add_trainer_credentials` | ✅ | ✅ |
| `20260717054607_migrate_akb_tenant_and_drop_rogue_table` | ✅ | ✅ |
| `20260904120000_add_user_admin_write_policies` | ❌ | ✅ applied by hand |
| `20260906114735_add_school_registry_and_platform_admin` | ✅ | ✅ |
| `20260906120000_ensure_invitation_membership_atomic` | ❌ | ❌ **missing** |

`20260906114735_…` was renamed from `20260906130000_…` by this PR so its
filename matches the version actually recorded. All ten of its policies plus
`app_private.is_platform_admin()` were verified present first.

**Outstanding:** `public.ensure_profile_tenant_membership` does not exist,
though `modules/auth/data/provisioning.ts` calls it. See #230.

Also unaccounted for: `public.tenants` carries a policy
`"Tenants selectable by Clerk user"` that no migration in this directory
defines. It omits the `is_active` check its reviewed counterpart enforces.
