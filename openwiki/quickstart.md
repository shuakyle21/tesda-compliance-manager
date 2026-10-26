---
type: Reference
title: Quickstart and Change Routing
description: "First stop before changing TVI-CAMS: what the system is and where the official-systems copy boundary lies, the doc-reading order and the full ADR precedence chain, the invariants that gate every change and their enforcement levels, the exact verification loop, and a task → page routing table over the fixed four-page set."
tags: ["quickstart", "task-routing", "onboarding", "invariants", "verification", "tesda-compliance-manager", "nextjs", "supabase", "clerk", "rls", "migrations", "adr-precedence"]
verified:
  - by: openwiki/0.5.0
    at: 2026-10-26T00:51:40.902Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-89a62965cacab8710f57d4cf
    resource: repo://.github/workflows/qodana.yml
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
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
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-79c2984b4ebc22667b81e541
    resource: repo://supabase/migrations/20261024071359_adr007_attendance_dropout_rule.sql
  - id: openwiki-source-bde01a456257d0b7caf19920
    resource: repo://supabase/migrations/20261024110000_add_dashboard_operational_fields.sql
  - id: openwiki-source-acb73c82b90d7c0325351e5f
    resource: repo://supabase/migrations/README.md
  - id: openwiki-source-2020074c6fdeab02aae020b7
    resource: repo://tests/unit/batches.test.ts
  - id: openwiki-source-4b1944144311805b722ef6ef
    resource: repo://tests/unit/dashboard-domain.test.ts
  - id: openwiki-source-892600aba8a4baaca4ccc7a9
    resource: repo://tests/unit/doc-blockers.test.ts
  - id: openwiki-source-34d1790c8509224339ebf77e
    resource: repo://tests/unit/redirect-url.test.ts
  - id: openwiki-source-5840c4db50eac7206a874ca9
    resource: repo://tests/unit/sign-in-verification.test.ts
  - id: openwiki-source-763cabdcd60de0e5da8f9a60
    resource: repo://tests/unit/supabase-server.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-10-26T00:51:40.902Z" }
---

# Quickstart and Change Routing

This is the first page an agent or human opens before touching TVI-CAMS. It is a routing map, not a tutorial: orient on the system, find the page that answers your task, know the invariants no change may cross, and know how to verify work. Mechanism lives on the three architecture pages; this page only tells you which one owns your task and which rule locks it.

## What TVI-CAMS is

TVI-CAMS (TESDA Compliance Manager) is an **internal multi-tenant compliance working layer** for TVI schools running TESDA scholarship batches (TWSP/CFSP). It tracks batch lifecycle, documents, attendance, and LAMR evidence, and generates the school's billing documents as populated `.docx` templates — TSF/Allowance, Training Cost, Entrepreneurship; Assessment Fee is out of scope (ADR-001).

**The official-systems boundary.** This tool never holds official standing. TESDA's **SIS, T2MIS, and BSRS remain authoritative** for official records, approved qualification maps, schedules, ULI records, attendance submissions, billing documents, and required reports; the database stores internal working copies, evidence, status tracking, and references to official records. UI copy must never imply official TESDA approval or submission (RULES rule 27) — and a packet marked `submitted` or `settled` is a person's bookkeeping note, not an official fact (ADR-003 P3). The practical consequence: never "fix" a discrepancy by editing the app to match a screen, and never write copy like "submitted to TESDA" for an action that only flips a column here.

Facts you need before reading code, none of which this page explains further:

- **Tenants:** three initial schools — AKB, J3ED, NEN — scoped by Supabase RLS; new schools are provisioned through `/schools/new`. Tenant context lives in the URL path segment, `/t/<tenantCode>` ([overview, scoped routing](/openwiki/architecture/overview.md#scoped-routing--ttenantcode)).
- **Roles:** `admin`, `coordinator`, `trainer`, `viewer` — lowercase `profile_role` values that are the authority; capitalized labels are display copy (`CONTEXT.md`). Clerk is identity only.
- **Platform admin (ADR-006):** a separate axis from `profile_role`, never a fifth role value, resolved through a `security definer` RPC; its reach is the school registry only.
- **Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Supabase (Postgres + Storage), Clerk, pnpm as the only package manager. One app talks directly to Supabase; there is no separate backend.

## Run it locally

```bash
pnpm install
pnpm dev          # Next.js dev server (next dev --webpack) on :3000
```

`.env.example` documents the Clerk test keys (`pk_test_*` / `sk_test_*`) the e2e suite needs. The Supabase pair is `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, read by [`lib/supabase/server.ts`](/lib/supabase/server.ts); `SUPABASE_SERVICE_ROLE_KEY` is read only by [`lib/supabase/service.ts`](/lib/supabase/service.ts), for the Clerk webhook, and must never reach client code (rule 3). With the Supabase pair unset, `isSupabaseConfigured()` is false and data functions return `unconfigured` snapshots instead of fabricated data (rule 19) — a half-configured local run fails honestly rather than lying.

**Node 22+ is required** (`engines` in [`package.json`](/package.json)). See the verification loop for why.

## Read the docs in this order

1. [`README.md`](/README.md) — what this is, features, roles, layout, commands.
2. [`CONTEXT.md`](/CONTEXT.md) — domain model and ubiquitous language (Batch, RQM, NTP, ULI, tranche, readiness gate, "untracked"…).
3. [`CLAUDE.md`](/CLAUDE.md) — architecture guidance and the *why* behind the invariants.
4. [`RULES.md`](/RULES.md) — the *what*: the non-negotiable checklist, each rule tagged with its enforcement level. **Read it before any code change.** Where `CLAUDE.md` and `RULES.md` appear to disagree, **RULES.md wins** and the drift gets fixed. Rule 34 is one such stale line: it still says there is no test runner and `pnpm test` is a placeholder, while [`package.json`](/package.json) defines `pnpm test` as `vitest run` and `tests/unit/` holds 26 Vitest specs.

### ADR precedence

RULES rule 30 is the chain, and it resolves in one direction: `docs/adr/` wins over anything in `docs/MASTER_PRD_SRS.md` and `docs/TRD.md`. Never quote superseded PRD wording as current.

| ADR | Effect on the chain | Status |
| --- | --- | --- |
| [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md) | Billing is a document-generating engine; supersedes conflicting "billing = preparation signal only" PRD/TRD wording. Locks progress `=` `sessions_held ÷ total_sessions`, one RQM = one batch, NoLedger. | base of the chain |
| [ADR-003](/docs/adr/ADR-003-billing-packet-queue.md) | **Amends ADR-001 §4**: the packet queue is a derived projection; `due_date` derived, never stored (P5). | amends |
| [ADR-004](/docs/adr/ADR-004-untracked-document-semantics.md) | A requirement with no record is `untracked` — excluded from measurement, failing closed at gates, decided once in `modules/documents/domain/compliance.ts`. | accepted |
| [ADR-006](/docs/adr/ADR-006-platform-admin-and-school-registry.md) | **Supersedes FR-02's "no Super Admin"**: a platform admin exists, registry-scoped only. Extending its reach needs its own ADR. | supersedes |
| [ADR-007](/docs/adr/ADR-007-attendance-based-dropout-rule.md) | **Supersedes ADR-001's `Elig` row**: dropout is absences above 20% of `total_sessions` **or** 3 consecutive unexcused absences. The retired ≥5-absence count and `max_absences` column are gone. | supersedes |
| [ADR-008](/docs/adr/ADR-008-recorded-batch-billing-deadline.md) | **Amends ADR-003 P5** for the batch-level deadline only: `batches.billing_deadline` is recorded, null means *not recorded*; packet `due_date` stays derived. | proposes |

ADR-002 and ADR-005 remain accepted and load-bearing for scope (the prototype portrays the ADR-001 target; one membership per profile, seeds never migrations).

## The fixed four-page wiki

Four pages: this one plus three architecture pages. No fifth page. UI, token, state, and copy questions route to [`RULES.md`](/RULES.md) §4–§5 — rules 21–26 (icons, fonts, tokens, status-by-text-and-icon, the six mandated data-screen states, primitive reuse, Server-Component default) and rule 27 (copy framing); [`CLAUDE.md`](/CLAUDE.md) carries the *why*.

| Page | Answers |
| --- | --- |
| [Architecture Overview](/openwiki/architecture/overview.md) | The map: stack, the Clerk → proxy → `requireAuthenticatedUser()` → RLS request path, [scoped `/t/<school>` routing](/openwiki/architecture/overview.md#scoped-routing--ttenantcode), role authority vs. presentation role, the lint-enforced [import model](/openwiki/architecture/overview.md#the-four-layer-import-model), the module catalog, build/run/test. |
| [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) | Schema shape, enums, the [migration history](/openwiki/architecture/data-model-and-rls.md#migration-history), the `app_private.*` helper chain and [per-table policy map](/openwiki/architecture/data-model-and-rls.md#per-table-policy-map), the [ADR-006 boundary](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006), the [regeneration contract](/openwiki/architecture/data-model-and-rls.md#the-database-types-regeneration-contract), rule-36 guardrails. |
| [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) | Where code goes, [import direction](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-never-edges), the private `data/` surface, [fetch → map → derive](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-reference-implementation), the [snapshot union](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-snapshot-union-ok--sync-failed--unconfigured-plus-no-tenant-access) and its [guard ordering](/openwiki/architecture/module-boundaries-and-data-pattern.md#guard-ordering), [enum bridges](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-enum-bridge-and-the-total-map-rule). |

## Invariants that gate every change

Each row names its enforcement level and the rule number to cite in review. **[hook]** and **[deny]** cannot be talked past; **[lint]** and **[types]** fail a gate you must run below; **[rls]** is not application code at all.

| # | Invariant | Lock |
| --- | --- | --- |
| 1 | **RLS is the security boundary; UI hiding is usability only.** Every authorization decision is Postgres RLS via `app_private.*`. A JS-side tenant check used *as* access control is a bug even when it returns the right answer — it signals the query was written assuming no RLS. A `tenant_id = scope.tenantId` filter off a validated `TenantScope` is allowed because it only *selects* among rows RLS already allows. | rule 1, rule 2, **[rls]** / **[review]** |
| 2 | **The service-role key never reaches client code**, and the server client authenticates by Clerk `accessToken` callback (never a hand-set `Authorization` header, never a JWT template). A missing token throws rather than querying as `anon`. | rule 3, **[review]** |
| 3 | **Reviewers are read-only and live in the repo** (`.claude/agents/`, a `tools:` list without Edit/Write) — a reviewer that edits what it reviews has no independence. | rule 37, **[review]** |
| 4 | **Import direction is `app → modules → shared → lib/supabase`**; another module's `data/` is private; raw `database.types.ts` rows are data-layer only. | rule 7, rule 8, rule 10, **[lint]** |
| 5 | **The enum bridge is a total map in the mapper**, so a new DB variant fails compilation until its UI treatment is chosen. | rule 18, **[types]** |
| 6 | **Discriminated snapshots are never faked.** Neither `unconfigured` nor `sync-failed` substitutes mock data, and the guard clause must check "empty" *before* `sync-failed` or a failure yielding zero rows silently swallows the banner. | rule 19, **[review]** |
| 7 | **Never execute statements against the live Supabase project without explicit permission** — `execute_sql` *including read-only `select`s*, `apply_migration`, branch create/merge/reset, edge deploys, by any route (MCP, CLI, `psql`). One hosted project, no staging. | rule 36, **[deny]** |
| 8 | **After any migration, regenerate `lib/supabase/database.types.ts`**, then update affected mappers and domain types; new migrations are additive. | rule 20, **[review]** |
| 9 | **ADR precedence closes doors.** Granting `app_private.is_platform_admin()` any compliance table, or letting it seat itself into a tenant, needs its own ADR; no surface re-decides untracked-document semantics. | rule 30, **[review]** |
| 10 | **Locked domain facts code must not contradict**: progress is `sessions_held / total_sessions`; the ADR-007 dropout rule; one RQM code = one batch; ULI is the permanent learner key; tenant context in the URL path; alerts computed on read (no cron, no email); packet lifecycle `draft → ready → generated → submitted → settled`. | `RULES.md` §"Locked domain facts", **[review]** |
| 11 | **`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are do-not-edit handoff** — ported verbatim, `globalIgnores`d, edit-blocked. | rule 28, **[hook]** |

Viewer is read-only and server-denied on writes (rule 4), and trainer-facing DTOs omit billing deadline, billing preparation, NTP lag, BSRS, and financial fields server-side (rule 5) — both are trimming rules that a client-side `hidden` class silently breaks.

## Verification loop

Run all four, in order, commands exactly as invoked, and see green before calling work done:

```bash
pnpm exec tsc --noEmit  # strict typecheck — rule 18 compiles against it; there is no script for this
pnpm lint               # ESLint flat config — rules 7, 8, 9, 10 are import/no-restricted-paths zones in eslint.config.mjs
pnpm test               # Vitest over tests/unit/ — rule 19, rule 34, the guard-ordering and domain rules
pnpm test:e2e           # Playwright — rule 1: proves the layout gate, not proxy.ts, redirects
```

- `pnpm test` runs `vitest run` (include `tests/unit/**/*.test.ts`, [`vitest.config.mts`](/vitest.config.mts)) across 26 spec files. Time-dependent behavior is pinned by fixing the clock rather than trusting the runner's: [`batches.test.ts`](/tests/unit/batches.test.ts) wraps its `daysToBilling` block in `vi.setSystemTime('2026-06-01T00:00:00.000Z')`, and `dashboard-domain.test.ts` is as-of by construction because `daysToBilling` is already precomputed on its fixtures. Keep that shape — a spec that reads the real clock goes red on an unrelated day.
- **Node 22+ is required for `pnpm test`:** Vitest 4's rolldown calls `util.styleText` with an array argument and throws `ERR_INVALID_ARG_VALUE` at startup on Node 21 or older. The failure is a bundler stack trace before any test loads, not a test failure — do not read it as one.
- `pnpm test:e2e` boots the app through the `webServer` (`pnpm dev`) in [`playwright.config.ts`](/playwright.config.ts); `e2e/global.setup.ts` fetches a Clerk testing token and [`e2e/auth.spec.ts`](/e2e/auth.spec.ts) asserts an unauthenticated `/dashboard` visit redirects to `/sign-in`. **Clerk test keys only** per `.env.example`, never production keys.
- No CI workflow runs this loop — `.github/workflows/` holds Qodana and OpenWiki, neither of which lints, typechecks, or tests. Green is a local, self-imposed gate. Real-Supabase RLS/tenant-isolation tests are still outstanding and must run against the hosted project with no mocks (rule 35).

## Durable substrate facts a change must account for

Read these from checked-in records, never from the live project (rule 36). Two checked-in facts already bite:

1. **The type layer and the schema are out of step in both directions.** `lib/supabase/database.types.ts` carries `billing_deadline` **by hand** ahead of its migration, while holding no `excused`, no `max_absence_percent` (nor even the retired `max_absences`), and no billing tables. Regeneration is only safe against a database that already has everything the file describes.
2. **Nothing reads the ADR-007 or ADR-008 columns yet.** `max_absence_percent` and `excused` have no code caller — `modules/attendance/` holds a README only, and `modules/attendance/domain/eligibility.ts` is planned, not built. [`modules/batches/data/batches.ts`](/modules/batches/data/batches.ts) reads `row.billing_deadline ?? null`, so every batch reports "not recorded" until `20261024110000` applies, and no edit path exists to enter a deadline. The ADR-007 rule is currently schema and docs.

Broader state — migration ledger by date, the one policy no migration defines, storage I/O unverified under issue #122, the unimported blocker-gate family — belongs to the [data model page](/openwiki/architecture/data-model-and-rls.md#migration-history); consult it rather than assuming.

## Task → page routing

Every row names the owning page, the raw rule that locks the change, and the ADR when one governs. Before any of them, read `RULES.md`.

| Task family | Route | Lock |
| --- | --- | --- |
| Orient: stack, auth chain, scoped routing, roles, module catalog | [overview](/openwiki/architecture/overview.md), [the auth chain](/openwiki/architecture/overview.md#the-auth-chain) | rules 1, 2 |
| Sign-in, post-sign-in redirect handling, MFA, error shaping | [overview, the auth chain](/openwiki/architecture/overview.md#the-auth-chain) + `modules/auth` (`sanitizeRedirectUrl` in [`modules/auth/domain/redirectUrl.ts`](/modules/auth/domain/redirectUrl.ts), covered by `tests/unit/redirect-url.test.ts`) | rule 3 |
| Where code goes, adding a module, import boundaries | [module-boundaries, layer model](/openwiki/architecture/module-boundaries-and-data-pattern.md#layer-model) | rules 7, 8, 9, 10, 11, 12 |
| New entity data layer, snapshot states, enum bridges, `no-tenant-access` fold | [module-boundaries, the reference implementation](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-reference-implementation) and [guard ordering](/openwiki/architecture/module-boundaries-and-data-pattern.md#guard-ordering) | rules 17, 18, 19 |
| Document compliance (untracked, gate vs. measurement, evidence paths) | [module-boundaries](/openwiki/architecture/module-boundaries-and-data-pattern.md) + [ADR-004](/docs/adr/ADR-004-untracked-document-semantics.md) | rule 19, ADR-004 |
| Schema, migrations, enums, triggers, the evidence bucket | [data-model-and-rls](/openwiki/architecture/data-model-and-rls.md) | rules 20, 36 |
| Adding a migration or regenerating `database.types.ts` | [data-model-and-rls, the regeneration contract](/openwiki/architecture/data-model-and-rls.md#the-database-types-regeneration-contract) + [`supabase/migrations/README.md`](/supabase/migrations/README.md) in the same PR | rules 20, 36 |
| RLS policies, `app_private.*` helpers, tenant isolation | [data-model-and-rls, the RLS decision machinery](/openwiki/architecture/data-model-and-rls.md#the-rls-decision-machinery) and [policy map](/openwiki/architecture/data-model-and-rls.md#per-table-policy-map) | rules 1, 2, 4 |
<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
| Provisioning a school; platform admin; registry; COPR | [data-model-and-rls, ADR-006 boundary](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006); path [`schools/new/actions.ts`](/app/(dashboard)/schools/new/actions.ts) → [`modules/tenancy/data/schools.ts`](/modules/tenancy/data/schools.ts) | rules 30, 36, ADR-006 |
| Adding a user; profile provisioning | [data-model-and-rls, profile provisioning](/openwiki/architecture/data-model-and-rls.md#profile-provisioning-and-user-administration) | rule 3 (service-role-only path) |
| Billing and packet work | [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md) → [ADR-003](/docs/adr/ADR-003-billing-packet-queue.md) → [ADR-008](/docs/adr/ADR-008-recorded-batch-billing-deadline.md); stale P5 wording is not current | rule 30 |
| Dropout / eligibility | [ADR-007](/docs/adr/ADR-007-attendance-based-dropout-rule.md) — the ≥5-absence rule is retired even where older prose still cites it | rule 30 |
| Dashboard urgency, alerts, attention ordering | [overview](/openwiki/architecture/overview.md); rules are live in `modules/batches/domain/` (`urgency.ts`, `attention.ts`), covered by `dashboard-domain.test.ts` | rule 14 (pure `domain/`) |
| UI rules, tokens, states, copy, icons | [`RULES.md`](/RULES.md) §4–§5; [`CLAUDE.md`](/CLAUDE.md) carries the why | rules 21–27 |
| Domain vocabulary, locked facts | [`CONTEXT.md`](/CONTEXT.md) + `RULES.md` §"Locked domain facts" | — |
| Touching the live database at all | [data-model-and-rls, operations](/openwiki/architecture/data-model-and-rls.md#operations-and-agent-constraints-rules-10) | rule 36, **[deny]** |
| Verifying a change | the [verification loop](#verification-loop) above | — |

## Related pages

- [Architecture Overview](/openwiki/architecture/overview.md)
- [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md)
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md)
