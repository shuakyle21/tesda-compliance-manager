---
type: Reference
title: Quickstart and Task Routing
description: "First-stop routing map for TVI-CAMS: what the system is and where its official-systems boundary lies, the doc-reading order, the fixed four-page wiki, the invariants that gate every change, the exact verification loop, the schema state recorded on 2026-09-10 (#230), and the task → page routing table."
tags: ["quickstart", "task-routing", "onboarding", "invariants", "verification", "tesda-compliance-manager", "nextjs", "supabase", "clerk", "rls", "migrations", "platform-admin"]
verified:
  - by: openwiki/0.5.0
    at: 2026-10-20T01:21:35.552Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-7c03237a6b57ffb3e526a51b
    resource: repo://.nvmrc
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
  - id: openwiki-source-d9ee1df1a1fa6105c9c562bf
    resource: repo://app/sign-in/%5B%5B...sign-in%5D%5D/sign-in-page.tsx
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
  - id: openwiki-source-e6f02f5d20be6272be761347
    resource: repo://lib/supabase/server.ts
  - id: openwiki-source-4afc6c67d0142492979e14f5
    resource: repo://lib/supabase/service.ts
  - id: openwiki-source-2aff630ed0688d80b1b707c8
    resource: repo://modules/auth/data/provisioning.ts
  - id: openwiki-source-fff5b0f28701e5c247650fab
    resource: repo://modules/auth/domain/oauthSignIn.ts
  - id: openwiki-source-d8c97a76fddda28591be8a4c
    resource: repo://modules/auth/domain/redirectUrl.ts
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
  - id: openwiki-source-c25ad52388e27abc8c91b43f
    resource: repo://tests/unit/auth-provisioning.test.ts
  - id: openwiki-source-892600aba8a4baaca4ccc7a9
    resource: repo://tests/unit/doc-blockers.test.ts
  - id: openwiki-source-34d1790c8509224339ebf77e
    resource: repo://tests/unit/redirect-url.test.ts
  - id: openwiki-source-5840c4db50eac7206a874ca9
    resource: repo://tests/unit/sign-in-verification.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-10-20T01:21:35.552Z" }
---

# Quickstart and Task Routing

This is the first wiki page a coding agent or human should open. It is a routing map, not a tutorial: orient on the system, find the page that answers your task, know the invariants that gate every change, and know how to verify work.

## What TVI-CAMS is

TVI-CAMS (TESDA Compliance Manager) is an **internal multi-tenant compliance working layer** for TVI schools running TESDA scholarship batches (TWSP/CFSP). It tracks batch lifecycle, documents, attendance, and LAMR evidence, and generates the school's billing documents as populated `.docx` templates (ADR-001: TSF/Allowance, Training Cost, Entrepreneurship; Assessment Fee is out of scope).

**The official-systems boundary.** This tool never holds official standing. TESDA's **SIS, T2MIS, and BSRS remain authoritative** for official records, approved qualification maps, schedules, ULI records, attendance submissions, billing documents, and required reports; Supabase stores internal working copies, document evidence, status tracking, and references to official records. UI copy must never imply official TESDA approval or submission (RULES rule 27).

Orientation facts:

- **Tenants:** three initial schools — AKB, J3ED, NEN — strictly scoped by Supabase RLS. New schools can now be provisioned through `/schools/new`; the three seeded tenants remain the initial set.
- **Roles:** Admin, Coordinator, Trainer, Viewer — stored as lowercase `profile_role` values; capitalized labels are display copy only (`CONTEXT.md`, RULES "Locked domain facts").
- **Platform admin / school registry (ADR-006):** a *separate axis* from `profile_role`, not a fifth role value. The platform operator provisions a school through `/schools/new`, where a `security invoker` `create_school` RPC lands a tenant **plus its registered programs in one transaction** (programs picked from the national `qualifications` registry; each per-school COPR certificate lives on a `tenant_qualifications` row). Its reach is the school registry only — `tenants`, `qualifications`, `tenant_qualifications`, unassigned `profiles`, and seating a tenant's first member; no policy grants it any compliance table, and holding `admin` at a school grants nothing on `/schools/new`.
- **Programs:** TWSP and CFSP, stored as configurable records, not hard-coded UI branches.
- **Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Supabase (Postgres + Storage), Clerk for identity, pnpm as the only package manager. A single app talks directly to Supabase — there is no separate backend. **Node 22+ is required** (`.nvmrc`, `engines` in `package.json`).

## Run it locally

```bash
pnpm install
pnpm dev          # Next.js dev server on :3000
```

`.env.example` documents the Clerk test keys (`pk_test_*` / `sk_test_*`) the e2e suite uses. The Supabase pair is `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read by [`lib/supabase/server.ts`](/lib/supabase/server.ts)); `SUPABASE_SERVICE_ROLE_KEY` is read only by [`lib/supabase/service.ts`](/lib/supabase/service.ts) for the Clerk webhook and must never reach client code (RULES rule 3). With the Supabase pair unset, `isSupabaseConfigured()` is false and data functions return `unconfigured` snapshots — never fabricated data (RULES rule 19).

## Read the docs in this order

1. [`README.md`](/README.md) — what the system is, features, roles, repository layout, commands.
2. [`CONTEXT.md`](/CONTEXT.md) — the domain model and ubiquitous language (Batch, RQM, NTP, ULI, tranche, readiness gate, "untracked"…).
3. [`CLAUDE.md`](/CLAUDE.md) — architecture guidance and the *why* behind the invariants.
4. [`RULES.md`](/RULES.md) — the *what*: the non-negotiable checklist, each rule tagged with its enforcement level (hook / deny / lint / types / RLS / review). **Read it before any code change.** Where [`CLAUDE.md`](/CLAUDE.md) and `RULES.md` appear to disagree, **RULES.md wins** and the drift should be fixed. One drift is already known: rule 34 still says there is no test runner, but `tests/unit/` now holds 22 spec files.

## The fixed four-page wiki

The wiki is a fixed budget of four pages: this routing map plus the three architecture pages below. There is no fifth page — a task whose answer does not fit one of them routes to the in-repo docs (`RULES.md`, `CONTEXT.md`, `docs/adr/`), not to a new wiki page. UI and design questions route to `RULES.md` §4.

| Page | Answers |
| --- | --- |
| [Architecture Overview](/openwiki/architecture/overview.md) | The map: stack at a glance, request path, the [auth chain in one breath](/openwiki/architecture/overview.md#the-auth-chain-in-one-breath), the [four-layer import model](/openwiki/architecture/overview.md#the-four-layer-import-model), the 14-module catalog, docs precedence and the six-ADR chain, design do-not-edit zones, and build/run/test. |
| [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) | The schema as recorded through the 2026-09-10 check (18 tables, 36 FKs, seven enums) versus the checked-in target (25 tables, 52 FKs, eight enums once the ADR-001 billing domain lands), the [migration ledger](/openwiki/architecture/data-model-and-rls.md#migration-history) with the dated #230 state per version, the pending [ADR-001 billing domain](/openwiki/architecture/data-model-and-rls.md#the-adr-001-billing-domain-migration-8-pending) (a shape change), the [per-table policy map](/openwiki/architecture/data-model-and-rls.md#per-table-policy-map) including the seven billing-domain tables, [storage policies](/openwiki/architecture/data-model-and-rls.md#storage-policies) for the private `compliance-evidence` bucket, the [ADR-006 school registry / platform admin boundary](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006), [profile provisioning](/openwiki/architecture/data-model-and-rls.md#profile-provisioning-and-user-administration), the [`database.types.ts` regeneration contract](/openwiki/architecture/data-model-and-rls.md#the-database-types-regeneration-contract), and [RULES rule 36 guardrails](/openwiki/architecture/data-model-and-rls.md#operations-and-agent-constraints-rules-10). |
| [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) | Where code goes ([layer model](/openwiki/architecture/module-boundaries-and-data-pattern.md#layer-model)), [lint-enforced import direction](/openwiki/architecture/module-boundaries-and-data-pattern.md#import-direction-is-lint-enforced), a [module's private `data/` surface](/openwiki/architecture/module-boundaries-and-data-pattern.md#a-modules-data-is-private), the [fetch → map → derive contract](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-data-contract-fetch--map--derive), the [four-state snapshot union](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-four-state-snapshot-contract), the two separate type families, total [enum bridges](/openwiki/architecture/module-boundaries-and-data-pattern.md#enum-bridges-total-maps-in-the-mapper-never-in-components), and the documents module's ADR-004 gate-versus-measurement split plus its evidence-storage write path. |

## Invariants that gate every change

1. **RLS is the security boundary; UI hiding is usability only.** Every authorization decision is made by Postgres RLS through the `app_private.*` helper functions (RULES rule 1). **A JS-side tenant filter is a bug even when it returns the right answer** — it signals the query was written assuming no RLS (RULES rule 2).
2. **Import direction is `app → modules → shared → lib/supabase`, and it is lint-enforced** (RULES rule 7; `import/no-restricted-paths` in [`eslint.config.mjs`](/eslint.config.mjs)). Raw `database.types.ts` rows are data-layer only (rule 10), and another module's `data/` is private — import its `domain/` or `ui/` instead (rule 8).
3. **Never execute statements against the live Supabase project without explicit permission** (RULES rule 36, `[deny]`): covers `execute_sql` — *including read-only `select`s* — `apply_migration`, branch create/merge/reset, and edge-function deploys, by any route (MCP server, CLI, or `psql`). There is one hosted project and no staging, so an unreviewed statement lands on real tenant data. Answer schema questions from the checked-in migrations and `lib/supabase/database.types.ts` first.
4. **`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are do-not-edit design handoff** (RULES rule 28): ported verbatim from the design bundle, excluded from lint/build, and a PreToolUse hook blocks edits there.
5. **After any migration: regenerate `lib/supabase/database.types.ts`, then update the affected mappers and domain types** (RULES rule 20); new migrations are additive, and update the [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) ledger in the same PR.
6. **ADR precedence closes some doors.** ADR-001 supersedes conflicting billing wording, ADR-003 amends it, and ADR-006 supersedes FR-02's "no Super Admin" (RULES rule 30) — but ADR-006's platform-admin reach is closed: granting `app_private.is_platform_admin()` any compliance table, or letting the operator seat itself into a tenant, is a boundary change that needs its own ADR. ADR-004 makes `modules/documents/domain/compliance.ts` the single home of untracked-document semantics; no surface may re-decide it.

## Verification loop

Run these in order — the commands exactly as they are invoked:

```bash
pnpm lint               # ESLint flat config; enforces the import boundaries above
pnpm test               # Vitest over tests/unit/ (Node 22+ required)
pnpm exec tsc --noEmit  # strict typecheck — there is no dedicated script
pnpm test:e2e           # Playwright e2e (e2e/), Clerk test keys only per .env.example
```

- `pnpm test` runs the unit suite from `tests/unit/**/*.test.ts` (include pattern in [`vitest.config.mts`](/vitest.config.mts)) — **22 spec files** at this head. Mappers and module `domain/` layers are asserted with **fixed as-of dates** so time-dependent rules stay deterministic. Representative coverage: `redirect-url.test.ts` and `sign-in-verification.test.ts` (the redirect defence), `school-draft.test.ts` (the ADR-006 draft rules), `auth-provisioning.test.ts`, `doc-blockers.test.ts`, `tenant-access.test.ts`. **Node 22+ is required:** Vitest 4's rolldown crashes at startup on older Node with a bundler stack trace, not a test failure (it calls `util.styleText` with an array argument, which throws `ERR_INVALID_ARG_VALUE` on Node 21 or older).
- `pnpm test:e2e` boots the app via `pnpm dev` (the webServer in [`playwright.config.ts`](/playwright.config.ts)); `e2e/global.setup.ts` obtains a Clerk testing token and `e2e/auth.spec.ts` asserts that an unauthenticated `/dashboard` visit redirects to `/sign-in` — the layout gate, not `proxy.ts`. Sign-in uses **Clerk test keys only** (`pk_test_*` / `sk_test_*`, never production keys) per [`.env.example`](/.env.example).
- When RLS/tenant-isolation tests exist, they run against the real Supabase project — no mocks (RULES rule 35); the real-Supabase integration suite is still outstanding.

## Recorded schema state a change must account for

Everything below is read from checked-in records — migration headers, [`supabase/migrations/README.md`](/supabase/migrations/README.md), and the [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) ledger — as of the **2026-09-10** catalog check recorded on [#230](https://github.com/shuakyle21/tesda-compliance-manager/issues/230). It is a dated record, not an assertion about the project now: RULES rule 36 forbids querying the live database without explicit permission, so re-verifying means asking first. Full detail: [data-model-and-rls, Migration history](/openwiki/architecture/data-model-and-rls.md#migration-history).

1. **The ledgers trail the files.** `supabase/migrations/` holds seven `.sql` files, but both in-repo ledgers stop before the newest and omit it entirely. As recorded: the three base migrations plus the ADR-006 registry are **applied and recorded**; `20260904120000` (admin write policies) is **applied by hand, unrecorded**, so the ledger prose saying `/users/new` cannot assign anyone is stale; `20260906120000` (`ensure_profile_tenant_membership`) is **genuinely missing — the one real gap**, although [`modules/auth/data/provisioning.ts`](/modules/auth/data/provisioning.ts) calls it, so the membership half of a Clerk invitation grant cannot land; `20260910120000` (the ADR-001 billing domain) is **pending and unexecuted**. That pending file is a **shape change** — seven tables, 16 foreign keys, the `billing_type` enum, columns on three tables, a widened RLS helper, and a storage DELETE policy — so `docs/DATA_MODEL.md`'s "three still-pending migrations change behaviour rather than shape" framing no longer covers the set.
2. **Version ≠ filename, and the filesystem is not the deployed schema.** ADR-006's migration is recorded as `20260906114735` and its file was renamed from `20260906130000` to match, after all ten of its policies plus `app_private.is_platform_admin()` were verified present. Supabase keys its migration table on the version string, so a renamed file looks unapplied and a hand-run file records nothing. `list_migrations` and `list_tables` are the permitted read-only introspection tools, but recorded versions alone cannot answer what is deployed: confirm a migration by object name — `pg_proc` for functions, `pg_policies` for policies — and never compare policy *sets*, because a set comparison reads as a match even when something is missing. `list_tables` row counts are `reltuples` planner estimates, not counts. Reconcile #230 before assuming a clean `db push`.
3. **The dev fixture is a seed now.** `20260831120000` moved to [`supabase/seeds/`](/supabase/seeds/README.md); nothing there runs automatically (`[db.seed]` in `supabase/config.toml` points at a placeholder `seed.sql`), its rows were recorded present, and their disposition is tracked on #230.
4. **One policy is not reproducible from the repo.** The same record notes that `public.tenants` carries a "Tenants selectable by Clerk user" policy that no checked-in migration defines and that omits the `is_active` check its reviewed counterpart enforces — so the checked-in policy map describes intent, not every policy enforcing it.
5. **Recorded shape versus checked-in target.** As recorded, the schema has 18 tables, 36 foreign keys, and seven enums; the checked-in target is 25 tables, 52 foreign keys, and eight enums once `20260910120000` lands. Both numbers belong to the dated record, not to a fresh read.
6. **Evidence-storage I/O is unverified until issue #122.** The Storage calls in [`modules/documents/data/evidence.ts`](/modules/documents/data/evidence.ts) are written but not exercised: two dashboard toggles (Clerk's Supabase integration and Supabase Third-Party Auth) are still unset, so every call fails with an RLS denial indistinguishable from a code defect. Do not debug that file against a live project until #122 is closed.
7. **The blocker-gate family has no screen yet.** `blockingDocuments` / `blockerCount` / `blockingDocumentNames` in [`modules/documents/domain/compliance.ts`](/modules/documents/domain/compliance.ts) implement ADR-004 D4 and are unit-tested in `tests/unit/doc-blockers.test.ts`, but nothing in `app/` imports them — a ready public domain surface, not live screen behaviour.

## Task → page routing

| Task family | Start here |
| --- | --- |
| Before any code change (all families) | [`RULES.md`](/RULES.md) — the checklist, each rule tagged with its enforcement level |
| Schema, RLS policies, migrations, enums, triggers, the `compliance-evidence` bucket | [data-model-and-rls](/openwiki/architecture/data-model-and-rls.md) — [migration history](/openwiki/architecture/data-model-and-rls.md#migration-history), [per-table policy map](/openwiki/architecture/data-model-and-rls.md#per-table-policy-map), [storage policies](/openwiki/architecture/data-model-and-rls.md#storage-policies) |
<!-- openwiki: broken internal link [</app/(dashboard] file "</app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [</app/(dashboard] file "</app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
| Provisioning a school; platform admin; school registry; qualifications/COPR | [data-model-and-rls, School registry and platform admin (ADR-006)](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006) plus the write path: [`app/(dashboard)/schools/new/page.tsx`](</app/(dashboard)/schools/new/page.tsx>), [`app/(dashboard)/schools/new/actions.ts`](</app/(dashboard)/schools/new/actions.ts>), [`modules/tenancy/domain/schoolDraft.ts`](/modules/tenancy/domain/schoolDraft.ts), [`modules/tenancy/data/platform.ts`](/modules/tenancy/data/platform.ts), [`modules/tenancy/data/schools.ts`](/modules/tenancy/data/schools.ts) |
<!-- openwiki: broken internal link [</app/(dashboard] file "</app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
| Adding or inviting a user; profile provisioning; `/users/new`; the membership gap | [data-model-and-rls, Profile provisioning and user administration](/openwiki/architecture/data-model-and-rls.md#profile-provisioning-and-user-administration) + [`app/(dashboard)/users/new/actions.ts`](</app/(dashboard)/users/new/actions.ts>), [`modules/auth/data/provisioning.ts`](/modules/auth/data/provisioning.ts), and [`tests/unit/auth-provisioning.test.ts`](/tests/unit/auth-provisioning.test.ts) |
| Sign-in flow work: post-sign-in redirect handling, MFA, device trust, password reset, user-facing error shaping | [Architecture Overview, The auth chain in one breath](/openwiki/architecture/overview.md#the-auth-chain-in-one-breath) + `modules/auth` — the redirect defence is a pure domain rule in [`modules/auth/domain/redirectUrl.ts`](/modules/auth/domain/redirectUrl.ts) (`sanitizeRedirectUrl`: same-origin relative paths only, `/` fallback), [`modules/auth/domain/oauthSignIn.ts`](/modules/auth/domain/oauthSignIn.ts) wires it into the OAuth attempt, and the page that reads the attacker-controlled `redirect_url` param is `app/sign-in/[[...sign-in]]/sign-in-page.tsx`; covered by `tests/unit/redirect-url.test.ts` and `tests/unit/sign-in-verification.test.ts` |
| Adding a migration or regenerating `database.types.ts` | [data-model-and-rls, The database types regeneration contract](/openwiki/architecture/data-model-and-rls.md#the-database-types-regeneration-contract) + the [`docs/DATA_MODEL.md`](/docs/DATA_MODEL.md) ledger, updated in the same PR |
| Where code goes; import boundaries; cross-module rules; adding a module | [module-boundaries-and-data-pattern, Layer model](/openwiki/architecture/module-boundaries-and-data-pattern.md#layer-model) and [Import direction is lint-enforced](/openwiki/architecture/module-boundaries-and-data-pattern.md#import-direction-is-lint-enforced) |
| New entity data layer; snapshot/error states; enum bridges; the `no-tenant-access` fold | [module-boundaries-and-data-pattern, The data contract](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-data-contract-fetch--map--derive), [four-state snapshot](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-four-state-snapshot-contract), [enum bridges](/openwiki/architecture/module-boundaries-and-data-pattern.md#enum-bridges-total-maps-in-the-mapper-never-in-components) |
| Document-compliance semantics (untracked, gate vs. measurement, evidence paths) | [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) + [`ADR-004`](/docs/adr/ADR-004-untracked-document-semantics.md) |
| UI rules, tokens, states, copy, icons | [`RULES.md` §4](/RULES.md) (rules 21–26, design system) and [§5](/RULES.md) (rule 27, copy and product framing); [`CLAUDE.md`](/CLAUDE.md) explains the why — there is no wiki page for this family, by design |
| Domain vocabulary; locked domain facts (progress math, ≥5 absences ineligible, one RQM code = one batch, ULI, packet lifecycle) | [`CONTEXT.md`](/CONTEXT.md) + [RULES.md, Locked domain facts](/RULES.md) |
| Billing/packet questions (ADR-001, ADR-003 precedence) | `docs/adr/` — consult the ADR before changing schema or billing math (RULES rule 30); start with [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md), then [ADR-003](/docs/adr/ADR-003-billing-packet-queue.md) |
| Verifying a change | The [verification loop](#verification-loop) above |
| Touching the live database in any way | RULES rule 36 — explicit permission first; see [data-model-and-rls, Operations and agent constraints](/openwiki/architecture/data-model-and-rls.md#operations-and-agent-constraints-rules-10) |

## Related pages

- [Architecture Overview](/openwiki/architecture/overview.md)
- [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md)
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md)
