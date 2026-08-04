# ADR-003 — Billing Packet Queue (tracking layer over the generation engine)

Status: Accepted
Date: 2026-08-01
Owner: Product + System Architecture
Amends: [[ADR-001-billing-and-domain-model]] §4 (billing general model), §9 (alerts)
Source authority: Figma **TVI-CAMS** (`vZKyWXSipBHmiQFuHl5e1O`) node `840:5128`
— "TVI-CAMS — Billing", added 2026-08.

## Context

ADR-001 modelled billing as a **document-generating engine**: the app populates
the school's `.docx` templates (W1), appends an immutable snapshot per
generation (NoLedger / Y-hybrid), and deliberately keeps **no ledger** because
the TESDA Provincial Office reconciles totals.

The new Figma billing design introduces surface that ADR-001 has no vocabulary
for. It shows a queue of identified packets (`INV-042`…), a **due date** per
packet, and four money tiles — Ready, Pending review, **Overdue**, and **Paid
this cycle** — plus a **Send reminder** action.

Read literally, three of those conflict with locked decisions:

| Design element | Conflicts with |
| --- | --- |
| Invoice as a first-class entity | **NoLedger** — `billing_records` is a generation *log*, not an AR ledger |
| "Paid this cycle" | **NoLedger** — payment reconciliation is the TESDA PO's job |
| "Send reminder" | **JJ1** — alerts are computed on read; no cron, no email |

This ADR admits the tracking surface **without** reversing NoLedger or JJ1, by
modelling the queue as a *projection* rather than a new financial system of
record. Where the design's literal reading could not be preserved, the deviation
is recorded below (P4) rather than silently implemented.

---

## Decisions

| ID | Decision |
| --- | --- |
| **P1** | A **billing packet** (the design's "invoice") is **not a new entity**. It is the projection of one `(batch_id, billing_type, tranche_no)` triple — the same key ADR-001 §4.1/§4.2 already tranches on. Its identity is derived, and the `INV-0NN` reference is a **display label only**, never an accounting document number. NoLedger is preserved: no envelope, no balance, no double-entry. |
| **P2** | A packet moves through **`draft → ready → generated → submitted → settled`**. Only **`generated`** writes to `billing_records`, and it writes exactly the append-only snapshot ADR-001 already specifies (Y-hybrid unchanged — re-generation appends, never overwrites). |
| **P3** | **`submitted` and `settled` are user-asserted bookkeeping marks**, not system-verified facts. They record what the coordinator observed happening *outside* the app. TESDA SIS/T2MIS/BSRS remain the authoritative systems; the UI must label these as recorded-by-a-person, and must never imply TESDA approval or an official submission workflow. |
| **P4** | **The design's "Send reminder" is implemented as in-app follow-up only.** It raises an entry in the existing notifications surface for the responsible party. It does **not** send email and does **not** schedule anything — **JJ1 is unchanged.** UI copy therefore reads **"Flag for follow-up"**, not "Send reminder". *This is a deliberate deviation from the Figma label.* |
| **P5** | **`due_date` is derived, never stored** — computed on read from the batch's tranche schedule (§4.1 TSF, §4.2 Training Cost) exactly as urgency already is. "Overdue" is a comparison against the screen's as-of date, so it inherits the existing "Data as of" stamp rather than becoming stored state. |
| **P6** | The four money tiles are **sums over the projection**, not stored aggregates: Ready = packets at `ready`; Pending review = `draft` blocked on unverified docs; Overdue = `ready`/`generated` past derived due date; **Paid this cycle** = packets marked `settled` (P3) within the current cycle — an **observation total, not a reconciliation**. |
| **P7** | The queue and TES-70's Billing Statement preview are **complementary, not competing**: the queue is the index (which packet, how much, what's blocking), the statement preview is the generated document for one packet. Selecting a packet opens the existing statement flow. |

## What does not change

- §4.1 / §4.2 tranche math, thresholds, and the FF2 absence deduction.
- **NoLedger** — still no envelope guard, still no over-billing enforcement.
- **JJ1** — still computed on read, still no cron and no email (see P4).
- **Ready** (§5) — still *threshold reached AND that tranche's supporting docs
  verified*. The queue surfaces this gate; it does not relax it.
- **TVI-scope** — the Assessment Fee is still out of scope and must not appear
  in the queue.

## Consequences

- The billing screen gains a portfolio-level view ADR-001 did not previously
  justify, which is the main product win: readiness is currently only visible
  per batch.
- "Paid this cycle" will be **incomplete by construction** — it reflects only
  what someone remembered to mark. It must be presented as a working note, never
  as a financial figure to be relied on. If it is ever needed as a real number,
  that is a new decision requiring a remittance source, not a UI change.
- P4 means the shipped screen deliberately differs from the Figma label. Anyone
  re-syncing the design should not "fix" this back.

## Related

- [[ADR-001-billing-and-domain-model]] — §4 amended by P1–P7; §9 upheld by P4
- [[ADR-002-design-prototype-portrays-adr-001-target]] — prototype fidelity rule
- [[MASTER_PRD_SRS]] — FR-09
