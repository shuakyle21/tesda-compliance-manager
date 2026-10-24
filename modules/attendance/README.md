# modules/attendance — Trainer Classes, Attendance, and Progress (FR-07)

No code yet. The trainer pages under `app/(dashboard)/trainer/**` are currently self-contained placeholders with no module imports.

## Planned
- `data/attendance.ts` — attendance records fetch/map (planned `attendance_records` table, ADR-001 §11 / TES-38)
- `domain/eligibility.ts` — scholar dropout (absences > 20% of the batch's `total_sessions`, or 3 consecutive unexcused absences; locked by ADR-007, which supersedes ADR-001's retired ≥5-absence rule)
- `ui/` — attendance marking + class roster components, extracted from the trainer pages when they go live
