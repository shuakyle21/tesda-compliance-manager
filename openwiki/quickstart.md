---
type: "Reference"
title: "Quickstart and Task Routing"
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-09-11T02:46:03.436Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-7c03237a6b57ffb3e526a51b
    resource: repo://.nvmrc
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-0d40866d6dce044e0547eef9
    resource: repo://docs/DATA_MODEL.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-05b5b2c042bb4f3b47496b1f
    resource: repo://modules/documents/data/evidence.ts
  - id: openwiki-source-764eda3eb972fdc48c5584a5
    resource: repo://modules/documents/domain/compliance.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-e41155c2222416a1b1c3d84b
    resource: repo://supabase/migrations/20260831120000_seed_dev_operational_data.sql
  - id: openwiki-source-6d151b9adff3e78556c9a327
    resource: repo://supabase/migrations/20260904120000_add_user_admin_write_policies.sql
  - id: openwiki-source-13117a840913dd27670d0422
    resource: repo://supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql
  - id: openwiki-source-892600aba8a4baaca4ccc7a9
    resource: repo://tests/unit/doc-blockers.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-09-11T02:46:03.436Z" }
---


# Quickstart and Task Routing

This is the first wiki page a coding agent or human should open. It is a routing map, not a tutorial: orient on the system, find the page that answers your task, know the invariants that gate every change, and know how to verify work.

## What TVI-CAMS is

TVI-CAMS (TESDA Compliance Manager) is an **internal multi-tenant compliance working layer** for TVI schools running TESDA scholarship batches (TWSP/CFSP). It tracks batch lifecycle, documents, attendance, and LAMR evidence, and generates the school's own billing documents as populated `.docx` templates (the ADR-001 document-generating engine: TSF/Allowance, Training Cost, Entrepreneurship — Assessment Fee is out of scope).

**The official-systems boundary:** this tool never holds official standing. TESDA's **SIS, T2MIS, and BSRS remain the authoritative systems** for official records, approved qualification maps, attendance submissions, and billing; Supabase stores internal working copies, document evidence, status tracking, and references to official records. UI copy must never imply official TESDA approval or submission (RULES §5).

Orientation facts:

- **Tenants:** three initial schools — AKB, J3ED, NEN — strictly scoped by Supabase RLS.
- **Roles:** Admin, Coordinator, Trainer, Viewer (lowercase `profile_role` values in the database; role labels in UI copy are display-only).
- **Programs:** TWSP and CFSP, stored as configurable records, not hard-coded UI branches.
- **Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Supabase (Postgres + Storage), Clerk for identity, pnpm as the only package manager. A single app talks directly to Supabase — there is no separate backend. **Node 22+ is required** (`.nvmrc`, `engines` in `package.json`).

## Read the docs in this order

1. [`README.md`](/README.md) — what the system is, features, roles, repository layout, commands.
2. [`CONTEXT.md`](/CONTEXT.md) — the domain model and ubiquitous language (Batch, RQM, NTP, ULI, tranche, readiness gate, "untracked"…).
3. [`CLAUDE.md`](/CLAUDE.md) — architecture guidance and the *why* behind the invariants.
4. [`RULES.md`](/RULES.md) — the *what*: the non-negotiable checklist, each rule tagged with its enforcement level (hook / deny / lint / types / RLS / review). **Read it before any code change.** Where CLAUDE.md and RULES.md appear to disagree, **RULES.md wins** and the drift should be fixed.

## The three architecture pages

| Page | Answers |
| --- | --- |
<!-- openwiki: broken internal link [/openwiki/architecture/data-model-and-rls.md#the-databasetypes-ts-regeneration-contract] heading anchor "the-databasetypes-ts-regeneration-contract" does not exist in "/openwiki/architecture/data-model-and-rls.md". Fix the href or restore the target, then delete this comment. -->
| [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) | The schema (18 tables, 36 FKs, seven enums), the [migration ledger](/openwiki/architecture/data-model-and-rls.md#migration-history) (seven checked in — four applied, three pending, applied out of order), the [per-table RLS policy map](/openwiki/architecture/data-model-and-rls.md#per-table-policy-map), [storage policies](/openwiki/architecture/data-model-and-rls.md#storage-policies) for the private `compliance-evidence` bucket, the [ADR-006 school registry / platform admin boundary](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006), [profile provisioning](/openwiki/architecture/data-model-and-rls.md#profile-provisioning-and-user-administration), the [`database.types.ts` regeneration contract](/openwiki/architecture/data-model-and-rls.md#the-databasetypes-ts-regeneration-contract), and [RULES §10 agent-conduct guardrails](/openwiki/architecture/data-model-and-rls.md#operations-and-agent-constraints-rules-10). |
| [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) | Where code goes ([layer model](/openwiki/architecture/module-boundaries-and-data-pattern.md#layer-model)), [lint-enforced import direction](/openwiki/architecture/module-boundaries-and-data-pattern.md#import-direction-is-lint-enforced), a [module's private `data/` surface](/openwiki/architecture/module-boundaries-and-data-pattern.md#a-modules-data-is-private), the [fetch → map → derive contract](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-data-contract-fetch--map--derive), the [four-state snapshot union](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-four-state-snapshot-contract), the two separate type families, total [enum bridges](/openwiki/architecture/module-boundaries-and-data-pattern.md#enum-bridges-total-maps-in-the-mapper-never-in-components), and the documents module's ADR-004 gate-versus-measurement split plus its evidence-storage write path. |
| [Design System and UI Invariants](/openwiki/architecture/design-system.md) | The [token layer](/openwiki/architecture/design-system.md#token-layer), [iconography and the no-emoji rule](/openwiki/architecture/design-system.md#iconography-and-the-no-emoji-rule), [status by text + icon, never color alone](/openwiki/architecture/design-system.md#status-text--icon-never-color-alone), [the six mandatory screen states](/openwiki/architecture/design-system.md#the-six-mandatory-screen-states), [copy rules and product framing](/openwiki/architecture/design-system.md#copy-rules-and-product-framing), and [do-not-edit static directories](/openwiki/architecture/design-system.md#do-not-edit-static-directories-and-design-sync). |

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

<!-- openwiki: broken internal link [/tests/unit] file "/tests/unit" does not exist. Fix the href or restore the target, then delete this comment. -->
- `pnpm test` runs the unit suite in [`tests/unit/`](/tests/unit) — mappers and module `domain/` layers, asserted with **fixed as-of dates** so time-dependent rules stay deterministic. **Node 22+ is required:** Vitest 4's rolldown crashes at startup on older Node with a bundler stack trace, not a test failure.
- `pnpm test:e2e` boots the app via `pnpm dev` (the webServer in [`playwright.config.ts`](/playwright.config.ts)) and signs in with **Clerk test keys only** (`pk_test_*` / `sk_test_*`, never production keys) per [`.env.example`](/.env.example).
- When RLS/tenant-isolation tests exist, they run against the real Supabase project — no mocks (RULES §9); the real-Supabase integration suite is still outstanding.

## Current known states a change task must account for

1. **Three pending migrations.** `20260831120000` (dev operational seeds), `20260904120000` (user-admin write policies), and `20260906120000` (the `ensure_profile_tenant_membership` RPC) are checked in but not yet applied on the live project — they change behaviour, not shape. Consequences: `/users/new` cannot yet assign anyone (the admin grant path is RLS-denied), and the membership half of an invitation cannot land. `20260906130000` (ADR-006) was applied **out of order** on top of them — do not assume "highest applied version" means everything below it has run. Full status: [data-model-and-rls, Migration history](/openwiki/architecture/data-model-and-rls.md#migration-history).
2. **Evidence upload I/O is unverified until issue #122.** The Supabase Storage calls in [`modules/documents/data/evidence.ts`](/modules/documents/data/evidence.ts) are written but not exercised: two dashboard toggles (Clerk's Supabase integration and Supabase Third-Party Auth) are still unset, so every call fails with an RLS denial that is indistinguishable from a code defect. Do not debug that file against a live project until #122 is closed.
3. **Blocker-gate functions are not yet wired to UI.** `blockingDocuments` / `blockerCount` / `blockingDocumentNames` in [`modules/documents/domain/compliance.ts`](/modules/documents/domain/compliance.ts) (ADR-004 D4) are implemented and unit-tested (`tests/unit/doc-blockers.test.ts`) but no screen imports them — treat the gate family as a ready public domain surface, not live screen behavior.

## Task → page routing

| Task family | Start here |
| --- | --- |
| Before any code change (all families) | [`RULES.md`](/RULES.md) — the checklist, each rule tagged with its enforcement level |
| Schema, RLS policies, migrations, enums, triggers, the `compliance-evidence` bucket | [data-model-and-rls](/openwiki/architecture/data-model-and-rls.md) |
| Adding a migration or regenerating `database.types.ts` | [data-model-and-rls](/openwiki/architecture/data-model-and-rls.md) + the [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) ledger (updated in the same PR) |
| Where code goes; import boundaries; cross-module rules; adding a module | [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) |
| New entity data layer; snapshot/error states; enum bridges; the `no-tenant-access` fold | [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) |
| Document-compliance semantics (untracked, gate vs. measurement, evidence paths) | [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) + [`docs/adr/ADR-004-untracked-document-semantics.md`](/docs/adr/ADR-004-untracked-document-semantics.md) |
| UI rules, tokens, states, copy, icons | [design-system](/openwiki/architecture/design-system.md) |
| Domain vocabulary; locked domain facts (progress math, ≥5 absences ineligible, one RQM code = one batch, ULI, packet lifecycle) | [`CONTEXT.md`](/CONTEXT.md) + [RULES.md, Locked domain facts](/RULES.md) |
<!-- openwiki: broken internal link [/docs/adr] file "/docs/adr" does not exist. Fix the href or restore the target, then delete this comment. -->
| Billing/packet questions (ADR-001, ADR-003 precedence) | [`docs/adr/`](/docs/adr) — consult the ADR before changing schema or billing math (RULES §7) |
| Verifying a change | The [verification loop](#verification-loop) above |
| Touching the live database in any way | RULES §10 — explicit permission first; see [data-model-and-rls, Operations and agent constraints](/openwiki/architecture/data-model-and-rls.md#operations-and-agent-constraints-rules-10) |

## Related pages

- [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md)
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md)
- [Design System and UI Invariants](/openwiki/architecture/design-system.md)
