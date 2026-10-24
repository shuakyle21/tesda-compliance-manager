# ADR-008 — Recorded Batch Billing Deadline (dashboard operational signal)

Status: Proposed — awaiting product sign-off and the migration's application
Date: 2026-10-24
Owner: Product + System Architecture
Amends: [[ADR-003-billing-packet-queue]] **P5** — for the **batch-level** billing
deadline only. Packet `due_date` (per `(batch, billing_type, tranche)`) stays
derived, never stored, exactly as P5 says. NoLedger and JJ1 are unchanged.

## Context

The dashboard counted billing urgency down from `batches.end_date` — the
*training* end date — because no billing deadline existed anywhere. Migration
`20260910120000` refused to add one, citing P5 ("`due_date` is derived, never
stored"), and named the `end_date` substitution as a mapper bug to fix.

It was not fixed, and the consequence was observed live on 2026-10-24
(`docs/DASHBOARD_DESIGN_AUDIT_2026-10-24.md` §2a): a batch that finished training
in December 2025 drove the "Earliest Billing" card as `Dec 15 · -313 days
left`, and every ongoing batch past its training end raised a critical
"billing window opens in -138 days" alert.

P5's derivation needs a tranche schedule (§4.1 TSF, §4.2 Training Cost) that is
not populated for any live batch, so "derive it instead" has nothing to derive
from today. The dashboard improvement plan (2026-10-24) therefore calls for a
canonical, recorded `billing_deadline` on the batch.

## Decision

| ID | Decision |
| --- | --- |
| **BD1** | `batches.billing_deadline date` (nullable) records the **batch's** billing submission deadline as an operational commitment entered by a person. Migration `20261024110000_add_dashboard_operational_fields.sql`. |
| **BD2** | **Null means "not recorded"**, never "no deadline" and never inferred from `end_date`. Every surface renders it as an explicit unavailable state; the dashboard's Needs-attention queue lists open batches with no recorded deadline as one data-gap item. |
| **BD3** | Urgency is computed on read from `billing_deadline` against the snapshot's fetch time (`urgencyTier`, with a new `overdue` tier for negative days). Nothing about urgency is stored. |
| **BD4** | A deadline counts only while the batch has an **open billing obligation** (`hasOpenBillingObligation`: not completed, billing report not verified, billing stage not done). |
| **BD5** | **Packet `due_date` is untouched**: still derived per tranche (P5). When tranche schedules are populated, a packet's derived due date is authoritative for that packet; the batch deadline stays the coordinator's single "when is this batch's billing due" commitment. If the two must reconcile, that is a future ADR. |

## Consequences

- Until the migration is applied, the column is absent; the mapper reads
  `row.billing_deadline ?? null`, so every batch shows "not recorded" — honest,
  and the reason the dashboard shows no countdown yet.
- Someone must enter deadlines. There is no import or edit path for this
  column yet; adding one is follow-up work.
- `lib/supabase/database.types.ts` carries the column by hand ahead of the
  migration; regenerate after applying it (RULES.md rule 20).

## Applying

Not applied. RULES.md rule 36: no statement runs against the live project
without explicit permission. Apply with `apply_migration` only on a yes, then
rename the file to the version Supabase records (see ADR-007's note on
recorded versions).
