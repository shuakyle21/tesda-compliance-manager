---
type: "Reference"
title: "Supabase Data Model and RLS Policies"
description: "Reference for the TVI-CAMS Supabase schema — live 25 tables / eight enums after the ADR-001 billing domain applied, plus a provisional ADR-008 deadline column — the nine-migration ledger (eight applied and recorded by 2026-10-24, one provisional) with the #230 repo-vs-database drift and its three reconciliations, .gitignore as the second source of schema truth, the per-table RLS policy map, the ADR-007 dropout columns, storage policies for the private compliance-evidence bucket, the ADR-006 school registry and platform-admin boundary, the database.types.ts regeneration contract, anon-key client wiring, and RULES section 10 agent-conduct guardrails."
tags: ["supabase", "postgres", "row-level-security", "data-model", "migrations", "tenant-isolation", "platform-admin", "billing", "clerk", "nextjs"]
openwiki_generated: true
sources:
  - id: openwiki-source-2d7c3fc74d559a77432d62af
    resource: repo://.claude/hooks/check-mcp-health.sh
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-f5a489e5822d87c0b8fc66ef
    resource: repo://.mcp.json
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
  - id: openwiki-source-c03196c12ed34c5537bd329f
    resource: repo://app/(dashboard)/users/new/page.tsx
  - id: openwiki-source-c0ad955c03733d7d70ef6ec6
    resource: repo://app/api/webhooks/clerk/route.ts
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-6c5e30490a0c4602d7931405
    resource: repo://docs/adr/ADR-001-billing-and-domain-model.md
  - id: openwiki-source-aa73e0f7c001cde7c90e254e
    resource: repo://docs/adr/ADR-003-billing-packet-queue.md
  - id: openwiki-source-9c4f624af786337110d6df8a
    resource: repo://docs/adr/ADR-004-untracked-document-semantics.md
  - id: openwiki-source-624c50c8276ea1f31b187ca3
    resource: repo://docs/adr/ADR-005-demo-account-tenant-scoping.md
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-a201158b72d575d540d15779
    resource: repo://docs/adr/ADR-007-attendance-based-dropout-rule.md
  - id: openwiki-source-0d40866d6dce044e0547eef9
    resource: repo://docs/DATA_MODEL.md
  - id: openwiki-source-f40c5e629f69e6ce0839fdf0
    resource: repo://docs/DEMO_DATA_VALIDATION_PLAN.md
  - id: openwiki-source-dc20addc30fb71fa529c13bd
    resource: repo://docs/IMPLEMENTATION_PLAN.md
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
  - id: openwiki-source-9244ced37838980939ffbdc8
    resource: repo://modules/batches/domain/alerts.ts
  - id: openwiki-source-b465e228246df6e8641b81df
    resource: repo://modules/batches/domain/urgency.ts
  - id: openwiki-source-9a24e697708df788c06f44e3
    resource: repo://modules/billing/data/billing.ts
  - id: openwiki-source-24135802ec9b42acc8123951
    resource: repo://modules/billing/domain/packets.ts
  - id: openwiki-source-852e1f02d9b416ab767494ac
    resource: repo://modules/billing/domain/rates.ts
  - id: openwiki-source-1609d2ed970a0b6d52bddaeb
    resource: repo://modules/billing/domain/tracks.ts
  - id: openwiki-source-764eda3eb972fdc48c5584a5
    resource: repo://modules/documents/domain/compliance.ts
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
  - id: openwiki-source-acb73c82b90d7c0325351e5f
    resource: repo://supabase/migrations/README.md
  - id: openwiki-source-4614a1f5d04b7b7127b1eefd
    resource: repo://supabase/seed.sql
  - id: openwiki-source-d888b22083376431bb299336
    resource: repo://supabase/seeds/20260831120000_seed_dev_operational_data.sql
  - id: openwiki-source-ab3c62d5452f5df905bfc01d
    resource: repo://supabase/seeds/dev_profile_memberships.sql
  - id: openwiki-source-a05cedbd998904c07b2c5395
    resource: repo://supabase/seeds/README.md
  - id: openwiki-source-ed8b9458b94ac5a0bce68fde
    resource: repo://supabase/seeds/verify_user_admin_setup.sql
  - id: openwiki-source-c25ad52388e27abc8c91b43f
    resource: repo://tests/unit/auth-provisioning.test.ts
  - id: openwiki-source-15e8a5a27099d775d1c019e1
    resource: repo://tests/unit/tenant-scope.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-10-26T00:51:40.902Z" }
verified:
  - by: openwiki/0.5.0
    at: 2026-10-26T00:51:40.902Z
---


# Supabase Data Model and RLS Policies

This page documents the database: what the schema is, how Postgres row-level security decides every authorization, which migration created what, and the contract that keeps the TypeScript types honest. TVI-CAMS is a single Next.js app talking directly to **one hosted Supabase project (Postgres + Storage)** with Clerk as identity — there is no separate backend and no staging environment; the code side of the chain (Clerk token → anon-key client → RLS) is covered in [Client wiring and the anon-key pattern](#client-wiring-and-the-anon-key-pattern) below.

The checked-in history is **nine migrations** in `supabase/migrations/` — **eight applied and recorded as of the 2026-10-24 catalog re-verification, plus one provisional file not in the ledger** — and the live schema is the 18-table, seven-enum shape plus the ADR-001 billing domain (row 8), **applied since 2026-10-04**, plus ADR-007's dropout columns. Reaching that 2026-10-24 state took three separate reconciliations of the 2026-09-10 **#230** drift, each recorded in [`supabase/migrations/README.md`](/supabase/migrations/README.md). Both directions of that drift are now closed, but the history is still read from records first: RULES §10 rule 36 forbids running anything against the live project without explicit permission — `execute_sql` included, read-only `select`s and all, because the tool is denied rather than the statement kind — and the records have a dated history of being wrong.

Two sources of truth, and one of them is invisible:

- **`supabase/migrations/` is the schema.** The directory listing, the ledger, and the live schema must agree before any migration can be trusted. They have disagreed three times (#230, then both halves of its resolution), so the ledger file's dated blocks outrank any ordering inferred from filenames.
- **[`.gitignore`](/.gitignore) is the other source of truth.** A migration that is **applied but ignored** — applied and then renamed, or applied while its ledger row was never written — makes the repo unreproducible: a rebuild from the database would silently omit it, and the recorded version would no longer match a filename. That is the exact hazard ADR-007's rename closed, and it is why the ledger records version strings at all.

Three ground rules frame everything below:

- **RLS is the security boundary; UI hiding is usability only.** Every authorization decision is made by Postgres RLS through the `app_private.*` helper functions (RULES §1 rule 1, [`RULES.md`](/RULES.md)). A JS-side tenant filter is not access control even when it returns the right answer (rule 2) — it signals the query was written assuming no RLS.
- **Supabase holds internal working copies only.** TESDA SIS, T2MIS, and BSRS remain the authoritative systems; nothing in this schema may be presented as official TESDA approval ([`docs/SUPABASE_SCHEMA_GUIDE.md`](/docs/SUPABASE_SCHEMA_GUIDE.md)). This includes the billing domain: `billing_records` is an append-only *generation log* (ADR-001 NoLedger), not an accounts ledger and not an official TESDA billing record — the TESDA Provincial Office reconciles totals, and the app must not appear to.
- **Platform admin is a different axis, not a bigger role.** It is not a fifth `profile_role` value and grants nothing inside any tenant — its reach is the school registry only, and widening that is a boundary change needing its own ADR (rule 30, [ADR-006](/docs/adr/ADR-006-platform-admin-and-school-registry.md)).

Rule 2 is subtler than "no tenant checks in JS", and the current wording draws the line exactly. A `tenant_id = scope.tenantId` filter taken from a validated `TenantScope` (`modules/tenancy/domain/scope.ts`) is **allowed**: it only *selects* which of the caller's schools a screen shows, on top of RLS, and never grants access RLS would deny. What is banned is a JS tenant check used *as* authorization. [`tests/unit/tenant-scope.test.ts`](/tests/unit/tenant-scope.test.ts) pins the selection half — a scope is built only for a school the profile is a member of, and `resolveTrustedRole` reads `profiles.role` as the only authority, never Clerk metadata. How the mappers downstream consume the rows RLS allowed is [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).

## Migration history

The checked-in migration history is the only trustworthy description of the schema. [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) was the status ledger and still draws the table clusters, but since 2026-10 it is superseded for status by [`supabase/migrations/README.md`](/supabase/migrations/README.md), whose blocks are dated and catalog-verified rather than inferred. Applied vs pending is read from those records, never by querying the live project unasked (RULES §10):

| # | Version | File | Purpose | Status |
|---|---------|------|---------|--------|
| 1 | `20260528160300` | [`create_tenant_scoped_schema.sql`](/supabase/migrations/20260528160300_create_tenant_scoped_schema.sql) | **The canonical migration.** Creates the `app_private` schema, the seven enums, all 14 original tables, indexes, `set_updated_at` triggers, every `app_private.*` RLS helper, RLS enablement, all `public`-table policies, the reference-data seeds (tenants, programs, document catalog, billing rules), and the `compliance-evidence` storage bucket plus its policies. | applied |
| 2 | `20260705070510` | [`add_trainer_credentials.sql`](/supabase/migrations/20260705070510_add_trainer_credentials.sql) | Adds `trainer_credentials` (one row per trainer profile) with its trigger, RLS, and two policies. | applied |
| 3 | `20260717054607` | [`migrate_akb_tenant_and_drop_rogue_table.sql`](/supabase/migrations/20260717054607_migrate_akb_tenant_and_drop_rogue_table.sql) | Corrective migration: reconciles a hand-created rogue `public.tenant` table by copying its one real record (AKB) into the canonical `public.tenants` and dropping the rogue table. | applied |
| 4 | `20260831120000` | [`seed_dev_operational_data.sql`](/supabase/seeds/20260831120000_seed_dev_operational_data.sql) | **Moved to `supabase/seeds/`** — a dev fixture, no longer a migration. Seeds dev operational rows: five `DEV-`-prefixed batches, placeholder learner rosters, per-batch document rows, and the `documents_batch_id_document_key_key` unique index. Data only, no DDL. | **not recorded; rows present on live** |
<!-- openwiki: broken internal link [</app/(dashboard] file "</app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
| 5 | `20260904120000` | [`add_user_admin_write_policies.sql`](/supabase/migrations/20260904120000_add_user_admin_write_policies.sql) | Four admin-only write policies that make [`/users/new`](</app/(dashboard)/users/new/page.tsx>) executable. Policies only, no DDL. | **applied by hand; repair-recorded 2026-10-04** (policies verified identical live) |
| 6 | `20260906120000` | [`ensure_invitation_membership_atomic.sql`](/supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql) | `public.ensure_profile_tenant_membership(...)` — the atomic invitation-membership function used by the Clerk webhook. One function, no DDL. | **applied 2026-10-04 via transactional migration** (the #230 gap, now closed) |
| 7 | `20260906114735` | [`add_school_registry_and_platform_admin.sql`](/supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql) | **ADR-006**: three tables (`qualifications`, `tenant_qualifications`, `platform_admins`), six new `tenants` columns, `app_private.is_platform_admin()`, `public.current_user_is_platform_admin()`, `public.create_school(...)`, the platform-admin policies, and an idempotent six-qualification seed. | applied |
| 8 | `20260910120000` | [`add_adr001_billing_domain.sql`](/supabase/migrations/20260910120000_add_adr001_billing_domain.sql) | **ADR-001 Phase 0.1** (issue #36, EPIC #19): seven tables, 16 new foreign keys, the `billing_type` enum (the eighth), columns on `batches`/`learners`/`program_billing_rules`, the widened `can_trainer_write_batch`, the `storage.objects` DELETE policy, and the cost-schedule seed. A **shape change**, not behaviour-only. | **applied; repair-recorded 2026-10-04** (full object inventory verified live: enum, 7 tables, 17 columns, 9 indexes, 6 triggers, 15 policies, 2 seed rows) |
| 9 | `20261024071359` | [`adr007_attendance_dropout_rule.sql`](/supabase/migrations/20261024071359_adr007_attendance_dropout_rule.sql) | **ADR-007** (Accepted): `attendance_records.excused`, `program_billing_rules.max_absence_percent` (replaces `max_absences`), `tenant_settings.max_absence_percent`, and three column comments. Additive. | **applied, verified live 2026-10-24** |
| — | `20261024110000` | [`add_dashboard_operational_fields.sql`](/supabase/migrations/20261024110000_add_dashboard_operational_fields.sql) | **ADR-008** (Proposed): `batches.billing_deadline` plus the partial index `batches_tenant_billing_deadline_idx`. Additive. | **PROVISIONAL — not applied, not in the ledger** |

**The #230 drift, how it was closed, and what each half cost.** (Recorded 2026-10-24, in the ledger's own terms.) The live project was *ahead* of its records in two places — row 5's policies and row 4's rows had been applied or inserted by hand — while row 6 was genuinely *behind* it, and the two directions read as one problem. They were separated on 2026-10-04: row 5 was **repair-recorded** after the policies were verified identical live, and row 6 was **applied through a transactional migration** rather than hand-written SQL, which unblocked `modules/auth/data/provisioning.ts`'s RPC path. The same round repair-recorded row 8 by verifying its whole object inventory live, and row 7's filename was renamed from `20260906130000` — before, in that case, any need to prove the objects matched. **Repair-recording is the same compromise the original by-hand apply made**: the database was already right, so the check was that objects match, not that re-running a file reproduces them. The ledger says so explicitly.

**The filename lesson (2026-10-24).** Applying ADR-007 through `apply_migration` recorded version `20261024071359` while the file had been written as `20261024063000`. Left alone, that is #230 again: a recorded version matching no filename makes `db push` re-run the file against a database that already holds its objects. The file is now named for the version actually recorded, and the standing advice is to check the version the MCP tool recorded and rename to match. One drift survives all of it: live `public.tenants` carries a policy **"Tenants selectable by Clerk user" that no migration defines**, and it omits the `is_active` check its reviewed counterpart enforces — so the `tenants` row of the [policy map](#per-table-policy-map) describes checked-in intent, not every policy currently enforcing it.

**New migrations are additive; migration 1 is canonical.** After any migration you regenerate `lib/supabase/database.types.ts`, then update the affected mappers and domain types (RULES §3 rule 20, see [The database types regeneration contract](#the-database-types-regeneration-contract)). Row 9 is the case study: ADR-007 altered the columns row 8 *introduced* rather than editing that file, because a recorded file edits only the repository and never the database.

Two further details matter for the history:

- **Migration 3 is guarded.** No migration ever created `public.tenant` — it was made by hand in the hosted project with non-conforming columns (camelCase, int PK). On any database rebuilt from this history (fresh `db reset`, CI) the table is absent, so the migration wraps its statements in a `do $$ … $$` block with a `to_regclass('public.tenant') is null` short-circuit: PL/pgSQL resolves statement names at execution, so a rebuilt database skips the block instead of failing with `42P01`. The file carries the version it was applied under on the hosted project (2026-07-17) so the ledger and the repo agree and it is never re-applied.
- **Dev-only seeds.** `supabase/seeds/` holds the moved dev fixture plus the two hand-run seeds [`dev_profile_memberships.sql`](/supabase/seeds/dev_profile_memberships.sql) and [`verify_user_admin_setup.sql`](/supabase/seeds/verify_user_admin_setup.sql). Nothing there runs automatically. The latter two are seeds rather than migrations because they hardcode Clerk user IDs, and Clerk development and production instances issue *different* IDs for the same person; a migration carrying those values would run in production and insert rows keyed to users that cannot exist there — dead identities in the table RLS trusts most ([ADR-005](/docs/adr/ADR-005-demo-account-tenant-scoping.md)). See [Dev-only seeds](#dev-only-seeds).

## Core tables

The applied schema has **18 tables** — the 15 pre-ADR-006 tables (14 in the canonical migration + `trainer_credentials`) plus the three school-registry tables — and, since row 8 applied, the seven billing-domain tables: **25 tables, 52 foreign keys, eight enums**, all in `public`. [`docs/SUPABASE_SCHEMA_GUIDE.md`](/docs/SUPABASE_SCHEMA_GUIDE.md) is superseded for implementation (banner dated 2026-09-05) and kept for design rationale and the TESDA boundary. Every tenant-owned table carries a `tenant_id`, and the tenant boundary is enforced structurally as well as by RLS: composite natural keys are tenant-scoped (e.g. `batches` unique on `(tenant_id, batch_code)`, `learners` on `(tenant_id, batch_id, learner_no)`, the three LAMR detail tables all include `tenant_id` in their uniqueness constraints) — the four new tenant-scoped billing-domain tables follow the same pattern, and their three global ones (`program_modules`, `scholarship_cost_schedule`, `learner_identities`) are deliberately tenant-less.

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
        numeric max_absence_percent "default 20.00, replaced the count by (9)"
    }
    batches {
        uuid id PK
        uuid tenant_id FK
        uuid program_id FK
        text batch_code
        lifecycle_stage current_stage
        batch_status status
        uuid trainer_profile_id FK
        text rqm_code "unique per tenant when set, (8)"
        int total_sessions "nominal hours over 8, (8)"
        date billing_deadline "nullable, provisional (–)"
    }
    learners {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        text learner_no
        text uli
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
```
*The original 15 tables and their relationships (the four clusters of `docs/DATA_MODEL.md`, flattened). `batches.program_id` references `scholarship_programs` with no delete behavior (restrict); most other references cascade, and profile references that record authorship (`created_by`, `submitted_by`, `verified_by`, `marked_by`) use `ON DELETE SET NULL` so deleting a profile never destroys compliance history.*

### Table catalog

- **`tenants`** — the schools (AKB, J3ED, NEN in the seed). Natural key `code`; `region`/`school_type` are plain text. ADR-006 added six columns: `tesda_provider_code` (the school's TESDA provider number, e.g. `1263` — it appears inside both COPR numbers and batch RQM codes, the join between a school's certificates and its batches; nothing parses it yet, the column records the fact), `province`, `city_municipality`, `street_address`, `provider_type`, `provider_classification` (the last two exist to unblock the T2MIS export, which hardcoded `'Private'` and `'TVIs'`; `province`/`city_municipality` are authoritative going forward while `region` keeps its free-text shape and the export falls back to splitting it for the three seeded schools).
- **`profiles`** — one row per Clerk user: `clerk_user_id` (unique), `role` (`profile_role`), `is_active`. This is the row RLS actually reads. There is **no insert/update policy for `authenticated` in the applied base schema** — profiles are written by the service-role Clerk-webhook provisioning path and by admin assignments via [`/users/new`](#profile-provisioning-and-user-administration) (row 5, applied and repair-recorded — see [Per-table policy map](#per-table-policy-map)).
- **`profile_tenant_memberships`** — the join table granting a profile access to a tenant; unique `(tenant_id, profile_id)`, `is_default` flag, `ON DELETE CASCADE` on both ends. In practice a profile holds exactly **one** membership (ADR-005 decision 1; multi-membership is out of scope in [`CONTEXT.md`](/CONTEXT.md)). `can_access_tenant` grants on *any* membership and ignores `is_default`, which is why a second membership would merge tenants into one unscoped list.
- **`scholarship_programs`** — configurable TESDA *funding* programs (TWSP, CFSP), keyed by `code`. Deliberately **not** the home for a school's programs — those are TESDA-registered qualifications (see `qualifications`); reusing the table would corrupt the ADR-001 billing model. The billing domain keeps the two axes apart structurally: `program_modules` and `scholarship_cost_schedule` each join a `scholarship_programs` row to a `qualifications` code.
- **`program_document_requirements`** — the per-program document catalog: `document_key`, name, `required_for_stage`, `audience`, `sort_order`; unique `(program_id, document_key)`. Powers the compliance checklist.
- **`program_billing_rules`** — one row per program (unique `program_id`); `progress_threshold_percent` CHECK 0–100, seeded at **80**. Explicitly an internal billing-*preparation* signal, not TESDA billing approval. ADR-007 (row 9) replaced the fixed count with `max_absence_percent numeric(5,2) not null default 20.00`, CHECK `> 0 and <= 100`, and **dropped `max_absences`**. This is not a rename: 4 was a *count of sessions*, 20.00 a *share* of the batch's snapshotted `total_sessions`, so a cast would have read 4 as "4 percent" and let a 45-session batch allow 1 absence instead of 9. Allowed absences are `floor(total_sessions * percent / 100)` and the next absence disqualifies — the old `actual > allowed` shape with `allowed` derived per batch (ADR-007 Elig-2). No shipped code read either column (`modules/attendance/domain/eligibility.ts` is still unbuilt), so what was lost is a retired rule's configuration, never learner or attendance data.
- **`batches`** — the central record. Tenant-scoped, unique `(tenant_id, batch_code)`. Carries `current_stage` (`lifecycle_stage`, default `'aou'`), `status` (`batch_status`, default `'pending'`), `progress_percent` and `billing_report_status` (CHECK-bounded), `trainer_profile_id` (nullable, `SET NULL`), plus denormalized `trainer_name` and `official_system_reference`. `qualification_title` stays **free text with no FK to `qualifications`** — making it one would break `mapBatchRow` and every existing row (ADR-006 consequence). Row 8 added 15 columns — the RQM/NTP authorization, the schedule, the BB1 cost snapshot, and `entrepreneurship_delivered` — plus the partial unique index enforcing one RQM code per tenant; deliberately *not* `billing_deadline` or `sessions_held` (see the [three deliberate non-changes](#three-deliberate-non-changes-recorded-in-the-header-as-load-bearing-decisions) and the provisional file that revisits the first).
- **`learners`** — the roster; unique `(tenant_id, batch_id, learner_no)`, `uli` is the permanent learner key (null for synthetic rows), `assessment_result` default `'pending'`, `entrepreneurship_completed` (row 8). The partial index `learners_uli_idx` covers `uli`, which the permanent key never got.
- **`documents`** — one evidence record per (batch, document key): `status` default `'missing'`, `audience` default `'all'`, `storage_path`/`external_url`, `submitted_by`/`verified_by` (`SET NULL`). `document_key` is plain text — **no FK to the catalog**, so an unknown key produces a silently orphaned "untracked" row (the open half of the doc-key mismatch; see [ADR-004](/docs/adr/ADR-004-untracked-document-semantics.md)).
- **`lamr_reports` / `lamr_outcomes` / `lamr_activities` / `lamr_entries`** — the Learners Achievement Monitoring Report structure: a report header per batch (with optional source document), outcomes under it, activities under outcomes, and learner-by-activity marks (`is_completed`, `assessment_result`, `marked_by`). Uniqueness is tenant-scoped at each level: `(tenant_id, lamr_report_id, outcome_code)`, `(tenant_id, outcome_id, activity_code)`, `(tenant_id, learner_id, activity_id)`. `lamr_entries` denormalizes `lamr_report_id` next to `activity_id` so RLS policies and its index can filter by report without a join. ADR-001 expects one LAMR per module per batch; the `lamr_reports.module_id` FK that would enforce it is still deferred.
- **`activity_log`** — append-only audit trail: `action` (`activity_action`), `entity_type`/`entity_id` (polymorphic pointer, no FK), `summary`, `metadata jsonb`. Only `created_at` — no `updated_at`. Attendance corrections (ADR-001 X2) append events here.
- **`trainer_credentials`** — one row per profile (unique `profile_id`, `CASCADE`): `credential_number`, `certified_nc_levels text[]`, `specialization`, `accreditation_expiry`.
- **`qualifications`** (ADR-006) — the **national** qualifications registry: unique TESDA `code` (e.g. `AFFOAP212`), `title`, `nc_level`, `sector`, `is_active`. Shared reference data, not tenant data — "Organic Agriculture Production NC II" means the same thing at every school, and storing it per-tenant would produce one spelling per school. Seeded idempotently with six rows. One seeded row, `AFFACP211`, anchors an unresolved code discrepancy: ADR-001 §3 writes Agricultural Crops Production NC II as `AFFACP213`, and the seeded cost row uses `AFFACP211` because that is the row the FK requires — which is right has never been verified against TESDA's registry, and if it is `AFFACP213`, both the registry seed and the cost-schedule seed need correcting.
- **`tenant_qualifications`** (ADR-006) — the per-school registration link row: `tenant_id` (CASCADE) + `qualification_id` (no delete behavior), unique `(tenant_id, qualification_id)`, plus the per-school facts that differ: `copr_number` (**nullable** — a school is routinely entered while its certificate is still being issued, and a required field would make the operator invent a number), `registration_status`, `delivery_mode`, `valid_until`. The certificate says COPR; the T2MIS import/export code says CTPR — same number, and the column takes the certificate's name while the export's `'CTPR'` header stays because it must match the file TESDA hands back.
- **`platform_admins`** (ADR-006) — one row per platform admin: `profile_id` (primary key, `references profiles ON DELETE CASCADE`), `note`, `created_at`. RLS enabled with **no policies** — the table is unreadable and unwritable through the anon client, which is what stops the role from being self-granted. See [School registry and platform admin](#school-registry-and-platform-admin-adr-006).
- **`program_modules`** (8) — the fixed module list per (funding program, qualification): `module_title`, `module_order`, `nominal_hours`, `is_active`; unique `(program_id, qualification_code, module_order)`. Global reference data, no `tenant_id`.
- **`scholarship_cost_schedule`** (8) — the TESDA Schedule of Cost as reference data, current rates only: `training_hours`, `training_days`, `training_cost`, `assessment_fee` (recorded, never billed), `tsf_day_rate` (default 160), `new_normal`, `insurance_fee`, `entrepreneurship_fee`; unique `(program_id, qualification_code)`. Global reference data, no `tenant_id`; the batch snapshots its matching row at creation.
- **`learner_identities`** (8) — ADR-001 Q1's thin global learner-identity dimension and a **future seam only**: `uli` (PK), `full_name`. Created empty, left empty in MVP, RLS-enabled with **no policy and no grant** — a deliberate deny-all for every role until an agreed purpose justifies opening it.
- **`attendance_records`** (8, altered by 9) — per-learner, per-session-date attendance: `attendance_date`, `time_in`, `time_out`, `present`, `excused`, `notes`, `marked_by`/`marked_at`; unique `(tenant_id, batch_id, learner_id, attendance_date)`. Mutable in place, never locked even post-billing; sessions held is a count over this table. `excused boolean not null default false` is ADR-007 Elig-3, meaningful only where `present = false` — the safe default is unexcused, because silently excusing an absence understates dropout risk. Consecutive-unexcused streaks count over *recorded* rows ordered by `attendance_date` (Elig-4): no session-calendar table exists, so a date with no row is unmarked, not absent.
- **`batch_trainer_assignments`** (8) — the trainer↔batch join (M2): `trainer_profile_id`, `is_lead`, `assigned_by`; unique `(tenant_id, batch_id, trainer_profile_id)`. Supersedes the single `batches.trainer_profile_id` pointer, which is retained.
- **`billing_records`** (8) — the **NoLedger generation log**: `billing_type`, `tranche`, `version`, `amount`, `scholar_snapshot jsonb`, `generated_by`; unique `(tenant_id, batch_id, billing_type, tranche, version)`. No `updated_at`, no UPDATE/DELETE policy — append-only enforced in the database.
- **`tenant_settings`** (8, altered by 9) — one row per school (`tenant_id` unique): signatories plus `letterhead_ref`, `addressee`, `partial_billing_enabled`, `progress_threshold_percent`, and `max_absence_percent numeric(5,2)` CHECK-bounded and **nullable**, where null still means "inherit the program rule" — a nullable override, never a duplicated default, so the two cannot silently disagree.

### The enums

Eight: the seven created in the canonical migration and mirrored 1:1 in `database.types.ts`, plus `billing_type` from row 8 (which is **not** mirrored — the file is unregenerated for it):

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

ADR-006 deliberately added **no** enum: platform admin is a table, not a fifth `profile_role` value, and `school_type` stays free text (TESDA's provider vocabulary shifts between issuances). `billing_type` (8) mirrors `BillingTrackId` in [`modules/billing/domain/tracks.ts`](/modules/billing/domain/tracks.ts) exactly, so the mapper needs **no** enum bridge, and the assessment fee is absent by design — ADR-001 TVI-scope assigns it to the Assessment Center, and adding it here would imply the app generates billing it must not generate. Because the mappers use **total** enum-bridge maps for the existing enums (e.g. `DB_TO_UI_STAGE` in `modules/batches/data/batches.ts`, `DB_TO_UI_ROLE` in `modules/tenancy/data/tenancy.ts`), a new enum variant added by a migration fails compilation until its UI treatment is chosen — the enum set is a contract, not just data.

### Triggers

A single shared function, `public.set_updated_at()` (before-update, sets `updated_at = now()`), is attached to **21 tables**: the 12 updatable tables of the canonical migration, `trainer_credentials` (2), the two ADR-006 tables `qualifications` and `tenant_qualifications` (7), and six of the seven row-8 tables (`attendance_records`, `batch_trainer_assignments`, `tenant_settings`, `program_modules`, `scholarship_cost_schedule`, `learner_identities`). `profile_tenant_memberships`, `activity_log`, and `platform_admins` have no `updated_at` column and no trigger — memberships converge explicitly (the dev seed deletes and reinserts), the audit log is append-only, and the admin list is grant-once. Row 8 deliberately attaches **none** to `billing_records`: no `updated_at`, no UPDATE policy, so a before-update trigger could never fire; the absence is part of the append-only signal. `execute` on `set_updated_at` is revoked from `anon` and `authenticated`.

## School registry and platform admin (ADR-006)

Migration 7 ([`20260906114735`](/supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql)), implemented by [ADR-006](/docs/adr/ADR-006-platform-admin-and-school-registry.md) (accepted 2026-09-06, supersedes the PRD's FR-02 "Super Admin is not implemented" prohibition), closes the hole the user screen left: `/users/new` grants a person access to a school that **already exists**, and nothing created the school — the three tenants were inserted by hand at the bottom of the canonical migration, so onboarding a new TVI meant editing SQL.

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

**A platform admin exists (P1).** An operator outside every tenant who provisions schools on request, in the way TESDA itself issues T2MIS/BSRS accounts. The alternatives were all worse: an admin auto-enrolling themselves in a created school would let every school admin mint schools; keeping schools migration-only means no add-school screen, which is the requirement.

**A table, not an enum value (P2).** `profile_role` is a *tenant-scoped* vocabulary — every base policy switches on `current_role()`, so a fifth value would silently widen or narrow each one until re-audited. Platform admin is a different axis: not "a bigger admin" but "not in any tenant". `platform_admins` carries **no policies and no grants for `authenticated`**, so it cannot be read or written through the Clerk-scoped anon client at all — that is what stops the role from being self-granted through any application path. The deny comes from RLS-with-no-policies, not from withholding privileges: Supabase ships default privileges granting every new `public` table to `anon` and `authenticated` regardless, and the post-apply probe confirmed `authenticated` holds all seven privileges while an `insert` still fails with a row-level-security violation. The linter's `rls_enabled_no_policy` (INFO) here is the design, not a defect — any policy is a way in. Enrolling a platform admin is a statement run against the project directly (gated by RULES §10): `insert into public.platform_admins (profile_id) select id from public.profiles where email = '<operator email>';`.

**Resolution.** `app_private.is_platform_admin()` — `stable`, `security definer`, `search_path ''`, granted to `authenticated` and revoked from `public`/`anon` — is `exists (platform_admins join profiles where profile_id = current_profile_id() and is_active = true)`. The application asks through `public.current_user_is_platform_admin()`, a second `security definer` returning **only the caller's boolean, never the membership list** (the table is deliberately unreadable, so this is the one question a SELECT cannot answer). [`modules/tenancy/data/platform.ts`](/modules/tenancy/data/platform.ts) wraps it in a `cache()`-ed snapshot — `getPlatformAdminSnapshot()` returns `data === true` (an unresolved answer shows the smaller surface, never the larger), and `isPlatformAdmin()` treats every failure as *not* a platform admin for the sidebar, where a failed check should hide the row rather than link into a denial.

**The boundary (P3).** A platform admin can create a school, read every school's name and program list, and seat a school's first member. They cannot read one scholar record, one document, or one billing figure. The reach is exactly: `tenants` (SELECT/INSERT/UPDATE), `qualifications` (active-row SELECT for any authenticated user, FOR ALL for platform admins), `tenant_qualifications` (SELECT for tenant members or platform admins, FOR ALL for platform admins), `profiles` (unassigned only, SELECT), and `profile_tenant_memberships` (SELECT all rows, INSERT first members only) — checkable as `grep is_platform_admin` over the migrations. **Granting `is_platform_admin()` access to any compliance table (`batches`, `learners`, `documents`, `lamr_*`, `activity_log`), or letting it seat itself into a tenant, is a boundary change that needs its own ADR** (RULES §7 rule 30). Rule 30 names the boundary in the same terms: registry tables (`tenants`, `qualifications`, `tenant_qualifications`), unassigned `profiles`, and seating a tenant's first member.

The one sharp edge is the seating INSERT policy, "Platform admins can seat a tenant's first members". Without it, a newly created school is permanently unstaffable — the row-5 admin grant policy requires `can_access_tenant(tenant_id)`, which a platform admin, belonging to no tenant by design, can never satisfy. The policy carries **two guards, and neither may be removed**:

1. `profile_id <> app_private.current_profile_id()` — the operator seats other people, never themselves. This closes the escalation: `can_access_tenant()` resolves purely from `profile_tenant_memberships`, so an unconstrained INSERT there would let an operator hand *themselves* everything that function gates in one statement. The first draft lost exactly this boundary — written as a plain `with check (app_private.is_platform_admin())` that constrains the actor and says nothing about the row — and review caught it before the migration was applied.
2. a `not exists` subquery admitting only tenants that have **no members yet** — "first members", as the name says. Racy under concurrent inserts, tolerable because guard 1 holds regardless; the worst outcome is two seated members rather than one.

Guard 2 has an ordering dependency: its subquery reads `profile_tenant_memberships` through that table's SELECT policies, so it is correct only because the companion policy "Platform admins can read tenant memberships" shows the caller every row. Deleting or narrowing that SELECT policy would silently weaken the INSERT. Neither SELECT policy recurses — both resolve through `security definer` helpers that read `platform_admins`/`profiles`, never back into the memberships table. There is **no matching DELETE**: revoking a membership is the school admin's operation, and the platform admin seats the first admin and steps back out.

**`create_school` (P6).** `public.create_school(p_code, …, p_qualifications jsonb) returns uuid` is **`security invoker`, deliberately** — the function exists for transactionality (a school and its program list must land together, because a partial write leaves a school with no registered program, which cannot legally run a batch, with nothing on screen to say so), not for authorization. RLS still evaluates every statement inside it, so a caller who is not a platform admin gets a policy violation from the INSERT, not a privilege — the security boundary stays exactly where RULES §1 rule 1 puts it. It is granted to `authenticated` (revoked from `public`/`anon`), because its caller is a signed-in operator — unlike `ensure_profile_tenant_membership` (row 6), which is also `security invoker` but granted to `service_role` only because the webhook has no session.

**Writes to `tenant_qualifications` are platform-admin-only for now (P7).** School admins maintaining their own program list is a deliberate follow-up (one additional policy), not an oversight. Deliberately not done: no `/schools` list route, no edit or deactivate flow, and `batches.qualification_title` stays free text.

## The ADR-001 billing domain (row 8)

[`20260910120000_add_adr001_billing_domain.sql`](/supabase/migrations/20260910120000_add_adr001_billing_domain.sql) is the Phase 0.1 schema of [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md) (issue #36, EPIC #19; [IMPLEMENTATION_PLAN](/docs/IMPLEMENTATION_PLAN.md) §0.1). It is **additive** — seven new tables, columns on three existing ones, a widened RLS helper, a closed storage-policy gap — and it **alters no existing column and drops nothing**. The header was written expecting a pending file; the ledger repair-recorded it on 2026-10-04 with its full object inventory verified live, and it is applied.

```mermaid
erDiagram
    scholarship_programs ||--o{ program_modules : "fixed modules per program"
    qualifications ||--o{ program_modules : "modules keyed by qualification"
    scholarship_programs ||--o{ scholarship_cost_schedule : "rates per program"
    qualifications ||--o{ scholarship_cost_schedule : "costs per qualification"
    tenants ||--o{ attendance_records : "owns"
    batches ||--o{ attendance_records : "session attendance"
    learners ||--o{ attendance_records : "one row per learner per date"
    tenants ||--o{ batch_trainer_assignments : "owns"
    batches ||--o{ batch_trainer_assignments : "assigned trainers"
    profiles ||--o{ batch_trainer_assignments : "the trainer"
    tenants ||--o{ billing_records : "owns"
    batches ||--o{ billing_records : "versioned snapshots"
    tenants ||--o| tenant_settings : "one row per school"
    learners |o..o{ learner_identities : "shared uli value, not an FK"

    program_modules {
        uuid id PK
        uuid program_id FK
        text qualification_code FK
        text module_title
        int module_order
        numeric nominal_hours
        boolean is_active
    }
    scholarship_cost_schedule {
        uuid id PK
        uuid program_id FK
        text qualification_code FK
        int training_hours
        int training_days
        numeric training_cost
        numeric tsf_day_rate "default 160"
        numeric assessment_fee "recorded, never billed"
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
        time time_in
        time time_out
        boolean present
        boolean excused "default false, added by (9)"
        uuid marked_by FK
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
        jsonb scholar_snapshot
    }
    tenant_settings {
        uuid id PK
        uuid tenant_id UK
        text prepared_by
        text approved_by
        boolean partial_billing_enabled
        numeric max_absence_percent "nullable override, (9)"
    }
```
*The seven ADR-001 tables, drawn as their own cluster — the convention `docs/DATA_MODEL.md` uses for the ADR-006 tables — rather than redrawn into the 15-table clusters. `program_modules` and `scholarship_cost_schedule` sit on the (funding program × TESDA qualification) pair; the dotted `learner_identities` edge is a value relationship (the same ULI across tenant-scoped rows), not a foreign key.*

**`billing_type` — the eighth enum.** Values `training_cost`, `tsf_allowance`, `entrepreneurship`, mirroring `BillingTrackId` in [`modules/billing/domain/tracks.ts`](/modules/billing/domain/tracks.ts) exactly, so the mapper needs no enum bridge (contrast `DB_TO_UI_STAGE`, which exists because `lifecycle_stage` and the UI stage keys diverged). The assessment fee is **absent by design**: ADR-001 TVI-scope assigns it to the Assessment Center. It is not yet in `database.types.ts` (see [The database types regeneration contract](#the-database-types-regeneration-contract)).

**The seven tables.**

- **`program_modules`** and **`scholarship_cost_schedule`** are **global reference tables with no `tenant_id`** — TESDA's module lists and rates are the same for every school, and a `tenant_id` would not be extra safety, it would assert that two schools can hold different official rates for the same qualification — exactly the drift a compliance tool exists to prevent. Both reference `scholarship_programs` (the *funding* program) **and** `qualifications` (the national TESDA registry) — the two axes ADR-006 keeps apart; collapsing them corrupts the billing model. The cost schedule holds **current rates only** (BB1-prune: no `circular_no`/`effectivity_date` — version-safety lives in the batch snapshot, so effectivity columns here would be a second, competing versioning mechanism), and records `assessment_fee` for completeness while the app never bills it.
- **`learner_identities`** is Q1's future seam: ULI uniqueness is **by value, not by shared row** — the same person at two schools is two tenant-scoped `learners` rows carrying the same ULI. It does not perform cross-school double-enrollment detection, and TESDA's systems remain the authoritative lifetime record. Created empty, stays empty in MVP, and deliberately granted no policy at all — a seam nobody can read cannot leak cross-school learner data by accident.
- **`attendance_records`** implements C2/PathA/X2: per learner per session date with `time_in`/`time_out`; OCR is deferred, so trainers enter these rows manually and upload the signed paper sheet as evidence, and when OCR lands it writes the same rows — the schema does not change, only the writer. Rows stay **mutable in place, never locked, even post-billing** (deliberately no lock flag); each correction appends an `activity_log` event. ADR-007 added `excused` here, and the dropout threshold pairs with `total_sessions`: a batch without the snapshot makes the percentage rule unevaluable.
- **`batch_trainer_assignments`** (M2) supports co-trainers and trainers who work across schools. It supersedes the single `batches.trainer_profile_id` pointer, which is **retained** — still populated, still read for display — so nothing breaks; see the helper widening below.
- **`billing_records`** is the **NoLedger generation log** — explicitly *not* an accounts-receivable ledger and not an invoice table: no running envelope, no over-billing guard, no balance, because the TESDA Provincial Office reconciles totals and the app must not appear to. Y-hybrid re-generation appends a NEW row at the next `version` (the "student 5 forgotten" case: ₱137,000 → ₱145,200), and that append-only property is **enforced in the database, not by convention**: the RLS section grants SELECT and INSERT and deliberately grants no UPDATE and no DELETE policy, the table carries no `updated_at` column and no trigger, and its comment says "do not add them". ADR-003 keeps the boundary on top: a packet is a projection over `(batch_id, billing_type, tranche)`, only the `generated` state writes here, and `submitted`/`settled` are user-asserted bookkeeping marks, never system-verified facts (P3).
- **`tenant_settings`** holds the per-school document settings the generated `.docx` needs (W1 keeps the school's own template): signatories, `letterhead_ref`, `addressee`, `partial_billing_enabled`. `max_absence_percent` (ADR-007) **overrides** the program rule when set — null means "use the program rule", and the column has no default precisely so an override cannot be born accidentally. `progress_threshold_percent` (0–100) is the tenant-level analogue.

**Columns on existing tables.** `batches` gained **15 columns** — all nullable except the boolean, because existing batches predate these facts and defaulting them to a made-up value would be worse than an honest null in a compliance tool: the RQM/NTP authorization (`rqm_code`, `ntp_number`, `approved_slots` — the billable-pax cap, bill fewer for dropouts never more; `total_amount` — the RQM funding envelope, recorded but not enforced as a ledger; `indicative_start_date`, `ntp_approval_date`, `ntp_received_date` — Card: one RQM code = one batch), the schedule (`schedule_pattern` — free text per D3: the weekly pattern affects how fast sessions are consumed and the calendar duration, **never** the session count; `total_sessions` — E2: nominal hours ÷ 8, snapshotted at creation, immune to later circular changes, 360 hrs → 45 sessions), the five BB1 cost snapshots, and `entrepreneurship_delivered` (the batch-level marker that triggers the entrepreneurship track). The **partial unique index** `batches_tenant_rqm_code_key` on `(tenant_id, rqm_code) where rqm_code is not null` enforces the RQM domain fact per tenant without colliding the existing all-null rows. `learners` gained `entrepreneurship_completed` (the Flag-3x dual-training guard, set by the registrar after verifying T2MIS/BSRS — three effects: TSF −3 days = −₱480, training duration −3 days, excluded from the ₱800 entrepreneurship billing) and `learners_uli_idx`.

**`can_trainer_write_batch` is widened — backfill first.** Section 7's **order matters**: the backfill copies every existing `batches.trainer_profile_id` into the join (`is_lead = true`, `on conflict do nothing`) *before* the `create or replace`, so at the moment the widened predicate takes effect the assignment set is exactly equal to the pointer set — it grants **nobody** new access on apply day, and only becomes meaningful when someone adds a co-trainer row. The `OR` (rather than replacing the pointer check outright) is a second belt: even if the backfill missed a row, no trainer loses access. That is what makes an edit to the security boundary safe to ship without a staging rehearsal.

### Three deliberate non-changes, recorded in the header as load-bearing decisions

1. **No `batches.billing_deadline` in row 8**, though issue #130 asks for one. ADR-003 P5 locks "`due_date` is derived, never stored — computed on read from the batch's tranche schedule", and per RULES §7 rule 30 the ADR outranks the issue. #130's real defect was that [`modules/batches/data/batches.ts`](/modules/batches/data/batches.ts) substituted `end_date` for the missing column (a `TODO(contract)` in the mapper) — a stored column would make that bug permanent.
2. **No `batches.sessions_held`.** ADR-001 §11 and TRD:267 both list `total_sessions` and stop. With `attendance_records` in place, sessions held is a **count over that table**. Storing it would create a second source of truth for progress, free to drift from the attendance it claims to summarise — the same failure mode as (1).
3. **No `lamr_reports.module_id` FK**, though ADR-001 §11 requires it: it alters a table holding live rows and changes its uniqueness, so it earns its own migration and its own review — folding a destructive change into an additive one hides it.

<!-- openwiki: broken internal link [</app/(dashboard] file "</app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
**Non-change (1) has since been revisited by a provisional file.** The defect was never fixed either: on 2026-10-24 a batch that finished training in December 2025 still drove the dashboard as `Dec 15 · -313 days left`, and P5's derivation has nothing to derive from because no live batch has a tranche schedule. [ADR-008](/docs/adr/ADR-008-recorded-batch-billing-deadline.md) (**Proposed**) therefore amends P5 for the **batch-level** deadline only: a nullable, recorded `billing_deadline`; urgency computed on read; null meaning "not recorded", never inferred from `end_date`; packet `due_date` untouched. Its file, [`20261024110000_add_dashboard_operational_fields.sql`](/supabase/migrations/20261024110000_add_dashboard_operational_fields.sql), is **PROVISIONAL**: not applied (its header says so), not in the ledger, both statements guarded. Do not count it as deployed schema. It would be applied through `apply_migration` on a yes, then renamed to whatever version Supabase records. `database.types.ts` already carries the column by hand ahead of it, and the mapper reads `row.billing_deadline ?? null` — never a bare read, because until the migration runs `select('*')` yields `undefined`, which would slip past every `!== null` "no deadline recorded" check downstream. `daysUntil(null)` returns the `Infinity` sentinel, which [`modules/batches/domain/urgency.ts`](/modules/batches/domain/urgency.ts) deliberately reads as the `muted` tier, and `hasRecordedBillingDeadline` gates the countdown — so no batch is styled as having a deadline it does not have. Nothing in [`app/(dashboard)`](</app/(dashboard)>) writes the column yet: deadlines must be entered by hand when the column lands.

**The attendance dropout rule (row 9) is columns, not code.** ADR-007 replaced the retired fixed ≥5-absence rule with the TESDA Omnibus default: a scholar is dropped when absences exceed `max_absence_percent` of the batch's snapshotted `total_sessions` (floored), **or** on 3 consecutive unexcused absences, whichever trips first — now a locked domain fact in [`RULES.md`](/RULES.md) and [`CONTEXT.md`](/CONTEXT.md). Three schema consequences matter for RLS and the data model: `attendance_records.excused` defaults to `false` because an unexcused default understates dropout risk; `tenant_settings.max_absence_percent` is a **nullable** override whose null means "inherit the program rule", so the two thresholds cannot silently disagree; and the percentage rule is unevaluable on a batch with a null `total_sessions`. The 3-consecutive streak counts over *recorded* rows ordered by `attendance_date` — there is no session calendar, so a date with no row is unmarked, not absent. `attendance_records` stays mutable in place with **no lock flag**, and a trainer corrects by `present`/`excused` UPDATE rather than by deleting.

The document rows carry their own distinct semantics, ADR-004's: `document_key` is plain text with **no FK to the catalog**, and a key the batch's own program catalog never claimed is **untracked** — outside both numerator and denominator of every percentage, `null` (rendered "—") when nothing is tracked at all, and **blocking** at a gate via `isDocOnFile`. [`modules/documents/domain/compliance.ts`](/modules/documents/domain/compliance.ts) is the single home of that rule, and [`modules/batches/domain/alerts.ts`](/modules/batches/domain/alerts.ts) fires its `doc-missing` row only once at least one *critical* requirement is actually tracked. What RLS contributes is upstream of all of it: the audience-gated `documents` policies decide which rows exist for the caller at all, so the mapper's backfill (`missing` for an absent row) only runs over a catalog the caller was allowed to load, and the compliance rules then classify the survivors.

**The storage gap is closed here too.** Section 9 adds the missing `storage.objects` DELETE policy for the `compliance-evidence` bucket — scoped tighter than its siblings (`can_manage_tenant`, not `can_access_tenant`): reading and uploading evidence is ordinary work for a trainer; destroying evidence in a compliance tool is not. See [Storage policies](#storage-policies).

**The cost-schedule seed — traceable values only.** Section 10 seeds one row each for TWSP and CFSP (a `select` from `scholarship_programs`, so it inserts zero rows rather than failing if the programs are absent; idempotent via `on conflict (program_id, qualification_code)`): every figure appears verbatim in ADR-001 §3, which cites Circular 015 s.2026 — 360 hrs → 45 days; TSF 45 × ₱160 = ₱7,200; New Normal ₱1,000; Insurance ₱100.80; Entrepreneurship ₱800; Training Cost ₱15,390 (carried from the source template "BILLING - FULL TRAINING COST.docx"). CFSP-only components (New Normal, Insurance, Entrepreneurship) are left **null** rather than zeroed on the TWSP row: null reads "does not apply to this program", zero reads "applies, and is free". [`modules/billing/domain/rates.ts`](/modules/billing/domain/rates.ts) also carries training costs for Rice Machinery Operations and Cookery, but its own header calls them "representative stand-ins" and they are not seeded — a missing rate row is a visible gap; a wrong one generates an official document with a wrong peso amount. Supply the rest from Circular 015 s.2026. A recorded introspection trap sits in the seed comment: an earlier draft called `scholarship_programs` empty from a `list_tables` `reltuples` estimate; a real `count(*)` found 2 rows.

**Single-shot, not re-runnable.** `add column` and `create index` are guarded with `if not exists`, but `create type`, `create table`, `create trigger`, and `create policy` are **not** — Postgres offers no `if not exists` for policies, so guarding only some of it would give a false impression that a re-run is safe. It is not: a second run fails at `create type public.billing_type`. That is fine inside a transaction, which is how the CLI and the MCP `apply_migration` tool both apply it — a failure rolls the whole file back. Piped to `psql` without an explicit `BEGIN`, a partial failure leaves objects to drop by hand, and the likeliest failure point is the `storage.objects` policy in section 9, which requires ownership of that table. ADR-007, by contrast, guards **every** statement and is a no-op on re-run.

**The dropout rule and the document-compliance rule are domain code, not columns.** Both were re-derived from the current sources because the surrounding prose had drifted.

**Attendance dropout (row 9 / ADR-007).** The retired fixed ≥5-absence rule is gone: a scholar is dropped when absences exceed `max_absence_percent` of the batch's snapshotted `total_sessions` (floored), **or** on 3 consecutive unexcused absences, whichever trips first — a locked domain fact in [`RULES.md`](/RULES.md) and [`CONTEXT.md`](/CONTEXT.md). Three schema consequences matter here: `attendance_records.excused` defaults to `false` because an unexcused default understates dropout risk; `tenant_settings.max_absence_percent` is a **nullable** override whose null means "inherit the program rule", so the two thresholds cannot silently disagree; and the percentage rule is unevaluable on a batch with a null `total_sessions`. The streak counts over *recorded* rows ordered by `attendance_date` — no session calendar exists, so a date with no row is unmarked, not absent. `attendance_records` stays mutable in place with **no lock flag**: a trainer corrects by `present`/`excused` UPDATE, never by deleting (the DELETE policy is `can_manage_tenant` only).

**Document compliance (ADR-004).** `document_key` is plain text with **no FK to the catalog**, and a key the batch's own program catalog never claimed is **untracked** — outside both numerator and denominator of every percentage, `null` (rendered "—") when nothing is tracked at all, and **blocking** at a gate through `isDocOnFile`. [`modules/documents/domain/compliance.ts`](/modules/documents/domain/compliance.ts) is the single home of that rule; [`modules/batches/domain/alerts.ts`](/modules/batches/domain/alerts.ts) fires its `doc-missing` row only once at least one *critical* requirement is actually tracked. RLS contributes upstream of all of it: the audience-gated `documents` policies decide which rows exist for the caller at all, the backfill (`missing` for an absent row) only runs over a catalog the caller was allowed to load, and the compliance rules then classify the survivors. Measurement and gating deliberately disagree about untracked — that divergence is the ADR, and both fail safe.

**Ground rule — the database is ahead of the application.** Nothing in the policy map below should be read as a claim that a screen exercises it. No application code fetches or writes any of the seven row-8 tables: [`modules/billing/data/billing.ts`](/modules/billing/data/billing.ts) derives billing cards from the batch plus the document matrix, and [`packets.ts`](/modules/billing/domain/packets.ts) still carries its "table not yet migrated" comment. The `max_absence_percent` / `excused` pair is uncalled too — no file under `app/`, `modules/`, `shared/`, or `lib/` names either column, and `modules/attendance/domain/eligibility.ts` is still a README promise — so ADR-007 exists as schema, column comments, and a locked rule, with the computed signal to come. The data-layer wiring and the `database.types.ts` regeneration (IMPLEMENTATION_PLAN Phase 0.2) both follow.

## The RLS decision machinery

RLS is enabled on all `public` tables — 25 — and `authenticated` holds blanket `select, insert, update, delete` on the `public` tables, **except** `billing_records`, which receives only `select, insert` — the **policies are the only gate** (the base migration's blanket grants were one-time statements over the objects that existed then, so each ADR-006 table carries its own grant, row 8's tables carry their own, and `platform_admins` receives the usual Supabase default privileges, which is why its deny must come from RLS). All decision logic lives in the `app_private` schema as small, `stable`, `security definer` functions with `set search_path = ''`, and every one is granted to `authenticated`.

The identity chain: the request carries the Clerk session token (see [client wiring](#client-wiring-and-the-anon-key-pattern)); RLS needs **only the standard `sub` claim** — no custom claims and no JWT template (Clerk deprecated Supabase JWT templates on 1 Apr 2025, and this schema never needed one). `app_private.current_clerk_user_id()` prefers `auth.jwt() ->> 'sub'`, with defensive fallbacks to a `clerk_user_id` claim and `app_metadata.clerk_user_id`.

```mermaid
flowchart TD
    TOKEN["JWT on the anon-key request"] --> CLERK["current_clerk_user_id — reads sub first"]
    CLERK --> PROFILE["current_profile_id — the active profiles row"]
    PROFILE --> ROLE["current_role — profile.role"]
    PROFILE --> ACCESS["can_access_tenant — membership exists for that tenant"]
    ROLE --> MANAGE["can_manage_tenant — admin or coordinator, and member"]
    ACCESS --> MANAGE
    ROLE --> READB["can_read_batch — admin, coordinator, viewer, or the assigned trainer"]
    ACCESS --> READB
    ROLE --> WRITEB["can_trainer_write_batch — trainer assigned to the batch, pointer or assignment row"]
    ACCESS --> WRITEB
    PROFILE --> PADMIN["is_platform_admin — platform_admins row, profile active"]
    MANAGE --> POL["table policies"]
    READB --> POL
    WRITEB --> POL
    PADMIN --> POL
```
*How a row-level policy resolves the caller: JWT `sub` → profile → role, plus tenant membership and the platform-admin axis, feeding the composite predicates every policy composes from.*

The helpers are what every policy composes; they are also where the failure modes live. Two of them fail closed in ways that are easy to break by accident — `current_profile_id()` returns NULL for an inactive profile (so deactivation cuts access instantly), and `can_access_tenant()` never consults `is_default` (so a second membership merges two schools into one unscoped list). Any change to the chain below changes every table at once.

1. **`current_clerk_user_id()`** → text. `coalesce` of the JWT `sub`, `clerk_user_id`, and `app_metadata.clerk_user_id`.
2. **`current_profile_id()`** → uuid. The `profiles` row where `clerk_user_id` matches **and `is_active = true`** (limit 1). An inactive or missing profile resolves to `NULL`, which fails every predicate — that is how deactivation cuts access instantly.
3. **`current_role()`** → `profile_role`. The matched profile's `role`.
4. **`can_access_tenant(target_tenant_id)`** → boolean. True iff a `profile_tenant_memberships` row links the current profile to that tenant and the profile is active. Grants on **any** membership; `is_default` is never consulted.
5. **`can_manage_tenant(target_tenant_id)`** → boolean. `current_role() in ('admin','coordinator')` **and** `can_access_tenant`. The management predicate for batches, learners, documents, LAMR, the reference tables — and, from row 8, attendance deletes, assignments, tenant settings, and billing appends.
6. **`can_read_batch(target_batch_id)`** → boolean. The batch exists, the caller can access its tenant, **and** the role is `admin`/`coordinator`/`viewer` — or the caller is the batch's `trainer` with `trainer_profile_id = current_profile_id()`. The read predicate for `batches`, `learners`, `documents` (indirectly), and all LAMR tables — and attendance reads. Deliberately **not** the read predicate for `billing_records`, whose SELECT is an explicit role allowlist excluding trainers.
7. **`can_trainer_write_batch(target_batch_id)`** → boolean. The caller is `trainer`, can access the tenant, and is assigned to the batch — originally only via `trainer_profile_id`, **widened by row 8** with an `or exists (batch_trainer_assignments …)` for the same batch and tenant, backfilled from the pointer first so nobody gains access on apply day. The trainer write predicate for documents, LAMR, and attendance insert/correct.
8. **`is_platform_admin()`** → boolean (ADR-006). `exists` over `platform_admins` for the current profile with `is_active = true`. A separate axis from `current_role()` — it reads `platform_admins`, never `profile_role`, and a platform admin typically holds no membership and may hold any tenant role without it mattering.

Three invariants follow from these definitions and are load-bearing:

- **In the applied schema, `admin` and `coordinator` are indistinguishable** — every check pairs them. The role therefore records who someone *is* (school proprietor vs. day-to-day staff, per [`CONTEXT.md`](/CONTEXT.md) and ADR-005), not what they may do, and both will silently gain any future admin-only capability. The first deliberate split is row 5, which scopes user administration to `current_role() = 'admin'` alone (not `can_manage_tenant`) as a recorded scope decision.
- **Trainers are batch-scoped, not tenant-scoped.** A trainer sees only batches they are assigned to (by pointer, or by the assignment join from row 8 on), can insert documents and manage LAMR only for those batches, and the document gate additionally requires `audience in ('trainer','all')`. The same scoping keeps trainers out of `billing_records` entirely (the SELECT allowlist names `admin`, `coordinator`, `viewer` — never `trainer`). **Viewer is read-only and must be server-denied on writes** (RULES §1 rule 4) — the point being that most write policies bottom out in `can_manage_tenant()`, which excludes `viewer` by role, so a viewer's INSERT/UPDATE/DELETE fails at the database rather than being hidden in the UI. The one write policy that reaches viewers at all is the `activity_log` append (`can_access_tenant`, no role predicate): the single place where the database does not itself enforce the read-only rule ([`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) flags the tension explicitly rather than assuming either reading is correct).
- **Platform admin is orthogonal to the tenant role.** Holding `admin` at a school grants nothing on `/schools/new`; being the operator makes you an admin nowhere. The `/schools/new` gate checks the platform boolean, never `profile_role`, and never the `?role=` preview override.

## Per-table policy map

The policy sections across the migrations give the following map. Unmarked rows are the applied base; **(7)** rows are applied with ADR-006 (file renamed `20260906114735` to match its recorded version); **(5)** rows were applied by hand and repair-recorded on 2026-10-04; **(8)** rows are the applied ADR-001 billing domain; **(9)** marks ADR-007, which adds columns but **no policies** — the `attendance_records` row already covers the `excused` column:

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
| `attendance_records` (8) | `can_read_batch(batch_id)` — a trainer cannot read another trainer's attendance | `can_trainer_write_batch(batch_id)` **or** `can_manage_tenant(tenant_id)` | update: same two-way gate (using + with check); **delete: `can_manage_tenant` only** — destroying billing evidence is not trainer work |
| `batch_trainer_assignments` (8) | `can_access_tenant(tenant_id)` | `can_manage_tenant(tenant_id)` (FOR ALL) | `can_manage_tenant(tenant_id)` (FOR ALL) |
| `billing_records` (8) | `can_access_tenant(tenant_id)` **and** `current_role() in ('admin','coordinator','viewer')` — explicit allowlist, **never trainer** | `can_manage_tenant(tenant_id)` | — (**no UPDATE or DELETE policy: append-only enforced in the database**; do not add them) |
| `tenant_settings` (8) | `can_access_tenant(tenant_id)` | `can_manage_tenant(tenant_id)` (FOR ALL) | `can_manage_tenant(tenant_id)` (FOR ALL) |
| `program_modules` (8) | `is_active = true` (any authenticated user) | admin/coordinator role check (FOR ALL, no tenant argument) | same |
| `scholarship_cost_schedule` (8) | `true` (any authenticated user) | admin/coordinator role check (FOR ALL, no tenant argument) | same |
| `learner_identities` (8) | — (RLS enabled, **no policies, no grant**: every operation denied — the deliberate future-seam deny-all) | — | — |

Notes on the map:

- The `documents` row is the one where **audience matters**: the `audience` enum gates the *trainer* read/insert/update path to `('trainer','all')`. The viewer branch reads any document in an accessible tenant, and the management branch reads everything — so `billing_report` (audience `admin`) is hidden from trainers, not from viewers, at the database layer. The trainer exclusion is *server-side by construction*: the embedded `documents(*)` select in [`modules/batches/data/batches.ts`](/modules/batches/data/batches.ts) simply returns no row for a document RLS withheld, and the mapper is written to stay unaware of the caller's role. Rule 5 asks for more than that and is a *second* gate: trainer-facing DTOs also omit billing deadline, billing preparation, NTP lag, BSRS, and financial fields even where the row itself is readable.
- LAMR detail tables resolve access **through the parent `lamr_reports` row** (`exists (select 1 from lamr_reports r where r.id = …)`), since they point at the report rather than the batch directly.
- The reference tables (`scholarship_programs`, requirements, billing rules) are effectively **global, not tenant-scoped** — read by any authenticated user (requirements unconditionally, programs/billing rules when active) and managed by admin/coordinator with no tenant argument. `qualifications` (7) follows the same global-read pattern for the national registry, and the row-8 reference pair continues it for the billing domain.
- **`billing_records` is the one table where the role list is spelled out.** SELECT admits `admin`, `coordinator`, and `viewer` — but never `trainer`: the read deliberately does not use `can_read_batch` (which would admit the assigned trainer, who would then read their own batch's billing amounts, against rule 5's server-side omission of financial fields from trainers) nor `can_manage_tenant` (which would lock out `viewer`, and rule 4 makes viewer read-only, not blind). Spelling the roles out also means a fifth role added later needs a decision here instead of silently inheriting one. INSERT is `can_manage_tenant`; there is no UPDATE or DELETE policy, and the grants omit them too — code cannot mutate a snapshot even if it tries. The allowlist is keyed on the caller's `profiles.role`, so it is the one place where a tenant role buys a *read* scope the batch helpers do not already express.
- **`learner_identities` is the second deliberate no-policy deny-all after `platform_admins`** — for a different reason: `platform_admins` blocks self-granting of a role the app needs, while `learner_identities` is an unpopulated seam that should stay unreadable until its purpose is decided.
- No table has a policy for `anon`: unauthenticated requests see nothing, and a signed-in user with no profile or membership also sees nothing — zero rows, no error (see [failure semantics](#failure-semantics)).
- **Admin-only is a scope decision, not an oversight (5).** `can_manage_tenant()` would have admitted coordinators, but a coordinator who could grant tenant access while an admin alone could set roles is a split boundary that drifts — one role owns the whole operation. Policy 1 (unassigned read) is deliberately **not** scoped to the admin's own tenants: an unassigned profile has no tenant to scope by, which is the whole point; the exposure is bounded to name/email of users who hold no access anywhere, and it ends the moment the profile is assigned.
- **The seating guards are the whole P3 boundary (7).** See [School registry and platform admin](#school-registry-and-platform-admin-adr-006) — both predicates on "Platform admins can seat a tenant's first members" are load-bearing, and the policy is correct only while the all-rows membership SELECT for platform admins exists. No row-8 or row-9 policy touches the platform-admin surface, and none grants it any billing table — the boundary holds by absence.

## Storage policies

Evidence files live in the **private** `compliance-evidence` bucket (50 MiB limit), which the canonical migration creates idempotently alongside the schema. Three policies on `storage.objects` scope every read/write operation to the caller's tenant **by the UUID path prefix, not by RLS on a column** — `storage.objects` has no tenant column, so the first path segment of the object name is the tenant UUID:

- **SELECT**, **INSERT**, **UPDATE** — all allowed only when `bucket_id = 'compliance-evidence'` **and** `can_access_tenant((storage.foldername(name))[1]::uuid)`.
- **DELETE** — added by row 8: `bucket_id = 'compliance-evidence'` **and** `can_manage_tenant((storage.foldername(name))[1]::uuid)`, scoped **tighter** than its siblings, because reading and uploading evidence is ordinary work for a trainer, while destroying evidence in a compliance tool is not. The gap was filed during the #41 evidence-storage work, where its absence meant a file uploaded in error could be overwritten but never deleted.

Note the path coupling: a document's `storage_path` must be laid out as `<tenant-uuid>/…` or its RLS predicates evaluate against the wrong (or no) tenant. No ADR-006 policy touches storage — a platform admin cannot read a single evidence file. Nor does the row-8 DELETE help them: it is `can_manage_tenant`, and a platform admin holds no membership.

## Profile provisioning and user administration

`profiles` has no write policy for `authenticated` in the applied base schema, so identity rows are created by the server-only webhook path in [`modules/auth/data/provisioning.ts`](/modules/auth/data/provisioning.ts), which runs on the **service-role** client (bypasses RLS by design — the only sanctioned use), reached from [`app/api/webhooks/clerk/route.ts`](/app/api/webhooks/clerk/route.ts) (Clerk-signed, unauthenticated by design):

- **`upsertProfileFromClerkUser`** — on `user.created`: inserts with `role` from a parseable **invitation grant** when one is present, otherwise `viewer` (least privilege), and **no membership row unless a grant carries one** — a self sign-up lands with no tenant access at all. On `user.updated`: syncs only `full_name`/`email`, then **repairs a missing invitation membership** (a membership insert that failed on `user.created` used to be permanent — the route still answered 200, so Clerk never retried). Role and `is_active` are never touched on update, so a Clerk profile edit can never change app-side authorization.
- **Membership writes go through `ensure_profile_tenant_membership`** (row 6, applied and verified 2026-10-04 with its `service_role`-only grant): the function's atomic zero-membership gate means a grant can never add a second school or move someone an admin has already placed, and it makes `is_default: true` correct by construction — the service-role client sees the whole truth, so "no members" there means *none*, unlike the RLS-scoped client in the admin path.
- **`deactivateProfileFromClerkUser`** — on `user.deleted`: sets `is_active = false` instead of deleting. A hard delete would cascade or orphan every FK pointing at the profile and destroy the audit trail; deactivation matches `current_profile_id()`'s `is_active = true` filter, so access stops immediately and history survives.

The assignment flow has shipped as two screens, both writing through the **anon-key** `createSupabaseServerClient` so Postgres RLS decides (the migration header's point: the write path is a Server Action carrying a Clerk session, so it must go through RLS — not the service-role client, whose reservation is the webhook):

<!-- openwiki: broken internal link [</app/(dashboard] file "</app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
- **`/users/new`** ([`modules/tenancy/data/users.ts`](/modules/tenancy/data/users.ts) + [`actions.ts`](</app/(dashboard)/users/new/actions.ts>)) — the admin-only screen (gated on `resolveTrustedRole`, never the `?role=` override, which would let anyone preview their way into the Clerk-invitation branch that has no RLS behind it). Path 1, *registered email*: `findUserByEmail` (escaped ILIKE patterns plus an exact-match re-check, so a wildcard can never assign access to the wrong person; `not-registered` is ambiguous by design — distinguishing "nobody has that address" from "they belong to another school" would leak other tenants' membership) then `assignUserAccess`, which runs the role UPDATE **before** the membership INSERT (the safer half to stop after) and, on INSERT failure, performs a best-effort `restorePriorRole` compensation — a half-applied promotion to `admin` could read and set roles on the whole unassigned pool, so a grant that fails should leave no trace. The INSERT always writes `is_default: false` (an RLS-scoped empty membership list means "none this admin can see", never "none"). Path 2, *unregistered email*: `inviteUser` parks the grant (role + tenantId) on the **Clerk invitation's `publicMetadata`** — Backend-API-only, so the signee cannot forge it — parsed all-or-nothing by [`modules/auth/domain/invitationMetadata.ts`](/modules/auth/domain/invitationMetadata.ts) (a half-formed grant yields `null` and the safe fallback), and applied by the webhook when the person signs up. **Both write paths work on live now**: row 5's policies are present (applied by hand, repair-recorded 2026-10-04) and the membership RPC exists since that same date.
- **`/schools/new`** ([`modules/tenancy/data/schools.ts`](/modules/tenancy/data/schools.ts) + [`platform.ts`](/modules/tenancy/data/platform.ts)) — the platform-operator screen: `listQualifications` (the national registry, readable by any signed-in user), `createSchool` (the `create_school` RPC, with failures told apart — `42501` → `denied`, `23505` on `tenants.code` → `duplicate-code`, anything else → `sync-failed`), and the platform gate. It is the first half of an onboarding pair: a brand-new school's first member comes from the applied platform-admin seating policy (a database capability the screen itself does not perform), after which the admin grant path in `/users/new` can staff it.

ADR-005 still frames [`supabase/seeds/dev_profile_memberships.sql`](/supabase/seeds/dev_profile_memberships.sql) as a *stopgap*, not a substitute: a freshly provisioned user resolves to zero rows until an admin assigns a tenant. With both assignment paths working, that framing is itself stale; the seed remains the way to give the three real dev users their RLS match before any assignment exists.

## Dev-only seeds

**The dev fixture (former row 4).** [`20260831120000_seed_dev_operational_data.sql`](/supabase/seeds/20260831120000_seed_dev_operational_data.sql) — now in `supabase/seeds/`, no longer a migration — seeds the rows the dashboard needs to demonstrate scoping (the ledger records it as *not recorded; rows present on live* — so the `documents_batch_id_document_key_key` index's existence has no record either, which new seeds that upsert on `(batch_id, document_key)` depend on). Tenants, programs, the 8-key document catalog, billing rules, and the bucket are already seeded idempotently by migration 1; this adds only:

- **Five batches** with `DEV-` codes (`DEV-AKB-001`, `DEV-J3ED-001`, `DEV-J3ED-002`, `DEV-NEN-001`, `DEV-NEN-002`), resolved by tenant/program `code`, upserted on `(tenant_id, batch_code)`. The `DEV-` prefix is deliberate: the natural key is the RQM code from the NTP, the source mock has no RQM codes, and fabricating official-looking identifiers in a compliance tool is not acceptable — the prefix is greppable for replacement. `official_system_reference` stays NULL for the same reason, and `trainer_profile_id`/`created_by`/`updated_by` stay NULL because `profiles` is Clerk-backed (a placeholder profile would be an identity no one can authenticate as); the denormalized `trainer_name` text carries the trainer meanwhile.
- **Placeholder learners**, one row per `learner_no` sized to each batch's `learner_count`, synthetic names, `uli = NULL` (ULI is the permanent learner key — inventing one pollutes the T2MIS identity space).
- **Eight document rows per batch** (one per catalog key), statused to tell a story (the completed `DEV-J3ED-002` batch is all-`verified`).
- **A hazard closure:** `documents` had no uniqueness on `(batch_id, document_key)`, so any repeated insert silently duplicated rows. The fixture adds the **unique index** `documents_batch_id_document_key_key` — it fails loudly if duplicates already exist (de-duplicate first), and being an index rather than a constraint it produces no `database.types.ts` change.
- `storage_path`/`external_url` stay NULL: the mock's `storage://` URLs point at no real object, and a dead link on a compliance document is worse than a visibly absent one.

**`seeds/dev_profile_memberships.sql` (identity fixtures).** A **DRAFT — NOT APPLIED** stopgap seed (header: "Review before running"), run manually (`psql "$DATABASE_URL" -f …` or the SQL editor), that gives the three real dev Clerk users a `profiles` row and a membership so RLS has something to match. Per ADR-005:

- **One membership per profile.** Demo: `demo@tvicams.app` → `viewer`, **AKB only** (least privilege — viewer is read-only through the app's `canWrite = role !== 'viewer'` while no policy denies it any read, so it can see every screen the isolation check needs). The two human accounts → `admin` (the school's proprietor): `klynejoshua13` for AKB and `nenitarmo` for NEN.
- **Convergence by delete + reinsert**, scoped to the three `clerk_user_id`s it manages — `ON CONFLICT DO UPDATE` alone can add and amend but never remove a row, and a stale membership is a live grant because `can_access_tenant` fires on any.
- **Warning — the file no longer matches the dev database (open deviation, recorded on PR #174).** The dev database was converged to decision 2 *only* (demo = viewer, AKB). The developer account deliberately **keeps its AKB + J3ED + NEN grants (three memberships)** because, when the file was written, nothing in the app performed tenant assignment — dropping them means hand-writing SQL to get back into either school, and J3ED would fall to zero members. That retained state is the exact harm decision 1 exists to prevent (all three schools merged into one unscoped list, since `can_access_tenant` grants on any membership), left open on one account; on-app assignment has since landed, so that reason has partly lapsed but the deviation itself was never reconciled. It does not affect the isolation assertion, which runs as demo and is AKB-scoped either way.
- **Warning — the membership delete is unconditional *for the three managed accounts*.** It deletes *every* membership of the three managed `clerk_user_id`s — and the developer is one of the three — so running the file as written **will remove the developer's two retained grants** (J3ED, NEN): a real change, not a no-op; the file says decide before you run it, not after. The scoping does mean the two orphaned rows below are untouched. To apply decision 2 alone, the whole diff is one statement (`update profiles set role = 'viewer'` for demo), and demo's delete-then-insert just churns five rows to arrive where it started.
- **The isolation assertion:** signed in as demo on `/dashboard`, exactly one batch (`DEV-AKB-001`) must be visible; a scoping regression shows five. It must be verified in the app, not in SQL (the file's own verification query joins through memberships, so a tenant with no member never appears — J3ED by design), and it is only meaningful when the snapshot is `ok`. No mock fallback exists: the dashboard renders an honest empty state on `unconfigured`/`sync-failed` (RULES §3 rule 19 — `selectBatchesForDisplay` returns `[]` for any non-`ok` snapshot, and `shared/mocks/` is gone), so any non-empty count comes from the live RLS-scoped query. Confirm the "Data as of" stamp is present before trusting the count.
- `is_default` is redundant under one-membership-per-profile (the `find(is_default) ?? [0]` fallback always resolves to the single row) and is set for forward compatibility only.
- Two orphaned profile rows for Clerk IDs that don't exist in the current instance (one an AKB admin membership, one a membership-less viewer) are **deliberately left alone** — the delete is scoped to the three managed accounts, and the orphans grant access to nobody today because no token can carry those `sub` values; deleting them is a separate, deliberate change if IDs are ever reused.

**`seeds/verify_user_admin_setup.sql` (admin-policy verification setup).** A pasteable, two-part setup in **one all-or-nothing transaction** for making the user-creation screen (PR #213 / commit `b3361a6`) observable at runtime — a **seed, not a migration**, because part 2 hardcodes a Clerk user ID (different between Clerk dev and prod instances, the same reason as `dev_profile_memberships.sql`). It exists because the ledger once recorded row 5 as pending while demo is deliberately a `viewer`, so `/users/new` rendered its admin-only guard — **a premise made stale by the 2026-10-04 repair-record; verify the live state before running the seed.**

- **Part 1 — the migration's four policies, made re-runnable.** The migration uses bare `create policy` (errors on a second run); the seed prepends `drop policy if exists` guards, which double as the uninstall. Semantics are otherwise identical — "a drifted copy of a security policy is worse than no copy," so change both or neither — and a real environment should run the migration, not this copy. The four policies grant `admin` (and only `admin`) the write surface the screen needs: read **unassigned** profiles, update `role`/`is_active` on visible profiles, insert membership rows **only for tenants the admin belongs to**, and delete them (otherwise the grant is a one-way door and a mis-assignment needs a DBA).
- **Part 2 — temporary demo promotion, deny-by-default by design.** One column on one row: `update profiles set role = 'admin'` for the demo's hardcoded Clerk ID; the commented-out revert sits at the bottom of the file. The promotion is guarded by a `do $$` block that raises unless `set local app.environment = 'local'` was set below `begin;` — because both parts share one transaction, aborting the guard rolls back Part 1 too, so a careless paste against a real database applies nothing. **Note the checked-in state: that opt-in line currently ships *uncommented*, so the guard is disarmed in the repo copy and the file promotes demo as written** — the header's deny-by-default description and the file's contents disagree, and the line should be verified (re-commented) before any paste. The membership is left *alone* — demo already holds exactly AKB, and an admin can only grant a tenant they belong to, so one membership exercises the whole screen. The promotion deliberately degrades the tenant-isolation canary (the DRAFT seed above) until it is reverted, and demo is promoted rather than either real admin account only because demo's credentials are the ones in `.env.local`.
- **No `database.types.ts` impact:** policies only, no tables/columns/enums — the regeneration contract does not fire.

## The database types regeneration contract

There are two type families, deliberately separate:

1. **`lib/supabase/database.types.ts`** — the raw row types: the `Database` interface with all **18 pre-billing tables** (each with `Row`/`Insert`/`Update`/`Relationships`), the seven enum aliases, and **three function signatures** (`ensure_profile_tenant_membership`, `current_user_is_platform_admin`, `create_school`). This is the only file allowed to know the database's exact shape, and the same name RULES §10 rule 36 offers as a first place to answer schema questions. **It has never been regenerated since row 7**: none of the seven billing tables, `billing_type`, `excused`, `max_absence_percent`, or the widened helper is in the file, and `program_billing_rules` no longer describes a `max_absences` column at all — it simply omits the absence threshold, so a mapper reading it would type-check against a stale shape. The one exception is `batches.billing_deadline`, which the file carries **by hand ahead of its migration** (ADR-008 says so, and says to regenerate after applying) — so the type layer is ahead of the database for that column and behind it for everything else. Like every generated file it is *describe-only*: the contents are a mirror, and the contract is the rule that a mirror is refreshed after each migration rather than hand-patched selectively the way it has been.
2. **`shared/types.ts`** — *hand-written* UI domain types (`Batch`, `Tenant`, `User`, `DocRecord`, `LifecycleStage`, …) shaped for the screens, not the tables. `Tenant` carries the six ADR-006 registry fields (`tesdaProviderCode`, `province`, `cityMunicipality`, `streetAddress`, `providerType`, `providerClassification`) — empty string, not `null`, so every consumer renders one without a check.

**Only module `data/` layers** (plus `lib/supabase` itself) **may import `database.types.ts`** — components import domain types only. This is lint-enforced: the `import/no-restricted-paths` zone in [`eslint.config.mjs`](/eslint.config.mjs) targets `app/**`, `shared/**`, `modules/*/ui/**`, and `modules/*/domain/**` against `lib/supabase/database.types.ts` with the message "Raw DB row types are data-layer only. Import domain types (shared/types or a module's domain/) instead."

The contract on change (RULES §3 rule 20): **after any migration, regenerate `database.types.ts`, then update the affected mappers and domain types.** For ADR-006 the new shapes were **written by hand from the `20260906114735` migration and checked field-by-field against `generate_typescript_types` run on the live project — they match** (the file's header records this, and that the migration is APPLIED, 2026-09-06), with two deliberate divergences from the generator: `create_school`'s nullable text parameters are typed `string | null` (the generator emits plain `string`, but the data layer passes null), and `current_user_is_platform_admin`'s `Args` stays `Record<string, never>`. The mappers are where DB↔UI differences live — the enum bridge (DB `training`→UI `train`, `assessment`→`assess`, `billing`→`bill`; UI-only `entre` stage; DB `blocked` surfacing as UI `pending`) is a total map, so a new enum variant is a compile error until someone chooses its UI treatment. One known wart: the file stubs every table's `Relationships` as `[]`, which is what makes supabase-js unable to infer embedded joins — the root of the four long-standing TS2352 casts in `activity.ts`, `batches.ts`, `tenancy.ts`, and `users.ts`; adopting real `Relationships` arrays would likely retire all four and is a deliberate future cleanup.

## Client wiring and the anon-key pattern

The Supabase clients in `lib/supabase/` — [`server.ts`](/lib/supabase/server.ts), [`client.ts`](/lib/supabase/client.ts), and [`service.ts`](/lib/supabase/service.ts) — implement RULES §1 rule 3:

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
| Any operation on `platform_admins` or `learner_identities` | RLS enabled, no policies → denied, including for a holder of the full default-privilege grants |

The app must therefore distinguish "not signed in" (client throws) from "signed in but empty" (RLS zero rows), and neither path may substitute fabricated data (RULES §3 rule 19).

## Operations and agent constraints (RULES §10)

There is **one hosted project and no staging**, so an unreviewed statement lands on real tenant data. RULES §10, rule 36 ([`RULES.md`](/RULES.md)) — a `[deny]`-level rule — forbids executing statements against the live project without explicit user permission or an agreed plan that covers it, and requires stating exactly what will run and why, then waiting. Its deny list, by any route (the Supabase MCP server, the CLI, or direct SQL), covers:

- `execute_sql` — **denied as a tool, including read-only `select`s** (the tool is denied, not the statement kind)
- `apply_migration` and `deploy_edge_function`
- all branch operations (`create`/`delete`/`merge`/`rebase`/`reset`)
- the CLI routes `supabase db push`, `supabase db reset`, and `supabase migration up`
- `psql`

[`.gitignore`](/.gitignore) **re-includes `!.claude/settings.json`** — deliberately, so the shared settings that wire the hooks up travel with the repo and hold "the permission rules that keep destructive commands out of everyone's sessions" (`settings.local.json` is the per-developer file and stays ignored). The file is therefore present in the checkout, and its `permissions.deny` carries the rule-36 entries one-for-one, in both the `mcp__supabase__*` and the instance-id-prefixed `mcp__bd43a5a2-…__*` spellings, plus the three CLI routes under both `supabase` and `npx supabase` and `Bash(psql:*)` — the enforcement RULES §10 rule 36 marks `[deny]`. It also denies three shell commands that are not schema operations but destroy work silently (`rm -rf`, `git reset --hard`, force-push). What travels with it: [`RULES.md`](/RULES.md) itself, [`.mcp.json`](/.mcp.json) (the Supabase MCP server registration, pointing at the hosted project `azywaivpyphhsblxjgtn` — the same single project the rule protects), and the version-controlled hook scripts in `.claude/hooks/` (e.g. `protect-static-dirs.sh`, `lint-edited-file.sh`, `check-mcp-health.sh`), which are `[hook]`-level enforcement.

Rule 36 also names the escape hatch, and it is the whole reading strategy for this page: **schema questions should be answered from the checked-in migrations and `lib/supabase/database.types.ts` first**, and the read-only introspection tools (`list_tables`, `list_migrations`, `get_advisors`, `search_docs`) remain available for what those cannot answer. The line between the two is the tool, not the statement kind — a read-only `select` through `execute_sql` is denied while `list_migrations` is not.

Consequently: **answer schema questions from the checked-in migrations, `supabase/seeds/`, and `lib/supabase/database.types.ts` first** — and treat the ledger file's dated blocks, not `docs/DATA_MODEL.md`'s version table or the directory listing, as the record of what is deployed. The live migration table has been wrong in both directions and has a standing unresolved tenant-policy drift (see [Migration history](#migration-history)). The read-only introspection tools (`list_tables`, `list_migrations`, `get_advisors`, `search_docs`) remain available for what the records cannot answer — with the caveat that `list_tables` row counts are `reltuples` planner estimates, not counts: the row-8 seed comment records exactly this trap, where an earlier draft called `scholarship_programs` empty from the estimate until a real `count(*)` corrected it, and the ledger has seen an estimate under-report by whole orders of magnitude. To confirm a specific migration landed, check its objects **by name** (`pg_proc`, `pg_policies`); comparing policy *sets* returns a superset and reads as a match no matter what is missing.

Local-stack configuration lives in [`supabase/config.toml`](/supabase/config.toml): `project_id = "tesda-compliance-manager-design-system-v"`, Postgres major version 17, migrations enabled, and `[db.seed] sql_paths = ["./seed.sql"]` — where [`supabase/seed.sql`](/supabase/seed.sql) is deliberately trivial because the real reference data is seeded idempotently by the canonical migration itself (so a fresh `db reset` reproduces tenants, programs, catalog, and bucket). Storage is enabled with a 50 MiB limit, matching the `compliance-evidence` bucket.

## Related pages

- [Quickstart and Task Routing](/openwiki/quickstart.md) — where to start, the env vars that decide `ok` versus `unconfigured`, and the current known states a schema change must account for
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) — the `app → modules → shared → lib/supabase` import rules and the fetch → map → derive contract the data layers above follow
- [`RULES.md`](/RULES.md) §4 (rules 21–26) — the design-system rules the RLS zero-row and `sync-failed` paths render into: every data screen implements all six states (loading, empty, no-results, error/sync-failed, permission-denied, stale-data) and relative dates carry a "Data as of" stamp (rule 24)
