---
type: Operations Guide
title: Verification Loop and Test Strategy
description: The ordered typecheck → lint → test loop, what the CI check job blocks on and what stays outside it, why Node 22 is a startup requirement, how specs pin the clock instead of reading it, and the boundary the suite never crosses — mocked clients and a non-existent RLS suite.
tags: [testing, verification, vitest, playwright, lint, typecheck, ci, rls]
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-89a62965cacab8710f57d4cf
    resource: repo://.github/workflows/qodana.yml
  - id: openwiki-source-7c03237a6b57ffb3e526a51b
    resource: repo://.nvmrc
  - id: openwiki-source-1f0a12ecb6e407c4e68e28d8
    resource: repo://app/(dashboard)/layout.tsx
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-624c50c8276ea1f31b187ca3
    resource: repo://docs/adr/ADR-005-demo-account-tenant-scoping.md
  - id: openwiki-source-dc20addc30fb71fa529c13bd
    resource: repo://docs/IMPLEMENTATION_PLAN.md
  - id: openwiki-source-77b021311c7cb4c8d8432fb2
    resource: repo://e2e/auth.spec.ts
  - id: openwiki-source-2dca4e2a28dbda97e3884837
    resource: repo://e2e/global.setup.ts
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-58478215433a32dbc8ee2b3e
    resource: repo://modules/import-export/README.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-bf0c465e02a9ab972575ad35
    resource: repo://qodana.yaml
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-d81538d8891efe37053aeccb
    resource: repo://supabase/config.toml
  - id: openwiki-source-ab3c62d5452f5df905bfc01d
    resource: repo://supabase/seeds/dev_profile_memberships.sql
  - id: openwiki-source-2020074c6fdeab02aae020b7
    resource: repo://tests/unit/batches.test.ts
  - id: openwiki-source-4b1944144311805b722ef6ef
    resource: repo://tests/unit/dashboard-domain.test.ts
  - id: openwiki-source-d779956f2a715b2e3f40cf22
    resource: repo://tests/unit/learner-import.test.ts
  - id: openwiki-source-763cabdcd60de0e5da8f9a60
    resource: repo://tests/unit/supabase-server.test.ts
  - id: openwiki-source-0fd3605db2590862922583b6
    resource: repo://tests/unit/tenant-access.test.ts
  - id: openwiki-source-15e8a5a27099d775d1c019e1
    resource: repo://tests/unit/tenant-scope.test.ts
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-11-21T03:38:28.236Z" }
verified:
  - by: openwiki/0.5.0
    at: 2026-11-21T03:38:28.236Z
---

# Verification Loop and Test Strategy

`RULES.md` §9 is stale in the repository and this page does not repeat it. Rule 34 still says there
is "no test runner yet" and that `pnpm test` is a placeholder; [`package.json`](/package.json)
defines `pnpm test` as `vitest run` over 31 specs in `tests/unit/`, and rules 7–10 are already
enforced by `import/no-restricted-paths` in [`eslint.config.mjs`](/eslint.config.mjs). Rule 35's
substance — fixed as-of dates, no mocks for RLS — is live and is what this page documents. Treat
rule 34 as describing an earlier state.

## The loop, in order, and what each step defends

Run all three before calling a change done. The order is cheapest-signal first, so an architecture
breach is reported before a test wastes a minute proving it.

1. **`pnpm exec tsc --noEmit`** — rule 18 (`[types]`). `DB_TO_UI_STAGE` in
   `modules/batches/data/batches.ts` is a *total* map, so a new DB enum variant fails compilation
   until someone chooses its UI treatment. The typecheck is also the only thing standing behind
   every "typed against real Supabase" claim in the data layer, since no test resolves a live schema.
   **There is deliberately no npm script for it** ([`CLAUDE.md`](/CLAUDE.md) lists it as `pnpm
   exec`): typecheck is a step in a sequence, not a product command, and a `typecheck` alias would
   read like a build. `tsconfig.json` is `strict`, `noEmit`, and includes `**/*.mts`, so the Vitest
   config is typechecked too.
2. **`pnpm lint`** — rules 7–10 (`[lint]`; the script is bare `eslint` over the flat config). The
   `import/no-restricted-paths` zones put `app → modules → shared → lib/supabase` in the linter:
   another module's `data/` is private, `shared/` may not import `modules/` or `app/`, and
   `database.types.ts` is data-layer only. This block is the only automated defence of those rules,
   which is why the rule tags read `[lint]` and not `[review]`. See
   [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).
   The config also carries a `complexity: ["warn", 15]` audit — a warn-only prompt, never a red.
3. **`pnpm test`** — rules 19 and 35. `vitest run` over `tests/unit/**/*.test.ts` in a `node`
   environment, aliasing `@/` so specs import application source directly
   ([`vitest.config.mts`](/vitest.config.mts)). The suite is fixture-in/function-out: it covers
   `domain/` layers, mappers, and the pure fast-fail halves of `data/` functions. Rule 19's guard
   ordering is pinned where it lives — `tests/unit/tenant-access.test.ts` asserts that
   `withTenantAccess` never overwrites a `sync-failed` or `unconfigured` snapshot with the tidier
   `no-tenant-access` story, so a refactor to `status === 'ok' ? … : …` goes red instead of
   silently swallowing the banner
   ([`tests/unit/tenant-access.test.ts`](/tests/unit/tenant-access.test.ts#L92-L97)).

`pnpm build` is the fourth thing worth running and is not a test: it is the only check that the
App Router component is caught by compilation as Next renders it, which `tsc` alone does not cover
for Server Components. **CI does not run it** (below), so on any change that touches a Server
Component or a route file, run it locally.

## What CI does and does not run

[`.github/workflows/ci.yml`](/.github/workflows/ci.yml) is the only workflow that gates code, added
after a broken build and a broken component both reached `main` with every other check green. It
fires on every `pull_request` and every push to `main`, holds a `concurrency` group of
`ci-${{ github.ref }}` with `cancel-in-progress: true` so superseded runs die with the old commit,
and runs one `check` job under a 15-minute timeout with `permissions: contents: read`:

1. `actions/checkout@v4`, then `pnpm/action-setup@v4` (version read from `packageManager`), then
   `actions/setup-node@v4` with `node-version: 22` and `cache: pnpm`;
2. `pnpm install --frozen-lockfile`;
3. **`pnpm lint`** → **`pnpm exec tsc --noEmit`** → **`pnpm test`**, in that order, any of which
   fails the job.

The comment at the top of the file states the reason the job needs no secrets: the unit suite makes
no Supabase or Clerk call. The order matters as much as the set — lint runs before typecheck, so a
boundary breach is reported as the architecture violation it is rather than behind a type error in
the same change.

Everything else in `.github/workflows/` is noise for a code review. `openwiki-update.yml` commits
regenerated wiki pages, `claude.yml`/`claude-code-review.yml` post agent commentary, `stale.yml`
closes idle issues, and `qodana.yml` runs the JetBrains `qodana-js` starter profile — which reports
findings but, because `qodana.yaml` leaves `failureConditions` commented out, has no severity
threshold to fail a run. `ci.yml` is the only file whose red blocks a merge.

Two things stay outside it, and both are deliberate local obligations rather than oversights:

- **`pnpm build` is not a CI step.** Only App Router compilation catches some Server Component
  errors, so a green PR proves `tsc` and the suite, never that the app builds.
- **`pnpm test:e2e` is not a CI step.** It boots a dev server and needs Clerk testing keys and
  Supabase env; nothing in the workflow provides them. It remains a permission-gated local run.

So "CI is green" means lint, types and units — a real claim, and a narrower one than "it works".
Log a red test's exact command and output in the PR rather than asserting it passed, and run the
loop locally before you push: CI reports a breach, it does not replace the habit.

## Node 22 is a startup requirement, not a style preference

`engines` pins `>=22`, [`.nvmrc`](/.nvmrc) holds `22`, and the workflow's `setup-node` step is
commented with the reason. Use that version; `nvm use` in the repo root reads the file.

The mechanism matters because the failure is unrecognisable. Vitest 4's bundler, rolldown, calls
`util.styleText` with an **array** argument while formatting its startup output. On Node 21 or
older `styleText` accepts only a string, so the call throws `ERR_INVALID_ARG_VALUE` **before a
single test file loads**. What reaches the terminal is a bundler trace from inside rolldown, with
no test counts and no failing spec — read as a test failure, it sends you looking at the spec you
just edited. If `pnpm test` dies with no summary at all, check `node -v` first.

## Pinning the clock: fixed as-of dates

A domain rule that compares a deadline to *now* reads the real clock if the spec lets it, so the
spec turns red on an unrelated Tuesday and green again on Wednesday. Rule 35 forbids that, and the
shape to copy is [`tests/unit/dashboard-domain.test.ts`](/tests/unit/dashboard-domain.test.ts#L9-L43):
it says outright that `daysToBilling` is precomputed by the mapper, then builds every case from a
`dated(days)` helper with `daysToBilling` baked in — `-5` for overdue, `BILLING_DUE_WINDOW_DAYS + 1`
for just past the window. No clock is read anywhere in that file.

The mapper is the one place a real clock *is* read (`daysUntil` calls `Date.now()` downstream), so
the spec that exercises it freezes time instead of accepting it:
[`tests/unit/batches.test.ts`](/tests/unit/batches.test.ts#L145-L159) calls
`vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))` in `beforeEach` — with no
`vi.useFakeTimers()`, which throws without fake timers already installed — and restores with
`vi.useRealTimers()` in `afterEach`. Its assertion is a day count (`19`) derived from two fixed
calendar dates, never from "about 19 days from whenever". It is the only `setSystemTime` call in
the whole suite, which is a measure of how much of the code takes its as-of date as input instead.

Two habits follow. **Prefer the domain shape to the timer shape**: if a function can take the
as-of date as input, fixtures become literals with no setup to forget. **Pin holiday and boundary
dates, not today's**: `tests/unit/status-render.test.ts` asserts `-313` renders `313D OVERDUE` and
`0` renders `TODAY` — calendar truths that stay true.

## What the unit suite does and does not prove

It proves pure logic and the *decision* a function makes. It does not prove the database, and it
does not prove a call chain. `tests/unit/supabase-server.test.ts` mocks `createClient` and Clerk's
`auth` outright and says so in its header: it is a test of how
[`lib/supabase/server.ts`](/lib/supabase/server.ts) chooses to call them — the `accessToken`
callback receives no template argument, a missing token throws `NO_CLERK_TOKEN_MESSAGE` instead of
degrading to `anon` — "not an integration test against real Supabase/Clerk". The same holds for
`auth-provisioning` (service client mocked), `sign-in-verification` (Clerk widgets mocked),
`rqm-action` (scope, role, activity and the whole batches data module mocked), and `sidebar` (React
hooks mocked). Read a green mock spec as "this branch is written correctly", never as "the chain
works".

Some `data/` functions are only partly covered, and the uncovered half is exactly the I/O half: the
write-path flow of `importLearnersCsv` has no test at all, while its `domain/` half and its pure
`summariseWrites` do. Where a suite looks thin, check whether the missing coverage is I/O before
assuming regression.

## The one e2e spec, and the permission it needs

`pnpm test:e2e` runs Playwright with one spec. [`playwright.config.ts`](/playwright.config.ts)
starts the app itself through `webServer: { command: 'pnpm dev' }` and reuses a server already on
`PORT` outside CI, so it boots a real Next dev server, not a mock. `global.setup.ts` runs as a
prior project and calls `clerkSetup()` once to obtain a Clerk Testing Token; the spec calls
`setupClerkTestingToken({ page })` to get past bot detection.

[`e2e/auth.spec.ts`](/e2e/auth.spec.ts) does one thing: `page.goto('/dashboard')`, then
`waitForURL(/\/sign-in/)`. **What it proves is the gate's location.** `proxy.ts` only copies the
pathname into an `x-pathname` header; the redirect comes from `requireAuthenticatedUser()` as the
<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
first statement of [`app/(dashboard)/layout.tsx`](/app/(dashboard)/layout.tsx#L12-L13). A move back
to middleware gating — or a route group accidentally placed outside `(dashboard)` — is exactly what
this catches, and it is rule 1's standing proof. It is *not* a journey suite: no signed-in role
variant, no upload, no modal focus trap. `E2E_CLERK_USER_EMAIL`/`_PASSWORD` are documented in
[`.env.example`](/.env.example) for the signed-in cases still to be written.

It needs Supabase env plus a Clerk **test** instance, so it is permission-gated: establish the
environment with the operator before running it. [`.env.example`](/.env.example) documents the
`pk_test_*`/`sk_test_*` pair and says to use nothing else. **Never point it at production Clerk
keys** — the global setup registers real testing tokens, and dev-instance user IDs do not exist in
the production instance ([ADR-005](/docs/adr/ADR-005-demo-account-tenant-scoping.md)). Because no CI
job supplies the secrets, an e2e run is always a local, announced act, never something a PR check
will do for you.

## Two gaps to know before trusting green

**RLS has no automated coverage at all.** Rule 35 requires real-Supabase RLS and tenant-isolation
tests with **no mocks** — two tenants, two users, prove user A cannot read tenant B.
`docs/IMPLEMENTATION_PLAN.md` §5.3 reserves `tests/integration/` and `tests/security/` for them,
but neither directory exists, so every authorization claim in the wiki rests on reading migrations.
Green means domain and mapper correctness only; **a tenant leak ships green.**
[`tests/unit/tenant-scope.test.ts`](/tests/unit/tenant-scope.test.ts) is the closest thing to a
tenant test and it is pure — it pins the JS selection layer, not the policies underneath it.

Two consequences:

- Any test that does call the hosted project walks through rule 36 (`[deny]`): no statement against
  live Supabase without explicit permission, read-only `select` included. Set the environment up
  first and ask — see [Live Supabase and Migrations](/openwiki/operations/live-supabase-and-migrations.md),
  where missing variables make an RLS test fail in a way that reads like a policy bug.
- Because there is no staging and one hosted project, the tests that would prove the security
  boundary are the ones with the highest setup cost and the most to lose. That is the honest reason
  the gap persists — see [Tenant Isolation and RLS](/openwiki/architecture/tenant-isolation-and-rls.md).
  CI closing the loop above changed nothing here: a green check still says nothing about a policy.

**Every mock boundary is a place a test can pass while the feature is broken.** See the mock list
above. When you touch a mocked dependency, the spec tells you the code still calls the mock the
same way — it does not tell you the real client behaves as the mock pretends.

## Writing a spec that will hold

- **Assert the behaviour, not the call.** `tenant-scope.test.ts` mocks `@/modules/auth/data/auth`
  with an **admin** role in metadata specifically so that a `resolveTrustedRole` which quietly
  consulted Clerk would fail.
- **Pin the silent failure first.** Rule 19's guard-order bug produces a page, not an error. The
  test that matters asserts the banner survives, not that the page renders.
- **Write the header comment for the next reader.** Several specs open with the failure mode they
  exist to prevent; keep it, and update it when the reason changes.
- **Prefer a literal fixture over a builder that reads the clock.** If a builder must, `dated(days)`
  in `dashboard-domain.test.ts` is the shape to copy — and `batches.test.ts` derives its row type
  from `Parameters<typeof mapBatchRow>[0]` rather than hand-copying the mapper's private join shape.

## Where to go next

Rules 7–10 in detail: [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).
Rule 19's guard ordering and honest empty states belong with the snapshot union there.
Rule 36 and the hosted project: [Live Supabase and Migrations](/openwiki/operations/live-supabase-and-migrations.md).
