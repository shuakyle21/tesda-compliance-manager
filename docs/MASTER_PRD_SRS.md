# TVI-CAMS Master PRD and SRS

Version: 1.0.0  
Revision date: 2026-06-12  
Status: Current consolidated source of truth, pending stakeholder sign-off  
Product name: TESDA Document and Compliance Manager / TVI-CAMS  
Prepared for: Product, Design, Engineering, QA, and Operations

## Source Register and Precedence

This document consolidates the provided PDF, repository documentation, live Figma structure, current code, and database migration. The following precedence is used when sources conflict:

1. Latest accessible Figma file for UI structure, role-specific screen variants, states, overlays, and interaction intent.
2. Current repository implementation for actual shipped state.
3. Supabase migration for implemented database and RLS behavior.
4. Latest repository PRD, route map, UX audits, handoff notes, and backlog for approved product direction.
5. Attached PDF requirements as legacy or portfolio-level requirements unless confirmed by newer sources.

Sources reviewed:

| Source | Current finding |
| - | - |
| Live Figma file `vZKyWXSipBHmiQFuHl5e1O` | Accessible. Pages include Cover, Foundations, Components, Overlays, States, Responsive, Screens, Production Readiness, Handoff Notes, and Archive. Screens include Coordinator, Admin, Viewer, and Trainer variants. |
| `/Users/gabz_1/Downloads/training_compliance_system_requirements_3.pdf` | Legacy portfolio-style requirements v2.0 for Training Program Compliance System. Includes Level 0-3 roadmap: batch display, progress, deadlines, NTP lag, documents, analytics, Supabase, Clerk, email alerts, Upstash, PWA. |
| `README.md` | Current MVP scope and official systems boundary. Explicitly states Supabase-only operational data, no official TESDA replacement, and no Laravel assumptions. |
| `docs/MVP_PRD.md` | Current MVP PRD covering tenants, roles, workflows, LAMR, document checklist, billing preparation, import/export, and later backlog. |
| `supabase/migrations/20260528160300_create_tenant_scoped_schema.sql` | Implemented tenant-scoped schema, enums, RLS helper functions, policies, seed data, and Storage bucket policy. |
| `specs/general/FIGMA-ROUTE-MAP.md` | Route and API mapping derived from Figma. Introduces Laravel API as future production API direction. |
| `specs/general/UI-IMPROVEMENTS.md` | Latest Figma audit: near handoff-ready structurally, not production sign-off ready. Flags layer debt, component binding, date semantics, contrast, responsive gaps, and document blocker visibility. |
| `docs/UI_UX_MODAL_AUDIT.md` | Modal and drawer accessibility, state, and implementation requirements. |
| `specs/general/TVI-CAMS-HANDOFF-READINESS.md` | Handoff readiness and component contract guidance. |
| Current `app/`, `components/`, `lib/` code | Next.js shell, Clerk provider/proxy, route placeholders, auth helpers, and many TODO data/component stubs. A Supabase-backed batches data-access contract now exists (`lib/data/batches.ts`, TES-30), not yet wired into the dashboard. No production API **route handlers** (`app/api/*`) found. |

Confirmed conflicts and resolutions:

| Conflict | Resolution in this master document |
| --- | --- |
| README says "No Laravel assumptions"; route/API docs introduce Laravel API. | Current MVP remains Next.js + Clerk + Supabase. Laravel is documented as a recommended future backend/API layer, not implemented and not required for MVP completion. |
| PDF includes Resend, GitHub Actions, Upstash Redis, Recharts, PWA, and Notion CSV migration. | These are treated as backlog or optional production-grade capabilities unless reconfirmed by current MVP docs or Figma. |
| Route map lists `/dashboard` as implemented, but current `app/` tree has no `app/(dashboard)/dashboard/page.tsx`. | `/dashboard` is required by Figma and root redirect, but implementation is missing. This is a P0 implementation gap. |
| Figma has role-specific Admin, Coordinator, Viewer, Trainer screens plus Report and updated T2MIS/BSRS import overlay; route map covers fewer surfaces. | Screen inventory includes all live Figma surfaces and flags missing routes. |
| Database migration includes `profile_tenant_memberships`; earlier docs describe `tenant_ids` arrays in `profiles`. | Implemented membership table is canonical for the database. UI and API should expose this as "assigned schools", not arrays or table names. |
| API diagram mentions `PROGRAM_RQM`, `ATTENDANCE_RECORDS`, and `TRAINER_UPDATES`, but migration does not create them. | **Resolved by ADR-001:** `attendance_records` is required (per-learner, time in/out); RQM is an NTP authorization on the batch (one RQM = one batch), not a `program_rqm` table; `trainer_updates` folded into `attendance_records` + `activity_log`. |
| Billing scoped as a passive "preparation signal" (FR-09) vs. school practice of generating official TESDA billing documents. | **Resolved by ADR-001 (2026-06-30):** billing is a document-generating engine (TSF/Allowance, Training Cost, Entrepreneurship) driven by TESDA Circular 015 s.2026 + rules 5.1.x/7.2.x. **ADR-001 takes precedence over any "signal-only" wording in this document and `docs/MVP_PRD.md`.** Assessment billing stays out of scope; no submission workflow. |

## 1. Executive Summary

### Project Overview

TVI-CAMS is an internal compliance and document tracking system for farm schools and Technical Vocational Institutions (TVIs) managing TESDA scholarship training batches, initially TWSP and CFSP. It provides role-scoped visibility into batch lifecycle status, missing evidence, trainer-side updates, LAMR evidence, readiness signals, and audit history.

The system is an internal operational workflow layer only. It does not replace TESDA SIS, T2MIS, BSRS, official qualification maps, official schedules, attendance submissions, billing documents, reports, or approvals.

### Problem Statement

Training compliance work is spread across official TESDA systems, local documents, trainer updates, spreadsheets, manual follow-ups, and audit evidence. Coordinators need one internal view of batch readiness, missing evidence, training progress, and billing preparation risk without exposing sensitive or irrelevant compliance details to trainers or viewers.

### Vision Statement

Create a trustworthy, dense, status-first operations tool that lets TVI staff identify what needs action now, maintain audit-ready evidence, protect tenant data, and prepare internal compliance packages faster while keeping official TESDA systems authoritative.

### Goals and Objectives

| Goal ID | Goal | Objective |
| --- | --- | --- |
| G1 | Improve compliance visibility | Show batch lifecycle, document readiness, training progress, urgency, and blockers in one role-scoped dashboard. |
| G2 | Reduce missing evidence risk | Track exact required documents by program and batch, including LAMR structured evidence and source files. |
| G3 | Protect tenant and role boundaries | Enforce school-level scoping and role access through Clerk, Supabase RLS, and future API policies. |
| G4 | Support trainer updates without overexposure | Let trainers maintain attendance/progress/evidence for assigned classes only, while hiding billing and financial fields. |
| G5 | Prepare internal billing packages | Surface an internal billing preparation signal at a configurable progress threshold without implying TESDA approval. |
| G6 | Keep handoff and QA traceable | Map business goals to screens, APIs, data entities, and tests. |

### Success Metrics

| Metric | Target |
| --- | --- |
| Tenant isolation | 100% of tenant-owned reads/writes scoped by tenant and role in automated tests. |
| Missing document visibility | Coordinator can identify missing required documents for a batch within 30 seconds. |
| Trainer update efficiency | Trainer can open an assigned class and submit attendance/progress evidence in under 2 minutes. |
| Data integrity | Zero impossible document counts, date math inconsistencies, or manually typed relative deadlines in production. |
| Audit readiness | Activity log records 100% of batch, document, trainer update, LAMR, import, export, and verification events. |
| Accessibility | Core screens and modal flows meet WCAG 2.2 AA for contrast, keyboard operation, status text, dialog semantics, and live regions. |
| Implementation maturity | All Figma primary screens have implemented routes, loading/empty/error states, permissions, and QA tests. |

### Intended Users

Primary users are school admins, coordinators, trainers, viewers/auditors, and system maintainers. A Super Administrator role is requested by the master prompt but is not implemented in the current schema; it is included below as a recommended future platform role.

## 2. Product Scope

### In Scope

Confirmed MVP scope:

- Clerk authentication and protected routes.
- Roles: Admin, Coordinator, Trainer, Viewer.
- Initial tenants: AKB Technical Vocational Inc., J3ED Farm School, Nenita Farm Rice-Based School.
- Initial programs: TWSP and CFSP, stored as configurable scholarship program records.
- Tenant isolation through Supabase RLS.
- Admin, Coordinator, Viewer, and Trainer role-specific dashboards.
- Batch lifecycle tracking: AOU, NTP, TIP, Training, Assessment, Billing, plus database support for Completed and Blocked.
- Batch progress and urgency calculations.
- NTP receipt and NTP-to-start lag tracking.
- TIP and assessment status visibility.
- BSRS/exemption status visibility for Admin/Coordinator/Viewer where allowed; hidden from Trainer views unless specifically approved.
- Required document checklist by program.
- Evidence upload/link storage through Supabase Storage.
- Document statuses: Missing, Pending, Submitted, Verified.
- LAMR as structured evidence plus source file.
- Blended/asynchronous learning evidence support through LAMR and equivalent attendance evidence.
- Trainer assigned-class views, roster access, attendance/progress updates, and training-side evidence uploads.
- Internal billing preparation signal with default 80% progress threshold.
- CSV import and filtered export for Admin/Coordinator.
- Activity log and audit trail.
- Figma-defined overlays: batch detail drawer/modal, notifications drawer, import CSV modal, settings modal, and T2MIS/BSRS import modal.
- Figma-defined states: loading, empty, no results, sync failed, import validation failed, permission denied, document upload rejected, stale data, long text.
- Responsive breakpoints for desktop, tablet, and mobile.

### Out of Scope

Explicitly excluded from current MVP:

- Replacing TESDA SIS, T2MIS, BSRS, or official submission workflows.
- Official TESDA approvals, official billing approval, official report submission, or final government record authority.
- Direct SIS/T2MIS/BSRS integration, unless later authorized and technically feasible.
- Email notifications through Resend.
- GitHub Actions scheduled deadline checks.
- Upstash Redis caching or alert deduplication.
- MongoDB document intelligence index.
- OCR or AI document review.
- Advanced TESDA-format report generation.
- PWA/offline mode.
- Advanced analytics beyond core operational summaries.
- Public self-service registration for external users.
- Super Admin production role until schema/API support is added.

### Assumptions

- "Latest Figma" means the accessible file key `vZKyWXSipBHmiQFuHl5e1O` inspected on 2026-06-12.
- The system is initially internal-only and small-team focused.
- Supabase remains the current MVP database, storage, and RLS layer.
- Laravel may be added later as a backend/API service layer but is not currently implemented.
- Program requirements may differ by scholarship program and must remain configurable.
- All computed deadline/progress values derive from stored source dates and an explicit "data as of" timestamp.
- Viewer may represent internal audit, external reviewer, or TESDA-facing preparation, but remains read-only unless a future role policy changes.

### Constraints

| Constraint Type | Constraint |
| --- | --- |
| Technical | Current app has route and component placeholders; many TypeScript data contracts are TODO. The batches data-access contract is now implemented (`lib/data/batches.ts`, TES-30) as the reference for the rest. |
| Technical | No production API route handlers found in current Next.js app. |
| Technical | Supabase migration exists, but live hosted Supabase connectivity was not validated in this pass. |
| Technical | Figma screens contain generated/imported layer debt and are not final production sign-off ready. |
| Budget | Current stack favors free or student-pack-friendly services. Avoid paid-only dependencies for MVP. |
| Resource | Initial product appears scoped for a small internal team of approximately five users. |
| Timeline | MVP should prioritize auth, tenant isolation, schema, core workflow, and QA before later automation. |
| Compliance | Official TESDA records remain authoritative and must not be overwritten or misrepresented. |

## 3. Stakeholder Analysis

| Stakeholder | Goals | Responsibilities | Permissions | Pain Points |
| --- | --- | --- | --- | --- |
| Admin | Govern one school's compliance operations and user access. | Manage assigned school data, review readiness, validate documents, monitor billing preparation, handle settings. | Full write access inside assigned school; may manage users/settings if enabled. | Needs confidence that data is current, scoped, and audit-ready. |
| Coordinator | Operate daily compliance workflow across one or more schools. | Create/import batches, track lifecycle, chase missing evidence, verify documents, export readiness, coordinate trainers. | Full compliance workflow write access inside assigned tenants. | Manual follow-ups, unclear blockers, scattered documents, deadline pressure. |
| Trainer | Submit class progress and evidence for assigned batches. | Mark attendance/progress, upload training evidence, maintain LAMR inputs, review assigned roster. | Assigned batches/classes only; trainer-side writes only. | Must not navigate compliance-heavy screens to perform daily tasks. |
| Viewer | Review batch readiness without changing records. | Inspect status, documents, LAMR summaries, and activity history for assigned schools. | Read-only assigned-scope access. | Needs clarity that records are internal working copies, not official TESDA approvals. |
| Super Administrator | Manage system-level tenants, roles, and global configuration. | Platform governance, tenant creation, emergency access, audit review. | Not implemented. Recommended future role with tightly logged elevated privileges. | Current schema has no `super_admin` role, creating a governance gap for multi-tenant operations. |
| External Stakeholder | Review evidence or readiness when explicitly granted. | Audit/review selected evidence. | Viewer-equivalent scoped read-only access. | Needs limited, understandable evidence views without internal system jargon. |
| System Maintainer | Keep application reliable, secure, and deployable. | Maintain code, schema, RLS, backups, monitoring, tests, and documentation. | Infrastructure/admin access outside application RBAC. | Needs traceability, non-ambiguous requirements, and clear migration boundaries. |

## 4. User Personas

### Persona 1: Compliance Coordinator

- Demographics: TVI operations staff, works daily with batch records, trainers, documents, and deadlines.
- Technical proficiency: Moderate. Comfortable with spreadsheets and web systems, not database terminology.
- Goals: Know which batch needs action, resolve missing documents, prepare readiness exports, avoid billing delays.
- Frustrations: Manual spreadsheets, vague deadline labels, file links scattered across tools, repeated trainer follow-up.
- Typical workflow: Sign in -> select school -> scan dashboard -> open urgent batch -> review missing docs -> attach/verify evidence -> export readiness -> log follow-up.

### Persona 2: School Admin

- Demographics: School compliance or operations leader.
- Technical proficiency: Moderate to high.
- Goals: Maintain governance, monitor coordinator progress, review audit readiness, control access.
- Frustrations: Lack of confidence in current status, unclear ownership, overexposed sensitive data.
- Typical workflow: Sign in -> review assigned school metrics -> inspect high-risk batches -> check activity log -> update settings or member access -> approve internal readiness.

### Persona 3: Trainer

- Demographics: Instructor responsible for training delivery and attendance/progress evidence.
- Technical proficiency: Low to moderate; may use mobile or low-bandwidth devices.
- Goals: Quickly mark attendance/progress and upload evidence for assigned classes.
- Frustrations: Compliance terminology, too many unrelated fields, not knowing whether an upload succeeded.
- Typical workflow: Sign in -> open My Classes -> select assigned batch -> mark attendance/progress -> upload trainer document -> update LAMR -> review task completion.

### Persona 4: Read-Only Reviewer

- Demographics: Internal auditor, external reviewer, or TESDA-facing preparation reviewer.
- Technical proficiency: Varies.
- Goals: Verify evidence completeness and activity history without editing records.
- Frustrations: UI implying official approval, unclear source dates, hidden or technical file metadata.
- Typical workflow: Sign in -> open assigned school -> review dashboard/documents -> inspect batch evidence -> export only if granted in a future policy.

### Persona 5: System Maintainer

- Demographics: Developer or technical owner.
- Technical proficiency: High.
- Goals: Maintain secure tenant scoping, deploy reliably, evolve schema/API/UI without regressions.
- Frustrations: Conflicting docs, implementation placeholders, missing tests, and incomplete Figma-to-route coverage.
- Typical workflow: Review master PRD -> implement route/schema/API -> write tests -> verify RLS -> update changelog and traceability.

## 5. Functional Requirements

Priority values: Must Have, Should Have, Could Have, Won't Have.

### FR-01 Authentication and Protected Access

Purpose: Ensure only authenticated users can access application routes and role-scoped data.

Business rules:

- Public routes are limited to sign-in and sign-up.
- All dashboard, trainer, API, and data routes require Clerk authentication.
- Clerk user ID must map to an active profile before scoped data is returned.

User stories:

- As an Admin, I want secure sign-in so that school compliance data is protected.
- As a Coordinator, I want only assigned school records shown so that I do not accidentally work in the wrong tenant.
- As a Viewer, I want read-only access so that I can review evidence without changing it.

Acceptance criteria:

- Given an unauthenticated user, when they open a protected route, then they are redirected to `/sign-in`.
- Given an authenticated user without an active profile, when they request app data, then the system returns an access setup or permission error state.
- Given a user with a profile, when they open the app, then data is scoped to assigned schools and role.

Inputs: Clerk session, Clerk user ID, profile record, tenant memberships, role.

Outputs: Authenticated route shell, signed-in user controls, permission-scoped data responses.

Validation rules:

- Clerk user ID is required and unique in profiles.
- Profile must be active.
- Role must be one of Admin, Coordinator, Trainer, Viewer.

Error states:

- Signed out.
- Profile not found.
- Inactive profile.
- Tenant membership missing.
- Permission denied.

Edge cases:

- User belongs to multiple tenants.
- Clerk account exists before app profile provisioning.
- Session expires during import/upload.

Dependencies: Clerk, `profiles`, `profile_tenant_memberships`, RLS helper functions, route proxy/middleware.

Priority: Must Have.

### FR-02 Tenant and Role-Based Access Control

Purpose: Prevent cross-school data access and enforce role boundaries.

Business rules:

- Admin has full write access inside one assigned school.
- Coordinator may operate across one or more assigned schools.
- Trainer can access assigned batches/classes only.
- Viewer is read-only for assigned schools.
- Super Admin is not implemented and must not be assumed in production behavior.

User stories:

- As a Coordinator, I want to switch between assigned schools so that I can manage multiple schools without seeing unassigned tenants.
- As a Trainer, I want to see only my classes so that the app stays focused and private.

Acceptance criteria:

- Given an Admin assigned to AKB, when they request J3ED batches, then the request is denied.
- Given a Trainer assigned to BAT-1, when they request BAT-2, then the request is denied.
- Given a Viewer, when they attempt create/edit/delete/import/upload, then the action is unavailable and server-side denied.

Inputs: Role, tenant membership, assigned batch, route/action.

Outputs: Allowed UI controls, denied UI states, server-side authorization decisions.

Validation rules:

- Tenant-owned records require `tenant_id`.
- Trainer writes require batch assignment and trainer-scoped document audience.
- Viewer writes are always blocked.

Error states: 403 permission denied, hidden action, stale membership, role mismatch.

Edge cases: Role changed mid-session, user loses tenant membership, imported rows target mixed tenants.

Dependencies: Clerk, Supabase RLS, future API policies, `profile_tenant_memberships`, `batches.trainer_profile_id`.

Priority: Must Have.

### FR-03 Dashboard and Batch Overview

Purpose: Provide role-specific operational visibility into assigned batches and compliance status.

Business rules:

- Coordinator/Admin/Viewer dashboards show assigned-school batch status.
- Trainer dashboard shows assigned classes and training-side tasks only.
- Most urgent batches appear first.
- Dashboard must use exact source dates plus computed relative labels.

User stories:

- As a Coordinator, I want all active batches summarized so that I can identify the next compliance action.
- As a Viewer, I want a read-only dashboard so that I can inspect readiness without changing data.

Acceptance criteria:

- Given assigned batches, when the dashboard loads, then it shows lifecycle, program, qualification, learner count, progress, and document readiness.
- Given no assigned batches, when the dashboard loads, then it shows an empty state with the next administrative action.
- Given stale data, when dashboard values include relative deadlines, then an exact "data as of" timestamp is shown.

Inputs: Batch summaries, document readiness, progress, deadline dates, current as-of timestamp.

Outputs: Metrics, alerts/banners, batch list, urgency ordering, readiness summary.

Validation rules:

- Progress is 0-100.
- Learner counts cannot be negative.
- Relative dates must be computed, not hand-authored.

Error states: Loading, empty, no results, sync failed, permission denied, stale data.

Edge cases: Long school names, no active batches, impossible document counts, completed billing without assessment.

Dependencies: `batches`, `documents`, `program_document_requirements`, activity log, route shell.

Priority: Must Have.

### FR-04 Batch Lifecycle Tracking

Purpose: Track internal training batch progression from AOU through Billing.

Business rules:

- Lifecycle is internal tracking only.
- Canonical MVP stages: AOU, NTP, TIP, Training, Assessment, Billing.
- Database also supports Completed and Blocked.
- Stages must not imply official TESDA submission or approval.

User stories:

- As a Coordinator, I want to update a batch lifecycle stage so that the team knows where the batch stands.
- As an Admin, I want blocked batches flagged so that I can intervene.

Acceptance criteria:

- Given a batch in Training, when Assessment is scheduled, then the lifecycle can move to Assessment and activity is logged.
- Given Billing is marked ready before Assessment, when validation runs, then the system flags an impossible state.
- Given a Viewer opens lifecycle, then lifecycle is visible but not editable.

Inputs: Batch code, program, qualification, trainer, learner count, start/end dates, current stage, status.

Outputs: Lifecycle pipeline, status badge, activity log event, validation warning.

Validation rules:

- Batch code unique per tenant.
- Current stage must be an allowed lifecycle enum.
- Stage transitions must preserve audit history.

Error states: Invalid transition, missing required dates, permission denied, save failed.

Edge cases: Batch blocked, completed, delayed, missing NTP date, no trainer assigned.

Dependencies: `batches`, activity log, role policy.

Priority: Must Have.

### FR-05 Deadline, Progress, and Urgency Engine

Purpose: Compute progress, deadline countdown, NTP lag, and urgency without manual data entry.

Business rules:

- Training progress is computed from training days elapsed versus total duration or stored validated progress.
- Deadline urgency tiers: Critical less than 7 days, Warning 7-21 days, On Track more than 21 days.
- PDF mentions 30-day visual distinction; current design uses 7/21-day semantic tiers.
- NTP-to-start lag over the configured threshold must be flagged.

User stories:

- As a Coordinator, I want deadlines sorted by urgency so that I handle the riskiest batch first.
- As an Admin, I want NTP lag flagged so that delays are visible.

Acceptance criteria:

- Given a billing deadline, when the dashboard renders, then days remaining is computed from the exact as-of date.
- Given days remaining is 6, when urgency displays, then the badge and text say Critical.
- Given NTP-to-start lag exceeds threshold, when the batch is shown, then a warning flag is displayed.

Inputs: NTP date, training start/end dates, schedule, billing deadline, as-of timestamp.

Outputs: Progress percent, day count, urgency tier, NTP lag, sorted batch order.

Validation rules:

- Date fields must be valid dates.
- As-of timestamp must be captured for audit.
- Computed values must not contradict source dates.

Error states: Missing dates, invalid date order, stale calculation, timezone mismatch.

Edge cases: 6-day versus 7-day threshold, completed training, non-standard training schedule, leap dates, manual corrections.

Dependencies: Batch date fields, program rules, UI status components.

Priority: Must Have.

### FR-06 Document Checklist and Evidence Management

Purpose: Track required documents, evidence links/uploads, verification status, and exact blockers.

Business rules:

- Required documents are configurable by scholarship program.
- Evidence may be uploaded to Supabase Storage or linked externally.
- Statuses: Missing, Pending, Submitted, Verified.
- UI must show exact missing document names and avoid raw storage/table terminology.
- Trainer can only submit training-side evidence for assigned batches.

User stories:

- As a Coordinator, I want missing documents named so that I know what to request.
- As a Trainer, I want to upload training evidence for my class so that the coordinator can review it.
- As a Viewer, I want to inspect evidence without being able to alter it.

Acceptance criteria:

- Given required documents for a program, when a batch has missing evidence, then the batch shows missing document names and blocker count.
- Given a valid file upload, when it completes, then the document status becomes Submitted and an activity event is recorded.
- Given a Viewer opens Documents, when they inspect evidence, then attach/verify/delete controls are hidden and server-denied.

Inputs: Program document requirements, file, external URL, status, audience, notes.

Outputs: Document matrix, evidence metadata, signed/scoped file access, activity log event.

Validation rules:

- Document key is required.
- File size must respect storage bucket limit.
- URL must be valid if external evidence is used.
- Verification requires Admin or Coordinator.

Error states: Upload failed, virus scan pending if added, file missing, invalid type, rejected evidence, permission denied.

Edge cases: Duplicate documents, version changes, missing source file, required document no longer applies, document count exceeds requirement count.

Dependencies: `program_document_requirements`, `documents`, Supabase Storage bucket `compliance-evidence`, RLS.

Priority: Must Have.

### FR-07 Trainer Classes, Attendance, and Progress

Purpose: Let trainers update daily training evidence without seeing billing/financial details.

Business rules:

- Trainer sees assigned classes only.
- Trainer can view roster, mark attendance/progress, upload trainer-side evidence, and maintain LAMR where allowed.
- Trainer API/UI responses must hide billing deadline, BSRS, NTP lag, billing preparation, and financial document fields unless explicitly reapproved.

User stories:

- As a Trainer, I want a focused My Classes view so that I can complete daily updates quickly.
- As a Coordinator, I want trainer updates visible in compliance records so that I can review readiness.

Acceptance criteria:

- Given a Trainer assigned to one batch, when they open `/trainer/classes`, then only that batch appears.
- Given a Trainer submits attendance, when the batch assignment is valid, then attendance/progress is saved and logged.
- Given the Trainer is not assigned, when they open a batch URL directly, then the system returns permission denied.

Inputs: Assigned batch, roster, attendance/progress values, evidence file or link.

Outputs: Updated class progress, trainer evidence, activity log entry, coordinator review status.

Validation rules:

- Trainer batch assignment is required.
- Attendance dates must fall within training schedule.
- Progress cannot exceed 100%.

Error states: Permission denied, roster unavailable, save failed, duplicate attendance day, offline/stale state.

Edge cases: Substitute trainer, multiple assigned classes, class canceled, learner dropped, mobile upload failure.

Dependencies: `batches.trainer_profile_id`, `learners`, `documents`, activity log. Dedicated attendance/trainer update tables are not yet in the migration and must be added or intentionally modeled.

Priority: Must Have.

### FR-08 LAMR Structured Evidence

Purpose: Store LAMR as structured training evidence, not only as a file upload.

Business rules:

- LAMR must capture header, schedule, learners, learning outcomes, activities, completion marks, assessment results, prepared-by, approved-by, and source file.
- LAMR supports blended/asynchronous evidence.
- LAMR is tied to tenant and batch.

User stories:

- As a Trainer, I want to maintain LAMR rows so that class achievement evidence is complete.
- As a Coordinator, I want structured LAMR data so that I can validate blended learning evidence.

Acceptance criteria:

- Given a batch, when LAMR is created, then it stores header fields and source document reference.
- Given learning outcomes and activities, when learner entries are recorded, then each learner/activity pair is unique.
- Given a LAMR source upload, when it is attached, then it is linked to the structured LAMR record.

Inputs: TVI name, program title, batch section, module title, schedule text, outcomes, activities, learner results, source file.

Outputs: LAMR summary, learner activity matrix, assessment results, linked source evidence.

Validation rules:

- Batch and tenant are required.
- Module title and program title are required.
- Learner/activity entries must be unique.
- Assessment result must be Competent, Not Yet Competent, or Pending.

Error states: Missing learner, duplicate activity entry, invalid assessment result, source upload failed.

Edge cases: Multiple modules per batch, changed outcomes, learner transfer/dropout, partially complete LAMR.

Dependencies: `lamr_reports`, `lamr_outcomes`, `lamr_activities`, `lamr_entries`, `learners`, `documents`.

Priority: Must Have.

### FR-09 Billing Engine & Readiness (revised by ADR-001)

> **Superseded scope:** ADR-001 (`docs/adr/ADR-001-billing-and-domain-model.md`,
> 2026-06-30) promotes billing from a passive "preparation signal" to a
> **document-generating engine**. The readiness signal below is retained as the
> *trigger*; the generation behavior is the new core. Where this section and
> ADR-001 conflict, **ADR-001 wins** (see Source Register precedence note).

Purpose: Surface billing readiness to Admin/Coordinator and **generate the
official TVI-billed TESDA billing documents** (TSF/Allowance, Training Cost,
Entrepreneurship) from attendance-derived eligibility.

Business rules:

- **Readiness (trigger):** computed per billing type at TESDA thresholds —
  TSF 20/50/80% (rules 7.2.2/7.2.3), Training Cost 50%/end (rules 5.1.x, 60-
  *training*-day boundary); partial-billing toggle + thresholds configurable
  (tenant override → program default). Readiness fires only when the threshold is
  reached **and** the tranche's supporting documents are verified.
- **Eligibility:** a scholar with **≥ 5 absences** is excluded from TSF billing.
- **Generation (V2):** populate the school's `.docx` template (per-school header,
  tenant signatories, addressee); scholar rows alphabetized + numbered; total in
  words. Assessment Fee is **out of scope** (billed by the Assessment Center).
- **Amounts** derive from the **batch's snapshotted cost row** (Schedule of Cost,
  Circular 015 s.2026): TSF = `days × ₱160` (entrepreneurship-done −₱480), New
  Normal ₱1,000, etc. The final TSF tranche nets `absences × ₱160` (both
  schedules).
- Visible only to Admin/Coordinator; **entirely hidden from Trainers**.
- Each generation appends a versioned `billing_records` snapshot; no envelope
  ledger (the TESDA PO reconciles).

User stories:

- As a Coordinator, I want the app to generate a regulation-correct billing
  document for eligible scholars so that I submit accurate billings without manual
  computation.
- As a Trainer, I do not want billing details so that my view remains focused.

Acceptance criteria:

- Given a batch reaches a billing threshold **and** its tranche docs are verified,
  when an Admin/Coordinator views it, then the billing-ready alert appears and the
  document can be generated.
- Given an eligible cohort, when a billing document is generated, then amounts
  match the TESDA rules (worked CFSP example = ₱137,000) and the school template
  format.
- Given the same batch viewed by a Trainer, then no billing data or alert is shown.
- Given attendance is corrected after generation, when re-generated, then a new
  `billing_records` version is appended (prior retained).

Inputs: Snapshotted cost row, attendance/eligibility, RQM `approved_slots`,
per-program thresholds, tenant settings, role.

Outputs: Generated `.docx` billing document, billing-ready alert, blocker summary,
`billing_records` snapshot, activity log.

Validation rules:

- Threshold must be 0-100; billed pax ≤ `approved_slots`.
- Supporting-document status must be Verified before generation.

Error states: Missing cost-schedule match, missing tenant signatories, unverified
tranche docs, permission denied.

Dependencies: `scholarship_cost_schedule`, `attendance_records`,
`program_billing_rules` (+ tenant overrides), `billing_records`, `tenant_settings`,
batch RQM fields, documents.

Priority: Must Have.

### FR-10 CSV Import and Export

Purpose: Capture and share batch/readiness data while respecting tenant and role scope.

Business rules:

- Admin/Coordinator can import CSV data.
- Export includes current filtered batch/document readiness data.
- Imports are internal working data only and do not update official systems.
- T2MIS/BSRS import overlay is present in Figma and should use a validation/preview flow.

User stories:

- As a Coordinator, I want to import batch data from CSV so that setup is faster.
- As an Admin, I want to preview import errors before committing records so that bad data is not saved.
- As a Coordinator, I want to export filtered readiness data so that I can share internal status.

Acceptance criteria:

- Given a wrong file type, when selected, then the import flow shows an inline validation error.
- Given malformed headers or duplicate batch IDs, when parsed, then rows are blocked until corrected.
- Given a valid preview, when confirmed, then records are created or updated inside the selected tenant only.
- Given filtered batch data, when exported, then CSV only includes records allowed for the user's role and tenant.

Inputs: CSV file, selected tenant, program mapping, import type, filters.

Outputs: Validation report, preview table, import result, exported CSV.

Validation rules:

- Required columns must be present.
- Duplicate batch codes within tenant must be handled by explicit upsert rules.
- Import cannot mix unauthorized tenants.
- Row-level errors must identify field and correction.

Error states: Invalid type, oversized file, malformed CSV, duplicate rows, partial failure, permission denied, network failure.

Edge cases: Re-running same import, mixed encodings, empty file, large file, T2MIS/BSRS-specific columns.

Dependencies: Batches, learners, documents, activity log, storage if importing evidence references. Planned API/service required.

Priority: Should Have.

### FR-11 Analytics

Purpose: Provide operational charts and summaries for training progress, document readiness, deadlines, NTP lag, scholars, and alerts.

Business rules:

- Analytics must be action-oriented, not decorative.
- Chart color must follow semantic token rules and include text/legend meaning.
- Advanced analytics charts are listed as later in README, but Figma includes analytics screens. For MVP, implement core summaries first.

User stories:

- As a Coordinator, I want progress and document readiness charts so that I can prioritize batches.
- As an Admin, I want NTP lag visibility so that I can investigate delays.

Acceptance criteria:

- Given analytics data, when rendered, then charts include explicit units and accessible summaries.
- Given no analytics data, when the page loads, then an empty state explains why.
- Given thresholds, when a chart value breaches one, then the chart indicates the threshold with text and not color alone.

Inputs: Batch progress, document completeness, learner counts, NTP lag, deadline days, alerts.

Outputs: Progress chart, elapsed/remaining chart, document readiness chart, NTP lag chart, summary metrics.

Validation rules:

- Percentages require denominators.
- Chart data must be derived from source records.
- Alert counts must use clear units and timeframe.

Error states: No data, loading, query failed, partial data, stale data.

Edge cases: One batch only, all batches completed, missing dates, zero learners.

Dependencies: Batches, documents, activity log, analytics service, chart components.

Priority: Should Have for core summaries; Could Have for advanced charts.

### FR-12 Activity Log and Audit Trail

Purpose: Preserve traceable user and system actions.

Business rules:

- Key create/update/upload/verify/submit/delete/system events must be logged.
- Events include tenant, batch when applicable, profile, action, entity type, entity ID, summary, metadata, timestamp.
- Audit-history surfaces must use exact dates, not ambiguous relative-only labels.

User stories:

- As an Admin, I want to see who changed compliance records so that I can audit readiness.
- As a Viewer, I want activity history read-only so that evidence status is traceable.

Acceptance criteria:

- Given a document is verified, when save succeeds, then activity log records user, tenant, entity, action, summary, and timestamp.
- Given a Viewer opens activity history, when allowed, then entries display exact dates and no edit controls.
- Given activity query fails, when the page loads, then an error state offers retry.

Inputs: Action, entity type, entity ID, user/profile, tenant, metadata.

Outputs: Activity log list, audit trail, export if allowed.

Validation rules:

- Summary is required.
- Tenant is required.
- Action must be allowed enum.

Error states: Empty log, permission denied, load failed, stale relative timestamp.

Edge cases: System-generated event, deleted entity reference, long event text, bulk import events.

Dependencies: `activity_log`, RLS, all write workflows.

Priority: Should Have, with core security events Must Have.

### FR-13 Notifications Drawer

Purpose: Surface operational alerts and subscription controls without leaving the current screen.

Business rules:

- Notifications are scoped to role and tenant.
- Current MVP does not include email automation; in-app notification UI may be implemented before external delivery.
- Drawer must be accessible as a modal surface.

User stories:

- As a Coordinator, I want recent alerts visible in context so that I can act on blockers.
- As an Admin, I want alert settings visible so that notification behavior is clear.

Acceptance criteria:

- Given notifications drawer opens, when keyboard focus enters, then background is inert and Escape closes the drawer.
- Given unread alerts, when the notification icon renders, then its accessible name includes unread count.
- Given alert subscriptions auto-save, when toggled, then a Saving/Saved state is announced.

Inputs: Alert items, unread count, subscription settings.

Outputs: Drawer list, alert status, settings toggles, mark-all-read action.

Validation rules:

- Alert text must include category, target batch, timestamp, and status.
- Icon-only controls require accessible names.

Error states: Empty alerts, load failed, permission denied, save failed.

Edge cases: Many alerts, duplicate alerts, long names, stale alerts.

Dependencies: Future `alerts_log` or activity-based alert service, modal system.

Priority: Could Have for MVP; Should Have after core activity log.

### FR-14 Settings, Roles, and Program/RQM Configuration

Purpose: Manage members, roles, deadline rules, program requirements, and tenant safety.

Business rules:

- Admin initially manages settings inside assigned tenant.
- Super Admin/platform settings are not implemented.
- Program requirements and billing rules must be configurable records.
- RQM is referenced in route docs but not implemented in schema.

User stories:

- As an Admin, I want to review role permissions so that access remains appropriate.
- As a Coordinator, I want program requirements configured so that document readiness reflects the correct scholarship rules.

Acceptance criteria:

- Given a settings modal opens, when permissions are shown, then check/cross indicators include text equivalents.
- Given a role change is attempted, when saved, then confirmation or undo is required and activity is logged.
- Given program document requirements change, when saved, then document readiness recalculates.

Inputs: Tenant, members, roles, program rules, document requirements, billing threshold.

Outputs: Settings modal/page, role matrix, program requirement list, audit event.

Validation rules:

- Role must be valid.
- Threshold must be 0-100.
- Program codes must be unique.

Error states: Read-only settings, invalid role, save failed, permission denied.

Edge cases: Last Admin removed, role changed while user is signed in, requirements edited after documents exist.

Dependencies: Profiles, memberships, scholarship programs, program document requirements, billing rules, future RQM model.

Priority: Should Have for role review; Could Have for editable program/RQM management in MVP unless required operationally.

### FR-15 Reports

Purpose: Provide reporting surfaces for trainee outcomes and compliance summaries.

Business rules:

- Live Figma includes a Coordinator Report screen with EGACE/Employment-style tabs and summary metrics.
- Current route map and app implementation do not include a report route.
- Reports must be internal unless official TESDA report generation is explicitly added later.

User stories:

- As a Coordinator, I want summary reports so that I can prepare internal reviews.
- As an Admin, I want outcome metrics so that I can monitor completion and certification progress.

Acceptance criteria:

- Given report data exists, when Coordinator opens Reports, then enrolled, graduate, assessed, certified, and employed summaries display with exact source dates.
- Given export is triggered, when allowed, then only role-scoped data is exported.
- Given report route is not implemented, then navigation must not expose a broken link.

Inputs: Learner outcomes, assessment results, employment fields if added, selected report tab, filters.

Outputs: Report dashboard, export file, blocker alerts.

Validation rules:

- Report metrics require explicit denominator and timeframe.
- Employment/reporting fields need schema support before implementation.

Error states: Missing route, empty report, incomplete data, export failed.

Edge cases: No assessed learners, partial employment data, role not allowed, official report confusion.

Dependencies: Learners, assessment results, future reporting schema/API.

Priority: Could Have until current MVP route/API/schema support is added.

## 6. Screen-by-Screen Specifications

Common requirements for all screens:

- URL routes must not expose raw table names, SQL terms, `tenant_id`, internal IDs, raw payloads, or service-layer language to end users.
- All relative dates must be paired with exact source dates or an exact "data as of" timestamp.
- Loading, empty, no-results, error, permission-denied, stale-data, success, and long-text states must be defined.
- Desktop target is 1440px Figma frames. Tablet and mobile must follow the Responsive page rules.
- Icons must have accessible names when icon-only. Status must never rely on color alone.
- Forms must validate inline and move focus to the first error.
- Modals/drawers require dialog semantics, focus trap, Escape close when non-destructive, inert background, scroll containment, and focus return.

### Screen Inventory

| Screen | Figma node(s) | Route | Entry point | Purpose and visible information | Components and states | Forms and validation | Responsive behavior | Accessibility | Permissions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator Dashboard | `522:2367` | `/dashboard` | Root redirect, Coordinator nav | Coordinator summary of batches, alerts, metrics, readiness, urgent work. | App shell, primary nav, metrics, banners, batch/action summary. States: loading, empty, sync failed, stale data. | Filters if present must compound with AND logic. | Metrics wrap on tablet; cards stack on mobile. | Exact as-of timestamp, status text, keyboard nav. | Coordinator assigned tenants. Implementation route missing. |
| Coordinator Batch Cards | `42:1891` | `/batch-cards` | Coordinator nav | Primary dashboard card view with urgency, lifecycle, progress, documents, trainer, BSRS/readiness. | Primary nav, page head, warning banner, metrics, filters, batch stack, batch card. | Search/filter by program, status, BSRS, text. Validate dates/counts. | Single-column cards; mobile stacks internals. | Batch cards focusable; Enter/Space opens details; progressbar labels. | Coordinator assigned tenants. Current app placeholder. |
| Coordinator Table View | `522:2368` | `/table-view` | Coordinator nav | Dense row view for comparison and export. | Data table, sticky headers, filters, export. States: no results, load/error. | Sort/filter/search; export current filters. | Desktop full table; tablet horizontal scroll; mobile card-list or explicit scroll. | Semantic table, sortable header announcements. | Coordinator assigned tenants. Current app placeholder. |
| Coordinator Documents | `522:2369` | `/documents` | Coordinator nav, blocker links | Matrix/list of required evidence, exact missing blockers, attach/open/verify actions. | Document matrix, blocker strip, document status cells, upload/link actions. | Upload/link validation, status transitions. | Desktop matrix; tablet scroll; mobile batch-grouped cards. | Cell status uses text plus icon; file input keyboard-operable. | Coordinator can attach/verify assigned tenant records. Current app placeholder. |
| Coordinator Analytics | `12:1719` | `/analytics` | Coordinator nav | Operational charts for progress, deadlines, document compliance, NTP lag, alerts. | Chart cards, filters, critical banner, metrics. | Filter validation. | 1-2 columns desktop; single column mobile. | Chart summaries and legends with units. | Coordinator assigned tenants. Current app placeholder. |
| Coordinator Report | `465:2970` | Proposed `/reports` | Coordinator nav or analytics/report tab | Internal reporting for outcome summaries such as enrolled, graduate, assessed, certified, employed. | Segmented tabs, summary cards, alert banner, export. | Report filters and export validation. | Summary cards wrap; mobile stacked. | Units/denominators required. | Coordinator. Route not implemented and not in route map. |
| Coordinator Activity Log | `522:2370`, archive variants `1:946`, `1:1283` | `/activity-log` | Coordinator nav | Audit trail of user/system events. | Activity list, export, filters, exact timestamps. | Optional export/filter validation. | List stacks; metadata wraps safely. | Exact dates, readable event summaries. | Coordinator, Admin; Viewer hidden unless granted. Current app placeholder imports empty TODO data. |
| Coordinator Batch Modal Open | `165:1750` | `/batch-cards?batchId=:batchId` initially | Batch card activation | Detailed batch review without leaving cards. | Modal backdrop, modal sheet, sticky topbar, hero band, properties, progress, lifecycle, entrepreneurship, billing countdown, scholars, remarks, footer. | Edit/attach controls validate by role. | Desktop centered/wide modal; mobile full-screen sheet. | Dialog semantics, focus trap, focus return. | Admin/Coordinator write; Viewer read-only; Trainer hidden. |
| Admin Dashboard | `382:3` | `/dashboard` role variant | Admin nav | School-level oversight, metrics, urgent alerts, settings access. | App shell, primary nav, admin controls, notifications/settings. | Settings/member actions validate. | Same as Coordinator. | Privilege indicators must be explicit. | Admin assigned school. Route missing. |
| Admin Batch Cards | `382:567` | `/batch-cards` role variant | Admin nav | Same as Coordinator with admin privileges and access-control controls. | Batch cards, notification icon, admin controls. | Same as Coordinator plus role/settings controls. | Same as Coordinator. | Same plus icon labels. | Admin assigned school. Current app placeholder. |
| Admin Table View | `382:1048` | `/table-view` role variant | Admin nav | Admin row comparison. | Data table, filters, export. | Same as Coordinator. | Same as Coordinator. | Semantic table. | Admin assigned school. Current app placeholder. |
| Admin Documents | `382:1220` | `/documents` role variant | Admin nav | Evidence oversight and verification. | Document matrix/list. | Attach/verify/delete if allowed. | Same as Coordinator. | Status text/icons. | Admin assigned school. Current app placeholder. |
| Admin Analytics | `382:1500` | `/analytics` role variant | Admin nav | Admin analytics and risk visibility. | Chart cards, metrics, critical banner. | Filter validation. | Same as Coordinator. | Chart summaries. | Admin assigned school. Current app placeholder. |
| Admin Activity Log | `382:1761` | `/activity-log` role variant | Admin nav | Audit history. | Activity list/export. | Export validation. | Same as Coordinator. | Exact timestamps. | Admin assigned school. Current app placeholder. |
| Viewer Dashboard | `394:723` | `/dashboard` role variant | Viewer nav | Read-only batch readiness and evidence summary. | App shell, readonly banners, metrics. | No write forms. | Same as Coordinator. | Read-only clearly announced. | Viewer assigned schools. Route missing. |
| Viewer Batch Cards | `394:1287` | `/batch-cards` role variant | Viewer nav | Read-only card view. | Batch cards without write controls. | No write forms. | Same as Coordinator. | Buttons that open details still keyboard operable. | Viewer read-only. Current app placeholder. |
| Viewer Table View | `394:1768` | `/table-view` role variant | Viewer nav | Read-only table comparison. | Table, filters. | Filters only. Export only if later granted. | Same table responsive rules. | Semantic table. | Viewer read-only. Current app placeholder. |
| Viewer Documents | `394:1940` | `/documents` role variant | Viewer nav | Evidence review without mutation. | Document matrix/list, open-only actions. | No attach/verify/delete. | Mobile grouped evidence cards. | File links descriptive. | Viewer read-only. Current app placeholder. |
| Viewer Analytics | `394:2220` | `/analytics` role variant | Viewer nav | Read-only analytics. | Charts and metrics. | Filters only. | Same as Coordinator. | Chart summaries. | Viewer read-only. Current app placeholder. |
| Trainer Dashboard | `435:2914`, `582:2139` | `/trainer` | Trainer nav after sign-in | Trainer task dashboard and roll-up of assigned classes. | Trainer shell, class summary, tasks, progress, upload prompts. | No billing/compliance write forms. | Mobile-first usable, stacked tasks. | Clear task labels, large touch targets. | Trainer assigned batches only. Current app placeholder. |
| Trainer My Classes | `624:2139` | `/trainer/classes` | Trainer nav | List of assigned batches/classes. | Class cards, roster preview, training-side actions, document list. | Class selection and filters. | Cards stack, primary actions visible. | Action buttons named and 44px touch targets. | Trainer assigned batches only. Current app placeholder. |
| Trainer Attendance Flow | Route-map frame `363:1972`; app route exists | `/trainer/classes/[batchId]/attendance` | My Classes action | Mark attendance/progress for assigned class. | Roster table/list, date picker, attendance/progress controls, save. | Date within schedule, valid learner rows, no unauthorized batch. | Mobile row cards or compact list. | Form labels, inline errors, live save status. | Trainer assigned batch only. Current app placeholder. |
| Trainer Document Upload | Route-map frame `363:2007`; app route exists | `/trainer/classes/[batchId]/documents` | My Classes action | Upload/link trainer-side evidence. | File dropzone, document keys, upload status. | Type/size/source validation, trainer document audience. | Full-width mobile upload, sticky footer. | Keyboard file picker, progress live region. | Trainer assigned batch only. Current app placeholder. |
| Batch Detail Drawer Modal | `49:2146` | State on current route; optional `/batches/[batchId]` | Card/table/document row | Quick batch inspection. | Drawer shell, summary, lifecycle, docs, snapshots, remarks. | Attach/open/verify by role. | Right drawer desktop, full-screen mobile. | Dialog semantics, sticky header/footer. | Role-scoped. |
| Notifications Drawer Modal | `29:1805` | Drawer state | Bell icon | Recent alerts and subscriptions. | Drawer, alert list, subscription controls, mark all read. | Toggle save/validation. | Right drawer desktop, full-screen mobile. | Accessible icon name with unread count, focus trap. | All signed-in roles with scoped alerts. |
| Import CSV Modal | `47:1974` | Modal state on `/batch-cards` or future `/import` | Import action | Import batch CSV. | Modal, dropzone, expected columns, preview, footer. | File type, headers, row errors, duplicate batch IDs. | Center modal desktop, full-screen/bottom sheet mobile. | Keyboard-operable upload, inline errors. | Admin/Coordinator. |
| Settings Modal | `48:2060` | `/settings` or modal state | Settings icon/nav | Tenant roles, members, deadline rules, safety summary. | Modal, role matrix, members, rules. | Role/rule validation, confirmation/undo. | Center modal desktop, full-screen mobile. | Text equivalents for check/cross icons. | Admin initially. |
| Batch Card Click - Notion Record Modal | `158:383` | `/batch-cards?batchId=:batchId` | Batch card click | Detailed record-style modal. | Notion-style property rows, progress, lifecycle, billing, scholars, remarks. | Same as batch detail. | Desktop modal, mobile full-screen. | Dialog requirements. | Role-scoped. |
| Import CSV Modal - New T2MIS / BSRS | `235:2` | Modal state; future dedicated import flow | Import action | Import T2MIS/BSRS-specific data. | Modal, import type fields, validation, preview. | T2MIS/BSRS columns, row mapping, tenant check. | Same as CSV modal. | Same as CSV modal. | Admin/Coordinator. Missing schema/API detail. |

## 7. Information Architecture

### Site Map

```text
/
  -> /dashboard

/sign-in
/sign-up

/dashboard
/batch-cards
  ?batchId=:batchId
/table-view
/documents
/analytics
/activity-log
/reports                 (required by Figma, not implemented)
/settings                (planned/modal first)
/settings/programs       (planned for program/RQM setup)
/batches/[batchId]/lamr  (required by PRD, no dedicated Figma frame)

/trainer
/trainer/classes
/trainer/classes/[batchId]/attendance
/trainer/classes/[batchId]/documents
```

### Navigation Hierarchy

| Role | Primary navigation |
| --- | --- |
| Admin | Dashboard, Batch Cards, Table View, Documents, Analytics, Activity Log, Settings. Reports if implemented. |
| Coordinator | Dashboard, Batch Cards, Table View, Documents, Analytics, Activity Log, Reports. |
| Trainer | Dashboard, My Classes. Attendance/Documents entered from class actions. |
| Viewer | Dashboard, Batch Cards, Table View, Documents, Analytics. Activity Log hidden unless explicitly granted. |
| Super Admin | Not implemented. Future: tenants, users, programs, platform settings, audit. |

### Core User Flows

Coordinator batch compliance:

1. Sign in.
2. Select assigned school if more than one.
3. Review dashboard and urgent blockers.
4. Open batch card or table row.
5. Review lifecycle, document checklist, and missing evidence.
6. Attach/link or verify evidence.
7. Review LAMR and trainer updates.
8. Export readiness or report when needed.

Trainer daily class:

1. Sign in.
2. Open Trainer Dashboard.
3. Select assigned class.
4. Mark attendance/progress.
5. Upload trainer-side evidence.
6. Update LAMR records.
7. Confirm save/success state.

Viewer audit review:

1. Sign in.
2. Open assigned school dashboard.
3. Review cards/table/documents/analytics.
4. Open batch detail read-only.
5. Inspect activity/evidence if granted.
6. Exit without mutation.

Import flow:

1. Open Import CSV.
2. Select import type and file.
3. Validate file type, headers, rows, tenant, program, duplicates.
4. Preview rows and warnings.
5. Confirm import.
6. Show success/partial failure and log activity.

### Entry and Exit Points

Entry points:

- Root redirect to `/dashboard`.
- Direct route links to protected screens.
- Batch card/table/document row into modal/detail.
- Notifications/settings/import actions from app shell.

Exit points:

- Sign out through Clerk.
- Close modal/drawer with focus returned to opener.
- Export CSV/report download.
- Permission denied returns to safe role landing route.

### Cross-Module Interactions

- Batch lifecycle affects document requirements, billing preparation, analytics, and activity log.
- Document status affects batch readiness, dashboards, reports, analytics, and blockers.
- Trainer updates feed progress, evidence, LAMR, and activity log.
- Program rules affect document checklist, billing threshold, import validation, and readiness.
- Tenant memberships affect every data query, route, and UI action.

## 8. Role-Based Access Control

### Permission Matrix

| Capability | Super Admin | Admin | Coordinator | Trainer | Viewer |
| --- | --- | --- | --- | --- | --- |
| View assigned dashboard | Future | Yes | Yes | Trainer-only | Yes |
| View all tenants | Future only | No | No | No | No |
| View assigned school batches | Future | Yes | Yes | Assigned only | Yes |
| Create batch | Future | Yes | Yes | No | No |
| Edit batch lifecycle | Future | Yes | Yes | No | No |
| Delete batch | Future | Yes, tenant-scoped | Yes, tenant-scoped if granted | No | No |
| View learners | Future | Yes | Yes | Assigned class only | Yes if granted |
| Create/edit learners | Future | Yes | Yes | No, except attendance/progress if modeled | No |
| View documents | Future | Yes | Yes | Trainer/all audience for assigned batch | Yes |
| Attach trainer evidence | Future | Yes | Yes | Yes, assigned batch and trainer audience | No |
| Verify documents | Future | Yes | Yes | No | No |
| Delete documents | Future | Yes | Yes if granted | No | No |
| View LAMR | Future | Yes | Yes | Assigned batch | Yes if granted |
| Edit LAMR | Future | Yes | Yes | Assigned batch | No |
| View billing preparation | Future | Yes | Yes | No | Yes only if policy allows read-only billing summary; default hide sensitive fields |
| Import CSV | Future | Yes | Yes | No | No |
| Export CSV/report | Future | Yes | Yes | No | No by default |
| View activity log | Future | Yes | Yes | Own/class events if later added | Hidden unless granted |
| Manage settings | Future | Yes, tenant-scoped | Limited program settings if granted | No | No |
| Manage users | Future | Yes, tenant-scoped if implemented | No by default | No | No |

### RBAC Inconsistencies

- Super Admin is requested by prompt but absent from schema enums.
- Trainer assignment is modeled through `batches.trainer_profile_id`; earlier docs mention `assigned_batch_ids`, which is not canonical in the migration.
- Viewer activity log access differs by source: README says activity history can be reviewed; route map hides Activity Log unless granted. Resolution: hide global Activity Log for Viewer by default, allow batch-scoped activity inside read-only detail if approved.
- Reports screen exists in Figma but has no RBAC route documentation.
- RQM setup is required by route map but no schema table exists.

## 9. Database Requirements

### Implemented Entities and Tables

| Table | Purpose | Key fields and constraints | Feature mapping |
| --- | --- | --- | --- |
| `tenants` | School/TVI records. | PK `id`, unique `code`, `name`, `region`, `school_type`, `is_active`, timestamps. | Tenant isolation, school switcher. |
| `profiles` | App user profile linked to Clerk. | PK `id`, unique `clerk_user_id`, `role`, `is_active`, timestamps. | Auth, RBAC. |
| `profile_tenant_memberships` | Many-to-many user-school membership. | Unique `(tenant_id, profile_id)`, `is_default`. | Multi-school Coordinator, tenant access. |
| `scholarship_programs` | Configurable programs. | Unique `code`, `name`, `description`, `is_active`. | TWSP/CFSP, program rules. |
| `program_document_requirements` | Required evidence by program. | Unique `(program_id, document_key)`, stage, audience, required flag, sort order. | Document checklist, readiness. |
| `program_billing_rules` | Internal billing threshold. | Unique `program_id`, threshold 0-100, label. | Billing preparation signal. |
| `batches` | Main training batch. | Unique `(tenant_id, batch_code)`, FK tenant/program/trainer, dates, stage, status, progress 0-100, billing status. | Dashboard, lifecycle, trainer assignment. |
| `learners` | Batch roster. | Unique `(tenant_id, batch_id, learner_no)`, names, ULI, assessment result. | Roster, LAMR, trainer views. |
| `documents` | Uploaded or linked evidence. | FK tenant/batch/requirement, document key/name, status, audience, storage path/external URL, submitted/verified fields. | Documents, evidence, uploads. |
| `lamr_reports` | LAMR header. | FK tenant/batch/source document, TVI, program, module, schedule, prepared/approved. | LAMR structured evidence. |
| `lamr_outcomes` | LAMR learning outcomes. | Unique `(tenant_id, lamr_report_id, outcome_code)`, hours, sort order. | LAMR matrix columns. |
| `lamr_activities` | LAMR activity columns. | Unique `(tenant_id, outcome_id, activity_code)`. | LAMR activity checks. |
| `lamr_entries` | Learner/activity completion and assessment result. | Unique `(tenant_id, learner_id, activity_id)`, completed flag, result, marked by/at. | LAMR learner rows. |
| `activity_log` | Audit events. | Tenant, batch, profile, action enum, entity type/id, summary, metadata JSON, timestamp. | Audit, activity log. |
| `storage.objects` bucket `compliance-evidence` | File storage. | Private bucket, 50 MB limit, tenant-folder RLS policies. | Evidence uploads. |

### Enumerations

| Enum | Values |
| --- | --- |
| `profile_role` | admin, coordinator, trainer, viewer |
| `lifecycle_stage` | aou, ntp, tip, training, assessment, billing, completed, blocked |
| `batch_status` | pending, ongoing, completed, blocked |
| `document_status` | missing, pending, submitted, verified |
| `document_audience` | admin, coordinator, trainer, viewer, all |
| `assessment_result` | competent, not_yet_competent, pending |
| `activity_action` | created, updated, uploaded, verified, submitted, deleted, system_note |

### Relationships and ERD Description

- One tenant has many profiles through profile tenant memberships.
- One tenant owns many batches, learners, documents, LAMR records, and activity logs.
- One scholarship program has many document requirements, one billing rule, and many batches.
- One batch has many learners, documents, LAMR reports, and activity log entries.
- One LAMR report has many outcomes.
- One LAMR outcome has many activities.
- One LAMR activity has many learner entries.
- One learner has many LAMR entries.
- One document requirement validates many documents.

### Audit Fields

Most mutable tables include `created_at` and `updated_at`, with triggers updating `updated_at`. `batches` includes `created_by` and `updated_by`. `documents` includes submitted/verified user and timestamp fields. `activity_log` records immutable event history.

### Soft Delete Rules

Implemented soft delete is partial:

- `tenants`, `profiles`, and `learners` include `is_active`.
- Most other tables do not include soft-delete flags.
- Several FK relationships use cascade delete.

Requirement: Production should define a consistent retention policy before enabling destructive deletes for compliance evidence. Recommended: use soft delete or archive flags for batches, documents, LAMR, learners, and activity-sensitive entities; keep activity log immutable.

### Indexing Requirements

Implemented indexes cover tenant/profile membership, program rules, batch tenant/program/trainer, learner tenant/batch, document tenant/batch, LAMR tenant/report, and activity log tenant/timestamp.

Additional recommended indexes:

- `batches(tenant_id, current_stage, status)`.
- `batches(tenant_id, start_date, end_date)`.
- `documents(tenant_id, status, document_key)`.
- `activity_log(tenant_id, batch_id, created_at desc)`.
- Full-text or trigram index for batch/trainer/qualification search if dataset grows.

### Database Gaps

- No explicit `attendance_records` table.
- No explicit `trainer_updates` table.
- No explicit `program_rqm` table despite route/API diagrams mentioning RQM.
- No `alerts_log` table for notifications/dedup.
- No `batch_snapshots` table for historical timelines.
- No report-specific employment/EGACE entities.
- No standardized soft-delete/retention policy for compliance evidence.

## 10. API Requirements

Current implementation status: no production API route handlers were found in `app/api` or equivalent. The route map defines planned Laravel endpoints. Until Laravel exists, these can be implemented as Next.js Route Handlers or Server Actions backed by Supabase, but the external contract should remain stable.

Frontend must receive user-friendly DTOs, not raw database payloads. API examples below are conceptual response shapes.

### Endpoint Catalog

| Endpoint | Purpose | Method | Auth | Request schema | Response schema | Errors | Dependencies | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/dashboard` | Dashboard metrics, alerts, role landing data. | GET | Clerk + role/tenant | Query: tenant, filters. | `{ metrics, alerts, batchesSummary, asOf }` | 401, 403, 422, 500 | batches, documents, activity | Planned |
| `/api/batches?summary=true` | Compact batch summaries. | GET | Clerk + role/tenant | Query filters. | `{ batches: BatchSummary[], asOf }` | 401, 403, 500 | batches, documents | Planned |
| `/api/batches` | Batch list/card data. | GET | Clerk + role/tenant | Query: tenant, program, status, search, sort. | `{ batches, pagination?, asOf }` | 401, 403, 422, 500 | batches, programs, docs | Planned |
| `/api/batches` | Create batch. | POST | Admin/Coordinator | Batch create DTO. | `{ batch }` | 400, 401, 403, 409, 422 | batches, activity | Required, undocumented in route map |
| `/api/batches/{batch}` | Batch detail. | GET | Role-scoped | Path batch ID. | `{ batch, lifecycle, documents, learners?, lamrSummary, activity }` | 401, 403, 404 | batches, docs, learners, LAMR | Planned |
| `/api/batches/{batch}` | Update lifecycle/core fields. | PATCH | Admin/Coordinator | Allowed fields only. | `{ batch, activityEvent }` | 400, 403, 404, 422 | batches, activity | Required |
| `/api/batches/{batch}` | Delete/archive batch. | DELETE/PATCH archive | Admin/Coordinator | Archive reason. | `{ status }` | 403, 404, 409 | batches, activity | Required policy decision |
| `/api/batches?view=table` | Table view data. | GET | Admin/Coordinator/Viewer | Query filters/sort. | `{ rows, columns, asOf }` | 401, 403, 422 | batches, docs | Planned |
| `/api/documents/matrix` | Document readiness matrix. | GET | Role-scoped | Query tenant/program/status. | `{ requirements, rows, blockers, asOf }` | 401, 403, 500 | docs, requirements | Planned |
| `/api/batches/{batch}/documents` | Attach evidence. | POST | Admin/Coordinator or assigned Trainer audience | Multipart or link DTO. | `{ document, activityEvent }` | 400, 403, 404, 413, 415, 422 | docs, storage | Planned |
| `/api/batches/{batch}/documents/{document}` | Update document status/metadata. | PATCH | Admin/Coordinator; Trainer own limited docs | Status/notes DTO. | `{ document, activityEvent }` | 403, 404, 422 | docs, activity | Required |
| `/api/batches/{batch}/documents/{document}` | Delete/archive evidence. | DELETE/PATCH archive | Admin/Coordinator | Reason. | `{ status }` | 403, 404, 409 | docs, storage, activity | Required policy decision |
| `/api/analytics/summary` | Analytics data. | GET | Admin/Coordinator/Viewer | Query tenant/date range. | `{ charts, summaries, asOf }` | 401, 403, 500 | batches, docs, activity | Planned |
| `/api/activity-log` | Audit log. | GET | Admin/Coordinator; Viewer if granted | Query tenant, batch, action, date range. | `{ events, pagination }` | 401, 403, 500 | activity_log | Planned |
| `/api/trainer/dashboard` | Trainer landing. | GET | Trainer | No raw tenant query; server scopes. | `{ classes, tasks, asOf }` | 401, 403 | batches, docs | Planned |
| `/api/trainer/classes` | Trainer assigned classes. | GET | Trainer | Optional filters. | `{ classes }` | 401, 403 | batches, learners, docs | Planned |
| `/api/trainer/classes/{batch}/attendance` | Attendance/progress form data. | GET | Assigned Trainer | Path batch. | `{ class, roster, attendance, schedule }` | 401, 403, 404 | learners, attendance model | Planned, schema gap |
| `/api/trainer/classes/{batch}/attendance` | Save attendance/progress. | POST | Assigned Trainer | `{ date, rows, progress?, notes? }` | `{ result, activityEvent }` | 400, 403, 404, 409, 422 | attendance model, activity | Planned, schema gap |
| `/api/trainer/classes/{batch}/documents` | Trainer documents. | GET | Assigned Trainer | Path batch. | `{ documents, requirements }` | 401, 403, 404 | docs, requirements | Planned |
| `/api/trainer/classes/{batch}/documents` | Upload trainer document. | POST | Assigned Trainer | Multipart/link DTO. | `{ document, activityEvent }` | 400, 403, 413, 415 | docs, storage | Planned |
| `/api/batches/{batch}/lamr` | LAMR detail. | GET | Role-scoped | Path batch. | `{ report, outcomes, activities, entries }` | 401, 403, 404 | LAMR tables | Required, not in route map |
| `/api/batches/{batch}/lamr` | Create/update LAMR. | POST/PATCH | Admin/Coordinator/assigned Trainer | LAMR DTO. | `{ lamr, activityEvent }` | 400, 403, 422 | LAMR tables | Required |
| `/api/import/batches` | CSV/T2MIS/BSRS import. | POST | Admin/Coordinator | Multipart file + import type + tenant. | `{ previewId?, result?, errors }` | 400, 403, 413, 415, 422 | import service, batches | Required |
| `/api/export/batches` | Export filtered data. | GET/POST | Admin/Coordinator | Filters. | CSV or `{ downloadUrl }` | 401, 403, 422 | batches, docs | Required |
| `/api/settings/members` | Tenant member management. | GET/PATCH | Admin | Member/role DTO. | `{ members }` | 401, 403, 422 | profiles, memberships | Planned |
| `/api/settings/programs` | Program/RQM/document rule management. | GET/PATCH | Admin/Coordinator if granted | Program/rule DTO. | `{ programs, requirements }` | 401, 403, 422 | programs, rules, future RQM | Planned |
| `/api/notifications` | In-app notification drawer. | GET/PATCH | Role-scoped | Query/update read/subscription. | `{ alerts, unreadCount, subscriptions }` | 401, 403, 422 | future alerts/activity | Planned |
| `/api/reports` | Coordinator report data. | GET | Coordinator/Admin | Query report type, tenant, dates. | `{ summaries, rows, asOf }` | 401, 403, 422 | learners, reports | Missing from route map |

### API Validation Rules

- Every endpoint must verify Clerk session.
- Every data endpoint must load profile and tenant memberships server-side.
- API must authorize action by role and assigned tenant/batch.
- Trainer DTOs must omit billing, financial, NTP lag, and restricted compliance fields.
- Mutation endpoints must write activity log events.
- Import/export must respect current filters and tenant scope.
- API must return user-friendly error messages and avoid leaking database names or SQL errors.

### Undocumented or Missing APIs

- Dashboard route exists conceptually but no file/API implementation.
- LAMR endpoints are required by PRD but absent from route map.
- Attendance/progress endpoints require schema decisions.
- Settings/program/RQM APIs need schema support.
- Reports API is required by live Figma but absent from current docs.
- Notifications API requires alert storage or activity-log-backed design.

## 11. Frontend Requirements

### Frameworks and Libraries

- Next.js 16 App Router.
- React 19.
- TypeScript 5.
- Tailwind CSS v4.
- Clerk for authentication.
- Tabler icons through `@tabler/icons-react`.
- Vercel target deployment.
- Recharts appears in PDF/code comments but is not installed in `package.json`; treat as planned if analytics charts require it.

### Current Implementation Maturity

- Root layout loads IBM Plex Sans and Mono through `next/font`.
- ClerkProvider and protected route proxy exist.
- Dashboard shell layout exists but renders placeholders instead of imported shell components.
- `/` redirects to `/dashboard`, but `/dashboard` page is missing.
- Batch Cards, Table View, Documents, Analytics, Activity Log, Trainer routes exist as placeholders/TODOs.
- `lib/data/batches.ts` now provides a real Supabase-backed data-access contract (TES-30: `getBatches`/`getBatchesSnapshot`/`mapBatchRow`, fetch→map→derive) — the reference pattern for other entities. It is **not yet wired into the dashboard** (still `MOCK_BATCHES`) and carries `TODO(contract)`/`TODO(join)` gaps (billing-deadline field, documents join).
- `lib/data/types.ts` and the remaining mock data still contain TODOs and will not support full real rendering until completed.
- Several components are partial placeholders, including `Icon`, `StatusBadge`, `MetricsRow`, `Topbar`.
- A batches data-fetching layer now exists (`lib/data/batches.ts`); no production API **route handlers** (`app/api/*`) exist yet — fetching is via Server Components calling the `lib/data/*` contract.

### State Management Approach

- Prefer Server Components for initial data loading and role-scoped rendering.
- Use URL-backed query params for filters, search, sorting, tenant selection, and tab state where shareable.
- Use local client state only for transient UI: modals, drawers, upload progress, unsaved forms, selected rows.
- Avoid exposing internal service or database identifiers in client state visible to users.

### Component Architecture

Required component families:

- `AppShell`, `PrimaryNavigation`, `Topbar`, `DashboardTabs`.
- `MetricCard`, `StatusBadge`, `UrgencyBadge`, `ProgressBar`, `LifecyclePipeline`.
- `BatchCard`, `DataTable`, `DocumentCell`, `DocumentActionRow`.
- `ModalShell`, `DrawerShell`, `FileDropzone`, `AsyncStatus`, `Toast`.
- `RoleMatrix`, `FilterBar`, `SegmentedTabs`, `ChartCard`.
- Trainer-specific `ClassCard`, `RosterTable`, `AttendanceEditor`, `TrainerDocumentUploader`.

### Design System Usage

- Use CSS variables in `app/globals.css` as canonical implementation tokens.
- Use Figma variables/components as design intent where available.
- Use IBM Plex Sans for UI text and IBM Plex Mono for IDs, dates, codes, and metric values.
- Use semantic color tokens only; no decorative gradients or arbitrary accent colors.
- Border radius should be restrained, typically 8px for cards/controls.

### Forms

- Validate inline and on submit.
- Disable submit during save/import/upload.
- Focus first invalid field after validation failure.
- Warn before closing modal if selected file or unsaved rows would be discarded.
- Use preview/confirmation before high-risk CSV imports or role changes.

### Error Handling

- User-facing errors must describe the operational problem and next step.
- Never display raw Supabase table names, SQL, stack traces, internal IDs, or raw JSON payloads.
- Permission errors should explain that the record/action is outside assigned access.
- Preserve last known data on sync failure and mark it stale.

### Loading and Caching

- Server-render first content when possible.
- Use skeletons only where content is genuinely loading.
- Include exact "data as of" timestamps on screens with computed relative values.
- If caching is later added, invalidate cache after writes and show stale/offline banners when appropriate.

### Responsive Behavior

- Desktop: persistent sidebar/navigation, dense metrics, full cards/tables.
- Tablet: metrics wrap, charts stack, tables scroll with sticky key columns.
- Mobile: shell compacts, cards stack, tables become card lists or explicit horizontal scroll, drawers become full-screen sheets, controls use 44px touch target.

### Accessibility Standards

- WCAG 2.2 AA target.
- Keyboard-only support for all controls and modals.
- Dialog semantics and focus management for overlays.
- Semantic tables for table views and document matrices.
- Progress bars need visible or accessible labels and ARIA values.
- Toasts and async status use live regions.
- Status meaning must be carried by text/icon, not color alone.

## 12. Backend Requirements

### Current Backend

- Supabase Postgres for operational database.
- Supabase Storage for evidence files.
- Supabase RLS for tenant and role scoping.
- Clerk for authentication.
- No Laravel backend is currently implemented.
- No production API route handlers were found.

### Future Backend Direction

Laravel may be introduced later as an API/business-logic layer for policies, imports, exports, reports, queues, scheduled jobs, document workflows, and maintainability by PH-based teams. If introduced, Laravel must sit above Supabase/Postgres and enforce the same tenant/role rules before returning DTOs.

### Authentication Flow

1. User opens protected route.
2. Clerk verifies session.
3. App/API reads Clerk user ID.
4. App/API loads active profile and tenant memberships.
5. App/API/RLS authorizes action.
6. UI renders role-scoped route and allowed controls.

### Authorization Flow

- RLS helper functions map Clerk JWT claims to profile and role.
- `can_access_tenant` validates tenant membership.
- `can_manage_tenant` allows Admin/Coordinator writes.
- `can_read_batch` supports Admin/Coordinator/Viewer tenant reads and Trainer assigned-batch reads.
- `can_trainer_write_batch` supports Trainer assigned-batch writes.

### Domain Services Required

- Profile and tenant membership service.
- Batch lifecycle service.
- Deadline/progress computation service.
- Document requirements and evidence service.
- File upload/signing service.
- Trainer class/attendance service.
- LAMR service.
- Import/export service.
- Activity logging service.
- Notification service if enabled.
- Reporting service if Reports route ships.

### File Storage

- Private Supabase Storage bucket: `compliance-evidence`.
- Current file size limit: 50 MB.
- Path convention should start with tenant UUID to satisfy current storage policies.
- UI must present files as "evidence", "source file", or document names, not storage paths.

### Background Jobs

MVP does not require background jobs. Later candidates:

- Deadline checks.
- Email alerts.
- Import processing.
- Export generation.
- Batch snapshots.
- Cache invalidation.
- Audit digest.

### Notifications

MVP in-app notification drawer is a design requirement, but email automation is out of MVP. If in-app notifications ship before an `alerts_log` table exists, they can be derived from activity/blocker queries with clear limitations.

### Logging, Monitoring, and Audit Trails

- Every mutation writes activity log.
- Security denials should be logged server-side without exposing sensitive details.
- Production should monitor auth failures, RLS denials, import failures, upload failures, API latency, and error rates.

## 13. Non-Functional Requirements

### Performance

- Initial dashboard response target: less than 2 seconds on typical broadband for small MVP data.
- Interaction response target: less than 300 ms for local UI state changes.
- API mutation target: less than 1 second for single-record save excluding file upload time.
- CSV import preview target: less than 5 seconds for MVP-scale files.
- Tables should paginate, virtualize, or server-filter when rows exceed comfortable client rendering.

### Scalability

- Data model must support more tenants, programs, batches, documents, learners, and LAMR rows without schema rewrite.
- Search/filter should move server-side as data grows.
- Storage policy must remain tenant-scoped.

### Security

- Service role keys must never reach browser code.
- All tenant-owned data must be protected by RLS and API policies.
- Role changes require audit events.
- File access must use scoped authorization or signed URLs.
- Learner PII visible only to authorized users.
- Imports must not allow unauthorized tenant injection.

### Reliability

- Target availability for MVP internal tool: 99% monthly once deployed.
- Backups: daily Supabase database backups or equivalent once real data exists.
- Evidence files require retention and recovery policy.
- Failed uploads/imports must not create inconsistent partial records without clear recovery.

### Maintainability

- TypeScript strictness should remain enabled.
- Shared types should reflect API DTOs and database domain models deliberately.
- Avoid hard-coded TWSP/CFSP branches in UI; use program records.
- Documentation updates must accompany schema/API/screen changes.
- Master PRD version should increment with material scope or source changes.

### Usability

- Users should identify urgent batch blockers without opening every record.
- Trainer workflows should be task-focused and mobile-usable.
- Empty states must tell the next action.
- Operational copy should be direct and administrative.

## 14. UX and Design Guidelines

### Design Principles

- Status at a glance.
- Density without crowding.
- Semantic color only.
- Government trustworthiness.
- Operational, not presentational.

### Typography

- Primary UI: IBM Plex Sans.
- Monospace: IBM Plex Mono.
- Use monospace for IDs, dates, codes, percentages, NC levels, and metric values.
- Do not use muted 9-11px text for operationally critical data.

### Color Usage

- Background: warm off-white.
- Surface: white and restrained neutral surfaces.
- Red: critical deadline or error only.
- Amber: warning/pending only.
- Green: approved/completed/on-track only.
- Blue: informational/active navigation.
- Teal: configurable program accent where applicable.
- Purple: NC level indicators.
- All colored statuses require text and icons where useful.

### Spacing and Layout

- Use 4px base grid with 2px micro steps.
- Dense but readable layouts.
- 40px desktop table rows.
- 32px dense desktop controls, 44px touch controls.
- Avoid nested card-on-card layouts.

### Component Behavior

- Batch cards are focusable and open details with Enter/Space.
- Tables support sorting/filtering and retain semantic table structure.
- Document cells expose status, source, action, and error state.
- Modals/drawers use reusable primitives and consistent focus behavior.
- Import flow includes validation and preview before committing records.

### Iconography

- Use Tabler/lucide-style line icons consistently.
- Icon-only controls require accessible names.
- Do not use decorative emoji.
- Icons reinforce status but never carry status alone.

### Empty States and Feedback

- Empty states explain next step.
- Validation errors are inline.
- Async statuses use live regions.
- Success states confirm what changed.
- Stale data banners include exact last updated timestamp.

### Microinteractions

- Buttons: hover, active, disabled, loading, focus-visible.
- Progress bars animate on data change but respect reduced motion.
- Modal open/close uses short fade/translate transitions.
- No motion is required to understand state.

### Recommendations

- Rebind Figma production screens to canonical components and variables.
- Rename generated/imported Figma layers before production sign-off.
- Add explicit "data as of" timestamp on all deadline/progress screens.
- Split Table View responsive frames into canonical desktop/tablet/mobile.
- Add "Blocking items" strip above Documents matrix.
- Raise contrast for operational metadata.
- Add route and schema support for Reports or remove Reports navigation until implemented.

## 15. Testing Requirements

### Test Case Matrix

| Test ID | Requirement | Scenario | Type | Expected result |
| --- | --- | --- | --- | --- |
| T-001 | FR-01 | Unauthenticated user opens `/batch-cards`. | Security/acceptance | Redirects to `/sign-in`. |
| T-002 | FR-01 | Authenticated user lacks active profile. | Edge/security | Access setup or permission error, no data leak. |
| T-003 | FR-02 | Admin assigned to AKB requests J3ED batch. | Security | 403 denied by API/RLS. |
| T-004 | FR-02 | Viewer attempts document upload. | Security/UI | Upload action hidden and server-denied. |
| T-005 | FR-02 | Trainer opens unassigned batch URL. | Security | Permission denied. |
| T-006 | FR-03 | Dashboard has no batches. | Usability | Empty state with next action. |
| T-007 | FR-03 | Dashboard data stale. | Edge | Stale banner and exact timestamp shown. |
| T-008 | FR-04 | Coordinator updates lifecycle to Assessment. | Acceptance/regression | Stage changes and activity log created. |
| T-009 | FR-04 | Billing marked ready before Assessment. | Edge/data integrity | Impossible state warning shown. |
| T-010 | FR-05 | Deadline is 6 days away. | Unit/acceptance | Urgency is Critical. |
| T-011 | FR-05 | Deadline is 7-21 days away. | Unit | Urgency is Warning. |
| T-012 | FR-05 | NTP-to-start lag exceeds threshold. | Acceptance | Warning flag visible. |
| T-013 | FR-06 | Required document missing. | Acceptance | Exact missing document name appears. |
| T-014 | FR-06 | Coordinator uploads valid evidence. | Integration | Document Submitted and activity logged. |
| T-015 | FR-06 | Oversized upload. | Edge | Upload blocked with inline error. |
| T-016 | FR-07 | Trainer sees My Classes. | Acceptance/security | Only assigned batches appear. |
| T-017 | FR-07 | Trainer saves duplicate attendance date. | Edge | Duplicate warning or merge flow. |
| T-018 | FR-08 | Create LAMR with outcomes and learner entries. | Integration | Structured LAMR persists and displays. |
| T-019 | FR-08 | Duplicate learner/activity entry submitted. | Data integrity | Request rejected. |
| T-020 | FR-09 | Batch reaches 80% progress. | Acceptance | Admin/Coordinator sees Billing Preparation. |
| T-021 | FR-09 | Trainer views same batch. | Security/UI | Billing Preparation hidden. |
| T-022 | FR-10 | Wrong CSV type selected. | Validation | Inline error, no import. |
| T-023 | FR-10 | CSV has duplicate batch IDs. | Validation | Preview blocks or requires explicit upsert decision. |
| T-024 | FR-10 | Valid CSV import confirmed. | Integration | Records scoped to selected tenant and activity logged. |
| T-025 | FR-11 | Analytics has no data. | Usability | Empty chart state with explanation. |
| T-026 | FR-11 | Chart uses red/amber/green. | Accessibility | Legend and text explain meaning. |
| T-027 | FR-12 | Document verification occurs. | Audit | Activity event includes user, tenant, entity, timestamp. |
| T-028 | FR-13 | Notifications drawer opens. | Accessibility | Focus trapped, background inert, Escape closes. |
| T-029 | FR-14 | Role matrix uses check/cross icons. | Accessibility | Text equivalents available. |
| T-030 | FR-15 | Reports route not implemented. | Regression | No broken navigation link is exposed. |

### Regression Tests

- Route protection for all app routes.
- Root redirect resolves to an implemented route.
- Role nav hides unauthorized screens.
- Batch card/table/documents render same source data consistently.
- Document counts never exceed total required count.
- Deadline calculations match exact as-of timestamp.
- Import preview does not commit rows until confirmed.
- Modal/drawer focus returns to opener.

### Security Tests

- RLS policies deny cross-tenant reads/writes.
- Trainer cannot read admin/coordinator-only document audiences.
- Viewer cannot mutate any tenant record.
- Storage object policies block cross-tenant file access.
- Service role key absent from browser bundle.
- Raw database errors are not returned to UI.

### Usability and Accessibility Tests

- Keyboard-only completion of modal open/use/close.
- Screen reader announces modal title, async status, and validation errors.
- All icon buttons have accessible names.
- Status meaning remains clear in grayscale.
- Mobile hit targets meet 44px for touch layouts.
- Long school/trainer/qualification/document names truncate or wrap without overlap.

## 16. Traceability Matrix

| Goal | Feature | User story | Screens | APIs | Data entities | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | Dashboard and batch overview | Coordinator identifies urgent batch action. | Dashboard, Batch Cards, Table View | `/api/dashboard`, `/api/batches` | batches, documents, requirements | T-006, T-007, T-010 |
| G1 | Analytics | Admin investigates progress/readiness trends. | Analytics | `/api/analytics/summary` | batches, documents, activity_log | T-025, T-026 |
| G2 | Document checklist | Coordinator sees exact missing evidence. | Documents, Batch Detail | `/api/documents/matrix`, document endpoints | documents, program_document_requirements, storage | T-013, T-014, T-015 |
| G2 | LAMR | Trainer/Coordinator maintains structured evidence. | LAMR route required; Trainer flows | `/api/batches/{batch}/lamr` | lamr_reports, lamr_outcomes, lamr_activities, lamr_entries | T-018, T-019 |
| G3 | Auth and RBAC | User sees only permitted schools/actions. | All protected screens | All APIs | profiles, memberships, RLS helpers | T-001 to T-005 |
| G4 | Trainer class updates | Trainer records assigned class progress. | Trainer Dashboard, My Classes, Attendance, Documents | trainer endpoints | batches, learners, documents, future attendance | T-016, T-017 |
| G5 | Billing preparation | Coordinator sees internal readiness signal. | Dashboard, Batch Cards, Documents | `/api/batches`, document endpoints | program_billing_rules, batches, documents | T-020, T-021 |
| G6 | Auditability | Admin reviews changes. | Activity Log, Batch Detail | `/api/activity-log` | activity_log | T-027 |
| G6 | Import/export | Coordinator imports/exports working data. | Import CSV modal, T2MIS/BSRS import, Reports | import/export endpoints | batches, learners, documents, activity_log | T-022 to T-024 |

### Traceability Gaps

- `/dashboard` route is required but missing from implementation.
- Reports screen exists in Figma but lacks route, API, and schema.
- Attendance/progress flow lacks dedicated schema.
- RQM is referenced but lacks schema/API.
- Notifications drawer lacks alert storage/API.
- Figma role-specific screen variants are richer than current route map and app placeholders.
- Current data layer TODOs block reliable frontend rendering and testing.

## 17. Change Log

This change log follows a source-consolidation format. It documents detected changes between the attached PDF, repository MVP docs, live Figma, schema, and implementation.

### [1.0.0] - 2026-06-12

Added:

- Consolidated master PRD/SRS with source precedence, conflicts, scope, RBAC, screen inventory, database requirements, API requirements, frontend/backend requirements, NFRs, UX guidelines, tests, traceability, risks, and recommendations.
- Live Figma screen inventory including Coordinator, Admin, Viewer, Trainer, Report, Overlays, States, and Responsive coverage.
- Explicit implementation maturity notes for placeholder routes/components.
- Traceability matrix and test mapping.

Changed:

| Change | Why | Impacted modules | Impacted users | Technical implications | Migration considerations |
| --- | --- | --- | --- | --- | --- |
| Next.js target moved from PDF's Next.js 14 to repo's Next.js 16. | Current `package.json` and README define Next.js 16. | Frontend platform | All | Use App Router, React 19 compatibility. | No data migration; update docs. |
| Supabase remains current MVP backend, while Laravel is future direction only. | README says no Laravel assumptions; route docs propose Laravel API. | Backend/API | Developers, maintainers | Do not block MVP on Laravel; keep API contracts stable. | If Laravel is later added, migrate service logic, not data model. |
| Notion CSV migration became internal CSV import/export and Supabase operational DB. | PDF references Notion CSV; current docs remove Notion as official dependency. | Import/export, data | Coordinator | Import service needs validation/preview. | Map legacy Notion columns only if still used. |
| Role model clarified to Admin, Coordinator, Trainer, Viewer. | Schema enum confirms four roles. | RBAC | All | Super Admin not implemented. | Add enum/policies only if future role approved. |
| Profile tenant access changed from arrays in docs to membership table in migration. | Migration implements `profile_tenant_memberships`. | Auth, tenant access | Admin/Coordinator | API and UI should use membership table. | Migrate any array-based profile assumptions. |
| LAMR elevated to core structured evidence. | README/MVP PRD and schema include LAMR tables. | LAMR, documents, trainer | Trainer, Coordinator | Need full CRUD and UI route. | Import existing LAMR files as source documents plus structured data when possible. |
| Figma added role-specific Admin/Coordinator/Viewer/Trainer screens. | Live Figma inspection confirms sections. | UI/routing/RBAC | All roles | App must render role variants or a configurable shared layout. | Avoid duplicating code; use role-scoped components. |
| Figma added Coordinator Report screen. | Live Figma includes `COORDINATOR - Report`. | Reports | Coordinator, Admin | Missing route/API/schema. | Decide to implement or remove navigation until ready. |
| Figma includes T2MIS/BSRS import overlay. | Live Overlays page includes updated import modal. | Import | Coordinator/Admin | Need import type validation and mapping. | Define source-specific column mapping before implementation. |
| Analytics moved from later backlog to visible Figma screen. | README lists advanced analytics as later; Figma includes analytics. | Analytics | Coordinator/Admin/Viewer | Implement core operational analytics; keep advanced charts later. | None. |
| Email/cron/Redis/PWA moved to later backlog. | README and MVP PRD exclude from first ship. | Notifications, ops | Maintainers | Do not include in MVP acceptance. | Future opt-in only. |
| Figma readiness changed from cover-only to near handoff-ready but not production sign-off ready. | UI audit documents current state and live file confirms pages. | Design handoff | Designers/engineers | Need layer cleanup, component binding, contrast audit, responsive refinements. | None. |

Deprecated:

- Raw implementation terminology in UI such as table names, `tenant_id`, SQL terms, or service names.
- Treating relative date labels as manually typed content.

Removed from MVP:

- Official TESDA system replacement.
- Direct official integrations.
- Email automation, scheduled deadline checks, Upstash caching, OCR/AI, PWA.

Security:

- Supabase RLS policies and private storage bucket are part of canonical requirements.
- Viewer write actions are explicitly denied.
- Trainer billing/financial exposure is explicitly denied.

## 18. Risks and Recommendations

### Risks

| Risk | Severity | Description | Recommendation |
| --- | --- | --- | --- |
| Missing `/dashboard` route | High | Root redirects to `/dashboard`, but implementation file is absent. | Add role-aware dashboard route or change redirect to implemented default. |
| Placeholder implementation | High | Many pages/components/data files are TODO placeholders. Batches now has a real data-access contract (`lib/data/batches.ts`, TES-30); other entities still stubbed. | Extend the batches fetch→map→derive pattern to remaining entities, complete shell components and core screens, and wire the dashboard off mocks before claiming MVP. |
| Conflicting backend direction | High | Supabase-only MVP and Laravel future API are mixed in docs. | Keep MVP Supabase-based; document Laravel as future only until implemented. |
| Incomplete API layer | High | No production API routes found. | Implement stable API/DTO boundary via Next route handlers or Laravel. |
| Schema gaps for trainer attendance | High | Trainer attendance/progress required but no dedicated table exists. | Add attendance/trainer update tables or explicitly model in documents/LAMR with tradeoffs. |
| RQM gap | Medium | Route map requires RQM but schema lacks it. | Define Program RQM entity or remove from MVP. |
| Reports gap | Medium | Figma includes Reports but no route/API/schema. | Decide MVP inclusion; add route/API/schema or remove from nav. |
| Figma handoff debt | Medium | Generated layers, partial bindings, and contrast concerns remain. | Clean Figma components/layers and run final contrast audit. |
| Date calculation risk | High | Audit docs found date math inconsistencies. | Centralize deadline calculations and show exact as-of timestamp. |
| Compliance wording risk | High | UI could imply official TESDA approval. | Use "internal", "preparation", "working copy", and official-boundary copy consistently. |
| Deletion/retention risk | Medium | Cascade deletes exist and soft delete is inconsistent. | Add retention/archival policy before real evidence data. |
| Storage access risk | High | Storage paths must align with tenant-folder RLS. | Enforce path builder server-side and test cross-tenant file access. |

### Actionable Recommendations

1. Fix the route baseline: add `/dashboard` or change root redirect; then implement role-aware shell navigation.
2. `lib/data/batches.ts` is now the reference Supabase-backed data function (TES-30). Extend the same fetch→map→derive pattern to the other entities, close its `TODO(contract)`/`TODO(join)` gaps, and wire the dashboard off `MOCK_BATCHES`.
3. Implement core DTO/API layer before building more UI states.
4. Add attendance/progress schema and tests, or explicitly scope Trainer MVP to document/LAMR evidence only.
5. Decide whether Reports and RQM are MVP requirements; update route map/schema accordingly.
6. Build reusable modal/drawer primitives before implementing import/settings/batch detail overlays.
7. Add end-to-end RBAC tests for Admin, Coordinator, Trainer, and Viewer.
8. Add computed date/progress utility with unit tests using fixed as-of dates.
9. Add `data as of` display to all screens with relative deadlines.
10. Clean Figma production pages: rename layers, rebind components, finish responsive examples, complete contrast audit.
11. Keep frontend copy user-friendly: "School-level access", "Evidence", "Assigned classes", "Billing preparation", not table names or SQL concepts.
12. Define retention and soft-delete policy before importing real learner/evidence data.

## Revision History

| Version | Date | Author | Summary |
| --- | --- | --- | --- |
| 1.0.0 | 2026-06-12 | Codex | Initial consolidated Master PRD/SRS from PDF, repo docs, live Figma inventory, schema migration, and current implementation. |

