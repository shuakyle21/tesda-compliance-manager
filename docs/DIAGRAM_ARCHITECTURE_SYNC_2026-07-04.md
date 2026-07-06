# Diagram/Architecture Sync — 2026-07-04

> **Addendum (2026-07-06):** the future-backend recommendation referenced
> throughout this report as "Laravel" was changed to **Express.js
> (Node/TypeScript)** on 2026-07-06 (see TRD §1.3). The diagrams and docs this
> report describes have been updated accordingly; "Laravel" below is left as
> written because this is a dated historical record of the 2026-07-04 session.

Session goal: bring every system diagram in `diagrams/` and
`docs/API_MERMAID_DIAGRAMS.md` in line with the canonical Supabase migration
(`supabase/migrations/20260528160300_create_tenant_scoped_schema.sql`) and the
grilled docs (`MASTER_PRD_SRS.md`, `TRD.md`, `IMPLEMENTATION_PLAN.md`,
`MVP_PRD.md`, `ADR-001`), then close the loop on the Linear issues that cited
the drift.

## Root problem found

Several diagrams described a **future or fictional** system as if it were
**current**, with no labeling to tell the two apart:

1. Three files (`diagrams/erDiagram.mmd`, `diagrams/data model schema.mmd`,
   `docs/API_MERMAID_DIAGRAMS.md`) modeled `PROGRAM_RQM`, `ATTENDANCE_RECORDS`,
   and `TRAINER_UPDATES` as existing tables. None exist in the migration —
   this is the exact conflict Linear issue **TES-38** was filed to track.
   ADR-001 (2026-06-30) has since ruled on all three: RQM is fields on
   `batches` (not a table), `attendance_records` is real but unbuilt, and
   `TRAINER_UPDATES` was never adopted at all.
2. The same three files (plus `Request Auth Sequence Diagram.mmd`) modeled
   tenant membership as `profiles.tenant_ids` / `assigned_batch_ids` array
   columns. The real table is `profile_tenant_memberships` (join table with
   an `is_default` flag) — the arrays never existed in the migration.
3. Four files (`System Architecture LR.mmd`, `flowchart LR.mmd`,
   `Request Auth Sequence Diagram.mmd`, `API Diagram.mmd`) routed every
   request through a **Laravel API**. Per CLAUDE.md and Linear issue
   **TES-58** ("Plan Laravel API integration layer", Backlog, not started),
   Laravel is a documented future plan only — the current app calls Supabase
   directly from Next.js Server Components. No diagram showed that current
   reality; `System Architecture LR.mmd` and `flowchart LR.mmd` were
   byte-identical duplicates, both depicting the Laravel version.

## Files changed

| File | Change |
| --- | --- |
| `diagrams/erDiagram.mmd` | Rewritten to match the migration exactly: added `PROFILE_TENANT_MEMBERSHIPS`, removed `PROGRAM_RQM`/`ATTENDANCE_RECORDS`/`TRAINER_UPDATES`, fixed FK names (`program_id` not `scholarship_program_id`) and per-table fields (batches, learners, documents, LAMR\*, activity_log) to reflect real columns. |
| `diagrams/data model schema.mmd` | Same content as above (mirrors `erDiagram.mmd` — kept as a separate file only because it renders to a separate PNG). Also stripped ~400 lines of stray embedded Copilot/VS Code context dump that had been pasted into the file's front matter. |
| `diagrams/ADR-001 Planned Schema.mmd` **(new)** | Visualizes the ADR-001 §11 additions not yet migrated: `attendance_records`, `program_modules`, `batch_trainer_assignments`, `scholarship_cost_schedule`, `billing_records`, `tenant_settings`, `learner_identities`, plus new columns on `batches` (`rqm_code`, `ntp_number`, `approved_slots`, `total_amount`, NTP dates, `schedule_pattern`, `total_sessions`, `entrepreneurship_delivered`), `learners` (`entrepreneurship_completed`), and `lamr_reports` (`module_id`). Explicitly labeled planned/not-yet-migrated. |
| `diagrams/role based user access.mmd` | Rewritten around TRD §3.5's three-layer defense-in-depth model: unauthenticated redirect, no-profile setup-error state, membership/default-tenant resolution, an explicit `Resolved` fork showing the current TES-34 gap (falls back to least-privilege Viewer via `?role=`) vs. target state, per-role scope text matched to FR-02 wording, explicit deny branches per role (not just Trainer), and a final Supabase RLS gate before the response. Marked `Super Admin` as a dotted "future — not implemented" node per the RBAC Inconsistencies note (it's absent from the `profile_role` enum). |
| `diagrams/System Architecture LR.mmd` | Replaced Laravel-based content with the actual current architecture: Next.js Server Component/Route Handler → `createSupabaseServerClient()` (Clerk JWT bearer, anon key) → Supabase RLS → Postgres/Storage. |
| `diagrams/flowchart LR.mmd` | Left as the Laravel-integration diagram but added an explicit `FUTURE / PLANNED (TES-58, Backlog — not started)` header comment and relabeled the Laravel node so it can't be mistaken for current state. |
| `diagrams/Request Auth Sequence Diagram.mmd` | Rewritten to the current auth sequence: Clerk middleware → Server Component → `createSupabaseServerClient()` → RLS, with an explicit note marking the TES-34 resolver gap. No Laravel hop. Fixed a real mermaid syntax error found during validation (a `Note` line with `<br/>` + embedded quotes/colons broke the parser). |
| `diagrams/API Diagram.mmd` | Relabeled the "Laravel API" subgraph to "PLANNED Next.js Route Handlers (TES-32, not yet built) — later migrates behind Laravel per TES-58"; added a top comment clarifying no `app/api/` handlers exist yet. |
| `docs/API_MERMAID_DIAGRAMS.md` | Intro now states up front the whole doc is the future TES-58 plan. "System Architecture" and "Request Authorization Pipeline" sections now point to the canonical current-state diagram files instead of re-embedding stale copies. "Role-Based API Access" points to the canonical `role based user access.mmd`. "Core Data Model" section replaced with a historical note explaining the TES-38 conflict and pointers to the current-schema and planned-schema diagrams, instead of a third stale copy of the ERD. |
| `diagrams/*.png` | Regenerated 6 PNG renders (`API Diagram.png`, `Data model schema.png`, `Request Auth Sequence Diagram.png`, `role_based_access.png`, `System Architecture.png`, plus new `ADR-001 Planned Schema.png`) from the corrected `.mmd` sources via `@mermaid-js/mermaid-cli`, so images match source again. |

## Design decision: stop triple-maintaining the same diagram

The root cause of the drift wasn't any single wrong edit — it's that the same
ERD and the same architecture diagram existed in **three places**
(`diagrams/erDiagram.mmd`, `diagrams/data model schema.mmd`,
`docs/API_MERMAID_DIAGRAMS.md`), and updates only ever landed in one. Rather
than fix all three independently (guaranteeing the next edit repeats this),
`docs/API_MERMAID_DIAGRAMS.md` now points at the `diagrams/*.mmd` files as the
canonical source for anything it used to duplicate. The two `diagrams/*.mmd`
copies still both exist only because they render to two differently-named
PNGs the design bundle expects — if that constraint goes away, one of them
should be deleted outright.

## Validated

Every touched `.mmd` file was run through `@mermaid-js/mermaid-cli` and
confirmed to render without parser errors (this caught and fixed one real
syntax bug in the sequence diagram).

## Linear issues updated

Comments added (no statuses changed — none of this closes the underlying
engineering work, only the documentation/diagram-level conflicts):

- **TES-38** (Resolve schema gaps) — diagram-level conflict it cites is fixed; actual migration for the ADR-001 decisions is still outstanding.
- **TES-58** (Plan Laravel API integration layer) — current-vs-future diagram split is now in place as a planning artifact.
- **TES-34** (Tenant/role resolution middleware) — ERD and role-access diagram now model the resolver's real shape (`profile_tenant_memberships`, the current fallback gap).
- **TES-32** (Establish API/DTO boundary) — endpoint-catalog diagrams no longer conflate this with Laravel.

## Explicitly not done

- No Supabase migration was written. `attendance_records`, RQM columns on
  `batches`, and the other ADR-001 additions remain undecided-in-code — TES-38
  is still open for that reason.
- No Route Handlers or Laravel code were built — TES-32 and TES-58 remain
  open.
- TES-35 (multi-school switcher) and TES-36 (enforce permission matrix
  server + UI) were not commented on; the updated `role based user access.mmd`
  is relevant background for both but no diagram-specific conflict was found
  to report against them.
