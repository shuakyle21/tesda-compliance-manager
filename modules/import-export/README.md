# modules/import-export — CSV Import and Export (FR-10)

- `ui/ImportCsvModal.tsx` — the Import CSV overlay (design-sync port, TVI-CAMS.dc.html
  `opModal.isImport`), opened from the Sidebar's Operations group. Idle → picking →
  loading → success/missing/error state machine. No `data/` pipeline exists yet, so
  this is a canned three-sample picker (success / missing columns / unreadable file),
  matching the design's own fidelity level rather than inventing a T2MIS/BSRS parser
  contract nobody has designed.

## Planned
- `data/` — real CSV parse/validate/import pipelines (learner import keyed on ULI —
  the permanent learner key); once built, replace the modal's canned samples with an
  actual file input wired to this layer
- `domain/` — row-validation rules, duplicate/ULI collision handling
