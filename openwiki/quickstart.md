---
type: "Reference"
title: "Quickstart and Task Routing"
description: "First-stop routing map for TVI-CAMS: what the system is, the doc-reading order, the fixed four-page wiki set, the invariants that gate every change, the verification loop, the current known states of the live database (2026-09-10 catalog-verified, issue #230), and the task-to-page routing table."
tags: ["quickstart", "task-routing", "onboarding", "invariants", "verification", "tesda-compliance-manager", "nextjs", "supabase", "rls", "school-registry", "platform-admin"]
openwiki_generated: true
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-7c03237a6b57ffb3e526a51b
    resource: repo://.nvmrc
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-0d40866d6dce044e0547eef9
    resource: repo://docs/DATA_MODEL.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-2aff630ed0688d80b1b707c8
    resource: repo://modules/auth/data/provisioning.ts
  - id: openwiki-source-05b5b2c042bb4f3b47496b1f
    resource: repo://modules/documents/data/evidence.ts
  - id: openwiki-source-764eda3eb972fdc48c5584a5
    resource: repo://modules/documents/domain/compliance.ts
  - id: openwiki-source-3f1f3f4919f6d868d27df2e3
    resource: repo://modules/tenancy/data/platform.ts
  - id: openwiki-source-2e2d8e1af455c1b26b721663
    resource: repo://modules/tenancy/data/schools.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-d81538d8891efe37053aeccb
    resource: repo://supabase/config.toml
  - id: openwiki-source-fc8bca54fd802af39662de6c
    resource: repo://supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-acb73c82b90d7c0325351e5f
    resource: repo://supabase/migrations/README.md
  - id: openwiki-source-d888b22083376431bb299336
    resource: repo://supabase/seeds/20260831120000_seed_dev_operational_data.sql
  - id: openwiki-source-a05cedbd998904c07b2c5395
    resource: repo://supabase/seeds/README.md
  - id: openwiki-source-892600aba8a4baaca4ccc7a9
    resource: repo://tests/unit/doc-blockers.test.ts
  - id: openwiki-source-b602958ed9a6de9282d8520d
    resource: repo://tests/unit/school-draft.test.ts
  - id: openwiki-source-0a5743f3b49f658216da5228
    resource: repo://tests/unit/sidebar.test.ts
  - id: openwiki-source-5840c4db50eac7206a874ca9
    resource: repo://tests/unit/sign-in-verification.test.ts
  - id: openwiki-source-0fd3605db2590862922583b6
    resource: repo://tests/unit/tenant-access.test.ts
  - id: openwiki-source-fe5bad314b3fc436410eb4b1
    resource: repo://tests/unit/user-access.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-09-25T01:01:03.665Z" }
verified:
  - by: openwiki/0.5.0
    at: 2026-09-25T01:01:03.665Z
---


# Quickstart and Task Routing

This is the first wiki page a coding agent or human should open. It is a routing map, not a tutorial: orient on the system, find the page that answers your task, know the invariants that gate every change, and know how to verify work.

## What TVI-CAMS is

TVI-CAMS (TESDA Compliance Manager) is an **internal multi-tenant compliance working layer** for TVI schools running TESDA scholarship batches (TWSP/CFSP). It tracks batch lifecycle, documents, attendance, and LAMR evidence, and generates the school's own billing documents as populated `.docx` templates (the ADR-001 document-generating engine: TSF/Allowance, Training Cost, Entrepreneurship — Assessment Fee is out of scope).

**The official-systems boundary:** this tool never holds official standing. TESDA's **SIS, T2MIS, and BSRS remain the authoritative systems** for official records, approved qualification maps, attendance submissions, and billing; Supabase stores internal working copies, document evidence, status tracking, and references to official records. UI copy must never imply official TESDA approval or submission (RULES §5).

Orientation facts:

- **Tenants:** three initial schools — AKB, J3ED, NEN — strictly scoped by Supabase RLS. New schools can now be provisioned (next fact); the three seeded tenants remain the initial set.
- **Roles:** Admin, Coordinator, Trainer, Viewer (lowercase `profile_role` values in the database; role labels in UI copy are display-only).
- **Platform admin / school registry (ADR-006):** a *separate axis* from `profile_role` — not a fifth role value. The platform operator provisions schools through the new `/schools/new` write path, where a `security invoker` `create_school` RPC lands a tenant **plus its registered programs in one transaction** (programs picked from the national `qualifications` registry; each per-school COPR certificate lives on a `tenant_qualifications` row). Its reach is the school registry only — `tenants`, `qualifications`, `tenant_qualifications`, unassigned `profiles`, and seating a tenant's first member; no policy grants it any compliance table, and holding `admin` at a school grants nothing on `/schools/new`.
- **Programs:** TWSP and CFSP, stored as configurable records, not hard-coded UI branches.
- **Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Supabase (Postgres + Storage), Clerk for identity, pnpm as the only package manager. A single app talks directly to Supabase — there is no separate backend. **Node 22+ is required** (`.nvmrc`, `engines` in `package.json`).

## Read the docs in this order

1. [`README.md`](/README.md) — what the system is, features, roles, repository layout, commands.
2. [`CONTEXT.md`](/CONTEXT.md) — the domain model and ubiquitous language (Batch, RQM, NTP, ULI, tranche, readiness gate, "untracked"…).
3. [`CLAUDE.md`](/CLAUDE.md) — architecture guidance and the *why* behind the invariants.
4. [`RULES.md`](/RULES.md) — the *what*: the non-negotiable checklist, each rule tagged with its enforcement level (hook / deny / lint / types / RLS / review). **Read it before any code change.** Where CLAUDE.md and RULES.md appear to disagree, **RULES.md wins** and the drift should be fixed.

## The fixed four-page wiki

The wiki is a fixed budget of four pages: this routing map plus the three architecture pages below. There is no fifth page — a task whose answer does not fit one of them routes to the in-repo docs (`RULES.md`, `CONTEXT.md`, `docs/adr/`), not to a new wiki page.

| Page | Answers |
| --- | --- |
| [Architecture Overview](/openwiki/architecture/overview.md) | The map: stack at a glance, request path, the auth chain in one breath, the four-layer import model, the domain-module catalog, docs precedence and the ADR set, do-not-edit design bundles, and build/run/test. |
| [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) | The schema — the live applied shape (18 tables, 36 FKs, seven enums) versus the checked-in target (25 tables, 52 FKs, eight enums once the ADR-001 billing domain lands), the [migration ledger](/openwiki/architecture/data-model-and-rls.md#migration-history) with the 2026-09-10 catalog-verified state per version, the pending [ADR-001 billing domain](/openwiki/architecture/data-model-and-rls.md#the-adr-001-billing-domain-migration-8-pending) (a shape change), the [per-table RLS policy map](/openwiki/architecture/data-model-and-rls.md#per-table-policy-map) including the seven billing-domain tables, [storage policies](/openwiki/architecture/data-model-and-rls.md#storage-policies) for the private `compliance-evidence` bucket, the [ADR-006 school registry / platform admin boundary](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006), [profile provisioning](/openwiki/architecture/data-model-and-rls.md#profile-provisioning-and-user-administration), the [`database.types.ts` regeneration contract](/openwiki/architecture/data-model-and-rls.md#the-database-types-regeneration-contract), and [RULES §10 agent-conduct guardrails](/openwiki/architecture/data-model-and-rls.md#operations-and-agent-constraints-rules-10). |
| [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) | Where code goes ([layer model](/openwiki/architecture/module-boundaries-and-data-pattern.md#layer-model)), [lint-enforced import direction](/openwiki/architecture/module-boundaries-and-data-pattern.md#import-direction-is-lint-enforced), a [module's private `data/` surface](/openwiki/architecture/module-boundaries-and-data-pattern.md#a-modules-data-is-private), the [fetch → map → derive contract](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-data-contract-fetch--map--derive), the [four-state snapshot union](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-four-state-snapshot-contract), the two separate type families, total [enum bridges](/openwiki/architecture/module-boundaries-and-data-pattern.md#enum-bridges-total-maps-in-the-mapper-never-in-components), and the documents module's ADR-004 gate-versus-measurement split plus its evidence-storage write path. |

## Invariants that gate every change

1. **RLS is the security boundary; UI hiding is usability only.** Every authorization decision is made by Postgres RLS through the `app_private.*` helper functions (RULES §1.1). **A JS-side tenant filter is a bug even when it returns the right answer** — it signals the query was written assuming no RLS (RULES §1.2).
2. **Import direction is `app → modules → shared → lib/supabase`, and it is lint-enforced** (RULES §2; `import/no-restricted-paths` in [`eslint.config.mjs`](/eslint.config.mjs)). Raw `database.types.ts` rows are data-layer only, and another module's `data/` is private — import its `domain/` or `ui/` instead.
3. **Never execute statements against the live Supabase project without explicit permission** (RULES §10, `[deny]`): covers `execute_sql` — *including read-only `select`s* — `apply_migration`, branch create/merge/reset, and edge-function deploys, by any route (MCP server, CLI, or `psql`). There is one hosted project and no staging, so an unreviewed statement lands on real tenant data. Answer schema questions from the checked-in migrations and `lib/supabase/database.types.ts` first.
4. **`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are do-not-edit design handoff** (RULES §6): ported verbatim from the design bundle, excluded from lint/build, and a PreToolUse hook blocks edits there.
5. **After any migration: regenerate `lib/supabase/database.types.ts`, then update the affected mappers and domain types** (RULES §3); new migrations are additive, and update the [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) ledger in the same PR.

## Verification loop

Run these in order — the commands exactly as they are invoked:

```bash
pnpm lint               # ESLint flat config; enforces the import boundaries above
pnpm test               # Vitest over tests/unit/ (Node 22+ required)
pnpm exec tsc --noEmit  # strict typecheck — there is no dedicated script
pnpm test:e2e           # Playwright e2e (e2e/), Clerk test keys only per .env.example
```

- `pnpm test` runs the unit suite in `tests/unit/` (its include pattern is set in [`vitest.config.mts`](/vitest.config.mts)) — the suite now spans **21 spec files** (including `school-draft.test.ts`, `user-access.test.ts`, `sidebar.test.ts`, `sign-in-verification.test.ts`, and `tenant-access.test.ts`) — mappers and module `domain/` layers, asserted with **fixed as-of dates** so time-dependent rules stay deterministic. **Node 22+ is required:** Vitest 4's rolldown crashes at startup on older Node with a bundler stack trace, not a test failure (it calls `util.styleText` with an array argument, which throws `ERR_INVALID_ARG_VALUE` on Node 21 or older).
- `pnpm test:e2e` boots the app via `pnpm dev` (the webServer in [`playwright.config.ts`](/playwright.config.ts)) and signs in with **Clerk test keys only** (`pk_test_*` / `sk_test_*`, never production keys) per [`.env.example`](/.env.example).
- When RLS/tenant-isolation tests exist, they run against the real Supabase project — no mocks (RULES §9); the real-Supabase integration suite is still outstanding.

## Current known states a change task must account for

1. **The live database is ahead of its own records** — catalog-verified 2026-09-10 under [#230](https://github.com/shuakyle21/tesda-compliance-manager/issues/230), checked by object name (`pg_proc` for functions, `pg_policies` for policies) rather than inferred. Neither the `supabase/migrations/` directory listing nor `list_migrations` alone is authoritative:
   - `20260906114735` (the ADR-006 school registry + platform admin) is **applied and now recorded**: its file was renamed from `20260906130000` so the filename matches the version recorded, and all ten of its policies plus `app_private.is_platform_admin()` were verified present before the rename.
   - `20260904120000` (the user-admin write policies) is **applied by hand but NOT recorded** in the migration table. The older claim that `/users/new` is RLS-denied and cannot assign anyone is stale — those four policies are live.
   - `20260906120000` (the `ensure_profile_tenant_membership` RPC) is **genuinely missing — the one real gap**: it is absent on the live project even though [`modules/auth/data/provisioning.ts`](/modules/auth/data/provisioning.ts) calls it, so the membership half of a Clerk invitation grant still cannot land.
   - `20260910120000` (the ADR-001 billing domain — seven tables, the `billing_type` enum, new `batches`/`learners`/`program_billing_rules` columns, RLS policies, and the compliance-evidence storage DELETE policy) is **still pending**, and note that both in-repo ledgers ([`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) and [`supabase/migrations/README.md`](/supabase/migrations/README.md)) currently omit it entirely.
   - The `20260831120000` dev operational fixture is **no longer a migration**: it moved to [`supabase/seeds/`](/supabase/seeds/README.md) as part of the #230 reconciliation. Nothing in `supabase/seeds/` runs automatically (`[db.seed]` in `supabase/config.toml` points at a placeholder `seed.sql`), the fixture rows are already present in the single hosted project, and their disposition is tracked on #230.
   - An orphan policy on `public.tenants` ("Tenants selectable by Clerk user") exists that no checked-in migration defines — it omits the `is_active` check its reviewed counterpart enforces.

   Consequence: reconcile #230 before assuming a clean `db push`. Full status: [data-model-and-rls, Migration history](/openwiki/architecture/data-model-and-rls.md#migration-history).
2. **Evidence upload I/O is unverified until issue #122.** The Supabase Storage calls in [`modules/documents/data/evidence.ts`](/modules/documents/data/evidence.ts) are written but not exercised: two dashboard toggles (Clerk's Supabase integration and Supabase Third-Party Auth) are still unset, so every call fails with an RLS denial that is indistinguishable from a code defect. Do not debug that file against a live project until #122 is closed.
3. **Blocker-gate functions are not yet wired to UI.** `blockingDocuments` / `blockerCount` / `blockingDocumentNames` in [`modules/documents/domain/compliance.ts`](/modules/documents/domain/compliance.ts) (ADR-004 D4) are implemented and unit-tested (`tests/unit/doc-blockers.test.ts`) but no screen imports them — treat the gate family as a ready public domain surface, not live screen behavior.

## Task → page routing

| Task family | Start here |
| --- | --- |
| Before any code change (all families) | [`RULES.md`](/RULES.md) — the checklist, each rule tagged with its enforcement level |
| Schema, RLS policies, migrations, enums, triggers, the `compliance-evidence` bucket | [data-model-and-rls](/openwiki/architecture/data-model-and-rls.md) |
<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
| Provisioning a new school; platform admin; school registry; qualifications/COPR | [data-model-and-rls, School registry and platform admin (ADR-006)](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006) plus the write-path sources: [`app/(dashboard)/schools/new/actions.ts`](/app/(dashboard)/schools/new/actions.ts), [`modules/tenancy/domain/schoolDraft.ts`](/modules/tenancy/domain/schoolDraft.ts), [`modules/tenancy/data/platform.ts`](/modules/tenancy/data/platform.ts), [`modules/tenancy/data/schools.ts`](/modules/tenancy/data/schools.ts) |
| Adding a migration or regenerating `database.types.ts` | [data-model-and-rls](/openwiki/architecture/data-model-and-rls.md) + the [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) ledger (updated in the same PR) |
| Where code goes; import boundaries; cross-module rules; adding a module | [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) |
| New entity data layer; snapshot/error states; enum bridges; the `no-tenant-access` fold | [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) |
| Document-compliance semantics (untracked, gate vs. measurement, evidence paths) | [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) + [`docs/adr/ADR-004-untracked-document-semantics.md`](/docs/adr/ADR-004-untracked-document-semantics.md) |
| UI rules, tokens, states, copy, icons | [`RULES.md` §4](/RULES.md) (design system, spec-mandated) and [§5](/RULES.md) (copy and product framing); [CLAUDE.md](/CLAUDE.md) explains the why — there is no wiki page for this family |
| Domain vocabulary; locked domain facts (progress math, ≥5 absences ineligible, one RQM code = one batch, ULI, packet lifecycle) | [`CONTEXT.md`](/CONTEXT.md) + [RULES.md, Locked domain facts](/RULES.md) |
| Billing/packet questions (ADR-001, ADR-003 precedence) | `docs/adr/` — consult the ADR before changing schema or billing math (RULES §7); start with [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md) |
| Verifying a change | The [verification loop](#verification-loop) above |
| Touching the live database in any way | RULES §10 — explicit permission first; see [data-model-and-rls, Operations and agent constraints](/openwiki/architecture/data-model-and-rls.md#operations-and-agent-constraints-rules-10) |

## Related pages

- [Architecture Overview](/openwiki/architecture/overview.md)
- [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md)
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md)
