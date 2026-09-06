---
type: Reference
title: Module Boundaries and the Data Layer Pattern
description: How TVI-CAMS groups code into app/, modules/<domain>/{data,domain,ui}, shared/, and lib/supabase/ — the ESLint-enforced import direction, the private data/ surface, the fetch → map → derive contract, discriminated snapshots that render honest empty states (the shared/mocks fallback was retired), and total enum-bridge maps.
tags: [architecture, module-boundaries, data-layer, ddd, import-direction, supabase, type-safety]
verified:
  - by: openwiki/0.4.3
    at: 2026-09-04T12:35:42.157Z
---

# Module Boundaries and the Data Layer Pattern

Code in this repository is grouped **by domain, not by file type** — a DDD-influenced layout introduced with TES-68. Every feature lives in a `modules/<domain>/` folder split into three sub-layers (`data/`, `domain/`, `ui/`), and everything sits inside a four-layer hierarchy with a strictly one-way import direction: `app → modules → shared → lib/supabase`. [`CLAUDE.md`](/CLAUDE.md) §Architecture explains the *why*; [`RULES.md`](/RULES.md) §2–§3 states the *what* as checklist rules, each tagged with its enforcement level (`[hook]`, `[deny]`, `[lint]`, `[types]`, `[rls]`, `[review]`). Where the two documents disagree, `RULES.md` wins.

One recent change reshapes the bottom of this model: the **mock-data retirement** removed `shared/mocks/` entirely — there is no unconfigured-fallback seed dataset anywhere in the app anymore. Unconfigured and sync-failed snapshots render an honest empty state instead (see [Mock-data retirement](#mock-data-retirement-what-left-shared-and-where-it-went)).

The rules that matter most for day-to-day work:

- **No business logic in `app/`.** Routes are thin Server Components: they fetch via a module's `data/` layer and compose module `ui/` + `shared/ui/` primitives (RULES §2.11, `[review]`).
- **A module's `data/` is private to that module.** Another module imports its `domain/` or `ui/` surface instead; only `app/` may fetch from any module's `data/` (RULES §2.8, `[lint]`).
- **`domain/` is pure** — business rules with no I/O (RULES §2.14, `[review]`).
- **`shared/` must never import `modules/` or `app/`** (RULES §2.9, `[lint]`).
- **No index barrels** — deep imports are the convention everywhere, including `shared/` (RULES §2.13, `[review]`).
- **Only module `data/` layers may import `lib/supabase/database.types.ts`** (besides `lib/supabase` itself); components import domain types from `shared/types.ts` only (RULES §2.10, `[lint]`).

## Layer model

```mermaid
flowchart TD
    subgraph APP["app/ — thin Server Component routes"]
        A1["fetch via a module's data/, compose its UI"]
    end
    subgraph TEN["modules/tenancy/"]
        TD1["data/ — private"]
        TD2["domain/ — public surface"]
    end
    subgraph BAT["modules/batches/"]
        BD1["data/ — private"]
        BD2["domain/ — public surface"]
        BU1["ui/ — public surface"]
    end
    subgraph SH["shared/ — leaf level"]
        S1["types.ts — UI domain types"]
        S2["ui/ — props-only primitives"]
        S3["vocab.ts — fixed TESDA vocabulary"]
        S4["text.ts — copy helpers"]
    end
    subgraph SUPA["lib/supabase/ — external data boundary"]
        P1["server.ts, client.ts, service.ts"]
        P2["database.types.ts — generated raw rows"]
    end

    A1 --> TD1
    A1 --> BD1
    A1 --> BD2
    A1 --> BU1
    TD1 --> P1
    TD1 --> P2
    TD1 --> S1
    BD1 --> P1
    BD1 --> P2
    BD1 --> S1
    BD1 --> BD2
    TD2 --> S1
    BU1 --> S1
    BU1 --> S2
    S3 --> S1
    SH -. "never: shared must not import modules or app" .-> TEN
    TEN -. "never: another module's data/ is private" .-> BD1
    BAT -. "never: another module's data/ is private" .-> TD1
```

Solid arrows are allowed import directions; dashed arrows are rejected by `import/no-restricted-paths` in [`eslint.config.mjs`](/eslint.config.mjs). The tenancy/batches pair illustrates the cross-module rule with two real modules. (The former `shared/mocks/` node is gone — the mock-data retirement removed it; see below.)

### `app/` — thin routes only

`app/` holds App Router pages, layouts, and route handlers. A page such as `app/(dashboard)/dashboard/page.tsx` shows the shape: it imports `getBatchesSnapshot` and `selectBatchesForDisplay` from `modules/batches/data/batches`, `getActivitySnapshot` from `modules/activity/data/activity`, `getCurrentUser` and role helpers from `modules/auth/data`, pure helpers from `modules/batches/domain/metrics` and `modules/billing/domain/readiness`, and composes `modules/*/ui` screens over `shared/ui` primitives. The route performs fetch + state mapping + composition; the computation itself lives in module `domain/` functions. New code goes inside its owning module — modules without code yet hold a README naming their FR (e.g. `modules/attendance/README.md`, FR-07, planning `data/attendance.ts`, `domain/eligibility.ts`, `ui/`), and new top-level folders are a rule violation (RULES §2.12).

### `modules/<domain>/` — one module per PRD FR

The 14 domains are: auth (FR-01), tenancy (FR-02), batches (FR-03/04/05), documents (FR-06), attendance (FR-07), lamr (FR-08), billing (FR-09), import-export (FR-10), analytics (FR-11), activity (FR-12), notifications (FR-13), settings (FR-14), reports (FR-15), and `shell` (app chrome, no FR). Within a module:

- **`data/`** — the fetch → map → derive contract and the **only** layer allowed to import `lib/supabase/database.types.ts` (plus `lib/supabase` itself). Data files are the module's private surface.
- **`domain/`** — pure business rules, no I/O (e.g. `modules/batches/domain/urgency.ts`, `modules/billing/domain/readiness.ts`), unit-tested with fixed as-of dates. This is public to other modules.
- **`ui/`** — domain-aware components. Also public to other modules, though in practice other modules reach for `domain/` logic, not each other's screens.

A module's `data/` may import its own `domain/` (e.g. `modules/tenancy/data/tenancy.ts` takes its `Profile` type from `modules/tenancy/domain/profile`), another module's `domain/` (e.g. `modules/batches/data/metrics.ts` imports `docRecordFor` from `modules/documents/domain/compliance`, and `modules/billing/data/billing.ts` imports `isDocOnFile` from the same public surface), and anything in `shared/` — `shared/types.ts`, `shared/ui/`, `shared/vocab.ts`, `shared/text.ts`. There is no longer a `shared/mocks` to import: billing's tenant lookup is a parameter with a self-fallback (`resolveTenant(tenantId, tenants)` defaults the name to the tenant id itself when the tenant is not found, since no live tenant list is exposed yet — TES-34).

#### ⚠️ Stray artifacts in `modules/batches/ui/` — not module code

Four files sit in `modules/batches/ui/` that are **not part of the module**: `const.tsx`, `example.js`, `index.html`, and `shared-types2.ts`. They are pasted learning / design-bundle artifacts:

- `const.tsx` is a TypeScript annotation exercise — "Hello World!" variable demos, album/animal/rectangle examples, inline vitest `it` blocks. Its only import from the project is `./shared-types2`; its other imports (vitest, `drizzle-orm`, `fs/promises`, a Next test-mode helper) are not used by any real module code.
- `shared-types2.ts` is the demo's single exported type (`AnimalObject`).
- `example.js` is a six-line `console.log` demo; `index.html` is a bare `<script src="example.js">` tag.

**Nothing in the app imports any of the four.** The real public surface of `batches/ui/` is what [`modules/batches/README.md`](/modules/batches/README.md) documents: `BatchCard`, `BatchModal`, `LifecyclePipeline`, `TableView`, `CardsView`, `FiltersRow`, `filter.ts`, plus the `ui/dashboard/*` widgets. Do not import these files, reference them in docs, or pattern new code after them; new code belongs in the owning module's `data/`/`domain/`/`ui/` (RULES §2.12), not in ad-hoc files or new top-level folders.

### `shared/` — leaf level

`shared/` is the lowest layer: code here knows no module, page, or data-source context, and it must never import `modules/` or `app/` (lint-enforced). Current contents:

- `shared/types.ts` — UI domain types, deliberately one file (see [The per-module type split is now unblocked](#the-per-module-type-split-is-now-unblocked-tes-68-follow-up)).
- `shared/ui/` — props-only presentational primitives (`Icon`, `StatusBadge`, `EmptyState`, `MetricCard`, `InfoCallout`, `Charts`, …); if one starts reading data or encoding business rules it moves into its owning module (RULES §2.15).
- `shared/vocab.ts` — fixed TESDA vocabulary (`EGACE_STAGES`, `EMPLOYMENT_STATUSES`, …): closed sets that are never fetched. It was deliberately moved out of the mocks facade (TES-74, before the retirement) so no consumer reads as mock-dependent, and it cannot live in a module `domain/` because `shared/` is consumed by more than one module.
- `shared/text.ts` — leaf-level copy helpers (`pluralize`), pure string shaping with no data and no domain rules.

`shared/mocks/` **no longer exists** — the mock-data retirement removed it entirely. There is no unconfigured-fallback seed anywhere; `unconfigured` and `sync-failed` snapshots both render an honest empty state (RULES §3.19). Note that `shared/README.md` has not been updated to match: it still lists `mocks/` as a content and still states the old TES-68 deferral rationale. Where the README disagrees with `RULES.md`/`CLAUDE.md`, the rules win.

### `lib/supabase/` — the external data boundary

`lib/supabase/` wraps Supabase behind three factories plus the generated contract:

- `server.ts` — `createSupabaseServerClient()` builds an **anon-key** client and attaches the caller's Clerk session token through the `accessToken` callback (Clerk's native third-party auth; JWT templates were deprecated 1 Apr 2025, and the schema needs no custom claims because RLS reads only `sub`). If no token exists it **throws** (`NO_CLERK_TOKEN_MESSAGE`) rather than silently querying as `anon` — RLS would answer an anon query with zero rows and no error, which for a compliance tool is the dangerous outcome. `isSupabaseConfigured()` (checks `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`) is what data functions probe to decide between live fetch and the `unconfigured` snapshot.
- `client.ts` — the browser-side client.
- `service.ts` — a service-role client that **bypasses RLS entirely**; reserved for trusted server-to-server writes with no Clerk session (the Clerk `user.created` webhook provisioning `profiles` via `modules/auth/data/provisioning.ts`). `SUPABASE_SERVICE_ROLE_KEY` must never be read outside this file.
- `database.types.ts` — the generated raw-row contract (tables' `Row`/`Insert`/`Update` plus seven Postgres enums: `profile_role`, `lifecycle_stage`, `batch_status`, `document_status`, `document_audience`, `assessment_result`, `activity_action`). Regenerate after every migration.

## Import direction is lint-enforced

[`eslint.config.mjs`](/eslint.config.mjs) implements the hierarchy with `import/no-restricted-paths` zones over `app/**`, `modules/**`, `shared/**`, and `lib/**`:

| Forbidden direction | Lint message (abridged) |
|---|---|
| `app/`, `shared/`, `modules/*/ui/`, `modules/*/domain/` ← `lib/supabase/database.types.ts` | "Raw DB row types are data-layer only. Import domain types (shared/types or a module's domain/) instead." |
| `shared/` ← `modules/` | "shared/ is the leaf level and must not import modules/." |
| `shared/` ← `app/` | "shared/ must not import app/." |
| `modules/` ← `app/` | "modules/ must not import app/." |
| `modules/!(d)/**` ← `modules/d/data/**`, for each of the 14 domains | "modules/d/data is private to that module; import its domain/ or ui/ surface, or fetch in app/." |

The per-module privacy zones are **generated from the `domains` array** at the top of the config, which lists exactly the 14 module folders — so a new module must be added there or its `data/` will not be made private. Two things to note about what lint does *not* do:

- The rules that are `[review]`-level (no business logic in `app/`, `domain/` purity, no barrels, code placement) have no automated check — a human or agent must catch them.
- A separate `complexity: ["warn", 15]` rule is a maintainability signal only (warn, not error), and `globalIgnores` excludes the do-not-edit design directories (`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/`) from lint/build.

## A module's `data/` is private

The public surface of a module is `domain/` + `ui/`. Its `data/` holds the live-query coupling to Supabase, and importing it across a module boundary would smuggle that coupling in — so the rule is lint-enforced per domain, with one carve-out: **`app/` Server Components may fetch from any module's `data/`** (and `app/` is exactly where cross-module `data/` imports appear, e.g. the billing page calling `modules/batches/data/batches`, `modules/auth/data/auth`, `modules/auth/data/role`, `modules/tenancy/data/tenancy`, and `modules/billing/data/billing`).

Two real examples of how the boundary is respected instead of crossed:

- **Pass-by-parameter.** `profiles` RLS allows "own or same-tenant" reads, so fetching "my profile" needs the caller's Clerk user id. Resolving that id is `modules/auth/data`'s job, but its `data/` is private — so `getProfileSnapshot(clerkUserId)` in [`modules/tenancy/data/tenancy.ts`](/modules/tenancy/data/tenancy.ts) takes the id as a parameter, and `app/` (which may call both `data/` layers) wires them together.
- **Import the public surface.** `modules/batches/data/metrics.ts` needs the untracked-document rule, so it imports `modules/documents/domain/compliance` — `domain/` is public, `data/` is not.

### Hand-duplicated mappers are the price of privacy

Because `batches.ts` cannot import `documents.ts` (both are `data/` layers of different modules), it **hand-duplicates** the document-mapping logic: `MISSING_DOC`, `mapDocumentRow`, and the catalog backfill in `mapDocumentsMap` are copies of their `modules/documents/data/documents.ts` counterparts, kept in sync by hand — the file's own comment says this duplication exists *because* a module's `data/` is private, and notes it closes the `TODO(join)` gap by backfilling against the batch's requirement catalog. The same deliberate duplication appears in smaller form: `toRelativeWhen` in `activity.ts` mirrors `toDisplayDate` in `batches.ts` (same unparseable-date → empty-string convention). When fixing one, fix all copies — the lint rule is what makes the copies, not a mistake to deduplicate.

## The data contract: fetch → map → derive

`modules/batches/data/batches.ts` is the **reference implementation every entity contract must follow** (RULES §3.17). Its own header names the three intentionally separated layers:

1. **fetch** — `getBatchesSnapshot()`: a typed Supabase query (`batches` with embedded `scholarship_programs(code, program_document_requirements(*))` and `documents(*)` selects, ordered by `end_date`). RLS scopes rows to the caller — **never manually filter by tenant in JS** (RULES §1.2: a JS-side tenant filter is a bug even when it returns the right answer). It is `cache()`-wrapped so the dashboard layout and every page under it share one Supabase query per request.
2. **map** — `mapBatchRow(row)`: a pure DB-row → UI-domain (`Batch`) translation, no I/O, **exported for unit tests**. Contract gaps are marked `TODO(contract)` and defaulted so the shape stays valid (`billingDeadline`/`daysToBilling` currently stand in on `end_date` because no `billing_deadline` column exists; `trainingDays`, `notes`, `duration`, … are empty defaults).
3. **derive** — lifecycle and date helpers computed from the row: `deriveLifecycle(currentStage)` builds the full UI pipeline from the single `current_stage` enum; `daysUntil` returns `Number.POSITIVE_INFINITY` for a missing *or unparseable* date (the "no known deadline" sentinel that sorts last and never trips urgency tiers — without the guard, `NaN` would silently corrupt sorting and urgency math downstream); `toDisplayDate` converts ISO to the UI's "Jun 18, 2026" convention and returns `''` for null/unparseable.

The snapshot also carries `dataAsOf` (the freshest `updated_at` across loaded rows, via `latestUpdatedAt`), which drives the dashboard's "Data as of" stamp and the 24-hour stale flag. A sibling function, `selectBatchesForDisplay(snapshot)`, centralizes the row-selection decision for every route: **live rows when `ok`, an empty list otherwise — it never substitutes mock or cached data**. There is also a throwing `getBatches()` for callers that want the raw-or-throw flavor, but the snapshot is the contract.

Variants within the convention:

- **Derive-only data files** — `modules/batches/data/metrics.ts` has no I/O at all; `getDashboardMetrics(batches, criticalDocumentKeys)` is a pure function over a `Batch[]` the caller already loaded, taking the requirement catalog as a parameter because no single flat catalog exists (the live `program_document_requirements` table is scoped per scholarship program). Note the live dashboard routes use the sibling `deriveDashboardMetrics` in `modules/batches/domain/metrics.ts` instead; the migration plan still flags the data-layer copy as a duplicate "decide which survives".
- **No derive layer** — `modules/documents/data/documents.ts` and `modules/batches/data/learners.ts` have nothing time-based to compute; fetch + map is the whole contract. `getBatchDocumentsSnapshot` additionally takes the requirement catalog as a parameter — callers that already hold it pass it in rather than forcing a second fetch.
- **Write paths** — `modules/import-export/data/learnerImport.ts`'s `importLearnersCsv` extends the same shaping for mutations: it validates the CSV *before creating a Supabase client*, then reads the target batch's `tenant_id` back via an RLS-scoped SELECT (so a write can never target a tenant the caller couldn't already read), and reconciles by ULI before insert/update.

## Discriminated snapshots

Data functions return **discriminated snapshot unions** so Server Components map states straight to UI (RULES §3.19). The core trio, per `BatchesSnapshot`:

| Status | Meaning | Required UI treatment |
|---|---|---|
| `ok` | Live rows loaded (RLS-scoped) | Render data; show real "Data as of" from `dataAsOf` |
| `sync-failed` | Supabase configured but the query failed, or the client threw (including a missing Clerk token) | Render an **honest empty state** (no mock or cached substitute) and **must** surface the sync-failed banner — check it *before* the empty guard |
| `unconfigured` | No Supabase env in this environment | Render an **honest empty state** (no banner — there is nothing to retry against) |

The guard-clause ordering in that table is itself a rule: RULES §3.19 notes that a real sync failure yields **zero rows**, so a route that checks "empty" before "sync-failed" will silently swallow the banner and read as an empty tenant. `app/(dashboard)/dashboard/page.tsx` returns its `SyncFailedView` before the empty check, and `app/(dashboard)/billing/page.tsx` does the same before its "No batches to bill yet" view.

Modules extend the trio with their own states where a further outcome is genuinely different:

- `ProfileSnapshot` in `modules/tenancy/data/tenancy.ts` adds **`not-found`**: the user is authenticated with Clerk but has no `profiles` row yet — a webhook race or a failed provisioning (`app/api/webhooks/clerk/route.ts` → `modules/auth/data/provisioning.ts`). It is kept distinct from `sync-failed` because "no access yet" is not an error.
- `LearnerImportSnapshot` in `modules/import-export/data/learnerImport.ts` adds **`validation-failed`** (`errors: string[]`): the CSV is structurally bad (no data rows, missing required columns, all rows invalid) before any Supabase client is created or write is attempted. Partially valid files return `ok` with a `skipped` row list instead.

```mermaid
flowchart TD
    F["getBatchesSnapshot()"] --> C{"isSupabaseConfigured()"}
    C -- "no Supabase env" --> U["unconfigured"]
    C -- "env present" --> Q["typed Supabase select, rows scoped by RLS"]
    Q --> E{"query error or thrown client failure?"}
    E -- "yes" --> SF["sync-failed — raw error kept server-side"]
    E -- "no" --> OK["ok — rows mapped via mapBatchRow, dataAsOf = latest updated_at"]
    U --> E1["route renders an honest empty state — no mock or cached substitute"]
    SF --> E1
    SF --> BN["route renders the sync-failed banner, checked before the empty guard (RULES 19)"]
    OK --> D["live rows rendered with the Data as of stamp"]
```

The `getBatchesSnapshot` decision flow after the mock-data retirement; tenancy and import snapshots add their extra states on top of the same trunk.

One subtle invariant lives in the banner itself: the snapshot holds the raw `error` string, but the UI never prints it. The dashboard's `SyncFailedView` renders fixed copy — "Couldn't reach Supabase" / "Batch data isn't available right now … Try again in a moment." — with a Retry link; the only optional appendage is a ` from <timestamp>` data-as-of label, *not* the error message. RULES §1.6 forbids leaking raw Supabase/SQL errors, table names, or internal IDs to the UI, and the snapshot design is what makes that possible: state discrimination in the union, error detail trapped server-side.

## Two deliberately separate type families

| Family | File | What it models | Who may import it |
|---|---|---|---|
| Raw rows | `lib/supabase/database.types.ts` (generated) | Supabase tables: `Row`/`Insert`/`Update` per table, seven Postgres enums | Module `data/` layers and `lib/supabase/` only — everything else is lint-blocked |
| UI domain | `shared/types.ts` (hand-written, one file) | What screens render: `Batch`, `Tenant`, `DocRecord`, `ActivityEvent`, `DashboardMetrics`, … | Everyone below `data/` — `app/`, `modules/*/domain/`, `modules/*/ui/`, `shared/` |

The mappers in each module's `data/` are the **only seam** between the families: they take generated row types in and return `shared/types.ts` domain types out, so components never see a snake_case column name or a raw enum value. `Batch` is the hub type — it references seven other shapes from the file's domain sections (`LifecycleStage`, `DocRecord`, `ScholarRow`, `EgaceCounts`, `EmploymentFollowUp`, `Competency`, `ScheduleAdjustment`), which is part of why the type file stays single. The practical consequence of keeping the families separate: after a migration you regenerate `database.types.ts` and fix whatever mappers break (a total enum map turns schema drift into a compile error, below), while `shared/types.ts` changes only when the UI contract changes.

## Enum bridges: total maps in the mapper, never in components

The DB and the UI use different spellings for the lifecycle pipeline, and the translation lives in the mapper (RULES §3.18, `[types]`):

| DB `lifecycle_stage` | UI `LifecycleStageKey` |
|---|---|
| `aou` / `ntp` / `tip` | `aou` / `ntp` / `tip` |
| `training` | `train` |
| `assessment` | `assess` |
| `billing` | `bill` |
| — (no DB column) | `entre` (UI-only) |
| `completed` / `blocked` | `null` (special-cased) |

`DB_TO_UI_STAGE` in `modules/batches/data/batches.ts` is a **total (non-`Partial`) map**: every `DbLifecycleStage` must appear, so adding a new DB enum variant is a compile error there until its UI treatment is deliberately chosen. The `null` entries are not omissions — `deriveLifecycle` gives them their own treatment (`completed` → every pipeline stage `done`; `blocked` → nothing marked `active`), and `normalizeStatus` surfaces DB `blocked` as UI `pending` until the UI gains a blocked tier. The same total-map discipline repeats across the data layer: `STAGE_TO_UI` (documents), `ACTION_TO_TONE` (activity, mapping the generic CRUD `activity_action` enum to badge tones), `DB_TO_UI_ROLE` (tenancy, where the DB role set is a strict subset of the UI's — `owner` has no DB equivalent yet), and `ASSESSMENT_RESULT_TO_UI` (learners, where `pending` maps to `''` = not yet assessed). The deliberate exception proves the rule: `DOCUMENT_ICONS` in documents.ts is a `Partial` map because `document_key` is per-program *configured data*, not a closed enum — an unknown key falls back to a generic icon rather than failing compilation. `tests/unit/batches.test.ts` pins the bridge's behavior (stage bridging, `completed`/`blocked` lifecycle treatment, `blocked` → `pending` status).

## Mock-data retirement: what left `shared/` and where it went

`shared/mocks/` used to hold the seed dataset that the `unconfigured` fallback rendered (and that `sync-failed` could additionally fall back to), plus re-exported reference lists. It has now been **removed entirely** — the retirement is recorded in RULES §2.16 (resolved, struck through) and CLAUDE.md. What it means in practice:

- **No mock data exists anywhere in the app.** `selectBatchesForDisplay(snapshot)` — the single decision point every dashboard-tree route and layout calls — returns `[]` for any non-`ok` status, and its docstring says "Never substitutes mock data". `MOCK_BATCHES`, `MOCK_ACTIVITY`, and the like survive only in historical file-header comments (`batches.ts`, `activity.ts`). `unconfigured` and `sync-failed` render an honest empty state (RULES §3.19).
- **Domain logic that used to sit in the mock facade now lives in module `domain/` layers**: `urgencyTier` → `modules/batches/domain/urgency.ts` (TES-68), billing readiness → `modules/billing/domain/readiness.ts`, `getMockMetrics` → `modules/batches/domain/metrics.ts` (TES-94 — moved because `shared/` is not allowed to import `modules/`).
- **Fixed TESDA vocabulary** (`EGACE_STAGES`, `EMPLOYMENT_STATUSES`, …) moved to `shared/vocab.ts` (TES-74): closed sets that are never fetched, filed where consumers don't read them as mock-dependent.

**Stale references to be wary of** (they point at files that no longer exist; `RULES.md`/`CLAUDE.md` record the retirement and win): `shared/README.md` still lists `mocks/` as a content and still states the old TES-68 deferral rationale; `batches.ts`'s `toDisplayDate` comment and `shared/types.ts`'s header still cite the removed `lib/data/seed.ts`; `learners.ts`'s `seq` comment still cites the removed `shared/mocks/seed.ts`; and `lib/supabase/server.ts`'s `isSupabaseConfigured` comment still says "silent mock fallback".

## The per-module type split is now unblocked (TES-68 follow-up)

A per-module split of `shared/types.ts` was considered in TES-68 and **deliberately deferred** while `shared/mocks/seed.ts` constructed 11 of these domain types inside `shared/` — which can never import `modules/`, so moving the types into their modules would have broken the import boundary. The mock-data retirement removed that blocker: RULES §2.16 is now resolved (struck through) and CLAUDE.md states the split "is unblocked whenever someone wants to do it". `shared/types.ts` remains a single file for now; `Batch`'s hub role (seven cross-domain shapes in one interface) remains the practical wrinkle. Attempt the split only with a concrete need.

## Testing the pattern

Mappers and module `domain/` layers are unit-tested with **Vitest** (specs in `tests/unit/`, fixed as-of dates per CLAUDE.md; real-Supabase RLS/tenant-isolation integration tests are still outstanding and must run against the real project, no mocks). Conventions worth copying:

- Fixture rows are typed against the real generated contract — `tests/unit/batches.test.ts` derives the module-private join-row shape with `Parameters<typeof mapBatchRow>[0]` instead of hand-duplicating it, so fixture drift is a compile error too. `tests/unit/documents.test.ts` imports `Database` directly from `lib/supabase/database.types`; the `tests/` directory is outside the lint zones, so test files are allowed to touch raw row types even though app code is not.
- Domain tests pin behavior at the bridge, e.g. `batches.test.ts` asserting `training` → `active`/`done`/`pending` pipeline statuses, `completed` → all done, `blocked` → none active, and `blocked` status → `pending`.
- The honest-empty contract is pinned at the mapper level: `batches.test.ts` asserts `selectBatchesForDisplay` returns `[]` for `unconfigured` and `sync-failed`, and that an `ok` snapshot carrying zero rows stays authoritative-empty (never a substitute) — RULES §3.19 as a unit test.

## Extending the layout safely

- **New entity contract** — mirror `modules/batches/data/batches.ts`: snapshot trio (extend it only with genuinely distinct states, like `not-found` or `validation-failed`), non-`ok` states render an honest empty state (no mock or fabricated data), sync-failed checked before empty in the route, pure exported mapper, total enum-bridge maps, `TODO(contract)` defaults for schema gaps, no tenant filtering in JS.
- **New module** — create `modules/<name>/{data,domain,ui}` and **add the name to the `domains` array in `eslint.config.mjs`** — that array is what generates the `data/`-privacy zones, so a missing entry silently leaves the module's `data/` importable by other modules. Empty modules get a README naming their FR. New code lives in the owning module's sub-layers (RULES §2.12) — no new top-level folders, no ad-hoc demo files.
- **After any migration** — regenerate `lib/supabase/database.types.ts`, then update affected mappers and domain types (RULES §3.20). Migrations are additive; `supabase/migrations/20260528160300_create_tenant_scoped_schema.sql` is canonical.

## Related pages

- [Architecture overview](/openwiki/architecture/overview.md) — the whole app: auth chain, RLS as the security boundary, product context.
- [Supabase data model and RLS policies](/openwiki/architecture/data-model-and-rls.md) — the tables, the seven enums, the `app_private.*` helper chain, and the `database.types.ts` regeneration contract on the other side of the seam.
- [Design system and UI invariants](/openwiki/architecture/design-system.md) — the `shared/ui/` primitives and the six required screen states that snapshots map onto.
- [Batches and lifecycle](/openwiki/domains/batches-and-lifecycle.md) — the domain model the batches module fetches, maps, and derives.
- [Test strategy](/openwiki/testing/test-strategy.md) — the Vitest suite, fixed as-of dates, and why `tests/` sits outside the lint zones.
- [Authentication and authorization](/openwiki/workflows/authentication-and-authorization.md) — the Clerk token → anon-key client → RLS chain behind `lib/supabase/server.ts`.
