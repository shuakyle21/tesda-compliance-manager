[![Mark stale issues and pull requests](https://github.com/shuakyle21/tesda-compliance-manager/actions/workflows/stale.yml/badge.svg?branch=main)](https://github.com/shuakyle21/tesda-compliance-manager/actions/workflows/stale.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/shuakyle21/tesda-compliance-manager)
# TESDA Document and Compliance Manager

Internal compliance and document tracking tool for farm schools and TVIs implementing TESDA scholarship programs.

This repository contains the MVP foundation for a multi-tenant TESDA compliance manager. It helps school admins, coordinators, trainers, and read-only reviewers track training batches, required documents, learner progress, LAMR evidence, and internal billing document preparation.

## Official Systems Boundary

This tool is an internal operational database and workflow layer only. It does not replace TESDA's official SIS, T2MIS, BSRS, or other required scholarship implementation platforms.

Official TESDA records, approved qualification maps, schedules, ULI records, attendance submissions, billing documents, and required reports remain authoritative in the official TESDA systems. Supabase stores internal working copies, document evidence, status tracking, audit notes, and references to official system records.


### Core Features

| Feature                          | MVP behavior                                                                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication and tenant access | Clerk sign-in with role-based access for Admin, Coordinator, Trainer, and Viewer.                                                                                                |
| Tenant isolation                 | Three initial schools: AKB, J3ED, and NEN. Supabase RLS enforces strict school-level scoping.                                                                                    |
| Role dashboards                  | Admin and Coordinator see assigned school batches. Trainer sees only assigned classes. Viewer is read-only.                                                                      |
| Batch lifecycle tracking         | Internal lifecycle stages: AOU, NTP, TIP, Training, Assessment, Billing.                                                                                                         |
| Document checklist               | Required document tracking per program with missing, pending, submitted, and verified states.                                                                                    |
| Evidence uploads                 | Supabase Storage stores uploaded or linked internal evidence files.                                                                                                              |
| Trainer class updates            | Trainers can view rosters, mark daily attendance or progress, and upload training-side evidence.                                                                                 |
| LAMR structured evidence         | LAMR captures TVI name, program, batch, module, schedule, learner rows, learning outcomes, activity checks, assessment result, prepared by, approved by, and source file upload. |
| Blended learning support         | LAMR can be used as structured evidence for blended or asynchronous learning activities.                                                                                         |
| Billing document generation      | Internal document-generating engine per ADR-001: populates TSF/Allowance, Training Cost, and Entrepreneurship `.docx` templates. A packet is billing-ready only when the compound gate passes — training progress ≥ 80% **and** required documents verified — then moves through `draft → ready → generated → submitted → settled` with derived due dates (ADR-003). Admin and Coordinator only. |
| Basic import/export              | CSV batch import and filtered CSV export, respecting tenant and role scope.                                                                                                      |

### Later Features

- Email notifications through Resend.
- GitHub Actions scheduled deadline checks.
- Advanced analytics charts.
- Batch snapshots cron.
- Automated weekly digest.
- MongoDB document intelligence or audit evidence index.
- OCR or AI document review.
- Advanced TESDA-format report generation.
- PWA/offline mode.
- Direct SIS/T2MIS/BSRS integration, only if allowed and technically feasible.

## Users and Roles

| Role | Scope | Permissions |
| --- | --- | --- |
| Admin | One school | Full write access within their school. |
| Coordinator | One or more schools | Manages lifecycle, documents, imports, exports, and internal billing document preparation for assigned schools. |
| Trainer | Assigned batch or class | Views assigned class, marks attendance/progress, uploads training evidence, and manages LAMR inputs. |
| Viewer | Assigned school or schools | Read-only access for audit review or external review. |

The Viewer role can support a TESDA auditor or external reviewer only when the school explicitly grants access. It should remain read-only and scoped to selected evidence, batches, and documents.

## Initial Tenants

| Code | School |
| --- | --- |
| AKB | AKB Technical Vocational Inc. |
| J3ED | J3ED Farm School |
| NEN | Nenita Farm Rice-Based School |

## Initial Programs

- TWSP
- CFSP

Scholarship programs should be stored as configurable records, not hard-coded UI branches.

## Core Workflows

### Admin and Coordinator Batch Compliance

1. Sign in and select an assigned school.
2. Review batch lifecycle status and missing documents.
3. Upload or link evidence files.
4. Verify document statuses.
5. Track progress toward assessment and internal billing document preparation.
6. Export filtered readiness data when needed.

### Trainer Daily Class

1. Sign in to the Trainer dashboard.
2. Select an assigned class if more than one class is assigned.
3. Review roster and training progress.
4. Mark attendance or daily progress.
5. Upload training-side evidence.
6. Complete LAMR structured evidence for class activities.

### Blended Learning and LAMR Evidence

LAMR is represented as structured evidence, not only as a file upload. Each record should support:

- TVI name.
- Program title.
- Batch or section.
- Module title.
- Schedule.
- Learner rows.
- Learning outcomes and activity columns.
- Completion or check marks per learner.
- Institutional assessment result.
- Prepared by and approved by.
- Source file upload.

### Viewer Audit Review

1. Viewer signs in with read-only access.
2. Viewer opens assigned school or batch records.
3. Viewer reviews lifecycle status, documents, evidence, LAMR records, and activity history.
4. Viewer cannot create, update, delete, import, export restricted data, or access other tenants.

## Technical Stack

- Next.js 16 App Router.
- React 19.
- TypeScript 5.
- Tailwind CSS v4.
- Supabase Postgres.
- Supabase Storage.
- Supabase Row Level Security.
- Clerk authentication and organization-aware access.
- Vercel deployment.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `app/` | Next.js App Router routes only — Server Components fetch and compose. |
| `modules/<domain>/` | Domain modules (`data/`, `domain/`, `ui/`), one per PRD functional requirement. |
| `shared/` | Props-only UI primitives, UI domain types, and the mock seed dataset. |
| `lib/supabase/` | External data boundary: client/server factories and generated `database.types.ts`. |
| `supabase/migrations/` | Canonical schema and RLS policies. New migrations are additive. |
| `tests/unit/` | Vitest unit tests for mappers and module `domain/` layers. |
| `RULES.md` | Non-negotiable invariants (security, module boundaries, design system). |
| `CLAUDE.md` | Architecture guidance and the *why* behind the invariants. |
| `CONTEXT.md` | Domain model and ubiquitous language. |
| `docs/adr/` | Architecture decision records. **ADR-001 supersedes any conflicting "billing = preparation signal only" wording elsewhere in the docs.** |
| `docs/MASTER_PRD_SRS.md` | Product source of truth. |
| `docs/TRD.md` | Engineering companion to the PRD. |
| `docs/IMPLEMENTATION_PLAN.md` | Phased delivery plan. |
| `docs/MVP_PRD.md` | Earlier MVP scope document; `MASTER_PRD_SRS.md` is the product source of truth. |
| `docs/GITHUB_PROJECTS_INTEGRATION.md` | GitHub Projects workflow notes. |
| `docs/GITHUB_PROJECT_BACKLOG.md` | MVP backlog prepared for GitHub Issues and Projects. |
| `DESIGN.md` | Product design direction and interface rules. |
| `colors_and_type.css` | Design tokens and typography reference. |

## Local Development

This repository uses **pnpm** — `pnpm-lock.yaml` is the only lockfile. Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Run lint checks:

```bash
pnpm lint
```

Typecheck (strict; no dedicated script):

```bash
pnpm exec tsc --noEmit
```

Run unit tests once:

```bash
pnpm test
```

Run unit tests in watch mode:

```bash
pnpm test:watch
```

Build for production:

```bash
pnpm build
```

Serve the static design preview bundle on port 5000:

```bash
pnpm preview
```

## Project Links

- GitHub repository: https://github.com/shuakyle21/tesda-compliance-manager
- GitHub Project: https://github.com/users/shuakyle21/projects/4
- FigJam planning board: https://www.figma.com/board/8yXIDELlmyLxGb8VGHTCXw

## Application Screenshots
### Login Page
![Login Page](<screenshots/login page.png>)

