# modules/tenancy — Tenant and Role-Based Access Control (FR-02)

Multi-tenant context and role model. Tenant context lives in the URL path segment (ADR-001); RLS is the security boundary — UI hiding is usability only.

## Contents
- `domain/profile.ts` — `ProfileRole`, `Profile`, `TenantMembership`, role guards (`isProfileRole`, `hasTenantMembership`)

## Planned
- `data/` — profile + tenant-membership fetch/map once the real tenant/role resolver lands (TES-34, replaces `?role=`/`?state=` preview overrides)
- Trainer-facing DTO filtering (billing/financial fields omitted server-side) is enforced here + in each module's `data/` layer
