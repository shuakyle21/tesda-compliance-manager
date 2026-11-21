---
type: "Reference"
title: "Documents and Evidence"
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-11-21T03:38:28.236Z
sources:
  - id: openwiki-source-b2197972d3af51fefd258a4a
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/documents/page.tsx
  - id: openwiki-source-9c4f624af786337110d6df8a
    resource: repo://docs/adr/ADR-004-untracked-document-semantics.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-9a24e697708df788c06f44e3
    resource: repo://modules/billing/data/billing.ts
  - id: openwiki-source-24135802ec9b42acc8123951
    resource: repo://modules/billing/domain/packets.ts
  - id: openwiki-source-fed00d96acb205744511b2bb
    resource: repo://modules/documents/data/documents.ts
  - id: openwiki-source-05b5b2c042bb4f3b47496b1f
    resource: repo://modules/documents/data/evidence.ts
  - id: openwiki-source-764eda3eb972fdc48c5584a5
    resource: repo://modules/documents/domain/compliance.ts
  - id: openwiki-source-be3f0a5796d4e999957e9c91
    resource: repo://modules/documents/domain/evidencePath.ts
  - id: openwiki-source-fddaa3a3b7b0306dccc1c813
    resource: repo://modules/documents/ui/DocumentsView.tsx
  - id: openwiki-source-d9a6154810528b0710445f92
    resource: repo://shared/types.ts
  - id: openwiki-source-a4d15f880d5422e77435eccd
    resource: repo://shared/ui/FilePreviewModal.tsx
  - id: openwiki-source-03656dd9cbbc89345a506c19
    resource: repo://supabase/migrations/20260528160300_create_tenant_scoped_schema.sql
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-892600aba8a4baaca4ccc7a9
    resource: repo://tests/unit/doc-blockers.test.ts
  - id: openwiki-source-dcc0272e0da8a35716ea3b26
    resource: repo://tests/unit/doc-compliance.test.ts
  - id: openwiki-source-a018d6d3e536cc944d75e8a4
    resource: repo://tests/unit/documents.test.ts
  - id: openwiki-source-4029f22d57710f525e978978
    resource: repo://tests/unit/evidence-path.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-21T03:38:28.236Z" }
---


# Documents and Evidence

`modules/documents` owns FR-06: the requirement catalog a program is audited against, the per-batch
status map those requirements resolve to, the compliance and blocker arithmetic over both, and the
`compliance-evidence` bucket. It is the module ADR-004 exists to defend, because the interesting part
is not the happy path but what happens when a caller asks about a requirement the batch never carried
a record for.

A batch embeds `documents: Record<string, DocRecord>` keyed by `document_key`, plus its own
`documentRequirements`. `DocStatus` is a four-member union — `verified`, `submitted`, `pending`,
`missing` — that mirrors the DB `document_status` enum.
See [Data Model and RLS](/openwiki/architecture/data-model-and-rls.md) for the column and policy
detail behind both.

## Who may clear a blocker

A blocker is not cleared by a UI affordance. `ON_FILE_STATUSES` in
`modules/documents/domain/compliance.ts` is exactly `verified` and `submitted`, so a blocker stops
blocking two ways: a row arrives with status `submitted` (evidence attached and recorded), or a row
reaches `verified` (an admin accepts it). `pending` and `missing` block.

The database decides who may produce either transition, and the two are different populations.
The `documents` policies pair a trainer path with a management path: an admin or coordinator writes
through `can_manage_tenant`, while a trainer writes only inside a batch they are assigned to **and**
only when the requirement's `audience` is `trainer`/`all` — and only their own submission
(`submitted_by = current_profile_id()`). A viewer never appears in a write predicate at all.
Trainer-facing DTOs also omit the server-side fields a viewer is denied (RULES rule 5), and a viewer
is server-denied rather than hidden (rule 4). The policy map is the data-model page's; what matters
here is that **the module exposes no write path of its own** — `Documents.ts` and the screen only
read, and the verification the screen offers is a local override (below).

## The two data layers and the obligation to keep them in sync

Two independent paths produce `Batch.documents`:

- `modules/documents/data/documents.ts` — `getBatchDocumentsSnapshot(batchId, requirements)` plus
  its `mapDocumentRows`. Used by any caller that already holds the catalog; nothing calls it yet.
- `modules/batches/data/batches.ts` — `mapDocumentsMap(rows,
  program_document_requirements)`, fed by the embedded select in `getBatchesSnapshot`. This is the
  path the `/documents` screen actually takes.

`mapDocumentRow`, the `MISSING_DOC` constant, the `DOCUMENT_ICONS` map and the backfill loop are
**duplicated** between the two files. The duplication is not sloppiness: `eslint.config.mjs` makes
every module's `data/` private to that module (one `import/no-restricted-paths` zone per entry in its
`domains` array), so `batches.ts` cannot import `documents.ts`. The cost is a standing obligation — a
change to the backfill, the timestamp preference, the `source` label or an icon must land in both
files or the two producers of `Batch.documents` drift. Only `app/` may cross that boundary freely.

Both backfill every key in the batch's **own** program catalog to `MISSING_DOC`
(`status: 'missing'`) before overlaying real rows. So "no submitted row" is decided at the data layer,
not in each caller (ADR-004 **D1**). A key that is *still* absent after that backfill is one this
batch's catalog never listed — the only remaining absence, and the one the domain layer interprets.

## The requirement catalog

`program_document_requirements` rows *are* the catalog, scoped per `program_id`, so "which documents
must this batch carry" is a data question, never a hardcoded list. `getDocumentRequirementsSnapshot`
returns it in `sort_order`; its snapshot type deliberately has **no** `no-tenant-access` member,
because the catalog is reference data — a caller attached to no school still reads the same TWSP/CFSP
requirements, and an empty catalog therefore means "unseeded", never "you have no access". The
`documents` rows themselves are tenant-and-audience scoped by RLS instead: a trainer's query simply
never receives admin- or coordinator-only rows, and the data layer does not re-filter by role in JS.

The catalog is also *configured data*, not a closed enum. `mapRequirementRow` resolves a display icon
from a `Partial` key map with a generic fallback, and `buildEvidencePath` shape-validates
`document_key` rather than checking membership. Anything that assumes a fixed key set is wrong at the
seam.

Consequently a requirement added after a batch started legitimately diverges from that batch's
tracked keys: the new row gets backfilled on the next read, the older snapshot — or a requirement from
a program the batch is not in — does not. Merging the catalogs was rejected precisely so this mismatch
stays visible; ADR-004's whole job is to make it legible instead of fatal.

## Untracked: a third state carried by absence

Read every status through `modules/documents/domain/compliance.ts` — the single home of the rule
(D6). Indexing `batch.documents[key]` outside a `data/` layer is the pattern the ADR removes, and an
unguarded `documents[key].status` threw a `TypeError` on live batches before it landed.

- `docRecordFor(batch, key)` returns the record or **`null`**. `null` *is* untracked.
- There is deliberately **no `'untracked'` member of `DocStatus`** (D5). The union mirrors the DB enum
  and is assigned straight off a row; a UI-only variant no row can produce would force every consumer
  to handle a phantom case. Untracked is represented as absence and read only through `docRecordFor`.
  The one exception elsewhere is `PacketDoc.status` (`DocStatus | 'untracked'`), a derived projection.

Two consumers then answer the same batch in opposite directions, and that divergence is the design:

| Consumer | Function | Untracked answer |
| --- | --- | --- |
| Measurement (KPI, donut, matrix completeness, analytics) | `summarizeDocCompliance` / `summarizeBatchDocCompliance` / `summarizeOwnCatalogCompliance` | excluded from numerator **and** denominator |
| Gating (billing readiness, packet blockers, blocking strip) | `isDocOnFile` | **not satisfied** — the gate stays closed |

`pct()` returns `null` when the denominator is zero, so `onFilePct` and `verifiedPct` are `null` —
never `0`, never `100` — when nothing is tracked. That `null` is the type-level forcing function: the
UI must render "—" plus words, never a percentage (RULES.md rule 23). `isDocTracked` answers the "does
the batch carry this at all" question that alerting uses to avoid firing on a catalog nobody has
recorded against.

The reason for the asymmetry is stated in the module header: a measurement that counts an unseen
requirement as verified reads as a cleared checklist, one that counts it as missing asserts absence of
a document nobody required, and *both* directions of the deliberate split fail safe. A gate that
treated untracked as satisfied would open on evidence nobody has seen — the failure mode this page
exists for.

```mermaid
flowchart TD
    Q["caller asks about a requirement key"] --> R{"docRecordFor returns a record?"}
    R -- "null (absent key)" --> U["untracked"]
    R -- "record" --> S{"status"}
    S -- "verified or submitted" --> F["on file"]
    S -- "pending or missing" --> B["blocking"]
    U -- "measurement" --> X["excluded from numerator and denominator"]
    U -- "gate via isDocOnFile / blockerReasonFor" --> G["not satisfied, gate stays closed"]
    B --> G
    F --> OK["satisfied"]
```

*The same absence measures as "not judged" and gates as "not satisfied" — the ADR-004 asymmetry.*

Where the gate lands: `deriveDocReadiness` in `modules/billing/data/billing.ts` counts
`isDocOnFile` over critical, supporting-stage requirements only, and keeps its denominator at the
full supporting set — so an untracked batch reads 0 of n and the readiness gate stays shut.
`buildPacket` does the same per pre-billing requirement and turns each unsatisfied one into a named
`blocker` line. Billing keeps the top of the design; the gate details live on
[Billing](/openwiki/modules/billing.md).

## The blocking strip

`blockingDocuments` / `blockerCount` / `blockingDocumentNames` build the named strip on top of D4.
They return only `label`s, because FR-06 AC-1 forbids rendering a raw `document_key`, and the blocker
vocabulary is its own `DocBlockerReason` (`untracked` / `missing` / `pending`) rather than a subset of
`DocStatus`. `blockingDocuments` partitions criticals first rather than sorting, and an empty catalog
yields an empty summary — asking about nothing is not a problem, unlike measuring nothing, which is
unknown.

`blockerReasonFor` is the private decision point all three share, so `blockerCount` cannot drift from
`blockingDocuments().count` (a test asserts they agree across fixtures). The strip is **written but
unrendered**: no component imports any of the three, which is the open wiring job.

## The matrix screen

`DocumentsView` is a client island whose columns are `requirementCatalogOf(batches)` — the union of
every shown program's catalog, first occurrence per key, **for display only**; completeness is scored
per batch against its own `criticalRequirements`. The union is what creates untracked cells: a Program
A requirement on a Program B column.

The screen's own `docOf()` narrows with `b.documentRequirements.some(...)` *before* calling
`docRecordFor`, so a leftover row for a key outside the batch's catalog still renders "Not tracked"
rather than as a live status. Untracked cells are `disabled`, carry the `.na` treatment with an
explanatory `title`, and are skipped by the click handler — there is nothing to preview and nothing to
attach against. With no catalog at all the view renders one "requirements unavailable" state instead
of a grid of empty rows.

State ladder per cell: `verified` and `submitted` open `FilePreviewModal`; `pending` and `missing`
raise an "Attach document" toast for writers; `na`/untracked is inert. Verification is an **admin-only
override in local state** — `{ status: 'verified', verifiedBy, verifiedDate }` keyed `batchId:key` —
and is refused when the profile has no display name, so a record is never attributed to nobody. No
write reaches the database from this screen, so a verification lost to a reload costs no gate
anything: `submitted` already opened it.

The route applies `withTenantAccess` to the batch snapshot before picking a batch, and a
`no-tenant-access` read renders `NoTenantAccessState` rather than the ordinary empty state — an
all-blank matrix would read as "your batches are missing everything" instead of "you have no school".
The role passed to the island is the trusted `profiles.role`, never `?role=`; guard order in general
is the data-pattern page's.

## Evidence storage

The pure half lives in `modules/documents/domain/evidencePath.ts`; `modules/documents/data/evidence.ts`
is the Storage I/O around it. The same `data/`-privacy rule keeps them apart, and both are
**unexercised**: no component imports the upload, signed-URL or file-validation functions.

**Path convention:** `{tenant_id}/{batch_id}/{document_key}/{filename}`. The key is composed from the
loaded tenant, batch and requirement; the browser contributes only the file name. This is a security
boundary, not formatting. The bucket's policies authorize select, insert and update with
`app_private.can_access_tenant((storage.foldername(name))[1]::uuid)` — Postgres splits the object name
and hands **segment 1** to the membership function, so segment 1 *is* the tenant check. A `filename`
containing a `/` does not produce a weird name; it shifts every segment and relocates the object into
a folder whose first segment is no longer the caller's tenant. A tenant the tenant the caller also
belongs to is then not denied at all.

```mermaid
sequenceDiagram
    participant U as Browser
    participant P as buildEvidencePath (domain)
    participant D as uploadEvidence (data)
    participant S as Supabase Storage
    participant PG as RLS on storage.objects
    U->>P: filename only (ids come from the loaded batch)
    P-->>D: path or a rejection reason
    alt rejected
        D-->>U: rejected, no bytes sent
    else valid
        D->>S: upload key, upsert false
        S->>PG: policy checks foldername(name)[1] against can_access_tenant
        PG-->>S: allow or deny
        S-->>D: url or error
        D-->>U: ok path / sync-failed (opaque)
    end
```

`buildEvidencePath` validates in a fixed order — tenant id, batch id, document key, filename — so the
outermost problem is the one reported. Ids are anchored UUID v1–v8 regexes (they are interpolated
*before* Postgres casts them); `document_key` is `^[a-z0-9][a-z0-9_-]{0,63}$`; filenames reject
separators, C0/C1 control characters, bare `.`/`..`, percent-encoded separators (`%2f`, `%5c`,
`%2e%2e`) that clients decode in transit, surrounding whitespace, and length over 200. That guard is
also what keeps the `documents_batch_id_document_key_key` upsert key unambiguous once a file name is
appended to it.

Every entry point returns a discriminated result instead of throwing, because FR-06 needs *invalid
type*, *upload rejected* and *upload failed* to stay three distinguishable states;
`EVIDENCE_REJECTION_COPY` supplies copy per reason and leaks no identifier, table or bucket name.
`tests/unit/evidence-path.test.ts` is mostly separator-injection coverage, including that the tenant
check runs first.

`validateEvidenceFile` enforces `EVIDENCE_MAX_BYTES` (52 428 800) inclusively, rejects
non-finite/≤0 sizes, normalizes MIME parameters and case, and tests size before type so an oversized
file is not blamed on its format. The bucket's own `file_size_limit` is the same number, so a client
believing in a larger limit produces uploads Storage silently refuses.

Failure and policy facts that shape the code:

- The bucket is **private** (`public = false`). Every read is a signed URL —
  `getSignedEvidenceUrl` defaults to 300 s, and no public-URL path may be added.
- `uploadEvidence` passes `upsert: false`, so re-submitting evidence creates a new object and leaves
  the prior one intact; a compliance archive must not silently overwrite a file an auditor referenced.
- The canonical migration has select/insert/update policies and **no DELETE**. `20260910120000` adds
  one gated on `can_manage_tenant` (tighter than its `can_access_tenant` siblings, because reading and
  uploading are ordinary trainer work and destroying evidence is not). `evidence.ts` still exposes no
  `deleteEvidence`; the policy is the seam.
- Every call returns `unconfigured` when Supabase is unset and an opaque `sync-failed` message when
  Storage refuses or throws; a reply with no URL and no error is also a failure.
- `storage_path` is unconstrained `text`, so `getSignedEvidenceUrl` re-parses the stored key back
  through `buildEvidencePath` and rejoins the trailing segments with `/`. Rejoining rather than taking
  segment 4 makes a key with extra segments fail `isSafeFilename` instead of validating a shorter path
  than the one that gets signed.

The last known divergence is at the UI seam: `mapDocumentRow` sets `url` to `storage_path` (a bare
object key) or `external_url`, and it never populates a URL at all unless a `storage_path` is set
*and* the row is not `missing`. `FilePreviewModal` thus treats any non-null `url` as present, appends
`.pdf` to the label, and renders a simulated page — no signed URL is ever minted. Seeded
`storage_path`s are deliberately NULL (a dead link is worse than a visibly absent one), so the
uploaded-file path is untested end to end.

## Failure modes worth knowing

- **Treating untracked as satisfied.** A batch whose catalog never mentioned a document passes a gate
  nobody verified. Do not "fix" it by mapping untracked onto `submitted`.
- **Reading `batch.documents[key]` directly.** Works with a fixture, throws on any live batch whose
  catalog lacks the key.
- **Rendering a `document_key`.** The flag is internal; render `label`.
- **Overwriting on upload.** `upsert: true` loses the version an auditor may cite.
- **Adding a public bucket URL.** The bucket is private by design.
- **Fixing only one copy of the duplicated mapper or icon table.** The two producers of
  `Batch.documents` then disagree about what "no row" means.

## LAMR

`modules/lamr` is a README stub (FR-08); LAMR appears here only as a seeded catalog key, listed as
`lamr` in the test fixtures and the icon map.

## Tests

`tests/unit/doc-compliance.test.ts` (D1–D4, `null`-not-zero, `requirementCatalogOf` union order,
alert suppression), `tests/unit/doc-blockers.test.ts` (untracked blocks, labels never keys, and an
explicit "gate and measurement disagree" test so a refactor cannot quietly align them),
`tests/unit/evidence-path.test.ts`, `tests/unit/documents.test.ts`. These four pins cover the domain
helpers, the duplicated mappers and the path builder only; the Storage I/O half of `evidence.ts` is
mocked or uncovered, so a green suite is not proof of the bucket round trip. RLS and the live upload
are unverified pending the Clerk/Supabase auth toggles.

The end-to-end flow these pieces serve is in
[Document Compliance and Evidence](/openwiki/workflows/document-compliance-and-evidence.md); the
batch side of the same catalog — lifecycle, rename, alerting — is in
[Batches and Lifecycle](/openwiki/modules/batches-and-lifecycle.md).
