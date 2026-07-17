# TVI-CAMS Technical Requirements Document (TRD)

Version: 1.0.0
Date: 2026-06-30
Status: Draft for engineering sign-off
Owner: System Architecture
Product: TESDA Document and Compliance Manager / TVI-CAMS

## Document Purpose and Boundaries

This TRD captures **engineering decisions** for the TVI-CAMS MVP. It is the
technical companion to `docs/MASTER_PRD_SRS.md` (the consolidated product source
of truth). Where the PRD says *what* and *why for the business*, this document
says *how* and *why for the system*.

Rules of precedence used here (inherited from MASTER_PRD_SRS Section "Source
Register and Precedence"):

1. Live Figma for UI structure and states.
2. Current repository implementation for actual shipped state.
3. Supabase migration for implemented database and RLS behavior.
4. Repository PRD, route map, and audits for approved direction.

Conflicts are resolved per the MASTER_PRD_SRS conflict-resolution table. This TRD
does **not** restate product requirements (FR-01..FR-15 live in the PRD) and does
**not** introduce Express.js as implemented — Express.js is documented only as a
future direction, consistent with `ARCHITECTURE.md` and the PRD conflict table.
(The future-backend recommendation was changed from Laravel to Express.js on
2026-07-06; see §1.3.)

---

## 1. System Overview

### 1.1 Architecture at a glance

TVI-CAMS is a **single Next.js App Router application** that talks directly to
**Supabase** (Postgres + Storage), with **Clerk** as the identity provider. There
is no separate backend service in the MVP. Authorization is enforced in the
database via Row Level Security (RLS), keyed off the Clerk JWT.

```text
                 ┌─────────────────────────────────────────────┐
                 │  Browser (React 19 client islands)           │
                 │  - Sidebar, modals, drawers, upload progress │
                 └───────────────▲─────────────────────────────┘
                                 │ HTML / RSC payload
        ┌────────────────────────┴───────────────────────────────┐
        │  Next.js 16 App Router (Vercel)                          │
        │  - Server Components (data fetch + role-scoped render)   │
        │  - Route Handlers / Server Actions (mutations)           │
        │  - Clerk middleware (route protection + proxy)           │
        │  - modules/*/data contracts (fetch → map → derive)           │
        └───────┬──────────────────────────────┬──────────────────┘
                │ Clerk JWT (template: supabase)│ Clerk session
                ▼                               ▼
   ┌────────────────────────┐        ┌────────────────────────┐
   │ Supabase Postgres      │        │ Clerk                  │
   │ - tenant-scoped schema │        │ - sessions, JWT issue  │
   │ - RLS (app_private.*)  │        │ - user.publicMetadata  │
   │ - Storage bucket       │        │   .role                │
   │   compliance-evidence  │        └────────────────────────┘
   └────────────────────────┘
```

### 1.2 Key architecture decisions and rationale

| Decision | Choice | Rationale | Trade-off accepted |
| --- | --- | --- | --- |
| Primary data layer | Supabase Postgres (direct from Next server) | Schema, RLS, Storage, and seed data already exist in one migration; zero extra infra for a ~5-user internal tool. | No central business-logic service yet; logic lives in `lib/` and DB. |
| Auth provider | Clerk | Already wired (`@clerk/nextjs`, ClerkProvider, proxy). Off-loads session/MFA/account UI. | Two identity stores to reconcile (Clerk user ↔ `profiles` row). |
| Authorization | Supabase RLS keyed on Clerk JWT `sub` | Defense-in-depth: even if a query is wrong, the DB denies cross-tenant rows. Tenant isolation is a P0 success metric (100% scoped). | RLS helper functions add query cost; must keep JWT template correct. |
| App framework | Next.js 16 App Router + RSC | Server Components fetch role-scoped data server-side; secrets never reach the client. Matches existing `app/` tree. | RSC + client-island mental model; streaming/caching nuances. |
| Future backend | Express.js on Node/TypeScript (recommended, **not** built) | Team's TypeScript/Node familiarity; same language as the app, so `modules/*/domain` business rules and `shared/types.ts` DTOs are reused directly instead of reimplemented in another language; conventional API/middleware/queue/report layer if the tool outgrows direct-Supabase. | Documented as future only; must not block MVP or appear "implemented". |

### 1.3 Why Supabase-first (not backend-first)

The PRD conflict table is explicit: README says "no Laravel assumptions" while
older route/API docs proposed a Laravel API. **Resolution: MVP is Next.js +
Clerk + Supabase; any dedicated backend is a future API layer only.** This TRD
honors that. As of 2026-07-06 the recommended future backend is **Express.js
(Node/TypeScript)**, superseding the earlier Laravel recommendation: the team
works in TypeScript/Node, and an Express layer reuses `modules/*/domain` rules
and `shared/types.ts` directly, where a PHP backend would need a parallel
reimplementation kept in sync by hand. The data-contract boundary (Section 5)
is framework-agnostic either way: *if* a backend is later introduced, it slots
in behind the same `modules/*/data` DTO shapes without a UI rewrite
(Strangler-Fig-friendly seam).

---

## 2. Technology Stack

Versions are pinned from `package.json` (the authoritative shipped state). The
PRD's prose mentions "Next.js 16"; the lockfile is the source of truth below.

| Layer | Technology | Version (pinned) | Role | Decision rationale |
| --- | --- | --- | --- | --- |
| Framework | Next.js | `16.2.6` | App Router, RSC, Route Handlers, middleware | Already the project shell; RSC enables server-side role scoping. |
| UI runtime | React | `19.2.4` | Component rendering, client islands | Required by Next 16. |
| Language | TypeScript | `^5` (strict) | Type-safe contracts across UI/DB | Maintainability NFR; shared DTO/domain types. |
| Styling | Tailwind CSS | `^4` (`@tailwindcss/postcss`) | Utility styling + design tokens | Design system already authored in `app/globals.css` + `app/design-system.css`. |
| Auth | `@clerk/nextjs` | `^7.4.1` | Sessions, sign-in/up UI, JWT issuance | Existing integration; ClerkProvider + proxy in place. |
| DB client | `@supabase/supabase-js` | `^2.108.2` | Typed Postgres queries from server | Direct DB access with generated types. |
| SSR cookies | `@supabase/ssr` | `^0.12.0` | Cookie/session helpers for SSR | Installed; current server client uses bearer-token pattern (see 3.2). |
| Icons | `@tabler/icons-react` | `^3.44.0` | Line icons (no emoji, per design rules) | Matches design-system iconography mandate. |
| Lint | ESLint + `eslint-config-next` | `^9` / `16.2.6` | Code quality gate | Standard. |
| Deploy (FE) | Vercel | n/a | Frontend hosting | Matches Next.js, zero-config. |
| Charts | (none installed) | — | Analytics visualization | Recharts referenced in PRD/comments but **not** in `package.json`. Current charts are hand-built (`shared/ui/Charts.tsx`, `modules/batches/ui/dashboard/*`). Treat a chart lib as a deferred decision. |

**Not in the MVP stack** (explicitly, per PRD Out-of-Scope): Resend (email),
Upstash Redis, MongoDB, OCR/AI, GitHub Actions cron, PWA, Express.js (or any
dedicated backend).

---

## 3. Authentication & Authorization Architecture

### 3.1 Identity model

Two stores, one binding:

- **Clerk** owns the session and the canonical `clerk_user_id`. It also carries a
  best-effort `user.publicMetadata.role` used for early UI hints.
- **`public.profiles`** owns the authoritative `role` and, through
  `public.profile_tenant_memberships`, the set of assigned schools ("tenant
  memberships"). The migration's membership table is canonical — **not** the
  legacy `tenant_ids` array described in older docs (per PRD conflict table).

A Clerk user must map to an **active** `profiles` row before any scoped data is
returned (PRD FR-01). The `modules/tenancy/domain/profile.ts` types (`Profile`,
`TenantMembership`, `ProfileRole`) model this binding on the application side.

### 3.2 Clerk → Supabase token bridge (implemented)

`lib/supabase/server.ts` is the implemented bridge:

1. `auth()` (Clerk) yields `getToken({ template: 'supabase' })`.
2. The Clerk-signed JWT is attached as `Authorization: Bearer <token>` on a
   `supabase-js` client created with the **anon** key (never the service role).
3. Inside Postgres, RLS helper functions read the JWT:
   `app_private.current_clerk_user_id()` resolves the user from
   `auth.jwt() ->> 'sub'` (with `clerk_user_id` / `app_metadata.clerk_user_id`
   fallbacks).

**Requirement:** a Clerk JWT template named exactly `supabase` must exist and
include the Clerk user id as `sub`. This is an environment/config dependency
(Section 14) and a top operational failure mode if misconfigured.

### 3.3 Authorization (RLS) — implemented helper functions

All authorization decisions are enforced in the database. Helper functions live
in the `app_private` schema (from the migration):

| Function | Purpose |
| --- | --- |
| `app_private.current_clerk_user_id()` | Extract Clerk `sub` from the JWT. |
| `app_private.current_profile_id()` | Resolve the active profile row for the caller. |
| `app_private.current_role()` | Resolve the caller's `profile_role`. |
| `app_private.can_access_tenant(tenant_id)` | True if caller has a membership for the school. |
| `app_private.can_manage_tenant(tenant_id)` | True for admin/coordinator writes within an assigned school. |
| `app_private.can_read_batch(batch_id)` | Admin/Coordinator/Viewer tenant reads + Trainer assigned-batch reads. |
| `app_private.can_trainer_write_batch(batch_id)` | Trainer writes limited to assigned batches. |

These compose into table policies, e.g. batches (`can_read_batch` /
`can_manage_tenant`), documents (manage by admin/coordinator, viewer read,
trainer submit/update own assigned-batch docs), and LAMR tables (manage by
admin/coordinator/assigned-trainer). This is the canonical enforcement layer;
the UI hides controls as a usability concern, **not** as the security boundary.

### 3.4 Tenant isolation model

- Every tenant-owned table carries `tenant_id`.
- No policy permits cross-tenant reads/writes; `can_access_tenant` gates every
  scoped query.
- Storage objects are isolated by a tenant-UUID path prefix (Section 9).
- **Success metric (PRD):** 100% of tenant-owned reads/writes scoped by tenant
  and role, verified by automated tests that hit real Supabase (Section 12).

### 3.5 Role enforcement pattern (defense in depth)

| Layer | What it does | Failure-safe behavior |
| --- | --- | --- |
| Clerk middleware/proxy | Blocks unauthenticated access; redirects to `/sign-in`. | No session → no app. |
| Server Component / Route Handler | Loads profile + memberships, scopes queries, omits restricted fields (e.g. trainer DTOs hide billing/NTP-lag/BSRS). | Unresolved role → **least privilege** (render read-only `viewer`, as `app/(dashboard)/dashboard/page.tsx` already does). |
| Supabase RLS | Final authority; denies any row the JWT may not see. | Wrong query still returns zero unauthorized rows. |

**Gap to close:** the authoritative tenant-role resolver (profile → role →
default tenant) is not yet wired into pages; the dashboard currently falls back
to `viewer` and accepts a `?role=` preview override (tracked as TES-34). Until
then, role resolution leans on `publicMetadata.role`, which is a hint, not the
security boundary.

---

## 4. Data Architecture

### 4.1 Confirmed implemented tables

From `supabase/migrations/20260528160300_create_tenant_scoped_schema.sql`
(canonical) and `docs/SUPABASE_SCHEMA_GUIDE.md`:

`tenants`, `profiles`, `profile_tenant_memberships`, `scholarship_programs`,
`program_document_requirements`, `program_billing_rules`, `batches`, `learners`,
`documents`, `lamr_reports`, `lamr_outcomes`, `lamr_activities`, `lamr_entries`,
`activity_log`, plus Storage bucket `compliance-evidence` (private, 50 MB limit,
tenant-folder RLS).

Key constraints worth encoding in code: `batches` unique `(tenant_id,
batch_code)`; `documents` FK to tenant/batch/requirement; LAMR entries unique
`(tenant_id, learner_id, activity_id)`.

### 4.2 Enum types (implemented)

| Enum | Values |
| --- | --- |
| `profile_role` | admin, coordinator, trainer, viewer |
| `lifecycle_stage` | aou, ntp, tip, training, assessment, billing, completed, blocked |
| `batch_status` | pending, ongoing, completed, blocked |
| `document_status` | missing, pending, submitted, verified |
| `document_audience` | admin, coordinator, trainer, viewer, all |
| `assessment_result` | competent, not_yet_competent, pending |
| `activity_action` | created, updated, uploaded, verified, submitted, deleted, system_note |

**Enum-mismatch note (real, in code):** the UI lifecycle adds an `entre`
(entrepreneurship) stage with no DB column, and the UI `batch.status` union has
no `blocked` member. `modules/batches/data/batches.ts` already documents the bridge:
`DB_TO_UI_STAGE` maps `training→train`, `assessment→assess`, `billing→bill`;
`entre` is UI-only; DB `blocked` is surfaced as UI `pending`. Any new contract
work must preserve this mapping in the mapper layer, not in components.

### 4.3 Missing tables that must be added or explicitly modeled

The API/ER diagrams reference tables the migration does not create. Per the PRD
conflict table, MVP must **either** add them **or** map to existing entities with
explicit acceptance criteria.

| Missing table | Needed by | Recommendation |
| --- | --- | --- |
| `attendance_records` | FR-07 trainer attendance/progress; trainer attendance route | **Add.** A daily attendance/progress fact per `(tenant_id, batch_id, learner_id, date)`, with progress + notes. Trainer-write RLS via `can_trainer_write_batch`. |
| `trainer_updates` | FR-07 trainer-side progress events | **Add or fold into `activity_log` + `attendance_records`.** Prefer modeling progress in `attendance_records` and narrative events in `activity_log` to avoid a thin table; add a dedicated table only if a distinct review workflow emerges. |
| `program_rqm` | Route map "RQM setup"; FR-14 | **Superseded by ADR-001.** RQM is an NTP *authorization* on the batch (one RQM = one batch), not program metadata. See §4.3a. |

### 4.3a Tables added by ADR-001 (billing & domain model)

The domain-modeling interview (`docs/adr/ADR-001-billing-and-domain-model.md`)
made these tables **required for first ship**, with the billing engine as the
driver. Each follows the same RLS/tenant-scoping discipline as existing tables.

| Table | Shape (key columns) | RLS |
| --- | --- | --- |
| `attendance_records` | `(tenant_id, batch_id, learner_id, attendance_date, time_in, time_out, present, marked_by, marked_at)`; unique `(tenant_id, batch_id, learner_id, attendance_date)` | read `can_read_batch`; write `can_trainer_write_batch` (+ admin/coordinator manage) |
| `program_modules` | `(program_id/qualification, module_title, module_order)` | read by program access |
| `batch_trainer_assignments` | `(tenant_id, batch_id, trainer_profile_id)` many-to-many | drives `can_trainer_write_batch` |
| `scholarship_cost_schedule` | `(program, qualification_code, training_hours, training_days, training_cost, assessment_fee, tsf_day_rate, new_normal, insurance_fee, entrepreneurship_fee)` — **no circular/effectivity cols** (snapshot lives on batch) | reference (read) |
| `billing_records` | versioned generation log: `(tenant_id, batch_id, billing_type, tranche, amount, scholar_snapshot jsonb, generated_by, generated_at, version)`; append-only | manage by admin/coordinator |
| `tenant_settings` | `(tenant_id, prepared_by, approved_by, letterhead_ref, addressee, partial_billing_enabled, threshold overrides…)` | manage by admin |
| `learner_identities` | `(uli, full_name)` — **future seam, unpopulated in MVP** | controlled/admin only |

**Batch new columns:** `rqm_code`, `ntp_number`, `approved_slots`,
`total_amount`, `indicative_start_date`, `ntp_approval_date`,
`ntp_received_date`, `schedule_pattern`, `total_sessions`, snapshotted cost
components, `entrepreneurship_delivered`.
**Learner new columns:** `uli` (permanent key, indexed),
`entrepreneurship_completed`.
**`lamr_reports`:** add `module_id` FK → `program_modules`; unique
`(tenant_id, batch_id, module_id)` (one LAMR per module per batch).

Note: `attendance_records` here replaces the generic version in §4.3 above with
the billing-aware `time_in`/`time_out` shape.

Secondary gaps (deferred, document only): `alerts_log` (notifications),
`batch_snapshots` (historical timeline), report/EGACE employment entities, and a
standardized soft-delete/retention policy. The UI already carries shapes for some
of these (`Snapshot`, `EgaceCounts`, `EmploymentFollowUp`, `AlertEntry` in
`shared/types.ts`) as forward-looking placeholders.

### 4.4 Relationship to TypeScript types

Two type families exist and must stay deliberately separate:

- **`lib/supabase/database.types.ts`** — generated from the live schema; the raw
  DB row shapes. Regenerate after every migration (Section 5.3).
- **`shared/types.ts`** — the UI **domain** types (`Batch`, `LifecycleStage`,
  `DocRecord`, `DashboardMetrics`, etc.). These are the contract between
  components and data, intentionally richer/friendlier than DB rows.

The mapper (`mapBatchRow` in `modules/batches/data/batches.ts`) is the only place DB rows
become domain objects. **Rule:** components import domain types; only `modules/*/data`
imports `database.types`. This keeps DB churn out of the UI (frontend
layered-architecture boundary).

---

## 5. API & Data Fetching Architecture

### 5.1 Current model: Server Components + typed Supabase queries

There are **no production API route handlers** yet (PRD-confirmed). The MVP
fetches data inside **Server Components** through the `modules/*/data` contract layer,
which the codebase has already templated in `modules/batches/data/batches.ts` as three
intentionally separated layers:

1. **fetch** — `getBatches()`: a typed `supabase.from('batches').select(...)`
   query. RLS scopes rows to the caller; "assigned batches" filtering happens in
   the database, not in JS.
2. **map** — `mapBatchRow()`: a pure, I/O-free DB-row → domain translation.
   Unit-testable against fixtures.
3. **derive** — lifecycle/days helpers computed from `current_stage` and dates.

This is the reference pattern every entity (documents, learners, LAMR,
activity) must follow.

### 5.2 Mutations

Mutations use **Route Handlers** (`app/api/...`) or **Server Actions**, each of
which must: verify the Clerk session, load profile + memberships, authorize by
role/tenant/batch, write an `activity_log` event, and return a friendly DTO.
Even though RLS is the backstop, server code must still authorize explicitly so
errors are friendly and audited (no raw SQL/Supabase errors to the UI — PRD
Frontend Requirements).

### 5.3 Type generation workflow

After any schema migration:

1. Apply the migration (Supabase).
2. Regenerate `lib/supabase/database.types.ts` from the live schema.
3. Update the affected mapper(s) in `modules/*/data` and any domain type in
   `shared/types.ts`.
4. Run unit tests on mappers + integration tests against Supabase.

### 5.4 DTO contract rules (stable boundary)

- Frontend receives **friendly DTOs**, never raw DB payloads (no `tenant_id`,
  internal UUIDs, storage paths, or table names surfaced to users).
- **Trainer DTOs must omit** billing deadline, BSRS, NTP lag, billing
  preparation, and financial fields (PRD FR-07 + route-map guard rules).
- Every screen with relative dates includes an exact `data as of` timestamp.

### 5.5 Future Express.js boundary (not built)

If Express.js is later introduced, it sits **above** Supabase/Postgres, enforces
the same tenant/role rules, and returns the **same DTO shapes** defined in
`shared/types.ts` — which it imports directly, being TypeScript. The
`modules/*/data` functions become thin API clients instead of direct Supabase
queries — the UI does not change. This is the designed seam; it must not be
implemented in the MVP.

---

## 6. Route Architecture

Route group `app/(dashboard)/` shares one shell (`layout.tsx`: Sidebar →
MobileHeader → Topbar → MetricsRow → content). `/` redirects to `/dashboard`.
Public routes are `/sign-in` and `/sign-up`.

> **Sign-up flow (TES-72):** sign-up is a **custom modal** (`modules/auth/ui/
> SignUpModal.tsx`) launched from the "No account? Sign up" link on the sign-in
> card, driven by Clerk's `useSignUp()` hook (email + email-code verify, or
> Google OAuth) — it replaces Clerk's prebuilt `<SignUp>` widget. `/sign-up` is
> now only a **redirect** to `/sign-in?sign_up=1` (opens the modal), kept as a
> catch-all so stale Clerk sub-paths don't 404. The email path deliberately does
> **not** activate a session on success (a registrar must assign school + role
> first — PRD FR-01), so it returns the user to sign in; Google OAuth returns via
> `/sign-in/sso-callback` and lands signed-in on `/dashboard`. See
> `diagrams/Sign-up Modal Sequence Diagram.mmd`.

> **ADR-001 reconciliation (K1):** the routes below are written in their *current*
> flat form. ADR-001 moves the admin/coordinator/viewer dashboard tree under a
> **`[tenant]` path segment** (`/{tenant}/dashboard`, `/{tenant}/batch-cards`, …);
> single-tenant users auto-redirect, and **trainer routes stay batch-addressed**
> (`/trainer/classes/[batchId]/...`, no tenant segment). Read each
> admin/coordinator/viewer route below as tenant-prefixed. See §16.

| Route | File | Auth | Role access | Status (verified) |
| --- | --- | --- | --- | --- |
| `/` → `/dashboard` | `app/page.tsx` | Public redirect | — | Implemented (redirect). |
| `/sign-in` | `app/sign-in/[[...sign-in]]/page.tsx` | Public | — | Implemented. |
| `/sign-up` | `app/sign-up/[[...sign-up]]/page.tsx` | Public | — | Redirects to `/sign-in?sign_up=1`; sign-up is the `SignUpModal` (TES-72). |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Clerk | Admin, Coordinator, Viewer (Trainer redirected to `/trainer`) | **Built on mock data.** Role-aware variants + loading/empty/denied/sync-failed/stale states exist; **not** wired to Supabase; role resolver incomplete (TES-34/TES-63). |
| `/batch-cards` | `app/(dashboard)/batch-cards/page.tsx` | Clerk | Admin, Coordinator, Viewer | Placeholder/partial (`modules/batches/ui/CardsView`). |
| `/table-view` | `app/(dashboard)/table-view/page.tsx` | Clerk | Admin, Coordinator, Viewer | Placeholder/partial (`TableView`). |
| `/documents` | `app/(dashboard)/documents/page.tsx` | Clerk | Admin, Coordinator, Viewer | Placeholder/partial (`DocumentsView`). |
| `/analytics` | `app/(dashboard)/analytics/page.tsx` | Clerk | Admin, Coordinator, Viewer | Placeholder. |
| `/activity-log` | `app/(dashboard)/activity-log/page.tsx` | Clerk | Admin, Coordinator | Placeholder (empty TODO data). |
| `/report` | `app/(dashboard)/report/page.tsx` | Clerk | Coordinator, Admin | Exists (`ReportView`); PRD flags Reports as schema/route-incomplete. Keep nav hidden until backed. |
| `/profile` | `app/(dashboard)/profile/page.tsx` | Clerk | All signed-in | Exists. |
| `/trainer` | `app/(dashboard)/trainer/page.tsx` | Clerk | Trainer only | Stub. |
| `/trainer/classes` | `app/(dashboard)/trainer/classes/page.tsx` | Clerk | Trainer only | Stub. |
| `/trainer/classes/[batchId]/attendance` | `.../attendance/page.tsx` | Clerk | Trainer, assigned batch only | Stub; **needs `attendance_records` schema**. |
| `/trainer/classes/[batchId]/documents` | `.../documents/page.tsx` | Clerk | Trainer, assigned batch only | Stub. |
| `/settings` (+ `/settings/programs`) | not created | Clerk | Admin (+ Coordinator if granted) | **Missing.** Modal-first acceptable for MVP. |
| `/batches/[batchId]/lamr` | not created | Clerk | Admin, Coordinator, assigned Trainer | **Missing.** Required by PRD; no Figma frame. |

Modal/drawer surfaces (Batch Detail, Notifications, Import CSV, Settings,
T2MIS/BSRS import) are **route states**, not standalone routes, for MVP. Deep
links use query params (e.g. `/batch-cards?batchId=:id`).

**Status reconciliation with the audit:** the audit listed `/dashboard` as a
missing P0 route. It now exists as a mock-backed, role-aware page. The *remaining*
P0 work is wiring real Supabase data, completing the role resolver, and the
non-Coordinator role variants — not creating the file. The Implementation Plan
Phase 1 reflects this.

---

## 7. Component Architecture

### 7.1 Layering

```text
app/(dashboard)/<route>/page.tsx     ← Server Component: fetch (modules/*/data) + compose
   └─ modules/<domain>/ui/*          ← domain screens/views (CardsView, TableView, DocumentsView, ...)
        └─ shared/ui/*               ← design-system primitives (props-only, Server-safe)
        └─ modules/batches/ui/dashboard/*    ← dashboard widgets (charts, panels)
   └─ modules/shell/ui/*             ← AppShell: Sidebar, Topbar, MetricsRow, MobileHeader
```

Import direction is ESLint-enforced (`import/no-restricted-paths` in
`eslint.config.mjs`): `app → modules → shared → lib/supabase`; another
module's `data/` folder is private (its public surface is `domain/` + `ui/`);
no index barrels — deep imports are the convention.

Existing primitives to reuse (do not re-create): `Icon`, `MetricCard`,
`StatusBadge`, `UrgencyIndicator`, `ProgressBar`, `LifecyclePipeline`,
`BatchCard`, `BatchModal`, `EmptyState`, `InfoCallout`, `Toast`,
`FilePreviewModal`, `TrainingDayPills`, `TrainerAvatar`, `Charts`. Dashboard
widgets: `EgaceOutcomes`, `DocumentStatusDonut`, `ProgressTrend`,
`BatchTimeline`, `AlertsPanel`. Shell: `Sidebar`, `Topbar`, `MetricsRow`,
`MobileHeader`, `NavDrawerProvider`, `AuthHeader`.

### 7.2 Server vs client islands

- Default to **Server Components** (data + role scoping server-side).
- Client islands only for interactivity: `Sidebar` (reads pathname),
  `NavDrawerProvider`, modals/drawers, upload progress, unsaved forms.
- Never pass secrets or internal IDs into client props.

### 7.3 Role-specific layout shells

Avoid duplicating screens per role. Use **one shared layout** with role-scoped
data and conditional controls (the dashboard's `ROLE_COPY` map + `role-tag`
pattern is the template). Trainer uses a focused shell (mobile-first, no
compliance-heavy nav). Nav visibility per role follows the route-map "Default
Navigation" rules.

### 7.4 Mandatory states per data surface

Every data screen must implement, per PRD Section 6 common requirements: loading,
empty, no-results, error/sync-failed, permission-denied, stale-data, success, and
long-text. The dashboard page is the worked reference (it renders empty, denied,
sync-failed, and stale variants today). `loading.tsx` provides the route-level
skeleton; `EmptyState` and `InfoCallout` are the shared primitives.

---

## 8. State Management

| State kind | Mechanism | Examples |
| --- | --- | --- |
| Server state | RSC + `modules/*/data` (fetch at render) | Batches, documents, metrics, activity. No React Query in MVP; add only if client-side refetch/caching becomes necessary. |
| URL state | Search params (shareable, SSR-readable) | Filters, search, sort, tenant selection, tab, `?batchId=`, dashboard `?role=`/`?state=` previews. |
| Client state | Local component state (`useState`/context) | Modal/drawer open, upload progress, unsaved form rows, selected rows. `NavDrawerProvider` is the one shared client context. |

Rules: prefer URL state for anything shareable or deep-linkable; never store
internal DB identifiers in user-visible client state; invalidate/refetch after
mutations (re-render the Server Component path or revalidate).

---

## 9. File Upload Architecture

- **Store:** private Supabase Storage bucket `compliance-evidence` (created by
  the migration; `public=false`, `file_size_limit=52428800` = 50 MB).
- **Path convention:** object key **must begin with the tenant UUID**
  (`<tenant_uuid>/<batch>/<document_key>/<filename>`) to satisfy the
  tenant-folder Storage RLS policies. Build this path **server-side**; never let
  the client choose the prefix.
- **Access:** files are served via scoped authorization or signed URLs, never by
  exposing raw storage paths. The UI calls them "evidence" / "source file".
- **Accepted evidence:** uploaded file **or** external URL (`documents.storage_path`
  vs `documents.external_url`). Document status flow: missing → pending →
  submitted → verified (verify requires Admin/Coordinator).
- **Validation:** enforce type + size (≤50 MB), and audience (trainers only
  attach trainer-audience docs on assigned batches). On success, set status
  `submitted` and write an `activity_log` (`uploaded`) event.
- **Cross-tenant test (security):** Storage policies must block reading another
  tenant's object even with a guessed path (Section 12 security tests).
- Existing UI surfaces: `FilePreviewModal` (preview), trainer document routes
  (upload). A server-side path builder + signed-URL helper still need to be
  implemented in `lib/`.

---

## 10. Security Requirements

| Area | Requirement |
| --- | --- |
| RLS | All tenant-owned tables RLS-enabled; cross-tenant reads/writes denied by `app_private.*` helpers. Viewer writes always denied; trainer writes limited to assigned batches/audience. |
| Token handling | Service role key **never** in browser code or client bundle. Server uses anon key + Clerk bearer JWT (`lib/supabase/server.ts`). |
| Clerk JWT validation | RLS reads `auth.jwt() ->> 'sub'`; the `supabase` JWT template must be present and correct. Treat a missing/invalid template as a hard failure (no data, not silent empty). |
| Field-level exposure | Trainer DTOs omit billing/financial/NTP-lag/BSRS fields server-side, not just hidden in CSS. |
| Input validation | Validate all inputs server-side (file type/size, CSV headers/rows, date ranges, enums). Import must not inject unauthorized tenants. |
| Error hygiene | Never return raw Supabase/SQL errors, table names, stack traces, or internal IDs to the UI. Map to friendly operational messages. |
| XSS | React escaping by default; avoid `dangerouslySetInnerHTML`. Sanitize any rendered user-supplied URL/notes; validate external evidence URLs. |
| CORS | MVP is same-origin (Next serves UI + handlers). If Route Handlers are exposed cross-origin later, restrict allowed origins explicitly. Supabase project keys stay server-side. |
| Audit | Every mutation writes `activity_log`; security denials logged server-side without leaking sensitive detail. |
| PII | Learner PII (`learners`, ULI, contact) visible only to authorized roles within the tenant. |

---

## 11. Performance Requirements

| Target | Value (from PRD NFRs) |
| --- | --- |
| Initial dashboard response | < 2 s on typical broadband at MVP scale. |
| Local UI interaction | < 300 ms. |
| Single-record mutation | < 1 s (excluding file upload time). |
| CSV import preview | < 5 s at MVP scale. |

Engineering approach:

- **Pagination / server-filtering** for tables once rows exceed comfortable
  client rendering; move search/filter server-side as data grows.
- **RSC streaming** + `loading.tsx` skeletons for perceived performance.
- **Lazy-load** heavy client islands (modals, charts) and below-the-fold panels.
- Add recommended composite indexes from the PRD as data grows:
  `batches(tenant_id, current_stage, status)`,
  `batches(tenant_id, start_date, end_date)`,
  `documents(tenant_id, status, document_key)`,
  `activity_log(tenant_id, batch_id, created_at desc)`.
- Centralize date/progress math (single utility, fixed `as-of` input) to avoid
  recomputation drift and enable caching.

---

## 12. Testing Requirements

| Level | Scope | Notes |
| --- | --- | --- |
| Unit | Pure mappers + derive helpers (`mapBatchRow`, lifecycle/days), date/progress/urgency engine, billing-threshold logic (module `domain/` layers). | Use fixed `as-of` dates; no I/O. The mapper split exists specifically to make this trivial. |
| Integration | Data contracts against **real Supabase** (no mocks) — RLS scoping, tenant isolation, trainer field omission, document/LAMR writes + activity logging. | PRD mandates real-Supabase integration tests. Use seeded tenants (AKB/J3ED/NEN) and per-role JWTs. |
| E2E | Role journeys: unauthenticated redirect, Admin cross-tenant denial, Trainer unassigned-batch denial, Viewer write-blocked, upload → submitted, modal focus-trap. | Maps to PRD test matrix T-001..T-030. |

Required security tests: cross-tenant read/write denial, trainer cannot read
admin/coordinator-only document audiences, viewer cannot mutate, Storage
cross-tenant file block, service-role-key absent from browser bundle, raw DB
errors never surfaced.

**No test runner is currently configured** (`package.json` test script is a
placeholder). Standing up the harness is Phase 0 work (Implementation Plan).

---

## 13. Accessibility Requirements

Target: **WCAG 2.2 AA** (PRD success metric + `docs/UI_UX_MODAL_AUDIT.md`).

- Keyboard operation for all controls and overlays.
- Modals/drawers: dialog semantics, focus trap, inert background, Escape close
  (non-destructive), scroll containment, focus return to opener.
- Status conveyed by **text + icon**, never color alone (semantic tokens only;
  no emoji per design rules).
- Semantic tables for table/document-matrix views; sortable-header announcements.
- Progress bars expose accessible labels + ARIA values.
- Async status + toasts use live regions; forms validate inline and move focus to
  the first error.
- Icon-only controls require accessible names (e.g. notifications bell includes
  unread count).
- 44px touch targets on mobile; respect reduced-motion.
- Contrast: do not use muted 9–11px text for operationally critical data.

---

## 14. Deployment Architecture

```text
Vercel (Next.js 16)  ──HTTPS──▶  Supabase (hosted Postgres + Storage)
        │
        └── Clerk (hosted auth, JWT template "supabase")
```

- **Frontend:** Vercel, zero-config Next.js build.
- **Database/Storage:** Supabase hosted project; schema applied via the migration
  in `supabase/migrations/`. New migrations are additive and reviewed.
- **Identity:** Clerk hosted; requires a JWT template named `supabase`.

### Environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | server + client | Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | server client (`lib/supabase/server.ts`) | Anon key only on the server path here. |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only admin tasks (if needed) | **Never** referenced in client code/bundle. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk provider | — |
| `CLERK_SECRET_KEY` | Clerk server | — |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `..._SIGN_UP_URL` / after-auth URLs | Clerk routing | Align with `/sign-in`, `/sign-up`, `/dashboard`. |
| `NEXT_PUBLIC_REQUIRE_INVITE_CODE` | `SignUpModal` (TES-72) | Optional; `'true'` shows the required invite-code field (stored as Clerk `unsafeMetadata`). Default off. |

Operational monitoring (production): auth failures, RLS denials, import/upload
failures, API latency, error rates. Backups: daily Supabase DB backups once real
data exists; define evidence-file retention/recovery before importing real data.

---

## 15. Open Engineering Risks (cross-reference)

These mirror the PRD risk register, framed as engineering work:

1. **Dashboard on mock data** — real Supabase wiring + role resolver outstanding
   (Phase 1). High.
2. **No API/test harness** — contracts and tests must precede broad UI work
   (Phase 0). High.
3. **Schema gaps** — `attendance_records` (and RQM modeling) block trainer
   attendance (Phase 0/3). High.
4. **Storage path discipline** — server-side tenant-prefixed path builder + signed
   URLs not yet implemented. High.
5. **Enum drift** — UI `entre`/`blocked` mapping must stay in the mapper layer.
   Medium.
6. **Retention policy** — cascade deletes exist; no soft-delete standard. Define
   before real evidence lands. Medium.

---

## 16. Billing Engine Architecture (ADR-001)

The billing engine is **pure domain logic over snapshotted data** — no external
calls, deterministic, unit-testable. It lives in `modules/billing/domain/*`
(eligibility, tranche schedules, amount math) and `modules/billing/data/billing.ts`
(fetch/persist `billing_records`).

- **Inputs are all snapshots:** `total_sessions`, cost components, and RQM
  `approved_slots` are frozen on the batch at creation (no live re-derivation
  from the program/circular). Attendance is the only live input.
- **Eligibility & tranche math** (rules 5.1.x / 7.2.x) are TESDA-fixed constants
  encoded in domain logic; settings only toggle partial billing and override
  thresholds (COALESCE tenant → program). See ADR-001 §4.
- **Document generation (V2/W1):** populate the school-provided `.docx` template
  with merge tokens server-side (signatories/header/addressee from
  `tenant_settings`; amounts from the batch snapshot; scholar list alphabetized +
  numbered; total in words). A docx-templating helper belongs in `lib/billing/`.
- **`billing_records`** is a versioned, append-only generation log — never a
  ledger. No over-billing guard (TESDA PO reconciles). Re-generation after an
  attendance correction appends a new version.
- **Alerts are computed on read** (ADR-001 JJ1): billing-readiness, NTP-lag, and
  missing-tranche-docs are derived from batch state at render time (no cron, no
  `alerts_log`), surfaced in an in-app drawer + badges, role/tenant-scoped
  (trainers never see billing/NTP alerts).

**Tenancy routing reconciliation (ADR-001 K1):** the selected school moves to a
**URL path segment** (`/{tenant}/dashboard`) for the admin/coordinator/viewer
tree; single-tenant users auto-redirect; trainer routes stay batch-addressed
(`/trainer/classes/[batchId]/...`). This supersedes the search-param tenant
selection noted in §8 for the dashboard tree. Membership stays plural
(`profile_tenant_memberships`, the RLS basis); active context is the single path
segment. One context = one tenant (no cross-school aggregate view).

## Revision History

| Version | Date | Author | Summary |
| --- | --- | --- | --- |
| 1.0.0 | 2026-06-30 | System Architecture | Initial TRD grounded in MASTER_PRD_SRS, migration, route map, and verified current code. |
| 1.1.0 | 2026-06-30 | Product + Architecture | Added §4.3a (ADR-001 tables) and §16 (billing engine, tenancy path routing); reconciled RQM as batch authorization. |

## Related

- [[MASTER_PRD_SRS]] — product source of truth this TRD implements
- [[ADR-001-billing-and-domain-model]] — supersedes conflicting billing wording
- [[IMPLEMENTATION_PLAN]] — phased execution of this TRD
- [[SUPABASE_SCHEMA_GUIDE]] — canonical schema this document references
- [[TVI-CAMS Knowledge Base]]
