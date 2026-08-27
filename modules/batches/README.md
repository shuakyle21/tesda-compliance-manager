# modules/batches — Dashboard, Batch Lifecycle, Urgency Engine (FR-03 / FR-04 / FR-05)

Batch overview, lifecycle tracking, and the deadline/progress/urgency engine.

## Contents
- `data/batches.ts` — **reference implementation of the fetch → map → derive pattern** (`mapBatchRow`, `DB_TO_UI_STAGE`, `BatchesSnapshot` with `ok`/`sync-failed`/`unconfigured`). The only module code allowed to import `lib/supabase/database.types.ts`.
- `domain/urgency.ts` — `urgencyTier` (days-to-billing → critical/warning/on-track)
- `domain/metrics.ts` — `deriveDashboardMetrics(batches, requirements)`, the dashboard KPI figures with injected document requirements (replaced `getMockMetrics` in `shared/mocks`, TES-94; supersedes the deleted empty `lib/domain/metrics.ts` stub). Document compliance follows ADR-004 — untracked requirements are excluded, and `docCompliancePct` is `null` when nothing is tracked.
- `ui/` — `BatchCard`, `BatchModal`, `LifecyclePipeline`, `TableView`, `CardsView`, `FiltersRow`, `filter.ts`
- `ui/dashboard/` — dashboard widgets: `BatchTimeline`, `ProgressTrend`, `DocumentStatusDonut`, `EgaceOutcomes`, `AlertsPanel`

## Planned
- Locked domain facts (ADR-001): progress = `sessions_held / total_sessions` (nominal hours ÷ 8, snapshotted); one RQM code = one batch; alerts computed on read.
