# TVI-CAMS Modal and Drawer UI/UX Audit

Source: Figma file `TVI CAMS`, node `52:2235` (`Modals & Drawers`)

Reviewed screens:

- Notifications Drawer
- Import Batches via CSV
- Tenant Settings
- Batch Technical Institute detail drawer

Audit basis:

- Project design rules in `DESIGN.md`
- Installed `web-design-guidelines` skill from `vercel-labs/agent-skills`
- Operational TESDA compliance workflows: coordinator/admin speed, audit clarity, tenant safety, and accessibility
- Enterprise document management guidance from PandaDoc: document capture, centralized storage, metadata indexing, access controls, workflow automation, lifecycle management, version control, audit trails, retrieval/search, and analytics.

## Cross-Modal Findings

### P0 - Add the modal interaction contract

Every modal and drawer should have the same implementation contract:

- `role="dialog"` or native `<dialog>` semantics.
- `aria-modal="true"` for blocking modals.
- Accessible name from the visible title via `aria-labelledby`.
- Focus trap while open.
- Return focus to the opener on close.
- Escape closes non-destructive modals.
- Background content is inert while open.
- `overscroll-behavior: contain` on modal/drawer scroll containers.
- Visible `:focus-visible` state on close, footer buttons, rows, checkboxes, and attach/open actions.

This is a system-level requirement, not a per-screen enhancement.

### P0 - Normalize action hit targets

Several visible actions are 23-32 px tall, especially `Open`, `Attach`, close icons, and drawer utility controls. Use at least 32 px for dense desktop actions and 44 px for touch layouts. Keep the visual style compact, but make the interactive area larger through padding or an invisible hit area.

### P1 - Make all modal states responsive

Current designs are desktop-fixed. Define responsive rules:

- Center modals: max width on desktop, full-width bottom sheet or near-full-screen panel on mobile.
- Drawers: right drawer on desktop, full-screen sheet on mobile.
- Footer actions: sticky bottom action bar when content scrolls.
- Close control remains visible while content scrolls.

### P1 - Remove implementation copy from user-facing UI

Visible strings such as `alerts_log`, `public.batches`, `tenant_id`, and `Supabase` expose implementation details. Replace them with operational language:

- `alerts_log` -> `Alert history`
- `public.batches` -> `Batch records`
- `tenant_id scoped queries enforced` -> `School-level data isolation enforced`
- `Supabase` -> show only where it helps the operator understand evidence source; otherwise hide it in metadata/tooltips.

### P1 - Add async and error states

All modal flows need explicit states:

- Loading
- Saving/importing
- Success
- Validation error
- Partial failure
- Permission denied
- Empty state

Use `aria-live="polite"` for async status changes. Inline errors should appear next to the affected field or row, and submit should focus the first error.

### P1 - Validate date and count consistency

The mock data currently has consistency risks:

- `Jun 18` with `3 days remaining` must be generated from the same date source.
- Compliance snapshots show `9 of 8 critical docs`, which is impossible.
- Relative labels like `today` should resolve to an exact date in audit-history surfaces.

For compliance work, date math and counts should never be hand-authored in the UI.

## Notifications Drawer

### What Works

- Clear separation between subscription controls and recent alerts.
- Alert items carry category, age, batch ID, recipient count, and delivery status.
- Drawer keeps the operator in context without hiding the dashboard state.

### Fixes

- P0: Give the close icon an accessible name and a larger hit target.
- P0: Treat the drawer as a modal surface when open: focus trap, inert background, Escape close, and return focus to `Notifications`.
- P1: Clarify whether subscription checkboxes auto-save. If auto-save, show `Saved`/`Saving...`; if not, add `Save subscriptions`.
- P1: Add `Mark all read` and filter controls for alert type/status. Recent alerts are operational work, not just a feed.
- P1: Avoid relying on icon color alone for alert severity. Keep the text labels and add status badges where needed.
- P2: Long alert names and recipient labels need truncation rules and tooltips.

## Import Batches via CSV

### What Works

- The modal has a clear title, upload zone, expected columns, and primary/secondary footer actions.
- The flow is scoped to a single administrative task.

### Fixes

- P0: The upload zone must be keyboard-operable and labeled as a file input.
- P0: Add file validation states for wrong type, oversized file, malformed headers, duplicate batch IDs, and row-level errors.
- P1: Replace `Select file...` with a specific label such as `Select CSV file`. If the action opens a picker, use the ellipsis character in the rendered UI.
- P1: Add a preview step before writing records. CSV imports are high-risk and should show row count, tenant, program, and any warnings before submit.
- P1: Add `Download CSV template`.
- P1: Replace `public.batches` copy with operational language.
- P1: Warn before closing if a selected file or parsed rows would be discarded.
- P2: Expected columns are too small and technical. Use a two-column table: Column, Required/Optional, Example.

## Tenant Settings

### What Works

- The modal gives a compact view of members, roles, permissions, deadline rules, and tenant safety.
- Role matrix supports auditability and permission review.

### Fixes

- P0: Clarify whether this is read-only or editable. The title says settings, but the screen mainly reads as a report.
- P0: Permission matrix check/cross icons need text equivalents for screen readers and color-independent interpretation.
- P1: Role changes and permission edits require confirmation or an undo window.
- P1: Add search/filter for members when the list grows.
- P1: Replace implementation copy with user-facing isolation language.
- P1: Add an explicit audit note: who last changed settings and when.
- P2: Role labels and active statuses are low-contrast at current size. Increase contrast or weight.

## Batch Detail Drawer

### What Works

- Strong operational structure: batch summary, lifecycle, documents, snapshots, and auto remark.
- Document list exposes status, required flag, update date, and action.
- The drawer is useful for quick inspection without leaving analytics.

### Fixes

- P0: `Open` and `Attach` buttons are too small for repeated operational use. Increase hit target.
- P0: Add focus trap, close semantics, Escape handling, return focus, and scroll containment.
- P1: Add sticky drawer header and sticky footer actions when the document list scrolls.
- P1: Fix impossible snapshot counts such as `9 of 8 critical docs`.
- P1: Replace relative `today` with a concrete date in audit-history content.
- P1: Document rows need failure states: upload failed, virus scan pending, verification rejected, file missing, and permission denied.
- P1: `Attach` should open a clearly labeled upload/link flow with accepted file types and source requirements.
- P2: The auto remark is visually hidden at the bottom of a long drawer. Move it closer to the top as an action summary, or make it sticky under the header.

## Recommended Modal System Components

Build these as reusable primitives before implementing the screens:

- `ModalShell`: title, description, close button, focus trap, Escape behavior, max width, footer.
- `DrawerShell`: side/full-screen responsive behavior, sticky header, scroll containment, focus trap.
- `FileDropzone`: keyboard file picker, drag/drop, validation, progress, error state.
- `RoleMatrix`: accessible table with text labels, not icon-only meaning.
- `DocumentActionRow`: fixed action target sizes, long-text handling, status badges, upload/open variants.
- `AsyncStatus`: `aria-live` message region for saving/importing/syncing.

## EDM-Based Product Edits

The PandaDoc enterprise document management article frames EDM as a system for capturing, storing, organizing, retrieving, securing, and tracking documents across their lifecycle. For TVI-CAMS, that translates into these concrete UI changes:

- CSV import should become a capture-and-indexing flow, not only a file upload. Add a mapping/preview step for batch fields, document type, school, program, date, author/source, required status, and retention class.
- Batch Detail Drawer should expose repository controls: search documents, filter by status/type/source, sort by last updated, and show metadata tags for each document.
- Document rows should include version control and audit trail entry points: latest version, previous versions, changed by, verified by, rejected reason, and timestamps.
- Tenant Settings should make document access controls explicit by role and document category, including who can view, attach, verify, export, and delete evidence.
- Deadline and urgency rules should include retention and lifecycle policies: when documents are required, when they can be archived, and what cannot be deleted.
- Notifications should represent workflow routing, not only alerts: assignment, approval request, rejection, verification complete, import failed, and retention/deadline warnings.
- Analytics should include document-management KPIs: retrieval time, missing/expired documents, verification throughput, rejected uploads, and audit-readiness percentage.

## Implementation Acceptance Criteria

- Keyboard-only user can open, use, and close every modal/drawer.
- Screen reader announces the modal title and any async validation result.
- Background page cannot be focused or scrolled while a blocking modal is open.
- Close returns focus to the triggering control.
- All actions have hover, active, disabled, loading, and focus-visible states.
- Mobile layout is defined for all four modal patterns.
- CSV import cannot commit rows without validation and preview.
- Audit/history surfaces use exact dates, not ambiguous relative labels.
