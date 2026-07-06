# modules/batches — Dashboard, Batch Lifecycle, Urgency Engine (FR-03 / FR-04 / FR-05)

Batch overview, lifecycle tracking, and the deadline/progress/urgency engine.

## Contents
- `data/batches.ts` — **reference implementation of the fetch → map → derive pattern** (`mapBatchRow`, `DB_TO_UI_STAGE`, `BatchesSnapshot` with `ok`/`sync-failed`/`unconfigured`). The only module code allowed to import `lib/supabase/database.types.ts`.
- `domain/urgency.ts` — `urgencyTier` (days-to-billing → critical/warning/on-track)
- `ui/` — `BatchCard`, `BatchModal`, `LifecyclePipeline`, `TableView`, `CardsView`, `FiltersRow`, `filter.ts`
- `ui/dashboard/` — dashboard widgets: `BatchTimeline`, `ProgressTrend`, `DocumentStatusDonut`, `EgaceOutcomes`, `AlertsPanel`

## Planned
- `domain/metrics.ts` — dashboard metrics with injected document requirements (replaces `getMockMetrics` in `shared/mocks`; supersedes the deleted empty `lib/domain/metrics.ts` stub)
- Locked domain facts (ADR-001): progress = `sessions_held / total_sessions` (nominal hours ÷ 8, snapshotted); one RQM code = one batch; alerts computed on read.
