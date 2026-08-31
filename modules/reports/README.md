# modules/reports — Reports (FR-15)

Report surfaces over the full batch set (including completed cohorts).

## Contents
- `ui/ReportView.tsx` — report screen (EGACE stages, employment follow-up); orchestrates the
  section components and `exportXlsx.ts` in the same directory
- `domain/egace.ts` — EGACE funnel value/total/rate helpers, pure, no I/O
- `domain/employment.ts` — employment cohort/roster selection and rollup helpers, pure, no I/O

`EGACE_STAGES` and `EMPLOYMENT_STATUSES` are fixed TESDA vocabulary and live in
`shared/vocab.ts`, not in this module and not in `shared/mocks/` (TES-74). They stay in
`shared/` because `shared/mocks/seed.ts` consumes `EMPLOYMENT_STATUSES` and `shared/` may
not import `modules/`; `EGACE_STAGES` also has a consumer in `modules/batches/ui`.

## Planned
- `data/` — report-scoped queries (`ALL_BATCHES` equivalent over live data)
