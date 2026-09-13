---
type: "Reference"
title: "Supabase Data Model and RLS Policies"
description: "Reference for the TVI-CAMS Supabase schema: the eight checked-in migrations including 20260910120000 (ADR-001 billing domain: seven new tables, billing_type enum, widened can_trainer_write_batch, append-only billing_records, storage DELETE closure), the issue #230 repo-vs-database drift that supersedes the old applied/pending ledger, the per-table RLS policy map, the ADR-006 school registry and platform-admin boundary, profile provisioning, the database.types.ts regeneration contract, and RULES section 10 agent-conduct guardrails."
tags: ["supabase", "postgres", "row-level-security", "data-model", "migrations", "tenant-isolation", "platform-admin", "billing", "clerk", "nextjs"]
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-09-13T00:29:54.565Z
sources:
  - id: openwiki-source-2d7c3fc74d559a77432d62af
    resource: repo://.claude/hooks/check-mcp-health.sh
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-f5a489e5822d87c0b8fc66ef
    resource: repo://.mcp.json
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
  - id: openwiki-source-6e6cc525e98e274ad6c10b29
    resource: repo://app/(dashboard)/users/new/actions.ts
  - id: openwiki-source-c03196c12ed34c5537bd329f
    resource: repo://app/(dashboard)/users/new/page.tsx
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-6c5e30490a0c4602d7931405
    resource: repo://docs/adr/ADR-001-billing-and-domain-model.md
  - id: openwiki-source-624c50c8276ea1f31b187ca3
    resource: repo://docs/adr/ADR-005-demo-account-tenant-scoping.md
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-0d40866d6dce044e0547eef9
    resource: repo://docs/DATA_MODEL.md
  - id: openwiki-source-f40c5e629f69e6ce0839fdf0
    resource: repo://docs/DEMO_DATA_VALIDATION_PLAN.md
  - id: openwiki-source-9d092323074e1bc2e9e99e75
    resource: repo://docs/SUPABASE_SCHEMA_GUIDE.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-05f002e6c562443eaf0b089a
    resource: repo://lib/supabase/client.ts
  - id: openwiki-source-bac9ca9767a57004b7fbd175
    resource: repo://lib/supabase/database.types.ts
  - id: openwiki-source-e6f02f5d20be6272be761347
    resource: repo://lib/supabase/server.ts
  - id: openwiki-source-4afc6c67d0142492979e14f5
    resource: repo://lib/supabase/service.ts
  - id: openwiki-source-2aff630ed0688d80b1b707c8
    resource: repo://modules/auth/data/provisioning.ts
  - id: openwiki-source-ea48dab7d1c137cf2f1308ae
    resource: repo://modules/auth/domain/invitationMetadata.ts
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-852e1f02d9b416ab767494ac
    resource: repo://modules/billing/domain/rates.ts
  - id: openwiki-source-1609d2ed970a0b6d52bddaeb
    resource: repo://modules/billing/domain/tracks.ts
  - id: openwiki-source-3f1f3f4919f6d868d27df2e3
    resource: repo://modules/tenancy/data/platform.ts
  - id: openwiki-source-2e2d8e1af455c1b26b721663
    resource: repo://modules/tenancy/data/schools.ts
  - id: openwiki-source-5b30b77204ee0533570c731e
    resource: repo://modules/tenancy/data/users.ts
  - id: openwiki-source-e0951a2b3560c90b2bd482f7
    resource: repo://modules/tenancy/README.md
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-d9a6154810528b0710445f92
    resource: repo://shared/types.ts
  - id: openwiki-source-d81538d8891efe37053aeccb
    resource: repo://supabase/config.toml
  - id: openwiki-source-03656dd9cbbc89345a506c19
    resource: repo://supabase/migrations/20260528160300_create_tenant_scoped_schema.sql
  - id: openwiki-source-bee9a19811f0683a75a227f5
    resource: repo://supabase/migrations/20260705070510_add_trainer_credentials.sql
  - id: openwiki-source-76fe323aec348484b7584741
    resource: repo://supabase/migrations/20260717054607_migrate_akb_tenant_and_drop_rogue_table.sql
  - id: openwiki-source-e41155c2222416a1b1c3d84b
    resource: repo://supabase/migrations/20260831120000_seed_dev_operational_data.sql
  - id: openwiki-source-6d151b9adff3e78556c9a327
    resource: repo://supabase/migrations/20260904120000_add_user_admin_write_policies.sql
  - id: openwiki-source-13117a840913dd27670d0422
    resource: repo://supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql
  - id: openwiki-source-67635060d6a4945c43bef066
    resource: repo://supabase/migrations/20260906130000_add_school_registry_and_platform_admin.sql
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-4614a1f5d04b7b7127b1eefd
    resource: repo://supabase/seed.sql
  - id: openwiki-source-ab3c62d5452f5df905bfc01d
    resource: repo://supabase/seeds/dev_profile_memberships.sql
  - id: openwiki-source-ed8b9458b94ac5a0bce68fde
    resource: repo://supabase/seeds/verify_user_admin_setup.sql
  - id: openwiki-source-c25ad52388e27abc8c91b43f
    resource: repo://tests/unit/auth-provisioning.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-13T00:29:54.565Z" }
---


# Supabase Data Model and RLS Policies

This page documents the database: what the schema is, how Postgres row-level security decides every authorization, which migration created what, and the contract that keeps the TypeScript types honest. TVI-CAMS is a single Next.js app talking directly to **one hosted Supabase project (Postgres + Storage)** with Clerk as identity — there is no separate backend and no staging environment; the code side of the chain (Clerk token → anon-key client → RLS) is covered in [Client wiring and the anon-key pattern](#client-wiring-and-the-anon-key-pattern) below.

The checked-in history now spans **eight migrations**; the eighth ([`20260910120000_add_adr001_billing_domain.sql`](/supabase/migrations/20260910120000_add_adr001_billing_domain.sql), ADR-001's billing domain) is **checked in but unapplied** — its own header states it has never been parsed by Postgres. The live schema is still **18 tables and 36 foreign keys**, but the live project's own migration table no longer tells the truth: **issue #230** records that it returns four versions, with the school registry tracked under a different version than its filename and three checked-in migrations untracked. The drift — not the old applied/pending ledger — is the authoritative current status (see [Issue #230: the repo and the database have drifted](#issue-230-the-repo-and-the-database-have-drifted)).

Three ground rules frame everything below:

- **RLS is the security boundary; UI hiding is usability only.** Every authorization decision is made by Postgres RLS through the `app_private.*` helper functions (RULES §1.1, [`RULES.md`](/RULES.md)). A JS-side tenant filter is a bug **even when it returns the right answer** (RULES §1.2) — it signals the query was written assuming no RLS.
- **Supabase holds internal working copies only.** TESDA SIS, T2MIS, and BSRS remain the authoritative systems; nothing in this schema may be presented as official TESDA approval ([`docs/SUPABASE_SCHEMA_GUIDE.md`](/docs/SUPABASE_SCHEMA_GUIDE.md)).
- **Platform admin is a different axis, not a bigger role.** It is not a fifth `profile_role` value and grants nothing inside any tenant — its reach is the school registry only, and widening that is a boundary change needing its own ADR (RULES §7.30, [ADR-006](/docs/adr/ADR-006-platform-admin-and-school-registry.md)).

## Migration history

The checked-in migration history is the only trustworthy description of the schema. [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) is its status ledger, but its version table — last checked against the live project on **2026-09-06** — is now stale in both directions: it tracks only the first seven migrations (**the eighth row has not been added, and the file's own standing rule requires the ledger update in the same PR as the migration** — part of the RULES §3 data-layer workflow, and nothing enforces it automatically), and its applied/pending column is superseded by the #230 verification of 2026-09-10. The ledger below therefore states the live status per #230, not per the file's column:

| # | Version | File | Purpose | Live status (per #230, 2026-09-10) |
|---|---------|------|---------|--------|
| 1 | `20260528160300` | [`create_tenant_scoped_schema.sql`](/supabase/migrations/20260528160300_create_tenant_scoped_schema.sql) | **The canonical migration.** Creates the `app_private` schema, the seven enums, all 14 original tables, indexes, `set_updated_at` triggers, every `app_private.*` RLS helper, RLS enablement, all `public`-table policies, the reference-data seeds (tenants, programs, document catalog, billing rules), and the `compliance-evidence` storage bucket plus its policies. | tracked (in the migration table) |
| 2 | `20260705070510` | [`add_trainer_credentials.sql`](/supabase/migrations/20260705070510_add_trainer_credentials.sql) | Adds `trainer_credentials` (one row per trainer profile) with its trigger, RLS, and two policies. | tracked |
| 3 | `20260717054607` | [`migrate_akb_tenant_and_drop_rogue_table.sql`](/supabase/migrations/20260717054607_migrate_akb_tenant_and_drop_rogue_table.sql) | Corrective migration: reconciles a hand-created rogue `public.tenant` table by copying its one real record (AKB) into the canonical `public.tenants` and dropping the rogue table. | tracked |
| 4 | `20260831120000` | [`seed_dev_operational_data.sql`](/supabase/migrations/20260831120000_seed_dev_operational_data.sql) | Seeds **dev operational data** — five `DEV-`-prefixed batches, placeholder learner rosters, per-batch document rows, and the `documents_batch_id_document_key_key` unique index. Data only, no DDL. | **untracked — data present** (row counts match it exactly); its unique index is of unknown existence |
<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
| 5 | `20260904120000` | [`add_user_admin_write_policies.sql`](/supabase/migrations/20260904120000_add_user_admin_write_policies.sql) | Four admin-only write policies that make [`/users/new`](/app/(dashboard)/users/new/page.tsx) executable. Policies only, no DDL. | **untracked — policies present**, applied by hand |
| 6 | `20260906120000` | [`ensure_invitation_membership_atomic.sql`](/supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql) | `public.ensure_profile_tenant_membership(...)` — the atomic invitation-membership function used by the Clerk webhook. One function, no DDL. | **untracked — the one real gap: the function does not exist** |
| 7 | `20260906130000` | [`add_school_registry_and_platform_admin.sql`](/supabase/migrations/20260906130000_add_school_registry_and_platform_admin.sql) | **ADR-006**: three tables (`qualifications`, `tenant_qualifications`, `platform_admins`), six new `tenants` columns, `app_private.is_platform_admin()`, `public.current_user_is_platform_admin()`, `public.create_school(...)`, the platform-admin policies, and an idempotent six-qualification seed. | **tracked under a different version** — `20260906114735` (double-versioned) |
| 8 | `20260910120000` | [`add_adr001_billing_domain.sql`](/supabase/migrations/20260910120000_add_adr001_billing_domain.sql) | **ADR-001 Phase 0.1**: the `billing_type` enum, seven tables (`program_modules`, `scholarship_cost_schedule`, `learner_identities`, `attendance_records`, `batch_trainer_assignments`, `billing_records`, `tenant_settings`), additive columns on `batches`/`learners`/`program_billing_rules`, indexes and triggers, the widened `can_trainer_write_batch`, the storage DELETE policy, and a cost-schedule seed. Additive: alters no existing column, drops nothing. | **checked in, unapplied** — never parsed by Postgres |

Each row was re-verified against the eight files in `supabase/migrations/`.

### Issue #230: the repo and the database have drifted

The drift recorded in the eighth migration's header (2026-09-10) and in [`docs/DEMO_DATA_VALIDATION_PLAN.md`](/docs/DEMO_DATA_VALIDATION_PLAN.md) §3 is the **authoritative current status**, superseding the old applied/pending framing:

- The live project's migration table returns exactly **four versions**: `20260528160300`, `20260705070510`, `20260717054607`, and `20260906114735` (`add_school_registry_and_platform_admin`).
- Three checked-in migrations are **untracked**: `20260831120000` — yet `batches`/`learners`/`documents` hold row counts (5 / 89 / 40) matching its content exactly, so its data is present while its version is not recorded, and its `documents_batch_id_document_key_key` unique index is of unknown existence; `20260904120000`; and `20260906120000`.
- The school registry is **double-versioned**: recorded under `20260906114735` while its file is named `20260906130000` — the same migration under two versions.
- Verification showed the database is **ahead of its own records, not behind them**: those objects exist, applied by hand.
- **The one real gap is `public.ensure_profile_tenant_membership`, which does not exist even though [`modules/auth/data/provisioning.ts`](/modules/auth/data/provisioning.ts) calls it.**
- Migration 8 is checked in but **unapplied**, and its header directs: reconcile #230 before assuming a clean `db push` — nothing in the file depends on that reconciliation (every table and function it references was verified present), but the push mechanics need sorting out first.

### What the drift means for behaviour

- **`/users/new`'s direct write path is no longer RLS-denied on the live project**: migration 5's four admin policies exist there, applied by hand and untracked. The old ledger's "pending" status for that row is wrong — the screen's database side has landed, the record of it just hasn't.
- **An invitation grant's membership half cannot land on live**: `ensure_profile_tenant_membership` does not exist, so the webhook's `rpc` call fails, the route answers 500, and Clerk retries into the same hole until #230 is reconciled. The profile row itself still lands — the webhook runs on the service-role client, which bypasses RLS.
- **Migration 4's dev rows are present**, so the dashboard and the isolation assertion work on live as the seed intended — with the caveat that any new seed using `on conflict (batch_id, document_key)` may fail, because the unique index that makes that conflict target work is of unknown existence.
- **None of migration 8's objects exist on live** — no billing tables, no `billing_type`, no widened `can_trainer_write_batch`, no storage DELETE policy, no new columns on `batches`/`learners`/`program_billing_rules`. It is a file to read, not a schema to query.

**New migrations are additive; migration 1 is canonical.** After any migration you regenerate `lib/supabase/database.types.ts`, then update the affected mappers and domain types (RULES §3.20, see [The database types regeneration contract](#the-database-types-regeneration-contract)).

Two further details matter for the history:

- **Migration 3 is guarded.** No migration ever created `public.tenant` — it was made by hand in the hosted project with non-conforming columns (camelCase, int PK). On any database rebuilt from this history (fresh `db reset`, CI) the table is absent, so the migration wraps its statements in a `do $$ … $$` block with a `to_regclass('public.tenant') is null` short-circuit: PL/pgSQL resolves statement names at execution, so a rebuilt database skips the block instead of failing with `42P01`. The file carries the version it was applied under on the hosted project (2026-07-17) so the ledger and the repo agree and it is never re-applied.
- **Dev-only seeds.** Migration 4 is a dev fixture in migration form (it only inserts `DEV-` rows). `supabase/seeds/` holds two hand-run seeds on top of it — [`dev_profile_memberships.sql`](/supabase/seeds/dev_profile_memberships.sql) and [`verify_user_admin_setup.sql`](/supabase/seeds/verify_user_admin_setup.sql) — both seeds rather than migrations because they hardcode Clerk user IDs, and Clerk development and production instances issue *different* IDs for the same person. A migration carrying those values would run in production and insert rows keyed to users that cannot exist there — dead identities in the table RLS trusts most ([ADR-005](/docs/adr/ADR-005-demo-account-tenant-scoping.md)). Migrations carry schema and reference data; these are environment-specific fixture data, run manually via `psql`. See [Dev-only seeds](#dev-only-seeds).

## Core tables

The live schema has **18 tables and 36 foreign keys** — the 15 pre-ADR-006 tables (14 in the canonical migration + `trainer_credentials`) plus the three school-registry tables — all in `public`. The checked-in history now defines **25 tables and 52 foreign keys**: migration 8 adds seven billing-domain tables and sixteen more references, and while it is unapplied that shape exists in SQL only. [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) is the in-repo ER companion: its four cluster diagrams still draw the 15 pre-existing tables, and the three ADR-006 tables get a separate section at the end rather than being redrawn into the clusters (folding them in is a tidy-up nobody has done yet); it must be updated in the same PR as any new migration — nothing enforces that automatically, and its version table is how a reader tells whether the doc is current — and it has not yet gained the eighth row. [`docs/SUPABASE_SCHEMA_GUIDE.md`](/docs/SUPABASE_SCHEMA_GUIDE.md) is superseded for implementation (banner dated 2026-09-05) and kept for the design rationale and the TESDA boundary. Every tenant-owned table carries a `tenant_id`, and the tenant boundary is enforced structurally as well as by RLS: composite natural keys are tenant-scoped (e.g. `batches` unique on `(tenant_id, batch_code)`, `learners` on `(tenant_id, batch_id, learner_no)`, the three LAMR detail tables all include `tenant_id` in their uniqueness constraints — and, once migration 8 lands, `batches` on `(tenant_id, rqm_code)` where set, plus the tenant-scoped keys of `attendance_records`, `batch_trainer_assignments`, and `billing_records`).

```mermaid
erDiagram
    tenants ||--o{ profile_tenant_memberships : "a school has many memberships"
    profiles ||--o{ profile_tenant_memberships : "a profile has one membership in practice"
    tenants ||--o{ batches : "a school runs batches"
    scholarship_programs ||--o{ batches : "a batch trains on one program"
    profiles ||--o{ batches : "trainer, creator, updater"
    batches ||--o{ learners : "a batch has a roster"
    batches ||--o{ documents : "a batch has evidence records"
    program_document_requirements ||--o{ documents : "catalog row behind a document"
    batches ||--o{ lamr_reports : "a batch has LAMR reports"
    documents ||--o{ lamr_reports : "source evidence of a LAMR"
    lamr_reports ||--o{ lamr_outcomes : "learning outcomes per report"
    lamr_outcomes ||--o{ lamr_activities : "activities under an outcome"
    lamr_reports ||--o{ lamr_entries : "marks per report"
    learners ||--o{ lamr_entries : "learner-by-activity marks"
    lamr_activities ||--o{ lamr_entries : "the marked activity"
    tenants ||--o{ activity_log : "audit events per school"
    batches ||--o{ activity_log : "events about a batch"
    profiles ||--o{ activity_log : "who acted"
    profiles ||--o| trainer_credentials : "one credential row per trainer profile"
    scholarship_programs ||--o{ program_document_requirements : "requirement catalog per program"
    scholarship_programs ||--o{ program_billing_rules : "billing preparation rule per program"
    scholarship_programs ||--o{ program_modules : "fixed module list per program"
    qualifications ||--o{ program_modules : "modules key by qualification"
    scholarship_programs ||--o{ scholarship_cost_schedule : "current cost rates per program"
    qualifications ||--o{ scholarship_cost_schedule : "rates key by qualification"
    batches ||--o{ attendance_records : "sessions recorded for a batch"
    learners ||--o{ attendance_records : "one row per learner per date"
    batches ||--o{ batch_trainer_assignments : "may carry co-trainers"
    profiles ||--o{ batch_trainer_assignments : "the assigned trainer"
    batches ||--o{ billing_records : "append-only generation log"
    tenants ||--o| tenant_settings : "one settings row per school"

    tenants {
        uuid id PK
        text code UK
        text name
        boolean is_active
    }
    profiles {
        uuid id PK
        text clerk_user_id UK
        profile_role role
        boolean is_active
    }
    profile_tenant_memberships {
        uuid id PK
        uuid tenant_id FK
        uuid profile_id FK
        boolean is_default
    }
    scholarship_programs {
        uuid id PK
        text code UK
        text name
    }
    program_document_requirements {
        uuid id PK
        uuid program_id FK
        text document_key
        document_audience audience
        lifecycle_stage required_for_stage
    }
    program_billing_rules {
        uuid id PK
        uuid program_id UK
        int progress_threshold_percent
        int max_absences "default 4, added by migration 8"
    }
    batches {
        uuid id PK
        uuid tenant_id FK
        uuid program_id FK
        text batch_code
        lifecycle_stage current_stage
        batch_status status
        uuid trainer_profile_id FK
        text rqm_code "unique per tenant where set, added by migration 8"
        int total_sessions "nominal hours over 8, added by migration 8"
    }
    learners {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        text learner_no
        text uli
        boolean entrepreneurship_completed "added by migration 8"
    }
    documents {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        text document_key
        document_status status
        document_audience audience
        uuid requirement_id FK
    }
    lamr_reports {
        uuid id PK
        uuid batch_id FK
        text module_title
    }
    lamr_outcomes {
        uuid id PK
        uuid lamr_report_id FK
        text outcome_code
    }
    lamr_activities {
        uuid id PK
        uuid outcome_id FK
        text activity_code
    }
    lamr_entries {
        uuid id PK
        uuid learner_id FK
        uuid activity_id FK
        boolean is_completed
        assessment_result assessment_result
    }
    activity_log {
        uuid id PK
        uuid tenant_id FK
        activity_action action
        text entity_type
    }
    trainer_credentials {
        uuid id PK
        uuid profile_id UK
        text credential_number
    }
    qualifications {
        uuid id PK
        text code UK
    }
    program_modules {
        uuid id PK
        uuid program_id FK
        text qualification_code FK
        int module_order
        boolean is_active
    }
    scholarship_cost_schedule {
        uuid id PK
        uuid program_id FK
        text qualification_code FK
        int training_hours
        numeric training_cost
        numeric tsf_day_rate
    }
    learner_identities {
        text uli PK
        text full_name
    }
    attendance_records {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        uuid learner_id FK
        date attendance_date
        boolean present
    }
    batch_trainer_assignments {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        uuid trainer_profile_id FK
        boolean is_lead
    }
    billing_records {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        billing_type billing_type
        int tranche
        int version
        numeric amount
    }
    tenant_settings {
        uuid id PK
        uuid tenant_id UK
        integer max_absences
        boolean partial_billing_enabled
    }
```
*The checked-in schema: the original 15 tables plus the seven ADR-001 billing-domain tables of migration 8 (`qualifications` is already drawn in the [ADR-006 cluster](#school-registry-and-platform-admin-adr-006)). The live project still holds only the first 18 tables until `20260910120000` is applied. `learner_identities` is drawn without edges on purpose — it has no foreign keys; ULI uniqueness is by value, not by shared row (ADR-001 Q1). `batches.program_id` references `scholarship_programs` with no delete behavior (restrict); most other references cascade, and profile references that record authorship (`created_by`, `submitted_by`, `verified_by`, `marked_by`, `assigned_by`) use `ON DELETE SET NULL` so deleting a profile never destroys compliance history — `batch_trainer_assignments.trainer_profile_id`, by contrast, cascades: an assignment is not audit history.*

### Table catalog

- **`tenants`** — the schools (AKB, J3ED, NEN in the seed). Natural key `code`; `region`/`school_type` are plain text. ADR-006 added six columns: `tesda_provider_code` (the school's TESDA provider number, e.g. `1263` — it appears inside both COPR numbers and batch RQM codes, the join between a school's certificates and its batches; nothing parses it yet, the column records the fact), `province`, `city_municipality`, `street_address`, `provider_type`, `provider_classification` (the last two exist to unblock the T2MIS export, which hardcoded `'Private'` and `'TVIs'`; `province`/`city_municipality` are authoritative going forward while `region` keeps its free-text shape and the export falls back to splitting it for the three seeded schools).
- **`profiles`** — one row per Clerk user: `clerk_user_id` (unique), `role` (`profile_role`), `is_active`. This is the row RLS actually reads. There is **no insert/update policy for `authenticated` in the applied base schema** — profiles are written by the service-role Clerk-webhook provisioning path and by admin assignments via [`/users/new`](#profile-provisioning-and-user-administration) under migration 5's policies, which #230 found present on live applied by hand (see [Per-table policy map](#per-table-policy-map)).
- **`profile_tenant_memberships`** — the join table granting a profile access to a tenant; unique `(tenant_id, profile_id)`, `is_default` flag, `ON DELETE CASCADE` on both ends. In practice a profile holds exactly **one** membership (ADR-005 decision 1; multi-membership is out of scope in [`CONTEXT.md`](/CONTEXT.md)). `can_access_tenant` grants on *any* membership and ignores `is_default`, which is why a second membership would merge tenants into one unscoped list.
- **`scholarship_programs`** — configurable TESDA *funding* programs (TWSP, CFSP), keyed by `code`. Deliberately **not** the home for a school's programs — those are TESDA-registered qualifications (see `qualifications`); reusing the table would corrupt the ADR-001 billing model. Migration 8's reference tables key by both axes: `program_id` → `scholarship_programs`, `qualification_code` → `qualifications`.
- **`program_document_requirements`** — the per-program document catalog: `document_key`, name, `required_for_stage`, `audience`, `sort_order`; unique `(program_id, document_key)`. Powers the compliance checklist.
- **`program_billing_rules`** — one row per program (unique `program_id`); `progress_threshold_percent` CHECK 0–100, seeded at **80**. Explicitly an internal billing-*preparation* signal, not TESDA billing approval. Migration 8 adds `max_absences` (not null, default **4**) — the allowance-eligibility cap: the rule is `absences > max_absences`, i.e. the 5th absence disqualifies (see [The ADR-001 billing domain](#the-adr-001-billing-domain-migration-8)).
- **`batches`** — the central record. Tenant-scoped, unique `(tenant_id, batch_code)`. Carries `current_stage` (`lifecycle_stage`, default `'aou'`), `status` (`batch_status`, default `'pending'`), `progress_percent` and `billing_report_status` (CHECK-bounded), `trainer_profile_id` (nullable, `SET NULL`), plus denormalized `trainer_name` and `official_system_reference`. `qualification_title` stays **free text with no FK to `qualifications`** — making it one would break `mapBatchRow` and every existing row (ADR-006 consequence). Migration 8 (checked in) adds the RQM/NTP authorization block — `rqm_code` (a partial unique index per tenant enforces *one RQM code = one batch*), `ntp_number`, `approved_slots`, `total_amount`, `indicative_start_date`, `ntp_approval_date`, `ntp_received_date` — plus `schedule_pattern` (free text, D3), `total_sessions` (the E2 snapshot), five `*_snapshot` cost columns (BB1), and `entrepreneurship_delivered`; every new column is nullable except the boolean, because existing batches predate these facts and an honest null beats a made-up default in a compliance tool.
- **`learners`** — the roster; unique `(tenant_id, batch_id, learner_no)`, `uli` is the permanent learner key (null for synthetic rows), `assessment_result` default `'pending'`. Migration 8 adds `entrepreneurship_completed` (the dual-training guard, ADR-001 Flag-3x) and the partial index `learners_uli_idx` on `uli` — the index the permanent key never got.
- **`documents`** — one evidence record per (batch, document key): `status` default `'missing'`, `audience` default `'all'`, `storage_path`/`external_url`, `submitted_by`/`verified_by` (`SET NULL`). `document_key` is plain text — **no FK to the catalog**, so an unknown key produces a silently orphaned "untracked" row (the open half of the doc-key mismatch noted in migration 4; see [ADR-004](/docs/adr/ADR-004-untracked-document-semantics.md)).
- **`lamr_reports` / `lamr_outcomes` / `lamr_activities` / `lamr_entries`** — the Learners Achievement Monitoring Report structure: a report header per batch (with optional source document), outcomes under it, activities under outcomes, and learner-by-activity marks (`is_completed`, `assessment_result`, `marked_by`). Uniqueness is tenant-scoped at each level: `(tenant_id, lamr_report_id, outcome_code)`, `(tenant_id, outcome_id, activity_code)`, `(tenant_id, learner_id, activity_id)`. `lamr_entries` denormalizes `lamr_report_id` next to `activity_id` so RLS policies and its index can filter by report without a join. (ADR-001 wants `lamr_reports` to reference `program_modules` by `module_id` — one LAMR per module per batch — but that FK is deliberately deferred to its own migration; see below.)
- **`activity_log`** — append-only audit trail: `action` (`activity_action`), `entity_type`/`entity_id` (polymorphic pointer, no FK), `summary`, `metadata jsonb`. Only `created_at` — no `updated_at`. Migration 8 makes attendance corrections and billing re-generations events here, too.
- **`trainer_credentials`** — one row per profile (unique `profile_id`, `CASCADE`): `credential_number`, `certified_nc_levels text[]`, `specialization`, `accreditation_expiry`.
- **`qualifications`** (ADR-006) — the **national** qualifications registry: unique TESDA `code` (e.g. `AFFOAP212`), `title`, `nc_level`, `sector`, `is_active`. Shared reference data, not tenant data — "Organic Agriculture Production NC II" means the same thing at every school, and storing it per-tenant would produce one spelling per school. Seeded idempotently with six rows (the qualifications appearing in current batch rows plus Organic Agriculture). Migration 8's `qualification_code` columns reference this table — *not* `scholarship_programs`.
- **`tenant_qualifications`** (ADR-006) — the per-school registration link row: `tenant_id` (CASCADE) + `qualification_id` (no delete behavior), unique `(tenant_id, qualification_id)`, plus the per-school facts that differ: `copr_number` (**nullable** — a school is routinely entered while its certificate is still being issued, and a required field would make the operator invent a number), `registration_status`, `delivery_mode`, `valid_until`. The certificate says COPR; the T2MIS import/export code says CTPR — same number, and the column takes the certificate's name while the export's `'CTPR'` header stays because it must match the file TESDA hands back.
- **`platform_admins`** (ADR-006) — one row per platform admin: `profile_id` (primary key, `references profiles ON DELETE CASCADE`), `note`, `created_at`. RLS enabled with **no policies** — the table is unreadable and unwritable through the anon client, which is what stops the role from being self-granted. See [School registry and platform admin](#school-registry-and-platform-admin-adr-006).
- **`program_modules`** (8) — the fixed module list per program + qualification: `module_title`, `module_order`, `nominal_hours`, `is_active`; unique `(program_id, qualification_code, module_order)`. One LAMR is expected per module per batch; the `lamr_reports.module_id` FK that enforces it lands in a separate migration.
- **`scholarship_cost_schedule`** (8) — the TESDA Schedule of Cost, **current rates only**: `training_hours`/`training_days`, `training_cost`, `assessment_fee` (recorded for completeness, never billed by the app), `tsf_day_rate` (default 160), `new_normal`, `insurance_fee`, `entrepreneurship_fee`; unique `(program_id, qualification_code)`. The batch snapshots its matching row at creation — this table is reference data, and no `circular_no`/`effectivity_date` columns exist (version-safety lives in the snapshot).
- **`learner_identities`** (8) — a thin global identity dimension (`uli` primary key, `full_name`), **future seam only**: created empty, unpopulated in the MVP, RLS-denied to every role.
- **`attendance_records`** (8) — per learner per session date: `attendance_date`, `time_in`/`time_out`, `present`, `notes`, `marked_by` (`SET NULL`); unique `(tenant_id, batch_id, learner_id, attendance_date)`. Mutable in place, never locked, even post-billing.
- **`batch_trainer_assignments`** (8) — the M2 trainer↔batch join: `trainer_profile_id` (CASCADE), `is_lead`, `assigned_by` (`SET NULL`); unique `(tenant_id, batch_id, trainer_profile_id)`. Supersedes (but retains) the single `batches.trainer_profile_id` pointer.
- **`billing_records`** (8) — the append-only billing generation log: `billing_type`, `tranche`, `version`, `amount`, `scholar_snapshot jsonb`, `generated_by` (`SET NULL`); unique `(tenant_id, batch_id, billing_type, tranche, version)`. No `updated_at`, no trigger, no UPDATE or DELETE policy.
- **`tenant_settings`** (8) — one row per tenant (`tenant_id` unique): signatories, `letterhead_ref`, `addressee`, `partial_billing_enabled`, and the `max_absences` / `progress_threshold_percent` tenant overrides.

### The eight enums (seven on live)

The canonical migration created seven enums, mirrored 1:1 in `database.types.ts`; migration 8 adds an eighth, `billing_type`, which is **not yet in the types file** (the migration is unapplied and the regeneration is owed):

| Enum | Values | Used by |
|------|--------|---------|
| `profile_role` | `admin`, `coordinator`, `trainer`, `viewer` | `profiles.role` |
| `lifecycle_stage` | `aou`, `ntp`, `tip`, `training`, `assessment`, `billing`, `completed`, `blocked` | `batches.current_stage`, `program_document_requirements.required_for_stage` |
| `batch_status` | `pending`, `ongoing`, `completed`, `blocked` | `batches.status` |
| `document_status` | `missing`, `pending`, `submitted`, `verified` | `documents.status`, `batches.billing_report_status` |
| `document_audience` | `admin`, `coordinator`, `trainer`, `viewer`, `all` | `documents.audience`, `program_document_requirements.audience` |
| `assessment_result` | `competent`, `not_yet_competent`, `pending` | `learners.assessment_result`, `lamr_entries.assessment_result` |
| `activity_action` | `created`, `updated`, `uploaded`, `verified`, `submitted`, `deleted`, `system_note` | `activity_log.action` |
| `billing_type` (8) | `training_cost`, `tsf_allowance`, `entrepreneurship` | `billing_records.billing_type` |

ADR-006 deliberately added **no** enum: platform admin is a table, not a fifth `profile_role` value, and `school_type` stays free text (TESDA's provider vocabulary shifts between issuances). `billing_type` (8) mirrors `BillingTrackId` in [`modules/billing/domain/tracks.ts`](/modules/billing/domain/tracks.ts) **exactly**, so the mapper needs no enum bridge for it (contrast `DB_TO_UI_STAGE`, which exists because `lifecycle_stage` and the UI stage keys diverged). The assessment fee is absent by design: ADR-001 TVI-scope assigns it to the Assessment Center, and adding it here would imply the app generates billing it must not generate. Because the other mappers use **total** enum-bridge maps (e.g. `DB_TO_UI_STAGE` in `modules/batches/data/batches.ts`, `DB_TO_UI_ROLE` in `modules/tenancy/data/tenancy.ts`), a new enum variant added by a migration fails compilation until its UI treatment is chosen — the enum set is a contract, not just data.

### Triggers

A single shared function, `public.set_updated_at()` (before-update, sets `updated_at = now()`), is attached to **15 tables in the applied schema**: the 12 updatable tables of the canonical migration, `trainer_credentials` (migration 2), and the two ADR-006 tables `qualifications` and `tenant_qualifications` (migration 7). Migration 8 adds the trigger to **six more** tables (`attendance_records`, `batch_trainer_assignments`, `tenant_settings`, `program_modules`, `scholarship_cost_schedule`, `learner_identities`) — 21 in the checked-in history — and **deliberately not to `billing_records`**: it has no UPDATE policy, so a before-update trigger could never fire, and the missing `updated_at` column is part of the append-only signal rather than an oversight. `profile_tenant_memberships`, `activity_log`, and `platform_admins` have no `updated_at` column and no trigger — memberships converge explicitly (the dev seed deletes and reinserts), the audit log is append-only, and the admin list is grant-once. `execute` on `set_updated_at` is revoked from `anon` and `authenticated`.

## The ADR-001 billing domain (migration 8)

[`20260910120000_add_adr001_billing_domain.sql`](/supabase/migrations/20260910120000_add_adr001_billing_domain.sql) is [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md) Phase 0.1 (issue #36, EPIC #19): the schema the billing engine and the attendance route need. Its header states the case concretely: today `progress_percent` on `batches` is a number a human typed rather than a fact derived from attendance, while ADR-001 B2 says progress is attendance-derived and explicitly "not manually typed" — the schema cannot honour that; the billing engine (V2) generates official TESDA documents from cost components and a scholar list, and neither the components nor the generation log has a home, so nothing it produces can be reproduced or audited; and `batches` carries no RQM/NTP authorization though "one RQM code = one batch" is a locked domain fact. The migration is **additive** — seven tables, columns on three existing ones, one widened RLS helper, one storage-policy closure, a seed — it alters no existing column and drops nothing. **It is checked in and unapplied; its own header says it has never been parsed by Postgres, so do not assert any of its objects on live.**

### Three deliberate omissions

1. **No `batches.billing_deadline`**, though issue #130 asks for one. ADR-003 P5: "`due_date` is derived, never stored — computed on read from the batch's tranche schedule". Per RULES §7 the ADR outranks the issue. #130's real defect is that `modules/batches/data/batches.ts` substitutes `end_date` — a mapper bug that a column would make permanent.
2. **No `batches.sessions_held`.** ADR-001 §11 and TRD:267 both list `total_sessions` and stop. With `attendance_records` created, sessions held is a count over that table. Storing it would create a second source of truth for progress, free to drift from the attendance it claims to summarise — the same failure mode as (1).
3. **No `lamr_reports.module_id` FK.** ADR-001 §11 requires it, but it alters a table holding live rows and changes its uniqueness. That earns its own migration and its own review; folding a destructive change into an additive one hides it.

### Reference tables: global, not tenant-scoped

`program_modules` and `scholarship_cost_schedule` carry **no `tenant_id`**. They describe TESDA programs and TESDA rates — the same for every school. Giving them a `tenant_id` would not be extra safety; it would assert that two schools can hold different official rates for the same qualification — exactly the kind of drift a compliance tool exists to prevent. Their `qualification_code` references `public.qualifications`, the TESDA *qualification* registry, **not** `public.scholarship_programs`, which holds the *funding* programs TWSP/CFSP — the school-registry migration argues that distinction at length, and collapsing the two axes corrupts the billing model.

`scholarship_cost_schedule` holds **current rates only** (BB1-prune: no `circular_no`/`effectivity_date`): version-safety lives in the batch snapshot — the batch copies its matching rate row at creation, so adding effectivity columns here would create a second, competing versioning mechanism. RLS follows the existing `scholarship_programs` pattern: readable by any authenticated user (`program_modules` when `is_active = true`, the cost schedule unconditionally), writable by `current_role() in ('admin','coordinator')` with no tenant argument.

**The seed is traceable values only.** It inserts one row per program (TWSP + CFSP) for `AFFACP211` — 360 training hours, 45 days, training cost 15,390.00, TSF day rate 160.00, and the CFSP-only components New Normal 1,000.00, Insurance 100.80, Entrepreneurship 800.00 — every figure appearing verbatim in ADR-001 sec.3, which cites Circular 015 s.2026. The CFSP-only components are **null rather than zero** on the TWSP row: null reads as "does not apply to this program", zero reads as "applies, and is free". What is deliberately *not* seeded: [`modules/billing/domain/rates.ts`](/modules/billing/domain/rates.ts) also carries training costs for Rice Machinery Operations and Cookery, but its own header calls them "representative stand-ins" — a missing rate row is a visible gap that stops a billing document from generating; a wrong rate row generates an official TESDA document with a wrong peso amount on it.

> **Unresolved code discrepancy (verbatim from the migration's seed section).** "ADR-001 sec.3 writes Agricultural Crops Production NC II as `AFFACP213`. The school-registry migration seeded the same qualification as `AFFACP211`. This seed uses AFFACP211 because that is the row that exists and the FK requires it. Which code is correct against TESDA's registry has NOT been verified — if it is AFFACP213, both this seed and the registry seed need correcting."

### Attendance, progress, and the session snapshot

`attendance_records` (C2/PathA/X2): one row per learner per session date, unique `(tenant_id, batch_id, learner_id, attendance_date)`, capturing `time_in`/`time_out`. OCR is **deferred, not excluded** — trainers enter these rows manually and upload the signed paper sheet as evidence; when OCR lands it writes the same rows, the schema does not change, only the writer does. Rows stay **mutable in place, never locked, even post-billing** (there is deliberately no lock flag); corrections are expected, and each one appends an `activity_log` event. Attendance-derived progress is the domain fact: `progress = sessions_held ÷ total_sessions` (B2), where `total_sessions` = nominal hours ÷ 8, **snapshotted onto the batch at creation** (E2 — 360 hrs → 45 sessions) and immune to later circular changes; `schedule_pattern` stays **free text** (D3) — it affects how fast sessions are consumed and the batch's calendar duration, never the session count.

### Trainer assignments: backfill first, then replace

`batch_trainer_assignments` (M2) scopes trainers to batches through a join that supports **co-trainers and trainers who work across schools**. It supersedes the single `batches.trainer_profile_id` pointer, which is **retained** — still populated, still read for display — so nothing breaks. The `can_trainer_write_batch` widening happens in strict order: **backfill first** (every non-null `batches.trainer_profile_id` copied into the join with `is_lead = true`, `on conflict do nothing`), **then the function is replaced** with `pointer check OR join check`. At the moment the widened predicate takes effect the assignment set is exactly equal to the pointer set, so it **grants nobody new access on the apply day** — a no-op with respect to who can write what, which is what makes an edit to the security boundary shippable without a staging rehearsal. The `OR` pointer stays as a **second belt**: even if the backfill missed a row, no trainer loses access. It only becomes meaningful when someone adds a co-trainer row.

### billing_records: an append-only generation log

`billing_records` is a **generation log, not an accounts-receivable ledger** (NoLedger): no running envelope, no over-billing guard, no balance — the TESDA Provincial Office reconciles totals, and the app must not appear to. Unique `(tenant_id, batch_id, billing_type, tranche, version)` with a `scholar_snapshot jsonb`; under Y-hybrid, re-generating after an attendance correction writes a **NEW row at the next `version`** — nothing is overwritten, so the history shows the correction (the "student 5 forgotten" case: 137,000 → 145,200).

That append-only property is **enforced in the database, not by convention**: the grants are `select` + `insert` only, and the RLS section deliberately creates **no UPDATE and no DELETE policy** — code cannot mutate a snapshot even if it tries, and adding either policy would silently turn a generation log into a mutable ledger. There is no `updated_at` column and no trigger, which is part of the signal rather than an oversight.

The **SELECT is an explicit role allowlist**, and the choice is deliberate on both sides:

- **Not `can_read_batch`**: that predicate admits the assigned trainer, who would then read the billing amounts for their own batch — RULES §1.5 keeps financial fields away from trainers server-side.
- **Not `can_manage_tenant` either**: that is admin/coordinator only and would lock out `viewer` — RULES §1.4 makes viewer read-only, *not blind*, and rule 5 excludes trainers alone from financial fields.
- **Spelled out** as `can_access_tenant(tenant_id) and current_role() in ('admin', 'coordinator', 'viewer')`: a fifth role added later needs a decision here instead of silently inheriting one.

INSERT is `can_manage_tenant` only. `attendance_records` follows the same two-way trainer/management gate for insert and update (`can_trainer_write_batch OR can_manage_tenant`, read via `can_read_batch`), but **reserves DELETE to `can_manage_tenant`**: deleting an attendance row destroys billing evidence, so it is admin/coordinator work only — a trainer corrects by updating `present`, not by deleting.

### learner_identities and tenant_settings

**`learner_identities` (Q1)** is a thin global identity dimension (`uli` primary key, `full_name`) and a **future seam only**: created empty and it stays empty in the MVP. ULI uniqueness is **by value, not by shared row** — the same person at two schools is two tenant-scoped `learners` rows carrying the same ULI — the table does not perform cross-school double-enrollment detection, and TESDA's systems remain the authoritative lifetime record. RLS is enabled with **no policy and no grant** — in Postgres that denies everything to `authenticated` by default (total denial by design): a seam nobody can read cannot leak cross-school learner data by accident, and opening it up is a deliberate act that should come with the decision that justifies it.

**`tenant_settings`** is one row per tenant holding the per-school facts for the generated `.docx` — `prepared_by`/`approved_by` with titles, `letterhead_ref`, `addressee`, `partial_billing_enabled` — because W1 keeps the school's own template, plus the tenant-level overrides ADR-001 allows. Its `max_absences` **overrides `program_billing_rules.max_absences` when set**: null means "use the program rule" — a nullable override, **never a duplicate default**, so the two cannot silently disagree. The program rule defaults to **4, not 5**: the eligibility rule is `absences > max_absences`, i.e. a 5th absence disqualifies a scholar for allowance (Elig; the locked domain fact in RULES says a scholar with ≥5 absences is ineligible).

### Applying migration 8

**The file is single-shot, not re-runnable.** `add column` and `create index` are guarded with `if not exists`, but `create type`, `create table`, `create trigger`, and `create policy` are not — Postgres offers no `if not exists` for policies, so guarding only some of it would give a false impression that a re-run is safe. It is not: a second run fails at `create type public.billing_type`.

This is fine when the migration runs **inside a transaction**, which is how the Supabase CLI and the MCP `apply_migration` tool both apply it — a failure rolls the whole file back and the re-run starts clean. Run it any other way (piping to `psql` without an explicit `BEGIN`, say) and a partial failure leaves objects behind that must be dropped by hand before retrying. The **likeliest failure point is the `storage.objects` DELETE policy** (section 9), which requires ownership of that table.

And per RULES §3.20 the migration's workstream owes the `database.types.ts` regeneration — which has not happened yet (see [The database types regeneration contract](#the-database-types-regeneration-contract)).

## School registry and platform admin (ADR-006)

Migration 7 ([`20260906130000`](/supabase/migrations/20260906130000_add_school_registry_and_platform_admin.sql)), implemented by [ADR-006](/docs/adr/ADR-006-platform-admin-and-school-registry.md) (accepted 2026-09-06, supersedes the PRD's FR-02 "Super Admin is not implemented" prohibition), closes the hole the user screen left: `/users/new` grants a person access to a school that **already exists**, and nothing created the school — the three tenants were inserted by hand at the bottom of the canonical migration, so onboarding a new TVI meant editing SQL. Its objects exist on the live project, tracked under version `20260906114735` — the #230 double-versioning.

Two structural facts made that more than a missing form:

1. `tenants` has no INSERT policy, and its SELECT policy is membership-scoped — a freshly created school has no members, so even with an INSERT policy the creator could not read back the row they just wrote. Creation genuinely requires an actor **outside** the tenant boundary.
2. `scholarship_programs` holds funding programs, not school qualifications — the wrong home on a different axis.

```mermaid
erDiagram
    tenants ||--o{ tenant_qualifications : "is registered for"
    qualifications ||--o{ tenant_qualifications : "is registered at"
    profiles ||--o| platform_admins : "may be"

    tenants {
        uuid id PK
        text code UK
        text tesda_provider_code
        text province
        text city_municipality
        text provider_type
    }
    qualifications {
        uuid id PK
        text code UK
        text title
        text nc_level
        text sector
        boolean is_active
    }
    tenant_qualifications {
        uuid id PK
        uuid tenant_id FK
        uuid qualification_id FK
        text copr_number
        date valid_until
        boolean is_active
    }
    platform_admins {
        uuid profile_id PK
        text note
    }
```
*The ADR-006 cluster, drawn separately from the original 15-table diagrams, as `docs/DATA_MODEL.md` does. `tenant_qualifications` is the only table that carries both a tenant FK and a reference-to-the-national-registry FK.*

**A platform admin exists (P1).** An operator outside every tenant who provisions schools on request, in the way TESDA itself issues T2MIS/BSRS accounts. The alternative readings were all worse: an admin auto-enrolling themselves in a created school would let every school admin mint schools; keeping schools migration-only means no add-school screen, which is the requirement.

**A table, not an enum value (P2).** `profile_role` is a *tenant-scoped* vocabulary — every base policy switches on `current_role()`, so a fifth value would silently widen or narrow each one until re-audited. Platform admin is a different axis: not "a bigger admin" but "not in any tenant". `platform_admins` carries **no policies and no grants for `authenticated`**, so it cannot be read or written through the Clerk-scoped anon client at all — that is what stops the role from being self-granted through any application path. Note the deny comes from RLS-with-no-policies, not from withholding privileges: Supabase ships default privileges that grant every new `public` table to `anon` and `authenticated` regardless, and the post-apply probe confirmed `authenticated` holds all seven privileges on the table while an `insert` still fails with a row-level-security violation. The Supabase linter's `rls_enabled_no_policy` (INFO) on this table is the design, not a defect — any policy here is a way in. Enrolling a platform admin is a statement run against the project directly (gated by RULES §10): `insert into public.platform_admins (profile_id) select id from public.profiles where email = '<operator email>';`.

**Resolution.** `app_private.is_platform_admin()` — `stable`, `security definer`, `search_path ''`, granted to `authenticated` and revoked from `public`/`anon` — is `exists (platform_admins join profiles where profile_id = current_profile_id() and is_active = true)`. The application asks through `public.current_user_is_platform_admin()`, a second `security definer` that returns **only the caller's boolean, never the membership list** (the table is deliberately unreadable, so this is the one question a SELECT cannot answer). [`modules/tenancy/data/platform.ts`](/modules/tenancy/data/platform.ts) wraps it in a `cache()`-ed snapshot — `getPlatformAdminSnapshot()` returns `data === true` (an unresolved answer shows the smaller surface, never the larger), and the `isPlatformAdmin()` convenience treats every failure as *not* a platform admin for the sidebar, where a failed check should hide the row rather than link into a denial.

**The boundary (P3).** A platform admin can create a school, read every school's name and program list, and seat a school's first member. They cannot read one scholar record, one document, or one billing figure. The reach is exactly: `tenants` (SELECT/INSERT/UPDATE), `qualifications` (active-row SELECT for any authenticated user, FOR ALL for platform admins), `tenant_qualifications` (SELECT for tenant members or platform admins, FOR ALL for platform admins), `profiles` (unassigned only, SELECT), and `profile_tenant_memberships` (SELECT all rows, INSERT first members only) — checkable as `grep is_platform_admin` over the migrations. **Granting `is_platform_admin()` access to any compliance table (`batches`, `learners`, `documents`, `lamr_*`, `activity_log`), or letting it seat itself into a tenant, is a boundary change that needs its own ADR** (RULES §7.30).

The one sharp edge is the seating INSERT policy, "Platform admins can seat a tenant's first members". Without it, a newly created school is permanently unstaffable — the admin grant policy of migration 5 (present on live applied by hand, untracked per #230) requires `can_access_tenant(tenant_id)`, which a platform admin, belonging to no tenant by design, can never satisfy. The policy carries **two guards, and neither may be removed**:

1. `profile_id <> app_private.current_profile_id()` — the operator seats other people, never themselves. This is what closes the escalation: `can_access_tenant()` resolves purely from `profile_tenant_memberships`, so an unconstrained INSERT there would let an operator hand *themselves* everything that function gates in one statement. The first draft of the migration lost exactly this boundary — written as a plain `with check (app_private.is_platform_admin())` that constrains the actor and says nothing about the row — and it was caught in review before the migration was applied.
2. a `not exists` subquery admitting only tenants that have **no members yet** — "first members", as the name says. Racy under concurrent inserts, which is tolerable because guard 1 holds regardless; the worst outcome is two seated members rather than one.

Guard 2 has an ordering dependency: its subquery reads `profile_tenant_memberships` through that table's SELECT policies, so it is correct only because the companion policy "Platform admins can read tenant memberships" shows the caller every row. Deleting or narrowing that SELECT policy would silently weaken the INSERT. Neither SELECT policy recurses — both resolve through `security definer` helpers that read `platform_admins`/`profiles`, never back into the memberships table. There is **no matching DELETE**: revoking a membership is the school admin's operation, and the platform admin seats the first admin and steps back out.

**`create_school` (P6).** `public.create_school(p_code, …, p_qualifications jsonb) returns uuid` is **`security invoker`, deliberately** — the function exists for transactionality (a school and its program list must land together, because a partial write leaves a school with no registered program, which cannot legally run a batch, with nothing on screen to say so), not for authorization. RLS still evaluates every statement inside it, so a caller who is not a platform admin gets a policy violation from the INSERT, not a privilege — the security boundary stays exactly where RULES §1 puts it. It is granted to `authenticated` (revoked from `public`/`anon`), because its caller is a signed-in operator — unlike `ensure_profile_tenant_membership` (migration 6 — **the one object #230 found missing on live**), which is also `security invoker` but granted to `service_role` only because the webhook has no session.

**Writes to `tenant_qualifications` are platform-admin-only for now (P7).** School admins maintaining their own program list is a deliberate follow-up (one additional policy), not an oversight. Deliberately not done: no `/schools` list route, no edit or deactivate flow, and `batches.qualification_title` stays free text.

## The RLS decision machinery

RLS is enabled on all 18 `public` tables on live — and on migration 8's seven new tables once it lands — and `authenticated` holds blanket `select, insert, update, delete` on the `public` tables, so the **policies are the only gate** (the base migration's blanket grants were one-time statements over the objects that existed then, so each ADR-006 table carries its own grant, `platform_admins` receives the usual Supabase default privileges (which is why its deny must come from RLS), and migration 8 carries its own per-table grants for the new tables — `select`+`insert` only on `billing_records`, and **none at all** on `learner_identities`). All decision logic lives in the `app_private` schema as small, `stable`, `security definer` functions with `set search_path = ''`, and every one of them is granted to `authenticated`.

The identity chain: the request carries the Clerk session token (see [client wiring](#client-wiring-and-the-anon-key-pattern)); RLS needs **only the standard `sub` claim** — no custom claims and no JWT template (Clerk deprecated Supabase JWT templates on 1 Apr 2025, and this schema never needed one). `app_private.current_clerk_user_id()` prefers `auth.jwt() ->> 'sub'`, with defensive fallbacks to a `clerk_user_id` claim and `app_metadata.clerk_user_id`.

```mermaid
flowchart TD
    TOKEN["JWT on the anon-key request"] --> CLERK["current_clerk_user_id — reads sub first"]
    CLERK --> PROFILE["current_profile_id — the active profiles row"]
    PROFILE --> ROLE["current_role — profile.role"]
    PROFILE --> ACCESS["can_access_tenant — membership exists for that tenant"]
    ROLE --> MANAGE["can_manage_tenant — admin or coordinator, and member"]
    ACCESS --> MANAGE
    ROLE --> READB["can_read_batch — member and admin, coordinator, or viewer, or the assigned trainer"]
    ACCESS --> READB
    ROLE --> WRITEB["can_trainer_write_batch — trainer, member, and pointer OR assignment row"]
    ACCESS --> WRITEB
    ASSIGN["batch_trainer_assignments — M2 join, backfilled from the pointer"] --> WRITEB
    PROFILE --> PADMIN["is_platform_admin — platform_admins row, profile active"]
    ROLE --> BILLR["billing_records select — explicit allowlist: admin, coordinator, viewer, never trainer"]
    ACCESS --> BILLR
    MANAGE --> POL["table policies"]
    READB --> POL
    WRITEB --> POL
    PADMIN --> POL
    BILLR --> POL
```
*How a row-level policy resolves the caller: JWT `sub` → profile → role, plus tenant membership and the platform-admin axis, feeding the composite predicates every policy composes from. Migration 8 widens the trainer-write path with the M2 assignment join and adds a helper-free decision for billing reads: the explicit role allowlist.*

The helpers, in dependency order:

1. **`current_clerk_user_id()`** → text. `coalesce` of the JWT `sub`, `clerk_user_id`, and `app_metadata.clerk_user_id`.
2. **`current_profile_id()`** → uuid. The `profiles` row where `clerk_user_id` matches **and `is_active = true`** (limit 1). An inactive or missing profile resolves to `NULL`, which fails every predicate — that is how deactivation cuts access instantly.
3. **`current_role()`** → `profile_role`. The matched profile's `role`.
4. **`can_access_tenant(target_tenant_id)`** → boolean. True iff a `profile_tenant_memberships` row links the current profile to that tenant and the profile is active. Grants on **any** membership; `is_default` is never consulted.
5. **`can_manage_tenant(target_tenant_id)`** → boolean. `current_role() in ('admin','coordinator')` **and** `can_access_tenant`. The management predicate for batches, learners, documents, LAMR, the reference tables, and (migration 8) attendance deletes, billing inserts, and the tenant/reference write paths.
6. **`can_read_batch(target_batch_id)`** → boolean. The batch exists, the caller can access its tenant, **and** the role is `admin`/`coordinator`/`viewer` — or the caller is the batch's `trainer` with `trainer_profile_id = current_profile_id()`. The read predicate for `batches`, `learners`, `documents` (indirectly), all LAMR tables, and (migration 8) attendance reads.
7. **`can_trainer_write_batch(target_batch_id)`** → boolean. The caller is `trainer`, can access the batch's tenant, **and** is the assigned trainer via `batches.trainer_profile_id` **or** a `batch_trainer_assignments` row (the M2 join added by migration 8). It is widened backfill-first-then-replace, so it grants nobody new access on the apply day; the `OR` pointer is the second belt. The trainer write predicate for documents, LAMR, and (migration 8) attendance insert/update.
8. **`is_platform_admin()`** → boolean (ADR-006). `exists` over `platform_admins` for the current profile with `is_active = true`. A separate axis from `current_role()` — it reads `platform_admins`, never `profile_role`, and a platform admin typically holds no membership and may hold any tenant role without it mattering.

Three invariants follow from these definitions and are load-bearing:

- **In the applied base schema, `admin` and `coordinator` are indistinguishable** — every check pairs them. The role therefore records who someone *is* (school proprietor vs. day-to-day staff, per [`CONTEXT.md`](/CONTEXT.md) and ADR-005), not what they may do, and both will silently gain any future admin-only capability. The first deliberate split is the admin write policies (20260904120000 — present on live applied by hand, untracked per #230), which scope user administration to `current_role() = 'admin'` alone (not `can_manage_tenant`) as a recorded scope decision; migration 8 adds the next split, `billing_records`' SELECT allowlist, which admits `viewer` but not `trainer`.
- **Trainers are batch-scoped, not tenant-scoped.** A trainer sees only batches where they are assigned (`trainer_profile_id` pointer or, once migration 8 lands, a `batch_trainer_assignments` row), can insert documents and manage LAMR — and record/correct attendance — only for those batches, and the document gate additionally requires `audience in ('trainer','all')`. Viewers are read-only in the app (RULES §1.4 server-denies their writes) — and the one applied write policy that reaches them at all is the `activity_log` append (`can_access_tenant`, no role predicate): the single place where the database does not itself enforce the read-only rule ([`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) flags the tension explicitly rather than assuming either reading is correct).
- **Platform admin is orthogonal to the tenant role.** Holding `admin` at a school grants nothing on `/schools/new`; being the operator makes you an admin nowhere. The `/schools/new` gate checks the platform boolean, never `profile_role`, and never the `?role=` preview override.

## Per-table policy map

The policy sections across the eight migrations give the following map. Unmarked rows are the applied base; **(7)** rows landed with ADR-006 (tracked on live under version `20260906114735`); **(5)** rows are checked in — untracked on live, but #230's verification found the policies **present, applied by hand**, so the write cells below are live; **(8)** rows are checked in but **unapplied** — none of their objects exist on live yet:

| Table | SELECT | INSERT | UPDATE / DELETE |
|-------|--------|--------|-----------------|
| `tenants` | `can_access_tenant(id)`, **or** `is_platform_admin()` (7) | `is_platform_admin()` (7) | `is_platform_admin()` (7); no delete policy |
| `profiles` | own row, or admin/coordinator of a profile sharing any tenant (membership join); **plus** unassigned profiles for `admin` (5) and for platform admins (7) | — (service-role provisioning only) | `admin`, role/`is_active` on visible profiles, `with check` repeats the admin test (5) |
| `profile_tenant_memberships` | `can_access_tenant(tenant_id)`, **or** `is_platform_admin()` — all rows (7) | `admin` + `can_access_tenant(tenant_id)` (5); **platform admin: first-member guards only** (7) | `admin` + `can_access_tenant(tenant_id)` (5); no delete for platform admin |
| `qualifications` | `is_active = true` (any authenticated user) (7) | `is_platform_admin()` (FOR ALL) (7) | `is_platform_admin()` (FOR ALL) (7) |
| `tenant_qualifications` | `can_access_tenant(tenant_id)` **or** `is_platform_admin()` (7) | `is_platform_admin()` (FOR ALL) (7) | `is_platform_admin()` (FOR ALL) (7) |
| `platform_admins` | — (RLS enabled, **no policies**: every operation denied) (7) | — | — |
| `scholarship_programs` | `is_active = true` (any authenticated user) | admin/coordinator role check | same |
| `program_document_requirements` | `true` (any authenticated user) | admin/coordinator | same |
| `program_billing_rules` | `is_active = true` | admin/coordinator | same |
| `batches` | `can_read_batch(id)` | `can_manage_tenant(tenant_id)` | `can_manage_tenant` (using + with check) |
| `learners` | `can_read_batch(batch_id)` | `can_manage_tenant(tenant_id)` | `can_manage_tenant` |
| `documents` | `can_manage_tenant(tenant_id)` **or** (viewer + `can_access_tenant`) **or** (`can_trainer_write_batch` + `audience in ('trainer','all')`) | admin/coordinator (`can_manage_tenant`); **trainer**: `can_trainer_write_batch` + `audience in ('trainer','all')` | admin/coordinator via the `for all` policy; **trainer**: only their own submission (`submitted_by = current_profile_id()`) in a writable batch with trainer/all audience |
| `lamr_reports` | `can_read_batch(batch_id)` | admin/coordinator **or** `can_trainer_write_batch` | same |
| `lamr_outcomes` | via parent report: `can_read_batch(r.batch_id)` | same two-way gate | `with check` additionally enforces `r.tenant_id` matches the row's tenant |
| `lamr_activities` | via parent report | same two-way gate | same |
| `lamr_entries` | via parent report | same two-way gate | same |
| `activity_log` | `can_access_tenant(tenant_id)` | `can_access_tenant(tenant_id)` (append, any role including viewer) | — (no update/delete policy) |
| `trainer_credentials` | own row, or admin/coordinator of a same-tenant profile | trainer, own profile only | trainer, own profile only |
| `attendance_records` (8) | `can_read_batch(batch_id)` | `can_trainer_write_batch(batch_id)` **or** `can_manage_tenant(tenant_id)` | update: same two-way gate (using + with check); **delete: `can_manage_tenant` only** — destroying billing evidence is admin/coordinator work |
| `batch_trainer_assignments` (8) | `can_access_tenant(tenant_id)` | `can_manage_tenant(tenant_id)` (FOR ALL) | `can_manage_tenant(tenant_id)` (FOR ALL) |
| `billing_records` (8) | `can_access_tenant(tenant_id)` **and** `current_role() in ('admin','coordinator','viewer')` — explicit allowlist, never `can_read_batch`, never trainer | `can_manage_tenant(tenant_id)` — insert only | — **no UPDATE or DELETE policy: append-only enforced by absence** |
| `tenant_settings` (8) | `can_access_tenant(tenant_id)` | `can_manage_tenant(tenant_id)` (FOR ALL) | `can_manage_tenant(tenant_id)` (FOR ALL) |
| `program_modules` (8) | `is_active = true` (any authenticated user) | `current_role() in ('admin','coordinator')` (FOR ALL, no tenant argument) | same (FOR ALL) |
| `scholarship_cost_schedule` (8) | `true` (any authenticated user) | `current_role() in ('admin','coordinator')` (FOR ALL, no tenant argument) | same (FOR ALL) |
| `learner_identities` (8) | — (RLS enabled, **no policy and no grant**: total denial by design) | — | — |

Notes on the map:

- The `documents` row is the one where **audience matters**: the `audience` enum gates the *trainer* read/insert/update path to `('trainer','all')`. The viewer branch reads any document in an accessible tenant, and the management branch reads everything — so `billing_report` (audience `admin`) is hidden from trainers, not from viewers, at the database layer; trainer-facing DTOs strip financial fields server-side as a separate rule (RULES §1.5).
- LAMR detail tables resolve access **through the parent `lamr_reports` row** (`exists (select 1 from lamr_reports r where r.id = …)`), since they point at the report rather than the batch directly.
- The reference tables (`scholarship_programs`, requirements, billing rules) are effectively **global, not tenant-scoped** — read by any authenticated user (requirements unconditionally, programs/billing rules when active) and managed by admin/coordinator with no tenant argument. `qualifications` (7) follows the same global-read pattern for the national registry, and so do migration 8's `program_modules` and `scholarship_cost_schedule` (the rates table is readable unconditionally).
- The trainer-facing cells (`documents`, `lamr_*`, and now `attendance_records`) all resolve through `can_trainer_write_batch`, so the M2 widening extends them to co-trainer assignments the day an assignment row is added — and has no effect before then, because the backfill keeps the assignment set identical to the pointer set.
- No table has a policy for `anon`: unauthenticated requests see nothing, and a signed-in user with no profile or membership also sees nothing — zero rows, no error (see [failure semantics](#failure-semantics)).
- **Admin-only is a scope decision, not an oversight (5).** `can_manage_tenant()` would have admitted coordinators, but a coordinator who could grant tenant access while an admin alone could set roles is a split boundary that drifts — one role owns the whole operation. Policy 1 (unassigned read) is deliberately **not** scoped to the admin's own tenants: an unassigned profile has no tenant to scope by, which is the whole point; the exposure is bounded to name/email of users who hold no access anywhere, and it ends the moment the profile is assigned.
- **The seating guards are the whole P3 boundary (7).** See [School registry and platform admin](#school-registry-and-platform-admin-adr-006) — both predicates on "Platform admins can seat a tenant's first members" are load-bearing, and the policy is correct only while the all-rows membership SELECT for platform admins exists.

## Storage policies

Evidence files live in the **private** `compliance-evidence` bucket (50 MiB limit), which the canonical migration creates idempotently alongside the schema. Policies on `storage.objects` scope every operation to the caller's tenant **by the UUID path prefix, not by RLS on a column** — `storage.objects` has no tenant column, so the first path segment of the object name is the tenant UUID:

- **SELECT**, **INSERT**, **UPDATE** — all allowed only when `bucket_id = 'compliance-evidence'` **and** `can_access_tenant((storage.foldername(name))[1]::uuid)`.
- **DELETE** — added by migration 8 (checked in, unapplied). The canonical migration created **no** DELETE policy, so the practical effect was that nobody could remove a file uploaded in error — it could be overwritten but never deleted (the gap was filed during the #41 evidence-storage work). The new policy is scoped **tighter than its siblings**: they use `can_access_tenant`, this one uses `can_manage_tenant` — reading and uploading evidence is ordinary work for a trainer; destroying evidence in a compliance tool is admin/coordinator work only. It is also the migration's likeliest failure point, because it requires ownership of `storage.objects`.

Note the path coupling: a document's `storage_path` must be laid out as `<tenant-uuid>/…` or its RLS predicates evaluate against the wrong (or no) tenant. No ADR-006 policy touches storage — a platform admin cannot read a single evidence file.

## Profile provisioning and user administration

`profiles` has no write policy for `authenticated` in the applied base schema, so identity rows are created by the server-only webhook path in [`modules/auth/data/provisioning.ts`](/modules/auth/data/provisioning.ts), which runs on the **service-role** client (bypasses RLS by design — the only sanctioned use), reached from [`app/api/webhooks/clerk/route.ts`](/app/api/webhooks/clerk/route.ts) (Clerk-signed, unauthenticated by design):

- **`upsertProfileFromClerkUser`** — on `user.created`: inserts with `role` from a parseable **invitation grant** when one is present, otherwise `viewer` (least privilege), and **no membership row unless a grant carries one** — a self sign-up lands with no tenant access at all. On `user.updated`: syncs only `full_name`/`email`, then **repairs a missing invitation membership** (a membership insert that failed on `user.created` used to be permanent — the route still answered 200, so Clerk never retried). Role and `is_active` are never touched on update, so a Clerk profile edit can never change app-side authorization.
- **Membership writes go through `ensure_profile_tenant_membership`** (migration 6 — **the one object #230 found missing on live**): the function's atomic zero-membership gate means a grant can never add a second school or move someone an admin has already placed, and it makes `is_default: true` correct by construction — the service-role client sees the whole truth, so "no members" there means *none*, unlike the RLS-scoped client in the admin path. **On the live project the function does not exist, so this call fails today**: the webhook answers 500, Clerk retries, and each retry hits the same gap until #230 is reconciled — the invitation itself and the profile row still work, because they live on the Clerk and service-role sides.
- **`deactivateProfileFromClerkUser`** — on `user.deleted`: sets `is_active = false` instead of deleting. A hard delete would cascade or orphan every FK pointing at the profile and destroy the audit trail; deactivation matches `current_profile_id()`'s `is_active = true` filter, so access stops immediately and history survives.

The assignment flow itself has shipped as two screens, both writing through the **anon-key** `createSupabaseServerClient` so Postgres RLS decides (the migration header's point: the write path is a Server Action carrying a Clerk session, so it must go through RLS — not the service-role client, whose reservation is the webhook):

<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
- **`/users/new`** ([`modules/tenancy/data/users.ts`](/modules/tenancy/data/users.ts) + [`actions.ts`](/app/(dashboard)/users/new/actions.ts)) — the admin-only screen (gated on `resolveTrustedRole`, never the `?role=` override, which would let anyone preview their way into the Clerk-invitation branch that has no RLS behind it). Path 1, *registered email*: `findUserByEmail` (case-insensitive with escaped ILIKE patterns plus an exact-match re-check, so a wildcard can never assign access to the wrong person; `not-registered` is ambiguous by design — distinguishing "nobody has that address" from "they belong to another school" would leak other tenants' membership) then `assignUserAccess`, which runs the role UPDATE **before** the membership INSERT (the safer half to stop after) and, on INSERT failure, performs a best-effort `restorePriorRole` compensation — a half-applied promotion to `admin` could read and set roles on the whole unassigned pool, so a grant that fails should leave no trace. The INSERT always writes `is_default: false` (an RLS-scoped empty membership list means "none this admin can see", never "none"). Path 2, *unregistered email*: `inviteUser` parks the grant (role + tenantId) on the **Clerk invitation's `publicMetadata`** — Backend-API-only, so the signee cannot forge it — parsed all-or-nothing by [`modules/auth/domain/invitationMetadata.ts`](/modules/auth/domain/invitationMetadata.ts) (a half-formed grant yields `null` and the safe fallback), and applied by the webhook when the person signs up. **Per #230 the live picture has moved since the old "pending" status**: the four admin write policies exist on the live project applied by hand (untracked), so the direct path is no longer RLS-denied there — but the invitation path's membership write still cannot land, because `ensure_profile_tenant_membership` is the one object #230 found missing.
- **`/schools/new`** ([`modules/tenancy/data/schools.ts`](/modules/tenancy/data/schools.ts) + [`platform.ts`](/modules/tenancy/data/platform.ts)) — the platform-operator screen: `listQualifications` (the national registry, readable by any signed-in user), `createSchool` (the `create_school` RPC, with failures told apart — `42501` → `denied`, `23505` on `tenants.code` → `duplicate-code`, anything else → `sync-failed`), and the platform gate. This screen **works on the live project** (the ADR-006 objects exist there, tracked under `20260906114735`) — and it is the first half of the pair: a brand-new school can get its first member only through the applied platform-admin seating policy (a database capability the screen itself does not perform), while the `/users/new` admin grant path the onboarding story relies on now exists on live (untracked), so the pairing the old ledger worried about has resolved in the database — the reconciliation into the ledger is still owed.

ADR-005 still frames [`supabase/seeds/dev_profile_memberships.sql`](/supabase/seeds/dev_profile_memberships.sql) as a *stopgap*, not a substitute: a freshly provisioned user resolves to zero rows until an admin assigns a tenant — which on live can now happen through the app (the admin policies exist, applied by hand, untracked), but **not** through the invitation path, whose membership write needs the missing RPC.

## Dev-only seeds

**Migration 4 (operational data).** [`20260831120000_seed_dev_operational_data.sql`](/supabase/migrations/20260831120000_seed_dev_operational_data.sql) seeds the rows the dashboard needs to demonstrate scoping (**present on the live project but untracked** per #230 — the row counts match its content exactly, its version is not recorded, and its unique index is of unknown existence). Tenants, programs, the 8-key document catalog, billing rules, and the bucket are already seeded idempotently by migration 1; this adds only:

- **Five batches** with `DEV-` codes (`DEV-AKB-001`, `DEV-J3ED-001`, `DEV-J3ED-002`, `DEV-NEN-001`, `DEV-NEN-002`), resolved by tenant/program `code`, upserted on `(tenant_id, batch_code)`. The `DEV-` prefix is deliberate: the natural key is the RQM code from the NTP, the source mock has no RQM codes, and fabricating official-looking identifiers in a compliance tool is not acceptable — the prefix is greppable for replacement. `official_system_reference` stays NULL for the same reason, and `trainer_profile_id`/`created_by`/`updated_by` stay NULL because `profiles` is Clerk-backed (a placeholder profile would be an identity no one can authenticate as); the denormalized `trainer_name` text carries the trainer meanwhile.
- **Placeholder learners**, one row per `learner_no` sized to each batch's `learner_count`, synthetic names, `uli = NULL` (ULI is the permanent learner key — inventing one pollutes the T2MIS identity space).
- **Eight document rows per batch** (one per catalog key), statused to tell a story (the completed `DEV-J3ED-002` batch is all-`verified`).
- **A hazard closure:** `documents` had no uniqueness on `(batch_id, document_key)`, so any repeated insert silently duplicated rows. The migration adds the **unique index** `documents_batch_id_document_key_key` — it fails loudly if duplicates already exist (de-duplicate first), and being an index rather than a constraint it produces no `database.types.ts` change. On the live project the index's existence is unverified (#230), so any new seed using `on conflict (batch_id, document_key)` may fail without it.
- `storage_path`/`external_url` stay NULL: the mock's `storage://` URLs point at no real object, and a dead link on a compliance document is worse than a visibly absent one.

**`seeds/dev_profile_memberships.sql` (identity fixtures).** A **DRAFT — NOT APPLIED** stopgap seed (header: "Review before running"), run manually (`psql "$DATABASE_URL" -f …` or the SQL editor), that gives the three real dev Clerk users a `profiles` row and a membership so RLS has something to match. Per ADR-005:

- **One membership per profile.** Demo: `demo@tvicams.app` → `viewer`, **AKB only** (least privilege — viewer is read-only through the app's `canWrite = role !== 'viewer'` while no policy denies it any read, so it can see every screen the isolation check needs). The two human accounts → `admin` (the school's proprietor): `klynejoshua13` for AKB and `nenitarmo` for NEN.
- **Convergence by delete + reinsert**, scoped to the three `clerk_user_id`s it manages — `ON CONFLICT DO UPDATE` alone can add and amend but never remove a row, and a stale membership is a live grant because `can_access_tenant` fires on any.
- **Warning — the file no longer matches the dev database (open deviation, recorded on PR #174).** The dev database was converged to decision 2 *only* (demo = viewer, AKB). The developer account deliberately **keeps its AKB + J3ED + NEN grants (three memberships)** because, when the file was written, nothing in the app performed tenant assignment — dropping them means hand-writing SQL to get back into either school, and J3ED would fall to zero members. That retained state is the exact harm decision 1 exists to prevent (all three schools merged into one unscoped list, since `can_access_tenant` grants on any membership), left open on one account; `/users/new` has since landed in the repo and its write policies now exist on live (untracked per #230), so the stopgap framing loosens for direct admin assignment — but the invitation path's membership write is still blocked by the missing RPC. It does not affect the isolation assertion, which runs as demo and is AKB-scoped either way.
- **Warning — the membership delete is unconditional *for the three managed accounts*.** It deletes *every* membership of the three managed `clerk_user_id`s — and the developer is one of the three — so running the file as written **will remove the developer's two retained grants** (J3ED, NEN): a real change, not a no-op; the file says decide before you run it, not after. The scoping does mean the two orphaned rows below are untouched. To apply decision 2 alone, the whole diff is one statement (`update profiles set role = 'viewer'` for demo), and demo's delete-then-insert just churns five rows to arrive where it started.
- **The isolation assertion:** signed in as demo on `/dashboard`, exactly one batch (`DEV-AKB-001`) must be visible; a scoping regression shows five. It must be verified in the app, not in SQL (the file's own verification query joins through memberships, so a tenant with no member never appears — J3ED by design), and it is only meaningful when the snapshot is `ok`. The file's caveat about a mock fallback on `unconfigured`/`sync-failed` predates the mock-data retirement: the dashboard now renders an honest empty state on those paths and never substitutes mock rows (RULES §3.19 — `selectBatchesForDisplay` returns `[]` for any non-`ok` snapshot, and `shared/mocks/` is gone), so any non-empty count comes from the live RLS-scoped query. Confirm the "Data as of" stamp is present before trusting the count.
- `is_default` is redundant under one-membership-per-profile (the `find(is_default) ?? [0]` fallback always resolves to the single row) and is set for forward compatibility only.
- Two orphaned profile rows for Clerk IDs that don't exist in the current instance (one an AKB admin membership, one a membership-less viewer) are **deliberately left alone** — the delete is scoped to the three managed accounts, and the orphans grant access to nobody today because no token can carry those `sub` values; deleting them is a separate, deliberate change if IDs are ever reused.

**`seeds/verify_user_admin_setup.sql` (admin-policy verification setup).** A pasteable, two-part setup in **one all-or-nothing transaction** for making the user-creation screen (PR #213 / commit `b3361a6`) observable at runtime — a **seed, not a migration**, because part 2 hardcodes a Clerk user ID (different between Clerk dev and prod instances, the same reason as `dev_profile_memberships.sql`). It was written when migration 5 was pending on the live project while demo is deliberately a `viewer`, so `/users/new` renders its admin-only guard and neither direct write path is reachable. #230 has since found the policies present on live (untracked), so part 1 is redundant there; part 2's temporary demo promotion remains the checked-in way to exercise the screen.

- **Part 1 — the migration's four policies, made re-runnable.** The migration uses bare `create policy` (errors on a second run); the seed prepends `drop policy if exists` guards, which double as the uninstall. Semantics are otherwise identical — "a drifted copy of a security policy is worse than no copy," so change both or neither — and a real environment should run the migration, not this copy. The four policies grant `admin` (and only `admin`) the write surface the screen needs: read **unassigned** profiles, update `role`/`is_active` on visible profiles, insert membership rows **only for tenants the admin belongs to**, and delete them (otherwise the grant is a one-way door and a mis-assignment needs a DBA).
- **Part 2 — temporary demo promotion, deny-by-default by design.** One column on one row: `update profiles set role = 'admin'` for the demo's hardcoded Clerk ID; the commented-out revert sits at the bottom of the file. The promotion is guarded by a `do $$` block that raises unless `set local app.environment = 'local'` was set below `begin;` — because both parts share one transaction, aborting the guard rolls back Part 1 too, so a careless paste against a real database applies nothing. **Note the checked-in state: that opt-in line currently ships *uncommented*, so the guard is disarmed in the repo copy and the file promotes demo as written** — the header's deny-by-default description and the file's contents disagree, and the line should be verified (re-commented) before any paste. The membership is left *alone* — demo already holds exactly AKB, and an admin can only grant a tenant they belong to, so one membership exercises the whole screen. The promotion deliberately degrades the tenant-isolation canary (the DRAFT seed above) until it is reverted, and demo is promoted rather than either real admin account only because demo's credentials are the ones in `.env.local`.
- **No `database.types.ts` impact:** policies only, no tables/columns/enums — the regeneration contract does not fire; what changes on landing is the `(5)` cells of the [policy map](#per-table-policy-map) and the status of the `20260904120000` row in the #230 reconciliation.

## The database types regeneration contract

There are two type families, deliberately separate:

1. **`lib/supabase/database.types.ts`** — the raw row types: the `Database` interface with all **18 tables** (each with `Row`/`Insert`/`Update`/`Relationships`), the seven enum aliases, and **three function signatures** — `ensure_profile_tenant_membership`, `current_user_is_platform_admin`, and `create_school` (previously empty). This is the only file allowed to know the database's exact shape — and **it has not been regenerated for migration 8**: no `billing_type` enum, none of the seven new tables, none of the new columns on `batches`, `learners`, or `program_billing_rules`. RULES §3.20 makes the regeneration (then updating the affected mappers and domain types) part of every migration's workstream, so that row is owed before any mapper can consume the new shapes; until it lands, the `(8)` objects exist in checked-in SQL only, not in the TypeScript contract.
2. **`shared/types.ts`** — *hand-written* UI domain types (`Batch`, `Tenant`, `User`, `DocRecord`, `LifecycleStage`, …) shaped for the screens, not the tables. `Tenant` now carries the six ADR-006 registry fields (`tesdaProviderCode`, `province`, `cityMunicipality`, `streetAddress`, `providerType`, `providerClassification`) — empty string, not `null`, so every consumer renders one without a check.

**Only module `data/` layers** (plus `lib/supabase` itself) **may import `database.types.ts`** — components import domain types only. This is lint-enforced: the `import/no-restricted-paths` zone in [`eslint.config.mjs`](/eslint.config.mjs) targets `app/**`, `shared/**`, `modules/*/ui/**`, and `modules/*/domain/**` against `lib/supabase/database.types.ts` with the message "Raw DB row types are data-layer only. Import domain types (shared/types or a module's domain/) instead."

The contract on change (RULES §3.20): **after any migration, regenerate `database.types.ts`, then update the affected mappers and domain types.** In practice for ADR-006 the new shapes were **written by hand from the migration and checked field-by-field against `generate_typescript_types` run on the live project** (the file's header records this), with two deliberate divergences from the generator: `create_school`'s nullable text parameters are typed `string | null` (the generator emits plain `string`, but the data layer passes null), and `current_user_is_platform_admin`'s `Args` stays `Record<string, never>` rather than the generator's `never`. The mappers are where DB↔UI differences live — the enum bridge (DB `training`→UI `train`, `assessment`→`assess`, `billing`→`bill`; UI-only `entre` stage; DB `blocked` surfacing as UI `pending`) is a total map, so a new enum variant is a compile error until someone chooses its UI treatment — except `billing_type`, which mirrors its TS twin exactly and needs no bridge. One known wart: the file stubs every table's `Relationships` as `[]`, which is what makes supabase-js unable to infer embedded joins — the root of the four long-standing TS2352 casts in `activity.ts`, `batches.ts`, `tenancy.ts`, and `users.ts`; adopting real `Relationships` arrays would likely retire all four and is a deliberate future cleanup.

## Client wiring and the anon-key pattern

The Supabase clients in `lib/supabase/` implement RULES §1.3:

- **`createSupabaseServerClient`** (server) and **`useSupabaseClient`** (client islands) build an **anon-key** client whose `accessToken` callback returns the **Clerk session token** — Clerk's native third-party auth integration, not a custom JWT template (deprecated 1 Apr 2025; the schema needs no custom claims because RLS reads only `sub`). The callback is re-invoked on expiry, which a hand-set `Authorization` header cannot do; setting it also means never calling `supabase.auth.*` on these clients.
- **A missing token throws** (`NO_CLERK_TOKEN_MESSAGE`), it never returns null: a null token would build an unauthenticated `anon` client, and RLS would answer every query with zero rows and *no error* — indistinguishable from "this user has no batches." For a compliance tool that silent degradation is the dangerous outcome, so the caller surfaces it as `sync-failed` instead.
- **`createSupabaseServiceClient`** — the service-role key, which **bypasses RLS entirely**, is server-only (webhook provisioning) and must never reach client code. Every tenancy write path (`users.ts`, `schools.ts`) deliberately uses the anon-key client instead so RLS stays the decision-maker.

### Failure semantics

Because every predicate bottoms out in `current_profile_id()`, the failure modes are uniform and silent-at-the-database:

| Situation | RLS outcome |
|-----------|-------------|
| No session / `anon` request | no policies for `anon` → zero rows, no error |
| Token present but no `profiles` row (or `is_active = false`) | `current_profile_id()` is NULL → every `can_*` false → zero rows |
| Profile exists, no membership (e.g. freshly provisioned `viewer`) | `can_access_tenant` false → zero rows — correct behavior that *reads* as a broken dashboard (the exact gap ADR-005 addresses) |
| Profile exists, membership in another tenant | zero rows for this tenant — the isolation boundary working |
| Trainer on an unassigned batch | `can_trainer_write_batch` false → no documents/LAMR write, no read |
| Non-platform-admin calls `create_school` | policy violation (`42501`) from the INSERT inside the `security invoker` function — not a privilege; the data layer renders `denied` |
| Any operation on `platform_admins` | RLS enabled, no policies → denied, including for a holder of the full default-privilege grants |
| Invitation grant lands on live (webhook) | `ensure_profile_tenant_membership` does not exist (#230's one real gap) → the `rpc` fails, the webhook answers 500, Clerk retries; the profile row itself lands (service role) |
| Any operation on `learner_identities` (once migration 8 lands) | RLS enabled, no policy, no grant → denied for every role, by design |

The app must therefore distinguish "not signed in" (client throws) from "signed in but empty" (RLS zero rows), and neither path may substitute fabricated data (RULES §3.19).

## Operations and agent constraints (RULES §10)

There is **one hosted project and no staging**, so an unreviewed statement lands on real tenant data. RULES §10, rule 36 ([`RULES.md`](/RULES.md)) — a `[deny]`-level rule — forbids executing statements against the live project without explicit user permission or an agreed plan that covers it, and requires stating exactly what will run and why, then waiting. Its deny list, by any route (the Supabase MCP server, the CLI, or direct SQL), covers:

- `execute_sql` — **denied as a tool, including read-only `select`s** (the tool is denied, not the statement kind)
- `apply_migration` and `deploy_edge_function`
- all branch operations (`create`/`delete`/`merge`/`rebase`/`reset`)
- the CLI routes `supabase db push`, `supabase db reset`, and `supabase migration up`
- `psql`

Rule 36 names `.claude/settings.json`'s `permissions.deny` as the enforcement point — and that file is a **per-machine local registration, not part of the repo**. [`.gitignore`](/.gitignore) ignores `.claude/*` (the `/*` form is deliberate, so Git still descends into the re-included subdirs), re-including only `!.claude/hooks/`, `!.claude/agents/`, and — after `!.claude/skills/` is restored and `.claude/skills/*` ignored again — `!.claude/skills/mermaid/`. The settings file is therefore **not present in this checkout**, and its deny entries are known from RULES.md's `[deny]` declarations, not from reading it. What is durable and in-repo: [`RULES.md`](/RULES.md) itself (rule 36 and the enforcement-level legend), [`.mcp.json`](/.mcp.json) (the Supabase MCP server registration, pointing at the hosted project `azywaivpyphhsblxjgtn` — the same single project the rule protects), and the version-controlled hook scripts in `.claude/hooks/` (e.g. `protect-static-dirs.sh`, `lint-edited-file.sh`, `check-mcp-health.sh`), which are the `[hook]`-level enforcement that travels with the repo.

Consequently: **answer schema questions from the checked-in migrations, `supabase/seeds/`, and `lib/supabase/database.types.ts` first** — with the standing caveat that the repo and the database have drifted (#230: the migration table returns four versions, one of them the double-versioned school registry; three checked-in migrations are untracked whose objects mostly exist applied by hand; one real gap — the missing `ensure_profile_tenant_membership`; and an eighth migration checked in but never parsed by Postgres — see [Issue #230: the repo and the database have drifted](#issue-230-the-repo-and-the-database-have-drifted)). The read-only introspection tools (`list_tables`, `list_migrations`, `get_advisors`, `search_docs`) remain available for what those cannot answer — with the caveat that `list_tables` row counts are `reltuples` planner estimates, not counts.

Local-stack configuration lives in [`supabase/config.toml`](/supabase/config.toml): `project_id = "tesda-compliance-manager-design-system-v"`, Postgres major version 17, migrations enabled, and `[db.seed] sql_paths = ["./seed.sql"]` — where [`supabase/seed.sql`](/supabase/seed.sql) is deliberately trivial because the real reference data is seeded idempotently by the canonical migration itself (so a fresh `db reset` reproduces tenants, programs, catalog, and bucket). Storage is enabled with a 50 MiB limit, matching the `compliance-evidence` bucket.

## Related pages

- [Quickstart and Task Routing](/openwiki/quickstart.md) — where to start, the env vars that decide `ok` versus `unconfigured`, and the current known states a schema change must account for (the #230 repo-vs-database drift, and the unapplied eighth migration)
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) — the `app → modules → shared → lib/supabase` import rules and the fetch → map → derive contract the data layers above follow
- [Design System and UI Invariants](/openwiki/architecture/design-system.md) — the mandatory screen states that RLS zero-row and `sync-failed` paths render into, and the same `.claude/` gitignore and hook-registration facts from the UI side
