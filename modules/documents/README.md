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
- `DOCUMENT_REQUIREMENTS` currently seeds from `shared/mocks/seed.ts` (12 mock keys) while live maps
  use the migration's 8 DB keys — reconciling the two catalogs is deliberately a separate change
