# ADR-007 — Attendance-Based Dropout Rule (TESDA Omnibus 20% / 3-Consecutive)

Status: Accepted
Date: 2026-09-15
Owner: Product + System Architecture
Amends: [[ADR-001-billing-and-domain-model]] §2 (Eligibility) — **Elig** row only.
Everything else in ADR-001 (progress formula B2/E2, session/schedule rules
C2/D3, FF2 absence deduction) is unchanged.

## Context

ADR-001's **Elig** decision fixed eligibility at a single count: a scholar
with **≥5 absences** loses the TSF/Allowance track, stored as
`program_billing_rules.max_absences = 4` (the rule was `absences >
max_absences`, so the 5th absence disqualified), tenant-overridable via
`tenant_settings.max_absences`.

The TESDA Omnibus Guidelines state the rule differently: a trainee may miss up
to **20% of total training hours**; exceeding that limit, **or** accumulating
**3 consecutive unexcused absences**, results in being **dropped from the
program** — an enrollment outcome, not only a payment outcome. This ADR
replaces the fixed-count rule with the percentage rule and folds the
consecutive-absence trigger into the same decision, per direct product
instruction (2026-09-15) to retire the old number rather than run both rules
in parallel.

No shipped code encoded the old rule. `modules/attendance/README.md` and
`docs/IMPLEMENTATION_PLAN.md` both list `domain/eligibility.ts` as **planned**,
not built, and grep over `app/ modules/ shared/ lib/` finds no reference to
`max_absences`. This is a schema and docs correction, not a refactor of running
billing math.

**Mechanism, corrected 2026-10-24.** This ADR was first written on 2026-09-15
against `list_migrations` reporting `20260910120000_add_adr001_billing_domain.sql`
as unrecorded, and it edited that file in place on that basis.
`supabase/migrations/README.md` now records that file as repair-recorded on
2026-10-04 with its object inventory verified live — a record inherited from an
earlier session rather than re-verified. Supabase keys applied migrations on the
version string, so editing a recorded file changes the repository and never the
database — the repo would have claimed `max_absence_percent` while the live
column stayed `max_absences`. The change therefore ships as a new additive
migration, `20261024071359_adr007_attendance_dropout_rule.sql`, which is correct
whichever way the applied/unapplied question lands, since migrations run in
filename order. RULES.md rule 3.

## Decisions

| ID | Decision |
| --- | --- |
| **Elig-2** | **Supersedes Elig.** A scholar is dropped from the program if **(a)** total absences exceed **20% of the batch's `total_sessions`** (the batch's snapshotted session count, E2 — `sessions × percent ÷ 100`, floored), **or** **(b)** the scholar accumulates **3 consecutive unexcused absences** — whichever trips first. The 20% figure is a **program-level default**, stored as `program_billing_rules.max_absence_percent numeric(5,2) not null default 20.00`, tenant-overridable via `tenant_settings.max_absence_percent` (nullable; null inherits the program rule) — same override shape ADR-001 already used for `max_absences`. |
| **Elig-3** | **"Unexcused" needs a schema field that did not exist.** `attendance_records` gains `excused boolean not null default false`, meaningful only on rows where `present = false`. Default `false` means an absence is treated as unexcused unless a registrar/trainer marks it otherwise — the safer default in a compliance tool, since silently excusing absences would understate dropout risk. |
| **Elig-4** | **"Consecutive" is computed over consecutive *recorded* attendance rows for that learner, ordered by `attendance_date`**, not a calendar of scheduled sessions — no session-calendar table exists (`schedule_pattern` stays free text per D3). A date with no row is **unmarked**, not proof of absence, and must not be treated as an absence by the domain layer that implements this rule (same "absent key ≠ evidence" caution ADR-004 applies to documents). This is a known precision limit, accepted for MVP rather than building a session-calendar table to close it. |
| **Elig-5** | **Dropout is a computed signal, not an automated write.** Per JJ1 (alerts computed on read, no cron/email) and this app's position as an internal working layer (TESDA SIS/T2MIS/BSRS remain authoritative), crossing either threshold surfaces as an eligibility/at-risk state in the UI. Flipping `learners.is_active = false` (the existing canonical-migration column) remains a **manual registrar action**, informed by this signal — the app must not represent itself as having officially dropped a trainee from TESDA's own systems. |
| **Elig-6** | **FF2 is unchanged.** The final-tranche absence deduction (`tranche% × total_TSF − absences × ₱160`) still runs off the raw per-scholar absence count, independent of the dropout threshold. A scholar can still accrue the ₱160 deduction for sessions attended before a dropout took effect; billing already generated (NoLedger, append-only) is never rewritten retroactively — a dropout discovered later is handled the same way any attendance correction is (X2: new `activity_log` event, next billing generation reflects it). |

## Rounding note (Elig-2)

"Maximum absence of 20%" is read as **allowed absences = ⌊total_sessions ×
0.20⌋**; the (n+1)th absence beyond that is what disqualifies — the same
`actual > allowed` shape ADR-001 used for the old fixed count, just with
`allowed` now derived per batch instead of hardcoded. Example: 45 sessions
(360 hrs, E2) → allowed = 9 → the 10th absence drops the scholar, absent the
3-consecutive-unexcused trigger firing first.

## Non-goals

- No session-calendar table is added by this ADR (Elig-4's limitation stands).
- No automatic `is_active` mutation, notification, or workflow is added
  (Elig-5). Building that UI/domain layer is separate future work.
- The Assessment Fee / TVI-scope boundary from ADR-001 is untouched.

## Consequences

**Done with this ADR:** `RULES.md`'s locked-domain-facts line, `CONTEXT.md`'s
ubiquitous-language entry, `.claude/agents/tvicams-reviewer.md` (which reviewed
against "≥5 absences ineligible" as an invariant, and would otherwise have
flagged correct code as a violation), and ADR-001's own **Elig** row, struck
through in place so a reader who lands there first cannot implement the retired
rule.

**Still outstanding,** tracked rather than blocking — a repo-wide grep found
more than the original list: `docs/MASTER_PRD_SRS.md:570`,
`docs/IMPLEMENTATION_PLAN.md:404`, `docs/LIVE_DATA_MIGRATION_PLAN.md:819`,
`docs/DEMO_DATA_VALIDATION_PLAN.md:227`, `docs/MVP_PRD.md`, and the
bot-generated `wiki/Attendance And Progress.md` (left alone; it regenerates).

**Not built:** `modules/attendance/domain/eligibility.ts`, which is where this
math actually lives. Elig-2's floor, Elig-4's consecutive-row scan, and the
"unmarked is not absent" caution all need implementing against
`max_absence_percent` and `excused` once the migration is applied.
