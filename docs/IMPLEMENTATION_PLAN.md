# TVI-CAMS Implementation Plan

Version: 1.0.0
Date: 2026-06-30
Status: Actionable plan for engineering
Companion docs: `docs/TRD.md` (engineering decisions), `docs/MASTER_PRD_SRS.md`
(product source of truth)

## How to read this plan

This is a **phased, dependency-ordered** plan, not an epic list. Phases are
sequential where a downstream phase depends on an upstream one; items within a
phase may parallelize. Each item lists: **Build**, **Files**, **Depends on**,
**Acceptance criteria** (tied to PRD success metrics / FR acceptance criteria),
and an **Effort** tag.

Effort tags: **S** ≈ ≤0.5 day · **M** ≈ 1–2 days · **L** ≈ 3–5 days · **XL** ≈
1–2 weeks.

### Guiding constraints (from PRD + TRD)

- MVP stack is **Next.js + Clerk + Supabase**. Express.js is future-only; do not
  build it.
- RLS is the security boundary; UI hiding is usability only.
- Integration tests hit **real Supabase** (no mocks).
- No emoji; IBM Plex fonts; semantic color tokens only (design rules).
- Trainer responses omit billing/financial/NTP-lag/BSRS fields.

### Reality check vs. the audit

The audit named `/dashboard` the #1 P0 gap. Since then the route file exists as a
**mock-backed, role-aware** page with full state coverage. So Phase 1 is about
**wiring real data + completing role resolution + the remaining role variants**,
not creating the route. Phase 0 must land first because the data contracts the
dashboard needs are still stubbed.

---

## Phase 0 — Foundation Hardening (blocks all feature work)

**Goal:** make real data, types, and tests possible. Nothing in Phases 1–5 is
trustworthy until this is done.

### 0.1 Add ADR-001 schema (attendance, RQM authorization, billing, modules)

> Scope expanded by `docs/adr/ADR-001-billing-and-domain-model.md`. The billing
> engine drives most of these tables; see ADR §11 for the full list.

- **Build:** Additive migration(s) creating:
  - `attendance_records` — per-learner attendance with **`time_in`/`time_out`**
    (billing-aware), `present`, `marked_by`, `marked_at`. Unique
    `(tenant_id, batch_id, learner_id, attendance_date)`.
  - `program_modules` — fixed module list per program/qualification
    (`module_title`, `module_order`); `lamr_reports.module_id` FK + unique
    `(tenant_id, batch_id, module_id)`.
  - `batch_trainer_assignments` — many-to-many trainer↔batch.
  - `scholarship_cost_schedule` — seeded TESDA rates by program + qualification
    (no circular/effectivity cols).
  - `billing_records` — versioned generation log (append-only).
  - `tenant_settings` — signatories, letterhead, addressee, threshold overrides.
  - `learner_identities` — **empty future seam** (create, do not populate).
  - **Batch columns:** RQM/NTP (`rqm_code`, `ntp_number`, `approved_slots`,
    `total_amount`, NTP dates), `schedule_pattern`, `total_sessions`, snapshotted
    cost components, `entrepreneurship_delivered`.
  - **Learner columns:** `uli` (indexed), `entrepreneurship_completed`.
- **RLS:** `attendance_records` read via `can_read_batch`, write via
  `can_trainer_write_batch` (+ admin/coordinator manage); `billing_records` /
  `tenant_settings` manage by admin/coordinator; cost schedule read-only.
- **Files:** `supabase/migrations/<timestamp>_add_adr001_billing_domain.sql`;
  a seed for `scholarship_cost_schedule` (TWSP + CFSP agriculture rows from
  Circular 015 s.2026).
- **Depends on:** existing `20260528160300_create_tenant_scoped_schema.sql`.
- **Acceptance:**
  - Migration applies cleanly on fresh + current seeded DB.
  - RLS denies a trainer writing attendance for an unassigned batch (0.4 tests).
  - No cross-tenant attendance/billing read possible.
  - Cost schedule seeded; a batch can snapshot a matching cost row.
- **Effort:** L (was M — billing tables added)

### 0.2 Regenerate TypeScript DB types

- **Build:** Regenerate `lib/supabase/database.types.ts` from the live schema so
  new tables/columns are typed; document the regenerate step in the repo.
- **Files:** `lib/supabase/database.types.ts` (regenerated); short note in
  `docs/` or `package.json` script.
- **Depends on:** 0.1.
- **Acceptance:** `attendance_records` (and any RQM columns) appear in
  `Database['public']['Tables']`; `tsc` passes.
- **Effort:** S

### 0.3 Complete data-contract stubs in module `data/` layers

- **Build:** Finish the fetch→map→derive contracts following the
  `modules/batches/data/batches.ts` reference. Close its marked gaps: `TODO(join)` documents
  map, `TODO(contract)` billing-deadline field, lifecycle history. Add sibling
  contracts: `documents.ts`, `learners.ts`, `lamr.ts`, `activity.ts`,
  `attendance.ts`, `metrics.ts` (real version of `getMockMetrics`).
- **Files:** `modules/batches/data/batches.ts` (complete), `modules/documents/data/documents.ts`,
  `modules/batches/data/learners.ts`, `modules/lamr/data/lamr.ts`, `modules/activity/data/activity.ts`,
  `modules/attendance/data/attendance.ts`, `modules/batches/data/metrics.ts`; keep `shared/types.ts` as the
  domain contract.
- **Depends on:** 0.2.
- **Acceptance:**
  - Each contract returns domain types from `shared/types.ts`, never raw rows.
  - Mappers are pure and unit-tested (0.4).
  - Trainer-facing contracts omit billing/financial/NTP-lag/BSRS fields.
  - DB `blocked`→UI `pending` and `entre` UI-only mapping preserved in mappers.
- **Effort:** L

### 0.4 Stand up the test harness (unit + real-Supabase integration)

- **Build:** Configure a test runner (replace the placeholder `test` script).
  Add unit tests for mappers/date-urgency/billing logic and an integration setup
  that authenticates per-role JWTs against a seeded Supabase (test project or
  branch).
- **Files:** test config (e.g. `vitest.config.ts`), `package.json` `test`
  script, `tests/unit/*`, `tests/integration/*`, seed/fixtures.
- **Depends on:** 0.3.
- **Acceptance:**
  - Unit: urgency tiers (6d→Critical, 7–21d→Warning, >21d→On Track) pass with a
    fixed as-of date (PRD T-010/T-011).
  - Integration: cross-tenant read denied (T-003); trainer unassigned-batch
    denied (T-005); viewer write denied (T-004) — all against real Supabase.
- **Effort:** L

### 0.5 Tenant-role resolver + Supabase path/signed-URL helpers

- **Build:** Implement the authoritative resolver (Clerk user → active profile →
  role → default/selected tenant) that the dashboard's `?role=` fallback
  currently stands in for (TES-34). Add a server-side Storage path builder
  (tenant-UUID prefixed) and signed-URL helper (TRD §9).
- **Files:** `modules/tenancy/domain/profile.ts` (extend; add a `getCurrentProfile()` /
  `resolveActiveTenant()`), `modules/documents/data/storage.ts` (new).
- **Depends on:** 0.3.
- **Acceptance:**
  - A signed-in user with a profile resolves role + tenant **without** a `?role=`
    query param.
  - Unresolved profile → least-privilege `viewer` and a setup/permission state
    (PRD FR-01).
  - Path builder always prefixes the tenant UUID; cross-tenant signed-URL access
    is rejected (security test).
- **Effort:** M

**Phase 0 exit gate:** real data contracts compile and pass unit + integration
tests; role/tenant resolves from the session; attendance schema exists. Only then
proceed.

---

## Phase 1 — P0 Route: `/dashboard` (audit #1 gap)

**Goal:** turn the mock-backed dashboard into a real, role-correct, Supabase-wired
landing page across all four role variants.

### 1.1 Wire dashboard to live Supabase data

- **Build:** Replace `MOCK_BATCHES` / `getMockMetrics` / `MOCK_ACTIVITY` in the
  dashboard with `getBatches()` / `getMetrics()` / `getActivity()` from
  `modules/*/data`. Drive the `sync-failed` state from a real caught error (not
  `?state=`), and `stale` from a real as-of signal.
- **Files:** `app/(dashboard)/dashboard/page.tsx`,
  `app/(dashboard)/dashboard/loading.tsx`, `modules/batches/data/metrics.ts`,
  `modules/activity/data/activity.ts`.
- **Depends on:** Phase 0 (0.3, 0.4, 0.5).
- **Acceptance:**
  - Dashboard renders only the caller's tenant-scoped batches (RLS-verified).
  - `Data as of` reflects a real timestamp; relative labels are computed (PRD
    FR-03/FR-05, success metric "zero hand-typed relative deadlines").
  - Supabase error → sync-failed banner with retry; empty set → empty state with
    next action (T-006); no batches leak across tenants.
- **Effort:** L

### 1.2 Complete role-specific dashboard variants (Admin, Coordinator, Trainer, Viewer)

- **Build:** Keep the single shared page with role-scoped data + controls
  (extend existing `ROLE_COPY`). Ensure Trainer is redirected to `/trainer`
  (already), Viewer is read-only (write controls hidden + server-denied), Admin
  surfaces school-oversight controls, Coordinator gets the full workflow. Use the
  resolver from 0.5 instead of `?role=`.
- **Files:** `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/trainer/page.tsx`
  (Trainer landing parity), `modules/shell/ui/Sidebar.tsx` (role-based nav
  visibility).
- **Depends on:** 1.1, 0.5.
- **Acceptance:**
  - Each role sees its correct metrics/controls; Viewer sees no write affordances
    and is server-denied on attempt (T-004, PRD permission matrix).
  - Billing-preparation signal visible to Admin/Coordinator only, hidden from
    Trainer (T-020/T-021).
  - Nav matches route-map "Default Navigation" per role.
- **Effort:** M

### 1.3 Loading / empty / error states per Figma (finalize)

- **Build:** Confirm all states match Figma nodes (Coordinator 522:2367, Admin
  382:3, Viewer 394:723) and remove the `?state=` demo overrides once real
  signals exist. Keep states: loading, empty, sync-failed, stale, permission
  denied.
- **Files:** `app/(dashboard)/dashboard/page.tsx`, `shared/ui/EmptyState.tsx`,
  `shared/ui/InfoCallout.tsx`.
- **Depends on:** 1.1, 1.2.
- **Acceptance:** Each state reachable from real conditions; stale shows exact
  timestamp (T-007); WCAG AA on banners/skeletons.
- **Effort:** S

### 1.4 Dashboard acceptance tied to PRD success metrics

- **Build:** E2E + integration coverage for the dashboard.
- **Files:** `tests/e2e/dashboard.spec.ts`, `tests/integration/dashboard.test.ts`.
- **Depends on:** 1.1–1.3.
- **Acceptance:**
  - Tenant isolation: 100% scoped reads in tests (PRD metric).
  - Missing-document visibility within 30 s: critical-missing banner + counts
    render from real data.
  - Unauthenticated → `/sign-in` redirect (T-001).
- **Effort:** M

**Phase 1 exit gate:** `/dashboard` serves real, role-correct, tenant-scoped data
with full states and passing tests. The audit's P0 gap is closed.

---

## Phase 2 — Batch Lifecycle & Document Tracking

**Goal:** the core compliance loop — open a batch, see its lifecycle and required
documents, attach/verify evidence, move status.

### 2.1 Batch detail drawer/modal (real data)

- **Build:** Wire `BatchModal`/Batch Detail drawer to `getBatch(batchId)` with
  deep-link `/batch-cards?batchId=:id`. Dialog semantics, focus trap, focus
  return.
- **Files:** `modules/batches/ui/BatchModal.tsx`, `modules/batches/ui/CardsView.tsx`,
  `app/(dashboard)/batch-cards/page.tsx`, `modules/batches/data/batches.ts`
  (`getBatch`).
- **Depends on:** Phase 1.
- **Acceptance:** Modal opens from card (Enter/Space), shows lifecycle + docs +
  scholars; Escape closes; focus returns to opener (PRD modal AC, T-028 pattern);
  role-scoped write controls.
- **Effort:** M

### 2.2 Document checklist + matrix with upload

- **Build:** Real document matrix from `program_document_requirements` ×
  `documents`; exact missing-document names + blocker strip; upload/link via the
  Storage path builder (0.5); status transitions missing→pending→submitted→
  verified.
- **Files:** `modules/documents/ui/DocumentsView.tsx`,
  `app/(dashboard)/documents/page.tsx`, `modules/documents/data/documents.ts`,
  `modules/documents/data/storage.ts`, `shared/ui/FilePreviewModal.tsx`.
- **Depends on:** 0.5, 2.1.
- **Acceptance:** Missing docs named (T-013); valid upload → `submitted` +
  `activity_log` event (T-014); oversized/invalid upload blocked inline (T-015);
  verify requires Admin/Coordinator; Viewer controls hidden + server-denied.
- **Effort:** L

### 2.3 LAMR evidence UI

- **Build:** Structured LAMR (header + outcomes + activities + learner entries) on
  `/batches/[batchId]/lamr`; link source file. Uniqueness on learner/activity.
- **Files:** `app/(dashboard)/batches/[batchId]/lamr/page.tsx` (new),
  `modules/lamr/data/lamr.ts`, LAMR components (new under `modules/lamr/ui/` or
  `components/lamr/`).
- **Depends on:** 0.3, 2.2.
- **Acceptance:** Create LAMR persists header + entries (T-018); duplicate
  learner/activity rejected (T-019); source upload linked to the structured
  record; role-scoped writes (admin/coordinator/assigned trainer).
- **Effort:** L

### 2.4 Lifecycle status transitions + validation

- **Build:** Lifecycle stage updates with audit logging and impossible-state
  validation (e.g. Billing-ready before Assessment).
- **Files:** `modules/batches/data/batches.ts` (mutation/Server Action),
  `modules/batches/ui/LifecyclePipeline.tsx`, batch detail surfaces.
- **Depends on:** 2.1.
- **Acceptance:** Stage change logs activity (T-008); impossible state flagged
  (T-009); Viewer sees lifecycle but cannot edit; mapper keeps `entre`/`blocked`
  bridge intact.
- **Effort:** M

**Phase 2 exit gate:** a coordinator can open a batch, see/resolve missing
documents, manage LAMR, and advance lifecycle — all audited and tenant-scoped.

---

## Phase 3 — Trainer Views

**Goal:** focused, mobile-first trainer workflow with no compliance/financial
exposure.

### 3.1 Trainer dashboard + assigned-class view

- **Build:** Real `/trainer` and `/trainer/classes` from trainer-scoped contracts
  (assigned batches only); class cards + roster preview.
- **Files:** `app/(dashboard)/trainer/page.tsx`,
  `app/(dashboard)/trainer/classes/page.tsx`, `modules/batches/data/batches.ts` (trainer
  scope), `modules/batches/data/learners.ts`.
- **Depends on:** Phase 0, Phase 1.
- **Acceptance:** Only assigned batches appear (T-016); direct URL to an
  unassigned batch is permission-denied (T-005); DTO omits billing/NTP-lag/BSRS.
- **Effort:** M

### 3.2 Attendance / progress update

- **Build:** Attendance/progress form on
  `/trainer/classes/[batchId]/attendance` writing to `attendance_records`;
  date-within-schedule + duplicate-day handling.
- **Files:** `app/(dashboard)/trainer/classes/[batchId]/attendance/page.tsx`,
  `modules/attendance/data/attendance.ts`, roster components.
- **Depends on:** 0.1, 3.1.
- **Acceptance:** Valid attendance saved + logged; duplicate date → warning/merge
  (T-017); progress ≤100%; trainer-write RLS enforced; live save status (a11y).
- **Effort:** L

### 3.3 Trainer evidence upload

- **Build:** Trainer-audience document upload on
  `/trainer/classes/[batchId]/documents` via the shared Storage helper.
- **Files:** `app/(dashboard)/trainer/classes/[batchId]/documents/page.tsx`,
  `modules/documents/data/documents.ts`, `modules/documents/data/storage.ts`.
- **Depends on:** 0.5, 2.2, 3.1.
- **Acceptance:** Upload restricted to assigned batch + trainer audience; success
  → `submitted` + activity event; type/size validated; mobile 44px targets +
  keyboard file picker.
- **Effort:** M

**Phase 3 exit gate:** a trainer completes a daily class update (attendance +
evidence) in under 2 minutes (PRD metric), seeing no billing/financial data.

---

## Phase 4 — Admin & Coordinator Features

**Goal:** operational tooling around the core loop.

### 4.1 CSV import (validate → preview → commit) + export

- **Build:** Import modal with file-type/header/row validation, duplicate-batch
  handling, tenant-scoped commit; filtered export.
- **Files:** import modal under `modules/import-export/ui/`,
  `app/api/import/batches/route.ts` (Route Handler), `app/api/export/batches/route.ts`,
  `modules/import-export/data/import.ts`, `modules/import-export/data/export.ts`.
- **Depends on:** Phase 2.
- **Acceptance:** Wrong type → inline error (T-022); duplicate batch IDs blocked
  until resolved (T-023); confirmed import scoped to selected tenant + activity
  logged (T-024); export respects role/tenant filters.
- **Effort:** L

### 4.2 Notifications drawer

- **Build:** In-app notifications drawer (activity/blocker-derived for MVP; no
  email). Accessible drawer with unread count.
- **Files:** `modules/shell/ui/*` (drawer + bell), `modules/notifications/data/notifications.ts`
  (activity-backed), optional `app/api/notifications/route.ts`.
- **Depends on:** Phase 1; reuses `activity_log`.
- **Acceptance:** Drawer focus-trapped, background inert, Escape closes (T-028);
  bell accessible name includes unread count; scoped to role/tenant.
- **Effort:** M

### 4.3 Settings modal (roles/members/program rules)

- **Build:** Tenant settings modal (or `/settings`): role matrix, members,
  deadline/program rules, billing threshold. Confirmation/undo on role changes.
- **Files:** `app/(dashboard)/settings/page.tsx` (or modal),
  `app/api/settings/members/route.ts`, `app/api/settings/programs/route.ts`,
  `modules/settings/data/settings.ts`.
- **Depends on:** 0.5, Phase 2.
- **Acceptance:** Check/cross icons have text equivalents (T-029); role change
  requires confirm/undo + activity log; requirement edits recalc document
  readiness; Admin-scoped.
- **Effort:** L

### 4.4 T2MIS / BSRS import overlay

- **Build:** Specialized import overlay with source-specific column mapping +
  preview, reusing the 4.1 pipeline.
- **Files:** import overlay component, `modules/import-export/data/import.ts` (mapping profiles).
- **Depends on:** 4.1.
- **Acceptance:** T2MIS/BSRS columns mapped + validated; tenant check enforced;
  preview before commit; clear "internal working copy, not official" framing.
- **Effort:** M

**Phase 4 exit gate:** Admin/Coordinator can import/export, manage settings, and
receive in-app notifications, all audited and tenant-scoped.

---

## Phase 4B — Billing Engine (ADR-001)

**Goal:** generate the official TVI-billed TESDA billing documents from
attendance-derived eligibility, per the regulator's tranche rules. Depends on
attendance (Phase 3.2) and the document checklist (Phase 2.2). Full rules:
`docs/adr/ADR-001-billing-and-domain-model.md`.

### 4B.1 Billing domain logic (pure, unit-tested)

- **Build:** `modules/billing/domain/*` — eligibility (`absences ≥ 5` → ineligible),
  TSF tranche schedules (7.2.2 <2mo 50/50; 7.2.3 ≥2mo 20/40/40; absence deduction
  `absences × ₱160` on the final tranche, both schedules), Training Cost schedule
  (5.1.x, 60-training-day boundary), entrepreneurship (₱800 × non-flagged
  scholars), amount-in-words.
- **Files:** `modules/billing/domain/eligibility.ts`, `.../tranches.ts`,
  `.../amounts.ts`, fixtures + unit tests.
- **Depends on:** 0.1 (snapshots), 3.2 (attendance).
- **Acceptance:** Worked CFSP example reproduces ₱137,000 exactly (12×₱8,200 +
  5×₱7,720); tranche %s and absence netting verified with fixed as-of dates;
  duration boundary selects the right schedule.
- **Effort:** L

### 4B.2 Cost-schedule snapshot + RQM authorization on batch creation

- **Build:** Wire the import/enrich step (S1) to match `scholarship_cost_schedule`
  by program+qualification, snapshot the cost row + `total_sessions` onto the
  batch, and capture the RQM/NTP authorization (one RQM = one batch;
  `approved_slots` as billable cap).
- **Files:** `modules/batches/data/batches.ts`, import wizard, `modules/billing/data/cost-schedule.ts`.
- **Depends on:** 0.1, 4.1 (import).
- **Acceptance:** New batch carries frozen rates immune to later schedule edits;
  billing cannot exceed `approved_slots`.
- **Effort:** M

### 4B.3 Billing document generation (.docx templates)

- **Build:** Per-billing-type `.docx` population (TSF/Allowance, Training Cost,
  Entrepreneurship) using school-provided templates + merge tokens; pull
  signatories/header/addressee from `tenant_settings`; scholar rows alphabetized +
  numbered; write a versioned `billing_records` snapshot per generation.
- **Files:** `lib/billing/docx.ts`, `app/api/billing/[type]/route.ts`,
  `modules/billing/data/billing.ts`.
- **Depends on:** 4B.1, 4B.2, 4.3 (tenant settings).
- **Acceptance:** Generated doc matches the school template; re-generation after
  an attendance correction appends a new version (old retained); amount in words
  correct; no service-role key client-side.
- **Effort:** L

### 4B.4 Billing readiness + per-tranche document gating + alerts

- **Build:** Compute billing-ready on read (threshold reached AND tranche
  supporting docs verified — II2); per-tranche document checklist (MIS-0302,
  Annex K, Daily Attendance Sheet) at tranche level (LL1); billing/NTP-lag alerts
  in the notifications drawer (JJ1), hidden from trainers.
- **Files:** `modules/billing/domain/readiness.ts`, documents view, notifications
  drawer.
- **Depends on:** 4B.1, 2.2, 4.2.
- **Acceptance:** Ready alert fires only when threshold + verified docs both hold;
  exact missing-doc names per tranche; trainers see no billing/NTP alerts.
- **Effort:** M

**Phase 4B exit gate:** a coordinator generates a correct, regulation-compliant
billing document for an eligible cohort, with readiness gated on verified
supporting documents and all amounts derived from snapshotted data.

---

## Phase 5 — Quality & Handoff

**Goal:** production readiness and parity sign-off.

### 5.1 Figma–route parity audit

- **Build:** Verify every implemented route matches its Figma node and states;
  decide Reports/RQM inclusion (implement or hide nav). Remove `?role=`/`?state=`
  demo overrides.
- **Files:** `specs/general/FIGMA-ROUTE-MAP.md` (status update — new doc, not
  edited here), affected pages.
- **Depends on:** Phases 1–4.
- **Acceptance:** No broken nav links (T-030); Reports either backed by
  schema/route/API or hidden; every primary screen has loading/empty/error/perm
  states.
- **Effort:** M

### 5.2 WCAG 2.2 AA pass

- **Build:** Full accessibility sweep: keyboard, dialog semantics, live regions,
  contrast, semantic tables, 44px targets, status-not-by-color.
- **Files:** cross-cutting (`shared/ui/*`, `modules/shell/ui/*`, module screens).
- **Depends on:** Phases 1–4; `docs/UI_UX_MODAL_AUDIT.md`.
- **Acceptance:** Keyboard-only modal open/use/close; SR announces title/async/
  errors; grayscale legibility; all icon buttons named.
- **Effort:** L

### 5.3 Integration + E2E suite (real Supabase)

- **Build:** Complete the PRD test matrix T-001..T-030 across roles; security
  suite (cross-tenant, audience, storage, service-key-absent, no raw DB errors).
- **Files:** `tests/integration/*`, `tests/e2e/*`, `tests/security/*`.
- **Depends on:** Phases 1–4, 0.4.
- **Acceptance:** All matrix tests green against real Supabase; security tests
  prove isolation; CI runs the suite.
- **Effort:** L

### 5.4 Production readiness checklist

- **Build:** Env-var verification (TRD §14), Clerk `supabase` JWT template check,
  Supabase backups + evidence retention policy, monitoring (auth failures, RLS
  denials, import/upload failures, latency), service-role-key bundle scan.
- **Files:** `docs/PRODUCTION_READINESS.md` (new), CI config.
- **Depends on:** Phases 1–4.
- **Acceptance:** Checklist signed off; bundle scan confirms no service-role key
  client-side; backups verified; retention policy defined before real data.
- **Effort:** M

**Phase 5 exit gate:** Figma parity, WCAG AA, green real-Supabase suite, and a
signed production-readiness checklist.

---

## Dependency Summary

```text
Phase 0 (Foundation)
  0.1 schema ─┬─▶ 0.2 types ─▶ 0.3 contracts ─┬─▶ 0.4 tests
              │                                └─▶ 0.5 resolver+storage
                                                      │
Phase 1 (/dashboard) ◀────────────────────────────────┘
  1.1 wire data ─▶ 1.2 role variants ─▶ 1.3 states ─▶ 1.4 tests
        │
Phase 2 (Batch + Docs) ◀── 1.x
  2.1 detail ─▶ 2.2 docs+upload ─▶ 2.3 LAMR
                         └─▶ 2.4 lifecycle transitions
        │
Phase 3 (Trainer) ◀── Phase 0 + Phase 1 (+2.2 for 3.3)
  3.1 classes ─▶ 3.2 attendance ─▶ 3.3 evidence
        │
Phase 4 (Admin/Coordinator) ◀── Phase 2
  4.1 import/export ─▶ 4.4 T2MIS/BSRS
  4.2 notifications ; 4.3 settings
        │
Phase 4B (Billing Engine) ◀── Phase 3.2 (attendance) + 2.2 (docs) + 4.1/4.3
  4B.1 domain logic ─▶ 4B.2 snapshot+RQM ─▶ 4B.3 .docx gen ─▶ 4B.4 readiness+alerts
        │
Phase 5 (Quality/Handoff) ◀── Phases 1–4B
  5.1 parity ; 5.2 a11y ; 5.3 tests ; 5.4 readiness
```

## Effort Roll-up (rough)

| Phase | Items | Mix |
| --- | --- | --- |
| 0 | 5 | 3×L, 1×M, 1×S (0.1 now L) |
| 1 | 4 | 1×L, 2×M, 1×S |
| 2 | 4 | 2×L, 2×M |
| 3 | 3 | 1×L, 2×M |
| 4 | 4 | 2×L, 2×M |
| 4B | 4 | 2×L, 2×M (billing engine — ADR-001) |
| 5 | 4 | 2×L, 2×M |

Sequence Phases 0→1 strictly (Phase 1 closes the audit's P0 gap). Phases 2–4 can
overlap once Phase 1 is stable and the shared contracts/resolver exist. Phase 5
runs continuously but gates release.

## Revision History

| Version | Date | Author | Summary |
| --- | --- | --- | --- |
| 1.0.0 | 2026-06-30 | System Architecture | Initial phased plan grounded in TRD, MASTER_PRD_SRS, route map, and verified current code (dashboard exists on mock data; Phase 0 unblocks real wiring). |
| 1.1.0 | 2026-06-30 | Product + Architecture | Expanded 0.1 with ADR-001 schema; added Phase 4B (billing engine: domain logic, cost snapshot + RQM, .docx generation, readiness/alerts). |

## Related

- [[TRD]] — engineering decisions this plan executes
- [[ADR-001-billing-and-domain-model]] — Phase 0.1 schema + Phase 4B billing engine source
- [[MASTER_PRD_SRS]] — acceptance criteria and test matrix
- [[TVI-CAMS Knowledge Base]]
