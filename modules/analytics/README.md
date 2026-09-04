# modules/analytics — Analytics (FR-11)

No module `data/`/`domain/` code yet. The analytics page (`app/(dashboard)/analytics/page.tsx`) fetches the live batches snapshot itself and composes the props-only `shared/ui/Charts.tsx` primitives over it — no mock fallback on `unconfigured`/`sync-failed`.

## Planned
- `data/` — aggregated analytics queries (RLS-scoped)
- `domain/` — trend/aggregation calculations with fixed as-of dates
- `ui/` — analytics-specific compositions once they grow beyond generic chart primitives
