# GitHub Project Backlog

Use these as initial GitHub issues for the `TESDA Compliance Manager MVP` project.

## Milestone: MVP Foundation

### 1. Set up Next.js app foundation

Labels: `mvp`, `foundation`

Area: Auth & Tenant  
Priority: P0  
Role: System  
Effort: M  
Target: MVP

Acceptance criteria:

- Next.js 16 App Router project is running.
- Tailwind CSS v4 is configured.
- Base layout and navigation shell exist.
- Environment variables are documented.

### 2. Configure Clerk authentication and role profile model

Labels: `mvp`, `auth`, `security`

Area: Auth & Tenant  
Priority: P0  
Role: System  
Effort: M  
Target: MVP

Acceptance criteria:

- Users can sign in with Clerk.
- Profiles store role and tenant memberships.
- Roles supported: Admin, Coordinator, Trainer, Viewer.
- Unauthenticated users cannot access app routes.

### 3. Create Supabase schema with tenant-scoped tables

Labels: `mvp`, `database`, `security`

Area: Auth & Tenant  
Priority: P0  
Role: System  
Effort: L  
Target: MVP

Acceptance criteria:

- Tables exist for tenants, profiles, programs, batches, learners, documents, LAMR, and activity log.
- Tenant-owned tables include `tenant_id`.
- RLS policies prevent cross-tenant access.

## Milestone: Core Workflows

### 4. Build Admin and Coordinator dashboard

Labels: `mvp`, `dashboard`

Area: Dashboard  
Priority: P0  
Role: Coordinator  
Effort: L  
Target: MVP

Acceptance criteria:

- Admin/Coordinator can view assigned-school batches.
- Dashboard shows lifecycle status, program, qualification, learner count, progress, and document readiness.
- Coordinator can switch among assigned schools.

### 5. Build Viewer read-only dashboard

Labels: `mvp`, `dashboard`, `viewer`

Area: Dashboard  
Priority: P1  
Role: Viewer  
Effort: S  
Target: MVP

Acceptance criteria:

- Viewer can view assigned-school batch readiness.
- Viewer cannot create, update, import, or upload.
- UI clearly communicates read-only access.

### 6. Build batch lifecycle tracking

Labels: `mvp`, `batch-lifecycle`

Area: Batch Lifecycle  
Priority: P0  
Role: Coordinator  
Effort: M  
Target: MVP

Acceptance criteria:

- Coordinator/Admin can create and edit batch records.
- Supported lifecycle stages: AOU, NTP, TIP, Training, Assessment, Billing.
- App labels lifecycle as internal tracking only.

### 7. Build document checklist and evidence upload

Labels: `mvp`, `documents`, `storage`

Area: Documents  
Priority: P0  
Role: Coordinator  
Effort: L  
Target: MVP

Acceptance criteria:

- Required documents can be configured per program.
- Users can upload/link evidence files.
- Statuses supported: missing, pending, submitted, verified.
- Batch view shows exact missing document names.

### 8. Build Trainer My Classes dashboard

Labels: `mvp`, `trainer`

Area: Trainer  
Priority: P0  
Role: Trainer  
Effort: L  
Target: MVP

Acceptance criteria:

- Trainer sees only assigned batches.
- Trainer can view roster.
- Trainer can mark attendance/progress.
- Trainer can upload training-side evidence.
- Trainer cannot see billing fields or other school data.

### 9. Build LAMR structured evidence module

Labels: `mvp`, `lamr`, `blended-learning`

Area: LAMR  
Priority: P0  
Role: Trainer  
Effort: L  
Target: MVP

Acceptance criteria:

- LAMR stores TVI, program title, batch/section, module title, schedule.
- LAMR stores learners, learning outcomes, activity columns, completion marks, and institutional assessment result.
- LAMR stores prepared-by, approved-by, and source file upload.
- LAMR supports blended/asynchronous evidence.

### 10. Build internal billing preparation signal

Labels: `mvp`, `billing-prep`

Area: Billing Prep  
Priority: P1  
Role: Coordinator  
Effort: M  
Target: MVP

Acceptance criteria:

- Configurable default 80% progress threshold exists.
- Admin/Coordinator sees billing preparation banner/badge.
- Trainer cannot see billing preparation signal.
- Wording does not imply official TESDA approval.

### 11. Build basic CSV import and export

Labels: `mvp`, `import-export`

Area: Import/Export  
Priority: P1  
Role: Coordinator  
Effort: M  
Target: MVP

Acceptance criteria:

- Admin/Coordinator can import batch CSV data.
- Export includes filtered batch/document readiness data.
- Import/export respects tenant and role scope.
- Import is labeled as internal working data only.

## Milestone: Hardening

### 12. Add activity logging

Labels: `mvp`, `audit`

Area: Security  
Priority: P1  
Role: System  
Effort: M  
Target: MVP

Acceptance criteria:

- Activity log records key create/update events.
- Events include user, tenant, action, target, and timestamp.
- Batch, document, trainer update, and LAMR changes are logged.

### 13. Add access-control tests

Labels: `mvp`, `testing`, `security`

Area: Security  
Priority: P0  
Role: System  
Effort: M  
Target: MVP

Acceptance criteria:

- Admin cannot access another school.
- Coordinator can access only assigned schools.
- Trainer can access only assigned batches.
- Viewer cannot write.

### 14. Add core workflow tests

Labels: `mvp`, `testing`

Area: Security  
Priority: P1  
Role: System  
Effort: M  
Target: MVP

Acceptance criteria:

- Test batch create/import.
- Test document upload/status update.
- Test trainer attendance/progress update.
- Test LAMR create/update.
- Test billing preparation threshold.

## Later Backlog

### 15. Add email notifications through Resend

Area: Later  
Priority: P2  
Role: System  
Effort: M  
Target: Later

### 16. Add scheduled deadline checks with GitHub Actions

Area: Later  
Priority: P2  
Role: System  
Effort: M  
Target: Later

### 17. Add analytics charts

Area: Later  
Priority: P2  
Role: Coordinator  
Effort: M  
Target: Later

### 18. Add MongoDB document intelligence index

Area: Later  
Priority: P2  
Role: System  
Effort: L  
Target: Later

### 19. Add OCR or AI document review

Area: Later  
Priority: P2  
Role: System  
Effort: L  
Target: Later

### 20. Add direct official TESDA system integration if allowed

Area: Later  
Priority: P2  
Role: System  
Effort: L  
Target: Later

