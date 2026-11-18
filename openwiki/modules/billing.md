---
type: module
title: Billing Engine and Packet Queue
description: Billing as a document-generating engine — the pure rate reference, track and statement builders, the ADR-003 packet projection with derived due dates, and the threshold-signal versus compound-gate split that must stay separate.
tags: [billing, packets, readiness-gate, statements, adr-001, adr-003, fr-09]
---

# Billing Engine and Packet Queue

Billing is the system's most load-bearing workflow and the only one where a wrong number reaches a signed document. ADR-001 (**V2**/**W1**/**AA2**) reversed the MVP's "preparation signal only" framing: the app **generates** the school's own `.docx` templates. Three document types exist — Training Cost, TSF/Allowance, Entrepreneurship — because **TVI-scope** says the Assessment Center bills the Assessment Fee separately, so it is not a track and must not be added as one (`billing_type` in `supabase/migrations/20260910120000_add_adr001_billing_domain.sql` omits it deliberately).

`modules/billing/` holds the `data/` projection, pure `domain/` rules, and the queue plus statement-preview `ui/`. The whole module is deterministic: packets and statements are pure functions of a batch plus its documents, so a change can be unit-tested against a fixed fixture without a database.

## Two signals that must never be merged

`domain/readiness.ts` exports both and the split is the module's most-regressed invariant (stated explicitly in [`modules/billing/README.md`](/modules/billing/README.md)):

- **`isBillingReady(batch)`** — `status === 'ongoing' && progressPct >= BILLING_READY_THRESHOLD` (80). Threshold only, no document component. This is the **prep signal**: `modules/batches/domain/alerts.ts` renders it as the green "reached the billing progress threshold" row and `BatchCard`/`BatchModal`/`TableView` render it as a badge. Because it touches no documents it says nothing about whether the paperwork is in hand, so the alert row's copy must not claim readiness to bill.
- **`billingGate(batch, docs)`** — ADR-001 **§Ready**: threshold reached **and** every required supporting document on file. It returns `thresholdMet`, `docsVerified`, the counts, and `ready` so the UI can show each half with its own text and icon (rule 23). This is the generate-gate: `BillingQueueView` disables "Preview statement" on `selectedCard.gate.ready`, never on the packet's own state chip.

Merging them is the classic regression in both directions: folding documents into `isBillingReady` makes every dashboard badge go quiet for a reason it does not display; dropping the document half from `billingGate` lets a document-less batch generate a statement.

`docsVerified` requires `requiredTotal > 0`. An empty requirement catalog (the route currently passes `[]` — no per-program source is wired, TES-34-adjacent) therefore reads **not verified**, never auto-ready. `tests/unit/billing-readiness.test.ts` pins all four combinations including that zero-requirement case.

Where the two halves meet: `isBillingReady` re-requires `status === 'ongoing'`, so a **completed** batch has `ready: false` even with 100% progress and a full document set. `buildBillingCards` filters completed batches out, so the cards are unaffected; only a caller building a card directly meets the case.

## The rate reference and its fallbacks

`domain/rates.ts` is the ADR-001 **BB1** component table flattened to constants: `TSF_DAY_RATE` 160, `NEW_NORMAL_ASSISTANCE` 1_000, `ACCIDENT_INSURANCE` 100.8, `ENTREPRENEURSHIP_FEE` 800, `NOMINAL_SESSION_HOURS` 8, plus per-qualification nominal hours and training cost. Per **BB1-prune** it holds **current rates only** — no `circular_no`, no `effectivity_date`. Version safety is *not* here: the batch snapshots its matching cost row at creation, so a rate change must never be made by editing history.

Two lookups carry silent fallbacks and both matter for a new qualification:

- `nominalHoursFor` falls back to `DEFAULT_NOMINAL_HOURS` (360) and `trainingCostFor` to `DEFAULT_TRAINING_COST` (15,000). An unmapped qualification therefore bills **without complaint** at a stand-in rate.
- Only the Agricultural Crops ₱15,390 figure is verbatim from the source template; the other per-qualification training costs (and the hours for Cookery) are representative until a real `program_qualification_rates` source lands. Do not treat them as authoritative.

## Tracks: Entrepreneurship is CFSP-only

`domain/tracks.ts` is the **TVI-scope** list. `tracksForProgram` always returns Training Cost and TSF/Allowance and appends Entrepreneurship only when `isCfsp(program)` — a trimmed, case-insensitive `'CFSP'` compare. TWSP routes Entrepreneurship through PAFSE, so on a TWSP batch the tab simply does not exist rather than rendering empty.

Each track carries a `docTitle` for the statement cover. One of them is program-aware at build time: on TWSP the TSF cover reads "Training Support Fund (TSF)" instead of the CFSP title that would claim a New Normal component the program does not pay. Copy on these covers is compliance copy, not cosmetic.

## The statement builder

`domain/statement.ts` — `buildStatement(batch, trackId, tenant)` — is the whole document engine, kept pure so the preview and the eventual `.docx` share one source of truth. It builds the cover header (school, region, uppercased program banner, docTitle, `batch.rqmCode` or `null`, a `${hours} hrs` training period), dispatches on the track, and finalizes with `totalLabel`, `grandTotal` and `grandWords`.

Math per track, all per scholar:

| Track | Per-scholar total |
| --- | --- |
| `training_cost` | `trainingCostFor(qualification)` (flat) — the artefact reproduces the source docx exactly |
| `tsf_allowance` | `tsfDaysFor(qualification) × ₱160` plus, **CFSP only**, `₱1,000` New Normal and `₱100.80` Insurance |
| `entrepreneurship` | `₱800` flat |

`tsfDaysFor` is `Math.round(nominalHoursFor(q) / 8)`, so 360 hours → 45 days → ₱7,200, the ADR-001 §BB1 worked example.

The builder is honest about a missing roster: `batch.scholars_list ?? []` yields a zero-row table and grand total 0 rather than an error. `scholars_list` is **not** part of the batches snapshot — only the report route attaches it via `attachRoster`, and that fetch is already ordered `last_name`, `first_name`, `id`, which satisfies ADR-001 **Order** for a caller holding a report batch. A batch from any other surface previews an empty statement.

Not implemented, and a change must not assume them: ADR-001 **FF2**'s absence deduction on the final tranche (no per-scholar absence count is passed in), **Flag-3x**'s exclusion of dual-trained scholars from the ₱800, tranche percentages, and signatories/letterhead/addressee from `tenant_settings`. The "60 training-day split" and "calendar-duration split" captions on the tracks are portrayal of the ADR's tranche schedules, not a computed ladder.

`domain/amountInWords.ts` renders `grandWords` (**AmtWords**): "… Pesos and NN/100 only", with centavos padded to two digits. A negative or non-finite amount collapses to "Zero Pesos only" rather than emitting a malformed string.

## The packet projection

`domain/packets.ts` implements ADR-003 **P1**: a packet is a **projection** of `(batch_id, billing_type, tranche_no)`, not an entity and not an invoice. There is no ledger, no envelope, no balance — **NoLedger** is preserved because the TESDA Provincial Office reconciles. The table does not even store that key today: `buildPackets` emits one packet per batch and numbers the display-only `ref` as `PKT-NNN`, so the ref is stable only by position and a `filterPackets` on it searches a number that means nothing outside the screen. A user searching `INV-042` finds nothing.

There is **one packet per batch** — the type and tranche axes are not yet in the projection.

`state` is derived, not read:

- `settled` when `batch.status === 'completed'` (and the due label becomes "Settled") — a prototype portrayal, since no state store exists;
- `ready` when there are no blockers;
- `draft` otherwise.

Blockers are human sentences assembled from two conditions: progress below `PACKET_READY_THRESHOLD` (80, the same number as the gate threshold, declared separately), and unsatisfied supporting documents. If the requirement list itself is empty the blocker is "catalog unavailable" instead — an unevaluated checklist must never look satisfied. The detail panel prints `blockers.join(' ')` and is the only place a reader learns why a packet is stuck.

### Pre-billing document scope

`PRE_BILLING_STAGES = ['aou', 'ntp', 'tip', 'train']` deliberately excludes `assess` and `bill` stage documents, because billing *produces* those and requiring them would make readiness circular and leave Generate permanently dead. `data/billing.ts` holds the same set as `SUPPORTING_DOC_STAGES` and additionally requires `r.critical`, so only critical pre-billing requirements reach the denominator.

Both surfaces route through `isDocOnFile` in `modules/documents/domain/compliance.ts`, one of the many consumers of the single document-compliance rule. Under ADR-004 **D4** gating inverts the measurement rule: an **untracked** requirement (no record on the batch at all) reads as not on file, never satisfied. `pending` is likewise unsatisfied; `submitted` **is** satisfied, because ADR-001 §7.2.4 accepts an uploaded manual attendance sheet as billing evidence, so verification is not a release blocker. A packet doc keeps `'untracked'` as its own status and renders "not tracked" rather than being flattened into `missing`, which would assert a document is absent that nobody ever recorded.

Note the double scope closure: the queue builds its `docs` from the passed `requirements` filtered by stage, while `deriveDocReadiness` filters the same list again. An empty list makes both read closed-and-blocked independently — neither gate opens on an unloaded catalog.

### Due dates and overdue are derived (P5)

`daysToDue` is `batch.daysToBilling`; the label is "Nd past due" / "Due today" / "Due tomorrow" / "Due in Nd". Nothing stores a due date; `isOverdue` is `state !== 'settled' && daysToDue < 0`, so the screen inherits the route's "Data as of" stamp instead of drifting. ADR-008 **BD5** leaves this untouched: its recorded `batches.billing_deadline` is the coordinator's batch-level commitment and its dashboard urgency is a separate read; a packet's due date stays derived even though nothing derives it from a tranche schedule yet.

Consequence to know before changing this: `daysToBilling` is computed by the mapper with `daysUntil(row.billing_deadline ?? null)`, and `daysUntil(null)` returns the `Infinity` sentinel. A batch with **no recorded deadline** therefore carries `daysToDue: Infinity` and renders the literal label "Due in Infinityd", and `summarizePackets` counts it as neither ready-pending nor overdue. `urgencyTier` already maps a non-finite value to `muted`; the packet formatter does not.

`summarizePackets` sums over the projection into four tiles (ready, awaiting docs, overdue, recorded paid) and excludes overdue packets from the ready and pending buckets. "Recorded as paid" is an **observation** total (P3/P6), labelled "marked settled by a coordinator", never a reconciliation. Nothing in the module writes any state; closing the preview even toasts "nothing was saved".

### Packet lifecycle

`draft → ready → generated → submitted → settled` (ADR-003 **P2**). Only `ready → generated` would write the append-only `billing_records` snapshot; `submitted` and `settled` are a person's marks (P3). Of the five, only `draft`, `ready`, and `settled` are ever produced by `buildPacket`.

## The data projection

`data/billing.ts` is the only place the screen's inputs are assembled: `deriveDocReadiness` (critical pre-billing requirements only, via `isDocOnFile`), then `billingGate`, `tracksForProgram`, and `resolveTenant`. `BillingCard` carries the whole `Batch` precisely because the statement modal needs it.

`resolveTenant(batch.tenantId, [])` is called with an **empty tenant list**, so the statement cover prints the raw tenant UUID as the school name and leaves the region blank. RULES.md rule 6 forbids leaking internal IDs to the UI; this is a known breach on a document-shaped surface, not a design choice, and passing the route's `resolved.profile.tenants` is the fix.

`buildBillingCards` drops completed batches (their billing is history) and sorts ready-first then by descending progress.

## Route and access

`app/(dashboard)/t/[tenantCode]/(sections)/billing/page.tsx` is a thin Server Component: `requireScope`, the trusted-role redirect, `getBatchesSnapshot`, then packets and cards. `/(dashboard)/billing` is only a `legacyRoute('billing')` forwarder to the caller's default school.

**The trainer denial** runs on `resolveTrustedRole(dbRole)` — `profiles.role` only — and `redirect('/trainer')` fires **before** the batch fetch, so no billing figure is ever serialized into a trainer's payload (rule 5, the omission half; see [auth-and-provisioning](/openwiki/modules/auth-and-provisioning.md)). `?role=` is presentation only: `toOfficeRole(await resolveRouteRole(params, dbRole))` runs *after* the redirect and picks the render variant, so a real trainer adding `?role=admin` still lands on `/trainer`. Any unresolved or non-office role — including a previewed `trainer`, for which the view has no variant — falls back to `viewer`.

The consequence is that the view's own `canWrite` (hidden Generate/Preview buttons, read-only banner) is usability. RLS is the boundary: the `billing_records` policies grant SELECT to an explicit `admin, coordinator, viewer` allowlist — deliberately **not** `can_read_batch`, which would admit an assigned trainer — and INSERT only to `can_manage_tenant`, with no UPDATE or DELETE policy at all, so append-only is enforced by the database rather than by convention.

Guard ordering follows rule 19: `syncFailed && batches.length === 0` returns the retry state before the "No batches to bill yet" empty state, so a failed fetch can never read as an empty queue. `?state=` forces `denied`, `empty`, `sync-failed`, or `stale`; `?role=` never reaches the redirect.

## Failure modes worth knowing

- **Merging the two signals** — see above; also makes the alert row claim document readiness it never checked.
- **Adding `assess`/`bill` to `PRE_BILLING_STAGES`** — Generate goes dead for every batch.
- **Treating untracked as satisfied** — a batch whose catalog never mentioned a document passes a gate nobody verified; do not "fix" this by mapping untracked to `submitted`.
- **Unmapped qualification** — falls back to 360 hours / ₱15,000 and bills silently; check the fallback was intended before adding a qualification, and add the row rather than editing the fallback.
- **Assuming a stored state or a ledger** — a reload forgets nothing because nothing was stored: a `settled` packet derives its state from the batch's status, and Generate writes no `billing_records` row yet.

## Planned surface — do not assume it exists

- `.docx` population (ADR-001 §W1) and the append-only `billing_records` generation log (only its table and RLS policies exist in the migration; no code queries or writes it).
- The 20/50/80 (`7.2.3`) TSF and 5.1.x Training Cost tranche ladder with per-tranche document checklists (**LL1**); the screen shows a single compound gate.
- Per-program requirement catalog on the wire, real tenant list, a real `billing_records` fetch behind the same `BillingCard` shape, FF2 absence deduction, and signatory/letterhead population from `tenant_settings`.

Tests: `tests/unit/billing-readiness.test.ts` is the only direct coverage and pins the gate matrix. There is **no** test for `buildStatement`, `pesosInWords`, `tsfAmount`, or `buildPackets` — the math that reaches a document is currently unpinned, so a golden-file fixture per track is the cheapest real protection.

The end-to-end walk from projection to rendered preview is [billing-packet-and-statement](/openwiki/workflows/billing-packet-and-statement.md); the document status ladder and evidence upload are [documents-and-evidence](/openwiki/modules/documents-and-evidence.md); `daysToBilling`, urgency, and the ADR-008 deadline live in [batches-lifecycle-dashboard-and-alerts](/openwiki/modules/batches-lifecycle-dashboard-and-alerts.md).