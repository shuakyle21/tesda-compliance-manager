# Modals And Drawers

The modal/drawer audit reviewed the Notifications Drawer, Import CSV, Tenant Settings, and Batch Detail drawer, and produced a **system-level interaction contract** — a requirement for every overlay, not a per-screen enhancement.

## The modal interaction contract (P0)

- `role="dialog"` or native `<dialog>`; `aria-modal="true"` for blocking modals
- Accessible name from the visible title (`aria-labelledby`)
- **Focus trap** while open; **focus returns to the opener** on close
- **Escape closes** non-destructive modals; background content is **inert**
- `overscroll-behavior: contain` on scroll containers; visible `:focus-visible` on all controls

## Other cross-modal findings

- **Hit targets:** several actions are 23–32px; require ≥32px dense desktop, 44px touch ([[Design System Rules]])
- **Responsive:** center modals become bottom sheets / near-full-screen on mobile; drawers become full-screen sheets; sticky footer actions when content scrolls
- **No implementation copy:** `alerts_log` → "Alert history", `public.batches` → "Batch records", etc.
- **Async states:** loading, saving, success, validation error, partial failure, permission denied, empty — with `aria-live="polite"` announcements and focus moved to the first error
- **Date/count integrity:** relative labels resolve to exact dates in audit surfaces; impossible counts ("9 of 8 critical docs") are data-integrity bugs — date math is never hand-authored

## Reusable primitives to build first

`ModalShell` · `DrawerShell` · `FileDropzone` · `RoleMatrix` (text labels, not icon-only) · `DocumentActionRow` · `AsyncStatus` (live region). Modal surfaces are **route states**, not standalone routes — deep links use query params (`/batch-cards?batchId=:id`).

## Per-surface highlights

- **Import CSV:** keyboard-operable upload, validation for type/headers/duplicates, **mandatory preview before commit**, warn before discarding a selected file
- **Tenant Settings:** check/cross icons need text equivalents; role changes need confirmation/undo + audit note
- **Batch Detail:** sticky header/footer, document-row failure states, bigger Open/Attach targets

## Related

- [[Alerts]] — the notifications drawer
- [[Learner Identity And Import]] — the import flow this contract governs

Sources: [[UI_UX_MODAL_AUDIT]] · [[MASTER_PRD_SRS]] §6 common requirements · [[TRD]] §13
