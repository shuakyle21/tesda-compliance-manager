# Auth Module

**FR:** FR-01 — identity and sign-in
**Path:** `modules/auth/` (`data/auth.ts`, `ui/`)
**Status:** partial — data + ui layers present, no domain layer yet

Clerk is the identity provider; the module resolves the current user/session that the Clerk→Supabase JWT bridge relies on. Authorization itself is enforced in Postgres via RLS, not here.

**Concept:** [[Auth And Tenancy]]

[[Codebase Map]]
