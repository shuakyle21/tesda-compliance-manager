---
type: "Reference"
title: "Design System and UI Invariants"
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-09-02T15:29:54.792Z
---

# Design System and UI Invariants

The design system in this repository exists because the product is a compliance tool: "a coordinator misreading a status by color alone is a real operational failure, not a cosmetic one" ([CLAUDE.md](/CLAUDE.md)). The non-negotiable UI rules are checklisted in [`RULES.md`](/RULES.md) §4–§6, the full visual reference is [`docs/DESIGN.md`](/docs/DESIGN.md), and the upstream v1.0 spec sheet lives at [`uploads/training-compliance-design-system.md`](/uploads/training-compliance-design-system.md). `.design-sync/config.json` records the relationship between the two worlds: "Local Next.js TypeScript components are the implementation layer; source JSX is the design reference."

## Sources of truth

| Source | Role |
|---|---|
| [`RULES.md`](/RULES.md) §4–§6 | The invariants, in checklist form with an enforcement level per rule (`[hook]`, `[lint]`, `[review]`) |
| [`docs/DESIGN.md`](/docs/DESIGN.md) | Complete design reference: principles, tokens, components, states, motion, accessibility. Implementation decisions that diverge from the upstream spec are marked `⚠ DEVIATION` and **win** over the spec; `colors_and_type.css` and `ui_kits/admin/` are the live ground truth |
| [`docs/design/colors_and_type.css`](/docs/design/colors_and_type.css) | Token definitions — "source of truth for color" per the DESIGN.md file index |
| [`uploads/training-compliance-design-system.md`](/uploads/training-compliance-design-system.md) | Original v1.0 spec — re-read before making a visual decision not covered by DESIGN.md |
| [`ui_kits/admin/`](/ui_kits/admin/), [`assets/`](/assets/), [`preview/`](/preview/), [`screenshots/`](/screenshots/), [`uploads/`](/uploads/) | Design handoff bundle, ported verbatim — **do not edit** (see [Static directories](#do-not-edit-static-directories-and-design-sync)) |

Related pages: [Module boundaries and data patterns](/openwiki/architecture/module-boundaries-and-data-pattern.md), [Architecture overview](/openwiki/architecture/overview.md), [Batches and lifecycle](/openwiki/domains/batches-and-lifecycle.md).

## Token layer

**Where tokens live at runtime.** `app/globals.css` is the single style entry point: it imports Tailwind v4 (`@import "tailwindcss"`), imports the layout-only `app/design-system.css`, and then defines the entire `:root` token block **copied verbatim** from `docs/design/colors_and_type.css` (the file's own header instructs: "Do NOT delete or merge — copy the entire :root block verbatim"). `app/design-system.css` is deliberately layout-only — shell, sidebar, topbar, `.page-head`, `.metrics`, buttons, focus ring, data rows, keyframes, and screen-specific sections — and every rule in it references token variables rather than raw colors.

**Fonts.** `app/layout.tsx` self-hosts IBM Plex Sans (weights 300–600) and IBM Plex Mono (300–500) through `next/font`, exposing `--font-ibm-plex-sans` / `--font-ibm-plex-mono` on `<html>`. `:root` prepends these variables into `--font-sans` / `--font-mono`, so the optimized, layout-shift-free fonts win with the web/system names as fallbacks. The type families are spec-locked: IBM Plex Sans for UI/body, IBM Plex Mono for IDs, dates, codes, and numeric data — and Inter/Geist/Roboto/Arial are explicitly banned as primary typefaces. Semantic type roles (`.t-page-title`, `.t-label`, `.t-cell`, `.t-metric-value`, …) are defined once in `globals.css` and reused across screens.

**Semantic color system.** Six hues, each with staged tokens (`base` / `-lt` / `-dk` / `-border` / `-hover`), and *every color carries one meaning*, applied 100% consistently:

- **Blue** — informational / TWSP / active navigation
- **Teal** — CFSP program
- **Green** — completed / approved / on-track
- **Amber** — warning / 7–21 days / pending
- **Red** — critical / <7 days / errors
- **Purple** — NC level indicators

Urgency is the most important color rule in the system: the tier (≤6 days critical/red, 7–21 warning/amber, >21 on-track/green) is **computed once at data fetch and stored on the batch** — never recomputed in render functions. In code this is the `daysToBilling` field mapped in `modules/batches/data/batches.ts` (`daysUntil()`, which returns `Infinity` as the "no known deadline" sentinel so missing dates never trigger urgency tiers).

**Documented deviations from the upstream spec** (DESIGN.md `⚠ DEVIATION` markers, which win):

1. Amber and red hex values were re-tinted warmer/more vivid than the spec (`#C7600F` / `#C81F1F`).
2. The spec's 3px colored left border on batch cards, InfoCallouts, and warning/critical MetricCards was removed — urgency is communicated via the badge in the card header and the billing-deadline value color; callouts use a 1px tinted full-perimeter border instead; MetricCards tint the label icon and sub-label.

**Other locked values.** 4px spacing grid (2px half-steps for micro-spacing only), border radius ≤ 12px (`9999px` only for avatars/toggles/bars), minimal shadows (structure comes from borders, not elevation), motion tokens (100/150/300/400 ms plus a 2 s pipeline pulse) with a global `prefers-reduced-motion` kill-switch in `design-system.css`.

## Iconography and the no-emoji rule

- **No emoji anywhere in the UI** (RULES §4.21). DESIGN.md extends this: no Unicode glyph icons, no PNG icons; emoji "read as consumer-app delight" in a government-compliance tool.
- **Icons are Tabler line icons**, 2px stroke, currentColor inheritance. Two mechanisms exist:
  - [`shared/ui/Icon.tsx`](/shared/ui/Icon.tsx) renders an **inline map of Tabler SVG path strings** — ported verbatim from the design handoff so glyphs stay pixel-identical to the prototype and no runtime dependency is needed. It is pure render (no hooks), safe in both Server and Client trees, and every instance is `aria-hidden="true"`. This is the icon system used by all shared primitives and module screens.
  - `@tabler/icons-react` is the declared package dependency (`package.json`) and the spec's canonical choice; today the only direct importer is `modules/auth/ui/SignUpModal.tsx` (the Clerk sign-up form).
- Icon **semantics are pinned** in DESIGN.md §8 (batch = `folders`, warning = `alert-triangle`, critical = `alert-circle`, BSRS approved = `shield-check`, NTP = `file-invoice`, missing document = `file-off`, …) as is the sizing per context (14 px inline, 16 px in navigation, 12 px inside badges) — icon-to-label gap is always 4 px.

## Status: text + icon, never color alone

RULES §4.23 mandates that status is conveyed by **text + icon, never color alone**, targeting **WCAG 2.2 AA** (the upstream spec sheet says WCAG 2.1 AA; the repo rule is the stricter target). The design system is built around this in several ways:

- `StatusBadge` pairs a mono text label with a semantic chip variant (`ongoing` → blue-lt/blue-dk, `critical` → red-lt/red-dk, `nc-ii` → purple, …); the variant is a *pair* of tokens, never a bare hue.
- `UrgencyIndicator` renders the days value as text ("28 DAYS", "TODAY", "3D OVERDUE") alongside the tier icon and color; `BillingReadyBadge` is the green "READY FOR BILLING" chip. `ProgressBar` always shows the mono percentage next to the fill, and `MetricCard`'s warning/critical variants tint the label icon and sub-label, not just a border.
- The focus-visible ring (`2px solid var(--color-blue)`, 2px offset, inverting on primary buttons) was **added specifically because the ported stylesheet had no focus rule at all**, which failed the mandated WCAG 2.2 AA; `outline: none` is forbidden.
- Row selection in the billing queue tints the row but is announced structurally: "Selection is also announced structurally (aria-selected), never by tint alone" (comment in `design-system.css`).
- DESIGN.md §14 prescribes the ARIA patterns (batch card `aria-label` with name/status/deadline, `role="progressbar"` with value attributes, `role="list"`/`aria-current` on the pipeline, `role="img"` on charts) and the verified contrast pairs for badge tokens.

A related anti-misleading invariant lives in `modules/shell/ui/MetricsRow.tsx`: the `hasBatches` guard is load-bearing (TES-74) — with zero batches, an empty state must **not** be styled as a critical red billing deadline, and "All verified" copy must not appear when there is nothing to verify (a compliance tool must distinguish *empty* from *cleared*, per ADR-004's unknown-vs-0% rule).

## Component layering

The layering convention (RULES §2/§4, CLAUDE.md) is:

**`app/` route Server Component → `modules/<domain>/ui` screens → `shared/ui` props-only primitives.**

- `app/(dashboard)/<route>/page.tsx` is a thin Server Component: it fetches via a module's `data/` layer, applies pure `domain/` rules, and composes module UI. No business logic in `app/`.
- `modules/<domain>/ui/*` holds the screens and views (`CardsView`, `TableView`, `BatchModal`, `BillingQueueView`, the dashboard widgets in `modules/batches/ui/dashboard/*`, and the app shell in `modules/shell/ui/*`).
- `shared/ui/*` holds props-only primitives that know **nothing** about data or rules: `Icon`, `StatusBadge`, `InfoCallout`, `MetricCard`, `ProgressBar`, `EmptyState`, `TrainerAvatar`, `UrgencyIndicator`/`BillingReadyBadge`, `TrainingDayPills`, `Toast`, `Switch`, `Charts`, `FilePreviewModal`. They receive pre-computed values (a `Batch` object, a number of days, a percent) and render tokens.
- **If a `shared/ui` component starts reading data or encoding business rules, move it into its owning module** (RULES §2.15). This is why `LifecyclePipeline` lives in `modules/batches/ui/` (it encodes the batch lifecycle domain), while the shell's `Sidebar`/`Topbar`/`MetricsRow` live in `modules/shell/ui/` (they encode navigation and role-surface rules).
- Import direction is `app → modules → shared → lib/supabase`, lint-enforced by `import/no-restricted-paths` in `eslint.config.mjs`: another module's `data/` is private (only `app/` may fetch it), `shared/` can never import `modules/` or `app/`, and raw DB types from `lib/supabase/database.types.ts` are reachable only from module `data/` layers. No module `ui` file imports any `data/` layer today.
- **Server Components by default; client islands only for interactivity** (RULES §4.26). `BatchCard` is `'use client'` for hover elevation and opening `BatchModal`; `Sidebar` is `'use client'` for pathname, drawer, and tenant-switch state; the dashboard layout and page stay server.
- **Reuse existing primitives** — `BatchCard`, `BatchModal`, `StatusBadge`, `LifecyclePipeline`, `EmptyState`, `InfoCallout`, … — rather than creating parallels (RULES §4.25). `CardsView` and `TableView` both compose the same `BatchCard`/`BatchModal`/`StatusBadge`/`EmptyState` set, differing only in arrangement.

```mermaid
flowchart TD
    layout["app dashboard layout.tsx - Server Component shell with auth gate, Sidebar, Topbar, MetricsRow"]
    route["app route page.tsx - thin Server Component"]
    data["modules <domain> data layer - Supabase fetch and mapper, importable only from app"]
    domain["modules <domain> domain layer - pure rules such as urgencyTier and isBillingReady"]
    screen["modules <domain> ui screens - CardsView, TableView, BillingQueueView, dashboard widgets"]
    prim["shared ui primitives - Icon, StatusBadge, InfoCallout, MetricCard, EmptyState, ProgressBar"]
    mocks["shared mocks - silent fallback dataset when Supabase is unconfigured"]

    layout --> route
    route -->|"fetch via module data"| data
    route -->|"compose"| screen
    route -->|"unconfigured fallback"| mocks
    data -->|"map and derive via"| domain
    screen -->|"render"| prim
    screen -->|"rules from"| domain
```

*Component layering: fetch is confined to `app/`, screens compose props-only `shared/ui` primitives, and pure domain rules are shared between mappers and screens.*

## The six mandatory screen states

Every data screen must implement all six states (RULES §4.24):

| State | Mandated treatment |
|---|---|
| **loading** | Skeleton shimmer for initial load/refresh; write-back buttons show the `.btn.loading` spinner in the leading slot (width-stable) with `aria-busy`. DESIGN.md §12. No route-level `loading.tsx` files exist yet — server fetches render once, so the spec'd treatments apply to client islands and pending actions |
| **empty** | `EmptyState` with icon + heading + the next administrative action (e.g. "No assigned batches" → *Import a batch* link) |
| **no-results** | `EmptyState` "No batches match" when search/program filters remove all rows (see `CardsView` and `TableView`) |
| **error / sync-failed** | A warning `InfoCallout` banner over the last cached snapshot with a *Retry* link — `sync-failed` **must** surface this banner (RULES §3.19). Raw Supabase/SQL errors, table names, and internal IDs are never leaked to the UI (RULES §1.6) |
| **permission-denied** | Full-page guard: `EmptyState` "Access denied — your role does not have access to this school's dashboard" |
| **stale-data** | A `STALE` pill beside the `Data as of` stamp when the data is older than the 24 h threshold |

**Mechanism.** Data functions return **discriminated snapshots** so Server Components map states straight to UI: `getBatchesSnapshot()` in `modules/batches/data/batches.ts` yields `BatchesSnapshot` = `ok` (rows + `dataAsOf`) / `sync-failed` (configured but errored) / `unconfigured` (no Supabase env). `unconfigured` falls back to `shared/mocks` **silently**; `sync-failed` falls back to mocks **with the mandatory banner**. The dashboard (the canonical implementation) additionally accepts a `?state=` query param as a manual preview override for each state; `denied` is preview-only until the real tenant/role resolver lands (TES-34), and `stale` derives from real freshness: the freshest batch row's `updated_at` versus the 24 h `DATA_STALE_AFTER_MS` threshold.

```mermaid
flowchart TD
    fetch["Server Component route calls getBatchesSnapshot"] --> status{"snapshot.status"}
    status -->|"ok"| live["live RLS-scoped rows, dataAsOf from latest updated_at"]
    status -->|"unconfigured"| mocks["shared/mocks fallback, silent"]
    status -->|"sync-failed"| cached["shared/mocks fallback rows"]
    live --> denied{"permission denied?"}
    mocks --> denied
    cached --> denied
    denied -->|"yes"| deniedUI["Access denied EmptyState"]
    denied -->|"no"| empty{"zero batches?"}
    empty -->|"yes"| emptyUI["No assigned batches EmptyState with import action"]
    empty -->|"no"| filtered{"search or program filter removes all rows?"}
    filtered -->|"yes"| noResultsUI["No batches match EmptyState"]
    filtered -->|"no"| content["main content with Data as of stamp in the page header"]
    content -.->|"when snapshot was sync-failed"| banner["warning InfoCallout with Retry over cached rows"]
    content -.->|"when stamp is older than 24 hours"| stalepill["STALE pill beside the stamp"]
```

*State derivation on a data screen: the snapshot status chooses the data source, terminal guards (denied → empty → no-results) short-circuit, and stale/sync-failed render as overlays on the main content.*

**"Data as of" timestamp.** Screens that show relative dates must show an **exact** "Data as of" timestamp (RULES §4.24). The dashboard formats the freshest `updated_at` across live rows as e.g. `Jun 19, 2026 · 14:02` (hour cycle `h23` so midnight prints `00:02`, never `24:02`) and degrades to the literal `cached snapshot` on the mock path rather than printing a fake precise timestamp. `BillingQueueView` receives its `dataAsOf` as an explicit prop and stamps `Packet readiness · Data as of {dataAsOf}`.

## Copy rules and product framing

- **UI copy must never imply official TESDA approval or submission** (RULES §5.27). This is an internal working layer; TESDA SIS/T2MIS/BSRS remain authoritative. Badges may show `APPROVED` / `NOT APPROVED` for the batch's own BSRS field, but no copy may frame anything as having been submitted to or approved by TESDA.
- The voice (DESIGN.md §2) is **administrative, exact, never decorative**: direct and structural ("Training ongoing — Day 31 of 42."), no exclamation marks, no "we"/"you", Title Case for data-system nouns (*Batch*, *Scholar*, *Trainer*, *Billing Deadline*, *NTP*, *BSRS*, *NC II*), sentence case for buttons and inline text, **always include the unit** ("31 days", "71.4%" — naked numbers are forbidden), abbreviations explained on first use, and auto-remarks written as imperative-mode summaries. Vague urgency words ("soon", "shortly"), "Click here", and branded mascot language never appear.

## Do-not-edit static directories and design sync

- **`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are ported verbatim** from the design bundle and excluded from lint and build (`eslint.config.mjs` `globalIgnores`). A PreToolUse hook, `.claude/hooks/protect-static-dirs.sh` (registered for `Edit|Write` in `.claude/settings.json`), **blocks agent edits there** and exits with the instruction to edit the source design files instead. `public/assets/` is explicitly exempt — it is the app's real runtime static directory (served at the site root) that merely shares the name.
- **`FIGMA FILES/`, `diagrams/`, `.design-sync/` are design artifacts, not app code** (RULES §6.29, review-level). `FIGMA FILES/` is not currently materialized in the tree — Figma pages are referenced by node ID in code comments instead (e.g. `8:4330` for the primary navigation aside, `840:5128` for the billing packet queue). `diagrams/` holds the architecture/ER Mermaid sources and rendered PNGs; `.design-sync/` records the design-project mapping.
- **Design changes go to the source design files first.** The handoff bundle *is* the source: `ui_kits/admin/index.html` is the working no-build prototype of all dashboard views, `ui_kits/admin/*.jsx` are the prototype components the local ones were ported from, `preview/` holds standalone HTML sheets for type/color/spacing/components, and `assets/icons/` is the curated offline SVG subset of the Tabler icons. When spec and deviation conflict, the deviation wins and `colors_and_type.css` + `ui_kits/admin/` are the live ground truth.
- A PostToolUse hook (`lint-edited-file.sh`) lints every file an agent edits, so design-system violations surface immediately at edit time.

## Invariant checklist

| # | Invariant | Enforcement |
|---|---|---|
| 21 | No emoji anywhere in UI; icons are Tabler line icons | `[review]` |
| 22 | IBM Plex fonts; semantic color tokens only — never raw hex in components (the legacy `shared/ui/Charts.tsx` palette and the spec-pinned `TrainerAvatar` trainer colors are the acknowledged exceptions) | `[review]` |
| 23 | Status conveyed by text + icon, never color alone; WCAG 2.2 AA target | `[review]` |
| 24 | All six states on every data screen; exact "Data as of" timestamp on screens with relative dates | `[review]` |
| 25 | Reuse existing primitives rather than creating parallels | `[review]` |
| 26 | Default to Server Components; client islands only for interactivity | `[review]` |
| 27 | UI copy must never imply official TESDA approval or submission | `[review]` |
| 28 | `assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` do-not-edit — PreToolUse hook blocks edits | `[hook]` |
| 29 | `FIGMA FILES/`, `diagrams/`, `.design-sync/` are design artifacts, not app code | `[review]` |
