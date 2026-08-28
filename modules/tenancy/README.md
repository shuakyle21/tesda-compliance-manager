# modules/tenancy — Tenant and Role-Based Access Control (FR-02)

Multi-tenant context and role model. Tenant context lives in the URL path segment (ADR-001); RLS is the security boundary — UI hiding is usability only.

## Contents
- `domain/profile.ts` — `Profile`, `hasTenantMembership` (role lives on `Profile.role: UserRole`, the same type `modules/auth/data/role.ts` resolves against — no separate role vocabulary)
- `data/tenancy.ts` — `getProfileSnapshot(clerkUserId)` (fetch/map, mirrors `modules/batches/data/batches.ts`'s pattern) and `ensureProfile(clerkUserId, email, fullName)` (idempotent upsert on first sign-in, `role: 'viewer'`, no tenant membership — both stay admin-assigned)

## Planned
- Wiring `ensureProfile` into the sign-in path itself (e.g. the dashboard layout) — it exists but isn't called from anywhere yet
- Trainer-facing DTO filtering (billing/financial fields omitted server-side) is enforced here + in each module's `data/` layer
