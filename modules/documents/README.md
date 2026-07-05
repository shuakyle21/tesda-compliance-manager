# modules/documents — Document Checklist and Evidence (FR-06)

Per-batch document requirements, statuses, and evidence uploads.

## Contents
- `ui/DocumentsView.tsx` — documents screen (checklist, upload, preview via `shared/ui/FilePreviewModal`)

## Planned
- `data/documents.ts` — fetch → map → derive for document records (Supabase Storage-backed evidence)
- `domain/` — critical-document compliance rules (currently embedded in `shared/mocks` `getMockMetrics`; `DOCUMENT_REQUIREMENTS` seed lives in `shared/mocks/seed.ts` until live data lands)
