---
type: Architecture
title: Architecture Overview
description: The TVI-CAMS map — what the system is and is not, the stack, the request path from Clerk through proxy.ts to the (dashboard) layout gate, the anon-key client and RLS, scoped /t/<tenantCode> routing versus the platform registry, the lint-enforced import model in one table, a one-line-per-module catalog, and docs/ADR precedence. Every section links the neighbour that owns its depth.
tags: [architecture, overview, nextjs, supabase, clerk, rls, routing, module-boundaries, adr]
---

# Architecture Overview

TVI-CAMS is an internal multi-tenant compliance working layer for TVI schools running TESDA scholarship batches (TWSP/CFSP): batch lifecycle, documents, LAMR evidence, and TESDA billing documents generated as populated `.docx` files. TESDA SIS/T2MIS/BSRS stay authoritative — this is an internal working layer, and no UI copy may imply official approval or submission (RULES rule 27, locked by ADR-001).

This page is only the map. Depth lives with the neighbours, and each section below names the one that owns it.

## What the system is, and is not

- **One Next.js app talking directly to one hosted Supabase project.** No separate backend, and **no staging environment** — which is why RULES rule 36 is a `[deny]`: no statement runs against the live project, read-only `select`s included, without explicit permission.
- **Not a TESDA portal.** Nothing here submits or approves; the copy boundary is rule 27.
- **Not an Express app (yet).** A Node/TypeScript backend is documented as future-only in [`CLAUDE.md`](/CLAUDE.md); do not build it or treat it as present.
- **Not a place for business logic in `app/`.** Routes fetch through a module's `data/` and compose module `ui/` (rule 11); everything else goes inside its owning module (rule 12).

## Stack

| Concern | Choice | Why it matters here |
| --- | --- | --- |
| Framework | Next.js 16 App Router (`next ^16.4.3`, dev is `next dev --webpack`) | Server Components by default; client islands only for interactivity (rule 26) — and the layout gate below only works because Server Components run per request |
| UI / language | React `19.2.4`, TypeScript `strict` | checked by `pnpm exec tsc --noEmit`; there is no dedicated script |
| Styling | Tailwind v4 | UI rules are [`RULES.md` §4](/RULES.md), rules 21–26 — there is no `design-system.md` page, so do not look for one |
| Identity | Clerk `@clerk/nextjs ^7.4.1` | `ClerkProvider` sits in the root `app/layout.tsx`; Clerk is identity only, never role authority |
| Data | hosted Supabase (Postgres + Storage) | RLS on that database is the security boundary |
| Runtime | pnpm `9.15.4`, Node ≥ 22 | Node 22+ is hard-required: Vitest 4's rolldown throws `ERR_INVALID_ARG_VALUE` on Node 21 before any test loads |

## The request path and the auth chain

The whole guard model is one sentence: **identity is established by a layout, the database decides everything after that.** [`proxy.ts`](/proxy.ts) stamps `x-pathname` and gates nothing, and the four layers below it only ever narrow.

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant P as proxy.ts (clerkMiddleware)
    participant L as app/(dashboard)/layout.tsx
    participant C as lib/supabase/server.ts
    participant DB as Postgres + RLS
    B->>P: GET /t/akb/billing
    P->>P: stamp x-pathname (no gate, no redirect)
    P->>L: forward
    L->>L: requireAuthenticatedUser() → redirect('/sign-in') if no userId
    L->>C: Promise.all([getProfileSnapshot, resolveIsPlatformAdmin])
    C->>C: accessToken callback → throw NO_CLERK_TOKEN_MESSAGE if no token
    C->>DB: query with the Clerk session token (anon key + sub claim)
    DB-->>C: RLS decides every row
    L-->>B: shell + children
```

Full routing depth — every branch of the tree, the `loading.tsx` placement, the `/trainer` exception, the legacy-redirect factory — is on [Routing, Layout Gates and the Request Path](/openwiki/architecture/nextjs-routing-and-request-path.md). The three facts a reader must not get wrong:

1. **`proxy.ts` is context injection, not a gate.** It is `clerkMiddleware` whose only work is copying `request.nextUrl.pathname` into an `x-pathname` header; its matcher excludes static assets and *adds* `__clerk` and `api`/`trpc` so the Clerk webhook is not short-circuited. No session check, no redirect. A route is protected by the group it sits *inside*.
2. **`app/(dashboard)/layout.tsx` is the only authentication gate.** Its first statement is `requireAuthenticatedUser()` — a four-line function in [`modules/auth/data/auth.ts`](/modules/auth/data/auth.ts) (`getCurrentUser`, `getAuthPayload`, `getAuthUserId`, `requireAuthenticatedUser`) that redirects `/sign-in` when the Clerk `userId` is missing and otherwise returns it. Clerk deprecated `createRouteMatcher` in favour of exactly this. Anything outside `(dashboard)` is unguarded until it adds its own check — [`app/api-docs/page.tsx`](/app/api-docs/page.tsx) calls the same helper.
3. **One identity read feeds every downstream decision.** The layout runs `Promise.all([getProfileSnapshot, resolveIsPlatformAdmin])` and derives, from that one snapshot, the nav's admin row (`isAdmin`, narrowed by `resolveTrustedRole`), the user's name, the tenant list and the default school; `isPlatformAdmin` is passed to the Sidebar as a *separate* boolean. A failed read yields `null` role and an empty tenant list, so the shell renders a smaller, honest menu — hiding, not denying, which is why the route and the Server Action re-check.

**Failure modes.** `lib/supabase/server.ts` builds an **anon-key** client (Clerk's native third-party auth, not a JWT template, because the schema needs no claim beyond `sub`) whose `accessToken` callback returns the session token. A missing token **throws `NO_CLERK_TOKEN_MESSAGE` rather than degrading to an `anon` client**: an anon query returns zero rows with no error, indistinguishable from "this user has no batches". The throw is lazy — it fires inside the callback when the query runs — so each caller's `catch` maps it to `sync-failed`. Separately, `isSupabaseConfigured()` yields `unconfigured` when env vars are absent, and neither state may substitute mock data; `sync-failed` must also keep its banner (rule 19), and `/api/debug/auth-check` tells the two token verdicts apart in dev. The **service-role key never reaches client code** and is confined to the webhook path (below).

**Both helpers are navigation-only.** The platform-admin boolean hides "Add school" on a failed check instead of rendering a link into a denial; the snapshot behind it tells `denied` from `sync-failed` at the route, where the two need different screens (rule 24).

**RLS makes every authorization decision** from that identity — RLS is the boundary, hiding a button is usability only (rule 1). The helper chain, the per-table policy map and the ADR-006 boundary are on [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md); the runtime meaning of the boundary once signed in is on [Tenant Isolation and RLS](/openwiki/architecture/tenant-isolation-and-rls.md).

Two routes sit outside the gate by design: `/api/openapi.json` checks `getAuthUserId()` itself and answers `401`, and `POST /api/webhooks/clerk` is unauthenticated because it verifies Clerk's body signature with `verifyWebhook` — no session exists to scope it. That webhook is also the sole `service_role` path: route → `modules/auth/data/provisioning.ts`, which creates profiles as `viewer` and flips `is_active = false` on delete; `SUPABASE_SERVICE_ROLE_KEY` is never `NEXT_PUBLIC_`-prefixed and never read outside [`lib/supabase/service.ts`](/lib/supabase/service.ts) (rule 3).

## Scoped routing — `/t/<tenantCode>`, and the registry outside it

Tenant context lives in the URL path segment. `/t/<school>/<section>` is a **selection, not an authorization** (rule 2): `scopeForCode` builds a scope only from `profile.tenants`, an RLS-scoped read, and queries then add `tenant_id = scope.tenantId` on top of RLS. [`resolveRouteScope`](/app/(dashboard)/tenant-scope.ts) is `cache()`-wrapped and four-way — `ok`, `no-tenant-access`, `unknown`, `not-a-member` with a fallback — and [`t/[tenantCode]/layout.tsx`](/app/(dashboard)/t/[tenantCode]/layout.tsx) renders every non-`ok` arm, because it is the only place in the segment that owns a state. Pages call `requireScope()` and return `null` beneath it.

Two lessons are load-bearing and live in full on the routing page: a foreign code never falls back to "all schools", and `unknown` (could not check) is never rendered as `none` (belongs to none). Legacy unscoped paths redirect to the caller's default school with search params intact. `requireScope()` deliberately does not throw `notFound()` — layout and page render in parallel.

**The registry is the one write path outside a tenant.** `/schools/new` is unscoped because a school with no members cannot satisfy a membership-scoped `tenants` policy, and it gates on platform admin, a separate axis resolved through a `security definer` RPC (`getPlatformAdminSnapshot` in `modules/tenancy/data/platform.ts`) because `public.platform_admins` is readable through nothing. Platform admin is a table, never a fifth `profile_role`; its reach is the registry only, and extending it to a compliance table or letting it seat itself into a tenant needs its own ADR (ADR-006 P2/P3, rule 30).

## Role: trusted authority vs. presentation

Authority is `profiles.role` — the column RLS reads — through `resolveTrustedRole`. Clerk's `publicMetadata` was a fallback that once showed one admin as ADMIN and VIEWER on the same screen, so authority no longer consults it; a user with no profile row resolves `null` and callers narrow to read-only `viewer`.

`resolveRouteRole`/`resolveDisplayRole` are the *presentation* variants: a `?role=` query override wins, so any caller can preview any UI. Gating a redirect on them lets a real trainer request `?role=admin` and skip it, so `billing`, `report`, `/overview`, `/users/new` and `/schools/new` all decide on the trusted sources and use the override only to pick a rendered variant.

Admin and coordinator are paired by every policy, so the difference records who someone is, not what they may do. Trimming is server-side, never CSS (rule 5), and viewer writes are server-denied (rule 4). The scoping and role workflow end to end is on [Tenant Scoping and Role Authority](/openwiki/workflows/tenant-scoping-and-role-authority.md).

## The import model, in one table

Code is grouped by domain, not by file type (DDD-influenced, TES-68), and nothing imports upward.

| Layer | May import | Never |
| --- | --- | --- |
| `app/` | any module's `data/`, `domain/`, `ui/`; `shared/`; `lib/supabase` | business logic of its own (rule 11) |
| `modules/<d>/data/` | its own `domain/`, `shared/types.ts`, `lib/supabase/*` | another module's `data/` (rule 8) |
| `modules/<d>/domain/` | `shared/types.ts` | `database.types.ts` (rule 10), I/O (rule 14) |
| `modules/<d>/ui/` | `domain/`, `shared/ui/*`, `shared/types.ts` | `database.types.ts` (rule 10) |
| `shared/` | `lib/supabase` only | `modules/`, `app/` (rule 9) |
| `lib/supabase/` | — | anything above it |

The direction is enforced at lint time by `import/no-restricted-paths` zones in [`eslint.config.mjs`](/eslint.config.mjs), including one generated zone per domain making each `data/**` private (rule 7). **A lint failure here is an architecture violation, not a style nit** — the usual fix is to fetch in `app/` instead of reaching sideways. No index barrels (rule 13); take domain types from `shared/types.ts`, not generated rows. The fetch → map → derive contract, the snapshot union's guard ordering and the enum bridge are on [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).

## Module catalog

One module per PRD FR plus `shell` for chrome — 14 modules, the same set as the ESLint `domains` array. One line each; implemented modules link their depth.

| Module | FR | One line |
| --- | --- | --- |
| [`auth`](/modules/auth/README.md) | FR-01 | Clerk access, the `requireAuthenticatedUser` gate, trusted-role resolution, invitation metadata, service-role provisioning |
| [`tenancy`](/modules/tenancy/README.md) | FR-02 | profile/membership reads, tenant access and scope, user administration, the ADR-006 registry |
| [`batches`](/modules/batches/README.md) | FR-03/04/05 | reference data layer; lifecycle, urgency, alerts, metrics, cross-school overview; dashboard widgets; T2MIS terminal fields on `LearnerRow` |
| [`documents`](/modules/documents/README.md) | FR-06 | requirement catalog, per-batch records, evidence upload and signed URLs; ADR-004's untracked rule |
| [`attendance`](/modules/attendance/README.md) | FR-07 | README only — plans `data/attendance.ts` and `domain/eligibility.ts` (ADR-007) |
| [`lamr`](/modules/lamr/README.md) | FR-08 | README only — plans LAMR fetch/map and evidence UI |
| [`billing`](/modules/billing/README.md) | FR-09 | document-generating engine (ADR-001): rates, tracks, readiness gate, ADR-003 queue; `.docx` population still planned |
| [`import-export`](/modules/import-export/README.md) | FR-10 | RFC 4180 parser and ULI reconciliation, plus the T2MIS layout the export builds from — the CSV import half is unfinished |
| [`analytics`](/modules/analytics/README.md) | FR-11 | `ui/` only — props-only chart primitives |
| [`activity`](/modules/activity/README.md) | FR-12 | activity snapshot feeding the dashboard panel and log; no `ui/` |
| [`notifications`](/modules/notifications/README.md) | FR-13 | README only — alerts are computed on read (no cron, no email) |
| [`settings`](/modules/settings/README.md) | FR-14 | `ui/` only — design-sync overlay; toggles are session-local |
| [`reports`](/modules/reports/README.md) | FR-15 | EGACE/employment helpers and the XLSX export; `{domain,ui}` only, so the report page fetches through `batches` itself |
| [`shell`](/modules/shell/README.md) | (none) | app chrome — a module, not `shared/`, because it carries tenant and data context |

`modules/reports` having no `data/` layer is deliberate, not drift: the report page borrows `modules/batches/data/*` rather than duplicating a fetch. **`reports` is also where a new export unit goes** — `ui/exportXlsx.ts` is the first real-tooling export.

Three modules are README-only stubs. Write no code in them until their `data/`/`domain/` plan is followed; the trainer pages that should eventually move into `attendance` are self-contained placeholders.

## Docs precedence and the ADR chain

[`RULES.md`](/RULES.md) is the checklist of non-negotiable *what*, each rule tagged with its enforcement level (`hook`, `deny`, `lint`, `types`, `rls`, `review`); [`CLAUDE.md`](/CLAUDE.md) explains the *why*. **Where they disagree, `RULES.md` wins** and the drift gets fixed — rule 34 still claims no test runner exists while `tests/unit/` is substantial and green is the gate.

Below the rules the order is fixed and each layer outranks the one beneath. **The ADR chain is read first and overrides the rest** (rule 31), and must be read before touching schema or billing math (rule 30):

```
docs/adr/  >  docs/MASTER_PRD_SRS.md  >  docs/TRD.md  >  docs/IMPLEMENTATION_PLAN.md
```

[ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md) supersedes *any* conflicting "billing = preparation signal only" PRD wording — billing is a document-generating engine; [ADR-003](/docs/adr/ADR-003-billing-packet-queue.md) amends its §4; [ADR-006](/docs/adr/ADR-006-platform-admin-and-school-registry.md) supersedes FR-02's "Super Admin is not implemented"; [ADR-007](/docs/adr/ADR-007-attendance-based-dropout-rule.md) replaced the fixed ≥5-absence rule; [ADR-008](/docs/adr/ADR-008-recorded-batch-billing-deadline.md) is still proposed. ADR-004 fixes `untracked` as a third document state. Never quote the superseded PRD wording for eligibility or billing. The index is on [Modules, Overview and the ADR Index](/openwiki/modules/overview-and-adr-index.md).

## Verification

| Command | What it does |
| --- | --- |
| `pnpm lint` | flat ESLint config, including the import zones |
| `pnpm exec tsc --noEmit` | strict typecheck |
| `pnpm test` | Vitest over `tests/unit/` (Node 22+) |
| `pnpm test:e2e` | Playwright, dev server on `:3000` |

**No CI job runs any of these** — green is a local, self-imposed gate, and a PR can merge with the loop never run. `tests/unit/` pins mappers, domain rules and the route-scope/tenant-access folds with fixed as-of dates; `e2e/auth.spec.ts` proves an anonymous `/dashboard` lands on `/sign-in`, which is the standing proof that the layout, not the proxy, is the gate. Real-Supabase RLS tests are still outstanding and sit behind rule 36. The loop and its traps are on [Verification and Test Strategy](/openwiki/operations/verification-and-test-strategy.md); schema state and the migration ledger are on [Live Supabase and Migrations](/openwiki/operations/live-supabase-and-migrations.md).

## Related pages

- [Routing, Layout Gates and the Request Path](/openwiki/architecture/nextjs-routing-and-request-path.md) — the route tree in full, the scope arms, why `requireScope` returns `null`
- [Tenant Isolation and RLS](/openwiki/architecture/tenant-isolation-and-rls.md) — the runtime boundary once signed in
- [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) — tables, enums, `app_private.*`, migration ledger
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) — fetch → map → derive, snapshots, enum bridge
- [Tenant Scoping and Role Authority](/openwiki/workflows/tenant-scoping-and-role-authority.md) — the workflow the role split serves
- [Quickstart](/openwiki/quickstart.md) — task routing and the verification loop