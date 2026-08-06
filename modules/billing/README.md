# modules/billing — Billing Engine and Readiness (FR-09, ADR-001)

Billing is a **document-generating engine** (ADR-001 supersedes any "preparation signal only" wording): TSF/Allowance, Training Cost, Entrepreneurship — populated `.docx` templates. Assessment Fee is out of scope.

## Contents
- `domain/rates.ts` — ADR-001 §BB1 rate reference (TSF ₱160/day, New Normal ₱1,000, Insurance ₱100.80, Entrepreneurship ₱800, per-qualification Training Cost) + `tsfDaysFor` / `trainingCostFor` / `nominalHoursFor` helpers. Current rates only — version-safety lives in the batch snapshot.
- `domain/tracks.ts` — the three TVI billing tracks; `tracksForProgram` gates Entrepreneurship to CFSP.
- `domain/amountInWords.ts` — `pesosInWords`, the cover-statement amount-in-words (§AmtWords).
- `domain/statement.ts` — `buildStatement(batch, track, tenant)`: the pure engine that computes per-scholar rows, per-component summary, grand total, and words for one document. Deterministic → unit-testable with a fixed batch fixture.
- `domain/readiness.ts` — `BILLING_READY_THRESHOLD` + `isBillingReady` (threshold-only prep signal the **dashboard** counts) **and** `billingGate` (the ADR-001 §Ready compound gate: threshold AND supporting docs verified). Keep the two separate — the dashboard metric and the screen's generate-gate mean different things.
- `data/billing.ts` — derives billing cards (doc-readiness + gate + program-aware tracks + tenant context) from a batch + the document matrix. Slot a real `billing_records` fetch (ADR-001 §11) in here behind the same shape when the table lands.
- `domain/packets.ts` — the ADR-003 packet-queue projection: `buildPackets`, packet states (`draft → ready → generated → submitted → settled`), derived due dates, TSF amounts, `summarizePackets`/`filterPackets`.
- `ui/BillingQueueView.tsx` — the Billing screen (Figma 840:5128): packet table + summary metrics + selected-packet detail panel, and (TES-70) the statement-preview open points. The former standalone `BillingView` card screen was superseded by this queue and deleted — one landing surface, not two.
- `ui/BillingStatementModal.tsx` — the statement preview: tabbed tracks, cover header, computed table, total, amount-in-words. The document-generating surface (resolves QA report C4). Opened from the queue's "Generate packet" / "Preview statement" actions, gated by `billingGate`.

Route: `app/(dashboard)/billing/page.tsx` — server-side role gate (trainers redirected away; viewers read-only), `?role=`/`?state=` preview overrides, "Data as of" stamp. Projects packets (queue rows) and derives billing cards (statement inputs) from the same batch snapshot.

## Planned
- Real `.docx` template population + the append-only `billing_records` generation log (ADR-001 §11; the ₱137k→₱145.2k re-generation story).
- The 20/50/80 tranche ladder (§7.2.3) with per-tranche document checklists — the screen currently shows the compound gate, not the full ladder.
- Live `rqm_code` / nominal-hours on the batch contract (currently synthesized for display, clearly-mock, per ADR-002).
