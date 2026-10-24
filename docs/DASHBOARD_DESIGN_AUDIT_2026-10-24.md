# TVI-CAMS Dashboard — Design-System & Data-Integrity Audit

**Date:** 2026-10-24 · **Scope:** `/dashboard` route and the shell KPI row shown on every other route · **Mode:** read-only (no production code changed)

Reference spec: `tesda-cams-frontend-design` skill (`.claude/skills/tesda-cams-frontend-design/` — `SKILL.md`, `references/{tokens,components,deviations}.md`), `RULES.md` §3–§5, ADR-001/003/004/007.

---

## 0. Method, caveats, and how to read this

- **Code-traced, then confirmed live.** Each reported symptom was first traced from its render site back to its root cause. It was then checked against the running app at `localhost:3000`, using the session already signed in to the in-app browser (Clerk user Joshua Klyne Pudadera; ADMIN in the sidebar, VIEWER on the dashboard, see I5). §2a maps each row to what the screen showed. The screenshots it numbers (01–05) were captured locally and are **not committed**: they show real people's names and this repository is public.
- **What was not checked live:** other roles (only this one session), `?state=` preview overrides, and Figma. Contrast figures are computed WCAG ratios from token hex values (the live `--color-text-muted` was confirmed as `#97968E`).
- **Source-of-truth hierarchy applied** (from the skill): `ui_kits/admin/` prototype > token CSS > `deviations.md` > prose spec. Where the code disagrees only with the prose spec but matches the prototype, it is **not** logged as a violation (e.g. the 7-step pipeline with ENTRE).
- The objectives list ended at "Unnecessary". I read it as **unnecessary or low-value elements**.
- "Registrar" is not a role in code (`UserRole` = owner | admin | coordinator | trainer | viewer, `shared/types.ts:87`). It appears only as a UI label for any multi-school user (`modules/shell/ui/Sidebar.tsx:322,331`). Registrar findings below use that meaning.

**Severity**

| Level | Meaning |
|---|---|
| **S1** | Wrong, fabricated, or contradictory number/status on a compliance surface — a coordinator could act on it |
| **S2** | Status legibility, accessibility failure, or semantic-color breach that can cause misreading |
| **S3** | Consistency / reuse drift that will produce future S1/S2s |
| **S4** | Polish |

**Type** (one primary per row): **DSV** design-system violation · **GAP** missing design-system spec · **IMP** implementation defect · **UX** usability problem · **DATA** data or business-logic issue

---

## 1. Executive summary

The dashboard's visual language mostly follows the system. Plex is everywhere, Tabler icons are used throughout, there is no emoji or gradient slop, and `MetricCard`/`InfoCallout` honour the no-left-border deviations. **The serious problems are not aesthetic.** They come from six root causes:

1. **Contract stand-ins render as facts.** `end_date` stands in as the billing deadline. `currentDay/totalDays` are literal `0`. `egace` is never mapped. The document-requirement catalog is passed as `[]`. Each widget then faithfully draws a number that means nothing.
2. **Generated types are stale.** Migration `20260910120000` added `batches.total_sessions` and `entrepreneurship_delivered`, but `lib/supabase/database.types.ts` contains neither (RULES 20). That is why the mapper still hardcodes `0`.
3. **Parallel implementations have drifted.** There are two KPI rows (`MetricsRow` and `DashboardKpiGrid`), two lifecycle renderers (`LifecyclePanel` and `LifecyclePipeline`), two urgency engines, and four different countdown strings (RULES 25).
4. **Hardcoded literals sit on compliance surfaces.** `3/7`, `BAT-2`, `On plan for Q2`, `All training ongoing`, `loaded at 14:02`, and `Jun 19 2026` as "today".

All five reported symptoms, and the multi-school aggregation, were **confirmed on the live app** (§2a). Two problems were found only by looking at the screen: the dashboard shows an admin as Viewer (I5), and Earliest Billing strips the year so a 2025 date reads as upcoming (A18).
5. **Semantic color drifts inside the d3/SVG widgets.** They hand-draw badges and status marks instead of using the primitives, so CFSP turns green, "done" turns blue, and training turns amber.
6. **The design system itself has gaps.** `--color-text-muted` fails AA. Metric-card severity is color-only by the system's own deviation #3. There are no panel-scale state specs, no definition of "stale", and no "unknown value" state for the progress bar or urgency indicator.

---

## 2. The reported inconsistencies — traced to source

| Reported symptom | Where it renders | Root cause | Type |
|---|---|---|---|
| **Negative countdowns** (`-40 days left`) | `DashboardKpiGrid.tsx:46`; `MetricsRow.tsx:66` (also prints `Infinity days remaining`); alert text `alerts.ts:43` ("billing window opens in -12 days"); timeline tooltip `BatchTimeline.tsx:119` | `daysToBilling = daysUntil(row.end_date)` (`batches.ts:240-243`) uses training end as a stand-in for billing due. `deriveDashboardMetrics` sorts **all** batches, completed ones included (`metrics.ts:32-34`; again in `page.tsx:271`), so the longest-finished batch becomes "earliest". The domain `urgencyTier` has no overdue tier (`urgency.ts:9-13`), and `urgency.test.ts:13` pins `-3 → critical`. The design system already specifies the answer: Urgency Indicator shows *"Overdue" in red when negative, "Today" at 0* (`components.md` §6), and `shared/ui/UrgencyIndicator.tsx:73-75` implements it, but no dashboard surface uses it. | DATA + IMP |
| **Day 0/0** | `BatchTimeline.tsx:109` (`TRAINING · Day 0/0`), `BatchCard.tsx:101`, `BatchModal.tsx:197`, `AnalyticsView.tsx:43-44` | `mapBatchRow` hardcodes `currentDay: 0, totalDays: 0` (`batches.ts:257-258`). The real source `total_sessions` exists in migration `20260910120000_add_adr001_billing_domain.sql:302`, but the types were never regenerated (0 matches in `database.types.ts`). Sessions held is meant to be a count over `attendance_records` (same migration, notes at lines 32-37). | DATA |
| **Lifecycle progress mismatch** | Dashboard "Lifecycle" panel, timeline, cards | Four separate mechanisms: **(a)** the counter is the literal `3/7` (`page.tsx:541`). **(b)** `progressPct` comes from the hand-typed `progress_percent` column (`batches.ts:228`; the migration header at lines 9-11 calls it "a number a human typed"), while stages come from `current_stage` (`batches.ts:238`), so a batch can sit at AOU with 85% and count as Billing-Ready. **(c)** ENTRE is in `UI_PIPELINE` (`batches.ts:124`) even though the comment at `:97` says it is omitted, so it is auto-marked **done** for every batch past training, regardless of `entrepreneurship_delivered`. **(d)** Two color encodings on one page: `LifecyclePanel` uses done = green / active = blue, the timeline uses done = blue / active = amber. | DATA + IMP + DSV |
| **Stale data** | `DashboardHeader.tsx:42-43` ("Data as of … STALE") | `dataAsOf` = newest `updated_at` across batch rows (`batches.ts:284-289, 310`). `STALE` fires when that is more than 24h old (`page.tsx:90, 110-112`). Every request is a live fetch (`cache()` is per-request, `batches.ts:292-297`), so `STALE` measures **edit inactivity, not data staleness**: a quiet weekend shows STALE on fresh data. "Data as of" prints the last edit time, not the fetch time. RULES 24 requires a stale state but never defines what it measures (GAP). | DATA + GAP |
| **Conflicting metrics** | KPI row vs header vs panels vs other routes | **(a)** Mixed populations: Active Batches counts `ongoing` only (`metrics.ts:30`), while Total Scholars ("current active roster", `DashboardKpiGrid.tsx:80`) and Avg Progress count every status (`metrics.ts:26-29`). **(b)** A second KPI row, `MetricsRow`, shows on every route except `/dashboard` (`layout.tsx:59-64`) with different rules: Avg Progress turns amber below 60% (`MetricsRow.tsx:53-56`), the dashboard never tints it, and the doc and billing sub-copy differs. **(c)** "Billing-Ready" is amber/warning in the KPI (`DashboardKpiGrid.tsx:54-56`) but green in Alerts (`alerts.ts:35`) for the same fact. **(d)** The KPI ignores the `billDone` guard that Alerts applies (`alerts.ts:41`), so the two disagree about the same batch. | DATA + DSV |

## 2a. Live confirmation (localhost:3000, 2026-10-24, 1440px and 375px)

Live data: 5 batches across three schools. One is completed (`DEV-J3ED-002`, training Nov 4 → Dec 15, 2025, BSRS verified). Four are ongoing, with training ended Jun–Jul 2026.

| Row | What the screen showed | Screenshot |
|---|---|---|
| A1 + **A18** | Earliest Billing: **`Dec 15`** over **`DEV-J3ED-002 · -313 days left`**, in red. The year is stripped, so a Dec 2025 date reads as an upcoming one, and the card is driven by the *completed* batch | 01 |
| A2 | Timeline bars: **`TRAINING · Day 0/0`** on all four batches. Batch card: **`DAY 0 OF 0`** | 02, 05 |
| A3 | Lifecycle panel for `DEV-J3ED-002`: **all seven pills green**, counter reads **`3/7`** | 03 |
| A7 | Header: `Data as of Aug 31, 2026 · 14:20 STALE` on a page that fetched live seconds earlier | 01 |
| A8 / A9 | Doc Compliance `—` "document sync pending" | 01 |
| A10 | Donut centre `— not tracked`, legend `Verified 0 0% · Submitted 0 0% · Pending 0 0% · Missing 0 0%` | 01 |
| A11 | EGACE: `0` on all five tiles, "0% of enrolled", meta "J3ED cohorts · T2MIS terminal report", with five colored 3px left borders | 01 |
| A12 | Trend: "No trend data yet." under "last 6 weeks" | 01 |
| A16 | Program Breakdown: **`BAT-2`** beside the 75% all-batch average | 03 |
| **A20** | Timeline x-axis is Apr–Aug, so today (Oct 24) is off-axis and no TODAY line draws, although the footer says "the red line marks today". Four batches overdue by 106–138 days look like ordinary bars | 02 |
| B1 | Active Batches **4**, Total Scholars **89**, which is 15 + 74 across all **5** batches, the completed one included | 01, 03 |
| B2 / B3 / **A19** | `/batch-cards` shell row: `TOTAL BATCHES 5 · All training ongoing` (one is completed), `AVG PROGRESS 75% · On plan for Q2`, `-313 days remaining`. Page header "5 active batches" vs dashboard "4 active batches". Callout "loaded at **14:02**" | 05 |
| B4 | Billing-Ready KPI label amber; the same batch's alert row green | 01, 02 |
| C2 | **Same batch, two renderings:** Batch Card (uses `UrgencyIndicator`) `313D OVERDUE`; Dashboard KPI `-313 days left`; alerts `billing window opens in -138 days` | 01, 02, 05 |
| D1 / D2 | Timeline CFSP badges green (Batch Card CFSP badge is teal). Training bars amber | 02 vs 05 |
| G1 | At 375px the computed grid is **`240px 79px`**. The Progress Trend panel is 79px wide and its title clips to "PROGRE / COMPLI" | 04 |
| H1 | "DEV-J3ED-002 BSRS approved — eligible for billing." | 02 |
| I1 | Batch codes `DEV-AKB-*`, `DEV-NEN-*`, `DEV-J3ED-*` (three schools) aggregated under the switcher label "AKB Technical Vocation… · 3 schools · registrar" | 01, 02 |
| **I5** | Sidebar user card **ADMIN**. Dashboard greeting and header **VIEWER** / "Viewer workspace". The admin gets the read-only dashboard | 01 |

---

## 3. Findings

### A. Data integrity & state communication

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| A1 | Earliest Billing shows past/negative countdown, permanently red | Next *open* billing obligation. Overdue reads "N days overdue" in red, 0 reads "Today", no deadline reads "No due date" (`components.md` §6, ADR-003 P5) | `batches.ts:240-243` uses `end_date`. `metrics.ts:32-34` includes completed and billed batches. `DashboardKpiGrid.tsx:46` prints `${n} days left` | S1 | DATA | Add a domain predicate `isOpenBillingObligation` (reuse the `alerts.ts:41` guard) and filter before sorting. Render via `UrgencyIndicator`. Add an `overdue` tier to `urgencyTier`. Longer term, derive the due date from the tranche schedule (`modules/billing/domain/packets.ts`, ADR-003 P5). |
| A2 | `Day 0/0` everywhere | Day X of Y from `total_sessions` / sessions held. If unknown, say so | Literal zeros at `batches.ts:257-258`. `total_sessions` missing from generated types | S1 | DATA | Regenerate `database.types.ts`. Map `totalDays ← total_sessions` and `currentDay ←` the attendance session count. Until then render "Schedule not set" (see design-system amendment D7) |
| A3 | Lifecycle counter is the literal `3/7` | Derived from the batch's stages | `page.tsx:541` `<span>3/7</span>` | S1 | IMP | Replace `LifecyclePanel` with `LifecyclePipeline` (see C1). If a counter stays, compute `done / steps.length` |
| A4 | Progress % and lifecycle stage come from independent sources | Progress is attendance-derived (ADR-001 B2: "not manually typed") and consistent with stage | `progressPct ← progress_percent` (typed, `batches.ts:228`). Stage `← current_stage` (`:238`). Billing-Ready reads the typed number (`readiness.ts:24`) | S1 | DATA | Derive progress from `sessions_held / total_sessions`. Until then, don't count a batch as Billing-Ready unless its stage is ≥ training |
| A5 | ENTRE marked done with no record | ENTRE status from `entrepreneurship_delivered` | `UI_PIPELINE` includes `entre` (`batches.ts:124`). The comment at `:97` says it is omitted. The column isn't in the generated types | S1 | DATA | Map `entrepreneurship_delivered`. Until then ENTRE stays `pending`. Fix the stale comment |
| A6 | `blocked` batch loses its pipeline position | Pipeline keeps the stage and marks it blocked/overdue (the spec has an `overdue` step state) | `deriveLifecycle` returns all-`pending` for `blocked` (`batches.ts:151`). `LifecyclePipeline.tsx` handles `overdue` via a cast, but nothing produces it | S2 | DATA | Store the blocked stage (or the last stage) and emit `overdue` for it. Add `overdue` to `LifecycleStatus` |
| A7 | STALE flags inactivity, not staleness | "Data as of" = fetch time. Stale = serving a non-live snapshot, or an upstream import older than its threshold | `page.tsx:110-112` vs `batches.ts:284-289` (see §2) | S1 | DATA | Stamp the snapshot with fetch time. Raise STALE only on fallback/cached data or an aged import. Optionally show "Last batch update" separately |
| A8 | Doc Compliance KPI, donut, critical-docs callout and doc alerts are permanently inert | The requirement catalog flows from the query that already fetches it | `page.tsx:264` hardcodes `documentRequirements = []`, yet the query embeds `program_document_requirements(*)` (`batches.ts:304`) and keeps only its keys (`:88`). The DB has `is_required`, not `critical` | S1 | DATA | Add a requirement mapper in `modules/batches/data/` (`document_key→key`, `document_name→label`, `required_for_stage→stage`) and return the catalog on the snapshot. **Product decision needed:** the DB has no `critical` flag. Mapping `is_required→critical` is a proposal, not an established equivalence |
| A9 | "document sync pending" names a false cause | Copy states the real condition | `DashboardKpiGrid.tsx:29`, `MetricsRow.tsx:26`. Nothing is syncing. The catalog is simply not passed | S2 | UX | Use "Requirement list not set up" until A8 lands, then use the §5 state copy |
| A10 | Donut legend shows `0 · 0%` while the centre says "not tracked" | One panel, one state | `DocumentStatusDonut.tsx:119-128` legend vs `:109-112` centre. Meta reads `0 tracked` (`:65`). An empty grey ring still draws | S1 | UX | Replace the panel body with a state panel when `tracked === 0` (§5) |
| A11 | EGACE funnel is always zeros and attributed to T2MIS | Hidden, or "not recorded", until a source exists. No official-system attribution for absent data | `mapBatchRow` never sets `egace` / `employmentFollowUp`. `EgaceOutcomes.tsx:29-40` sums to `0 · 0% of enrolled`. Meta "J3ED cohorts · T2MIS terminal report" (`:53`). The type comment "always present after load" (`shared/types.ts:198`) is false | S1 | DATA | Gate the panel on data presence. Remove the T2MIS attribution (RULES 27). Correct the type comment |
| A12 | Progress trend never has data but claims a window | Designed "Trend not available yet" state | `page.tsx:281` passes `[]`. The panel still shows meta "last 6 weeks" (`ProgressTrend.tsx:221`) over a plain `<p>` (`:228`) | S2 | UX | §5 state. Drop the window meta when there is no series |
| A13 | Timeline invents "today" and mis-years dates | "Today" from the server as-of time. Dates carry their year | Fallback `new Date(2026, 5, 19)` (`BatchTimeline.tsx:207`). `parseDate` defaults to year 2026 (`:44`) while `trainingStart` is formatted without a year (`batches.ts:229`) | S2 | DATA | Pass ISO dates and an as-of timestamp as props. Never parse display strings |
| A14 | Timeline legend advertises phases that can never draw | Legend lists only what is plotted | Billing window: `billStart = te` and `bill = end_date`, the same date, so `buildBillPhase` returns null (`:118, :142`). ENTRE/AOU/NTP dates are never mapped. Legend `:368-373` | S3 | IMP | Build the legend from the rendered phase set |
| A15 | "No alerts — every batch is within its compliance windows" over inactive checks | Claim only what was computed | `AlertsPanel.tsx:87`. Doc checks are inert (A8). `ntpLag` is always 0 (`batches.ts:259`), so the NTP-lag alert is unreachable (`alerts.ts:59`) | S2 | UX | "No alerts from the active checks", with a note listing the checks that aren't connected yet |
| A16 | Program Breakdown labels the all-batch average `BAT-2` | Label describes the aggregate | `ProgramBreakdown.tsx:41` literal `BAT-2` | S1 | IMP | Label it "All batches · avg" or remove the line. It duplicates the KPI anyway |
| A18 | Earliest Billing strips the year, so a past date reads as upcoming | A date carries its year whenever it isn't in the current year, and a past date reads as overdue | `metrics.ts:45` `.replace(/, \d+$/, '')`. Live: `Dec 15` (2025) above `-313 days left` | S1 | IMP | Keep the year (or show "Overdue · Dec 15, 2025"). Render the value through `UrgencyIndicator` (A1) |
| A19 | Hardcoded load time and inconsistent "active" counts across routes | Freshness stamps are real. "Active" means the same thing everywhere | `CardsView.tsx:41` literal "loaded at **14:02**". `CardsView.tsx:31` labels `batches.length` (all statuses) as "active". Dashboard counts `ongoing` only (5 vs 4 live) | S1 | IMP | Pass the snapshot's fetch time. Use one `activeBatches` derivation from `metrics.ts` |
| A20 | Timeline hides that every plotted batch is overdue | The axis includes today. Past-due phases are marked | The axis domain comes only from phase and milestone dates (`BatchTimeline.tsx:221-228`), so today falls off-axis. The footer still promises a red today line (`:384`) | S2 | UX | Extend the domain to include today. Tint overdue milestones with the pipeline's `overdue` treatment |
| A21 | Dangling separator on batch cards | No orphan punctuation | `20 enrolled ·` because `trainingDays` is `''` (`batches.ts:253`, `BatchCard.tsx:88`) | S4 | IMP | Render the separator only when the value exists |
| A17 | Permission-denied state is preview-only | Real role resolver (RULES 24, six states) | `page.tsx:181-182` `isDenied: forcedState === 'denied'` (TES-34) | S2 | IMP | Wire to the TES-34 resolver. Until then, track it as a known gap on the issue |

### B. KPIs & information hierarchy

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| B1 | Adjacent KPIs use different populations | One population per row, stated | `metrics.ts:26-30`: active = `ongoing`; scholars and avg progress = all statuses | S1 | DATA | Compute the row over active batches. Rename the subs to state the population |
| B2 | Two KPI rows with divergent rules | One KPI component, configured per route/role | `MetricsRow` (`layout.tsx:82`) vs `DashboardKpiGrid`: different first card, Avg Progress variant, doc and billing sub-copy, and no Infinity guard (`MetricsRow.tsx:66`) | S2 | DSV | One `KpiRow` in `modules/batches/ui/` with a config. `MetricsRow` becomes a thin wrapper (RULES 25) |
| B3 | Fabricated sub-labels | Derived or absent | `MetricsRow.tsx:117` "All training ongoing" (for any non-empty set). `:124` "On plan for Q2" (static; shown on amber cards; it is Q4) | S1 | IMP | Delete, or derive from data |
| B4 | "Billing-Ready" is the threshold signal, styled as a warning | Matches its meaning and the Alerts panel | `readiness.ts:23-25` threshold only (not `billingGate`). Amber in the KPI (`DashboardKpiGrid.tsx:54-56`), green in Alerts (`alerts.ts:35`) | S2 | DATA | Rename "Reached 80%" or switch to `billingGate`. One semantic across both surfaces |
| B5 | Redundant and jargon KPI content | Each prime-space tile carries unique, actionable information | Active count repeated in the header subline (`DashboardHeader.tsx:41`). Avg progress repeated in Program Breakdown. Sub "tenant-scoped" (`DashboardKpiGrid.tsx:79`) is developer vocabulary | S3 | UX | See §4 verdicts |

### C. Component reuse

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| C1 | Dashboard "Lifecycle" panel is a parallel pipeline | Reuse `LifecyclePipeline` (role=list, aria-current, step icons) | `page.tsx:534-566`: color-only pills with `title` tooltips (RULES 23). Legend "Pending" swatch is `border-strong` (`:562`) while the pill is `border-faint` (`:554`). Presentation lives in `app/` (RULES 11) | S2 | DSV | Render `<LifecyclePipeline steps={earliestBatch.lifecycle} />`. Delete `LifecyclePanel`/`LegendDot` from the route |
| C2 | Four countdown formatters, none using the primitive | `UrgencyIndicator` everywhere | `DashboardKpiGrid.tsx:46`, `MetricsRow.tsx:66`, `alerts.ts:43`, `BatchTimeline.tsx:119` | S2 | DSV | Route all of them through `UrgencyIndicator` (or one domain `describeDaysToBilling()`) |
| C3 | Program badge hand-drawn in SVG | `StatusBadge` `twsp`/`cfsp` tokens | `BatchTimeline.tsx:278-281` (root cause of D1) | S3 | DSV | Use the `StatusBadge` token pair, or an HTML overlay of the badge |
| C4 | Panels hand-roll empty text | `EmptyState` with system copy | `<p className="t-body">` at `ProgressTrend.tsx:228`, `BatchTimeline.tsx:353`, `AlertsPanel.tsx:87`, `page.tsx:535`. **But** `EmptyState` is page-scale (48px padding, 32px icon, `EmptyState.tsx:18-19`) | S3 | GAP | Add a compact panel variant (design-system amendment D1) and adopt it |

### D. Semantic color

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| D1 | CFSP drawn green on the timeline | Teal is CFSP, exclusively | `BatchTimeline.tsx:278-280` `tw ? blue : green` | S2 | DSV | `--color-teal-lt` / `--color-teal-dk` |
| D2 | Lifecycle status colors inverted between widgets | done = green, active = blue (pipeline spec) | Milestones done = blue, active = amber (`BatchTimeline.tsx:87-89`). Training phase filled amber (`:109`). Amber means warning | S2 | DSV | Adopt the pipeline mapping. Make the training phase blue/neutral |
| D3 | EGACE tiles use reserved hues as decoration | No decorative semantic color | `EgaceOutcomes.tsx:19-25`: teal (CFSP-only), purple (NC-only), amber (warning) | S2 | DSV | One neutral tile style. Color the mini-bar by progress tier (% of enrolled), if at all |
| D4 | TODAY marker in red | Red = critical/error only | `BatchTimeline.tsx:261-266` | S3 | DSV | Dashed `--color-text-primary` line with a neutral flag |
| D5 | Progress fills are one flat color | amber <25 / blue 25–74 / green ≥75 | `.snap-bar > span` flat blue (`design-system.css:2087`). Timeline progress overlay flat amber (`BatchTimeline.tsx:298`) | S3 | DSV | Reuse the `ProgressBar` primitive's tier logic |
| D7 | NC I badge is amber (the warning hue) | Purple marks NC levels, exclusively (`tokens.md`) | Live `NC I` badge = `#FCE6CC` / `#7A3806` (amber-lt / amber-dk). `StatusBadge.tsx:20` follows the **approved prototype** (`ui_kits/admin/StatusBadge.jsx:13`), so this is not developer error | S2 | GAP | The design system contradicts itself. Pick purple tints for NC I/II/III, or sanction a second NC hue that isn't the warning color (D11) |
| D6 | Role tags borrow semantic hues as identity | No reserved hue used decoratively | `design-system.css:735-738`: coordinator teal, owner purple, trainer amber | S3 | GAP | The system has no categorical/identity palette. Either make role tags text-only (`--color-text-secondary`) or add identity tokens (D10) |

### E. Typography & spacing

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| E1 | Type below the scale floor (`text-2xs` = 10px) | 10/11/12/13… only | 8.5px TODAY (`BatchTimeline.tsx:266`). 9px: `STALE` badge (`DashboardHeader.tsx:22`, the state signal itself), timeline (`:258, :280, :331`), trend axes (`ProgressTrend.tsx:95, :100`), `.role-tag` (`design-system.css:727`). Fractional 9.5/10.5/11.5px (`BatchTimeline.tsx:241, :276, :303`; `DocumentStatusDonut.tsx:126-127`) | S2 | DSV | Snap to the scale. The STALE badge goes to 11px (`text-xs`) |
| E2 | Off-grid spacing | 4px grid | `MetricCard.tsx:34` padding `14px 16px` (spec says 16 on all sides). EGACE tile `14px 16px`, gap 7. `AlertsPanel.tsx:94-96` gap 9, padding `10px 14px`. `page.tsx:543` gap 3. Tooltips `7px 10px` | S4 | DSV | Snap to 4/8/12/16 |
| E3 | Off-scale metric value | `text-2xl` 24px for metric values | `.egace-summary-val` 30px (`design-system.css:1037`) | S4 | DSV | 24px |
| E4 | Raw hex in components | Tokens only (RULES 22) | `#2A2926`/`#fff` tooltips (`ProgressTrend.tsx:157-158`, `BatchTimeline.tsx:239`). `#fff` (`AlertsPanel.tsx:72`, `BatchTimeline.tsx:265`). `#888` fallback in both `cssVar`s. `#c6e6be` (`design-system.css:781`) | S3 | DSV | `--color-text-primary` surface + `--color-text-inverse` |

### F. Accessibility

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| F1 | `--color-text-muted` fails AA for normal text | ≥4.5:1 (WCAG 2.2 AA, RULES 23) | `#97968E` = **2.97:1** on surface, **2.70:1** on bg, **2.52:1** on surface-alt. Used for every KPI label/sub, legend, axis, and "Data as of" | S2 | GAP | Developers used the token correctly; the token is the defect. Amend it to `#6B6A64` (same hue: 5.43 / 4.93 / 4.60:1), or restrict muted to disabled/large text (D2) |
| F2 | Warning label text in base amber | Text uses `-dk` shades | `MetricCard.tsx:21` labels in `--color-amber` = **4.11:1** at 11px (fails). `--color-amber-dk` = 8.77:1 | S2 | GAP | Deviation #3 says "tint the label" without naming the shade. Specify `-dk` for text (D2) |
| F3 | Metric-card severity conveyed by color alone | Text + icon (RULES 23) | `iconHint` is used only when `iconName` is absent (`MetricCard.tsx:27`), and all 15 repo call sites pass `iconName` (`DashboardKpiGrid` 6, `MetricsRow` 5, `BillingQueueView` 4), so warning/critical changes only color. Example: Billing-Ready amber with sub "billing prep queue" | S2 | GAP | Deviation #3 (tint only) conflicts with RULES 23. Amend: a variant always adds a status glyph or word (D3) |
| F4 | Chart `<title>`s are hidden from assistive tech | `role="img"` + an `aria-label` that states the **key finding** (spec), plus a text fallback | `role="img"` on the svg (`BatchTimeline.tsx:235`, `ProgressTrend.tsx:83`) makes the children presentational, so the per-phase titles (`:291, :323`) the header comment (`:25-28`) relies on are not exposed. Labels are generic. Tooltips are mouse-only | S2 | IMP | Summary `aria-label` ("3 batches; BAT-4 billing due in 5 days") plus a visually-hidden list of phases and milestones |
| F5 | Pending lifecycle pill nearly invisible | ≥3:1 non-text contrast (1.4.11) | `--color-border-faint` pill on surface = **1.25:1** (`page.tsx:554`) | S2 | IMP | Fixed by C1 (the pipeline's outlined pending step) |
| F6 | Metric cards have no accessible summary | `aria-label="[Label]: [Value]. [Sub-label]"` (spec) | None in `MetricCard.tsx` | S3 | DSV | Add it in the primitive |
| F7 | Sync-failed banner not announced | `role="status"` (or `alert` for errors) | `InfoCallout.tsx` sets no role | S3 | IMP | Give the primitive a `live` prop, or default role by variant |

### G. Responsive behavior

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| G1 | Charts row never stacks on narrow screens | One column at ≤1000px | An inline `gridTemplateColumns` (`page.tsx:381`; `loading.tsx:32`) outranks `.dash-charts-row { grid-template-columns: 1fr }` (`design-system.css:801-803`). The `!important` there targets only `[style*="span 2"]`. **Confirmed live:** computed `240px 79px` at 375px, and the trend title clips | S2 | IMP | Move the column template into the class and drop the inline style |
| G2 | Timeline forces horizontal scroll | Acceptable when announced | `minWidth: 720` (`BatchTimeline.tsx:219, :379`) inside `.tl-scroll`. The footer says "Scroll sideways" | S4 | UX | Acceptable. Consider a stacked list fallback below 720px |

### H. Copy & framing

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| H1 | Implies official approval | Never imply TESDA approval or submission (RULES 27) | "BSRS approved — eligible for billing" (`alerts.ts:37`) comes from an internal `billing_report_status = verified` flag | S2 | UX | "BSRS report marked verified in TVI-CAMS" |
| H2 | Vendor and internal vocabulary shown to users | Operator language | "Couldn't reach Supabase" (`page.tsx:491`). "Sync with Supabase failed" (`DashboardCallouts.tsx:38`). "tenant-scoped" (`DashboardKpiGrid.tsx:79`). "J3ED cohorts" (`EgaceOutcomes.tsx:53`) | S3 | UX | "Couldn't load batch data", "this school" |
| H3 | Pluralization slip | "1 critical document / 2 critical documents" | `DashboardCallouts.tsx:57` pluralizes batches but not documents | S4 | IMP | `pluralize` the document noun too |

### I. Registrar & administrator workflows

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| I1 | School switcher is cosmetic; numbers aggregate every school | Tenant context in the URL path segment (locked domain fact). The dashboard shows the selected school | Switcher is client `useState` (`Sidebar.tsx:179-181`). `getBatchesSnapshot` has no tenant scope, and RLS `can_read_batch → can_access_tenant(b.tenant_id)` (`20260528160300_create_tenant_scoped_schema.sql:408-427`) checks **any** active membership (`:380-395`, never redefined by a later migration), so it returns every school the user belongs to. A multi-school "registrar" sees combined KPIs under one school's name. **Confirmed live** (§2a) | S1 | DATA | Implement the tenant path segment. Until then, label the scope ("All your schools · 3") and show a per-school split |
| I2 | "Registrar" is a label, not a role | Vocabulary matches the role model | Applied to any multi-school user, viewers included (`Sidebar.tsx:322, :331`) | S3 | GAP | Decide whether registrar is a role, a capability, or a word to drop. Record it in `CONTEXT.md` |
| I3 | Viewer sees the "Import a batch" CTA | Read-only roles see no write CTA | `EmptyBatchesView` (`page.tsx:479`) ignores the role (the server denies the write, but the UI offers it) | S3 | UX | Role-aware CTA. A viewer gets "Ask a coordinator to import a batch" |
| I5 | Same user is ADMIN in the sidebar and VIEWER on the dashboard | One trusted role source per user | The dashboard reads Clerk `publicMetadata.role` (`page.tsx:417-433`). When it is unset, `resolveDisplayRole` falls back to viewer (`page.tsx:228`). The layout and Sidebar read DB `profiles.role` (`layout.tsx:28-30`, `role={dbRole}` at `:74`). **Confirmed live** | S1 | DATA | Resolve the dashboard role from the same trusted DB role the layout uses (RLS reads it too). Keep Clerk only for the trainer redirect, or sync the two |
| I4 | Admin landing is the coordinator dashboard with different copy | Admin oversight panels per Figma node 382:3 | One composition for all office roles. Only `ROLE_COPY` differs (`page.tsx:47-79`) | S3 | UX | Verify against Figma 382:3 before building; the Figma file was not opened in this audit |

### J. Unnecessary / low-value elements

| # | Finding | Expected behavior | Actual implementation | Sev | Type | Recommended fix |
|---|---|---|---|---|---|---|
| J1 | Four prime panels render no information for every tenant today | Prime space for meaningful content | EGACE (A11), Trend (A12), Donut (A10), Doc KPI (A8) | S2 | UX | Collapse them into one compact "Not tracked yet" strip that lists what's coming, until data exists |
| J2 | Identity stated three times in the top ~150px | Once | Header subline "Coordinator workspace", greeting row (`page.tsx:361-369`), Sidebar user card | S4 | UX | Drop the greeting row. Keep the role in the header |

---

## 4. KPI verdicts (prime-space rule)

Rule applied: *a KPI keeps prime space only if it is meaningful, actionable, or useful for comparison.*

| KPI | Verdict | Why | Replacement / fix |
|---|---|---|---|
| Active Batches | **Demote** | Already in the header subline. Not actionable on its own | "Batches needing action": count of critical + overdue + blocked |
| Total Scholars | **Fix** | Population mismatch (B1). Low comparative value | Active-batch scholars, with the sub "in N active batches" |
| Avg Progress | **Replace** | Blends not-started, in-training and completed batches into one number; that blend can't be acted on | "Behind schedule: N", once sessions are wired (A2/A4) |
| Doc Compliance | **Keep, gated** | The most compliance-relevant tile, but inert today (A8) | Hide until the catalog is wired. Then show "% on file · N critical missing" |
| Earliest Billing | **Keep, fix** | The most actionable tile, but its value is wrong today (A1) | "Next billing due". `UrgencyIndicator` value. Sub "+N overdue" when any are overdue |
| Billing-Ready | **Keep, fix** | Actionable, but mislabelled and inconsistently colored (B4) | Use `billingGate`, or rename "Reached 80% threshold". One color across KPI and Alerts |

---

## 5. Document Status & Trend charts — designed states

**Precedence** (first match wins, so a failure is never masked by a tidier explanation, per CLAUDE.md error shaping): permission → request failed → not configured → no uploads → sync pending → data (including zero).

| State | Can today's data detect it? | Donut today | Trend today | Recommended UI (Tabler icon · heading · sub · action) |
|---|---|---|---|---|
| **No documents uploaded** | After A8: `tracked > 0` and no document rows | `—` "not tracked" + four `0` rows (A10) | n/a | `file-off` · **No documents uploaded** · "Upload or link documents for this school's batches." · "Go to Documents" (hidden for Viewer) |
| **Documents exist, not synchronized** | **No.** There is no sync/import status field. Needs data work first; never infer it | — | — | `refresh` · **Sync pending** · "Documents were added and are still being processed." · none. **Do not render until a real signal exists** |
| **No historical snapshots** | Yes: `series.length === 0` (always true today) | n/a | "No trend data yet." `<p>` under "last 6 weeks" meta | `chart-line` · **Trend not available yet** · "Weekly progress is recorded once per week. The first point appears after the first week." · none. Remove the window meta |
| **Data request failed** | Only page-level today. Docs are embedded in the batches query, so per-panel failure can't be represented | Page-level `SyncFailedView` | same | `alert-circle` (red-dk) · **Unable to load data** · "This panel couldn't load. Other panels may still be current." · "Try again" |
| **User lacks permission** | Page-level `?state=denied` preview only (A17). Trainer omission is server-side | — | — | `lock` · **Access restricted** · "Your role can't view document status for this school." · none |
| **Actual verified count is zero** | After A8: `tracked > 0 && verified === 0` | Indistinguishable from "not tracked" today | n/a | **Render the chart.** Zero is data: legend row "Verified **0**", centre "0% on file". The state panel is never used here |

**Implementation shape (for whoever builds it):** a domain-level discriminated union (`PanelState = 'restricted' | 'failed' | 'unconfigured' | 'no-uploads' | 'sync-pending' | 'ready'`), derived in `modules/documents/domain/compliance.ts` next to `summarizeDocCompliance`, so the donut, KPI, and callout share one verdict. The UI is a compact `EmptyState` variant (design-system amendment D1) inside the existing `dash-panel` shell, with the panel header kept.

---

## 6. `/ai-slop-check` results (review-only; Phase 3 auto-fix skipped per audit constraint)

| Rule | Result | Evidence |
|---|---|---|
| 1 Gradients | **Pass** | No gradients in scope TSX or the `dash-*/egace-*/tl-*/snap-*` CSS |
| 2 Emoji | **Pass** | No pictographs. Only typographic `· — › → ■` |
| 3 Cards / left border | **Fail — confirmed slop** | `EgaceOutcomes.tsx:71` `borderLeft: 3px solid ${color}` on five tiles, the exact pattern `deviations.md` rejects system-wide. `MetricCard` and `InfoCallout` comply |
| 4 Imagery | **Pass** | No illustration. Donut and Gantt are data marks |
| 5 Type | **Pass (mandated Plex)** / **Fail (scale)** | Plex resolves through `--font-sans/--font-mono` (`globals.css:144-145`), with no overrides. Off-scale sizes per E1 |
| 6 Toned whites/blacks | **Pass** | `#F5F4F0` bg, `#18180F` text. No pure-black text |
| 7 Untraced colors | **Fail** | Raw hex per E4. Reserved hues used decoratively per D1–D6 |
| 8 Spacing scale | **Fail (minor)** | Per E2 |
| 9 Editorial-warm house style | **Pass (mandated)** | Warm off-white and amber are mandated tokens. No serif or italic accents. Not slop under TVI-CAMS precedence |

---

## 7. Developer adherence vs. design-system shortcomings

**Developers not following the system** (fix in code; the system is right): A3, A16, B2, B3, C1, C2, D5, E1, E2, E3, E4, F4, F5, F6, G1.

**An upstream design source conflicts with the standing rules** (verify Figma / Claude Design before calling it developer error). The code says it is faithfully porting a design artifact that the skill's hierarchy doesn't rank (amendment D8):
- `EgaceOutcomes.tsx:4-7, :18` cites Figma node 527:2367 and "the Figma stage accents". This covers the EGACE 3px left border and D3.
- `BatchTimeline.tsx:6-10` was ported from Claude Design `drawGantt()` (project e3ea69aa). This covers D1, D2, D4, and C3.

If the Figma/dc.html shows these treatments, the design source needs amending to match `deviations.md`. If it doesn't, these move to the developer bucket.

**Data/contract work, not design** (the UI renders faithfully what it's given): A1, A2, A4, A5, A6, A7, A8, A11, A13, B1, B4, I1. These need the data layer (regenerate types, mappers, the ADR-003 due date) before any visual fix.

**Genuine gaps in the design system** (amend the system, not the code): C4, D6, D7, F1, F2, F3, I2, the definition of "stale", and the unknown-value states (§8).

---

## 8. Recommended design-system amendments (established gaps only)

| ID | Amendment | Established by |
|---|---|---|
| D1 | **Panel-scale states**: a compact `EmptyState` variant (16px padding, 20px icon, `text-sm` heading) and the six-state copy in §5, as system copy | C4, §5 |
| D2 | **Text contrast**: darken `--color-text-muted` to ≈`#6B6A64`, or forbid it for normal-size text. Specify that semantic **text** always uses the `-dk` shade | F1, F2 |
| D3 | **Amend deviation #3**: metric-card variants keep "no left border" but must add a status glyph or word, to reconcile with RULES 23 | F3 |
| D4 | **Lifecycle Pipeline is 7 steps** (AOU → NTP → TIP → Training → ENTRE → Assessment → Billing), matching the approved prototype (`ui_kits/admin/LifecyclePipeline.jsx:2`). `components.md` §5 still says "fixed at 6". Also decide whether ENTRE's purple is a sanctioned second meaning of purple (currently "NC levels exclusively") or gets its own token | prototype vs. `components.md` |
| D5 | **Write the left-border ban as a rule**, not an inference ("treat as a pattern to avoid"), and add it to the `tvicams-reviewer` checklist | EGACE slipped through |
| D6 | **Define "stale"**: which timestamp, which threshold, and what "Data as of" means | A7, RULES 24 |
| D7 | **Unknown-value states**: Progress Bar "Schedule not set" (total unknown), and Urgency Indicator "No due date" (the primitive takes `number`; `Infinity` renders `Infinity DAYS`) | A2, C2 |
| D8 | **Rank Figma and Claude Design in the source-of-truth hierarchy.** Code comments call Figma file `vZKyWXSipBHmiQFuHl5e1O` the "source of truth" (`DocumentStatusDonut.tsx:4`, `ProgressTrend.tsx:6`, `AlertsPanel.tsx:4`, `BatchTimeline.tsx:6`), but the skill's hierarchy doesn't mention it | conflicting claims |
| D9 | **Chart conventions**: one library (the skill says Recharts, the code uses hand SVG + d3 + Tremor), a token map, and an accessible text fallback | C3, F4 |
| D10 | **Identity colors** for roles (or a rule that roles are text-only) | D6 |
| D11 | **NC level colors**: the prototype's amber `nc-i` badge contradicts "purple = NC exclusively" and "amber = warning only". Choose one and update the prototype, `StatusBadge`, and `tokens.md` together | D7 |

---

## 9. Suggested remediation order

1. **Data truth (S1).** Regenerate types (A2/A5), add the requirement mapper (A8), add the open-obligation filter and overdue tier (A1), remove the literals (A3, A16, A19, B3), keep the year on dates (A18), make the KPI population consistent (B1), fix freshness semantics (A7), unify the role source (I5), and label the multi-school scope (I1).
2. **State design.** Build §5 with design-system amendment D1, then A10, A11, A12, A15, J1.
3. **Semantics and a11y.** Fix D1–D3, E1, F1–F5, G1.
4. **Consolidation.** Merge the KPI rows (B2), use the pipeline primitive (C1), route all countdowns through `UrgencyIndicator` (C2), and adopt the chart conventions (D9).

**Tests that currently pin defects and must change with the fix:**
- `tests/unit/urgency.test.ts:13` (`-3 → critical`; needs an `overdue` tier)
- `tests/unit/batches.test.ts:167` (`end_date` stand-in for billing deadline)
- `tests/unit/batch-timeline-tone.test.ts:20-30` (milestone done = blue / active = amber)
- No test covers `deriveDashboardMetrics` or the KPI sub-copy. Add tests with a fixed as-of date (RULES 35).

---

## 10. Open questions

1. **Role source (I5):** should the dashboard trust DB `profiles.role` (what RLS uses) or Clerk `publicMetadata.role`? Today they disagree for your own account.
2. **Registrar:** is it a role, a capability of multi-school admins, or a word to retire (I2)?
3. **ENTRE color:** keep purple as a sanctioned second meaning, or give it a new token (D4)?
4. **Admin landing:** should it diverge from the coordinator dashboard as Figma node 382:3 suggests (I4)?
