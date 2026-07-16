# Tenancy Module

**FR:** FR-02 — multi-tenant context
**Path:** `modules/tenancy/` (`domain/`)
**Status:** partial — domain layer only

Tenant context lives in the URL path segment (locked ADR-001 fact). RLS scopes every row by tenant, so JS never filters by tenant manually. The real tenant/role resolver is still pending (TES-34); the dashboard accepts `?role=`/`?state=` preview overrides until then.

**Concept:** [[Auth And Tenancy]]

[[Codebase Map]]
