# modules/attendance — Trainer Classes, Attendance, and Progress (FR-07)

No code yet. The trainer pages under `app/(dashboard)/trainer/**` are currently self-contained placeholders with no module imports.

## Planned
- `data/attendance.ts` — attendance records fetch/map (planned `attendance_records` table, ADR-001 §11 / TES-38)
- `domain/eligibility.ts` — scholar eligibility (≥5 absences = ineligible, locked by ADR-001)
- `ui/` — attendance marking + class roster components, extracted from the trainer pages when they go live
