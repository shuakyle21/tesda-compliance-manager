# Auth And Tenancy

**RLS is the security boundary; UI hiding is usability only.** Every authorization decision is made in Postgres.

## The auth chain

1. Clerk middleware (`proxy.ts`) protects everything except `/sign-in`, `/sign-up`.
2. `lib/supabase/server.ts` gets a Clerk JWT via `getToken({ template: 'supabase' })` — a Clerk JWT template named **exactly `supabase`** must exist with the user id as `sub`. A missing template is a top operational failure mode.
3. The JWT is attached as a bearer token on a supabase-js client created with the **anon key** — the **service-role key must never reach client code**.
4. Postgres RLS helper functions in `app_private.*` read the JWT and decide everything.

## RLS helper functions

| Function | Purpose |
| --- | --- |
| `current_clerk_user_id()` | Extract Clerk `sub` from the JWT |
| `current_profile_id()` / `current_role()` | Resolve the caller's profile and role |
| `can_access_tenant(tenant_id)` | Caller has a membership for the school |
| `can_manage_tenant(tenant_id)` | Admin/Coordinator writes within an assigned school |
| `can_read_batch(batch_id)` | Tenant reads + Trainer assigned-batch reads |
| `can_trainer_write_batch(batch_id)` | Trainer writes on assigned batches only |

## Tenancy model (ADR-001 K1/L1)

- **Membership is plural and persistent** (`profile_tenant_memberships` — the RLS basis, canonical over the legacy `tenant_ids` array).
- **Active context is singular and lives in the URL path**: `/{tenant}/dashboard` for the admin/coordinator/viewer tree. SSR-native, shareable, never dropped. Single-tenant users auto-redirect (no chooser).
- **One context = one tenant** — no cross-school aggregate view; a multi-school coordinator switches schools to compare.
- **Trainer routes address by batch** (`/trainer/classes/[batchId]/…`), not by tenant — the batch carries its own `tenant_id`.
- Storage objects are isolated by a tenant-UUID path prefix ([[Document Checklist And Evidence]]).

## Defense in depth

Clerk middleware (no session → no app) → Server Component / handler (loads profile + memberships, omits restricted fields, falls back to least-privilege `viewer` when unresolved) → RLS (final authority). Known gap: the authoritative tenant-role resolver isn't wired yet; the dashboard accepts `?role=`/`?state=` preview overrides until TES-34 lands (Phase 0.5 of the [[Implementation Roadmap]]).

## Related

- [[Roles And Permissions]] — what each role may do
- [[Architecture Overview]]
- [[Testing Strategy]] — tenant isolation is a 100%-scoped success metric

Sources: [[TRD]] §3, §16 · [[ADR-001-billing-and-domain-model]] §7 · [[MASTER_PRD_SRS]] FR-01/FR-02, §12
