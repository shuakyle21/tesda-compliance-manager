# ADR-002: The Claude Design prototype portrays the ADR-001 target, honesty carried by copy not badges

Status: accepted

## Decision

The Claude Design prototype (project `e3ea69aa`, `TVI-CAMS.dc.html`) is synced to portray the **ADR-001 target system** — including the billing-document engine, RQM/NTP-on-batch, attendance, and the two parallel tranche schedules — even though most of that schema (`billing_records`, `attendance_records`, `tenant_settings`, the batch cost/RQM columns) is **planned but not yet migrated** (Phase 0.1 / TES-38). It is a design prototype backed by mock data; its job is to show where the product is going so implementation has a target to build against.

We do **not** mark planned-vs-implemented per screen. Honesty is carried entirely by **copy discipline**: the prototype never implies a live backend, and never implies official TESDA approval, submission, or acceptance (per CLAUDE.md and MASTER_PRD_SRS.md). Exports read as internal working copies (e.g. "T2MIS-compatible layout"), never "Export to TESDA."

## Considered options

- **Implemented-only prototype** — show just the migrated tables (batches/documents/LAMR/activity + trainer credentials). Rejected: it would omit the billing engine, which is the single most important thing ADR-001 changed and the thing most in need of being *seen* before it is built.
- **Per-screen "planned / not yet available" badges** — rejected: implemented-vs-planned is an engineering distinction already tracked in `diagrams/` and the ADR; surfacing it screen-by-screen clutters a prototype meant to sell the target vision, and the badges bit-rot as tables migrate.

## Consequences

- A future reader will see billing/attendance/RQM screens with no backing tables. This ADR is why: it is deliberate, and the guardrail is wording, not schema.
- The single load-bearing risk is copy. Any screen whose copy implies official standing or a live backend is a defect, not a cosmetic issue.
- The only prototype surface backed by real migrated data is **trainer credentials** (TES-69); it may lean marginally more concrete than the rest.
