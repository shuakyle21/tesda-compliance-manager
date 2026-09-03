# modules/documents — Document Checklist and Evidence (FR-06)

Per-batch document requirements, statuses, and evidence uploads.

## Contents
- `ui/DocumentsView.tsx` — documents screen (checklist, upload, preview via `shared/ui/FilePreviewModal`)
- `data/documents.ts` — fetch → map for the requirement catalog and per-batch document records
- `domain/compliance.ts` — the single home for critical-document compliance rules, including
  **untracked** semantics (a requirement with no record on the batch). Every surface that counts
  documents reads through it; see `docs/adr/ADR-004-untracked-document-semantics.md` (TES-94).

## Planned
- Evidence upload against Supabase Storage (the `DocumentsView` verify flow is still local state)
- `getDocumentRequirementsSnapshot(programId)` is scoped per scholarship program; no page currently
  has a program id to call it with, so every caller of `DocumentsView`/`TableView`/`AlertsPanel`/
  `DocumentStatusDonut` passes an empty `documentRequirements` catalog today (renders as "unknown"
  per ADR-004, never a fabricated figure) — wiring the program id through is a separate change
