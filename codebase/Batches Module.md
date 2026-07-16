# Batches Module

**FR:** FR-03 / FR-04 / FR-05 — dashboard, batch lifecycle, urgency engine
**Path:** `modules/batches/` (`data/batches.ts`, `domain/urgency.ts`, `ui/dashboard/`)
**Status:** implemented — data, domain, ui

The **reference implementation** every entity contract follows: `data/batches.ts` is the canonical **fetch → map → derive** module, and `DB_TO_UI_STAGE` (the enum bridge) lives in its mapper. `domain/urgency.ts` computes lifecycle alerts on read (no cron). One RQM code = one batch.

**Concept:** [[Batch Lifecycle]] · [[Data Layer Pattern]]

[[Codebase Map]]
