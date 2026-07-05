# modules/analytics — Analytics (FR-11)

No module code yet. The analytics page (`app/(dashboard)/analytics/page.tsx`) currently composes the props-only `shared/ui/Charts.tsx` primitives directly over `shared/mocks` data.

## Planned
- `data/` — aggregated analytics queries (RLS-scoped)
- `domain/` — trend/aggregation calculations with fixed as-of dates
- `ui/` — analytics-specific compositions once they grow beyond generic chart primitives
