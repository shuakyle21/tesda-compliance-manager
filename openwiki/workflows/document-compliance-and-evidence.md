---
type: workflow
title: "Workflow: Requirement Catalog → Blocker or Verified Evidence"
description: The chain from a program requirement catalog to a counted blocker, a closed gate, or an uploaded-and-signed evidence object — the missing → pending → submitted → verified order, ADR-004's untracked third class, which surface shows which number, and where the footprint changes.
tags: [documents, compliance, evidence, adr-004, lifecycle, workflow]
sources:
  - id: openwiki-source-9c4f624af786337110d6df8a
    resource: repo://docs/adr/ADR-004-untracked-document-semantics.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-9244ced37838980939ffbdc8
    resource: repo://modules/batches/domain/alerts.ts
  - id: openwiki-source-6af3f09918cb46eabe775144
    resource: repo://modules/batches/domain/metrics.ts
  - id: openwiki-source-2cad937ecfecf0d996572e65
    resource: repo://modules/batches/ui/KpiSummary.tsx
  - id: openwiki-source-9a24e697708df788c06f44e3
    resource: repo://modules/billing/data/billing.ts
  - id: openwiki-source-24135802ec9b42acc8123951
    resource: repo://modules/billing/domain/packets.ts
  - id: openwiki-source-59b33492a169d8eadf1c8ad1
    resource: repo://modules/billing/domain/readiness.ts
  - id: openwiki-source-fed00d96acb205744511b2bb
    resource: repo://modules/documents/data/documents.ts
  - id: openwiki-source-05b5b2c042bb4f3b47496b1f
    resource: repo://modules/documents/data/evidence.ts
  - id: openwiki-source-764eda3eb972fdc48c5584a5
    resource: repo://modules/documents/domain/compliance.ts
  - id: openwiki-source-be3f0a5796d4e999957e9c91
    resource: repo://modules/documents/domain/evidencePath.ts
  - id: openwiki-source-525a243a36a2c3f766101dd7
    resource: repo://modules/documents/README.md
  - id: openwiki-source-fddaa3a3b7b0306dccc1c813
    resource: repo://modules/documents/ui/DocumentsView.tsx
  - id: openwiki-source-03656dd9cbbc89345a506c19
    resource: repo://supabase/migrations/20260528160300_create_tenant_scoped_schema.sql
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-2020074c6fdeab02aae020b7
    resource: repo://tests/unit/batches.test.ts
  - id: openwiki-source-892600aba8a4baaca4ccc7a9
    resource: repo://tests/unit/doc-blockers.test.ts
  - id: openwiki-source-dcc0272e0da8a35716ea3b26
    resource: repo://tests/unit/doc-compliance.test.ts
  - id: openwiki-source-4029f22d57710f525e978978
    resource: repo://tests/unit/evidence-path.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T03:56:44.398Z" }
---

# Workflow: Requirement Catalog → Blocker or Verified Evidence

A `program_document_requirements` catalog resolves into a `documents` map on each batch and then runs
through one state order — `missing` → `pending` → `submitted` → `verified` — plus a fifth, off-ladder
answer for a key the batch never carried. Four of those five states are `DocStatus` values mirroring the
DB `document_status` enum ([canonical migration](/supabase/migrations/20260528160300_create_tenant_scoped_schema.sql));
the fifth, ADR-004's **untracked**, is represented as *absence* and has no enum member
([D5](/docs/adr/ADR-004-untracked-document-semantics.md)).

The workflow is therefore an *order*, not a table shape. Two things break it silently: a transition that
jumps a state, and code that folds untracked into `'missing'`. Either one moves a blocker count with no
type error, no test failure outside the domain specs, and no visible trace on screen.

`modules/documents/domain/compliance.ts` is the only module allowed to interpret a key
([D6](/docs/adr/ADR-004-untracked-document-semantics.md), RULES.md rule 8); `domain/` is public across
modules because `eslint.config.mjs` restricts only `data/`, which is why every counting and gating surface
can import it and none indexes `batch.documents[key]` anymore. Both halves of this page's
domain are pure (RULES.md rule 14) — no clock, no network — and that is load-bearing: the fixed-date
specs cannot pin a branch that reads either.

```mermaid
stateDiagram-v2
    [*] --> missing: catalog backfill, no row
    [*] --> untracked: key absent (outside the batch's catalog)
    missing --> pending: record submitted for review
    pending --> submitted: upload lands
    submitted --> verified: admin accepts
    verified --> submitted: verified record replaced
    untracked --> missing: catalog catches up, then backfill
    note right of untracked
        Not a DocStatus. Counts as a blocker; leaves the denominator.
    end note
```

*Advancing is a data change; the ladder itself is decided in one module. `verified` sits above every
gate, so a regression to `submitted` costs a gate nothing (see below).*

## Where the keys come from

Both producers of `Batch.documents` backfill first, overlay second: `mapDocumentsMap`
(`modules/batches/data/batches.ts`) and `mapDocumentRows` (`modules/documents/data/documents.ts`) write
`MISSING_DOC` for every key of the embedded program's catalog, then overwrite with real rows. "No
submitted row" is settled at the data layer ([D1](/docs/adr/ADR-004-untracked-document-semantics.md)),
not by each caller. Only a key still absent afterwards — one *this* batch's catalog never listed — reaches
the domain layer, and only there becomes untracked.

Two ways that survives in production:

- **Partial catalogs.** `DocumentsView`'s columns are `requirementCatalogOf(batches)`, the union across
  every shown program, so a Program A requirement is untracked on a Program B column by construction.
  `deriveDashboardMetrics` instead reads each active batch's own catalog — see
  [the module reference](/openwiki/modules/documents-and-evidence.md) for the split.
- **Empty catalogs.** A batch whose program join is null, or whose program has no requirement rows, carries
  one. The **billing route still passes `const documentRequirements: DocumentRequirement[] = []`**, because
  `Batch` carries no program id to fetch a real one with.

The catalog is also *deployment* state, not a constant. `documents` ships with no unique key on
`(batch_id, document_key)`; the dev seed adds `documents_batch_id_document_key_key` with a warning that a
real upload path would otherwise duplicate rows silently.

## The split point

`docRecordFor(batch, key)` returns the record or `null`, and every branch hangs off that one return. The
two directions are deliberately opposite and both fail safe: **measurement** drops `null` from numerator
and denominator, so nothing tracked yields `null` from `pct()` ([D2, D3](/docs/adr/ADR-004-untracked-document-semantics.md));
**gating** treats `null` as not satisfied, because a gate must never open on evidence nobody recorded
([D4](/docs/adr/ADR-004-untracked-document-semantics.md)).

`tests/unit/doc-blockers.test.ts` pins the disagreement end to end: one verified requirement plus one
untracked measures `onFilePct: 100` while `blockerCount` returns 1. "100% compliant and still blocked" is
the correct answer, so aligning the two is the regression to watch.

On the gate side, `isDocOnFile` is
`record !== null && ON_FILE_STATUSES.has(record.status)` with `ON_FILE_STATUSES = {verified, submitted}`.
`submitted` clears a gate without ever being verified (ADR-001 §7.2.4 accepts the uploaded manual
attendance sheet as billing evidence), so **verification is not a release blocker** — a document that
slips back down the ladder costs no gate anything.

`blockerReasonFor` is the inverse and returns its own narrow vocabulary — `'untracked' | 'missing' |
'pending'`, not a `DocStatus` subset, because `untracked` is a state no row can carry. `blockingDocuments`
collects it, partitions criticals first with two filters rather than a comparator, and surfaces `count`
and `criticalCount`; `blockingDocumentNames` maps to `label` because FR-06 AC-1 forbids rendering a key.

## Which blocker surface is live

- `blockingDocuments`, `blockerCount` and `blockingDocumentNames` have **no UI caller** — grep across
  `modules/` finds only `compliance.ts` and the two specs. The intended consumer is the batch card's badge
  next to the named strip, and it is currently unrendered.
- The count that actually reaches a coordinator is the dashboard KPI's `docMissing`, sourced from
  `deriveDashboardMetrics` → `summarizeOwnCatalogCompliance` → `summarizeBatchDocCompliance` and rendered
  by `KpiSummary.documentStatus` as `"{docMissing} required missing"`. It counts **tracked-missing
  criticals only** — an untracked requirement blocks in the strip model but is excluded from `docMissing`
  and only totals separately in `docUntracked`. So the screen under-reports blocking by exactly the
  untracked count. The KPI's value is honest when nothing is tracked (`'—'` plus "Not yet tracked"), but
  the `sub` line beside it is computed anyway, so a zero reads as "0 required missing" over a set that may
  be wholly untracked.
- The dashboard's document panel renders only the *tracked* picture: `DocumentStatusDonut` prints
  `summary.onFilePct` in the ring centre, returns `null` when nothing is tracked, and carries the untracked
  figure only in its metadata line — so it and the KPI above it can disagree about which number is "it".
- `SchoolsOverview` and `TableView` already do the RULES.md rule 23 thing: `'Not tracked'` text and `'—'`
  with an info icon plus an untracked `title`, never a zero.
- `batchAlerts` fires the missing-critical-docs row only when `tracked > 0 && missing > 0`, so untracked
  keys raise nothing and a catalog-less batch is silent for documents.

None of these agree on a unit. If the strip is wired, the KPI should adopt it rather than keep growing a
parallel count.

## Gating destinations

An untracked or non-on-file requirement travels to four gates, each of which keeps it closed:

| Gate | Read | Untracked outcome |
| --- | --- | --- |
| `deriveDocReadiness` (`billing/data/billing.ts`) | `isDocOnFile` over critical `aou/ntp/tip/train` | denominator keeps the slot, `verified` does not move, `billingGate` stays shut |
| `buildPacket` (`billing/domain/packets.ts`) | `docRecordFor` for `status`, `isDocOnFile` for `satisfied` | `PacketDoc.status === 'untracked'` (the one `DocStatus \| 'untracked'` projection, D5), `satisfied: false`, labelled in the blocker sentence, `state` forced to `draft` |
| `blockingDocuments` / `blockerCount` | `blockerReasonFor` | `reason: 'untracked'`, counted, criticals first |
| `batchAlerts` | `summarizeBatchDocCompliance` | excluded from `missing`; row fires only once `tracked > 0` |

Both billing halves guard the empty catalog separately — `deriveDocReadiness`'s full-set denominator
never satisfies `billingGate`'s `requiredTotal > 0` check, and `buildPacket` emits "catalog unavailable"
rather than counting zero blockers — because an unevaluated checklist must not read as satisfied. Gate
walk-through lives in [/openwiki/modules/billing.md].

## Evidence: path, upload, signed read

Evidence is what moves a requirement up the ladder. It is written and it is unexercised: no component
imports `uploadEvidence`, `getSignedEvidenceUrl` or `validateEvidenceFile`.

1. **Path** (`domain/evidencePath.ts`). `buildEvidencePath` composes
   `{tenant_id}/{batch_id}/{document_key}/{filename}` and validates tenant id, batch id, key, filename —
   in that order, so the outermost problem is the one reported, and tenant/batch are anchors while only
   `filename` is user-shaped. The bucket's policies authorize every operation with
   `app_private.can_access_tenant((storage.foldername(name))[1]::uuid)`, so segment 1 *is* the tenant
   check and a filename containing `/` relocates the object into a folder whose first segment is no
   longer the caller's tenant. `validateEvidenceFile` enforces `EVIDENCE_MAX_BYTES` (52 428 800, the
   bucket's own `file_size_limit`) inclusively and a narrow MIME allowlist, size before type. Every entry
   point returns a discriminated result, because FR-06 needs *invalid type*, *upload rejected* and *upload
   failed* to stay distinguishable.
2. **Upload** (`data/evidence.ts`). `uploadEvidence` returns `unconfigured` when Supabase is unset
   (`isSupabaseConfigured` — a server env check, so client-side calls would always short-circuit),
   validates file then path so a bad request costs no round trip, then writes with `upsert: false`,
   leaving the prior object an auditor may cite intact. Failures split into `rejected` (bytes never
   sent) and `sync-failed`.
3. **Read**. The bucket is private (`public = false`); reads are signed URLs only,
   `getSignedEvidenceUrl` defaulting to 300 s. `storage_path` is unconstrained `text`, so the stored key
   is re-parsed through the builder and the trailing segments rejoined with `/` rather than trusting
   segment 4 — a key with extra segments then fails `isSafeFilename` instead of signing a shorter path
   than the one validated.
4. **Granting verify.** Today `DocumentsView.handleVerify` writes only a local override. Nothing sets
   `verified_by`: the admin's display name is captured by the handler and dies with the component.

Nothing here is covered by a test, and both functions sit behind auth toggles that are still unset
(issue #122), where every call fails with an RLS denial indistinguishable from a code defect.

Bucket policy shape for future work: select/insert/update for any member of segment 1; a DELETE policy
added by `20260910120000` gated on the tighter `can_manage_tenant`, since reading and uploading are
ordinary trainer work and destroying evidence is not. `evidence.ts` still exposes no `deleteEvidence`.

## What changes where

| Action | Leaves a mark in |
| --- | --- |
| Add a requirement to a program catalog | `program_document_requirements`; the next `getBatchesSnapshot` backfills the new key `'missing'` on every batch of that program |
| First upload for a `(batch, key)` | `storage.objects` under the tenant prefix, and `documents` — status `submitted`, `storage_path`, `submitted_by`, `submitted_at` |
| Admin verify | `documents.status = 'verified'`, `verified_by`, `verified_at` |
| Client-only click of "Verify document" | component `overrides` keyed `batchId:key`; until reload — and, because `submitted` already clears `isDocOnFile`, a lost verification costs no gate anything |
| "Request changes" | a toast only — no write |

Verified attribution is not entirely absent: `mapDocumentRow` populates `verifiedBy` / `verifiedDate`
and `FilePreviewModal` prints them, so a DB-verified row attributes correctly; only the in-session
verification is unattributed. The real gap is that four of these five rows are unreachable from the UI —
the upload is still an "Attach document" toast, so nothing writes `storage_path`, `submitted_by` or a
status.

## Failure modes, plainly

- **Folding untracked into `'missing'`.** Denominators shift, `batchAlerts` starts firing on catalogs
  nobody recorded, and every gate stays closed for the wrong reason.
- **Printing `0` or `100` over an untracked set.** The old donut skipped absent keys but still printed
  `0%`, and the old "absent ⇒ verified" counter read as a cleared checklist. Note the mirror image: one
  verified requirement on an otherwise unrecorded batch is a legitimate `100` alongside a blocker count
  of 1.
- **Indexing `batch.documents[key]` directly.** Pre-ADR this threw a `TypeError` in `TableView` and
  `DocumentsView` on any batch whose catalog lacked a mock-catalog key; a new counting surface that
  indexes the map reintroduces it for every partial catalog.
- **A clock or a network read inside `compliance.ts` or `evidencePath.ts`.** Both specs are fixed-date;
  a `Date.now()`-derived branch escapes them. (`DocumentsView` legitimately calls `new Date()` — it is a
  component, not the domain.)
- **`upsert: true` on upload, or a trust-the-client key.** Loses the cited object, or lets segment 1
  stop being the tenant.
- **Letting an upload imply a status.** `uploadEvidence` returns only `{path}`; it writes `storage.objects`
  and nothing in `documents`, so "there is an object" and "the requirement is `submitted`" are decided in
  two places. Deriving one from the other inside the domain layer would put Storage I/O in front of every
  compliance figure.

## Where to change what

- **A new counting surface** calls `docRecordFor` / `summarizeBatchDocCompliance` and handles `null`
  before any number.
- **Actually rendering the blocker strip** is the open job: wire `blockingDocuments` (or `blockerCount`
  for a badge) into the batch card, passing `criticalRequirements(batch.documentRequirements)`, and
  render `label`s, never keys.
- **Wiring `/billing`'s catalog** comes next after that: it still passes `[]`, so `buildPacket` says
  "catalog unavailable" and `billingGate` stays shut on every batch. Both degrade correctly, neither is
  useful yet.
- **A new verification write path** must set `verified_by` / `verified_at` so it replaces the local
  override rather than joining it.
- **A new evidence surface** validates file *and* path before send, then calls `uploadEvidence`, then
  writes the returned path plus `status: 'submitted'` to the `(batch, key)` row; never composes a key by
  hand.
- **The rule itself** stays in `compliance.ts`; a per-site re-decision is a regression.

Pins: `tests/unit/doc-compliance.test.ts` (D1–D4, `null`-not-zero, alert suppression),
`tests/unit/doc-blockers.test.ts` (untracked blocks; the deliberate disagreement),
`tests/unit/evidence-path.test.ts`, `tests/unit/documents.test.ts`, `tests/unit/batches.test.ts`
(backfill before overlay). None touches the bucket round trip; RLS and the issue #122 toggles are
unverified.

Companions: module and screen reference on
[/openwiki/modules/documents-and-evidence.md]; the audit/rename side of the same catalog on
[/openwiki/modules/batches-and-lifecycle.md]; banner-before-empty guard ordering on
[/openwiki/concepts/error-snapshots-and-honest-empty-states.md].
