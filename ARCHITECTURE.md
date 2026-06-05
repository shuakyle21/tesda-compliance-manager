# Update `ARCHITECTURE.md` to Hybrid Laravel + Supabase Stack

## Summary
Revise the architecture plan to reflect the actual current direction: **Supabase remains the current database/storage layer**, while **Laravel is the recommended backend/API layer for future production hardening** because it is widely used by Philippine institutions and local teams.

## Key Changes
- Update the tech stack to:
  - Next.js 16 App Router frontend
  - React 19
  - TypeScript 5
  - Tailwind CSS v4
  - Supabase Postgres as the current primary database
  - Supabase Storage for uploaded compliance evidence
  - Supabase migrations for schema history
  - Laravel API as the recommended future backend/service layer
  - Vercel for frontend deployment
  - Laravel-compatible hosting only if/when the API layer is added

- Add a “Backend Direction” note:
  - Current MVP uses Supabase directly for database, storage, and tenant-scoped schema work.
  - Laravel should be introduced later if the project needs a more conventional institutional backend for APIs, policies, reports, scheduled jobs, document workflows, and maintainability by PH-based teams.
  - Laravel should not be described as already implemented.

- Keep Supabase-specific sections intact where they match current repo state:
  - Supabase Postgres
  - Supabase Storage
  - Supabase migrations
  - Tenant-scoped schema
  - RLS where already planned or implemented

- Clarify the Laravel/Supabase relationship:
  - Supabase is the current operational database.
  - Laravel can act as the backend API and business-logic layer.
  - PostgreSQL remains the underlying data model.
  - TVI-CAMS remains an internal monitoring/reporting system and does not replace TESDA SIS/T2MIS/BSRS.

## Documentation Boundaries
- Update `ARCHITECTURE.md` only.
- Do not edit code, migrations, README, or PRD in this pass.
- Do not remove existing Supabase migration references.

## Acceptance Checks
- The architecture no longer implies Laravel is already implemented.
- Supabase remains listed as the current database and storage layer.
- Laravel is framed as the recommended backend/API direction for production or future expansion.
- The rationale mentions PH maintainability and Laravel familiarity.
- The plan stays consistent with the open Supabase migration file and existing project state.

## Assumptions
- Current MVP continues using Supabase.
- Laravel is a future backend/API recommendation, not an immediate replacement.
- Next.js remains the frontend application shell.
