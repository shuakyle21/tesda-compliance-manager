---
type: Reference
title: Schema, Migrations and RLS Reference
description: The database itself — the schema clusters and enum bridge, the migration ledger as the only record of what is deployed and the #230 drift that broke it, the standing hazards that survive, the rule-20 regeneration contract, and the app_private helper chain with its per-table policy map and the ADR-006 registry-only boundary.
tags: [database, schema, migrations, rls, drift, types, adr, reference]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-18T01:01:49.569Z
sources:
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-a201158b72d575d540d15779
    resource: repo://docs/adr/ADR-007-attendance-based-dropout-rule.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-bac9ca9767a57004b7fbd175
    resource: repo://lib/supabase/database.types.ts
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-03656dd9cbbc89345a506c19
    resource: repo://supabase/migrations/20260528160300_create_tenant_scoped_schema.sql
  - id: openwiki-source-bee9a19811f0683a75a227f5
    resource: repo://supabase/migrations/20260705070510_add_trainer_credentials.sql
  - id: openwiki-source-6d151b9adff3e78556c9a327
    resource: repo://supabase/migrations/20260904120000_add_user_admin_write_policies.sql
  - id: openwiki-source-fc8bca54fd802af39662de6c
    resource: repo://supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql
  - id: openwiki-source-13117a840913dd27670d0422
    resource: repo://supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-79c2984b4ebc22667b81e541
    resource: repo://supabase/migrations/20261024071359_adr007_attendance_dropout_rule.sql
  - id: openwiki-source-bde01a456257d0b7caf19920
    resource: repo://supabase/migrations/20261024110000_add_dashboard_operational_fields.sql
  - id: openwiki-source-10f9f8c998debff047489862
    resource: repo://supabase/migrations/20261111120000_add_t2mis_terminal_report_fields.sql
  - id: openwiki-source-acb73c82b90d7c0325351e5f
    resource: repo://supabase/migrations/README.md
  - id: openwiki-source-4614a1f5d04b7b7127b1eefd
    resource: repo://supabase/seed.sql
  - id: openwiki-source-2020074c6fdeab02aae020b7
    resource: repo://tests/unit/batches.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T01:01:49.569Z" }
---

# Schema, Migrations and RLS Reference

<!-- openwiki: broken internal link [/openwiki/architecture/tenant-isolation-and-rls.md] file "/openwiki/architecture/tenant-isolation-and-rls.md" does not exist. Fix the href or restore the target, then delete this comment. -->
The database is the security boundary (RULES.md rule 1) and, at the same time, the least observable part of this repository: there is one hosted Supabase project and no staging, so nothing can be measured without permission (RULES.md rule 36, `[deny]`). Everything below is therefore a reference to *checked-in* mechanism — what each migration creates, what the records say landed, and which invariants make a change safe — not a measurement of a live database. The runtime half of the model (how a Clerk token becomes an RLS-visible identity) lives on [/openwiki/architecture/tenant-isolation-and-rls.md](/openwiki/architecture/tenant-isolation-and-rls.md); the apply procedure lives on [/openwiki/operations/supabase-and-migrations.md](/openwiki/operations/supabase-and-migrations.md).

## The schema clusters

The base migration is canonical and additive history stacks on top of it. Reach for this map to know *which file* owns a table before changing it — never for a column list.

| Cluster | Tables | Owning file | Notes |
| --- | --- | --- | --- |
| Tenancy and identity | `tenants`, `profiles`, `profile_tenant_memberships` | `20260528160300` | Tenant membership is the root of every tenant policy |
| Reference data (tenant-less) | `scholarship_programs`, `program_document_requirements`, `program_billing_rules` | `20260528160300` | Readable by any authenticated user (`is_active` / `true`), writable admin+coordinator only |
| Compliance core | `batches`, `learners`, `documents`, `lamr_*` (4), `activity_log` | `20260528160300` | RLS is keyed on the *batch*, via `can_read_batch` / `can_trainer_write_batch` |
| Trainer credentials | `trainer_credentials` | `20260705070510` | Keyed on `profile_id`, not on a batch |
| School registry (ADR-006) | `platform_admins`, `qualifications`, `tenant_qualifications` | `20260906114735` | The platform admin's whole reach; see [the registry-only boundary](#adr-006-the-registry-only-boundary) |
| Billing domain (ADR-001) | `attendance_records`, `batch_trainer_assignments`, `billing_records`, `tenant_settings`, `program_modules`, `scholarship_cost_schedule`, `learner_identities` | `20260910120000` | `billing_type` is the eighth enum; `learner_identities` is a policy-less seam |
| T2MIS export (TES-49) | `learner_details` | `20261111120000` | One-to-one on `learner_id`, split off `learners` so RLS can filter *tables* rather than columns |

**Eight public enums, seven of them in the base file and `billing_type` in `20260910120000`.** Only `profile_role` is a role vocabulary; the rest are display/state vocabularies the mapper bridges. Rule 18 makes that bridge a *total* map (`DB_TO_UI_STAGE` in the batches mapper), so a new enum variant, or a new enum, fails compilation until its UI treatment is chosen — the schema can widen, the app cannot drift silently. The `Enums` block of `database.types.ts` is where an enum arrives in the app, and it is hand-maintained: `billing_type` is *absent* from it today, so nothing type-checks against the billing enum until the file is regenerated (see [the regeneration contract](#the-rule-20-regeneration-contract)).

Tenant ownership is structural, not only policy-level: every tenant-scoped table carries `tenant_id`, and composite natural keys keep a child from naming another school's parent — `batches` unique on `(tenant_id, batch_code)`, `learners` on `(tenant_id, batch_id, learner_no)` plus `(tenant_id, batch_id, uli)` from `20261111120000`, and `learner_details`' `(learner_id, tenant_id)` FK into `learners`. The `batches` → `tenant_qualifications` link goes further and includes `tenant_id` in the foreign key, so a batch can only join a registry row of its own school.

## The migration ledger

Supabase records an applied migration in a table keyed on the **version string** — the numeric prefix of the filename. That one fact produces every failure mode on this page, and it is why `supabase/migrations/README.md` is a record rather than documentation:

- **Renaming a recorded file makes it look unapplied.** The recorded version matches no filename, so `db push` re-runs a file whose objects already exist and dies on `create table`.
- **Hand-applied SQL records nothing.** The objects exist and the ledger does not know, so the database is *ahead* of its own records and neither the directory nor the migration table can answer "what is deployed?".
- **Editing a recorded file changes the repository and never the database.** This is why ADR-007 ships as a new additive migration instead of an edit to `20260910120000`, where its columns were introduced, and why the base file stays canonical: superseded columns are dropped by a later file rather than rewritten in place.
- **`apply_migration` assigns its own version.** ADR-007's file had been written as `20261024063000` and was recorded as `20261024071359`; it was renamed to the recorded version. Check the version the tool recorded before doing anything else with the file.

That combination is the **#230 drift**, and the ledger records both directions of it. Rows 5 (admin write policies) and 8 (the billing domain) were applied by hand and *repair-recorded* after their objects were verified live; row 6 was genuinely behind and was then applied through a transactional migration. A `-- Active: <connection string>` header marks a file a SQL editor probably ran by hand — a belief, not a record. `Recorded ✅` means an operator checked on that date, nothing stronger: row 10 was applied in pieces, its remaining objects recreated idempotently, and its version `insert`ed into `supabase_migrations.schema_migrations` by hand, so its header and its ledger row agree only because the ledger was amended to the database first.

Consequences worth internalising before touching a file:

- **Read the ledger's dated blocks, not the directory.** Filenames encode intent and order; only the ledger encodes what someone checked. The last block is 2026-11-11, so anything newer lives in file headers and the git log.
- **Check objects by name, never policy *sets*.** `pg_proc` for functions, `pg_policies` for policies — several migrations add policies to the same tables, so a set comparison returns a superset and reads as a match whatever is missing.
- **`list_tables` row counts are `reltuples` planner estimates.** They have been wrong by orders of magnitude here; a real count needs `execute_sql`, which rule 36 gates.
- **A file written against live drift is not re-runnable.** `20261111120000` uses bare `add constraint` and `create table`, so it can be neither replayed nor `db push`ed again; its `learners_tenant_batch_uli_key` has no dedup, so a duplicate ULI in one batch fails the whole file (the dedup query it wants kept is in its comment).
- **Seeds are not migrations.** `supabase/seed.sql` is a stub, and `supabase/seeds/` holds hand-run fixtures that hardcode Clerk IDs — a Clerk development instance and a production one issue *different* IDs for the same person, so those rows would be dead identities in `profiles` ([ADR-005](/docs/adr/ADR-005-demo-account-tenant-scoping.md)).

## Two standing hazards

Both are live right now and both are read from the ledger, not inferred.

1. **`20261024110000_add_dashboard_operational_fields` is NOT APPLIED as a record** — while its `batches.billing_deadline` column *is* live. The version is unrecorded, the rest of the file (the column comment, the partial index `batches_tenant_billing_deadline_idx`) was "partly checked" and never confirmed, and its header still says "NOT APPLIED — RULES.md rule 36 requires explicit permission". This is an applied *column* with an unapplied *file*, and the difference is exactly what a `db push` acts on: it would re-run the file. Verify the objects by name and record the version first. Until then `database.types.ts` carries the column, [`batches.ts`](/modules/batches/data/batches.ts) reads `row.billing_deadline ?? null` (a bare read yields `undefined`, not `null`, on a database without the column), and [`tests/unit/batches.test.ts`](/tests/unit/batches.test.ts#L224-L231) pins the absent-column case to "not recorded". ADR-008 is **Proposed**, which is why the file is not simply applied.
2. **`public.tenants` carries a policy "Tenants selectable by Clerk user" that no migration defines.** It omits the `is_active` check its reviewed counterpart enforces, so it widens tenant visibility for deactivated profiles. The `tenants` row of the [policy map](#per-table-policy-map) therefore describes checked-in intent, not every policy currently enforcing it.

## The rule 20 regeneration contract

Rule 20 fixes the order: **migrate → regenerate `lib/supabase/database.types.ts` → update affected mappers and domain types.** It is `[review]`-enforced, and it is admitted to exactly one importer: `eslint.config.mjs` restricts the file to module `data/` layers, so `app/`, `shared/`, `modules/*/ui` and `modules/*/domain` must consume domain types instead.

The clause that matters most is the one people skip: **regenerate only against a database that already holds every object the file describes**, because generator output is a snapshot of one database, never a target. The file has never been regenerated — it is hand-maintained, and its header says so — and it is wrong in *both* directions:

- **Ahead of its records:** `billing_deadline`, and the whole T2MIS block, which its header says was checked field-by-field against `generate_typescript_types` *after* the 2026-11-11 apply.
- **Behind its records:** no `attendance_records.excused`, no `max_absence_percent` on either table, no assessment-result and several `batches` columns, only 19 of the 26 tables, and seven of the eight enums.

| Enum in `database.types.ts` | In the schema too |
| --- | --- |
| `profile_role`, `lifecycle_stage`, `batch_status`, `document_status`, `document_audience`, `assessment_result`, `activity_action` | all seven |
| — | `billing_type` |

So "the type file lists it" answers *what the code expects* and never *what the database has*; two questions, neither implying the other. The gap stays survivable because the file is describe-only and the mappers are the boundary: a column it omits still arrives through `select('*')`, whereas one it carries and the database lacks type-checks and then fails at runtime.

**Migration SQL with no ledger row is the unreproducible case.** A hand-applied statement recorded by hand as `Recorded ✅ / Objects ✅` looks applied, but nothing in the repository reproduces it on a fresh `db reset` or in CI. Row 10 is the shape: its policies, trigger, grant and indexes were created by hand through the SQL editor, and only the version insert makes the ledger stop lying. Concretely, the checked-in history now carries **three** objects that a rebuild-from-migrations would need and the migrations do not supply — `batches.billing_deadline` (`20261024110000` unrecorded), the `tenants` policy above, and the whole `tenants.select` widening it implies.

Two further properties of the type file are load-bearing and easy to lose in a regeneration: `create_school`'s nullable text parameters are typed `string | null` (the generator emits plain `string`), and every table's `Relationships` is stubbed `[]` — the stub is why supabase-js cannot infer embedded joins and why four `as unknown as` casts exist at the data layer. A read of the enums also shows `as unknown as` casts survive type changes ([`batches.ts`](/modules/batches/data/batches.ts#L349), [`learners.ts`](/modules/batches/data/learners.ts#L250)); a regeneration fixes shapes, not those casts.

## The `app_private` helper chain

Rule 1 reads literally: the decision is made by `app_private.*`, not by a `role` string the application compares. The chain is `current_clerk_user_id()` → `current_profile_id()` → `current_role()` / `can_access_tenant()` → `can_manage_tenant()` / `can_read_batch()` / `can_trainer_write_batch()`, all `security definer` with `search_path = ''` so a caller-controlled search path cannot shadow them, and all reading `profiles.is_active` so a deactivation drops access at the next request.

| Helper | Shape | Failure mode it encodes |
| --- | --- | --- |
| `current_clerk_user_id()` | `coalesce(nullif(auth.jwt() ->> 'sub', ''), …two Clerk fallbacks)` | Only the session's `sub`; no JWT claim can widen access |
| `current_profile_id()` | `profiles.id` where `clerk_user_id` matches **and** `is_active` | A deactivated or unknown identity resolves to `null`, so every downstream `exists` is false |
| `current_role()` | `profiles.role` for that id | The role comes from the row, never from Clerk metadata (compare `resolveTrustedRole`) |
| `can_access_tenant(t)` | membership row **and** `p.is_active` | The tenant gate everything else composes with |
| `can_manage_tenant(t)` | `current_role() in ('admin','coordinator')` and `can_access_tenant` | Viewer can never write |
| `can_read_batch(b)` | batch's tenant accessible, and the caller is office-role **or** that batch's trainer | A trainer is narrowed to their own batches |
| `can_trainer_write_batch(b)` | the batch's trainer, `role = 'trainer'`, tenant accessible | Redefined wider in `20260910120000`; do not assume one definition |
| `is_platform_admin()` | `platform_admins` row **and** `p.is_active` | Deliberately the only way to learn the membership |

`platform_admins` is the one table with RLS enabled and **deliberately no policy**. Grants cannot express the deny — Supabase's default privileges give `authenticated` all four verbs the moment a table is created — so the deny comes entirely from RLS-with-no-policies, and the linter's `rls_enabled_no_policy` INFO is the design rather than a defect. `public.current_user_is_platform_admin()` (a boolean about the caller only) is the read path; `create_school` is `security invoker` on purpose so a caller who is not a platform admin gets a policy violation rather than a granted privilege. `ensure_profile_tenant_membership` is the single function granted to `service_role` only, because the Clerk webhook has no session.

## Per-table policy map

`for all` below means one policy with both `using` and `with check`; every policy is `to authenticated`.

| Table | select | write | Who is in the room |
| --- | --- | --- | --- |
| `tenants` | `can_access(id)`; platform admin sees every row | insert / update `is_platform_admin()` | The attack surface is the `with check`: `can_access` resolves purely from memberships |
| `profiles` | self, same-tenant for admin/coordinator, admin on *unassigned*, platform admin on *unassigned* | update by an admin of a visible profile | The only profile writes in the history |
| `profile_tenant_memberships` | `can_access`; platform admin every row | insert by tenant admin with `can_access`, delete by tenant admin; insert by platform admin for **first members**, not themselves | Missing memberships = invisible profile |
| `scholarship_programs`, `program_document_requirements`, `program_billing_rules` | any authenticated user (`is_active` / `true`) | `for all` — `current_role() in ('admin','coordinator')` | Tenant-less reference data |
| `qualifications` | `is_active = true` | `for all` — `is_platform_admin()` | Registry |
| `tenant_qualifications` | `can_access` **or** `is_platform_admin()` | `for all` — `is_platform_admin()` | Registry; school-admin writes are the named follow-up (ADR-006 P7) |
| `batches` | `can_read(id)` | insert / update / delete `can_manage(tenant_id)` | Trainers read, never write |
| `learners` | `can_read(batch_id)` | `for all` — `can_manage(tenant_id)` | `learner_details` is the fields trainers must not see |
| `learner_details` | `current_role() in ('admin','coordinator','viewer')` and `can_access(tenant_id)` | `for all` — `can_manage(tenant_id)` | **Trainers deliberately absent** |
| `documents` | `can_manage` or viewer+`can_access`, or `trainer_write(batch_id)` with `audience in ('trainer','all')` | admin/coordinator `for all`; trainer insert, and update only on own `submitted_by` | Audience gates trainers |
| `lamr_reports` | `can_read(batch_id)` | `for all` — `can_manage(tenant_id)` or `trainer_write(batch_id)` | |
| `lamr_outcomes`, `lamr_activities`, `lamr_entries` | `can_read` via the parent report | same pair via the parent report | `lamr_outcomes` `with check` also pins `r.tenant_id = lamr_outcomes.tenant_id` |
| `activity_log` | `can_access(tenant_id)` | insert `can_access(tenant_id)` | Append-only, writable by viewer by design |
| `trainer_credentials` | self, or same-tenant admin/coordinator | `for all` — own profile **and** `role = 'trainer'` | |
| `attendance_records` | `can_read(batch_id)` | insert / update `trainer_write(batch_id)` or `can_manage(tenant_id)`; delete `can_manage` only | Mutable in place even post-billing; a trainer corrects, never deletes |
| `batch_trainer_assignments` | `can_access` | `for all` — `can_manage` | |
| `billing_records` | `can_access` **and** `current_role() in ('admin','coordinator','viewer')` | insert `can_manage` | No update/delete policy at all — that absence *is* the append-only log |
| `tenant_settings` | `can_access` | `for all` — `can_manage` | |
| `program_modules` | `is_active = true` | `for all` — admin/coordinator | |
| `scholarship_cost_schedule` | `true` | `for all` — admin/coordinator | |
| `learner_identities` | none, no grant | none | Enabled and untouched; opening it is a deliberate act |
| `platform_admins` | none | none | The self-grant deny |
| `storage.objects` | `compliance-evidence` by `(foldername(name))[1]` | select/insert/update `can_access`, delete `can_manage` | Folder segment is the tenant id; readers everywhere use the `select` policy |

Read four cells before writing a query: `billing_records` has no update or delete policy, `learner_details` excludes trainers, `activity_log` admits viewer on `insert`, and `trainer_credentials`' `for all` is self-only. No policy is written `to anon` at all, so an unauthenticated query returns zero rows silently rather than erroring.

The `profiles.role` join is the axis the whole map hangs on: `can_manage_tenant` is `role in ('admin','coordinator')`, `can_read_batch` is office-role-or-assigned-trainer, and `billing_records` spells three roles out by name so a fifth enum value needs a decision there instead of inheriting one. Viewer consequently appears in select policies only, and its read-only-ness is the absence of a write policy — not a UI condition.

## ADR-006: the registry-only boundary

Platform admin is an axis, not a bigger role: ADR-006 P2 puts it in a table rather than in `profile_role`, because every base policy switches on `current_role()` and adding an enum value would re-open all of them. P3 confines its reach to `tenants`, `qualifications`, `tenant_qualifications`, unassigned `profiles` and seating a tenant's *first* member; `grep is_platform_admin` over the migrations should match only those. **Widening it onto a compliance table (`batches`, `learners`, `documents`, `lamr_*`, `activity_log`), or letting a platform admin seat itself into a tenant, is a boundary change needing its own ADR** — RULES.md rule 30.

The seat-a-first-member policy is where P3 is won or lost, and its predicates are not interchangeable. `with check (is_platform_admin())` alone constrains the actor, not the row; since `can_access` resolves purely from memberships, an operator who could insert an arbitrary `(tenant, own profile_id)` would hand themselves every batch, learner, document and LAMR row through one statement. Two predicates stop it: `profile_id <> current_profile_id()` and *the tenant has no members yet*. The second is racy under concurrent inserts and tolerable only because the first holds regardless. Both must stay — a reader verifying P3 confirms both, not the policy's existence.

The second predicate also has a hidden dependency: its subquery reads `profile_tenant_memberships`, so it is itself filtered by that table's `select` policies. "Platform admins can read tenant memberships" is what shows the caller every row; narrowing it would make an occupied tenant read as empty and silently weaken the insert. The composite `batches` → `tenant_qualifications` FK from `20261111120000` is the same boundary from the other side: `on delete restrict` means a platform admin's registry delete can never rewrite a compliance row, it just refuses while one is in use.
