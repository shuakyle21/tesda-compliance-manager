# TESDA Document and Compliance Manager MVP PRD

## 1. Product Overview

TESDA Document and Compliance Manager is an internal compliance coordination tool for a small TVI operations team managing TESDA TWSP and CFSP scholarship batches across three initial schools:

| Code | School | Region | Type |
|---|---|---|---|
| AKB | AKB Technical Vocational Inc. | Region IV-A, Laguna | Technical-vocational institute |
| J3ED | J3ED Farm School | Region IV-A, Quezon | Farm school |
| NEN | Nenita Farm Rice-Based School | Region III, Nueva Ecija | Rice-based farm school |

The MVP helps five internal users see batch status, track missing documents, capture trainer-side updates, store LAMR evidence, and prepare internal billing packages without replacing TESDA official systems.

Supabase is the internal operational database only. TESDA SIS, T2MIS, and BSRS remain the official authoritative systems for required records, reports, QMs, schedules, attendance, ULI, and billing documents.

## 2. Problem Statement

Current TESDA batch compliance work is document-heavy and spread across manual files, official TESDA systems, trainer updates, and coordinator follow-ups. The team needs one internal view of batch readiness so coordinators can identify missing evidence, trainers can submit class progress, and admins can review compliance risk before billing preparation.

The MVP must reduce manual tracking friction without overbuilding automation, analytics, or official-system integration.

## 3. MVP Goals

- Give Admins and Coordinators a tenant-scoped dashboard of active batches.
- Let Trainers update only assigned batch attendance, progress, and training evidence.
- Track required document status and exact missing document names.
- Represent LAMR as structured evidence for blended/asynchronous learning, not just a file upload.
- Provide an internal billing preparation signal at the configured progress threshold.
- Support basic CSV import/export for operational handoff.
- Preserve strict role and tenant boundaries.

## 4. Non-Goals For First Ship

- No direct integration with SIS, T2MIS, or BSRS.
- No official TESDA submission or approval workflow.
- No email automation, scheduled jobs, weekly digests, or Resend integration.
- No advanced analytics charts.
- No MongoDB, OCR, AI document review, or document intelligence layer.
- No PWA/offline mode.
- No advanced TESDA-format report generation beyond basic CSV exports.

## 5. Users And Permissions

| Role | Scope | Core Access |
|---|---|---|
| Admin | One school | Full write access within assigned school; can review batches, documents, trainer updates, and billing preparation status. |
| Coordinator | One or more schools | Primary compliance operator; can switch among assigned schools, import batches, update lifecycle, manage document checklist, and export readiness data. |
| Trainer | Assigned batches only | Can view assigned classes, update attendance/progress, upload training evidence, and maintain LAMR evidence. Cannot see billing fields or other school data. |
| Viewer | Assigned schools | Read-only review access for internal audit, external review, or TESDA-facing preparation. |

Every tenant-owned record must include `tenant_id`. Supabase RLS must enforce that users cannot read or write records outside their assigned tenant scope.

## 6. Core Workflows

### 6.1 Admin/Coordinator Batch Compliance Workflow

1. User signs in through Clerk.
2. User selects an assigned school if they have multi-school access.
3. User imports or creates an internal batch record.
4. User attaches TESDA evidence and document links/uploads.
5. User tracks lifecycle: AOU, NTP, TIP, Training, Assessment, Billing.
6. User reviews missing documents and compliance status.
7. User monitors progress, urgency, and internal alerts.
8. If configured threshold is reached, app shows internal billing preparation signal.
9. User exports CSV/report for internal review or manual official-system update.

### 6.2 Trainer Daily Class Workflow

1. Trainer signs in.
2. Trainer opens “My Classes”.
3. Trainer selects an assigned batch.
4. Trainer records class attendance/progress.
5. Trainer uploads training-side evidence.
6. Trainer updates LAMR where applicable.
7. Coordinator/Admin reviews submitted updates.
8. Coordinator/Admin handles assessment and billing preparation outside the Trainer view.

### 6.3 Blended Learning / LAMR Evidence Workflow

1. Trainer or Coordinator opens the batch LAMR record.
2. User records TVI name, program title, batch/section, module title, and schedule.
3. User defines learning outcomes and activity columns.
4. User records learner rows and activity completion marks.
5. User records institutional assessment result per learner.
6. User records prepared-by and approved-by details.
7. User uploads the source LAMR file as evidence.
8. LAMR appears in batch document readiness and trainer-side evidence.

### 6.4 Viewer Audit Review Workflow

1. Viewer signs in.
2. Viewer selects assigned school if applicable.
3. Viewer opens batch list and detail views.
4. Viewer reviews lifecycle, document checklist, evidence links, LAMR summary, and exportable readiness state.
5. Viewer cannot create, update, delete, import, or export restricted data unless explicitly granted later.

## 7. Core Functional Requirements

### 7.1 Authentication And Tenant Access

- Use Clerk sign-in.
- Support roles: `admin`, `coordinator`, `trainer`, `viewer`.
- Store tenant memberships for each user.
- Enforce tenant isolation in all server-side reads and writes.
- Show a school switcher only for users with multi-school access.

### 7.2 Role-Based Dashboards

- Admin and Coordinator see assigned-school batch dashboard.
- Trainer sees “My Classes” with assigned batches only.
- Viewer sees read-only dashboard.
- Dashboard must show lifecycle status, program, qualification, learner count, progress, and document readiness.

### 7.3 Batch Lifecycle Tracking

- Track internal lifecycle stage:
  - AOU Submitted
  - NTP Received
  - TIP Conducted
  - Training Ongoing
  - Assessment
  - Billing
- Store program, qualification, trainer, learner count, start/end dates, current status, and progress percentage.
- Clearly label lifecycle as internal tracking only.

### 7.4 Document Checklist And Evidence Uploads

- Store required document checklist per scholarship program.
- Allow Admin/Coordinator to upload or link evidence files.
- Allow Trainer to upload only assigned training-side evidence.
- Support document statuses: `missing`, `pending`, `submitted`, `verified`.
- Show exact missing document names on batch list and detail.

### 7.5 Trainer Class Updates

- Trainer can view assigned batch roster.
- Trainer can mark daily attendance/progress.
- Trainer can upload training-side documents.
- Trainer cannot access billing deadline, billing fields, BSRS status, NTP lag, or coordinator-only documents.

### 7.6 LAMR Structured Evidence

LAMR must be modeled as structured data plus source-file evidence.

Required LAMR fields:

- TVI name
- Program title
- Batch/section
- Module title
- Schedule
- Learner list
- Learning outcomes
- Activity columns per learning outcome
- Completion/check marks per learner/activity
- Institutional assessment result per learner
- Prepared by
- Approved by
- Source document upload

LAMR must support blended and asynchronous learning evidence, including LMS progress, LAMR evidence, and BSRS attendance exemption evidence where applicable.

### 7.7 Internal Billing Preparation Signal

- Use configurable default threshold of 80% progress.
- Label as “Billing Preparation”, not official billing approval.
- Show banner/badge only to Admin and Coordinator.
- Hide billing preparation signal from Trainer.
- Signal clears when billing report status becomes `submitted` or `verified`.

### 7.8 Basic Import/Export

- Support CSV batch import for Admin/Coordinator.
- Support CSV export of filtered batch and document readiness data.
- Export must respect tenant and role scope.
- Imported data is internal working data only and does not update official TESDA systems.

## 8. Data Requirements

Core tables:

| Table | Purpose |
|---|---|
| `tenants` | School metadata. |
| `profiles` | Clerk user profile, role, tenant memberships. |
| `scholarship_programs` | Configurable programs such as TWSP and CFSP. |
| `program_document_requirements` | Required document checklist by program. |
| `program_billing_rules` | Internal billing preparation threshold and rules. |
| `batches` | Tenant-owned batch records. |
| `learners` | Scholar roster per batch. |
| `documents` | Uploaded/linked evidence and document status. |
| `lamr_reports` | LAMR header, module, schedule, prepared/approved fields, source upload. |
| `lamr_outcomes` | Learning outcome definitions per LAMR. |
| `lamr_activities` | Activity columns under each learning outcome. |
| `lamr_entries` | Learner activity completion and assessment results. |
| `activity_log` | User and system events. |

Later tables, not required for first ship:

- `alerts_log`
- `batch_snapshots`
- advanced audit/document intelligence collections

## 9. Security, Privacy, And Compliance Requirements

- Service role keys must never reach the browser.
- All tenant-owned tables must be protected by RLS.
- File access must be scoped to tenant and role.
- Learner personally identifiable information must only be visible to authorized users.
- Activity log must record create/update events for batches, documents, trainer updates, and LAMR changes.
- The app must clearly state that official records remain in TESDA SIS/T2MIS/BSRS.

## 10. Later Feature Backlog

- Email notifications through Resend.
- GitHub Actions scheduled deadline checks.
- Advanced analytics charts.
- Batch snapshots cron.
- Automated weekly digest.
- MongoDB document intelligence or audit evidence index.
- OCR or AI document review.
- Advanced TESDA-format report generation.
- PWA/offline mode.
- Direct SIS/T2MIS/BSRS integration if allowed and technically feasible.

## 11. Acceptance Criteria

### Role And Tenant Access

- Admin cannot read or write another school’s data.
- Coordinator can switch only among assigned schools.
- Trainer sees only assigned batch/class data.
- Viewer cannot write any data.

### Batch And Documents

- Coordinator can create/import a batch and see it on dashboard.
- Coordinator can update lifecycle status.
- Coordinator can upload evidence and document status changes.
- Batch view shows exact missing document names.

### Trainer And LAMR

- Trainer can update attendance/progress only for assigned batch.
- Trainer can upload training-side evidence.
- LAMR can store metadata, learning outcomes, activity checks, learner results, signature fields, and source upload.
- Blended/asynchronous batch can show LAMR/LMS evidence separately from attendance evidence.

### Billing Preparation

- Internal billing preparation banner appears at configured threshold.
- Banner is visible only to Admin/Coordinator.
- Banner wording does not imply official TESDA approval.

### Import/Export

- CSV import creates internal batch records only.
- CSV export includes filtered batch/document readiness data.
- Export respects tenant and role permissions.

## 12. Success Metrics

- Team can identify missing documents per batch without manual spreadsheet review.
- Trainers can submit class progress and LAMR evidence without exposing billing data.
- Coordinators can prepare internal billing packages with fewer back-and-forth checks.
- Users can reliably separate internal tracking from official TESDA system updates.

## 13. Technical Assumptions

- Target stack: Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Supabase Postgres/Storage/RLS, Clerk, Vercel.
- Initial programs: TWSP and CFSP.
- Initial tenants: AKB, J3ED, NEN.
- MVP is internal-only for five users.
- Email automation, analytics, MongoDB, OCR, and direct official-system integrations are not part of first ship.

