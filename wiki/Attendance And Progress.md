# Attendance And Progress

The locked domain model for how training progress is measured (ADR-001 decisions B2, C2, E2, D3, X2, PathA).

## Progress is attendance-derived (B2)

`progress = sessions_held ÷ total_sessions`

It is **not** time-elapsed and **not** manually typed. `total_sessions` = program **nominal hours ÷ 8** (8-hour sessions), **snapshotted onto the batch at creation** — immune to later program/circular changes. Example: 360 hrs ÷ 8 = 45 sessions.

## Recording rules

- Attendance is per **learner per session date**, capturing `time_in`/`time_out`; unique on `(tenant_id, batch_id, learner_id, attendance_date)` (C2).
- **Manual entry for MVP** — the paper attendance sheet (with signatures) is uploaded as evidence. OCR is *deferred, not excluded*: it would later populate the same `attendance_records` rows (PathA).
- The weekly schedule pattern (Mon–Fri, Mon–Sat, …) is per-batch and affects how *fast* sessions are consumed, **not** the session count (D3).
- Attendance is **mutable in place, never locked** — even post-billing. Every edit writes an `activity_log` event (who, when, before→after) (X2). Corrections trigger billing re-generation with a new versioned snapshot ([[Billing Engine]]).

## Eligibility (the single rule)

A scholar with **≥ 5 absences is ineligible for allowance** — stored as `max_absences = 4` in program rules, tenant-overridable. No attendance-percentage rule exists; only the absence count. Evaluated **per scholar**; the same absence count also drives the TSF absence deduction (`absences × ₱160` on the final tranche).

## Urgency tiers (deadline engine)

Deadline urgency, computed from exact source dates plus an explicit "data as of" timestamp: **Critical** < 7 days · **Warning** 7–21 days · **On Track** > 21 days. Relative labels are always computed, never hand-typed.

## Related

- [[Billing Engine]] — consumes eligibility and progress
- [[Batch Lifecycle]] — the Training stage
- [[Database Schema]] — `attendance_records` shape
- [[Roles And Permissions]] — trainers record attendance for assigned batches only

Sources: [[ADR-001-billing-and-domain-model]] §1–2 · [[MVP_PRD]] §7.7.1–7.7.2 · [[MASTER_PRD_SRS]] FR-05, FR-07
