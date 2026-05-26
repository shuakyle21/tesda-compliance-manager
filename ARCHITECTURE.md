# TESDA Farm School Compliance Manager — Architecture Alignment

## Current Project State

This repository is currently **Design System v0** for the TESDA Compliance Manager. It contains:

- A static visual system and preview library.
- An admin dashboard UI kit in `ui_kits/admin`.
- A normalized root-level Next.js scaffold in `app/`.
- Source design references in `uploads/`.

It is not yet the production compliance application. There is no tenant model, Supabase schema, Clerk organization setup, API layer, domain compliance engine, or automated alert workflow in this project yet.

## Target Product Direction

The production application should be a **multi-tenant TESDA Farm School Scholarship Compliance Manager**.

It must support any TESDA scholarship program applicable to a farm school. Scholarship programs must be represented as configurable records, not hard-coded as TWSP or CFSP branches.

TWSP and CFSP may remain useful sample or seed programs where applicable, but they are not the architecture boundary.

## Complete Tech Stack

### Application Runtime

- Next.js 16 App Router
- React 19
- TypeScript 5
- Node.js 22 LTS target for local and deployment environments
- Vercel for production hosting and preview deployments

### Styling and Design System

- Tailwind CSS v4 with CSS-first theme tokens in `app/globals.css`
- IBM Plex Sans for UI text
- IBM Plex Mono for dates, IDs, codes, numeric values, and metrics
- CSS custom properties for semantic color, spacing, radius, shadow, and motion tokens
- Tabler Icons for all interface icons
- Existing `DESIGN.md`, `colors_and_type.css`, `preview/`, and `ui_kits/admin/` as design references
- Figma file: `TESDA TVI Compliance and Document System` as the visual prototype reference

### Frontend Application Architecture

- `app/` for Next.js routes, layout, and global styles
- `src/components/` for reusable visual primitives and layout components
- `src/features/` for feature-level modules: batches, documents, analytics, activity, programs, billing
- `src/domain/` for compliance calculations and business rules
- `src/types/` for shared TypeScript models
- `src/data/mock/` for pre-Supabase mock data

### Data and Persistence

- Supabase Postgres for primary relational data
- Supabase Row Level Security for tenant isolation
- Supabase Storage for uploaded compliance documents
- Supabase migrations for schema history
- Seed files for scholarship programs, document requirements, billing rules, demo tenants, and demo batches

### Authentication and Authorization

- Clerk for authentication
- Clerk Organizations as tenant boundary
- Role model: `owner`, `admin`, `coordinator`, `viewer`
- Server-side authorization checks before all writes
- Supabase `tenant_id` on every tenant-owned table

### Automation and Notifications

- GitHub Actions for scheduled deadline and compliance checks
- Resend for email notifications
- `alerts_log` table for alert deduplication
- Optional Upstash Redis later for cache and alert deduplication hardening

### Analytics and Reporting

- Recharts for dashboard charts
- Browser CSV export for filtered operational views
- Future report-export layer for TESDA-ready summaries

### Testing and Quality

- ESLint flat config
- TypeScript strict checking through Next build
- Future Vitest unit tests for domain logic
- Future Playwright end-to-end tests for dashboard workflows
- Future accessibility checks for keyboard navigation, contrast, and ARIA labels

### Deployment and Environment

- Vercel environment variables for Clerk, Supabase, Resend, and scheduled-job secrets
- `.env.local` for local development
- Separate Supabase projects or schemas for development and production
- No service-role keys in browser-accessible code

## Architecture Fit

The current project is aligned with the target product at the visual-system level:

- Compact operational dashboard layout.
- Government-trustworthy visual tone.
- Status-first batch cards.
- Lifecycle pipeline.
- Document links.
- Billing urgency.
- Analytics and activity surfaces.

The current project is not yet aligned at the product/data layer:

- The static UI kit still uses TWSP and CFSP as demo scholarship program records.
- Program badges and filters in the UI kit are still demo-specific.
- Sample copy references three fixed batches and two fixed programs.
- There is no scholarship program catalog.
- There are no configurable document requirements or billing rules.
- There is no multi-tenant persistence model.
- There is no farm-school-specific domain model for qualifications, trainers, assessments, or certification outcomes.

## Required Product Modules

The production app should add these modules on top of this design system:

- Identity and Tenant Module: Clerk Organizations, tenant-scoped access, and role-based permissions.
- Scholarship Program Module: configurable TESDA scholarship programs, program codes, funding categories, eligibility notes, document requirements, and billing rules.
- Batch Lifecycle Module: batch profile, qualification, trainer, learners, NTP, TIP, training, assessment, certification, billing, and closure.
- Document Compliance Module: required document checklist per scholarship program and lifecycle phase.
- Deadline and Billing Module: billing readiness, deadline urgency, blockers, submission state, and overdue detection.
- Farm School Operations Module: qualifications, trainers, training sites, assessment readiness, NC/certification status.
- Analytics Module: program, batch, trainer, document, billing, and deadline risk views.
- Notifications Module: scheduled reminders for deadline risk, missing documents, and billing readiness.
- Audit and Snapshot Module: user activity logs and scheduled compliance snapshots.
- Import and Export Module: CSV imports, filtered exports, and future TESDA report formats.

## Data Model Direction

Core production tables should include:

- `tenants`
- `profiles`
- `scholarship_programs`
- `program_document_requirements`
- `program_billing_rules`
- `qualifications`
- `trainers`
- `batches`
- `learners`
- `documents`
- `assessments`
- `billing_submissions`
- `alerts_log`
- `activity_log`
- `batch_snapshots`

Every tenant-owned table must include `tenant_id`, and Supabase Row Level Security must prevent cross-tenant access.

## Design System Adjustments

The existing visual system should be retained, but product language should shift from fixed TWSP/CFSP wording to configurable scholarship-program wording.

Use:

- Scholarship Program
- Program Code
- Funding Source
- Applicable Program
- Farm School Qualification
- Required Documents
- Billing Readiness

Avoid:

- Treating TWSP and CFSP as the only possible programs.
- Assigning blue exclusively to TWSP or teal exclusively to CFSP in production logic.
- Encoding document or billing rules directly in UI components.

Status colors remain semantic and reserved:

- Red: critical deadline or error.
- Amber: warning, pending, or partial readiness.
- Green: complete, approved, on track, or ready.
- Purple: NC/certification indicators.
- Blue: information and active navigation.

Program colors should come from scholarship program configuration and must not conflict with the status color meanings above.

## Recommended Next Steps

1. Keep this repository as the source for Design System v0 and the production Next.js scaffold.
2. Treat the current admin kit as reference UI, not production application code.
3. Implement the shared dashboard shell from the Figma prototype.
4. Add mock data for batches, metrics, documents, activities, and charts.
5. Build the domain compliance engine before wiring dashboard components to live data.
6. Add database schema and seed files for configurable scholarship programs.
7. Connect Clerk, Supabase, notifications, and scheduled jobs after the static dashboard flow is stable.
