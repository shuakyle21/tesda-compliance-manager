# Shared Layer

**Path:** `shared/` (`ui/`, `types.ts`, `mocks/`)
**Status:** leaf level — imported by modules, never imports `modules/` or `app/`

- `shared/ui/` — props-only presentational primitives (`BatchCard`, `StatusBadge`, `EmptyState`, …); reuse these rather than minting parallels.
- `shared/types.ts` — the UI **domain** types (kept as one file), the contract between components and data. Kept deliberately separate from generated `database.types.ts`.
- `shared/mocks/` — the seed dataset backing the `unconfigured` fallback.

A per-module type split was deliberately deferred (TES-68): `shared/mocks/seed.ts` builds 11 domain types and `shared/` can't import `modules/`, so the split waits until the mock dataset moves out of `shared/`.

**Concept:** [[Data Layer Pattern]] · [[Architecture Overview]]

[[Codebase Map]]
