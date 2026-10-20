---
type: Reference
title: Architecture Overview
description: The TVI-CAMS map — stack, request path, the Clerk → proxy → dashboard gate → anon-key client → Postgres RLS auth chain, the lint-enforced app → modules → shared → lib/supabase import model, a one-line-per-module catalog of the 14 modules, docs precedence and the ADR chain, design do-not-edit zones, and build/run/test.
tags: [architecture, overview, nextjs, supabase, clerk, rls, module-boundaries, adr]
verified:
  - by: openwiki/0.5.0
    at: 2026-10-20T01:21:35.552Z
sources:
  - id: openwiki-source-10906e03e3f3530d2d51e5ab
    resource: repo://.claude/hooks/protect-static-dirs.sh
  - id: openwiki-source-1f0a12ecb6e407c4e68e28d8
    resource: repo://app/(dashboard)/layout.tsx
  - id: openwiki-source-006d9f24c9449e896a1cf6cf
    resource: repo://app/api/debug/auth-check/route.ts
  - id: openwiki-source-b7d17004edb699b9eb5177e1
    resource: repo://app/api/openapi.json/route.ts
  - id: openwiki-source-c0ad955c03733d7d70ef6ec6
    resource: repo://app/api/webhooks/clerk/route.ts
  - id: openwiki-source-850cd942fe1e04537aa0d1df
    resource: repo://app/layout.tsx
  - id: openwiki-source-f63ba5482783f8aa31cd7fbd
    resource: repo://app/page.tsx
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-6c5e30490a0c4602d7931405
    resource: repo://docs/adr/ADR-001-billing-and-domain-model.md
  - id: openwiki-source-cebb8a381f810b2ffea84318
    resource: repo://docs/adr/ADR-002-design-prototype-portrays-adr-001-target.md
  - id: openwiki-source-aa73e0f7c001cde7c90e254e
    resource: repo://docs/adr/ADR-003-billing-packet-queue.md
  - id: openwiki-source-9c4f624af786337110d6df8a
    resource: repo://docs/adr/ADR-004-untracked-document-semantics.md
  - id: openwiki-source-624c50c8276ea1f31b187ca3
    resource: repo://docs/adr/ADR-005-demo-account-tenant-scoping.md
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-77b021311c7cb4c8d8432fb2
    resource: repo://e2e/auth.spec.ts
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-e6f02f5d20be6272be761347
    resource: repo://lib/supabase/server.ts
  - id: openwiki-source-4afc6c67d0142492979e14f5
    resource: repo://lib/supabase/service.ts
  - id: openwiki-source-9f5cba7a8936b6015f479258
    resource: repo://modules/analytics/README.md
  - id: openwiki-source-203c5b1d1075c30ddbcc761a
    resource: repo://modules/attendance/README.md
  - id: openwiki-source-ef35f26971a6d0a70c82ba10
    resource: repo://modules/auth/data/auth.ts
  - id: openwiki-source-2aff630ed0688d80b1b707c8
    resource: repo://modules/auth/data/provisioning.ts
  - id: openwiki-source-3da0446fc6c5da744a43e0a3
    resource: repo://modules/auth/data/role.ts
  - id: openwiki-source-7b76cf0c121711d866a16742
    resource: repo://modules/batches/README.md
  - id: openwiki-source-8a550cd131fccca9c56dc87b
    resource: repo://modules/lamr/README.md
  - id: openwiki-source-7af2656f640bd3970ebcbd6c
    resource: repo://modules/notifications/README.md
  - id: openwiki-source-e54269333553bf2d86431b33
    resource: repo://modules/settings/README.md
  - id: openwiki-source-ba13cf29306de2b7b8f8a402
    resource: repo://modules/shell/README.md
  - id: openwiki-source-3f1f3f4919f6d868d27df2e3
    resource: repo://modules/tenancy/data/platform.ts
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
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-acb73c82b90d7c0325351e5f
    resource: repo://supabase/migrations/README.md
  - id: openwiki-source-763cabdcd60de0e5da8f9a60
    resource: repo://tests/unit/supabase-server.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-10-20T01:21:35.552Z" }
---

# Architecture Overview

TVI-CAMS is an internal multi-tenant compliance working layer for TVI schools running TESDA scholarship batches (TWSP/CFSP): batch lifecycle, documents, attendance, LAMR evidence, and TESDA billing documents generated as populated `.docx` files. It is an internal working layer only — TESDA SIS/T2MIS/BSRS remain the authoritative systems, and UI copy must never imply official approval or submission ([`CONTEXT.md`](/CONTEXT.md), RULES rule 27).

This page is the map: stack, request path, auth chain, import model, module catalog, docs precedence, build/run/test. Depth is owned elsewhere — [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) for schema, migrations and policies; [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) for imports, the snapshot contract and the enum bridge.

## Stack at a glance

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 App Router (`next ^16.3.4`) | dev runs `next dev --webpack`; Server Components by default, client islands only for interactivity (RULES rule 26) |
| UI / language | React `19.2.4`, TypeScript `strict` | typecheck via `pnpm exec tsc --noEmit` (no dedicated script) |
| Styling | Tailwind v4 (`@tailwindcss/postcss`) | design rules are `RULES.md` §4 |
| Identity | Clerk `@clerk/nextjs ^7.4.1` | root `app/layout.tsx` wraps the tree in `ClerkProvider` with custom localization |
| Data | One hosted Supabase project (Postgres + Storage) | the app talks to it directly — no separate backend and **no staging environment** |
| Backend direction | none today | Express.js is documented future-only — do not build it or treat it as present ([`CLAUDE.md`](/CLAUDE.md)) |
| Runtime | pnpm `9.15.4`, Node ≥ 22 | Node 22+ is hard-required: Vitest 4's rolldown calls `util.styleText` with an array argument that throws `ERR_INVALID_ARG_VALUE` on Node 21 or older, before any test loads |

## Request path

```mermaid
sequenceDiagram
    participant B as Browser
    participant MW as proxy.ts
    participant L as Dashboard layout
    participant D as Module data layer
    participant S as Supabase client factory
    participant DB as Postgres with RLS

    B->>MW: GET /dashboard
    Note over MW: Clerk context only, no gating. Stamps x-pathname on every non-static route plus __clerk and api/trpc
    MW->>L: render the (dashboard) route group
    L->>L: requireAuthenticatedUser()
    alt no Clerk session
        L-->>B: redirect to /sign-in
    else signed in
        L->>D: getProfileSnapshot and getBatchesSnapshot, both cache-wrapped
        D->>S: createSupabaseServerClient()
        Note over S: anon-key client, accessToken callback returns the Clerk token
        S->>DB: typed query
        Note over DB: app_private helpers read sub, then resolve role and tenant
        DB-->>S: tenant-scoped rows only
        S-->>D: rows
        Note over D: map to domain types, derive lifecycle and dates
        D-->>L: discriminated snapshot
        Note over L: withTenantAccess folds no-tenant-access over an ok snapshot
        L-->>B: shell plus page content
    end
```

A request flows top to bottom:

- **`proxy.ts`** (repo root) is the Clerk middleware. Its matcher covers every route except static assets, plus `__clerk` and `api`/`trpc`, and it stamps `x-pathname` so Server Components can read the full request path. The middleware does **not** force authentication.
- **Route protection is per protected surface, never centralised.** `app/(dashboard)/layout.tsx` calls `requireAuthenticatedUser()` and redirects anonymous visitors to `/sign-in`; a route group outside `(dashboard)` is unguarded until it adds its own check. `app/page.tsx` redirects `/` to `/dashboard`. `/api/openapi.json` checks `getAuthUserId()` itself and answers `401`; the Clerk webhook is unauthenticated by design and verifies Clerk's signature instead (see the auth chain below).
- **The layout resolves identity once, before rendering**, and every downstream decision reads that one snapshot: trusted role, the ADR-006 platform-admin axis (a `security definer` RPC, because `public.platform_admins` is deliberately unreadable through the anon client), and the tenant-access fold over the batches snapshot. It also suppresses `MetricsRow` rather than rendering zeros — for the dashboard route itself, for `sync-failed`, and for `no-tenant-access`.
- **Pages are thin.** Each `app/(dashboard)/<route>/page.tsx` Server Component fetches through the owning module's `data/` layer and composes `modules/*/ui` screens over `shared/ui` primitives; no business logic lives in `app/` (RULES rule 11). The one thing `app/` legitimately owns is composition across two modules' private `data/` layers — `app/(dashboard)/tenant-access.ts` joins `modules/auth` identity to `modules/tenancy` profile reads, which no module may do for another.

## The auth chain in one breath

`proxy.ts` (Clerk middleware, context only) → `requireAuthenticatedUser()` in the dashboard layout (sign-in redirect) → module `data/` builds an **anon-key** Supabase client whose `accessToken` callback returns the Clerk session token (Clerk's native third-party auth integration — JWT templates were deprecated 1 Apr 2025, and this schema needs no custom claims because RLS reads only `sub`) → **Postgres RLS** (`app_private.*` helpers from the canonical migration) makes every authorization decision. RLS is the security boundary; UI hiding is usability only (RULES rule 1).

A missing token must **throw**, never query as `anon`: an `anon` query returns zero rows with no error, which is indistinguishable from "this user has no batches" — the dangerous outcome for a compliance tool. The throw is deliberately *lazy*: it fires inside the `accessToken` callback when the query runs, not when the client is constructed, so it surfaces as a query error and each caller's `try/catch` maps it to `sync-failed`. `NO_CLERK_TOKEN_MESSAGE` is exported precisely so that "not signed in" can be told apart from "Supabase rejected the token"; the dev-only `/api/debug/auth-check` route reports exactly that verdict and returns `404` in production.

The service-role client bypasses RLS and is confined to the Clerk webhook provisioning path: `lib/supabase/service.ts` → `modules/auth/data/provisioning.ts` → `app/api/webhooks/clerk/route.ts` (creates `profiles` on `user.created`/`user.updated`, deactivates on `user.deleted`, never hard-deletes). `SUPABASE_SERVICE_ROLE_KEY` must never be `NEXT_PUBLIC_`-prefixed or read outside that file. The RLS helper chain and policy behaviour in depth are on [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md).

## The four-layer import model

Code is grouped by domain, not by file type (DDD-influenced, TES-68). Everything sits in a one-way hierarchy — `app → modules → shared → lib/supabase` — enforced at lint time by `import/no-restricted-paths` in [`eslint.config.mjs`](/eslint.config.mjs) (RULES rule 7):

```mermaid
flowchart TD
    subgraph APP["Layer 1 — app/, thin Server Component routes"]
        A["fetch via a module data/, compose module UI, no business logic"]
    end
    subgraph MOD["Layer 2 — modules/, one per PRD FR"]
        MD["data/ — private to its own module"]
        MO["domain/ — public: pure rules, no I/O"]
        MU["ui/ — public: domain-aware components"]
    end
    subgraph SH["Layer 3 — shared/, leaf level"]
        ST["types.ts — UI domain types"]
        SU["ui/ — props-only primitives"]
    end
    subgraph SUP["Layer 4 — lib/supabase/, external data boundary"]
        SF["client factories — server, client, service"]
        SD["database.types.ts — generated raw rows"]
    end

    A -->|"app may fetch any module data/"| MD
    A --> MU
    MD --> MO
    MD --> ST
    MD --> SF
    MD --> SD
    MO --> ST
    MU --> ST
    MU --> SU
    SH -. "forbidden: shared must not import modules/ or app/" .-> MOD
    MOD -. "forbidden: modules must not import app/" .-> APP
    MO -. "forbidden: raw DB row types are data-layer only" .-> SD
    MU -. "forbidden: raw DB row types are data-layer only" .-> SD
```

The load-bearing zones:

- **Raw DB types are data-layer only.** `lib/supabase/database.types.ts` may be imported from module `data/` layers (and `lib/supabase` itself) — not from `app/`, `shared/`, or any module `domain/`/`ui/` code. Components import domain types from `shared/types.ts` only (RULES rule 10).
- **`shared/` is the leaf** — it must never import `modules/` or `app/` (RULES rule 9).
- **`modules/` must never import `app/`** (RULES rule 9).
- **Another module's `data/` is private.** Each of the 14 domains gets a zone (generated from the ESLint `domains` array) making its `data/**` forbidden to every other module — import its `domain/` or `ui/` surface instead; only `app/` may fetch from any module's `data/` (RULES rule 8).
- **No index barrels** — deep imports are the convention (RULES rule 13).

Solid arrows are allowed import directions; dashed arrows are lint failures. Two type families stay deliberately separate across the model — generated raw rows (`database.types.ts`) and UI domain types (`shared/types.ts`) — and the `data/` mapper is the only translation point (RULES rule 17). The full contract is on [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).

## Module catalog

There is **one module per PRD FR** under `modules/`, plus `shell` for app chrome — **14 modules total**, the same set as the ESLint `domains` array. Sub-layers are verified against the tree, not the READMEs' promises. New code goes inside its owning module, never in a new top-level folder (RULES rule 12).

| Module | FR | Sub-layers (verified) | One line |
| --- | --- | --- | --- |
| [`auth`](/modules/auth/README.md) | FR-01 | `data/`, `domain/`, `ui/` | Clerk session reads and the `requireAuthenticatedUser` gate; role resolution; service-role profile provisioning; invitations; sign-in redirect defense; widget theming |
| [`tenancy`](/modules/tenancy/README.md) | FR-02 | `data/`, `domain/`, `ui/` | profile/membership reads and tenant-access folding; user administration and the ADR-006 school registry, with `CreateUserForm` / `CreateSchoolForm` |
| [`batches`](/modules/batches/README.md) | FR-03/04/05 | `data/`, `domain/`, `ui/` | **reference implementation** of fetch → map → derive; urgency engine + dashboard metrics; dashboard widgets (incl. `AlertsPanel`) |
| [`documents`](/modules/documents/README.md) | FR-06 | `data/`, `domain/`, `ui/` | requirement catalog, per-batch records, evidence upload/signed URLs; `domain/compliance.ts` is the single home for untracked-document semantics (ADR-004) |
| [`attendance`](/modules/attendance/README.md) | FR-07 | — (README only) | placeholder: plans `data/attendance.ts` + `domain/eligibility.ts` (the ≥5-absences rule) against the planned `attendance_records` table |
| [`lamr`](/modules/lamr/README.md) | FR-08 | — (README only) | placeholder: plans LAMR report fetch/map and evidence UI |
| [`billing`](/modules/billing/README.md) | FR-09 | `data/`, `domain/`, `ui/` | document-generating engine (ADR-001): rates, three tracks, statement builder, readiness gate, ADR-003 packet-queue projection; real `.docx` population is still planned and `data/billing.ts` does not read `billing_records` yet (the table exists only in the pending migration) |
| [`import-export`](/modules/import-export/README.md) | FR-10 | `data/`, `domain/`, `ui/` | RFC 4180 CSV parser, ULI-keyed learner reconciliation, `importLearnersCsv` write path (typechecked, never executed against a live database); the modal is still a canned-sample picker |
| [`analytics`](/modules/analytics/README.md) | FR-11 | `ui/` only | the page fetches the live batches snapshot itself and composes props-only chart primitives |
| [`activity`](/modules/activity/README.md) | FR-12 | `data/`, `ui/` | activity-log snapshot feeding the dashboard panel and the full feed |
| [`notifications`](/modules/notifications/README.md) | FR-13 | — (README only) | placeholder: alerts are computed on read (no cron, no email) |
| [`settings`](/modules/settings/README.md) | FR-14 | `ui/` only | design-sync Settings overlay; preference toggles are session-local state and "Save changes" is a toast, not a write |
| [`reports`](/modules/reports/README.md) | FR-15 | `domain/`, `ui/` | pure EGACE/employment helpers + XLSX export; the report page fetches the full batches snapshot itself |
| [`shell`](/modules/shell/README.md) | (none) | `ui/` only | app chrome — `NavDrawerProvider`, `Sidebar`, `Topbar`, `MobileHeader`, `MetricsRow`, `AuthHeader` — kept a module (not `shared/`) because it carries tenant and data context |

So the split is: **seven modules have a `data/` layer** (`activity`, `auth`, `batches`, `billing`, `documents`, `import-export`, `tenancy`), **three are README-only placeholders** (`attendance`, `lamr`, `notifications`), and the remaining four have `domain/` and/or `ui/` code but no `data/` layer yet.

## Docs precedence and the ADR chain

`RULES.md` is the checklist of non-negotiable *what*, each rule tagged with its enforcement level (`hook`, `deny`, `lint`, `types`, `rls`, `review`); `CLAUDE.md` explains the *why*. **Where the two appear to disagree, `RULES.md` wins** and the drift should be fixed — one known drift: rule 34 ("no test runner yet — `pnpm test` is a placeholder") predates the Vitest stand-up; `tests/unit/` now holds 22 spec files.

Below the rules, precedence is `docs/MASTER_PRD_SRS.md` (product source of truth) → `docs/TRD.md` (engineering companion) → `docs/IMPLEMENTATION_PLAN.md` (phased plan). The ADRs in `docs/adr/` override or amend those documents (RULES rule 31), and you should **consult them before changing schema or billing math** (RULES rule 30). All six are accepted:

| ADR | What it fixes |
| --- | --- |
| [ADR-001 — Billing Engine & Domain Model](/docs/adr/ADR-001-billing-and-domain-model.md) | **Supersedes any "billing = preparation signal only" wording.** Billing is a document-generating engine (TSF/Allowance, Training Cost, Entrepreneurship as populated `.docx`; Assessment Fee out of scope); locks progress = `sessions_held ÷ total_sessions`, the ≥5-absences rule, one RQM = one batch, NoLedger append-only `billing_records` |
| [ADR-002 — The prototype portrays the ADR-001 target](/docs/adr/ADR-002-design-prototype-portrays-adr-001-target.md) | The design prototype shows the target system, including screens whose tables are still planned; planned-vs-implemented is **not** badge-marked, so honesty is carried entirely by copy discipline |
| [ADR-003 — Billing Packet Queue](/docs/adr/ADR-003-billing-packet-queue.md) | **Amends ADR-001 §4**: the queue is a *projection* of `(batch, billing_type, tranche)` — derived identity, `draft → ready → generated → submitted → settled`, derived due dates, user-asserted submitted/settled marks — upholding NoLedger and computed-on-read alerts |
| [ADR-004 — Untracked document semantics](/docs/adr/ADR-004-untracked-document-semantics.md) | A requirement with no record is `untracked` — a third state, excluded from measurement and failing **closed** at gates; the rule lives in one module (`documents/domain/compliance.ts`) so no surface re-decides it |
| [ADR-005 — Demo account tenant scoping](/docs/adr/ADR-005-demo-account-tenant-scoping.md) | One tenant membership per profile; `demo@tvicams.app` is a `viewer` scoped to AKB; the dev membership seed is fixture data in `supabase/seeds/`, never a migration |
| [ADR-006 — Platform Admin & School Registry](/docs/adr/ADR-006-platform-admin-and-school-registry.md) | **Supersedes PRD FR-02's "Super Admin is not implemented."** A platform admin exists — a separate table, not a `profile_role` value — and provisions the school registry only (`tenants`, `qualifications`, `tenant_qualifications`, seating a tenant's first member); granting it any compliance table, or letting it seat itself into a tenant, is a boundary change that needs its own ADR |

Locked domain facts that code must not contradict (`RULES.md` "Locked domain facts", `CONTEXT.md`): progress = `sessions_held / total_sessions` (nominal hours ÷ 8, snapshotted on the batch); a scholar with **≥5 absences is ineligible** (stored as `max_absences = 4`; no ADR supersedes it); **one RQM code = one batch**; **ULI is the permanent learner key**; tenant context lives in the **URL path segment**; alerts are **computed on read**; billing is a **document-generating engine**; packet lifecycle `draft → ready → generated → submitted → settled` (ADR-003).

Schema state, in one breath: `supabase/migrations/` holds seven `.sql` files — `20260528160300_create_tenant_scoped_schema.sql` is the canonical first migration (schema + RLS), `20260910120000_add_adr001_billing_domain.sql` is the newest checked in and is pending, and `20260906120000_ensure_invitation_membership_atomic.sql` is checked in but missing on the live database. New migrations are additive (RULES rule 20); dev seed data lives in `supabase/seeds/`, not `migrations/`. The migration ledger, the live-versus-checked-in drift, and every policy are on [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md).

## Design material — do-not-edit zones

RULES rules 28–29 designate `assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` (ported verbatim from the design bundle, `globalIgnores`-excluded from lint, edit-blocked by `.claude/hooks/protect-static-dirs.sh`, which carves out the app's real `public/assets/`) and `FIGMA FILES/`, `diagrams/`, `.design-sync/` (review-level artifacts) as design material, not app code. Edit the source design files instead, or confirm with the user first. The design rules themselves are [RULES.md §4](/RULES.md).

## Build, run, and test

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server (`next dev --webpack`) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint flat config, including the import-boundary zones |
| `pnpm exec tsc --noEmit` | Strict typecheck (no dedicated script) |
| `pnpm test` | Vitest unit suite — 22 spec files in `tests/unit/` |
| `pnpm test:e2e` | Playwright e2e (`e2e/auth.spec.ts`, dev server on `:3000`) |
| `pnpm preview` | Static design preview bundle on `:5000` |

Unit tests cover mappers and pure module `domain/` layers with **fixed as-of dates**. The Playwright spec exercises unauthenticated access to a dashboard route being redirected to `/sign-in` — the layout gate, not `proxy.ts`. Real-Supabase RLS/tenant-isolation integration tests are **still outstanding** and must run against the real hosted project with no mocks (RULES rule 35). A first-run walkthrough is on [Quickstart](/openwiki/quickstart.md).

## Related pages

- [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) — tables, enums, the `app_private.*` RLS helper chain, and migration state
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) — the import model, the fetch → map → derive contract, and the snapshot union
- [Quickstart](/openwiki/quickstart.md) — getting the app running
