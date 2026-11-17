---
type: module
title: CSV Import and the T2MIS Layout
description: The learner intake pipeline and the T2MIS header contract — the pure RFC 4180 parser, header/row validation, the single-batch rule, ULI-keyed reconciliation, the typechecked-only importLearnersCsv write path, and the overlay ImportCsvModal that states "not available yet" and nothing else. Also owns the 48-column T2MIS layout the report export consumes.
tags: [import-export, csv, learner-intake, t2mis, reconciliation, write-path, validation, uli, fr-10]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-17T04:33:34.390Z
---

# CSV Import and the T2MIS Layout

This module is FR-10 and it holds two things that are only loosely related: the learner **intake**
pipeline (parse → validate → reconcile → write) and the **T2MIS terminal-report layout** that the
export in [reports and T2MIS export](/openwiki/modules/reports-and-t2mis-export.md) renders. The
layout is here, the workbook writer is there; that page covers the writing, this one covers the
header contract and the whole import side.

Nothing in `app/` calls the write path. The one UI file in this module renders a fixed
"not available yet" panel. So the honest status is: **a complete, unit-tested domain layer and a
typechecked-only data layer, behind a door that opens onto nothing.**

## What the modal actually is

`ui/ImportCsvModal.tsx` is a client overlay with exactly one prop, `onClose`. It owns an Escape
listener and a click-away scrim, both calling `onClose`, and renders an `EmptyState` reading
"Importing T2MIS or BSRS files isn't available yet." plus "Nothing can be uploaded or saved from this
screen."

Concretely, it does **not** have a file input, a drag-and-drop zone, a sample-file picker, a column
list, a preview table, a result summary or an `unconfigured` branch. The earlier "three-sample picker"
memory is wrong — the element is just an icon, a heading and a sub-line. Nothing in it can reach
`importLearnersCsv`, and `tests/unit/sidebar.test.ts` pins that by asserting the overlay receives
*only* `onClose` and raises no toast (compare `SettingsModal`, which does get props and an `onSaved`
toast). A modal with no result channel is why the toast plumbing in `SidebarOverlays` exists but sits
unused on this branch.

It *is* reachable in the app shell, via a path that does not mention it: `Sidebar.tsx` maps the
Operations list (`{ label: 'Import records', op: 'import' }`) onto `NavRow`'s `onOp`, which sets
`activeOp` and renders the modal. `resolveOperations` drops that row entirely on a trainer route
(`o.op === 'settings'` filter), so **Import records is office-only and a trainer never opens the
modal** — the same boundary the learner read policy draws. `grep ImportCsvModal app/` finds nothing;
the caller is `modules/shell`, not a route.

## The pipeline, in order

`importLearnersCsv(batchId, csvText)` in `data/learnerImport.ts` is sequential and each stage can
end it.

1. **`isSupabaseConfigured()` gate.** Returns `{ status: 'unconfigured' }` immediately. Unlike a read
   snapshot, `unconfigured` here means *disable the importer* — there is nothing to render.
2. **`parseLearnerCsv`.** Pure. Returns `empty`, `missing-columns`, `multiple-batches` or `ok`; the
   first three become `validation-failed` before any network call.
3. **`validateRows`.** Pure. Splits rows into writeable rows and `RowError`s. If *no* row survives,
   `validation-failed` with one `Row N: <reason>` string per row; otherwise the rejects become
   `skipped` and the import continues.
4. **Read the batch's `tenant_id`** through `supabase.from('batches').select('id, tenant_id')`. The
   tenant is read back off the batch rather than accepted as an argument, so a write can never target
   a tenant the caller could not already read (rule 2).
5. **Read existing `(id, uli)` for the batch**, reconcile in application code, then insert the
   unmatched rows and their details, then update the matched ones one at a time.
6. **`summariseWrites`** grades the outcome purely from saved counts: `ok` when both steps finished,
   `sync-failed` when *nothing* saved, `partial` — with real counts and the raw error — in between.

An insert failure skips the update step entirely (`inserted.error ? { saved: 0 } : await
updateLearners(...)`), so a broken insert never leaves a half-updated roster.

**Failure modes.** `learners` and `learner_details` are written in *separate requests*, so there is no
transaction and no rollback: `partial` is a real, reachable, persistent state. The escape hatch is
that re-importing the same file converges — rows match on ULI, details upsert on `learner_id`. Raw
database text (table, column, constraint names) also escapes into `sync-failed` and `partial`; the
file carries a `TODO` to map it at the action boundary, which [rule 6](/RULES.md) requires and nothing
does yet.

## The CSV parser

`domain/csv.ts` is a hand-rolled RFC 4180 scanner (character loop, quote state, `""` unescaped to `"`,
`\r` swallowed, `\n` ends the row, trailing unterminated cell flushed). There is deliberately no CSV
dependency. `domain/` is pure (rule 14), so the parser sits beside validation rather than in `data/`.

`rowsToRecords` then keys each row by trimmed, lowercased header. Two consequences matter: lookups are
case-insensitive, and when the T2MIS sheet repeats "Municipality City" and "Province" for provider and
learner, the **later — learner — cell wins** the record key. The provider cells are simply lost to this
import, which is correct because an import targets a batch the user already chose.

## Two accepted shapes, one narrow write

The parser takes the narrow roster CSV (`Last Name`, `First Name`, `ULI`, `Assessment Result`) *and* a
T2MIS "terminal" sheet saved as CSV. That second shape is wider than the database write, and the
split is deliberate:

- **`learners` write** — a fixed, narrow identity set only: `learner_no`, the four name columns,
  `assessment_result` (plus `uli`, `tenant_id`, `batch_id` on insert). It is built from an explicit
  literal, not a spread, so no sheet column can leak in.
- **`learner_details` write** — the 23 personal/training/employment cells named in `DETAIL_COLUMNS`,
  typed as a `Partial` so only filled cells are carried. Provider and qualification columns
  (Region, CTPR, Delivery Mode, …) are dropped entirely.

That narrowness is why the pipeline never touches the wider sheet's provider half, and why the export
can be far broader than the import without the two needing the same column set. When a file fills no
detail cell, `writeDetails` returns before the query and a names-only import never touches
`learner_details` at all.

Details land in `learner_details` rather than `learners` because RLS filters rows, not columns:
`learners` is trainer-readable for the trainer's own batches, so birth dates, contact numbers and
salary would otherwise be one API call from any assigned trainer ([rule 5](/RULES.md)). The import runs
as an admin/coordinator, who holds the `can_manage_tenant` write policy on both tables. See
[data model and RLS](/openwiki/architecture/data-model-and-rls.md) for the policy map.

## Validation rules and their ordering

`validateRows` rejects, per row, in this order: missing last/first name → `uli` outside
`/^[A-Za-z0-9-]{8,20}$/` → any `problems` collected during parse → ULI already seen in this file. The
pattern is a soft shape check, not the TESDA ULI algorithm; `problems` carries the parse-stage
rejections (unreadable date, unrecognised sex, unrecognised assessment result). A row rejected for
content is skipped and reported, not silently imported.

Three choices carry meaning:

- **A blank `Assessment Results` cell is `pending`; an unrecognised one is an error.** Importing
  `Competnt` as `pending` would quietly understate the batch's results, so it is refused instead.
- **Dates accept `MM/DD/YYYY`, ISO and bare Excel serials** (`parseT2misDate` in `domain/t2mis.ts`,
  bounded to serials 20000–80000 so an age or count is not read as a date) and normalise to ISO. Sex
  normalises to `Male`/`Female` through a small alias map — the one `learner_details` column with a
  `check`.
- **A ULI duplicated inside the file is rejected** so the database index is never the thing that
  fails. The second occurrence loses.

Rows rejected here become the `skipped` list in an otherwise-successful `ok`/`partial` result. Only a
file where nothing survives is `validation-failed`.

## One batch per file

The import takes a `batchId` and files every row under it. A whole-school T2MIS export spanning
several batches would therefore be mis-filed whole, so a file whose `training calendar code` — or,
failing that, `qualification program title` — carries **more than one distinct value** is rejected
outright as `multiple-batches`, with the offending values named. There is no per-row batch routing.
Splitting the sheet is the operator's job.

## Why reconciliation is application-side on ULI

`reconcileWithExisting` matches each valid row against the batch's existing learner ULIs and returns
`existingId: null` for inserts, an id for updates. It is a `Map` lookup, not a database upsert,
because **no index exists that supabase-js `onConflict` could target**. `learners`' unique constraint
is `(tenant_id, batch_id, learner_no)` — and `learner_no` is optional and absent from most source
reports. Migration `20261111120000` adds `learners_tenant_batch_uli_key` on `(tenant_id, batch_id, uli)`,
but it is **partial** (`where uli is not null`), which still excludes it as an `ON CONFLICT` target.

Two invariants follow and must hold together: reconciliation is **inside one batch**, so the same ULI
at another school inserts rather than colliding (ULI uniqueness is by value across tenant-scoped rows,
not a shared row — ADR-001 Q1), and the in-file duplicate rejection above keeps the write from ever
failing that partial index. ULI is also required per row for the same reason: a row without one can
never be reconciled on a re-import.

`learner_details` *is* an upsert, with `onConflict: 'learner_id'` against its primary key, one object
per call. A single-object upsert updates only the columns it carries, so a sparser re-import never
blanks earlier details. The id for a freshly inserted learner is recovered from the insert's
`.select('id, uli')` keyed by ULI, and a missing link is reported as "the learner was saved but its
details could not be linked".

## The T2MIS layout

`domain/t2mis.ts` is the single ordered source of truth for the sheet: 48 `{ header, value }` columns,
TESDA's strings verbatim — including the trailing space in `'Province '` and the two columns both
called `Municipality City`, so do not tidy them. `T2MIS_HEADERS` is derived from it and
`tests/unit/t2mis.test.ts` pins it against the file TESDA hands back, at 48 headers in order.

Because the layout is `domain/` and the writer is `modules/reports/domain/xlsx.ts` wrapped by
`modules/reports/ui/exportXlsx.ts`, the export reaches it as a legal cross-module `domain/` import
(rule 8) — a `data/`-to-`data/` import would have been blocked. `modules/batches/data/learners.ts`
does the same for `ageOn`, so these helpers are a shared domain surface, not private to the import.
The `isoToT2misDate` / `parseT2misDate` pair makes the two directions inverses, and a test round-trips
an exported row back through `parseLearnerCsv` + `validateRows` to the same learner columns.

Producing the file is not a submission — TESDA SIS/T2MIS/BSRS stay authoritative (rule 27). The
provider and qualification cells come from the export's own context, not this import: see
[reports and T2MIS export](/openwiki/modules/reports-and-t2mis-export.md) for who fills them.

## The schema this depends on

Migration `20261111120000_add_t2mis_terminal_report_fields.sql` — new `learner_details` table, the
partial ULI index, `tenants.congressional_district`, `batches.training_calendar_code` and
`tenant_qualification_id` — is **APPLIED** (2026-11-11), and `lib/supabase/database.types.ts` was
hand-written from it and checked against the live generator. Do not treat any of it as pending.

Coded values (civil status, client classification, training status, employment classification) are
plain `text` with **no `CHECK` on purpose**: TESDA's full value lists are not confirmed, and a wrong
list would reject rows T2MIS itself accepts. Only `sex` is constrained, which is why the parser
normalises it and flags anything else. Adding a `CHECK` here is a real behaviour change, not a
tightening.

Details are also office-only on the read side, so a trainer-facing screen renders blank detail cells
rather than partial data — see [verification and test strategy](/openwiki/operations/verification-and-test-strategy.md)
for how the blank-vs-missing distinction is treated.

## Scope boundary with the export

This is an **internal working copy**, not an integration: `learners` + `learner_details` only. It does
not create batches, link `tenant_qualifications`, write documents, evidence or `activity_log`, and it
never deletes — "nothing ever deleted" is ADR-001 T2, and a re-import is an additive merge by ULI with
no preview step (the PRD's mandatory preview is not built).

## What is tested and what is not

The whole `domain/` layer plus the one pure `data/` function (`summariseWrites`) is unit-tested across
`tests/unit/learner-import.test.ts` and `tests/unit/t2mis.test.ts` — quoting, aliasing, the empty and
missing-column gates, blank→`pending`, every rejection reason, the multi-batch refusal, the ULI match
marking an update, and `ok`/`partial`/`sync-failed` from counts.

`importLearnersCsv` itself has **never executed against a live database**: no Supabase env exists in
this environment. It is typechecked only. `tests/unit/sidebar.test.ts` renders the modal and pins the
prop surface. You can tell the two apart by mechanism: every stage through `reconcileWithExisting` is
pure and asserted directly; everything from `createSupabaseServerClient()` down is asserted only as
types, which is why a policy, FK or constraint failure (a coordinator's write, say) would surface for
the first time in production. Do not describe the write path as verified — it is not.

## Constraints on a change here

- **Wire the modal before widening the write path.** The missing piece is a caller action: a file
  input, bytes to text, `importLearnersCsv(batchId, text)`, an `unconfigured` disable, and a renderer
  for the discriminated result. The batch to import into is not resolved anywhere today — the modal is
  opened from a global sidebar with no batch context, so the wiring also has to choose one.
- **Map the raw error text** to user copy at the action boundary (rule 6) before any human sees it.
- **Keep hooks out of `domain/`** (rule 14) and keep `data/` the only Supabase layer (rule 10). New
  columns must land in `learner_details` and the `DETAIL_COLUMNS` map, never on the fixed `learners`
  literal, or a names-only re-import will start blanking data.
- **Adding a column means a migration first**, then `database.types.ts`, then the parser map — and
  the header test will pin any layout change.