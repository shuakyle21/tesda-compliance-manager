---
type: module
title: Reports, EGACE and the T2MIS Export
description: The report screen's EGACE outcome rates and employment follow-up over an enrolled base, the trainer redirect and combined sync-failed signalling on the report route, and the dependency-free XLSX writer that fills and wraps the 48-column T2MIS layout owned by import-export.
tags: [reports, egace, employment, t2mis, xlsx, export, trainer-boundary, fr-15]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-18T03:56:44.398Z
sources:
  - id: openwiki-source-c30669730475f4aa9f33c2b1
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/billing/page.tsx
  - id: openwiki-source-79e2020a0930b43798845956
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/report/page.tsx
  - id: openwiki-source-3da0446fc6c5da744a43e0a3
    resource: repo://modules/auth/data/role.ts
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-ad910b8b276ad30bfcde3f16
    resource: repo://modules/batches/data/learners.ts
  - id: openwiki-source-4bbff9da266e44025f34a633
    resource: repo://modules/import-export/domain/learnerImport.ts
  - id: openwiki-source-db11994fd3a6b99fac496ccf
    resource: repo://modules/import-export/domain/t2mis.ts
  - id: openwiki-source-c032e4e9fbbcfed20df0ba5e
    resource: repo://modules/reports/domain/egace.ts
  - id: openwiki-source-b5b5aeb3092bd9dc7d152cfb
    resource: repo://modules/reports/domain/employment.ts
  - id: openwiki-source-31c2b748e4e101720403cc64
    resource: repo://modules/reports/domain/xlsx.ts
  - id: openwiki-source-b65321b43647f8e93e80e002
    resource: repo://modules/reports/README.md
  - id: openwiki-source-7a177804d85d11583b343f07
    resource: repo://modules/reports/ui/EgaceOutcomesTable.tsx
  - id: openwiki-source-03079d557e33e02db9dc42c0
    resource: repo://modules/reports/ui/EgaceSummaryStrip.tsx
  - id: openwiki-source-29c54b3fdfcf88464464229f
    resource: repo://modules/reports/ui/EmploymentReportTable.tsx
  - id: openwiki-source-1b98d4470d88d5f67c6f9e45
    resource: repo://modules/reports/ui/exportXlsx.ts
  - id: openwiki-source-978845925045f9be68119339
    resource: repo://modules/reports/ui/ReportView.tsx
  - id: openwiki-source-4a6c5a1d0a57f700524b0a69
    resource: repo://modules/tenancy/domain/access.ts
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-2e8379a4bf1745c859be64a8
    resource: repo://shared/dates.ts
  - id: openwiki-source-d9a6154810528b0710445f92
    resource: repo://shared/types.ts
  - id: openwiki-source-eb30361b2d93d2c44af8dc85
    resource: repo://shared/vocab.ts
  - id: openwiki-source-10f9f8c998debff047489862
    resource: repo://supabase/migrations/20261111120000_add_t2mis_terminal_report_fields.sql
  - id: openwiki-source-2f2a720146c933f535328706
    resource: repo://tests/unit/report-xlsx.test.ts
  - id: openwiki-source-f74f903bb060be835aa57c10
    resource: repo://tests/unit/reports-domain.test.ts
  - id: openwiki-source-9643403557bfc8e75aa7f9e4
    resource: repo://tests/unit/t2mis.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T03:56:44.398Z" }
---

# Reports, EGACE and the T2MIS Export

`modules/reports` is FR-15 — the school's reporting surface and the only place a file leaves
this app. Two things are easy to get wrong about it:

- **Producing the file is not a submission.** TESDA SIS/T2MIS/BSRS stay authoritative, so no copy
  here may say a report was *filed* or *sent* (rule 27). The screen builds a working `.xlsx` and
  the browser downloads it.
- **The workbook is split across two modules on purpose.** The 48-column **layout** is
  [`modules/import-export/domain/t2mis.ts`](/modules/import-export/domain/t2mis.ts) — the same
  header contract the import side parses — while the **writer** lives here in
  `domain/xlsx.ts` and the **cell filling** in `ui/exportXlsx.ts`. Reaching a sibling module's
  `domain/` is the legal direction under rule 8; a `data/`-to-`data/` import would have been
  blocked. Details of the layout belong to
  [CSV import and the T2MIS layout](/openwiki/modules/import-export.md); this page covers who
  fills the cells, the writing, and the screen around it.

The module has **no `data/` layer**. Its route fetches through `modules/batches/data` and the
folder holds only `domain/` and `ui/`, so there is no report-scoped snapshot type and nothing here
to follow the fetch → map → derive contract with. Rate "no report data layer" as a decision, not
drift: every number is derived from the shared batch snapshot plus the roster, and
`modules/reports/README.md` still lists `data/` as *planned* rather than missing. The agreed home
for a genuinely new export unit is `ui/exportXlsx.ts` — the first real-tooling export here — not a
new module.

## The report route

`app/(dashboard)/t/[tenantCode]/(sections)/report/page.tsx` is the only caller. The order it does
things in is the contract.

```mermaid
flowchart TD
  A[requireScope] -->|null| Z[render nothing]
  A -->|scope + profile| B[getProfileSnapshot]
  B --> C[resolveTrustedRole on profiles.role]
  C -->|trainer| T[redirect /trainer]
  C -->|office or null| D[deriveTenantAccess from the same snapshot]
  D --> E[withTenantAccess getBatchesSnapshot scope.tenantId]
  E --> F[getTenantRosterSnapshot scope.tenantId]
  F --> G[selectBatchesForDisplay + attachRoster]
  G --> H{syncFailed?}
  H -->|yes| I[warning callout, still render]
  I --> J{batches empty?}
  H -->|no| J
  J -->|yes| K[NoTenantAccessState or EmptyState]
  J -->|no| L[ReportView with asOf, tenants and rosterFailed]
```

1. **`requireScope()`** (`app/(dashboard)/tenant-scope.ts`) resolves the URL's school against the
   caller's memberships and hands back the cached profile with it. Null means the segment layout is
   already rendering the not-a-member / no-school / unknown state, and the page returns null.
2. **Trainer redirect, before any fetch.** `resolveTrustedRole` is called on `profiles.role` alone
   and a `trainer` is sent to `/trainer`. It is deliberately not `resolveRouteRole`: that resolver
   honours a `?role=` preview override, so a real trainer requesting `?role=admin` would slip past.
   [Billing](/openwiki/modules/billing.md) gates the same way for the same reason. The route
   comment records that it had no redirect while it rendered mock data — now that it reads live
   scholar-level outcomes it must be *server*-denied, not merely absent from the sidebar.
3. **The membership verdict is reused, not re-fetched.** `deriveTenantAccess` reads the profile
   snapshot already in hand and the verdict is folded in with `withTenantAccess`, which rewrites
   only an `ok` batch snapshot — so "you belong to no school" can never mask a real fetch failure.
4. **A separate roster fetch.** `getTenantRosterSnapshot(scope.tenantId)` is awaited after the
   batch snapshot and its result is hung on the batches with `attachRoster`. Nothing else loads it
   (see below).
5. **One combined failure flag.** `syncFailed` is `snapshot.status === 'sync-failed' ||
   rosterSnapshot.status === 'sync-failed'` and drives an `InfoCallout` warning plus a Retry link.
   It renders *above* both the empty branch and the populated report, so a failed roster still
   shows a report with blank roster-derived cells — and, per rule 19's ordering warning, is not
   swallowed by the empty branch. `rosterFailed` is also passed to `ReportView` so the export can
   distinguish an empty workbook from a broken one.

`asOf` is `formatDateTime(snapshot.fetchedAt)` and only when the snapshot is `ok`, so the screen
carries an exact "as of" stamp with its year (rule 23 / rule 24) and loses it rather than inventing
one when the read failed.

**The gap worth knowing.** `unconfigured` produces no `syncFailed`, so a report rendered with no
Supabase environment looks empty and normal with no callout at all. That is the one state this
screen does not announce.

## The roster carries what no other screen should load

The roster is fetched here and nowhere else because it carries **contact, address and employment**
data that sits in `learner_details`, a one-to-one table existing precisely because RLS filters rows
and not columns (`20261111120000`, whose own comment cites rules 1 and 5). Its read policy names
`admin`, `coordinator` and `viewer` and omits `trainer` entirely, so **RLS returns no
`learner_details` row to a trainer** and `mapLearnerRow` blanks all 25 detail cells via `orEmpty`.
That is the second reason for the redirect, and why the overall rule-5 trainer DTO trim and the
report screen agree: even if a trainer reached the page, the cells they came for would be empty.

`getTenantRosterSnapshot` also pages the `learners` table 1000 rows at a time (an API cap silently
drops the rest, which would shorten a large school's export with no error) and takes a separate
second `batches` query for the `training_calendar_code` and `tenant_qualifications →
qualifications` facts the export repeats on every line. Both queries' errors return `sync-failed`,
and the code says why: blank qualification cells would otherwise be indistinguishable from "not
recorded". Fetch shapes belong to
[module boundaries and the data pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md);
the schema end of it to [the data model](/openwiki/architecture/data-model-and-rls.md).

## EGACE as rates over an enrolled base

`domain/egace.ts` is pure (rule 14) and has no `EgaceCounts` source anywhere: `mapBatchRow` never
sets `Batch.egace`, so on live data every batch reads as untracked. The helpers are written for the
day a mapper does.

- **Enrolled is the denominator, and it degrades safely.** `egaceVal(b, 'enrolled')` falls back to
  the batch's scholar count, a number that exists even when outcomes do not; every other stage
  returns `0` when the batch has no `egace` block.
- **Rates use a different base than the totals.** `computeEgaceTotals` sums enrolled over *every*
  batch, but `egaceRate` is fed `outcomeEnrolledBase(rows)` — enrolled summed over only the batches
  that record outcomes — so batches with no outcome data cannot dilute a rate. `ReportView` builds
  it as `egaceRate({ ...totals, enrolled: outcomeEnrolledBase(rows) }, v)`.
- **Zero denominators give `0`, not `NaN%`.**

**A `—` is not a zero.** A metric with no source renders an em dash plus what is missing, never `0`
(rule 23). `EgaceOutcomesTable` takes a `hasOutcomes` prop and dashes every non-`enrolled` cell
while `!b.egace`, again across the whole TOTAL row while `hasOutcomes` is false (each dash carrying
an `sr-only` "Not recorded yet"), and switches the footnote to "…aren't recorded in TVI-CAMS yet";
`EgaceSummaryStrip` shows `—` plus "Not recorded yet" off the same flag and the same `i > 0` stage
index. A recorded real `0` still prints `0`, greyed — the distinction comes from the batch's
`egace` block, not from the value. `tests/unit/reports-domain.test.ts` pins the limit of that:
`egaceVal` alone returns `0` for both "0 employed" and "employment not tracked". Adding a live
`egace` mapper means deciding which stages are *blank* versus genuinely zero — do not just point
the mapper at a column.

The table is also where the only dates on this screen are printed: `formatDate(b.trainingStart) ??
'—'`, which always carries the year (rule 23).

## Employment follow-up

`domain/employment.ts` selects the same three ways:

- **Cohorts** are batches with an `employmentFollowUp` record. Like `egace`, nothing live sets it
  yet, so the section renders its "No cohorts are due" state rather than failing. `followUpDue` is
  metadata and does not gate selection.
- **Scholars** are the ones with `assessmentResult === 'Competent'` — certified, i.e. the
  population the ~6-month follow-up obligation applies to.
- **Totals** roll up `certified`, `employed` (wage *and* self-employed), `awaiting` and
  `unemployed`. The buckets deliberately **do not sum to `certified`**: `EMPLOYMENT_STATUSES.na`
  is `''`, so an uncaptured status counts as certified but lands in no outcome bucket rather than
  being counted unemployed, which would overstate a negative outcome in a TESDA report.
  `empTone` returns `neutral` for the same status, not red.

Live data hits that bucket because `employmentStatus` on the mapped `ScholarRow` is a hardcoded
`''` (`TODO(contract)` — post-training outcome has no column). So today every certified scholar
appears as certified-but-unclassified: `employmentRate` is `0`, and the table prints `—` for the
empty status badge and for occupation/employer/salary of anyone not employed.

## The XLSX writer

`domain/xlsx.ts` ships **no dependency** and is a hand-rolled zip-*store* archive — no compression,
so the XML parts are readable in the bytes — over the five minimal OOXML parts
(`[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`,
`xl/worksheets/sheet1.xml`). `buildXlsx(headers, rows, sheetName)` returns a `Blob` typed
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, row 1 the header, data from
row 2, all cells `inlineStr` (no shared-strings part), the sheet name escaped then truncated to
Excel's 28-character limit. It was moved out of the view component so it is unit-testable (rule 35)
and importable from the module's public surface (rule 8).

What a hand-rolled writer can get wrong, and what `tests/unit/report-xlsx.test.ts` pins instead:

| Failure mode | The test that fails first |
| --- | --- |
| A CRC-32 that disagrees with the IEEE polynomial | classic check vector `crc32('123456789') === 0xCBF43926`, and `0` for an empty payload |
| A zip Excel cannot open (lost local header or EOCD) | `PK\x03\x04` on the first four bytes, `PK\x05\x06` closing the archive |
| A part renamed or dropped | all five part paths still present |
| Rows numbered from 0 | `<row r="1">`, `r="2"`, `r="3"` and `A1`/`B3` cell refs |
| Unescaped `&`, `<`, `>`, `"` corrupting the sheet | inline value escaped to `&amp; &lt;w&gt; &quot;q&quot;` |
| `colRef` breaking past `Z` at column 27 | `<c r="AA1"` |
| A sheet name longer than Excel accepts | a long name absent from the output |

Not pinned, and the real risks: compression, styles, shared strings, and multi-sheet books. All
data is stringified, so a numeric cell will not be typed as a number in Excel.

`ui/exportXlsx.ts` keeps the DOM work — `buildT2misRows(rows, tenantOf)`, `buildXlsx` on
`T2MIS_HEADERS` into a sheet named `EGACE-Employment`, an object URL, an `<a download>`, and a
40-second revoke delay because revoking immediately cancels the download in some browsers. It
reports through a toast in every branch, including `Export failed` when the build throws. An empty
workbook is graded by `rosterFailed`: "Export unavailable" with a retry, not "Nothing to export".
It has no unit test of its own — the two rows-to-file seams it calls are what is pinned.

An inline-string sheet has one trap beyond the tests: a cell beginning `=`, `+`, `-` or `@` stays a
string, because `t="inlineStr"` and the `<is><t>` wrapper override any formula intent.

## Who fills the cells, and where they go blank

`T2MIS_COLUMNS` carries a value function per header, and the export renders the provider columns
from the **tenant catalog passed down by the route** (`resolved.profile.tenants`), the
qualification-registration columns from `Batch.t2mis` (attached from the roster's facts query), and
the learner columns from `ScholarRow`. `ReportView`'s `tenantOf` falls back to a
`{ code: '—', name: '—', region: '' }` placeholder — `regionParts` needs `region` and `province`
because schools seeded before the dedicated column store `Region IV-A · Laguna` in `region` — so a
tenant the catalog does not resolve blanks those provider cells to `''` instead of throwing.

So **the top rows of every exported line, and every learner cell, arrive from the roster fetch, not
from `getBatchesSnapshot`**. A near-empty roster yields a near-empty file, which is why the route
passes `rosterFailed` through and the toast upgrades a zero-row result to a failure.

### Export-legibility rules that are locked

Three rules make the file readable outside this app, and each one has a matching failure:

- **Dates always print the year and the sheet's own order.** Every date cell goes through
  `isoToT2misDate` to `MM/DD/YYYY` (rule 23's family); the worksheet body is `date_of_birth` and the
  roster derives `age` from an as-of date. `ageOn` is passed `todayInManila()` so a UTC date cannot
  back-date a birthday, and `mapLearnerRow` treats age `0` as unknown so the Age cell blanks rather
  than printing a false zero.
- **A metric with no source renders `—` plus what is missing, never `0`.** Where a cell has no
  format to dash into, the value function emits `''` — never a guess: `batch.t2mis?.sector ?? ''`
  is blank "until the batch is linked to its `tenant_qualifications` row". The round-trip test's
  third case proves a missing detail row and a missing qualification link both blank.
- **ULI is the permanent learner key.** The ULI column is what makes the file re-importable: on the
  way back in, `learnerImport.ts` requires a `uli` header, rejects a row without a valid one and
  reconciles by ULI (`reconcileWithExisting`), because `learner_no` is only unique per batch. An
  export keyed on anything else degrades on re-import — so the layout must keep ULI even if another
  column looks like a better identifier.

`tests/unit/t2mis.test.ts` is the pin: the header list matches the TESDA sample row exactly (48
columns, trailing-space `'Province '` included), provider/qualification/learner/training/employment
cells all fill, and an exported row **round-trips** through `parseLearnerCsv` + `validateRows` back
to the same learner columns with zero errors.

### The untracked/blank discipline

There is **no error-code predicate left in the source** — `grep 42703` matches nothing under
`modules/` or `app/` — so both roster queries fail the whole snapshot and `42703`, `PGRST200`,
`PGRST204` are the *historical* tolerance, not code. The discipline moved to the cell level and
must stay:

- A blank cell only means "not recorded" if the query succeeded, which is why `syncFailed` shows a
  warning while still rendering — the reader is told the report may be incomplete.
- Every learner cell goes through `orEmpty`, so a **`null`** and an **absent** `learner_details` row
  (RLS, no details row yet, or a pre-migration schema) both blank.
- So any change that *swallows* a roster error into an `ok` snapshot with blanks makes
  "not recorded" hide "the read broke". Any change that *fails* on a merely missing detail column
  makes the whole report disappear. Picking either is a decision, not a cleanup.

## Tests and constraints on a change

The three pins are `tests/unit/reports-domain.test.ts` (non-mutation of the batches it sums, the
0-instead-of-`NaN` guards, the bucket sum below `certified`), `tests/unit/t2mis.test.ts` (layout
order, the 48 count, the round trip, date and age rules) and `tests/unit/report-xlsx.test.ts` (the
writer's failure modes). None touches the route: the redirect, the ordering, the `withTenantAccess`
fold and the combined `syncFailed` are asserted only by types.

- Keep `—` and `0` distinct. Dropping the `hasOutcomes` gate, or defaulting employment to
  `unemployed`, is a copy change with compliance consequences (rule 23).
- Keep the redirect on `resolveTrustedRole`; switching to `resolveRouteRole` silently re-opens the
  `?role=admin` bypass.
- Keep the redirect *before* both fetches — it is the only thing stopping `learner_details` work
  nobody can read.
- Change the layout in `import-export/domain/t2mis.ts`, not here, and only against the header
  test. `20261111120000` is additive and nullable throughout, but it is **not re-runnable** — no
  `if not exists` guard on the `create table` or the two `add constraint` statements — so it can
  neither be replayed nor safely re-pushed; check
  [the data model](/openwiki/architecture/data-model-and-rls.md) for the schema and the live
  ledger before touching it.
- The six states (rule 24) are load-bearing on this screen; the `unconfigured` callout is the one
  still missing.
