---
type: module
title: Learner Import and the CSV Reconcile Path
description: The FR-10 learner CSV intake pipeline — the pure RFC 4180 parser boundary, row validation into a draft, ULI-keyed reconciliation against the batch's existing roster, the explicit insert/update write plan and its discriminated outcome — plus the honest status (an overlay UI that is not wired, and a write path no live database has run).
tags: [import-export, csv, learner-intake, reconciliation, uli, write-path, validation, fr-10]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-18T03:56:44.398Z
sources:
  - id: openwiki-source-6c5e30490a0c4602d7931405
    resource: repo://docs/adr/ADR-001-billing-and-domain-model.md
  - id: openwiki-source-bac9ca9767a57004b7fbd175
    resource: repo://lib/supabase/database.types.ts
  - id: openwiki-source-ad910b8b276ad30bfcde3f16
    resource: repo://modules/batches/data/learners.ts
  - id: openwiki-source-927476d5ce1369bdfbff408b
    resource: repo://modules/import-export/data/learnerImport.ts
  - id: openwiki-source-1a10f8eecf05684edce45bb8
    resource: repo://modules/import-export/domain/csv.ts
  - id: openwiki-source-4bbff9da266e44025f34a633
    resource: repo://modules/import-export/domain/learnerImport.ts
  - id: openwiki-source-db11994fd3a6b99fac496ccf
    resource: repo://modules/import-export/domain/t2mis.ts
  - id: openwiki-source-58478215433a32dbc8ee2b3e
    resource: repo://modules/import-export/README.md
  - id: openwiki-source-96569cd493431d4555cdd1d9
    resource: repo://modules/import-export/ui/ImportCsvModal.tsx
  - id: openwiki-source-1b98d4470d88d5f67c6f9e45
    resource: repo://modules/reports/ui/exportXlsx.ts
  - id: openwiki-source-7cb0b5f9c6ed9ed4128872a0
    resource: repo://modules/shell/ui/Sidebar.tsx
  - id: openwiki-source-10f9f8c998debff047489862
    resource: repo://supabase/migrations/20261111120000_add_t2mis_terminal_report_fields.sql
  - id: openwiki-source-d779956f2a715b2e3f40cf22
    resource: repo://tests/unit/learner-import.test.ts
  - id: openwiki-source-0a5743f3b49f658216da5228
    resource: repo://tests/unit/sidebar.test.ts
  - id: openwiki-source-9643403557bfc8e75aa7f9e4
    resource: repo://tests/unit/t2mis.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T03:56:44.398Z" }
---

# Learner Import and the CSV Reconcile Path

This module is the intake half of FR-10: a file comes in, becomes a draft, is reconciled against
what the batch already holds, and is applied. The `learners`/`learner_details` write path is its
centre of gravity, and everything before it exists to make that write safe.

**Status, stated plainly.** Nothing in `app/` calls the write path, and no write has ever run
against tenant data — the T2MIS columns the parser targets are typed and unit-tested, not
exercised. `ui/ImportCsvModal.tsx` is the only UI file and it renders one fixed "isn't available
yet" panel. So: **a finished, tested domain layer, a typechecked-only data layer, behind a door
that opens onto nothing.** The T2MIS terminal-report *layout* also lives in this module's
`domain/`; the workbook writer and its triggers are
[reports and T2MIS export](/openwiki/modules/reports-and-t2mis-export.md)'s subject and are not
restated here.

## The UI half is unfinished

`ImportCsvModal` takes exactly one prop, `onClose`, plus an Escape listener and a click-away scrim
that both call it, and renders an `EmptyState`: "Importing T2MIS or BSRS files isn't available
yet." There is no file input, no column list, no preview, no result summary, no `unconfigured`
branch. Nothing in it can reach `importLearnersCsv`, and `tests/unit/sidebar.test.ts` pins that
by asserting the component receives *only* `onClose` and raises no toast — the toast plumbing in
`SidebarOverlays` exists but sits unused for this modal, unlike `SettingsModal`, which gets props
and an `onSaved`.

It is reachable, via a path that never names it: `Sidebar.tsx` maps the Operations list entry
`{ label: 'Import records', op: 'import' }` onto `NavRow`'s `onOp`, which sets `activeOp` and
renders the modal. `resolveOperations` filters that list to `o.op === 'settings'` on a trainer
route, so **Import records is office-only** — the same boundary the learner read policy draws. The
caller is `modules/shell`, not a route.

## The pipeline, in order

`importLearnersCsv(batchId, csvText)` in `data/learnerImport.ts` is sequential; each stage can end
it. The write plan is `reconcile → split → insert step → update step → summarise`.

1. **`isSupabaseConfigured()` gate** → `{ status: 'unconfigured' }`. Here `unconfigured` means
   *disable the importer*; there is nothing to render.
2. **`parseLearnerCsv`** — pure. `empty`, `missing-columns` and `multiple-batches` each become a
   `validation-failed` with a distinct message before any network call.
3. **`validateRows`** — pure. Surviving rows are the plan; rejects become `RowError`s. If *no* row
   survives, `validation-failed` with one `Row N: <reason>` per row; otherwise the rejects become
   `skipped` and the import continues.
4. **Read the batch's `tenant_id`** off the `batches` row (an RLS-scoped select) rather than
   accepting it as an argument, so a write can never target a tenant the caller could not already
   read ([rule 2](/RULES.md)).
5. **Read the batch's existing `(id, uli)`**, reconcile in application code, split into `toInsert`
   (`existingId === null`) and `toUpdate`, insert unmatched rows and their details, then update the
   matched rows one at a time.
6. **`summariseWrites`** grades from saved counts alone: `ok` when both steps finish,
   `sync-failed` when nothing saved, `partial` with real counts and the raw error in between.

An insert failure skips the update step entirely (`inserted.error ? { saved: 0, error: null } :
await updateLearners(...)`), so a broken insert never also half-applies updates. The returned
`LearnerImportSnapshot` is a discriminated union: the caller switches on `status`, and only `ok`
and `partial` carry counts, `skipped` and a per-row `rowNumber`/`uli`/`reason`.

Steps 1–3 and 6 are pure functions, which is why so much of the pipeline is directly unit-tested.
Everything from `createSupabaseServerClient()` inward is asserted only as types.

## The parser boundary, and what a malformed row does

`domain/csv.ts` is a hand-rolled RFC 4180 scanner: a character loop with a quote-state flag, `""`
unescaped to `"`, `\r` swallowed, `\n` ending the row, a trailing unterminated cell flushed, and
all-empty rows filtered out. It is deliberately dependency-free, and it lives in `domain/` because
[rule 14](/RULES.md) keeps `domain/` pure — so the parser sits beside validation, not in `data/`.

That boundary is why **the scanner must never be reimplemented with `split(',')`**: embedded
commas, embedded newlines and doubled quotes inside a quoted cell all survive the character loop
and would shred under a split. A name written `"Dela Cruz, Maria"` is the everyday case, not a
contrived one.

`rowsToRecords` then keys each row by trimmed, lowercased header. Two consequences: column lookup
is case-insensitive, and where the T2MIS sheet repeats "Municipality City" and "Province" for
provider and learner, the **later — learner — cell wins** the record key; the provider cells are
lost to this import, which is correct because an import targets a batch the user already chose.

`validateRows` rejects a row at the **first** matching reason, in this fixed order: missing
last/first name → `uli` outside `/^[A-Za-z0-9-]{8,20}$/` → any `problems` collected during parse →
ULI already seen earlier in the file. Three details carry meaning:

- A **blank `Assessment Results` cell is `pending`; an unrecognised one is a problem.** Importing
  `Competnt` as `pending` would quietly understate the batch, so it is refused instead.
- `problems` holds the parse-stage discovery of unreadable content — an unreadable date, an
  unrecognised sex, an unrecognised assessment result — collected into one semicolon-joined reason.
- A **ULI duplicated inside the file** is rejected so the database index is never the failing
  element; only the later occurrence loses.

Rows rejected here become `skipped` in an otherwise-successful `ok`/`partial` result; only a file
where nothing survives is `validation-failed`. The `uli` on a `SkippedRow` is whatever the cell
held, so a garbage ULI still shows the operator which line to look at.

## One batch per file

The import takes a `batchId` and files every row under it, with no per-row batch routing. A
whole-school T2MIS export would therefore be mis-filed whole, so a file whose `training calendar
code` — or, failing that, `qualification program title` — carries **more than one distinct value**
is rejected as `multiple-batches`, naming the values. Splitting the sheet is the operator's job.
(ADR-001 R2/R-S1 describe a richer single-file commit and a parse → enrich → commit wizard; what
ships is the narrow single-batch form.)

## Two accepted shapes, one narrow write

The parser accepts both the narrow roster CSV (`Last Name`, `First Name`, `ULI`, `Assessment
Result`) and a T2MIS "terminal" sheet saved as CSV. The second shape is far wider than the write,
and the split is deliberate:

- **`learners` write** — a fixed identity literal only, built explicitly rather than spread, so no
  sheet column can leak in: `learner_no`, the four name columns, `assessment_result` (plus `uli`,
  `tenant_id`, `batch_id` on insert). The update literal carries the same column set without the
  keys.
- **`learner_details` write** — the 23 personal/training/employment cells named in
  `DETAIL_COLUMNS`, typed as a `Partial` so only filled cells are carried. Provider and
  qualification columns (Region, CTPR, Delivery Mode, …) are dropped entirely.

Because `DETAIL_COLUMNS` is a `Partial`, a names-only file never touches `learner_details` at all:
`writeDetails` returns before the query when the details object is empty.

Row fields are read into a draft (`ParsedLearnerRow`) and only mapped into insert/update shapes at
the query site; the authorisation argument for the details table — RLS filters rows, not columns,
so a trainer's `learners` read would otherwise expose birth dates and salaries — is
[data model and RLS](/openwiki/architecture/data-model-and-rls.md)'s topic. Date and sex
normalisation (`parseT2misDate`, a sex alias map, the deliberate absence of `CHECK` on coded
values) belongs to the shared T2MIS layout and is covered on
[reports and T2MIS export](/openwiki/modules/reports-and-t2mis-export.md).

## Why reconciliation is application-side on ULI

`reconcileWithExisting` matches each valid row against the batch's existing ULIs and returns
`existingId: null` for inserts, an id for updates. It is a `Map` lookup, not a database upsert,
because **no index exists that supabase-js `onConflict` could target**. `learners`' unique
constraint is `(tenant_id, batch_id, learner_no)` — and `learner_no` is optional and absent from
most source reports. Migration `20261111120000` adds `learners_tenant_batch_uli_key` on
`(tenant_id, batch_id, uli)`, but it is **partial** (`where uli is not null`), which still
disqualifies it as an `ON CONFLICT` target.

So ULI — the permanent learner key, ADR-001 Q1 — is what makes a re-import idempotent rather than
duplicative. Three invariants have to hold together:

- Reconciliation is **inside one batch**, so the same ULI at another school inserts rather than
  colliding (ULI uniqueness is by value across tenant-scoped rows, not a shared row).
- The **in-file duplicate rejection** keeps the write from ever tripping that partial index.
- ULI is **required per row**: a row without one could never be reconciled on a re-import.

UNIQUE plus an in-memory seen-set is still check-then-act: two concurrent imports into one batch
can both pass `reconcileWithExisting` and race into the index. Anything keyed off name, row order
or `learner_no` instead reintroduces duplicates. Updating `learners` one call at a time is a
deliberate scale deferral — supabase-js has no bulk per-row update — written for a single batch's
roster.

**A matched row is updated, not skipped.** ADR-001 T2 says a re-import is an additive merge with
"existing skipped, nothing ever deleted"; the shipped reconciler refreshes the matched row's
identity and assessment columns instead. Since the update literal omits `uli`, `tenant_id` and
`batch_id`, that set is fixed and nothing is ever removed (T2's "nothing deleted" holds literally).

## Failure modes and what they leave behind

`learners` and `learner_details` are written in **separate requests**, so there is no transaction
and no rollback: `partial` is a real, reachable, persistent state. `writeDetails` runs per row
after its learner row, and a details error stops the loop — rows already saved stay saved. The
upsert's only real trick is that it is single-object: it updates just the columns it carries, so a
sparser re-import never blanks earlier details. Raw database text (table, column, constraint names)
escapes into `sync-failed` and `partial`; the file carries a `TODO` to map it at the action
boundary, which [rule 6](/RULES.md) requires and nothing does yet.

Reads are not separately guarded: a failed tenant read, a failed roster read and a thrown error
all collapse to `sync-failed` with whatever message the driver or the `catch` produced. A batch the
caller cannot see yields "Batch not found or not accessible." — a not-found and a not-permitted
case are indistinguishable to the caller, which is the honest answer given RLS.

Extension seams the code anticipates: per-row batch routing, mapped error copy, and (from the file
header) being revisited if the pipeline ever takes multi-thousand-row files.

## Scope boundary

This is an **internal working copy**, not an integration: `learners` + `learner_details` only. It
does not create batches, link `tenant_qualifications`, write documents, evidence or `activity_log`,
and it never deletes. There is no preview step, so the PRD's mandatory preview (ADR-001 T2) is not
built, and none of the reconciliation logic — match on ULI, additive merge — runs before bytes hit
the database.

## What is tested and what is not

`tests/unit/learner-import.test.ts` asserts the parser (plain, quoted-with-escaped-quotes, no
trailing newline), header keying, `empty`, `missing-columns`, blank→`pending`, every row rejection
reason, the second-occurrence duplicate rule, the ULI match marking an update, and
`ok`/`partial`/`sync-failed` from counts. Note what the file *imports*: `parseCsvRows`,
`rowsToRecords`, `parseLearnerCsv`, `validateRows`, `reconcileWithExisting` and the pure
`summariseWrites` — nothing from the I/O half. **`importLearnersCsv` has never executed**: no
Supabase env exists in this environment, and multi-batch rejection, which lives in
`parseLearnerCsv`, is tested elsewhere.

A green suite therefore reads as "the rules work", not "import works". Every policy, FK or
constraint failure would surface for the first time in production. Do not describe the write path
as verified.

## Constraints on a change here

- **Wire the modal before widening the write path.** The missing piece is a caller action: a file
  input, bytes to text, `importLearnersCsv(batchId, text)`, an `unconfigured` disable, and a
  renderer for the discriminated result. The batch is not resolved anywhere today — the modal opens
  from a global sidebar with no batch context, so the wiring also has to choose one.
- **Map the raw error text** to user copy at the action boundary (rule 6) before a human sees it.
- **Keep hooks out of `domain/`** (rule 14) and keep `data/` the only Supabase layer
  ([rule 10](/RULES.md)). New columns land in `learner_details` and `DETAIL_COLUMNS`, never on the
  fixed `learners` literal, or a names-only re-import starts blanking data.
- **Adding a column means a migration first**, then `lib/supabase/database.types.ts`, then the
  parser map. The schema this depends on (migration `20261111120000`) is **APPLIED**; coded values
  are plain `text` with no `CHECK` on purpose.
- Finally, the obvious gap: **there is no test for the I/O half.** Anything added there should
  bring one, or keep saying so here.
