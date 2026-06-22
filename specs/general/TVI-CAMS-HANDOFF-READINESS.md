# TVI-CAMS Handoff Readiness Spec

## Overview

TVI-CAMS is a TESDA Documents and Compliance Audit Management System for TVI coordinators monitoring batches, documents, lifecycle milestones, billing deadlines, and audit readiness.

The current Figma artifact is not handoff-ready. It only exposes the cover frame through the Figma connector. The repo contains design tokens, a detailed design reference, a static UI kit, and route scaffolds, but the production app still needs the prototype converted into real components and states.

## Layout

Required production layouts:

| Surface | Desktop | Tablet | Mobile |
|---|---|---|---|
| Shell | Sticky topbar, metrics row, tabs, centered max-width content | Metrics wrap to 2 columns, tabs remain visible or scroll horizontally | Header compacts, metrics stack, tabs scroll horizontally |
| Batch Cards | Single-column cards, full-width content | Single-column cards, internal card columns reduce to 2 or stack | Card body stacks vertically, lifecycle becomes scrollable or compact |
| Table View | Full table with fixed row height and sortable columns | Horizontal scroll with sticky first column | Card-list alternative or horizontal scroll with clear affordance |
| Documents | Matrix table | Horizontal scroll with sticky batch column | Batch-grouped document cards |
| Analytics | 1-2 column chart grid | Single-column chart grid | Single-column, simplified legends and larger tap targets |
| Drawers | Right side drawer | Right side drawer or near-full-screen sheet | Full-screen sheet with sticky header/footer |
| Modals | Centered modal with max width | Near-full-width modal | Bottom sheet or full-screen modal |

## Design Tokens Used

| Token | Value | Usage |
|---|---:|---|
| `color-bg` | `#F5F4F0` | App background |
| `color-surface` | `#FFFFFF` | Cards, panels, modals |
| `color-surface-alt` | `#EEECEA` | Alternate rows, secondary surfaces |
| `color-border` | `#D8D6D0` | Default borders and dividers |
| `color-text-primary` | `#18180F` | Primary labels and headings |
| `color-text-secondary` | `#5A5950` | Body text |
| `color-text-muted` | `#97968E` | Metadata, placeholders, secondary labels |
| `color-blue` | `#185FA5` | Active navigation, informational status |
| `color-green` | `#3B6D11` | Approved, completed, on track |
| `color-amber` | `#C7600F` | Warning, 7-21 day deadline risk |
| `color-red` | `#C81F1F` | Critical, errors, less than 7 day deadline risk |
| `font-sans` | `IBM Plex Sans` | UI text |
| `font-mono` | `IBM Plex Mono` | Dates, IDs, codes, percentages |
| `radius-lg` | `8px` | Cards and controls |
| `h-button` | `32px` | Dense desktop buttons |
| `h-table-row` | `40px` | Table rows |
| `bar-thick` | `6px` | Progress bars |
| `dur-base` | `150ms` | UI transitions |
| `dur-chart` | `400ms` | Chart entry animations |

## Components

| Component | Variant | Props | Notes |
|---|---|---|---|
| `AppShell` | dashboard | `children`, `metrics`, `lastSyncedAt` | Sticky topbar, metrics, tabs |
| `MetricCard` | neutral, warning, critical | `label`, `value`, `sub`, `icon`, `variant` | Values use mono when numeric/date-like |
| `DashboardTabs` | active/inactive | `tabs`, `activePath` | Keyboard tablist or navigation list contract required |
| `FilterBar` | default, compact | `query`, `program`, `filters`, `onExport` | URL-backed filters recommended |
| `BatchCard` | critical, warning, on-track, overdue | `batch`, `onOpen` | Must be keyboard-operable if clickable |
| `StatusBadge` | program, NC level, lifecycle, BSRS, urgency | `variant`, `icon`, `children` | Must not rely on color alone |
| `LifecyclePipeline` | horizontal, compact | `steps`, `activeStep` | Needs accessible text summary |
| `ProgressBar` | schedule, completion | `value`, `label` | Needs text equivalent |
| `DataTable` | batches, documents | `columns`, `rows`, `sort`, `filters` | Sticky headers and responsive overflow |
| `DocumentCell` | present, missing, pending, rejected | `status`, `document`, `action` | Needs open/attach/error states |
| `ModalShell` | centered | `title`, `description`, `footer`, `onClose` | Focus trap and inert background |
| `DrawerShell` | right, full-screen | `title`, `children`, `footer` | Sticky header/footer and scroll containment |
| `Toast` | success, info, warning, error | `title`, `message`, `variant` | Use live region |

## States and Interactions

| Element | State | Behavior |
|---|---|---|
| Buttons | Hover | Surface or border changes within token palette |
| Buttons | Active | Slight press feedback, no layout shift |
| Buttons | Focus | Visible `focus-visible` ring using blue token |
| Buttons | Disabled | Muted visual state and blocked interaction |
| Batch card | Hover | Raised surface or shadow |
| Batch card | Keyboard focus | Same visibility as hover plus focus ring |
| Search input | Typing | Filters list and shows count |
| Search input | Empty results | Show clear no-results state |
| Tabs | Keyboard | Arrow or tab navigation must be specified |
| Modal | Open | Focus moves to modal title or first actionable control |
| Modal | Close | Escape closes non-destructive modal and returns focus |
| Import flow | Invalid file | Inline error with exact reason |
| Sync | In progress | Button disabled with live status |
| Export | Long running | Queued or loading state, then success/error toast |

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| Desktop `>1024px` | Full dashboard shell, metrics in five columns, card internals in three columns |
| Tablet `768-1024px` | Metrics wrap, card internals reduce, charts become single column when cramped |
| Mobile `<768px` | Filters collapse, cards stack, tables need card alternative or explicit horizontal scroll, drawers become full-screen |

## Edge Cases

- **Empty state**: No batches, no documents, no activity, no analytics data, no matching filters.
- **Long text**: School names, trainer names, qualifications, and document titles need truncation and tooltip/title behavior.
- **Large data**: Many batches require pagination, virtualized tables, or server-side query.
- **Slow connection**: Sync, import, export, and document attach need loading states and retry actions.
- **Missing data**: Show exact unknown fields, not blank cells.
- **Conflicting data**: Flag impossible states such as completed billing without assessment, or document count exceeding total required.
- **Permission denied**: Explain which action is unavailable and why.
- **Stale data**: Last synced timestamp should have exact time and stale warning threshold.

## Animation / Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---:|---|
| Progress bar | Mount/data update | Fill from previous value to new value | `400ms` | `ease-spring` |
| Lifecycle active step | Active state | Pulse indicator | `2000ms` | `ease-standard` |
| Modal backdrop | Open | Fade in | `150ms` | `ease-enter` |
| Modal sheet | Open | Fade/translate in | `150ms` | `ease-enter` |
| Toast | Show | Fade/translate in | `250ms` | `ease-enter` |

All motion must respect `prefers-reduced-motion: reduce`.

## Accessibility Notes

- Every icon-only control needs an accessible name.
- Every status conveyed by color also needs text.
- Dialogs require `role="dialog"` or native dialog semantics, `aria-modal`, accessible title, focus trap, Escape handling, inert background, and focus return.
- Tables need semantic `table`, `thead`, `tbody`, `th`, scoped headers, and sortable header announcements if sorting is added.
- Progress bars need `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a visible or accessible label.
- Toast and async status should use `aria-live="polite"` except destructive errors that may require assertive announcement.
- Minimum dense desktop hit target should be 32 px; touch layouts should use 44 px.

## Handoff Verdict

Do not hand this Figma file directly to engineering as a production design. Use the local `DESIGN.md` and `ui_kits/admin/` as reference material, then create a real Figma handoff file or finish the production Next.js implementation from the existing codebase.

Minimum next handoff package:

- Inspectable Figma screens and overlays.
- Figma components with variants and states.
- Figma variables matching repo tokens.
- Responsive frames for every main workflow.
- Accessibility and interaction annotations.
- Data rules for deadlines, progress, document status, and audit history.
- Explicit acceptance criteria for production implementation.
