# Supabase Schema Guide

This is the first manual backend step for the TESDA Document and Compliance Manager MVP.

Do this before building more UI screens, analytics, MongoDB, OCR, email automation, or GitHub Actions. The goal is to understand and design the database tables first, then manually create them in your hosted Supabase project.

## Important Boundary

Supabase is only the internal operational database for this tool.

TESDA SIS, T2MIS, BSRS, and official TESDA submission workflows remain the official source of truth. This system should only track internal working copies, evidence, checklist status, notes, LAMR records, and billing preparation readiness.

Do not label any Supabase record as official TESDA approval.

## What To Do First

1. Create or open your hosted Supabase project.
2. Create the main tables listed below.
3. Add table descriptions so the purpose is clear.
4. Add `tenant_id` to every tenant-owned table.
5. Seed the first schools: AKB, J3ED, and NEN.
6. Seed the first scholarship programs: TWSP and CFSP.
7. Add RLS after the table relationships are clear.
8. Connect the Next.js app only after the schema works.

## Core Tables

| Table | Description |
| --- | --- |
| `tenants` | Stores each school/TVI. Initial records are AKB, J3ED, and NEN. Every tenant-owned record connects back to this table. |
| `profiles` | Stores app users, their role, and which tenant or tenants they can access. Later this connects to Clerk user IDs. |
| `scholarship_programs` | Stores configurable TESDA scholarship programs such as TWSP and CFSP. Avoid hard-coding programs in the UI. |
| `program_document_requirements` | Defines which documents are required for each scholarship program. This powers the document checklist. |
| `program_billing_rules` | Stores internal billing preparation rules, including the default 80% progress threshold. |
| `batches` | Main training batch table. Stores tenant, program, qualification, trainer, learner count, dates, lifecycle stage, and progress. |
| `learners` | Stores learner roster records connected to a batch. Used for attendance, LAMR rows, and trainer class views. |
| `documents` | Stores uploaded or linked evidence files, document type, status, and verification metadata. |
| `lamr_reports` | Stores the LAMR header: TVI name, program title, batch/section, module title, schedule, prepared by, approved by, and source file. |
| `lamr_outcomes` | Stores learning outcome columns for each LAMR report, such as LO1, LO2, LO3. |
| `lamr_activities` | Stores activity columns under each learning outcome, such as Act 1 and Act 2. |
| `lamr_entries` | Stores learner-by-activity completion marks and institutional assessment results. |
| `activity_log` | Stores audit trail events when users create, update, verify, upload, or change batch/compliance records. |

## Recommended Table Order

Create the tables in this order so relationships are easier to understand:

1. `tenants`
2. `profiles`
3. `scholarship_programs`
4. `program_document_requirements`
5. `program_billing_rules`
6. `batches`
7. `learners`
8. `documents`
9. `lamr_reports`
10. `lamr_outcomes`
11. `lamr_activities`
12. `lamr_entries`
13. `activity_log`

## Table Notes

### `tenants`

Use this for schools/TVIs.

Suggested fields:

- `id`
- `code`
- `name`
- `region`
- `school_type`
- `is_active`
- `created_at`
- `updated_at`

Initial tenant records:

| Code | School |
| --- | --- |
| AKB | AKB Technical Vocational Inc. |
| J3ED | J3ED Farm School |
| NEN | Nenita Farm Rice-Based School |

### `profiles`

Use this for app users and role access.

Suggested fields:

- `id`
- `clerk_user_id`
- `full_name`
- `email`
- `role`
- `tenant_ids`
- `assigned_batch_ids`
- `is_active`
- `created_at`
- `updated_at`

Roles:

| Role | Meaning |
| --- | --- |
| `admin` | Full access inside one school only. |
| `coordinator` | Can manage one or more assigned schools. |
| `trainer` | Can access assigned batches/classes only. |
| `viewer` | Read-only review access. |

### `scholarship_programs`

Use this so programs are configurable.

Suggested fields:

- `id`
- `code`
- `name`
- `description`
- `is_active`
- `created_at`
- `updated_at`

Initial program records:

| Code | Program |
| --- | --- |
| TWSP | Training for Work Scholarship Program |
| CFSP | Coconut Farmers Scholarship Program |

### `program_document_requirements`

Use this to define required documents per program.

Suggested fields:

- `id`
- `program_id`
- `document_key`
- `document_name`
- `description`
- `required_for_stage`
- `audience`
- `is_required`
- `sort_order`
- `created_at`
- `updated_at`

Example document requirements:

| Document Key | Description |
| --- | --- |
| `aou` | Authority to Undertake evidence. |
| `ntp` | Notice to Proceed evidence. |
| `tip_report` | Training Induction Program report. |
| `training_schedule` | Approved training schedule evidence. |
| `attendance` | Attendance or equivalent blended learning evidence. |
| `lamr` | Learners Achievement Monitoring Report. |
| `assessment` | Assessment evidence. |
| `billing_report` | Internal billing preparation document. |

### `program_billing_rules`

Use this for the internal billing preparation threshold.

Suggested fields:

- `id`
- `program_id`
- `progress_threshold_percent`
- `label`
- `description`
- `is_active`
- `created_at`
- `updated_at`

Default:

| Field | Value |
| --- | --- |
| `progress_threshold_percent` | `80` |
| `label` | `Billing Preparation` |

Important: this is not TESDA billing approval.

### `batches`

Use this as the main training batch record.

Suggested fields:

- `id`
- `tenant_id`
- `program_id`
- `batch_code`
- `batch_section`
- `qualification_title`
- `nc_level`
- `trainer_profile_id`
- `trainer_name`
- `learner_count`
- `start_date`
- `end_date`
- `current_stage`
- `status`
- `progress_percent`
- `billing_report_status`
- `official_system_reference`
- `created_at`
- `updated_at`

Lifecycle stages:

| Stage | Meaning |
| --- | --- |
| `aou` | AOU submitted or being prepared. |
| `ntp` | NTP received. |
| `tip` | TIP conducted. |
| `training` | Training ongoing. |
| `assessment` | Assessment stage. |
| `billing` | Internal billing preparation stage. |

### `learners`

Use this for the batch roster.

Suggested fields:

- `id`
- `tenant_id`
- `batch_id`
- `learner_no`
- `uli`
- `last_name`
- `first_name`
- `middle_name`
- `extension_name`
- `assessment_result`
- `is_active`
- `created_at`
- `updated_at`

### `documents`

Use this for uploaded or linked evidence.

Suggested fields:

- `id`
- `tenant_id`
- `batch_id`
- `requirement_id`
- `document_key`
- `document_name`
- `status`
- `audience`
- `storage_path`
- `external_url`
- `notes`
- `submitted_by`
- `submitted_at`
- `verified_by`
- `verified_at`
- `created_at`
- `updated_at`

Document statuses:

| Status | Meaning |
| --- | --- |
| `missing` | Required evidence is not yet available. |
| `pending` | Evidence is being prepared or needs review. |
| `submitted` | Evidence has been uploaded or linked. |
| `verified` | Coordinator/Admin verified the evidence internally. |

### `lamr_reports`

Use this for the LAMR header information.

Suggested fields:

- `id`
- `tenant_id`
- `batch_id`
- `tvi_name`
- `program_title`
- `batch_section`
- `module_title`
- `schedule_text`
- `prepared_by`
- `approved_by`
- `source_document_id`
- `source_storage_path`
- `source_external_url`
- `created_at`
- `updated_at`

### `lamr_outcomes`

Use this for LAMR learning outcome columns.

Suggested fields:

- `id`
- `tenant_id`
- `lamr_report_id`
- `outcome_code`
- `outcome_title`
- `hours`
- `sort_order`
- `created_at`
- `updated_at`

Example:

| Outcome Code | Outcome Title |
| --- | --- |
| LO1 | Establish Nursery |
| LO2 | Plant Seedlings |
| LO3 | Perform Plant Care Activities and Management |

### `lamr_activities`

Use this for activity columns under each learning outcome.

Suggested fields:

- `id`
- `tenant_id`
- `lamr_report_id`
- `outcome_id`
- `activity_code`
- `activity_title`
- `sort_order`
- `created_at`
- `updated_at`

Example:

| Activity Code | Activity Title |
| --- | --- |
| ACT1 | Activity 1 |
| ACT2 | Activity 2 |

### `lamr_entries`

Use this for each learner's activity check marks and assessment result.

Suggested fields:

- `id`
- `tenant_id`
- `lamr_report_id`
- `learner_id`
- `activity_id`
- `is_completed`
- `assessment_result`
- `notes`
- `marked_by`
- `marked_at`
- `created_at`
- `updated_at`

Assessment result options:

| Value | Meaning |
| --- | --- |
| `competent` | Learner is marked competent. |
| `not_yet_competent` | Learner is not yet competent. |
| `pending` | Assessment result is not yet recorded. |

### `activity_log`

Use this for the audit trail.

Suggested fields:

- `id`
- `tenant_id`
- `batch_id`
- `profile_id`
- `action`
- `entity_type`
- `entity_id`
- `summary`
- `metadata`
- `created_at`

Example actions:

| Action | Meaning |
| --- | --- |
| `created` | A record was created. |
| `updated` | A record was updated. |
| `uploaded` | Evidence was uploaded or linked. |
| `verified` | Evidence was verified internally. |
| `submitted` | Evidence was submitted internally. |
| `deleted` | A record was deleted. |
| `system_note` | System-generated activity note. |

## RLS Checklist

Add RLS after creating the tables.

Minimum rules:

- Admin can read/write only inside their assigned school.
- Coordinator can read/write inside assigned schools.
- Trainer can read only assigned batches/classes.
- Trainer can write only trainer-side evidence, attendance/progress, and LAMR updates.
- Viewer can read assigned school data only.
- Viewer cannot create, update, delete, import, or verify records.
- No user can read another tenant's records.

## First Manual Success Criteria

You are ready to connect the app when:

- All core tables exist.
- Every tenant-owned table has `tenant_id`.
- AKB, J3ED, and NEN exist in `tenants`.
- TWSP and CFSP exist in `scholarship_programs`.
- A sample batch can connect to a tenant and program.
- A sample learner can connect to a batch.
- A sample document can connect to a batch.
- A sample LAMR report can connect to a batch.
- A sample LAMR entry can connect one learner to one activity.
- RLS is enabled or ready to be enabled before real users are added.
