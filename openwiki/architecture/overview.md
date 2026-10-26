---
type: Reference
title: Architecture Overview
description: The TVI-CAMS map — stack and runtime, the proxy.ts → (dashboard) layout gate → requireAuthenticatedUser() → anon-key client → RLS auth chain with each layer's failure mode, the /t/<tenantCode> selection-vs-authorization split, trusted vs. presentation role, the lint-enforced app → modules → shared → lib/supabase import model, a one-line-per-module catalog, docs/ADR precedence and build/run/test.
tags: [architecture, overview, nextjs, supabase, clerk, rls, routing, module-boundaries, adr]
verified:
  - by: openwiki/0.5.0
    at: 2026-10-26T00:51:40.902Z
sources:
  - id: openwiki-source-10906e03e3f3530d2d51e5ab
    resource: repo://.claude/hooks/protect-static-dirs.sh
  - id: openwiki-source-d5b285e555b6625fe0efdaa2
    resource: repo://app/(dashboard)/dashboard/page.tsx
  - id: openwiki-source-1f0a12ecb6e407c4e68e28d8
    resource: repo://app/(dashboard)/layout.tsx
  - id: openwiki-source-a8f82cfd8b3b550b92770944
    resource: repo://app/(dashboard)/legacy-redirect.tsx
  - id: openwiki-source-0555213af97e8aa00bf4b119
    resource: repo://app/(dashboard)/schools/new/actions.ts
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
  - id: openwiki-source-c30669730475f4aa9f33c2b1
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/billing/page.tsx
  - id: openwiki-source-62d6ab89fec5c522574b900b
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/layout.tsx
  - id: openwiki-source-79e2020a0930b43798845956
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/report/page.tsx
  - id: openwiki-source-7ded6d9e4b97a5fd4dd6e34e
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/layout.tsx
  - id: openwiki-source-34483bdeb5950b355468581b
    resource: repo://app/(dashboard)/tenant-access.ts
  - id: openwiki-source-20d1ca31256bf756f33f5462
    resource: repo://app/(dashboard)/tenant-scope.ts
  - id: openwiki-source-006d9f24c9449e896a1cf6cf
    resource: repo://app/api/debug/auth-check/route.ts
  - id: openwiki-source-b7d17004edb699b9eb5177e1
    resource: repo://app/api/openapi.json/route.ts
  - id: openwiki-source-c0ad955c03733d7d70ef6ec6
    resource: repo://app/api/webhooks/clerk/route.ts
  - id: openwiki-source-f63ba5482783f8aa31cd7fbd
    resource: repo://app/page.tsx
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-a201158b72d575d540d15779
    resource: repo://docs/adr/ADR-007-attendance-based-dropout-rule.md
  - id: openwiki-source-6274a82a4962ca0eff3e198d
    resource: repo://docs/adr/ADR-008-recorded-batch-billing-deadline.md
  - id: openwiki-source-77b021311c7cb4c8d8432fb2
    resource: repo://e2e/auth.spec.ts
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-bac9ca9767a57004b7fbd175
    resource: repo://lib/supabase/database.types.ts
  - id: openwiki-source-e6f02f5d20be6272be761347
    resource: repo://lib/supabase/server.ts
  - id: openwiki-source-4afc6c67d0142492979e14f5
    resource: repo://lib/supabase/service.ts
  - id: openwiki-source-6bfb98fa8be1368970e571d9
    resource: repo://modules/activity/README.md
  - id: openwiki-source-203c5b1d1075c30ddbcc761a
    resource: repo://modules/attendance/README.md
  - id: openwiki-source-ef35f26971a6d0a70c82ba10
    resource: repo://modules/auth/data/auth.ts
  - id: openwiki-source-2aff630ed0688d80b1b707c8
    resource: repo://modules/auth/data/provisioning.ts
  - id: openwiki-source-3da0446fc6c5da744a43e0a3
    resource: repo://modules/auth/data/role.ts
  - id: openwiki-source-8a550cd131fccca9c56dc87b
    resource: repo://modules/lamr/README.md
  - id: openwiki-source-7af2656f640bd3970ebcbd6c
    resource: repo://modules/notifications/README.md
  - id: openwiki-source-3f1f3f4919f6d868d27df2e3
    resource: repo://modules/tenancy/data/platform.ts
  - id: openwiki-source-4a6c5a1d0a57f700524b0a69
    resource: repo://modules/tenancy/domain/access.ts
  - id: openwiki-source-b5e9a80328ba1dcd462db5c3
    resource: repo://modules/tenancy/domain/scope.ts
  - id: openwiki-source-e0951a2b3560c90b2bd482f7
    resource: repo://modules/tenancy/README.md
  - id: openwiki-source-028e25cdf562361e238fc406
    resource: repo://modules/tenancy/ui/CreateSchoolForm.tsx
  - id: openwiki-source-8e7d5d9b6492b85170c2d1cd
    resource: repo://modules/tenancy/ui/CreateUserForm.tsx
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-e942cb2f2c6b2538f046eef6
    resource: repo://proxy.ts
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-bde01a456257d0b7caf19920
    resource: repo://supabase/migrations/20261024110000_add_dashboard_operational_fields.sql
  - id: openwiki-source-acb73c82b90d7c0325351e5f
    resource: repo://supabase/migrations/README.md
  - id: openwiki-source-a05cedbd998904c07b2c5395
    resource: repo://supabase/seeds/README.md
  - id: openwiki-source-763cabdcd60de0e5da8f9a60
    resource: repo://tests/unit/supabase-server.test.ts
  - id: openwiki-source-0fd3605db2590862922583b6
    resource: repo://tests/unit/tenant-access.test.ts
  - id: openwiki-source-15e8a5a27099d775d1c019e1
    resource: repo://tests/unit/tenant-scope.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-10-26T00:51:40.902Z" }
---

# Architecture Overview

TVI-CAMS is an internal multi-tenant compliance working layer for TVI schools running TESDA scholarship batches (TWSP/CFSP): batch lifecycle, documents, LAMR evidence, and TESDA billing documents generated as populated `.docx` files. TESDA SIS/T2MIS/BSRS stay authoritative — this is an internal working layer, and no UI copy may imply official approval or submission (RULES rule 27, locked by ADR-001).

This page is the map: stack, request path, auth chain, routing model, import boundaries, module catalog, docs precedence, build/run/test. Depth lives with the neighbours — [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) for schema, migrations and policies; [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) for import zones, the fetch → map → derive contract, snapshots and the enum bridge.

## Stack and runtime

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 App Router (`next ^16.4.3`) | dev is `next dev --webpack`; Server Components by default, client islands only for interactivity (RULES rule 26) |
| UI / language | React `19.2.4`, TypeScript `strict` | typecheck via `pnpm exec tsc --noEmit` — no dedicated script |
| Styling | Tailwind v4 (`@tailwindcss/postcss`) | UI rules are [RULES.md §4](/RULES.md) rules 21–26 — there is no `design-system.md` |
| Identity | Clerk `@clerk/nextjs ^7.4.1` | `ClerkProvider` sits in the root `app/layout.tsx` |
| Data | one hosted Supabase project (Postgres + Storage) | the app talks to it directly — no separate backend, **no staging environment** |
| Backend direction | none today | Express.js is documented future-only; do not build it or treat it as present ([`CLAUDE.md`](/CLAUDE.md)) |
| Runtime | pnpm `9.15.4`, Node ≥ 22 | Node 22+ is hard-required: Vitest 4's rolldown calls `util.styleText` with an array argument that throws `ERR_INVALID_ARG_VALUE` before any test loads |

One hosted project and no staging is why RULES rule 36 is a `[deny]`: no agent statement runs against the live project, read-only `select`s included, without explicit permission.

## The auth chain

Authorization is layered so that only the last layer decides and every earlier layer can only narrow.

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
    L->>C: getProfileSnapshot / platform-admin RPC
    C->>C: accessToken callback → throw NO_CLERK_TOKEN_MESSAGE if no token
    C->>DB: query with the Clerk session token (anon key + sub claim)
    DB-->>C: RLS decides every row
```

1. **`proxy.ts` injects context; it does not gate.** It is `clerkMiddleware` with a matcher that skips static assets and adds `__clerk` and `api`/`trpc`. Its only work is stamping `x-pathname` so Server Components can read the full request path. No session check, no redirect (RULES rule 1 — no route check is the boundary).
2. **`app/(dashboard)/layout.tsx` is the sole authentication gate.** It calls `requireAuthenticatedUser()` and redirects an anonymous visitor to `/sign-in`. A route outside `(dashboard)` is unguarded until it adds its own check — `app/api-docs/page.tsx` calls the same helper directly. The gate belongs to the component that renders protected data, not to middleware, because Clerk deprecated `createRouteMatcher` in favour of exactly this.
3. **The gate resolves identity once and every downstream decision reads that result.** One `getProfileSnapshot()` read supplies role, name and tenant list; `resolveTrustedRole` narrows the DB role to admin/coordinator/viewer/trainer (or `null`); `isPlatformAdmin()` is a *separate* axis read through a `security definer` RPC because `public.platform_admins` is deliberately unreadable through the anon client (ADR-006). A failed check hides the nav row rather than rendering a link into a denial — the route itself, not the nav, tells `denied` from `sync-failed` because the two need different screens (RULES rule 24).
4. **The Supabase client carries the caller, not a static key.** `lib/supabase/server.ts` builds an **anon-key** client whose `accessToken` callback returns the Clerk session token — Clerk's native third-party-auth integration, not a JWT template (deprecated 1 Apr 2025), because this schema needs no custom claims: `app_private.*` reads only `sub`. The callback is re-invoked on expiry, so `supabase.auth.*` must never be called on this client (RULES rule 3).
5. **Postgres RLS makes every authorization decision** from that identity. RLS is the boundary; hiding a button is usability only. The helper chain and policy map are on [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md).

**Failure mode — a missing token must throw, never query as `anon`** (RULES rule 3). An `anon` query returns zero rows with no error, indistinguishable from "this user has no batches" — the dangerous outcome in a compliance tool. The throw is lazy, inside the `accessToken` callback when the query runs, so it surfaces as a query error and each caller's `catch` maps it to `sync-failed`. `NO_CLERK_TOKEN_MESSAGE` is exported so "not signed in" can be told from "Supabase rejected the token"; the dev-only `/api/debug/auth-check` route reports that verdict and `404`s in production.

**Failure mode — no credentials at all.** `isSupabaseConfigured()` gates client construction, so a local run without env vars yields `unconfigured` rather than a throw. Neither `unconfigured` nor `sync-failed` may substitute mock or fabricated data, and `sync-failed` must additionally surface its banner — guard clause order that checks "empty" before "sync-failed" will swallow the banner (RULES rule 19).

Two routes sit outside the gate by design: `/api/openapi.json` checks `getAuthUserId()` itself and answers `401`; `POST /api/webhooks/clerk` is unauthenticated and verifies Clerk's signature via `verifyWebhook` instead, since no session exists to scope it.

**`service_role` is one path only.** `lib/supabase/service.ts` bypasses RLS and is confined to the webhook: route → `modules/auth/data/provisioning.ts` (creates `profiles` on `user.created`/`user.updated` as `viewer` plus, only from an invitation grant, a first membership; flips `is_active = false` on `user.deleted`; never hard-deletes). `SUPABASE_SERVICE_ROLE_KEY` must never be `NEXT_PUBLIC_`-prefixed or read outside that file (RULES rule 3).

## Scoped routing — `/t/<tenantCode>`

Tenant context lives in the URL path segment (locked domain fact). `/t/<school>/<section>` is a *selection* over rows RLS already allows, never an authorization of its own (RULES rule 2) — but it is validated server-side so a wrong-school read is impossible rather than merely unlikely.

- **Legacy unscoped paths redirect.** `/batch-cards`, `/documents`, `/report`, `/table-view`, `/analytics`, `/activity-log`, `/billing` still exist as thin stubs from the `legacyRoute()` factory; `app/(dashboard)/legacy-redirect.tsx` → `redirectToDefaultScope()` → `/t/<default school>/<section>`, preserving search params. Only a caller with no school gets `NoTenantAccessState` — or a "couldn't verify" state when the profile read failed, since `unknown` is never rendered as `none`.
- **`/dashboard` is a router, not a screen.** It sends trainers to `/trainer`, admins to `/overview` (the cross-school view), and everyone else to their default school's dashboard, then falls into the legacy redirect. Both decisions read `profile.role` through `getSignedInProfile`, the trusted read.
- **`resolveRouteScope(code)`** (`app/(dashboard)/tenant-scope.ts`, `cache()`-wrapped) returns a four-way union: `ok` with a scope built by `modules/tenancy/domain/scope.ts`'s `scopeForCode`, `no-tenant-access`, `unknown` ("we could not check"), or `not-a-member` carrying a fallback scope.
- **`t/[tenantCode]/layout.tsx` renders the states** — `ok` passes children through; each other arm renders an honest `EmptyState`/`NoTenantAccessState`. A foreign or unknown code never falls back to "all schools".
- **Pages then call `requireScope()`**, which returns the validated scope or `null` (the layout already owns the state). Deliberately not `notFound()`: layout and page render in parallel, so a thrown 404 could race the layout's friendlier arm. Security does not rest on either — without a scope there is no tenant id to query with.

The unscoped surfaces are `/overview`, `/trainer/**`, `/schools`, `/users`, `/profile`, `/api-docs`. `app/(dashboard)/tenant-access.ts` answers the orthogonal question "is this person a member of any school?" by joining `modules/auth` identity to `modules/tenancy`'s profile read — a join only `app/` may make, since a module's `data/` is private to it (RULES rule 8). Screens fold its verdict over a snapshot with `withTenantAccess`, which replaces only an `ok` snapshot, so a real failure is never masked by the tidier explanation.

**Metrics ownership follows the segment.** `MetricsRow` lives in `t/[tenantCode]/(sections)/layout.tsx` (the dashboard renders its own row) and `trainer/layout.tsx`, not the root layout: App Router does not re-render a parent layout on client navigation, so a root-owned row kept showing the previous school's numbers after a switch. It is omitted entirely on a non-`ok` snapshot rather than shown as zeros.

## Role: trusted authority vs. presentation

Role authority is `profiles.role` — the column RLS reads — through `resolveTrustedRole`. Clerk is identity only; its `publicMetadata` was a fallback that once let one admin render as ADMIN and VIEWER on the same screen, so authority no longer consults it. A signed-in user with no profile row resolves to `null` and callers narrow to the least-privilege `viewer`.

`resolveRouteRole`/`resolveDisplayRole` are the *presentation* variants: a `?role=` query override wins, so any caller can preview any UI. Gating on them is therefore a bug — a real trainer could request `?role=admin` and skip a redirect. `billing`, `report`, `/overview` and `/users/new` all redirect or gate on `resolveTrustedRole` and use the query override only to pick a rendered variant. Platform admin is a third, orthogonal axis and is never previewable into existence (`/schools/new`, ADR-006).

Admin is the school's proprietor, coordinator the day-to-day staff; every policy pairs them, so the difference records who someone is, not what they may do. Trimming is server-side, never CSS (rule 5): `MetricsRow` takes `hideBilling`, `billing`/`report` refuse trainers outright, and viewer is read-only, server-denied on writes rather than merely hidden (rule 4). Server Actions re-derive the role server-side, so a rendered form is never the authority; RLS enforces the same distinctions underneath.

## The four-layer import model

Code is grouped by domain, not by file type (DDD-influenced, TES-68). Everything sits in a one-way hierarchy — `app → modules → shared → lib/supabase` — enforced by `import/no-restricted-paths` in [`eslint.config.mjs`](/eslint.config.mjs) (RULES rule 7).

```mermaid
flowchart TD
    subgraph APP["Layer 1 — app/: thin Server Component routes"]
        A["fetch via a module data/, compose module UI"]
    end
    subgraph MOD["Layer 2 — modules/<domain>/"]
        MD["data/ — private to its own module"]
        MO["domain/ — public, pure, no I/O"]
        MU["ui/ — public, domain-aware"]
    end
    subgraph SH["Layer 3 — shared/, leaf level"]
        ST["types.ts — UI domain types"]
        SU["ui/ — props-only primitives"]
    end
    subgraph SUP["Layer 4 — lib/supabase/"]
        SF["client factories, service factory"]
        SD["database.types.ts — generated rows"]
    end

    A -->|"app may fetch any module's data/"| MD
    A --> MU
    MD --> MO
    MD --> ST
    MD --> SF
    MD --> SD
    MO --> ST
    MU --> ST
    MU --> SU
    SH -. "forbidden: shared → modules/, app/" .-> MOD
    MOD -. "forbidden: modules → app/" .-> APP
    MO -. "forbidden: raw row types outside data/" .-> SD
    MU -. "forbidden" .-> SD
```

The load-bearing zones: `database.types.ts` is importable only from `data/` layers and `lib/supabase` itself, so components take domain types from `shared/types.ts` (rule 10); `shared/` never imports upward (rule 9); every module's `data/**` is forbidden to every *other* module (rule 8); no index barrels — deep imports are the convention (rule 13). The snapshot union, the total `DB_TO_UI_STAGE` enum map and the regeneration contract are on [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).

## Module catalog

One module per PRD FR under `modules/`, plus `shell` for app chrome — **14 modules, the same set as the ESLint `domains` array**. New code goes inside its owning module, never in a new top-level folder (RULES rule 12).

| Module | FR | One line |
| --- | --- | --- |
| [`auth`](/modules/auth/README.md) | FR-01 | server-side Clerk access, the `requireAuthenticatedUser` gate, trusted-role resolution, invitation metadata and sign-in defence, service-role profile provisioning |
| [`tenancy`](/modules/tenancy/README.md) | FR-02 | profile/membership and tenant-access reads, tenant scope, user administration, the ADR-006 school registry |
| [`batches`](/modules/batches/README.md) | FR-03/04/05 | reference implementation of fetch → map → derive; urgency, alerts, attention, metrics and cross-school overview rules; dashboard, timeline and overview widgets |
| [`documents`](/modules/documents/README.md) | FR-06 | requirement catalog, per-batch records, evidence upload and signed URLs; `domain/compliance.ts` holds the sole untracked-document rule (ADR-004) |
| [`attendance`](/modules/attendance/README.md) | FR-07 | README only — plans `data/attendance.ts` and the ADR-007 dropout rule |
| [`lamr`](/modules/lamr/README.md) | FR-08 | README only — plans LAMR fetch/map and evidence UI |
| [`billing`](/modules/billing/README.md) | FR-09 | document-generating engine (ADR-001): rates, three tracks, statement builder, readiness gate, ADR-003 packet projection, queue and statement-preview UI; actual `.docx` population and the `billing_records` write are still planned |
| [`import-export`](/modules/import-export/README.md) | FR-10 | RFC 4180 CSV parser, ULI-keyed learner reconciliation, an `importLearnersCsv` write path that has never run against a live database |
| [`analytics`](/modules/analytics/README.md) | FR-11 | `ui/` only — props-only chart primitives; the page fetches the snapshot itself |
| [`activity`](/modules/activity/README.md) | FR-12 | `data/activity.ts` snapshot (`getActivitySnapshot`) feeding the dashboard panel and activity-log feed; no `ui/` yet |
| [`notifications`](/modules/notifications/README.md) | FR-13 | README only — alerts are computed on read (no cron, no email) |
| [`settings`](/modules/settings/README.md) | FR-14 | `ui/` only — the design-sync overlay; toggles are session-local, "Save changes" is a toast, not a write |
| [`reports`](/modules/reports/README.md) | FR-15 | pure EGACE/employment helpers plus XLSX export; the report page fetches the full snapshot itself |
| [`shell`](/modules/shell/README.md) | (none) | app chrome — `NavDrawerProvider`, `Sidebar`, `Topbar`, `MobileHeader`, `MetricsRow`, `AuthHeader` — a module, not `shared/`, because it carries tenant and data context |

## Docs precedence and the ADR chain

`RULES.md` is the checklist of non-negotiable *what*, each rule tagged with its enforcement level (`hook`, `deny`, `lint`, `types`, `rls`, `review`); `CLAUDE.md` explains the *why*. **Where they disagree, `RULES.md` wins** and the drift gets fixed — rule 34 still claims no test runner exists, while `tests/unit/` is substantial and green is the gate.

Below the rules: `docs/MASTER_PRD_SRS.md` (product) → `docs/TRD.md` (engineering) → `docs/IMPLEMENTATION_PLAN.md` (phasing), all overridden by the ADR chain in `docs/adr/` (rule 31), which must be read before touching schema or billing math (rule 30). Eight ADRs are accepted or proposed. The four with the widest blast radius:

| ADR | Effect |
| --- | --- |
| [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md) | billing is a **document-generating engine** (TSF/Allowance, Training Cost, Entrepreneurship as populated `.docx`; Assessment Fee out of scope); progress = `sessions_held ÷ total_sessions`, one RQM = one batch, append-only `billing_records` |
| [ADR-003](/docs/adr/ADR-003-billing-packet-queue.md) | amends ADR-001 §4: the queue is a *projection* of `(batch, billing_type, tranche)` on `draft → ready → generated → submitted → settled`, due dates derived |
| [ADR-004](/docs/adr/ADR-004-untracked-document-semantics.md) | a requirement with no record is `untracked` — a third state excluded from measurement and failing closed at gates, decided in one module so no surface re-decides it |
| [ADR-006](/docs/adr/ADR-006-platform-admin-and-school-registry.md) | **supersedes FR-02's "Super Admin is not implemented"**: a platform admin exists on a separate axis and provisions the school registry only — extending it to a compliance table, or letting it seat itself into a tenant, needs its own ADR (rule 30) |

Also live: ADR-007 replaced the fixed ≥5-absence rule with dropout on absences above 20% of `total_sessions` **or** 3 consecutive unexcused absences; ADR-008 (proposed) would record `batches.billing_deadline` instead of counting urgency down from `end_date`. ADR-002 and ADR-005 remain load-bearing for scope (the prototype portrays the ADR-001 target; one membership per profile, seeds never migrations).

Other locked facts code must not contradict: ULI is the permanent learner key; tenant context lives in the URL path; alerts are computed on read. Schema state and the ten-migration ledger are on [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md); dev fixtures live in `supabase/seeds/`, which nothing runs automatically.

## Build, run, and test

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server (`next dev --webpack`) |
| `pnpm build` / `pnpm start` | production build / serve |
| `pnpm lint` | ESLint flat config, including the import zones |
| `pnpm exec tsc --noEmit` | strict typecheck (no dedicated script) |
| `pnpm test` | Vitest unit suite over `tests/unit/` |
| `pnpm test:e2e` | Playwright (`e2e/auth.spec.ts`, dev server on `:3000`) |
| `pnpm preview` | static design preview bundle on `:5000` |

`tests/unit/` is the merge gate: mappers, domain rules and the route-scope/tenant-access folds with fixed as-of dates. The Playwright spec proves unauthenticated access to `/dashboard` lands on `/sign-in` — proof that the layout, not `proxy.ts`, is the gate. **Real-Supabase RLS/tenant-isolation tests are still outstanding** and must run against the hosted project with no mocks (rule 35). A first-run walkthrough is on [Quickstart](/openwiki/quickstart.md).

## Design material — do-not-edit zones

`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are ported verbatim, `globalIgnores`-excluded from lint and edit-blocked by `.claude/hooks/protect-static-dirs.sh`; `FIGMA FILES/`, `diagrams/`, `.design-sync/` are review-level artifacts (rules 28–29). Edit the source design files instead, or ask first. UI rules themselves: [RULES.md §4](/RULES.md), rules 21–26.

## Related pages

- [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) — tables, enums, `app_private.*` helpers, migration ledger
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) — import zones, fetch → map → derive, snapshots, enum bridge
- [Quickstart](/openwiki/quickstart.md) — task routing and verification loop
