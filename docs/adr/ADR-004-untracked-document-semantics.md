# ADR-004 — Untracked document semantics (a batch with no tracked document records)

Status: Accepted
Date: 2026-08-27
Owner: System Architecture
Linear: TES-94 (follow-up from TES-93)
Relates to: [[ADR-001-billing-and-domain-model]] §5 (Ready / readiness gate),
[[ADR-003-billing-packet-queue]] P2 (`draft → ready`)

## Context

`Batch.documents` is a `Record<string, DocRecord>` keyed by `document_key`.
Several surfaces count documents off it — the dashboard Doc Compliance KPI, the
document status donut, the batch table's `n/m` cell, the documents matrix,
analytics, and the two billing readiness gates. Each had encoded its **own**
private answer to "what does it mean when there is no record for a required
document?":

| Site | Old answer |
| --- | --- |
| `getMockMetrics` (`shared/mocks/index.ts`) | absent ⇒ **verified** (counted as compliant) |
| `app/(dashboard)/dashboard/page.tsx` | patched around the above with a local `docsTracked` guard so the KPI could show "—" |
| `DocumentStatusDonut` | absent ⇒ skipped, but an all-absent set still printed **0%** |
| `TableView`, `DocumentsView` | absent ⇒ **TypeError** (unguarded `documents[key].status`) |
| `AnalyticsView` | absent ⇒ **not verified** (plotted as a low compliance score) |
| `billing/data/billing.ts`, `billing/domain/packets.ts` | absent ⇒ **missing** (gate closed) |
| `AlertsPanel` | *no answer — see below* |

**On `AlertsPanel`.** TES-94 names it as a third disagreeing site (skipping the
missing-critical-docs check when `documents` is empty, so it emits no alert).
No such check exists: on `main` and on this branch `AlertsPanel` renders
`ALERTS_LOG` and nothing else, and its only commit is the TES-68 module move.
The TES-93 change the issue describes is not in the tree. So there was nothing
to reconcile there, and this ADR deliberately does **not** invent a
missing-docs alert to reconcile it *to* — what an alert should say about an
untracked document is a product decision about alerting, not about document
semantics, and it belongs to whichever issue actually lands that check. When it
does, D2/D4 already answer it: an untracked document is not evidence of
non-compliance, so it must not raise a missing-docs alert; the *gate* it blocks
is what surfaces (D4).

Two facts sharpen the question:

1. **The data layer already decided half of it.** TES-30 closed the documents
   `TODO(join)`: `mapDocumentsMap` (`modules/batches/data/batches.ts`) and
   `mapDocumentRows` (`modules/documents/data/documents.ts`) backfill every key
   in the batch's *own* program requirement catalog to a real `DocRecord`, so a
   requirement with no submitted row resolves to `'missing'`. That decision
   stands; this ADR ratifies it rather than re-opening it. (TES-94's premise
   that "every live-fetched batch has an empty documents map by construction"
   is therefore stale — the second of its two stale premises, alongside its
   description of `AlertsPanel` above.)
2. **The remaining gap is a catalog mismatch, not a sync gap.** The UI iterates
   the 12-key mock catalog in `shared/mocks/seed.ts`, while live maps are keyed
   by the migration's 8 DB keys, and the two only partly overlap
   (`training_sched` vs `training_schedule`, `billing_rpt` vs `billing_report`).
   So a *non-empty* map can still lack a key the caller asks about. A batch whose
   program has no requirement rows at all (or a null program join) produces a
   fully empty map.

## Decision

**A requirement with no record on a batch is `untracked` — a third state, equal
to neither `verified` nor `missing`.**

| ID | Decision |
| --- | --- |
| **D1** | **Present key ⇒ its record's status.** The data layer guarantees every key in the batch's own catalog resolves to a real `DocRecord` (no row ⇒ `'missing'`). Callers never re-decide this. |
| **D2** | **Absent key ⇒ untracked.** Untracked is **excluded from measurement entirely** — out of the numerator *and* the denominator of every compliance figure. It is never counted as verified (which would read as a cleared checklist) and never reported as missing (which asserts a document is absent when nothing was ever required or recorded). |
| **D3** | **Nothing tracked at all ⇒ unknown**, expressed as `null`, never `0` and never `100`. The UI renders `—` plus words that say why, never a percentage. |
| **D4** | **Gates invert D2: untracked is *not satisfied*.** Billing readiness and packet blockers treat an untracked document as not on file. A gate must never open on evidence nobody recorded. Measurement declines to judge; gating fails closed. Both directions fail safe — they are opposite because the questions are opposite. |
| **D5** | **Untracked is represented as *absence*, not as a `DocStatus` variant.** `DocStatus` mirrors the DB enum and is assigned straight off the row, so a UI-only member no row can produce would force every consumer to handle a phantom case. The one exception is `PacketDoc.status` (`DocStatus \| 'untracked'`), a derived projection type that is not assigned from a row. |
| **D6** | **The rule lives in exactly one module:** `modules/documents/domain/compliance.ts`. Every surface that counts documents reads through it (`docRecordFor`, `isDocTracked`, `isDocOnFile`, `summarizeDocCompliance`). Indexing `batch.documents[key]` directly outside a `data/` layer is the pattern this ADR exists to remove. |

## What does not change

- **The readiness gate** (ADR-001 §5 / ADR-003 P2) — still *threshold reached
  AND that tranche's supporting docs on file*. D4 keeps every previously-closed
  gate closed; no batch becomes generatable that was not before.
- **`DocStatus`** and the DB `document_status` enum — untouched (D5).
- **The mock and DB requirement catalogs stay separate.** Merging them would
  paper over a real mismatch; see the note in
  `modules/documents/data/documents.ts`. This ADR makes the mismatch *legible*
  ("not tracked") rather than fatal (a TypeError) or dishonest (100%).

## Consequences

- `getMockMetrics` moved out of `shared/` and became
  `deriveDashboardMetrics(batches, requirements)` in
  `modules/batches/domain/metrics.ts`. It had to: the doc-compliance half now
  consults `modules/documents/domain/compliance.ts`, and `shared/` may not
  import `modules/`. It was also misnamed — the dashboard had been feeding it
  **live** batches since TES-8. Same precedent as TES-68 moving `urgencyTier`
  and `isBillingReady` out of `shared/`.
- `DashboardMetrics.docCompliancePct` is now `number | null`. Every consumer
  must handle the null (unknown) case; the type makes forgetting a compile
  error.
- Two real crashes are fixed: `TableView` and `DocumentsView` threw a TypeError
  on any batch whose catalog lacked a key the mock catalog names. TES-94's
  assessment that all sites "fail safe" did not hold for these two.
- Screens gain a fourth thing to say. Copy is fixed vocabulary: **"Not
  tracked"** for a cell, **"n of m tracked"** for a partial set, **"—"** with
  **"document sync pending"** for none. Never colour alone (RULES §4).
- The dashboard's local `docsTracked` patch is gone — the KPI reads
  `metrics.docCompliancePct === null` instead.

## Related

- [[ADR-001-billing-and-domain-model]] — §5 readiness gate upheld by D4
- [[ADR-003-billing-packet-queue]] — P2 `draft → ready` unaffected
- `modules/documents/domain/compliance.ts` — the implementation of D1–D4, D6
- `tests/unit/doc-compliance.test.ts` — the rules as executable assertions
