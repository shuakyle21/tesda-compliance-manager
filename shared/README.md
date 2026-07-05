# shared/ — Leaf-Level Code

The lowest layer: code here knows no module, page, or data-source context. **`shared/` must never import from `modules/`, `app/`, or `lib/supabase/database.types`** (ESLint-enforced).

## Contents
- `ui/` — props-only presentational primitives (Icon, StatusBadge, EmptyState, MetricCard, Charts, …). If a component here starts reading data or encoding business rules, it has outgrown `shared/` — move it into its owning module.
- `types.ts` — UI domain types (`Batch`, `Tenant`, `DocRecord`, …). Kept as a single file. A per-module split was **considered and deferred** (TES-68): `mocks/seed.ts` constructs 11 of these types and `shared/` cannot import `modules/`, so the split would break the Phase-5 import boundary until the mock dataset moves out of `shared/`. `Batch` is also a hub type referencing six other domains' shapes, so splitting would create a cross-module type web. Revisit only if a concrete need appears.
- `mocks/` — the seed dataset backing the `unconfigured` fallback (no Supabase env → mock data, per CLAUDE.md error shaping). Part of the data-layer contract, not throwaway fixtures.

## Conventions
- Deep imports only — no index barrels (App Router server/client graph hygiene).
- Import direction: `app → modules → shared → lib/supabase`.
