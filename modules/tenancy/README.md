# modules/tenancy — Tenant and Role-Based Access Control (FR-02)

Multi-tenant context and role model. Tenant context lives in the URL path segment (ADR-001); RLS is the security boundary — UI hiding is usability only.

## Contents
- `domain/profile.ts` — `Profile`, `hasTenantMembership` (role lives on `Profile.role: UserRole`, the same type `modules/auth/data/role.ts` resolves against — no separate role vocabulary)
- `data/tenancy.ts` — `getProfileSnapshot(clerkUserId)` (fetch/map, mirrors `modules/batches/data/batches.ts`'s pattern). First-sign-in provisioning is handled elsewhere: the Clerk `user.created` webhook (`app/api/webhooks/clerk/route.ts` → `modules/auth/data/provisioning.ts`) creates the `profiles` row via a service-role client, `role: 'viewer'`, no tenant membership — both stay admin-assigned. This module only reads that row.

## Planned
- Trainer-facing DTO filtering (billing/financial fields omitted server-side) is enforced here + in each module's `data/` layer
