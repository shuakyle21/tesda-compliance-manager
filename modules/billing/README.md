# modules/billing — Billing Engine and Readiness (FR-09, ADR-001)

Billing is a **document-generating engine** (ADR-001 supersedes any "preparation signal only" wording): TSF/Allowance, Training Cost, Entrepreneurship — populated `.docx` templates. Assessment Fee is out of scope.

## Contents
- `domain/readiness.ts` — `BILLING_READY_THRESHOLD`, `isBillingReady` (progress-threshold readiness flag)

## Planned
- `domain/` — the billing document engine: pure domain logic over snapshotted data, deterministic, unit-testable with fixed as-of dates (supersedes the deleted empty `lib/domain/billing.ts` stub; see docs/adr/ADR-001-billing-and-domain-model.md and TES-64..67)
- `data/billing.ts` — `billing_records` generation log (planned table, ADR-001 §11)
- Trainer role must never see this module's output (server-side omission, not CSS hiding).
