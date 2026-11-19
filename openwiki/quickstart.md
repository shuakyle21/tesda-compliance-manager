---
type: Quickstart
title: "Quickstart — Task Routing, Invariants and the Verification Loop"
description: "Entry point before changing TVI-CAMS: which page owns a given task, the invariants that gate every change by rule number and enforcement level, the ordered typecheck → lint → test loop and what each step can and cannot prove, and the live-database permission gate."
tags: [quickstart, routing, invariants, verification, workflow]
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-1f0a12ecb6e407c4e68e28d8
    resource: repo://app/(dashboard)/layout.tsx
  - id: openwiki-source-a8f82cfd8b3b550b92770944
    resource: repo://app/(dashboard)/legacy-redirect.tsx
  - id: openwiki-source-e054b37cac907dbf9b531bbf
    resource: repo://app/(dashboard)/report/page.tsx
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
  - id: openwiki-source-79e2020a0930b43798845956
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/report/page.tsx
  - id: openwiki-source-7ded6d9e4b97a5fd4dd6e34e
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/layout.tsx
  - id: openwiki-source-d9ee1df1a1fa6105c9c562bf
    resource: repo://app/sign-in/%5B%5B...sign-in%5D%5D/sign-in-page.tsx
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-aa73e0f7c001cde7c90e254e
    resource: repo://docs/adr/ADR-003-billing-packet-queue.md
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-a201158b72d575d540d15779
    resource: repo://docs/adr/ADR-007-attendance-based-dropout-rule.md
  - id: openwiki-source-6274a82a4962ca0eff3e198d
    resource: repo://docs/adr/ADR-008-recorded-batch-billing-deadline.md
  - id: openwiki-source-0d40866d6dce044e0547eef9
    resource: repo://docs/DATA_MODEL.md
  - id: openwiki-source-77b021311c7cb4c8d8432fb2
    resource: repo://e2e/auth.spec.ts
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-e6f02f5d20be6272be761347
    resource: repo://lib/supabase/server.ts
  - id: openwiki-source-4afc6c67d0142492979e14f5
    resource: repo://lib/supabase/service.ts
  - id: openwiki-source-fff5b0f28701e5c247650fab
    resource: repo://modules/auth/domain/oauthSignIn.ts
  - id: openwiki-source-d8c97a76fddda28591be8a4c
    resource: repo://modules/auth/domain/redirectUrl.ts
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-ad910b8b276ad30bfcde3f16
    resource: repo://modules/batches/data/learners.ts
  - id: openwiki-source-05b5b2c042bb4f3b47496b1f
    resource: repo://modules/documents/data/evidence.ts
  - id: openwiki-source-764eda3eb972fdc48c5584a5
    resource: repo://modules/documents/domain/compliance.ts
  - id: openwiki-source-927476d5ce1369bdfbff408b
    resource: repo://modules/import-export/data/learnerImport.ts
  - id: openwiki-source-db11994fd3a6b99fac496ccf
    resource: repo://modules/import-export/domain/t2mis.ts
  - id: openwiki-source-b65321b43647f8e93e80e002
    resource: repo://modules/reports/README.md
  - id: openwiki-source-1b98d4470d88d5f67c6f9e45
    resource: repo://modules/reports/ui/exportXlsx.ts
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
  - id: openwiki-source-2020074c6fdeab02aae020b7
    resource: repo://tests/unit/batches.test.ts
  - id: openwiki-source-4b1944144311805b722ef6ef
    resource: repo://tests/unit/dashboard-domain.test.ts
  - id: openwiki-source-892600aba8a4baaca4ccc7a9
    resource: repo://tests/unit/doc-blockers.test.ts
  - id: openwiki-source-d779956f2a715b2e3f40cf22
    resource: repo://tests/unit/learner-import.test.ts
  - id: openwiki-source-34d1790c8509224339ebf77e
    resource: repo://tests/unit/redirect-url.test.ts
  - id: openwiki-source-5840c4db50eac7206a874ca9
    resource: repo://tests/unit/sign-in-verification.test.ts
  - id: openwiki-source-763cabdcd60de0e5da8f9a60
    resource: repo://tests/unit/supabase-server.test.ts
  - id: openwiki-source-9643403557bfc8e75aa7f9e4
    resource: repo://tests/unit/t2mis.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T03:56:44.398Z" }
---

# Quickstart — Task Routing, Invariants and the Verification Loop

## What this system is, and the copy boundary that follows

TVI-CAMS is an internal multi-tenant working layer for TVI schools running TESDA TWSP/CFSP scholarship batches: batch lifecycle, documents, attendance, LAMR evidence, and generated billing documents. It never holds official standing — TESDA SIS, T2MIS and BSRS remain authoritative, statuses describe the school's own internal progress, and UI copy must never imply official approval or submission (RULES rule 27). A compliance tool whose copy overstates its own authority is a real operational failure, not a wording preference.

Stack and request path are on [Architecture Overview](/openwiki/architecture/overview.md); read it before touching a route.

## Read in this order

1. **`RULES.md`** — the invariants, each tagged with its enforcement level. Read the whole file before any change; it is short and it is the checklist.
2. **`CLAUDE.md`** — the architecture and the *why* behind those rules.
3. **`docs/adr/`** — binding decisions. Where `RULES.md` and `CLAUDE.md` appear to disagree, `RULES.md` wins and the drift gets fixed (RULES preamble, `CLAUDE.md` header).

Then the page below that owns your task. Then the source.

### Precedence, and the documents that lie

ADR-001 supersedes conflicting "billing = preparation signal only" PRD/TRD wording; ADR-003 amends ADR-001 §4 (packet due dates stay derived) but upholds NoLedger and JJ1; ADR-007 replaces the retired ≥5-absence dropout count with 20% of `total_sessions` or 3 consecutive unexcused absences; ADR-008 amends ADR-003 P5 for the batch-level `billing_deadline` only; ADR-006 supersedes FR-02's "Super Admin is not implemented". ADR-002 (the ported prototype is not the target) and ADR-005 (demo-account scoping) stay load-bearing. RULES rules 30–31 lock this chain, and rule 30 requires an ADR before any schema or billing-math change.

Two checked-in documents are stale on purpose-bearing points — the ADR chain and the source outrank both:

- **RULES rule 34** still says there is no test runner and that `pnpm test` is a placeholder. There is a suite; see [verification](/openwiki/operations/verification-and-test-strategy.md).
- **Any PRD/TRD wording describing billing as a preparation signal only**, and anywhere it says platform admin does not exist. Both were reversed by ADR-001 and ADR-006.

Two more drift from the code: README's Status table still lists CSV import as Planned, though `modules/import-export/` is built with no screen; and `docs/DATA_MODEL.md` stops at seven migrations and predates ADR-006/007/008. Prefer the module README, the ADR and the migration.

## Task routing

Each task names the invariant its diff must satisfy. Depth lives on the linked page, not here.

| If the task is… | Read | Must satisfy |
| --- | --- | --- |
| Add or change a screen under `/t/<code>/…` | [Workflows: scope and role authority](/openwiki/workflows/tenant-scoping-and-role-authority.md), [tenant isolation](/openwiki/architecture/tenant-isolation-and-rls.md) | 1, 2, 5, 24 (all six states), 26 |
| Add a module or move code | [Module boundaries and the data pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) | 7–15; module README if code-less |
| Change the schema | [Data model and RLS](/openwiki/architecture/data-model-and-rls.md), then [live Supabase and migrations](/openwiki/operations/live-supabase-and-migrations.md) | 20, 30, **36** before touching the project |
| Change billing math or a packet transition | [Billing](/openwiki/modules/billing.md), ADR-001 + ADR-003 | 27, 30 |
| Touch auth, role, membership | [Auth and provisioning](/openwiki/modules/auth-and-provisioning.md), [Tenancy](/openwiki/modules/tenancy.md) | 3, 4, 5, 6 |
| Touch attendance or the dropout rule | [Attendance and dropout eligibility](/openwiki/workflows/attendance-and-dropout-eligibility.md), ADR-007 | 14, 30 |
| Add a document state or blocker | [Document compliance](/openwiki/workflows/document-compliance-and-evidence.md), ADR-004 | 16, 24 |
| Fix a guard state or empty state | [Module boundaries](/openwiki/architecture/module-boundaries-and-data-pattern.md) §the snapshot union | 19 (guard order), 24 |
| Change an export or report | [Report assembly and export](/openwiki/workflows/reporting-and-export.md) | 23, 27 |
| Change copy | this page §the copy boundary | 27 |
| Edit a design-bundle directory | `RULES.md` §6 | 28 (`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are `[hook]`-protected) |

## The invariants that gate every change

Full list and enforcement levels: `RULES.md`. The four an agent breaks most often:

- **RLS is the boundary; a JS tenant check is not.** RULES rule 1 makes Postgres RLS (`app_private.*`) the decision; rule 2 says a JS-side tenant check used as access control is a bug even when it returns the right answer. The one allowed form is a `tenant_id = scope.tenantId` filter derived from a validated `TenantScope` (`modules/tenancy/domain/scope.ts`) — it *selects* which of the caller's schools a screen shows on top of RLS and never grants what RLS would deny. Both rules are `[review]`, so only a reader catches a violation.
- **No auth logic in JS.** Rule 3: the anon-key client carries the Clerk session token through the `accessToken` callback (never a hand-set `Authorization` header, never a JWT template), and a missing token must throw — `lib/supabase/server.ts` throws the exported `NO_CLERK_TOKEN_MESSAGE` so it surfaces as `sync-failed` instead of an empty `anon` read that looks like "no batches". The service-role key lives only in `lib/supabase/service.ts`.
- **The enum bridge lives in the mapper.** Rule 18 `[types]`: `DB_TO_UI_STAGE` is a total map, so a new DB enum variant fails compilation until its UI treatment is chosen. A new variant added to the union in `database.types.ts` is *not* enough — the mapper and the domain type need it too.
- **Snapshot guard order.** Rule 19: `ok` / `sync-failed` / `unconfigured` (plus `no-tenant-access` folded in by `withTenantAccess`) may never be backfilled with mock data, and a guard that tests "empty" before `sync-failed` silently swallows the banner whenever a failure yields zero rows.

Role rules are load-bearing rather than cosmetic: trainer DTOs omit billing deadline, billing preparation, NTP lag, BSRS and financial fields **server-side** (rule 5), and viewer is server-denied on writes (rule 4). Hiding a field in CSS is not compliance.

## The verification loop

Run in this order, from repo root. Each step proves a different thing and is blind to the others.

```bash
pnpm exec tsc --noEmit   # [types] 1 · enum-bridge totality
pnpm lint                # [lint] 2 · import direction, data-layer privacy
pnpm test                # 3 · behavioural pins (vitest run)
pnpm build               # 4 · only this catches Server Component compile errors
```

1. **tsc** — RULES rule 18 `[types]`. Nothing else catches a `DB_TO_UI_STAGE` map missing a variant, because the union lives in generated types, not in a lint rule.
2. **lint** — rules 7–10 `[lint]` via `import/no-restricted-paths` in `eslint.config.mjs`: `app → modules → shared → lib/supabase`, `data/` private to its module, `shared/` leaf-only, `database.types.ts` for data layers only. The config also *warns* at cyclomatic complexity 15 — a refactor prompt, not a gate. The PostToolUse hook lint-edits each file you save, which is not a substitute for the full run.
3. **test** — `pnpm test` is `vitest run` over the thirty-two specs in `tests/unit/`, which pin domain rules, snapshot guard ordering (rule 19) and rendered markup. Time-dependent behavior is frozen with `vi.setSystemTime` on a fixed as-of date (`batches.test.ts` uses `2026-06-01`), never the wall clock. Copy the nearest fixture's shape; do not invent a sparse one.
4. **build** — the only step that compiles Server Components. A page that typechecks can still fail the RSC boundary.

CI (`.github/workflows/ci.yml`) runs steps 1–3 on every PR and on `main`, on Node 22 — mandatory, because Vitest 4's rolldown throws `ERR_INVALID_ARG_VALUE` on Node 21 or older before any test loads, which looks nothing like a test failure. CI does **not** run `pnpm build`, does **not** run Playwright, and needs no secrets.

### What the loop cannot prove

- **No RLS coverage.** There is no `tests/integration/` or `tests/security/`, so every authorization claim rests on reading the migration (rule 35). A green suite says nothing about whether a policy admits the wrong row.
- **Mocks at the boundary.** `supabase-server.test.ts` mocks `createClient` and Clerk's `auth`; it pins how the client is *called*, not that Supabase accepts the call.
- **The schema you actually have.** Green unit tests run against `database.types.ts`, which can disagree with the live database.

`pnpm test:e2e` (Playwright, `e2e/auth.spec.ts` → `/dashboard` must redirect to `/sign-in`) needs `pk_test_*`/`sk_test_*` keys and a seeded Clerk test user from `.env.example`, and boots the app with `pnpm dev`. It exercises the `requireAuthenticatedUser()` gate, not `proxy.ts`.

## The live-database trap

There is **one hosted Supabase project and no staging**. RULES rule 36 is `[deny]` in `.claude/settings.json`, so an agent cannot request an exception mid-session. Blocked: `execute_sql` — **read-only `select`s included**, because the tool is denied rather than the statement kind — plus `apply_migration`, every branch operation, edge-function deploys, `supabase db push` / `db reset` / `migration up`, and `psql`.

The workflow is therefore: answer the schema question from the checked-in migrations and `database.types.ts` first; if that is not enough, state exactly what will run and why, then wait for explicit permission. `list_tables`, `list_migrations`, `get_advisors` and `search_docs` stay open — but `list_tables` row counts are `reltuples` planner estimates, not counts.

Two checked-in migrations, `supabase/migrations/20261024110000` (ADR-008 `billing_deadline`) and `20261111120000` (T2MIS terminal-report fields), carry their own `NOT APPLIED` headers. A header is a claim, not evidence. Confirm with `list_migrations` plus the named objects. Details: [live Supabase and migrations](/openwiki/operations/live-supabase-and-migrations.md).

Local dev is `pnpm install` then `pnpm dev`. Unset Supabase env means `isSupabaseConfigured()` is false and data functions return `unconfigured` snapshots; that is the honest empty state, not a bug to paper over.

## Before you open a PR

- Issue on the Linear team `TESDA-CAMS` only — it two-way syncs with this repo, so creating on both duplicates (rule 32). Branch `klynejoshua13/tes-NN-…` (rule 33).
- After a migration: regenerate `database.types.ts`, then update affected mappers and domain types (rule 20).
- Reviewers are read-only agents committed under `.claude/agents/` (rule 37); they keep `Bash` to run this loop themselves, so a claim they cannot reproduce is worth less than the output.d-only agents committed under `.claude/agents/` (rule 37); they keep `Bash` to run this loop themselves, so a claim they cannot reproduce is worth less than the output.
