# TVI-CAMS UI/UX Improvements

## Summary

Reviewed source:

- Figma file: `TVI CAMS`, file key `vZKyWXSipBHmiQFuHl5e1O`
- Requested node: `0:1`, page `Screens`
- Key Figma frames reviewed:
  - `42:1891` — `Frame 2 · Batch Cards`
  - `1:7780` — `Frame 3 · Table View`
  - `9:2603` — `Frame 4 · Documents`
  - `12:1719` — `Frame 5 · Analytics`
  - `52:2235` — `Overlays`
  - `314:2` — `States · missing & edge cases`
  - `316:2` — `Responsive · breakpoints`
  - `318:2` — `Handoff Notes`
  - `319:2` — `Production Readiness`

Current verdict: **near handoff-ready structurally, but not cleanly production-ready yet.**

The file is no longer cover-only. It now has Foundations, Components, Screens, Overlays, States, Responsive, Production Readiness, Handoff Notes, and Archive pages. The product direction is strong: operational, dense, status-oriented, and appropriate for TESDA/TVI compliance workflows. The Batch Cards, Documents, Analytics, States, and Handoff Notes pages show real design thinking.

The remaining problems are production-governance problems, not concept problems: generated/imported layer debt, partial screen-to-component binding, unclear canonical responsive/table frames, small low-contrast text, questionable date math without an explicit as-of date, and chart/status semantics that still need tightening.

## Critical Issues

### Issue: Screens still contain generated-import structure and generic layer names

**Current State**: The `Screens` page includes many layers named `Html → Body`, `Container`, `Background+Border`, `Margin`, `SVG`, `Text`, `F`, and `Button`. The `Archive (raw imports)` page still contains html.to.design imports from Claude output.

**Problem**: This makes developer handoff brittle. Engineers cannot reliably tell which frames are intentional components, which layers are visual wrappers, and which layers are leftover import artifacts. It also makes future Figma maintenance slow.

**Recommendation**: Rename meaningful layers and collapse/delete generated wrappers that do not carry design meaning. Use stable semantic names such as `AppShell`, `Sidebar`, `MetricCard / Earliest Billing`, `BatchCard / Critical`, `FilterBar`, `DocumentMatrix`, `ChartCard`, and `DrawerShell`.

**Impact**: Engineers can inspect the file without reverse-engineering an HTML import tree.

**Implementation Notes**: Start with production pages only: `Screens`, `Overlays`, `Components`, `Responsive`. Leave `Archive (raw imports)` as historical reference but clearly mark it as non-handoff.

### Issue: Production Readiness says PASS while key gates are still PARTIAL

**Current State**: `Production Readiness` says the design is “NEAR handoff-ready,” but gates remain partial for IBM Plex cleanup, screen-to-component/variable rebinding, and full contrast audit.

**Problem**: “PASS” language can create false confidence. Engineers may implement from raw frames instead of canonical components and tokens.

**Recommendation**: Change the overall verdict to: `Handoff-ready for engineering estimation; blocked for production sign-off until partial gates are closed.`

**Impact**: Prevents premature production sign-off while still allowing implementation planning.

**Implementation Notes**: Separate gates into `Can estimate`, `Can implement`, and `Can sign off`. Current state likely passes estimation and early implementation, not final sign-off.

### Issue: Screen frames are not fully bound to canonical components and variables

**Current State**: The Figma inventory shows component sets exist, but the readiness page itself says screens still use local instances/raw fills and need rebinding to canonical component sets and token variables.

**Problem**: If screens are not built from the actual component library, updates to `Button`, `StatusBadge`, `MetricCard`, `BatchCard`, or `DrawerShell` will not propagate. This is a common Claude/Figma-import failure mode.

**Recommendation**: Rebuild or rebind production screen surfaces using the component sets from the `Components` page.

**Impact**: Reduces visual drift and makes the design system usable beyond a static screenshot.

**Implementation Notes**: Prioritize shared shell, sidebar nav, metric cards, status badges, urgency badges, buttons, filter pills, batch cards, table rows, document cells, modal shells, and drawer shells.

### Issue: Date and deadline semantics are not audit-safe

**Current State**: Screens show relative labels such as `17 days remaining`, `Synced 4m ago`, and deadline dates such as `Jun 18` / `Jun 20`. The design does not always show the exact as-of date near these derived values.

**Problem**: As of the current review date, June 6, 2026, `Jun 18` is 12 days away, not 17. The UI may be based on another as-of date, but that date is not visible enough. Compliance users need defensible date math.

**Recommendation**: Add an explicit `Data as of [exact timestamp]` line to every screen that displays relative deadlines. Pair relative values with exact source dates.

**Impact**: Prevents disputes over billing windows, audit history, and stale sync states.

**Implementation Notes**: Use exact ISO-backed timestamps in implementation. UI can render `17 days remaining`, but hover/title or adjacent metadata should expose the exact timestamp and calculation basis.

## High Priority Improvements

### Issue: Low-contrast microcopy is overused for operational data

**Current State**: Many labels, timestamps, helper strings, chart notes, and document metadata use tiny 9-11px muted text. The Handoff Notes page itself flags muted text contrast around `#97968E` on white as about `2.8:1`.

**Problem**: Some of this text is not decorative; it carries compliance meaning, such as billing dates, document status, sync source, and stage labels.

**Recommendation**: Reserve muted low-contrast text only for nonessential helper copy. Raise contrast and/or weight for all status, deadline, document, and audit metadata.

**Impact**: Better readability for coordinators working in dense, repeated daily workflows.

**Implementation Notes**: Use `color-text-secondary` for critical metadata and keep `color-text-muted` for helper-only text. Avoid 9px text for anything needed to complete a task.

### Issue: Analytics charts need clearer decision framing

**Current State**: Analytics includes progress bars, elapsed/remaining bars, NTP lag, document compliance, scholars, and alerts. Some labels are ambiguous, such as percentages in `Alerts sent (30 days)` and color-coded batch bars.

**Problem**: The charts look organized but do not always answer “what should the coordinator do next?” Color is also doing too much work.

**Recommendation**: Add action-oriented chart titles/subtitles and explicit units. For example: `NTP start lag: investigate batches above 15 days`, `Document compliance: missing critical documents block billing`, `Alerts sent: count by category, not percent unless denominator is shown`.

**Impact**: Makes analytics operational rather than decorative.

**Implementation Notes**: Add threshold labels, legends with text, empty/loading chart states, and keyboard/screen-reader summaries for each chart.

### Issue: Table View handoff is visually confusing

**Current State**: The `Frame 3 · Table View` section screenshot contains multiple table canvases inside one large section. At overview scale, it is unclear which table is canonical desktop, tablet, or mobile.

**Problem**: Engineers may implement the wrong variant or miss responsive behavior.

**Recommendation**: Split Table View into clearly labeled frames: `Table View / Desktop 1280`, `Table View / Tablet 834`, and `Table View / Mobile 390`.

**Impact**: Cleaner handoff and less ambiguity around table responsiveness.

**Implementation Notes**: Each frame should include the same data set and show the intended behavior: full table, horizontal scroll, or card-list alternative.

### Issue: Responsive page still reads partly like a placeholder

**Current State**: `Responsive · breakpoints` shows desktop/tablet/mobile examples, but metric values are placeholders like `00`, and the mobile example is too schematic compared with the real Batch Cards screen.

**Problem**: It documents reflow principles but does not fully prove the production UI works on mobile.

**Recommendation**: Replace placeholder values with real TVI-CAMS sample data and include one full realistic mobile batch card, filter state, and drawer/modal example.

**Impact**: Gives engineers enough detail to build mobile without guessing.

**Implementation Notes**: Mobile needs explicit behavior for sidebar collapse, filter sheet, table alternatives, document matrix, and full-screen drawers.

### Issue: Some navigation and icon controls need hit-target cleanup

**Current State**: Metadata shows nav buttons around 33-34px tall, which is acceptable for dense desktop, but one `Import CSV` SVG appears positioned at `x=27, y=25` inside a 33px-tall button, suggesting a visual alignment/import issue. Small icon buttons and notification badges also need accessible names.

**Problem**: Misaligned icons reduce perceived quality and can indicate exported layer bugs. Small controls are also hard to use repeatedly.

**Recommendation**: Normalize sidebar row height and icon alignment. Define icon button frames at 32px minimum on desktop and 44px on touch layouts.

**Impact**: Improves scan quality, keyboard focus predictability, and touch usability.

**Implementation Notes**: Annotate `aria-label` for icon-only controls, especially notifications, settings, refresh, close, upload, export, and review docs.

### Issue: Documents screen needs stronger prioritization for missing evidence

**Current State**: Documents shows a compliance summary, document rows, statuses, and missing/pending labels. Missing rows are visible, but the user must scan a long matrix to understand what blocks billing.

**Problem**: The coordinator’s primary task is to resolve blockers. A matrix alone is not enough when billing depends on a few missing critical items.

**Recommendation**: Add a top `Blocking items` strip listing exact missing required documents and the next action, e.g. `Weekly Progress Report — attach or verify before billing`.

**Impact**: Reduces time to action and prevents missed compliance blockers.

**Implementation Notes**: Keep the matrix for audit completeness, but make blockers actionable above it.

## Medium Priority Enhancements

### Issue: Batch Cards are dense enough to strain scanning

**Current State**: Batch cards carry program, NC level, urgency, trainer, scholars, TIP, training window, progress, NTP lag, billing deadline, BSRS, lifecycle, and remarks.

**Problem**: The card is powerful but cognitively heavy. Users need the urgent action to pop faster.

**Recommendation**: Make the card’s action summary more prominent: `Needs: Weekly Progress Report` / `Ready for billing` / `Assessment pending`.

**Impact**: Improves first-glance prioritization.

**Implementation Notes**: Put the action summary near the title or just above the lifecycle, not only in a footer remark.

### Issue: States page is useful but lacks implementation ownership

**Current State**: The `States` page includes loading, empty, no search results, sync failed, import validation failed, permission denied, document upload rejected, stale data, and long text.

**Problem**: States are shown visually but need ownership and trigger definitions.

**Recommendation**: Add one line per state: trigger condition, user action, and system recovery path.

**Impact**: Engineers and QA can test the state deliberately.

**Implementation Notes**: Example: `Sync failed` trigger = API timeout or 5xx; action = retry; recovery = preserve last known data and announce via live region.

### Issue: Overlay inventory is too spread out to inspect at a glance

**Current State**: The `Overlays` page contains multiple full app frames with modals/drawers. At page overview scale, these are hard to compare.

**Problem**: Designers and engineers cannot quickly verify modal consistency.

**Recommendation**: Add a compact overlay index frame showing each overlay shell side by side with width, trigger, close behavior, focus behavior, and mobile behavior.

**Impact**: Improves consistency across Notifications, Import CSV, Settings, Batch Detail, and Notion-style modal.

**Implementation Notes**: Keep full overlay frames, but add the index as the review surface.

### Issue: Component naming still mixes generic variants and final components

**Current State**: Component inventory includes generic names such as `Component 1`, `variant=1`, `variant=2`, alongside useful names like `Status Badge`, `Button`, `Metric Card`, and `Icon Button`.

**Problem**: Generic component names make maintenance and Code Connect mapping harder.

**Recommendation**: Rename all component sets and variants to production names.

**Impact**: Cleaner handoff and easier future design-system scaling.

**Implementation Notes**: Use names like `Button / Primary / Default`, `Button / Primary / Hover`, `StatusBadge / Missing`, `MetricCard / Critical`, `NavItem / Active`.

## Low Priority Suggestions

### Issue: Product copy can be tightened in a few places

**Current State**: Some labels are exact and operational; others are shorthand like `Review docs →`, `More filters`, and chart notes such as `solid = elapsed · light = remaining`.

**Problem**: The system tone is strong, but a few labels could be more explicit for compliance work.

**Recommendation**: Prefer precise action labels: `Review missing documents`, `Filter batches`, `Elapsed days vs remaining days`.

**Impact**: Reduces ambiguity without changing the visual system.

**Implementation Notes**: Keep copy concise and administrative.

### Issue: Production pages and archive pages need stronger separation

**Current State**: The file includes both production pages and raw import archives.

**Problem**: Future collaborators may accidentally use archived generated frames as source.

**Recommendation**: Add a visible archive warning frame: `Reference only — do not implement from these frames`.

**Impact**: Prevents design-source confusion.

**Implementation Notes**: Put this at the top of `Archive (raw imports)`.

## Positive Observations

- The design now has real product structure: Screens, Overlays, States, Responsive, Components, Foundations, and Handoff Notes.
- The visual language fits a TESDA compliance system: restrained, dense, status-oriented, and operational.
- Batch Cards give coordinators a strong overview of batch status, lifecycle, billing risk, and BSRS status.
- The Documents screen correctly treats missing evidence as a compliance blocker, not just a file list.
- The States page is a major improvement and covers practical failures such as sync failed, import validation, permission denied, stale data, rejected upload, and long text.
- Handoff Notes include important accessibility and data-integrity rules, including non-color-only status, progress text equivalents, semantic tables, live regions, and computed dates.
- The responsive page establishes breakpoint intent, even though the examples need more realistic data and detail.

## Updated Production Readiness Gate

TVI-CAMS should not be marked fully production-ready until these are done:

- Rename or remove generated generic layers on production pages.
- Rebind production screens to canonical component sets and token variables.
- Resolve the remaining IBM Plex / Inter governance issue.
- Run a full contrast audit across all screen text/background pairs.
- Split ambiguous multi-canvas screen sections into canonical desktop/tablet/mobile frames.
- Replace responsive placeholders with real data examples.
- Add explicit as-of timestamps beside relative date/deadline labels.
- Normalize icon alignment and hit targets.
- Add action summaries for compliance blockers on Batch Cards and Documents.
