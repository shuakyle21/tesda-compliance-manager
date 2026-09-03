# modules/reports — Reports (FR-15)

Report surfaces over the full batch set (including completed cohorts).

## Contents
- `ui/ReportView.tsx` — report screen (EGACE stages, employment follow-up); orchestrates the
  section components and `exportXlsx.ts` in the same directory
- `domain/egace.ts` — EGACE funnel value/total/rate helpers, pure, no I/O
- `domain/employment.ts` — employment cohort/roster selection and rollup helpers, pure, no I/O

`EGACE_STAGES` and `EMPLOYMENT_STATUSES` are fixed TESDA vocabulary and live in
`shared/vocab.ts`, not in this module (TES-74) — `EGACE_STAGES` has a consumer in
`modules/batches/ui` too, so it stays a `shared/` leaf rather than living in one module.

`app/(dashboard)/report/page.tsx` fetches the full (unfiltered) batch snapshot itself via
`modules/batches/data/batches.ts` — no `data/` layer of its own yet, and no mock fallback on
`unconfigured`/`sync-failed`.

## Planned
- `data/` — report-scoped queries, if report-specific aggregation needs its own fetch layer
