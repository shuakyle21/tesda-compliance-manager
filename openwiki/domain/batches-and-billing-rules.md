---
type: Domain Model
title: Batch Lifecycle, Billing and Attendance Rules
description: "The locked batch/billing domain model: the AOU-to-Billing stage chain, attendance-derived progress, the ADR-001 document engine and ADR-003 packet lifecycle, recorded versus derived due dates, the ADR-007 dropout thresholds, and one-RQM-code-per-batch."
tags: ["domain", "billing", "batches", "attendance", "dropout", "packet-queue", "rqm", "uli", "adr-001", "adr-003", "adr-007", "adr-008", "locked-domain-facts"]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-18T01:01:49.569Z
sources:
  - id: openwiki-source-6c5e30490a0c4602d7931405
    resource: repo://docs/adr/ADR-001-billing-and-domain-model.md
  - id: openwiki-source-aa73e0f7c001cde7c90e254e
    resource: repo://docs/adr/ADR-003-billing-packet-queue.md
  - id: openwiki-source-a201158b72d575d540d15779
    resource: repo://docs/adr/ADR-007-attendance-based-dropout-rule.md
  - id: openwiki-source-6274a82a4962ca0eff3e198d
    resource: repo://docs/adr/ADR-008-recorded-batch-billing-deadline.md
  - id: openwiki-source-203c5b1d1075c30ddbcc761a
    resource: repo://modules/attendance/README.md
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-9244ced37838980939ffbdc8
    resource: repo://modules/batches/domain/alerts.ts
  - id: openwiki-source-1caf7c8c52bb540019284653
    resource: repo://modules/batches/domain/attention.ts
  - id: openwiki-source-6af3f09918cb46eabe775144
    resource: repo://modules/batches/domain/metrics.ts
  - id: openwiki-source-025412e1495434dbc439962f
    resource: repo://modules/batches/domain/progress.ts
  - id: openwiki-source-32dfb5a166a94c373955fb2b
    resource: repo://modules/batches/domain/rqm.ts
  - id: openwiki-source-b465e228246df6e8641b81df
    resource: repo://modules/batches/domain/urgency.ts
  - id: openwiki-source-3301966e0c11cef07712db36
    resource: repo://modules/batches/ui/billTone.ts
  - id: openwiki-source-9a24e697708df788c06f44e3
    resource: repo://modules/billing/data/billing.ts
  - id: openwiki-source-24135802ec9b42acc8123951
    resource: repo://modules/billing/domain/packets.ts
  - id: openwiki-source-59b33492a169d8eadf1c8ad1
    resource: repo://modules/billing/domain/readiness.ts
  - id: openwiki-source-1adfff0058425cb1dbb94d54
    resource: repo://modules/billing/domain/statement.ts
  - id: openwiki-source-1609d2ed970a0b6d52bddaeb
    resource: repo://modules/billing/domain/tracks.ts
  - id: openwiki-source-998cecf14b03cb1c124f5871
    resource: repo://modules/billing/ui/BillingQueueView.tsx
  - id: openwiki-source-4bbff9da266e44025f34a633
    resource: repo://modules/import-export/domain/learnerImport.ts
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-d9a6154810528b0710445f92
    resource: repo://shared/types.ts
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-79c2984b4ebc22667b81e541
    resource: repo://supabase/migrations/20261024071359_adr007_attendance_dropout_rule.sql
  - id: openwiki-source-2020074c6fdeab02aae020b7
    resource: repo://tests/unit/batches.test.ts
  - id: openwiki-source-9fbefbe8f4ad257f300bdc09
    resource: repo://tests/unit/billing-readiness.test.ts
  - id: openwiki-source-a44fada99b4a2a21da27cb2e
    resource: repo://tests/unit/rqm.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T01:01:49.569Z" }
---

# Batch Lifecycle, Billing and Attendance Rules

This page carries the rules a change must not contradict. `RULES.md` states them as
**locked domain facts** with the ADRs that lock them, and RULES rule 30 makes the ADRs
outrank both `docs/MASTER_PRD_SRS.md` and `docs/TRD.md` when they disagree. Two pieces of
PRD wording are dead and must not be re-quoted: *"billing is a preparation signal only"*
(ADR-001 replaced it with a document engine) and the *"≥5 absences"* eligibility rule
(ADR-007 replaced it). Schema shape, RLS, and migration mechanics live on
[Schema and RLS Reference](/openwiki/architecture/schema-and-rls-reference.md) and
[Supabase and Migrations](/openwiki/operations/supabase-and-migrations.md); the module
layout lives on [Architecture Overview](/openwiki/architecture/overview.md).

## Mechanism at a glance

```mermaid
stateDiagram-v2
    direction LR
    state "AOU" as aou
    state "NTP (RQM authorization)" as ntp
    state "TIP" as tip
    state "Training" as train
    state "Assessment" as assess
    state "Billing" as bill
    [*] --> aou
    aou --> ntp : one RQM code allocated
    ntp --> tip
    tip --> train : total_sessions snapshotted
    train --> assess : sessions held / sessions
    assess --> bill
    bill --> [*]
```

The pipeline is a display contract, not a stored history: `LifecycleStageKey` carries the
seven keys including the UI-only `entre`, and a mapper expands the single
`current_stage` enum into `done` / `active` / `pending` per stage so every stage before the
current one reads as done. Per-stage dates are therefore blank — reconstructing real
history needs the `activity_log` join that has not been built
([`shared/types.ts`](repo://shared/types.ts#L12-L25),
[`modules/batches/data/batches.ts`](repo://modules/batches/data/batches.ts#L146-L193)).
A pass-through `displayBatchId` shows the RQM code and falls back to the internal batch
code, while keys, URLs and lookups keep using `Batch.id`
([`modules/batches/domain/rqm.ts`](repo://modules/batches/domain/rqm.ts#L1-L11)).
The dashboard's trainer DTO then strips every billing key from the object, not merely from
its type, so no trainer component can serialize one through
([`modules/batches/domain/metrics.ts`](repo://modules/batches/domain/metrics.ts#L67-L84));
that satisfies RULES rule 5 and ADR-001 §9 *Scope*.

## Progress is attendance-derived, and often unavailable

Progress is `sessions_held ÷ total_sessions` (ADR-001 B2): attendance-derived, never
time-elapsed and never the hand-typed `progress_percent`. `total_sessions` is program
nominal hours ÷ 8, snapshotted onto the batch at creation and immune to later circular
changes — 360 hrs → 45 sessions — and the weekly `schedule_pattern` changes only how fast
sessions are consumed, never the count (E2/D3)
([`supabase/migrations/20260910120000_add_adr001_billing_domain.sql`](repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql#L296-L302)).

The absence of a stored counter is deliberate: the mapper counts **distinct attended
dates** over the embedded attendance rows, so a second source of truth cannot drift.
PostgREST returns `[]` for an empty embed, so "no rows" must read as *not recorded* rather
than as a real zero — `completedSessions` is `null` unless `total_sessions` exists **and**
at least one attendance row exists ([`batches.ts`](repo://modules/batches/data/batches.ts#L105-L123)).
`sessionProgress` propagates that `null`, the display string becomes "Sessions not
recorded", and the percentage is capped at 100 so a recording error cannot draw a bar past
full ([`modules/batches/domain/progress.ts`](repo://modules/batches/domain/progress.ts#L1-L30)).
The dashboard mean filters to tracked batches, so an entirely untracked portfolio reports
`null`, never `0` ([`metrics.ts`](repo://modules/batches/domain/metrics.ts#L25-L31)). A
null `total_sessions` also makes the ADR-007 percentage rule unevaluable — the two rules
share that one snapshot.

## Billing: a document engine, not a ledger

ADR-001 **V2/W1/AA2** make the app generate official TESDA billing documents by populating
the school's own `.docx` template, and **NoLedger** keeps no running envelope, no balance
and no over-billing guard — the TESDA Provincial Office reconciles. `billing_records` is a
*generation log*, append-only by construction: the table has no `updated_at`, and its RLS
grants SELECT and INSERT with deliberately no UPDATE or DELETE policy
([`20260910120000`](repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql#L218-L252)).
Re-generating after an attendance correction appends a new `version`; nothing is
overwritten (Y-hybrid). **TVI-scope** keeps the Assessment Fee out of the engine, and the
billing_type enum mirrors `BillingTrackId` exactly — three values, no assessment member —
so no enum bridge exists and a fourth value cannot appear in only one place
([`20260910120000`](repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql#L80-L91),
[`modules/billing/domain/tracks.ts`](repo://modules/billing/domain/tracks.ts#L1-L67)).

Two builders consume it. `buildStatement` produces one document per track: Training Cost is
a flat per-scholar figure, TSF nets the FF2 absence deduction conceptually and skips the
New Normal and Insurance columns on TWSP (a compliance document must not claim a component
the program does not have), and Entrepreneurship is ₱800 per scholar, CFSP only
([`modules/billing/domain/statement.ts`](repo://modules/billing/domain/statement.ts#L123-L157)).
Its own header admits what it does not show: the 20/50/80 ladder and the generation log
are out of scope of the preview (ADR-002 portrayal). `tsfAmount` likewise sums TSF only,
because Training Cost needs a per-qualification snapshot the `Batch` contract does not
carry — a partial, labelled figure beats an invented rate
([`modules/billing/domain/packets.ts`](repo://modules/billing/domain/packets.ts#L68-L77)).

## The readiness gate is compound, and the two readings differ on purpose

Readiness has exactly two levels and they are not interchangeable. `isBillingReady` is the
dashboard's *prep signal*: ongoing **and** ≥ 80 % progress. `billingGate` is the ADR-001
§Ready *compound gate*: the threshold met **and** a nonzero supporting set with every
requirement on file. A zero-requirement catalog is not verified — an unevaluated checklist
must never read as satisfied — and a doc counts as satisfied once uploaded, because
§7.2.4 accepts the manual attendance sheet as legitimate evidence
([`modules/billing/domain/readiness.ts`](repo://modules/billing/domain/readiness.ts#L1-L71)).

The gate's document set is the *critical* requirements at the pre-billing stages only
(`aou`, `ntp`, `tip`, `train`); the bill- and assess-stage outputs are produced **by**
billing and would make the gate circular
([`modules/billing/data/billing.ts`](repo://modules/billing/data/billing.ts#L19-L59)).
ADR-004 **D4** inverts the measurement rule here: an `untracked` document is *not on file*
and keeps the gate closed, because a gate must not open on evidence nobody recorded. The
alert row that announces readiness therefore claims only that the *threshold* was reached
and defers the compound claim to `billingGate`
([`modules/batches/domain/alerts.ts`](repo://modules/batches/domain/alerts.ts#L30-L37)).
`doc-blockers.test.ts` pins D2 against D4 — measurement declining to judge while gating
fails closed — and `billing-readiness.test.ts` pins every branch of the gate.

## The packet queue narrows the gap between the gate and the projection

ADR-003 P1 makes a *packet* a projection of one `(batch_id, billing_type, tranche_no)`
triple, not a new entity: no envelope, no balance, no double entry. Its `PKT-0NN`
reference is display-only and never an accounting document number
([`packets.ts`](repo://modules/billing/domain/packets.ts#L1-L31)). The queue order is
`draft → ready → generated → submitted → settled` (P2), and only `generated` writes to
`billing_records`, appending the same Y-hybrid snapshot. `submitted` and `settled` are
**user-asserted bookkeeping marks** (P3): they record what a coordinator saw happen outside
the app, the UI must never imply TESDA approval, and P4's in-app "Flag for follow-up" is
the design's "Send reminder" without email or a scheduler.

Two consequences bite anyone changing this code. **The queue state and the gate are
separate derivations of the same batch** — the packet's `state` comes from its blockers and
progress alone, while `BillingQueueView` gates generation on the card's `gate.ready` — so a
state can read ready while Generate is still disabled, and the gate is the rule
([`modules/billing/ui/BillingQueueView.tsx`](repo://modules/billing/ui/BillingQueueView.tsx#L93-L114)).
**Nothing persists `generated`/`submitted`/`settled` yet**: no repository code reads or
writes `billing_records`, `buildPacket` hard-codes a completed batch to `settled` and
anything else to `ready` or `draft`, and the state chips ship all five labels ahead of the
store (P2/P3 owed work). A related honest limit: `buildBillingCard` passes an empty
requirement list until a program-to-requirement source is wired, which closes every gate
rather than fabricating a pass ([`billing.ts`](repo://modules/billing/data/billing.ts#L72-L94)).

`summarizePackets` turns the projection into the four money tiles by summing ready,
draft-not-overdue, overdue and settled; the settled total is an *observation*, incomplete
by construction because it counts only what someone remembered to mark (P6).

## Two due dates: derived for packets, recorded for batches

ADR-003 **P5** derives a packet's `due_date` on read and compares it against the screen's
as-of date, so overdue inherits the "Data as of" stamp instead of becoming stored state.
ADR-008 amends P5 for the *batch-level* deadline only (still `Proposed`): `batches.
billing_deadline` is a nullable, person-entered operational commitment, because P5's
derivation needs a tranche schedule that no live batch populates
([`docs/adr/ADR-008-recorded-batch-billing-deadline.md`](repo://docs/adr/ADR-008-recorded-batch-billing-deadline.md#L10-L36)).
Null means **not recorded** — never "no deadline", never inferred from `end_date`, whose
substitution produced the live "-313 days left" bug. The column carries no due label until
the migration lands: the mapper reads `row.billing_deadline ?? null`, so every batch shows
the unavailable state rather than a countdown.

The missing-deadline case is functional code, not a formatting aside. `daysUntil` returns
`POSITIVE_INFINITY` for a null *or unparseable* date, because `new Date('garbage')` gives
`NaN` and a `NaN` silently corrupts sorting and urgency downstream
([`batches.ts`](repo://modules/batches/data/batches.ts#L195-L207)). `urgencyTier` routes
every non-finite day count to `muted` — the neutral tier, never a deadline colour —
so an unrecorded deadline is styled as missing data, not as an overdue batch
([`urgency.ts`](repo://modules/batches/domain/urgency.ts#L8-L19),
[`modules/batches/ui/billTone.ts`](repo://modules/batches/ui/billTone.ts#L6-L31); the
`muted` switch is exhaustive, so a new tier will not compile without a tone).
`Infinity` also sorts last, which is why "earliest billing" never picks an undated batch.

`hasRecordedBillingDeadline` is the predicate that decides whether anything may be
*narrated* about timing, and it is deliberately separate from
`hasOpenBillingObligation`. The obligation predicate is deadline-agnostic — not completed,
billing report not verified, billing stage not done — so an open obligation with no
deadline is still open ([`urgency.ts`](repo://modules/batches/domain/urgency.ts#L21-L35)).
From that split the consumers agree: `deriveDashboardMetrics` counts undated obligations as
`billingDeadlinesMissing` and excludes them from `nextBilling` and `overdueBilling`
([`metrics.ts`](repo://modules/batches/domain/metrics.ts#L33-L65)); `attentionItems` emits
one aggregate `billing-deadline-missing` row rather than one per batch, so real deadlines
are not buried
([`attention.ts`](repo://modules/batches/domain/attention.ts#L83-L85)); and `batchAlerts`
raises a critical row only for an *open* obligation whose tier is `critical` or `overdue`,
which is why a finished cohort's negative count does not alert
([`alerts.ts`](repo://modules/batches/domain/alerts.ts#L38-L48)).
`dashboard-domain.test.ts` and `urgency.test.ts` fix these boundaries — including the
sentinel reading as `muted` and the brand-new `overdue` tier for negative days (BD3).

## Dropout: 20 % of sessions, or three consecutive unexcused absences

ADR-007 **Elig-2** supersedes ADR-001's retired fixed ≥5-absence rule: a scholar is dropped
when absences exceed 20 % of the batch's snapshotted `total_sessions` (floored, so
`actual > allowed` decides and 45 sessions allow 9), **or** on 3 consecutive unexcused
absences — whichever trips first. The 20 is a program default stored as
`program_billing_rules.max_absence_percent`, overridable by a **nullable**
`tenant_settings.max_absence_percent` whose null inherits the program rule so the two
cannot disagree ([`20261024071359_adr007_attendance_dropout_rule.sql`](repo://supabase/migrations/20261024071359_adr007_attendance_dropout_rule.sql#L46-L94)).

Three invariants survive a rewrite. **The column was not renamed or cast**: `max_absences`
was a count of sessions and `max_absence_percent` a share, and a cast would silently impose
a far stricter rule, so the new column takes the default and the old one is dropped.
**"Unexcused" needs storage**: `attendance_records.excused` defaults to `false`, the safe
direction, because silently excusing an absence understates dropout risk (Elig-3).
**Unmarked is not absent**: the streak runs over consecutive *recorded* rows ordered by
`attendance_date`, because no session-calendar table exists and a later date with no row
proves nothing (Elig-4).

The outcome is an **enrollment** one, and it is a computed signal — flipping `learners.
is_active` stays a manual registrar action, so the app never claims to have dropped anyone
out of TESDA's systems (Elig-5). Billing already generated is never rewritten; a later
dropout correction is an attendance correction and the next generation reflects it, with
FF2's final-tranche deduction still running off the raw absence count (Elig-6). Per the
module's own README that math is **not built** — `modules/attendance/domain/eligibility.ts`
is planned, and a repo grep finds no reader of `max_absence_percent` or `excused`.

## Batch identity, learner identity, and read-time alerts

**One RQM code = one batch** (ADR-001 Card): the NTP authorization lives directly on the
batch, the code decodes to tranche, year, program, provider and sequence, and a partial
unique index on `(tenant_id, rqm_code)` enforces it without colliding the all-null legacy
rows ([`20260910120000`](repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql#L313-L320)).
`checkRqmCode` normalizes first (invisible characters, Unicode dashes, whitespace) and
rejects the NTP's four-part request number with a message naming the difference, because
the two are easy to confuse; program and provider mismatches are warnings, not errors, and
zero-padding is ignored ([`rqm.ts`](repo://modules/batches/domain/rqm.ts#L16-L94)).
`setBatchRqmCode` writes only when the stored value still equals `expectedPrevious`, so a
concurrent edit is reported as `conflict-or-denied` instead of overwritten, and a `23505`
surfaces as `duplicate` while other errors stay generic
([`batches.ts`](repo://modules/batches/data/batches.ts#L378-L418)).

**ULI is the permanent learner key** (ADR-001 Q1) — a TESDA identifier, stable by value so
the same person at two schools is two tenant-scoped rows sharing it. Import reconciliation
keys on it and marks a row without a valid ULI invalid rather than importing it blind
([`modules/import-export/domain/learnerImport.ts`](repo://modules/import-export/domain/learnerImport.ts#L69-L78)).

**Alerts are computed on read** (ADR-001 JJ1, upheld by ADR-003 P4): no cron, no email, no
alert table — `alerts_log` stays deferred. `batchAlerts` derives rows from batch state, and
`alertCategoryCounts` re-derives them per batch against that batch's *own* program
catalog, so one program's requirement never counts as missing on another's proper
([`alerts.ts`](repo://modules/batches/domain/alerts.ts#L49-L84)). A notification surface
therefore never drifts from the batches driving it, but also never survives a page load.

## Failure modes to keep in view

- **Progress read from `progress_percent`** — it is a typed column the app still trusts in
  `isBillingReady` and `buildPacket`, while `sessionProgress` reads the attendance-derived
  pair. The two can disagree on one batch.
- **A gate opened on `untracked` documents** — the opposite of ADR-004's measurement rule.
- **A past `end_date` used as a deadline** — the bug ADR-008 exists to close; re-introducing
  it silently resurrects "-313 days left".
- **A stored `sessions_held` or stored `due_date`** — both are derived; persisting either
  creates a second truth free to drift from the record.
- **A fourth `billing_type`** — the enum, `BillingTrackId`, the packet `STATE_*` maps and
  `deriveBillTone` all need it or the change fails to compile.
- **`settled` presented as a reconciliation** — it is an observation total, and "paid this
  cycle" is incomplete by construction.

## Focused tests

`tests/unit/urgency.test.ts` (tier boundaries), `tests/unit/dashboard-domain.test.ts`
(muted sentinel, open obligation with no deadline, the aggregate data-gap row),
`tests/unit/batches.test.ts` (Infinity for null *and* unparseable dates, `billing_deadline`
preserved over `end_date`, distinct attended dates, unavailable progress),
`tests/unit/billing-readiness.test.ts` (both gate halves, zero-requirement catalog),
`tests/unit/doc-blockers.test.ts` (ADR-004 D2 vs D4), `tests/unit/rqm.test.ts` and
`tests/unit/rqm-action.test.ts` (normalization, five-part rejection, optimistic write
conflicts), and `tests/unit/reports-domain.test.ts` (recorded-versus-unrecorded batch
population). There is no unit test for `packets.ts` — a coverage gap to close before the
`billing_records` write path lands.
