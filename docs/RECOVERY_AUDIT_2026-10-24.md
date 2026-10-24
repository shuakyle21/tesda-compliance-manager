# Recovery audit — 2026-10-24

A point-in-time reconstruction of this project's real state, written after about a
month with no hands-on development. It exists because much of this repo was built
with AI assistance, and the written record had drifted from the code.

**Scope.** Investigation only. No code, schema, Linear issue or configuration was
changed while producing it.

**Status.** Accurate as of 2026-10-24. Sections B, D, G and H describe breakage and
task order that will change as soon as anyone acts on them — re-check against
`git log` rather than trusting this file after the first fix lands. Companion to
[`SESSION_HANDOFF_2026-10-24.md`](SESSION_HANDOFF_2026-10-24.md), which covers the
same day from the narrower angle of one branch's stranded work; where the two
disagree about PR #278, §G4 and §J4 here are the correction.

**Branch at time of writing:** `klynejoshua13/recover-stranded-openwiki-work` (PR #278 open).

## How to read the evidence labels

Every non-obvious claim below carries one of three labels. They are the point of the
document — an unlabelled assertion about this codebase is what caused the drift in
the first place.

| Label | Means |
| --- | --- |
| **[verified]** | Run or read first-hand in the session that produced this file. |
| **[inferred]** | Reasoned from evidence, not observed. The reasoning is given so you can disagree with it. |
| **[inherited]** | A doc, memory or earlier session claims it; not re-checked here. |

Precedence note: where this audit and [`RULES.md`](../RULES.md) appear to disagree,
`RULES.md` wins and the drift should be fixed — see [`RULES.md` §7](../RULES.md).

---

## A. Project in 60 seconds

Philippine vocational schools (TVIs) run government scholarship batches for TESDA under two programs, TWSP and CFSP. Each batch has to march through a fixed lifecycle — AOU → NTP → TIP → Training → Assessment → Billing — and each step needs paperwork filed, attendance proven, and eventually billing documents produced so the school gets paid.

Today that lives in spreadsheets and folders. This app replaces it with one internal tool: see every batch's stage, see which documents are missing, record attendance, hold LAMR evidence, and generate the three billing document types.

One rule shapes everything: **this tool has no official standing.** TESDA's own systems (SIS, T2MIS, BSRS) remain the real records. This is the school's internal working copy. That is why the UI must never say "approved" or "submitted to TESDA."

**Intended final product:** a multi-tenant web app where several schools share one deployment and a database rule (Postgres RLS) guarantees School A can never see School B's rows. Four roles: Admin, Coordinator, Trainer, Viewer.

---

## B. Current state — the short version

**What works:** the bundle compiles, the shell and all main screens are built, 267 of 269 unit tests pass, and the data layer pattern is genuinely well-made.

**Three things are actually broken right now:**

1. **`pnpm build` fails.** [verified] The bundle compiles in 9s, then the typecheck step stops on errors. `main` cannot be deployed as it stands. On `origin/main` that is **9 errors**; on this branch, which already carries PR #278's fixes, **5**.
2. **The sidebar user name is malformed JSX on `main`.** [verified] Not just a test failure.
3. ~~**The Supabase project is paused (`INACTIVE`).**~~ **Resolved the same day** — starting `pnpm dev` woke it, it now reports `ACTIVE_HEALTHY`, and it serves live tenant-scoped rows. See §G3; this was idle-pause, not an outage. Of the three, only the two code bugs were real, and both are now fixed (#281).

I never ran `pnpm dev`, so "runs locally" is not something I can claim.

**The underlying cause of #1 and #2:** [verified] no CI job runs `tsc`, `vitest`, `lint` or `build`. CI runs only Claude review, Qodana, CodeQL and the OpenWiki doc bot. So a broken build and a broken component both reached `main` with every check green.

---

## C. Development timeline

| When | What happened | Evidence |
|---|---|---|
| 2026-05-26 | Repo starts: PRD + Next.js scaffold | `4a40f5e` |
| Jun–Jul | Design system, docs, ADR-001 rewrites billing into a document-generating engine | `docs/adr/ADR-001` |
| 2026-07-05 | Repo restructured into `modules/` + `shared/` (DDD, TES-68) | PR #80 |
| 2026-07-12 | Billing module + statement preview built | PR #85 |
| Aug (165 commits) | Mock data retired; live Supabase contracts written; test harness stood up; create-user and school-registry screens | PRs #131, #213, #224 |
| **Sep (271 commits — the peak)** | Sidebar wired to real data, analytics de-faked, Qodana CI, complexity refactors | PRs #234–#250 |
| **2026-09-15** | ADR-007 (new dropout rule) opened as PR #243 — still open | PR #243 |
| **2026-09-16** | **Two bugs introduced here, both still live** | `74a6b15`, `d258763` |
| 2026-09-16 | Two PRs opened as drafts and left — #251, #252 | — |
| 2026-10-04 | Last real feature commit: sign-in redirect hardening. Phase 0 migration repair-recorded as applied | `942e827` |
| Oct 4–24 | Only the OpenWiki doc bot committing, plus one refactor merge on 10-17 | `#262`–`#277` |
| **2026-10-24 (today, earlier)** | An AI session recovered stranded edits, opened **PR #278**, wrote a handoff doc | `e1c68dd`, PR #278 |

**Two different stopping points — this matters.** [inferred] Your own hands-on work stopped around **2026-09-16**, with a thin tail to 2026-10-04. That matches "about a month away." The commits dated today are an AI cleanup session, not you resuming. Do not mistake PR #278 for where you left off.

---

## D. Feature completion matrix

Status key per your definitions. "Required tests" = what would have to exist before the status could become COMPLETE.

| Feature | Status | Where | Supporting commits / issues | Missing | Required tests | Confidence |
|---|---|---|---|---|---|---|
| **Auth chain (Clerk → Supabase → RLS)** | IMPLEMENTED BUT UNVERIFIED | `lib/supabase/server.ts`, `proxy.ts`, `app/(dashboard)/layout.tsx` | `942e827`; memory `live_data_cutover_map` | ~~Two dashboard toggles unverifiable from here~~ — **chain verified live 2026-10-24, see §G3**; session-refresh rough edge remains | Token-rejection path; session-refresh loop | **High** (observed working) |
| **Tenant isolation (RLS)** | IMPLEMENTED BUT UNVERIFIED | `supabase/migrations/20260528160300_*.sql` | #52, #233 open | **The security boundary, with zero tests** | Cross-tenant read denial; viewer write denial; `is_active` enforcement | **Low** |
| **Dashboard (FR-03/04/05)** | IMPLEMENTED BUT UNVERIFIED | `app/(dashboard)/dashboard/page.tsx`, `modules/batches/**` | `0f32159`, `b2c7732`; #65, #137 open | Role variants (#137); `billingDeadline` stands in as `end_date` (#130). **Fabricated persona names fixed 2026-10-24** — the header greeted every user as `Rosa C. Mendiola, Viewer` while the sidebar showed their real name, because `44783f7` de-faked the Sidebar and left this route's `ROLE_COPY` map behind | Live snapshot → render for each of the 4 roles | High on code; live data observed for one role |
| **Batch lifecycle** | PARTIALLY IMPLEMENTED | `modules/batches/domain/urgency.ts`, `data/batches.ts` | `urgency.test.ts`, `batches.test.ts` | Status transitions + validation not built (Plan §2.4); its `LifecycleStage` type is the broken one (G2) | Transition legality table; stage-map totality | Medium |
| **Documents & evidence (FR-06)** | IMPLEMENTED BUT UNVERIFIED | `modules/documents/**` | `doc-compliance`, `doc-blockers`, `evidence-path` tests; #40, #43 open | Trainer-scoped upload (#43); readiness matrix (#40) | Live upload round-trip; signed-URL expiry | Medium-high |
| **Billing engine (FR-09)** | PARTIALLY IMPLEMENTED | `modules/billing/**` (6 domain files) | PR #85 merged; `billing-readiness.test.ts`; #71–#74 open | **`.docx` generation not built** (#73); cost-schedule seed (#72) | Golden-file test per template; tranche gate at each threshold | High on math, none on output docs |
| **Reports (FR-15)** | IMPLEMENTED BUT UNVERIFIED | `modules/reports/**` | `report-xlsx.test.ts`, `reports-domain.test.ts` | Never run against live rows | Export against a real multi-batch tenant | Medium-high |
| **Analytics (FR-11)** | PARTIALLY IMPLEMENTED | `app/(dashboard)/analytics/page.tsx` | `b2c7732`; #45 open | No `data/`/`domain/` layer; aggregation lives in the page | Aggregation correctness on known fixtures | Medium |
| **Attendance (FR-07)** | **PLANNED ONLY** | `modules/attendance/README.md` | #42 open | **Page is a 28-line placeholder.** Its copy still names *Laravel*, never used here | Eligibility math per ADR-007; trainer-assignment guard | High (that it is absent) |
| **LAMR (FR-08)** | **PLANNED ONLY** | `modules/lamr/README.md` | #44, #116, #118, #119 open | README only. A headline MVP feature | Contract mapper; one-LAMR-per-module uniqueness | High (that it is absent) |
| **Import / export (FR-10)** | PARTIALLY IMPLEMENTED | `modules/import-export/**` | `learner-import.test.ts`; #47 open | README says **not wired to the real pipeline** | Commit-path integration; malformed-CSV rejection | Medium |
| **Notifications (FR-13)** | PARTIALLY IMPLEMENTED | `modules/batches/ui/dashboard/AlertsPanel.tsx` | #48 open | No drawer. Alerts themselves derive live — real, not mocked | Each alert rule fires at its boundary | Medium |
| **Settings (FR-14)** | PARTIALLY IMPLEMENTED | `modules/settings/ui/SettingsModal.tsx` | #49, #50 open | Preference toggles are session-local only; nothing persists | Persistence round-trip; role-gated member edits | Medium |
| **Tenancy / school registry** | IMPLEMENTED BUT UNVERIFIED | `modules/tenancy/**`, `app/(dashboard)/{users,schools}/new` | `b3361a6`, `c85668c`, PRs #213/#224; `user-access.test.ts` | Migrations recorded + objects present as of 2026-10-04 [inherited] | Self-seat prevention; atomic invitation+membership | Medium |
| **Role resolver** | **PLANNED ONLY** | — | #32, #136, #137 open | `?role=` is still a preview override. **Phase 1's exit gate** | Resolver precedence; Clerk-lookup-failure fails closed | High (that it is absent) |
| **Sidebar user card** | **BROKEN** | `modules/shell/ui/Sidebar.tsx:259` | `d258763` | See G1 | 2 tests already assert it | **High** |
| **Production build** | **BROKEN** | `lib/supabase/database.types.ts:34` | `74a6b15` | See G2 | `build` in CI | **High** |

---

## E. Architecture refresher

One Next.js 16 App Router app. No separate backend — the app talks to Supabase directly. Express.js appears in docs as a *future-only* direction; do not build it. (`drizzle-orm` and `postgres` sit in `package.json` but are imported nowhere — see G7.)

**The request path:**

```
Browser
  → proxy.ts                     Clerk middleware. Adds session + x-pathname. Does NOT gate access.
  → app/(dashboard)/layout.tsx   requireAuthenticatedUser() — this is the real gate.
  → modules/<domain>/data/*      Supabase query, anon key + Clerk session token
  → Postgres RLS                 makes every authorization decision
```

Because the gate lives in `(dashboard)/layout.tsx`, **any route group outside it is unguarded until it adds its own check.** `/api-docs` and `/api/openapi.json` do add their own — both verified guarded. [verified]

**The one thing to re-internalise:** RLS *is* the security boundary. Hiding something in the UI is convenience, never protection. Never filter by tenant in JavaScript — RLS already scoped the rows.

**Code layout** — grouped by domain, not by file type:

- `app/` — thin routes only. Fetch and compose. No business logic.
- `modules/<domain>/data/` — fetch → map → derive. The only place allowed to import `database.types.ts`.
- `modules/<domain>/domain/` — pure rules, no I/O. Unit-test with fixed dates.
- `modules/<domain>/ui/` — domain-aware components.
- `shared/` — leaf level. Props-only primitives. May never import `modules/` or `app/`.

Import direction `app → modules → shared → lib/supabase` is **enforced by ESLint**, so a mistake there fails lint rather than review.

**Two type families stay separate, deliberately:** `database.types.ts` (raw DB rows) and `shared/types.ts` (UI types). The mapper bridges them, including enum renames (`training→train`, `assessment→assess`, `billing→bill`). Component code only ever sees UI types.

**Error shaping:** data functions return a tagged snapshot — `ok` / `no-tenant-access` / `sync-failed` / `unconfigured` — so a screen maps a state straight to UI. Critically, **no state may substitute fake data**; a missing database renders an honest empty state.

---

## F. Last known stopping point

**Your real last feature push: 2026-09-15/16.** You were doing two things at once:

1. **Replacing the last fabricated UI values with real data** — `44783f7` "Replace hardcoded values in Sidebar with real profile/tenant data", `b2c7732` "Replace fabricated alert counts in analytics with live batch data". The tail of the mock-data retirement.
2. **Correcting a domain rule** — ADR-007, replacing the ≥5-absence eligibility rule with TESDA's real 20% / 3-consecutive-unexcused dropout rule. Opened as PR #243 on 09-15. **Never merged.**

**What finished:** the sidebar and analytics de-faking merged (#247, #250). Qodana CI landed. Four complexity refactors landed.

**What was left mid-air:** PR #243 (open, mergeable), PR #251 TanStack Query drill-in (draft), PR #252 shared code reviewer (draft), #236/#237 refactors (open).

**Decisions you made and should keep:** billing is a document engine, not a status flag (ADR-001); the packet queue projection (ADR-003); untracked documents are a third state, excluded from both halves of a percentage (ADR-004); platform admin reverses PRD FR-02 (ADR-006).

**The blocker you did not resolve:** the role resolver (#32/#136). Everything role-specific waits on it, and it is Phase 1's exit gate.

**What you were probably about to do next:** [inferred] merge #243, then build `modules/attendance/domain/eligibility.ts` against the new rule — PR #243's own test plan lists exactly that. Attendance is also what unblocks billing tranches.

**Possible stranded work besides PR #278.** [verified] 18 branches are unmerged into `origin/main`. Three hold commits that exist nowhere on `main`:

- `remove-mock-data-cc-refactor` / a branch literally named `a1f6533d7cb2…` — **7 commits ahead**, including `9a12516 Update supabase/seeds/verify_user_admin_setup.sql`. Worth a look.
- `fix/akb-tenant-migration` — 1 commit, `b106317 fix: reconcile rogue public.tenant table into canonical public.tenants`. Superseded by migration `20260717054607`, which is on `main` and applied. [inferred] Probably safe to delete.
- `klynejoshua13/tes-70-billing-module-ui-screen-statement-preview-fr-09-adr-002` — 1 commit; PR #85 merged a squashed equivalent. [inherited: memory] Probably safe to delete.

---

## G. Technical debt and risks, worst first

### G0. No CI runs typecheck, tests, lint or build — **this is the root cause** [verified]
`.github/workflows/` holds only `claude-code-review`, `claude`, `openwiki-update`, `qodana`, `stale`. None invokes `tsc`, `vitest`, `eslint` or `next build`; grep for those strings across all five returns nothing. PR #278's check list confirms it. That is how both bugs below reached `main` with checks green.

Playwright e2e also exists (`e2e/auth.spec.ts`) and is not in CI; `test-results/.last-run.json` is dated **2026-08-30**, so it has not run in about two months. [verified]

### G1. The sidebar user name is malformed JSX on `main` [verified]
`modules/shell/ui/Sidebar.tsx:259`:
```jsx
<span className="sb-user-text">
  userName={fullName?.trim() || NO_NAME_LABEL}     ← the <span> was deleted
```
Commit `d258763` (2026-09-16), message "Update modules/shell/ui/Sidebar.tsx", co-authored by coderabbitai — **a CodeRabbit suggestion accepted through the GitHub web UI**. The suggested *prop* was pasted into JSX *children* position, deleting `<span className="sb-user-name">`. Present on `origin/main` [verified by `git show`].

The deleted element is verified. What a browser renders I did **not** observe — [inferred] from JSX parsing rules, `userName=` becomes literal text beside the name. The two failing tests, which look for an `sb-user-name` element and find nothing, are telling the truth either way.

Lesson worth keeping: accepting a bot's one-line suggestion in the web UI skips your local typecheck and test run.

### G2. `LifecycleStage` enum casing drift breaks the build [verified]
`lib/supabase/database.types.ts:34` declares `'AOU'` and `'NTP'` uppercase. The canonical migration says lowercase, and the migration wins. Introduced by `74a6b15` (2026-09-16) "add inline comments explaining LifecycleStage values" — the uppercasing rode in with the comments.

Produces 5 `tsc` errors and fails `pnpm build`.

**Good news:** runtime is fine. `DB_TO_UI_STAGE` uses lowercase keys that match the real database values, so queries and mapping work correctly. A types-only defect. Fix = two string literals.

### G3. ~~Supabase project is paused~~ — **resolved the same day; the auth chain is now verified working** [verified]

> **Correction, 2026-10-24.** This section reported `status: INACTIVE` and concluded that "every
> data screen shows an honest empty state and no schema claim can be re-verified". Both halves
> turned out to be wrong within hours, and the correction is the most load-bearing update in this
> document, so the original reading is kept here rather than overwritten.

**What the audit saw.** Project `azywaivpyphhsblxjgtn` (`tesda-compliance-manager`) reported
`status: INACTIVE`, and `list_migrations` timed out while `get_project` answered — the signature of
a paused instance.

**What actually happened.** Starting `pnpm dev` woke it. The project now reports
**`ACTIVE_HEALTHY`**, and `/dashboard` served **live tenant-scoped rows** — AKB Technical
Vocational Inc., 3 schools, 4 active batches, 89 scholars, 75% average progress — under the real
signed-in identity.

**Why that matters more than the pause did.** It is the first end-to-end proof that
**Clerk → Supabase → RLS works**. §D rated that chain `IMPLEMENTED BUT UNVERIFIED` at medium
confidence, and memory `live-data-cutover-map` suspected two unset dashboard toggles. RLS-scoped
rows reaching a page under a real identity settles it: the toggles are set and the chain is live.
No amount of reading could have established that — a paused free-tier project reads as broken
infrastructure from the API and as working the moment anything connects.

**The lesson worth keeping,** since it will recur: `INACTIVE` on this project is not an outage and
not data loss. It is idle-pause, and it self-resolves on first connection. Check it by connecting,
not by asking the API.

**Two caveats that stand.**

- The dev-server log carries `Clerk: Refreshing the session token resulted in an infinite redirect
  loop ... keys do not match`, and a restart left the client reporting "You're already signed in"
  while the server threw `No Clerk session token available`. So the chain works, but session
  handling has a real rough edge worth its own look. Not a blocker — data flowed.
- Row counts above are what the page rendered, not a `count(*)`. Confirming them needs
  `execute_sql`, which RULES rule 36 gates behind explicit permission.

**Do not run `rm -rf .next` while `next dev` is running.** It deletes
`.next/dev/routes-manifest.json` out from under the server, and every route then 500s with `ENOENT`
until it is restarted. It looks exactly like a code regression and is not one. Stop the dev server
first, or build in a separate checkout.

### G4. PR #243 and the repo now disagree about whether its migration is applied — **do not merge as-is** [verified that they disagree]
PR #243 edits the migration `20260910120000_add_adr001_billing_domain.sql` **in place**, justified in its own description: *"still unapplied to the live project (confirmed via list_migrations, 2026-09-15)."*

Two later records say it has since been applied — `supabase/migrations/README.md` (committed today, inside PR #278) and memory `tes36-phase0-migration`, both citing a full live object inventory on **2026-10-04**: enum, 7 tables, 17 columns, 9 indexes, 6 triggers, 15 policies, 2 seed rows. Both of those are [inherited]; today's handoff explicitly says the live state was not re-verified.

[inferred] The timeline resolves cleanly: on 09-15 the migration genuinely was unapplied, so editing in place was defensible. On 10-04 it was applied — from **`main`'s** version, which still has `max_absences`. If that holds, merging #243 now leaves the repo file claiming `max_absence_percent` while the live column is `max_absences`, and nothing re-runs because the recorded version already matches. ADR-007 would need a **new additive migration** instead.

**The single fact that settles it,** once Supabase is back: does `program_billing_rules` have `max_absences` or `max_absence_percent`, and does `attendance_records` have an `excused` column?

### G5. The security boundary has no tests [verified]
RLS and tenant isolation decide every authorization outcome and have zero automated coverage. Issue #52 open since 2026-07-25. Issue #233 flags a `public.tenants` policy missing its `is_active` check. The repo's own CLAUDE.md calls real-Supabase RLS tests "outstanding." `get_advisors` returned an empty list, but it was run while the project was paused, so that is **not** a clean bill of health. The project is live again (§G3), so it is worth re-running before anyone treats the empty result as meaningful.

### G6. Docs contradict each other on the eligibility rule [verified]
`RULES.md:146`, `CONTEXT.md`, CLAUDE.md and the wiki all still state "≥5 absences is ineligible." ADR-007 replaces it with 20% / 3-consecutive-unexcused — and ADR-007 exists only on the unmerged branch. Right now the repo teaches a retired rule to anyone, human or agent, who reads it. PR #243 itself lists four more prose docs it knowingly left stale.

### G7. `.env.example` would not configure a working app [verified, names only]
It lists four names: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_CLERK_USER_EMAIL`, `E2E_CLERK_USER_PASSWORD`.

Your working `.env.local` needs ten. Missing from the example: **every Supabase variable** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), `CLERK_WEBHOOK_SIGNING_SECRET`, and the client-readable `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — the example's unprefixed `CLERK_PUBLISHABLE_KEY` is a name the browser cannot read. Anyone setting up a fresh clone, including a future you on a new machine, gets a half-configured app with no obvious cause. A deployment blocker in waiting.

### G8. Dead database dependencies [verified]
`drizzle-orm`, `drizzle-kit` and `postgres` are in `package.json`; `DATABASE_URL` is in `.env.local`. Grep across `app/ modules/ shared/ lib/ proxy.ts` for `drizzle`, `from 'postgres'` and `DATABASE_URL` returns **zero hits**, and there is no `drizzle.config.*`. [inferred] Leftovers from the Cloud SQL plan that was drafted and never started. Harmless but misleading — they imply a second database path that does not exist. Worth removing, or recording why they stay. `next-swagger-doc` belongs in the same category — see §G9.3.

### G9. 34 open Dependabot alerts — but only two reach code this app runs [verified]

Surfaced by GitHub on push, not by anything in the audit above: **34 open alerts on the
default branch — 2 critical, 17 high, 14 moderate, 1 low**, all against `pnpm-lock.yaml`.
By Dependabot's own scope split that is **20 runtime** (1 critical, 12 high, 6 medium, 1 low)
and **14 development** (1 critical, 5 high, 8 medium).

The raw count overstates the risk, and the breakdown matters more than the total.
**Dependabot grades the package, not this app's exposure** — it cannot see which import
paths exist here. Four groups, worst first:

**1. `next` — the only alert against a direct runtime dependency.** Installed **16.3.4**.

| Severity | Advisory | What it is | Patched | Reachable here? |
| --- | --- | --- | --- | --- |
| **critical** | `GHSA-vcvr-r3jv-pc5j` | Remote code execution in `next/og` `ImageResponse` | 16.3.6 | **No** [verified] |
| medium | `GHSA-3w37-wq28-93x7` | Pending `use cache` fill can leak Draft Mode content into regular responses | 16.3.8 | **No** [verified] |

Neither is reachable as the app is written: grep across `app/ modules/ shared/ lib/` finds no
`next/og`, no `ImageResponse`, no `opengraph-image`, no `use cache` and no `draftMode`.

That is a reason to rank it calmly, **not** a reason to leave it — a later feature adding an
OG image would silently make the critical live.

> **Correction, 2026-10-24.** This paragraph first claimed the fix was a patch-level move
> "inside the existing range" with "no manifest edit and no breaking-change risk", labelled
> `[inferred — not run here]`. Running it falsified two of those three claims. The label was
> honest; the content was still wrong, which is the failure mode this document's labels exist
> to surface rather than excuse. Replaced with what the run showed:

`pnpm update next` resolves to **16.4.3**, the newest release satisfying `^16.3.4` — a
**minor** bump, not the patch the 16.3.6/16.3.8 advisory numbers suggest. It also **rewrites
the manifest** spec to `^16.4.3`, because `pnpm update` syncs the range to what it installed
rather than leaving it alone the way `pnpm install` does. The lockfile moves 501 lines and
gains 15 packages (`rolldown`, `sharp`, `postcss@8.5.31`, `nanoid`, `picomatch`,
`source-map-js@1.2.2`). So it is still cheap, but it is a dependency change worth reviewing,
not a one-line edit. [verified — PR #280]

It is also **safe on the evidence, and repairs nothing.** Measured against a baseline taken
on `origin/main` before the bump — necessary because `main` already fails, so an after-only
reading cannot tell a regression from existing breakage: [verified]

| Check | Before (16.3.4) | After (16.4.3) |
| --- | --- | --- |
| `tsc --noEmit` | 9 errors | 9 errors, same line:column |
| `pnpm test` | 267/269, 2 sidebar failures | identical |
| `pnpm build` | fails at type check | fails at type check |
| `pnpm lint` | 1 warning, 0 errors | identical |

No regression and no repair, correctly — none of those failures were Next's. That baseline
also independently confirms §B's split of **9 errors on `main` versus 5 on #278's branch**.
What it does **not** show is any runtime behaviour: the build never reaches route generation
because the typecheck gate stops it. (§H task 1 has since landed, so the build does reach route
generation — and §G3's project is live, so pages now render real data.)

One alert this does **not** clear, against the expectation above: `source-map-js`
`CVE-2026-93749` (high). Version 1.2.2 enters the tree, but Next 16.4.3 still bundles
`postcss@8.5.23 → source-map-js@1.2.1`, so the vulnerable copy remains. [verified]

**2. `swagger-ui-react` roots most of the runtime noise.** `pnpm why` traces **14 of the 20
runtime alerts** to this one dependency:

- `axios` — 10 alerts (via `swagger-client` → `@swagger-api/apidom-reference` → `axios 1.19.0`)
- `follow-redirects` — 2
- `dompurify` — 1, `sprintf-js` — 1

Its entire use in this codebase is **one file**: `app/api-docs/SwaggerUIViewer.tsx`, loaded
`dynamic(..., { ssr: false })`, behind `requireAuthenticatedUser()`. An internal,
auth-gated, client-only developer page — not a product feature any TVI coordinator touches.

So the highest-leverage security action here is not a version bump but a **scope decision**:
dropping `swagger-ui-react` retires roughly 14 runtime alerts at once. Note `sprintf-js`
`CVE-2026-97058` reports **no patched version at all**, so removal is the only route that
closes it.

**3. `next-swagger-doc` appears to be dead weight.** [verified] It is imported nowhere —
`app/api/openapi.json/route.ts` serves the **static** `docs/openapi/openapi.json` via
`import spec from "@/docs/openapi/openapi.json"`. Same category as the unused database
packages in §G8, and it contributes `js-yaml` / `brace-expansion` alerts for nothing.

**4. The 14 development-scope alerts do not ship.** They come from tooling —
`@modelcontextprotocol/sdk` and `hono` (OpenWiki), `vite` / `esbuild` (Vitest),
`compression` and the critical `proxy-addr` (`serve`, used only by `pnpm preview`),
`fast-uri`, `ip-address`. Real for anyone running those commands locally; not part of the
deployed app. Routine `pnpm update` territory, not an incident.

**Why the audit missed this.** §G8 examined dependencies for *dead weight* and never once
checked them for *known CVEs*. For a tool holding school compliance records that was a real
blind spot, and it only came to light because `git push` printed a warning. Worth a standing
check rather than an accident: Dependabot alerts are visible to `gh api
/repos/{owner}/{repo}/dependabot/alerts`, which a CI job could read on a schedule.

**Suggested order,** fitting into §H rather than displacing it: `pnpm update next` **— done,
PR #280** (it was the only runtime critical); the `swagger-ui-react` /
`next-swagger-doc` scope decision as its own small PR, since removing a page is a product
call; dev-scope updates whenever the lockfile is next touched.

**Not verified here:** nothing was bumped, installed or re-scanned. Reachability above is
from grep and `pnpm why`, which prove no *static* import path exists — they do not rule out
a dynamic or transitive call, and they say nothing about whether a patched version builds
cleanly.

### G10. Lower-severity items
- `NEXT_PUBLIC_DEMO_PASSWORD` is read in a client component (`app/sign-in/.../sign-in-page.tsx`), so a demo credential ships in the browser bundle. Intentional per ADR-005, but worth a conscious look. [verified]
- Service-role key confined to `lib/supabase/service.ts`, server-only. Correct. [verified]
- `/api/debug/auth-check` returns 404 in production. Correctly gated. [verified]
- 20 TODO markers. Most are documented contract gaps, which is honest. Three in `app/page.tsx`, `app/layout.tsx`, `app/globals.css` are leftover scaffolding instructions. [verified]
- One lint warning, `DocumentsView.tsx:129`, pre-existing. [verified]
- Qodana has failed on every branch including `main` since ~2026-10-20 — an expired token, not your code. [inherited: memory]
- `docs/` holds 25+ overlapping planning documents. Precedence is written down, but the volume is a hazard.
- Stale bot is properly disabled; last run 2026-07-25; the six damaged issues are open again on GitHub. The Linear side is unverified. [verified / inherited]
- Disk is at 46% with 14 GB free — the chronic pressure noted in memory is not biting today. [verified]

---

## H. Recommended next five tasks

**Dependency note that changes the order:** PR #278 carries the four join-cast fixes. `origin/main` has **9** typecheck errors; this branch has **5**. So the enum fix alone, on a fresh branch from `main`, leaves 4 errors and a still-failing build. Either merge #278 first, or stack the fixes on its branch.

| # | Task | Why | Depends on | Size |
|---|---|---|---|---|
| **0** | **Correct PR #278's handoff doc, then merge it** | It carries the 4 cast fixes everything else measures against. Its own doc says "Not pushed, no PR" while sitting inside PR #278 — fix that first (J4) | none | **XS** |
| **1** | **Fix the enum casing** — `'AOU'→'aou'`, `'NTP'→'ntp'` in `database.types.ts:34`, keeping the comments | Takes the build from failing to passing. Nothing else is safe to verify while it is red | **Task 0** | **XS** — 2 literals |
| **2** | **Fix the sidebar JSX** — restore `<span className="sb-user-name">{fullName?.trim() \|\| NO_NAME_LABEL}</span>` | Visible defect on `main`; two tests already assert the right behaviour, so they verify the fix for you | none (can ride with 1) | **XS** |
| **3** | **Add a CI job running `tsc`, `vitest`, `lint`, `build` on every PR** | Without it, 1 and 2 recur. The single highest-leverage change here | 1, 2 green first | **S** — one workflow file |
| **4** | **Resume Supabase, then re-verify the migration table** | Gates every live claim, and settles #243 (G4) | dashboard access | **S**, then **M** |
| **5** | **Build `modules/attendance/domain/eligibility.ts`** (after re-cutting ADR-007 as a *new* additive migration) | Where you were actually heading. Pure domain logic, unit-testable, unblocks billing tranches | 4, #243 | **M** |

**Already done, out of band:** `pnpm update next` (16.3.4 → 16.4.3, **PR #280**) clears the only runtime-critical dependency alert. Verified as no regression across tsc/test/build/lint against a baseline on `main`, which is a weaker claim than "working" — task 1 is still what lets a Next upgrade reach a successful build. See §G9.

**Then:** the role resolver (#32/#136) and an RLS test suite (#52) are the two biggest remaining risks. Both deserve their own focused sessions.

---

## I. Your first coding session back

**Do tasks 1 and 2 together, on top of PR #278's branch, as one small PR.**

Why these: two string-level edits, each with an immediate objective pass/fail signal, and they walk you through the three places that matter most here — the generated-types boundary, the shell component, and the test harness.

The loop (on top of #278):

```bash
pnpm exec tsc --noEmit    # 5 errors → expect 0
pnpm test                 # 267/269 → expect 269/269
pnpm build                # fails → expect success
```

If you instead branch from `main`, start from **9** errors, not 5, and expect the cast fixes to be part of your diff.

Going green on all three re-establishes something you currently do not have: **a trustworthy baseline.** Right now you cannot tell a new breakage from the existing two.

One judgement call inside task 1: RULES §20 says regenerate `database.types.ts` rather than hand-patch it. But the file is hand-maintained (its own header says so, and it stubs every `Relationships` as `[]`), and at the time regenerating needed the project, which was paused. Hand-patching the two literals was the pragmatic move — said so in the commit message.

**Update:** both fixes landed in **PR #281**, and §G3's project is live again, so the constraint that justified hand-patching has lifted. Regenerating `database.types.ts` properly — which would also populate the stubbed `Relationships` and retire the four `as unknown as` join casts from PR #278 — is now possible and worth its own task.

Then do task 3 while the lesson is fresh.

---

## J. Questions only you can answer

1. **PR #243 / ADR-007.** The migration it edits in place now looks applied (G4). Rework ADR-007 as a *new* additive migration, or do you have reason to believe `20260910120000` really is unapplied?
2. **Supabase.** The project woke on its own (§G3), so resuming is moot — but the schema questions are still open, and §G4 in particular needs one live column check. May I run `execute_sql` for that? RULES §36 and your standing rule require an explicit yes.
3. **Linear.** The MCP server is unauthenticated, so **Phase 2's Linear half is not done.** I could not compare issue status against code, nor check whether the stale-bot damage was repaired on the Linear side. Authorize via `/mcp` if you want that finished.
4. **PR #278's handoff doc.** It says "Not pushed, no PR" and "Nothing has been committed or pushed" — but it lists three commits and sits inside open PR #278, which it never mentions. Correct it before merging? (This is task 0.)
5. **The four idle PRs** (#236, #237, #251, #252) and the three stranded branches in F — revive, or close and delete?
6. **`OPENWIKI_MODEL_ID: "flash"`** (in PR #278) is unverified; nobody confirmed the provider accepts that literal. Check before relying on a nightly run.
7. **Two untracked files.** `openwiki/.langsmith.json` — commit or drop? `opencode.json` carries your Supabase project ref and belongs in `.gitignore`.
8. **Stack confirmation.** Docs call Express.js future-only; the attendance placeholder still names *Laravel*, never used here; `drizzle`/`postgres` are installed but unused (G8). Confirm the stack is Next.js + Supabase only and I will flag the stale copy and the dead deps.

---

## What I could not verify

- **Linear** — server unauthenticated. No issue/milestone comparison against code. Phase 2 is incomplete on this side.
- **Live Supabase schema, RLS policies, functions** — not re-checked. `list_migrations` timed out while the project was paused, and the migration state table is still inherited from earlier sessions. The project is live again (§G3), so this is now answerable rather than blocked — it just needs doing, and §G4's column check needs `execute_sql` permission.
- **Clerk dashboard config** — server unauthenticated. The two toggles the live-data cutover needs stay unconfirmed.
- **Runtime behaviour of any screen** — no live database and no dev server run, so nothing was exercised in a browser.
- **Deployment** — no host or Vercel deployment was inspected; I do not know whether anything is deployed anywhere.
- **`get_advisors`** returned an empty list, run while the project was paused, so it means nothing. Re-runnable now (§G5).
- **Dependency fixes (§G9)** — nothing was bumped, installed or re-scanned. The reachability findings come from grep and `pnpm why`, which prove no *static* import path exists; they do not rule out dynamic or transitive calls, and they say nothing about whether a patched version builds cleanly.
