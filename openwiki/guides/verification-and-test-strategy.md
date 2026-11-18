---
type: Guide
title: Verification and Test Strategy
description: How to prove a change here — the pnpm lint → pnpm exec tsc --noEmit → pnpm test chain on Node 22+, what the 32 unit specs actually pin and the stale-test trap, why e2e/auth.spec.ts exists, and the real-Supabase RLS suite that still does not.
tags: [testing, verification, vitest, playwright, lint, typecheck, node-22, stale-tests, rls]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-18T01:01:49.569Z
sources:
  - id: openwiki-source-be5cf73d76241cd97cfddc1d
    resource: repo://.github/workflows/claude-code-review.yml
  - id: openwiki-source-89a62965cacab8710f57d4cf
    resource: repo://.github/workflows/qodana.yml
  - id: openwiki-source-fac1d0830b5bfbb903fdd40f
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/dashboard/page.tsx
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-d1de308195c9d7cacf1287f3
    resource: repo://docs/DASHBOARD_DESIGN_AUDIT_2026-10-24.md
  - id: openwiki-source-dc20addc30fb71fa529c13bd
    resource: repo://docs/IMPLEMENTATION_PLAN.md
  - id: openwiki-source-77b021311c7cb4c8d8432fb2
    resource: repo://e2e/auth.spec.ts
  - id: openwiki-source-2dca4e2a28dbda97e3884837
    resource: repo://e2e/global.setup.ts
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-2aff630ed0688d80b1b707c8
    resource: repo://modules/auth/data/provisioning.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-13117a840913dd27670d0422
    resource: repo://supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql
  - id: openwiki-source-79c2984b4ebc22667b81e541
    resource: repo://supabase/migrations/20261024071359_adr007_attendance_dropout_rule.sql
  - id: openwiki-source-c25ad52388e27abc8c91b43f
    resource: repo://tests/unit/auth-provisioning.test.ts
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
  - id: openwiki-source-4a8c4e61ab290d00b22b6541
    resource: repo://tests/unit/urgency.test.ts
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T01:01:49.569Z" }
---

# Verification and Test Strategy

Three things have to be true before a change is done: the linter has not seen an architecture
breach, the compiler has seen the enum, and the suite is green on code you understand. Run
`pnpm lint --max-warnings 0`, then `pnpm exec tsc --noEmit`, then `pnpm test`. Add `pnpm build` when
the change touches a route or a Server Component.

`RULES.md` §9 is **stale in the repository** and this page does not inherit its framing: rule 34
says "There is no test runner yet — `pnpm test` is a placeholder" and pushes standing Vitest up to
"Phase 0.4" of `docs/IMPLEMENTATION_PLAN.md`. Vitest is installed, `package.json` scripts
`test: "vitest run"` and `test:watch`, and `tests/unit/` holds **32 spec files**. Rule 35's
substance is still the live standard. Fixing rule 34 — the "no runner" claim and the "when the
runner exists" heading above 35 — is a legitimate, drop-in change; do it rather than writing around
it.

Nothing in CI enforces any of this. The five workflows in `.github/workflows/` are
`claude-code-review`, `claude`, `openwiki-update`, `qodana` and `stale`; `claude-code-review` runs
the review plugin and installs nothing, `qodana.yml` is a static scan. Green is a local,
self-imposed gate, so a red run is only as visible as the PR author makes it. Paste the failing
command and its output into the PR rather than asserting it passed.

## Never run the suite on Node 21

`package.json` `engines.node` is `>=22` and `.nvmrc` holds `22`; `pnpm dev`, `pnpm build` and
`pnpm test` all inherit it. This is a hard startup requirement, not a style note.

The trap is that the failure does not look like anything you did. Vitest 4 bundles **rolldown**,
which calls `util.styleText` with an array argument while formatting startup output; older Node
accepts only a string, so the call throws `ERR_INVALID_ARG_VALUE` **before one spec file loads**.
No test counts, no failing assertion, just a bundler stack trace from inside rolldown — which reads
exactly like a broken test and sends you diffing the spec you just edited. If `pnpm test` dies with
no summary, `node -v` is the first thing to check, not the last.

## What each step is actually defending

- **`pnpm lint`** — `import/no-restricted-paths` in `eslint.config.mjs` is the only automated
  enforcement of RULES.md rules 7–10. It builds one zone set from a `domains` array that must list
  every module: only `app/` may reach a module's `data/`, and `database.types.ts` is limited to data
  layers. Add a module without adding it to `domains` and its `data/` silently stops being private.
  The same file carries a warn-only `complexity: ["warn", 15]`; pass `--max-warnings 0` so the
  "prompt to refactor" is a stop, which is the point of an audit.
- **`pnpm exec tsc --noEmit`** — there is deliberately no script for it. `tsconfig.json` is
  `strict`, `noEmit`, and includes `**/*.ts`, `**/*.tsx` and `**/*.mts`, so specs, the Vitest config
  and the ESLint config are typechecked with everything else. The total map `DB_TO_UI_STAGE` in
  `modules/batches/data/batches.ts` uses this: a new DB enum variant fails compilation until a
  human picks its UI treatment (rule 18). Because no test resolves a live schema, the typecheck is
  also the only mechanical backstop behind every "typed against the generated Supabase types" claim.
- **`pnpm test`** — see below. Environment is `node`, include is `tests/unit/**/*.test.ts`, and
  `@/` is aliased to the repo root in `vitest.config.mts` (mirroring `tsconfig.json` paths) so specs
  import application source directly instead of a re-export layer. There is no jsdom project: React
  components are exercised by calling them as functions, not by mounting them.

## What the suite pins, and what green does not mean

The suite is fixture-in / function-out. Its subjects, by file:

- **Mappers and the data contract** — `batches.test.ts`, `documents.test.ts` and friends call
  `mapBatchRow` / `mapRequirementRow` with a full row literal and assert the domain object: the
  `DB_TO_UI_STAGE` bridge, `blocked` surviving normalisation as `blocked: true`, `null`-not-zero for
  an unavailable metric, `Infinity` for an absent deadline, RQM trimming and display-id fallback.
- **Domain rules** — `billing-readiness.test.ts` (threshold vs. compound gate), `urgency.test.ts`,
  `dashboard-domain.test.ts` (attention ordering, KPI derivation), `doc-compliance.test.ts` and the
  ADR-004 untracked semantics, `learner-import.test.ts` (RFC 4180 parsing, row validation).
- **Route-scope and snapshot folds** — `tenant-scope.test.ts` and `tenant-access.test.ts`. The
  latter is the closest the repo comes to ruling 19's guard-ordering bug: `withTenantAccess` writes
  `no-tenant-access` only over an `ok` snapshot and never over `sync-failed`/`unconfigured`, so a
  failure can never be overwritten by the tidier story (rule 19).
- **Keyless integration seams** — `sidebar.test.ts` renders components with React hooks,
  `next/navigation` and `useNavDrawer` mocked; it asserts structure and text, not pixels.
- **Clerk/env behaviour** — `oauth-sign-in`, `session-exists`, `sign-in-verification`,
  `supabase-server`. `supabase-server.test.ts` mocks `createClient` and Clerk's `auth` and says so
  in its header: it tests how `lib/supabase/server.ts` *decides* to call them (the `accessToken`
  callback, throwing on a missing token rather than degrading to `anon`), not the chain.
  `auth-provisioning.test.ts` mocks the service client and asserts the atomic
  `ensure_profile_tenant_membership` RPC rather than a select-then-insert.

Neighbouring pages already document the specifics; keep this list as scope, not detail — see
[module boundaries and the data pattern](/openwiki/guides/module-boundaries-and-data-pattern.md)
<!-- openwiki: broken internal link [/openwiki/modules/billing.md] file "/openwiki/modules/billing.md" does not exist. Fix the href or restore the target, then delete this comment. -->
for the fold, and [billing](/openwiki/modules/billing.md) for the readiness split.

Three consequences follow:

1. **Nothing here proves the database, RLS, or a rendered route.** A green mock test means "this
   branch was written as intended". The write half of `importLearnersCsv` has no test at all; the
   pure parse/validate/reconcile half does, and `grep importLearnersCsv tests/` returns nothing —
   so a test count falling for that flow is not a regression signal.
2. **Guard ordering is unexercised at the route.** The precedence lives in `guardState()` inside
   `app/(dashboard)/t/[tenantCode]/dashboard/page.tsx` (forced state, then `sync-failed`, then
   no-tenant-access, then empty, then role denial); the page module has no spec, so a reorder is
   only caught by reading it.
3. **Prefer a red-able assertion.** Mocking the wrong collaborator is the easy way to a test that
   asserts the call rather than the behaviour, and to a green that means nothing.

A test can also be lying once the rules move. `docs/DASHBOARD_DESIGN_AUDIT_2026-10-24.md` §9 lists
specs that passed while pinning defects. Both headline examples have since been repaired —
`urgency.test.ts` now expects the `overdue` tier and `batches.test.ts` keeps the recorded
`billing_deadline` instead of standing `end_date` in — which is the point: **a spec that faithfully
encodes superseded behaviour is green, and green is exactly what stops anyone re-reading it.** After
an ADR or threshold change, grep the specs for the old constant before you trust the run.

A spec that names a superseded shape is the same trap and the cheapest evidence to grep for before a
review. `auth-provisioning.test.ts` is the live case: its fixture feeds `publicMetadata: {
tvicamsRole: 'viewer', tvicamsTenantId: TENANT_ID }`, but `modules/auth/domain/invitationMetadata.ts`
now parses that metadata through `parseInvitationGrant`, and the spec's two invitation cases only
walk the update path — green, and pinning nothing about the parse.

The mirror image holds too: a **missing** spec is evidence the surface is unbuilt rather than
forgotten. There is no `eligibility.test.ts` and no `modules/attendance/domain/eligibility.ts` —
ADR-007's dropout math is not built — and nothing in `tests/` names `max_absence_percent` or an
absence count. Do not read a green suite as "the 20 % and three-strikes rules are verified"; the
constant survives only in `RULES.md`'s locked facts and
`20261024071359_adr007_attendance_dropout_rule.sql` (see
[batches and billing rules](/openwiki/domain/batches-and-billing-rules.md)).

## Fixed as-of dates, not today

`daysUntil` reads `Date.now()` downstream of the mapper, so a spec that lets the real clock in turns
red on an unrelated Tuesday. Two shapes, in order of preference:

- **Take the as-of value as input.** `dashboard-domain.test.ts` states it outright: `daysToBilling`
  is precomputed by the mapper, so `dated(days)` bakes `-5` (overdue) or `BILLING_DUE_WINDOW_DAYS +
  1` (just past the window) in and the file never reads a clock.
- **Freeze the clock** where the mapper itself is the subject: `batches.test.ts` calls
  `vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'))` in `beforeEach` and `vi.useRealTimers()`
  in `afterEach`, then asserts a whole-day count (`19`) between two fixed calendar dates. Note it
  never calls `vi.useFakeTimers()` — `setSystemTime` throws without fake timers already installed.

Pin calendar truths too: `status-render.test.ts` expects `-313` to render `313D OVERDUE` and `0` to
render `TODAY`, which stay true forever, unlike anything derived from "now".

## `e2e/auth.spec.ts` — the layout is the gate

`pnpm test:e2e` runs Playwright from `playwright.config.ts`: `testDir` is `e2e/`, and a `webServer`
block boots `pnpm dev` on `PORT` itself (`reuseExistingServer` outside CI), so it drives a real Next
server. The `global setup` project runs first and calls `clerkSetup()` once to mint a Clerk testing
token; `auth.spec.ts` calls `setupClerkTestingToken({ page })` so Clerk's bot detection lets it in.

The spec asserts one thing: `page.goto('/dashboard')` ends at `/sign-in`. That is deliberate and
narrow. Per its own comment, `proxy.ts` only forwards the pathname header — the redirect comes from
`requireAuthenticatedUser()` at the top of `app/(dashboard)/layout.tsx`. So the spec's job is to prove
**where the gate lives**, and it fails the day someone moves gating into middleware or lands a route
group outside `(dashboard)`.

Keep it that way. It is not a journey suite and should not grow into one: no role variant, no upload,
no modal focus trap, because those are business behaviour with cheaper unit coverage. It is also the
only thing that can catch a *rendered* guard bug, so the split is worth preserving in both
directions — state precedence and copy belong in unit-render specs, the auth chain belongs here.

It needs the Supabase env plus a Clerk **test** instance (`pk_test_*`/`sk_test_*`,
`E2E_CLERK_USER_EMAIL` in `.env.example`). Never point it at production Clerk keys: the global setup
registers real testing tokens and dev-instance users do not exist in production. Establishing that
environment is a hosted-project action, so it walks through rule 36 —
<!-- openwiki: broken internal link [/openwiki/operations/live-supabase-and-migrations.md] file "/openwiki/operations/live-supabase-and-migrations.md" does not exist. Fix the href or restore the target, then delete this comment. -->
see [live Supabase and migrations](/openwiki/operations/live-supabase-and-migrations.md).

## The gap: real-Supabase RLS, no mocks

Rule 35 requires RLS and tenant-isolation tests against the real project with no mocks, and rule 1
makes RLS the security boundary — so this is the suite that would actually prove authorization. It
does not exist. `docs/IMPLEMENTATION_PLAN.md` reserves `tests/integration/` (0.4, and §215/§493 add
`tests/security/`), but `tests/` holds only `unit/`, and the plan's own naming of a `tests/e2e/`
directory has likewise not held — the e2e specs live in `e2e/`.

Two things keep it outstanding, and both are honest rather than sloppy:

- **Setup cost.** It needs two tenants, two seeded users and per-role JWTs against a seeded project —
  the heaviest fixture in the repo, for a suite that must be re-established on every schema change.
- **Rule 36.** Any statement against the single hosted project needs explicit permission first, and
  there is no staging project. Missing env vars make such a test fail in a way that reads like a
  policy bug (see `live-supabase-and-migrations.md`), which is the worst failure mode for a security
  test.

Until it lands, every authorization claim in this wiki rests on reading migrations and policy text.
Treat a green `pnpm test` as proving behaviour, never access — and when you write the first
integration spec, give it fixed as-of data the way the unit suite does and log the exact statements
it runs before executing them.

## Checks that need a human

- Read the diff of any spec you touch for pre-change constants, not just the run.
- Confirm the change is not pinned by an ADR or a `RULES.md` locked fact; a red here may mean the
  spec is right and the code is wrong.
- Confirm no test was deleted or `skip`ped to get the run green — the count moving down is the only
  signal, since nothing asserts a file list.
