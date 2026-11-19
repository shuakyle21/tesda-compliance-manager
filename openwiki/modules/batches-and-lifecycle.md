---
type: module
title: Batches, Lifecycle, Urgency and Alerts
description: The batches module (FR-03/04/05) — the reference fetch → map → derive contract every entity copies, the batch snapshot and its mapper, the RQM-code rule and its Server Action, computed-on-read urgency and the needs-attention queue, the cross-school overview, the KPI derivation and the trainer trim.
tags: [batches, lifecycle, urgency, alerts, rqm-code, snapshots, mapper, kpi, needs-attention, trainer-dto, fr-03, fr-04, fr-05]
sources:
  - id: openwiki-source-b20398739f9d1bb1e83b20b2
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/batch-cards/page.tsx
  - id: openwiki-source-ce194fb513f902915fafa99b
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/actions.ts
  - id: openwiki-source-fac1d0830b5bfbb903fdd40f
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/dashboard/page.tsx
  - id: openwiki-source-f8cfb11c14504e1f5bffb66c
    resource: repo://app/(dashboard)/trainer/page.tsx
  - id: openwiki-source-6274a82a4962ca0eff3e198d
    resource: repo://docs/adr/ADR-008-recorded-batch-billing-deadline.md
  - id: openwiki-source-6787d888d949c1ba35fe2037
    resource: repo://modules/analytics/ui/AnalyticsView.tsx
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-9244ced37838980939ffbdc8
    resource: repo://modules/batches/domain/alerts.ts
  - id: openwiki-source-1caf7c8c52bb540019284653
    resource: repo://modules/batches/domain/attention.ts
  - id: openwiki-source-6af3f09918cb46eabe775144
    resource: repo://modules/batches/domain/metrics.ts
  - id: openwiki-source-f395ba62d0eeb11fc4865d2f
    resource: repo://modules/batches/domain/overview.ts
  - id: openwiki-source-025412e1495434dbc439962f
    resource: repo://modules/batches/domain/progress.ts
  - id: openwiki-source-32dfb5a166a94c373955fb2b
    resource: repo://modules/batches/domain/rqm.ts
  - id: openwiki-source-b465e228246df6e8641b81df
    resource: repo://modules/batches/domain/urgency.ts
  - id: openwiki-source-512d2efffc85412d8c1e789f
    resource: repo://modules/batches/ui/CardsView.tsx
  - id: openwiki-source-ab14a188e44d057adc83db62
    resource: repo://modules/batches/ui/dashboard/NeedsAttentionQueue.tsx
  - id: openwiki-source-2cad937ecfecf0d996572e65
    resource: repo://modules/batches/ui/KpiSummary.tsx
  - id: openwiki-source-1d56d4ea0a3a5a0ef9c322a5
    resource: repo://modules/shell/ui/MetricsRow.tsx
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-d9a6154810528b0710445f92
    resource: repo://shared/types.ts
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-2020074c6fdeab02aae020b7
    resource: repo://tests/unit/batches.test.ts
  - id: openwiki-source-4b1944144311805b722ef6ef
    resource: repo://tests/unit/dashboard-domain.test.ts
  - id: openwiki-source-e251531b107f39bce86744e7
    resource: repo://tests/unit/rqm-action.test.ts
  - id: openwiki-source-a44fada99b4a2a21da27cb2e
    resource: repo://tests/unit/rqm.test.ts
  - id: openwiki-source-4a8c4e61ab290d00b22b6541
    resource: repo://tests/unit/urgency.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T03:56:44.398Z" }
---

# Batches, Lifecycle, Urgency and Alerts

`batches` is the repository's reference module. `RULES.md` rule 17 names
`modules/batches/data/batches.ts` as the implementation every other entity contract copies, so a
change here propagates as a template whether or not you intended it. It also owns the dashboard's
signature surface: the needs-attention queue, the KPI derivation, and the RQM code that is a batch's
official identity.

The module supplies `data/`, pure `domain/`, and `ui/`. Almost everything time-sensitive is decided
in `domain/` as a pure function of an already-mapped `Batch`; the single wall-clock read sits in the
mapper, so every downstream tier, queue order and KPI is computed from precomputed day counts.

## Locked facts and where each one lives

Four facts from `RULES.md` "Locked domain facts" are implemented here, and each has a concrete
failure mode if a change forgets it:

- **One RQM code = one batch.** The NTP authorization lives on the batch, and a partial unique index
  `batches_tenant_rqm_code_key` enforces it per tenant
  (`supabase/migrations/20260910120000_add_adr001_billing_domain.sql`; ADR-001 **Z3**/**Card**).
  A write that collides comes back as `duplicate`, not as a raw Postgres error.
- **Progress is `sessions_held / total_sessions`, with `total_sessions` = nominal hours ÷ 8
  snapshotted on the batch.** Sessions held is a count of distinct attended dates, never a stored
  counter; `20260910120000` deliberately adds no `sessions_held` column so progress cannot drift from
  the attendance it claims to summarise (ADR-001 **B2**/**E2**). Hand-typed `progress_percent` is a
  separate, older field the mapper still carries on `Batch.progressPct`; it is the billing-ready
  threshold's input but never the dashboard progress figure
  (`tests/unit/status-render.test.ts` asserts it is not drawn).
- **ULI is the permanent learner key.** `modules/batches/data/learners.ts` maps `uli` through
  untouched and carries the T2MIS roster; a `seq` per batch is a display ordinal derived from the
  fetched order, not an identity.
- **Alerts are computed on read — no cron, no email.** There is no `alerts_log` table; the alert,
  attention and metrics functions are pure over the same snapshot.

## The reference fetch → map → derive contract

`data/batches.ts` is three layers with an explicit boundary between them, and the split is the point:
only step 1 touches Supabase, steps 2–3 are pure and therefore testable without a database.

1. **fetch** — `getBatchesSnapshot(tenantId?)` runs one typed query with embedded
   `scholarship_programs(...)`, `documents(*)` and `attendance_records(...)` selects, ordered by
   `end_date`. A `tenant_id = …` filter from a validated scope only *selects* which school the screen
   is about; RLS is the authorization boundary (rule 2). The function is `cache()`-wrapped because the
   site layout and the nested page each call it for the same request.
2. **map** — `mapBatchRow` is pure DB-row → `Batch`, and holds every string/number default, the enum
   bridge, and the derivation. It is exported specifically so it can be unit-tested against a
   fixture row.
3. **derive** — date and lifecycle helpers computed from that single row.

The snapshot is a discriminated union: `ok` (carrying `dataAsOf` and `fetchedAt`), `sync-failed`,
`unconfigured`, plus `no-tenant-access`, which no query produces. RLS answers "you belong to nothing"
with an empty successful read, so the route folds that case in through
`modules/tenancy/domain/access`'s `withTenantAccess`, which rewrites only an `ok` snapshot so a real
failure is never masked. `selectBatchesForDisplay` then collapses every non-`ok` status to `[]`;
neither `sync-failed` nor `unconfigured` may substitute mock data (rule 19). The union, the fold and
the guard ordering are [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md)'s
subject — this page only notes that `batches` is the shape being copied.

Two mapper rules earn their own comments because both were bugs:

- **A missing `billing_deadline` reads `null`, not `undefined`.** `row.billing_deadline ?? null` is
  deliberate: on a database where the column is absent, `select('*')` yields `undefined`, which would
  slip past every `!== null` "no deadline recorded" check downstream. ADR-008 records that the
  deadline is an explicit operational commitment and null means "not recorded" (**BD2**), never
  inferred from `end_date`.
- **`daysUntil` returns `Infinity`, not `NaN`, for an absent or unparseable date.** `Infinity` is the
  established "no known deadline" sentinel; a `NaN` would silently corrupt sorting and every urgency
  comparison. `urgencyTier` maps it to `muted` and `hasRecordedBillingDeadline` refuses to count it
  down, so the sentinel reaches no deadline-shaped surface.

`completedSessions` reads "attendance unavailable" for *both* halves being absent — no
`total_sessions`, or zero attendance rows — because PostgREST returns `[]` (never `null`) for an empty
embed, so "no rows" cannot be read as a genuine zero sessions held.

## Lifecycle derivation and the enum bridge

The UI pipeline is seven stages (`aou → ntp → tip → train → entre → assess → bill`) and is derived
from the single `current_stage` enum: every stage before it is `done`, it is `active`, the rest
`pending`. `DB_TO_UI_STAGE` is a total map, so a new DB enum variant fails compilation until its UI
treatment is chosen (rule 18). `completed` maps to `null` and marks *everything* done; `blocked` maps
to `null` and marks nothing active — a blocked batch must not look like it is progressing.

Two normalizations are lossy on purpose, and the mapper keeps the lost fact alongside:

- DB `blocked` status surfaces as UI `pending` (the UI has no blocked tier), so `Batch.blocked` is set
  separately from either `status` or `current_stage` and is what the attention queue reads.
- `rqm_code` is trimmed, and a whitespace-only value becomes `null`. `Batch.id` stays the internal
  batch code — display uses `displayBatchId` (`domain/rqm.ts`), which prefers the RQM code and falls
  back to the internal id, so keys, URLs and lookups never follow the official code. Search and the
  attention labels use the official code; `filterBatches` matches on it too, so a displayed code is
  findable.

## The RQM code: domain rule, then Server Action

`domain/rqm.ts` is pure and validates the NTP authorization code
(`RQM<tranche>-<year>-<program>-<provider>-<seq>`). It normalizes before judging: uppercase, Unicode
dashes (U+2010–U+2015, U+2212, U+FF0D) fold to `-`, soft hyphens and zero-width characters drop,
whitespace is removed — a real NTP prints codes with U+2010, so rejecting them would reject genuine
documents. Because a four-part *request number* is a different thing from a five-part code, it gets
its own rejection message. A program or provider-number mismatch is a **warning**, not a rejection;
provider numbers compare with leading zeros stripped, so `01263` and `1263` are the same school. The
same module extracts codes from NTP PDF text by joining pdf.js items by geometry — split glyph runs
are glued back together, distant table cells are not.

`app/(dashboard)/t/[tenantCode]/actions.ts` is the change-shaped reference action, and its order
matters more than any single line. Because it composes three modules' `data/` layers, it lives in
`app/` rather than in any one of them:

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Parse error on line 13: ...coordinator → denied A->>D: normalized Expecting '()', 'SOLID_OPEN_ARROW', 'DOTTED_OPEN_ARROW', 'SOLID_ARROW', 'SOLID_ARROW_TOP', 'SOLID_ARROW_BOTTOM', 'STICK_ARROW_TOP', 'STICK_ARROW_BOTTOM', 'SOLID_ARROW_TOP_DOTTED', 'SOLID_ARROW_BOTTOM_DOTTED', 'STICK_ARROW_TOP_DOTTED', 'STICK_ARROW_BOTTOM_DOTTED', 'SOLID_ARROW_TOP_REVERSE', 'SOLID_ARROW_BOTTOM_REVERSE', 'STICK_ARROW_ -->
```text
sequenceDiagram
  participant F as FormData
  participant A as setBatchRqmCodeAction
  participant S as resolveRouteScope
  participant R as resolveTrustedRole
  participant D as domain/rqm checkRqmCode
  participant W as data.setBatchRqmCode
  participant L as appendActivity
  F->>A: tenantCode, batchCode, expectedPrevious, rqmCode
  A->>S: tenantCode (never a tenant id from the form)
  S-->>A: ok/denied, or unknown (profile unreadable)
  A->>R: profile.role
  R-->>A: role; non admin/coordinator → denied
  A->>D: normalized input
  D-->>A: code + warnings, or invalid
  A->>W: tenantId, batchCode, expectedPrevious, next
  W-->>A: saved / duplicate / conflict-or-denied / sync-failed
  A->>L: appendActivity (skipped when from === to)
  A->>A: revalidatePath('/t/[tenantCode]', 'layout')
  A-->>F: RqmFormState
```

The tenant is resolved server-side from the URL code against the caller's memberships and the role
from `profiles.role` via `resolveTrustedRole`, never the `?role=` presentation override. Those checks
are defence in depth: the boundary is the `batches` UPDATE policy, and a policy matching zero rows
becomes `conflict-or-denied` — deliberately indistinguishable from a concurrent edit, because
PostgREST cannot tell them apart. Re-saving an identical value writes no activity row.

The write itself (`setBatchRqmCode` in `data/batches.ts`) is a compare-and-set: it only lands if the
stored code still equals `expectedPrevious` (`is('rqm_code', null)` for a null expectation). SQLSTATE
`23505` becomes `duplicate`; every other error becomes `sync-failed` with the raw message kept in the
server log. The action returns a discriminated `RqmFormState` and never throws; only
`admin`/`coordinator` see the editor at all, and that visibility is usability only.

## The dashboard: attention queue, metrics, alerts

`domain/urgency.ts` is the single tiering rule: negative days `overdue`, ≤6 `critical`, ≤21
`warning`, beyond `on-track`, and a non-finite value `muted` — the no-deadline sentinel must never be
styled as a deadline. The boundaries are inclusive, so 6 and 21 stay in their inner tier and 7/22
step out. Separately, `hasOpenBillingObligation` is deadline-agnostic (not completed,
BSRS not verified, billing stage not done) and `hasRecordedBillingDeadline` decides countability. This
split is what lets a batch owe billing work with no deadline recorded, which is surfaced as a data
gap rather than counted down (ADR-008 **BD4**).

`domain/attention.ts` builds the queue from recorded facts only. A sync failure leads everything —
it means the other items may simply be missing. Then urgent work (blocked, overdue) before due work
(inside the 21-day window), most overdue first. Two deliberate shapes: an untracked document is not
"missing" (ADR-004; the `documents-missing` item only fires once at least one critical requirement is
actually tracked), and open batches with no deadline collapse into **one** aggregate
`billing-deadline-missing` row rather than one per batch, because N identical rows would bury the
real deadlines. `ui/dashboard/NeedsAttentionQueue.tsx` renders at most eight and states the
remainder; severity is a word plus an icon, never colour alone (rule 23). The empty copy claims only
what was checked. `describeAttention` is shared with the admin overview so the two surfaces cannot
word the same item differently.

`domain/metrics.ts` is the one canonical KPI summary. It computes over a **single population** —
active (`ongoing`) batches — so an active-batch count never sits beside a completed cohort's roster
(audit B1): `totalBatches`, `activeBatches`, `activeScholars`, mean `sessionProgressPct` over only the
batches that have attendance (null when none do, with `sessionTrackedBatches` reporting the
denominator), the soonest recorded deadline among open obligations, the count of open obligations,
how many of those lack a deadline, `overdueBilling`, and the ADR-004 document-compliance figures whose
percentage is `null` — unknown — when nothing is tracked. It reads no clock itself: every date figure
is already a `daysToBilling` computed by the mapper, which is why the mapper is the one layer that
needs a frozen clock. `deriveTrainerMetrics` is covered below.

`domain/alerts.ts` is the other reader of the same rows, used by the analytics alerts donut through
`alertCategoryCounts` — one source of truth, so a count cannot drift from the batches driving it.
Its `billing-ready` row is `isBillingReady`, the threshold-only prep signal, so the copy says
"reached the billing progress threshold" and must not claim the batch is ready to bill; that claim
belongs to `billingGate`
([Billing Engine and Packet Queue](/openwiki/modules/billing.md)).

## The trainer trim

Rule 5 requires trainer-facing DTOs to omit billing deadline, billing preparation, NTP lag, BSRS and
financial fields **server-side** — not hidden with CSS. The trim happens in two places:

- `deriveTrainerMetrics` destructures `nextBilling`, `openBillingObligations`,
  `billingDeadlinesMissing` and `overdueBilling` out of the summary, so the keys are gone from the
  serialized object and not merely from its type. `TrainerDashboardMetrics` is
  `Omit<DashboardMetrics, keyof BillingMetrics>`.
- `mapBatchRow` carries all five classes on every `Batch`, hidden only by which surface consumes it:
  `ntpLag` is always `null` (no date mapping exists) so the NTP-lag alert cannot fire,
  `billingDeadline`/`daysToBilling` are present but unused by the trainer KPI row, and `bsrs` becomes
  the `billing_report_status === 'verified'` boolean — a BSRS fact that reaches no trainer surface.
  The trainer dashboard fetches unfiltered (`getBatchesSnapshot()` with no tenant, since RLS already
  limits rows to batches assigned to the trainer) and passes nothing at all for a non-`ok` snapshot.
- `KpiSummary` renders the billing card **only when a `billing` prop is passed**; trainer routes go
  through `modules/shell/ui/MetricsRow`, which does not pass it, so the card could not render even if
  a key leaked back in.

Because a `Batch` mapper is role-blind, RLS does the rest: which rows and which embedded document
rows a trainer receives is decided in Postgres, and the mapper stays unaware of the caller's role, `Batch.bsrs` **is** the outbound signal: `hasOpenBillingObligation` reads it, and a verified
billing report therefore closes an obligation. Financial fields never leave the batch at all — the
`Batch` DTO carries no money, so there is nothing for a trim to drop.

## Cross-school overview

`domain/overview.ts` is the one place batches from several schools meet, and it never sums them into
an anonymous figure. `schoolSummaries` computes each school's metrics and attention list with the
same functions the school dashboard uses — so the overview and that school cannot disagree — keeps
schools with no batches present so none silently drops out, and sorts by urgent count, then open
items, then name. `crossSchoolExceptions` flattens only the urgent items, each labelled with its
school, for the admin landing view. Completing a batch, verifying BSRS or moving the billing stage
done closes its obligation and removes it from both.

## Where the routes fold in

The dashboard page orders its guard ladder explicitly: forced denial, then `sync-failed` **with zero
rows** (before "empty", per rule 19), then no-tenant-access, then empty — and renders the KPI row,
the queue, and role-notes only when data exists. It also feeds `attention` counts to `KpiSummary`,
where an urgent count alone makes the card critical. `CardsView` and `TableView` pass the `rqmEdit`
prop only for `admin`/`coordinator` and look the open batch up from the live list, so a save shows in
the open modal without a stored copy. The overview page composes `schoolSummaries` and
`crossSchoolExceptions` the same way.

Two edges worth knowing before touching this area: `rqm_code` is editable from `CardsView` and
`TableView` for admin/coordinator, while `billing_deadline` has no edit or import path at all
(ADR-008 consequence) and can only arrive with the row. `Batch.ntpLag` likewise has no source, so the
`ntp-lag` alert category is permanently empty; `tests/unit/batches.test.ts` pins that it never claims
a lag rather than letting the field quietly become a guess.

## Tests that pin this

- `tests/unit/batches.test.ts` freezes the clock with `vi.setSystemTime` around the
  days-to-billing block, because that is the one mapper branch that calls `Date.now()`. It pins the
  whole-days result, `Infinity` for null *and* for `not-a-date`, the canonical deadline surviving
  beside a different `end_date`, and — in a separate block — that an *absent* column reads as not
  recorded. It also pins the lifecycle bridge per enum, the blocked-fact retention, the catalog
  backfill, and every non-`ok` snapshot rendering empty.
- `tests/unit/dashboard-domain.test.ts` reads no clock: `daysToBilling` is precomputed, so every case
  is fixed-as-of by construction. It pins the tier sentinel, obligation closing, the due window, the
  single aggregate data-gap row, per-catalog document measurement, the trim's runtime absence, and
  the overview's per-school grouping and urgent-only exceptions.
- `tests/unit/urgency.test.ts` and `tests/unit/rqm.test.ts` pin the boundaries: tier edges at 6/7 and
  21/22, dash folding, the request-number rejection, provider zero-stripping, PDF rejoin, and
  `setBatchRqmCode`'s `23505` → `duplicate` and zero-rows → `conflict-or-denied` mapping.
- `tests/unit/rqm-action.test.ts` pins the action ladder: non-member → `denied`, unreadable profile →
  `error` (a failed check, not a refusal), viewer → `denied` without a write, empty field over a
  recorded code clearing it, and `logFailed: true` when activity cannot be written.

Changing a denominator here means touching these tests, which is the intended friction: `daysUntil` is
the only place in this topic that reads a wall clock, and everything downstream consumes its output as
precomputed data.
