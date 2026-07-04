# LAMR Evidence

The Learners Achievement Monitoring Report is modeled as **structured data plus a source-file upload** — not just a file. It is the evidence backbone for blended/asynchronous learning.

## Structure (four tables)

| Table | Holds |
| --- | --- |
| `lamr_reports` | Header: TVI name, program title, batch/section, module title, schedule, prepared-by, approved-by, source file link |
| `lamr_outcomes` | Learning outcome columns (LO1, LO2, …) with hours and sort order |
| `lamr_activities` | Activity columns under each outcome (ACT1, ACT2, …) |
| `lamr_entries` | Per learner × activity: completion mark + institutional assessment result (`competent` / `not_yet_competent` / `pending`) |

Learner/activity entries are unique on `(tenant_id, learner_id, activity_id)` — duplicates are rejected.

## One LAMR per module (ADR-001)

`lamr_reports` gains a `module_id` FK to `program_modules`, unique `(tenant_id, batch_id, module_id)`. "Missing LAMR" = program modules with no matching report, **named exactly by module** — the same exact-blocker philosophy as [[Document Checklist And Evidence]].

## Workflow

Trainer or Coordinator records header → defines outcomes and activity columns → marks learner completion → records assessment result per learner → records prepared-by/approved-by → uploads the source LAMR file, linked to the structured record. LAMR then appears in batch document readiness and trainer-side evidence. Writes are scoped to admin/coordinator/assigned-trainer.

Planned route: `/batches/[batchId]/lamr` (required by the PRD; no dedicated Figma frame). Built in Phase 2.3 of the [[Implementation Roadmap]].

## Related

- [[Roles And Permissions]] — who may edit
- [[Database Schema]]
- [[Batch Lifecycle]]

Sources: [[MASTER_PRD_SRS]] FR-08 · [[MVP_PRD]] §7.6 · [[ADR-001-billing-and-domain-model]] §11 · [[SUPABASE_SCHEMA_GUIDE]]
