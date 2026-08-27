# modules/import-export — CSV Import and Export (FR-10)

## Implemented
- `domain/csv.ts` — pure RFC 4180 CSV parser (no dependency; format is small enough not to justify one)
- `domain/learnerImport.ts` — pure header/row validation and ULI-keyed reconciliation against existing learners
- `data/learnerImport.ts` — `importLearnersCsv(batchId, csvText)`: fetch existing learners → reconcile → insert/update

Scope: the `learners` table only carries `learner_no`, `uli`, names, and `assessment_result` — this
pipeline imports that column set, not the full T2MIS/BSRS report shape (sex, DOB, employment, etc.
would need a schema migration first). Reconciliation is application-side (`reconcileWithExisting`,
matched on ULI) because `learners`' only unique constraint is `(tenant_id, batch_id, learner_no)` —
there's no unique index on `uli` for Postgres to target with an upsert's `ON CONFLICT`.

Unverified: no Supabase env is configured in this environment, so the write path
(`importLearnersCsv`) is typechecked but has never executed against a live database. The domain
layer (parser, validator, reconciler) is unit-tested in `tests/unit/learner-import.test.ts`.

## Planned
- `ui/` — import trigger + result summary (not yet built)
- Export triggers (the "Export" half of FR-10)
