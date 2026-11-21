---
type: Architecture
title: Tenant Isolation — Scope Selection on Top of RLS
description: Why RLS alone is not the isolation story at runtime — the anon client that carries identity, URL tenant selection validated against memberships, why queries still filter tenant_id, the service-role escape hatch, and the failure modes where JS filtering or a service client leaks rows across schools.
tags: [security, rls, tenancy, authorization, failure-modes, invariants]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-21T03:38:28.236Z
sources:
  - id: openwiki-source-c6dae8084d42ad61957f6c24
    resource: repo://app/(dashboard)/overview/page.tsx
  - id: openwiki-source-a91e40a49a660ad476d08b65
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/activity-log/page.tsx
  - id: openwiki-source-c30669730475f4aa9f33c2b1
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/billing/page.tsx
  - id: openwiki-source-79e2020a0930b43798845956
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/report/page.tsx
  - id: openwiki-source-ce194fb513f902915fafa99b
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/actions.ts
  - id: openwiki-source-fac1d0830b5bfbb903fdd40f
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/dashboard/page.tsx
  - id: openwiki-source-7ded6d9e4b97a5fd4dd6e34e
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/layout.tsx
  - id: openwiki-source-34483bdeb5950b355468581b
    resource: repo://app/(dashboard)/tenant-access.ts
  - id: openwiki-source-20d1ca31256bf756f33f5462
    resource: repo://app/(dashboard)/tenant-scope.ts
  - id: openwiki-source-f8cfb11c14504e1f5bffb66c
    resource: repo://app/(dashboard)/trainer/page.tsx
  - id: openwiki-source-6e6cc525e98e274ad6c10b29
    resource: repo://app/(dashboard)/users/new/actions.ts
  - id: openwiki-source-e6f02f5d20be6272be761347
    resource: repo://lib/supabase/server.ts
  - id: openwiki-source-4afc6c67d0142492979e14f5
    resource: repo://lib/supabase/service.ts
  - id: openwiki-source-2aff630ed0688d80b1b707c8
    resource: repo://modules/auth/data/provisioning.ts
  - id: openwiki-source-3da0446fc6c5da744a43e0a3
    resource: repo://modules/auth/data/role.ts
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-6af3f09918cb46eabe775144
    resource: repo://modules/batches/domain/metrics.ts
  - id: openwiki-source-2cad937ecfecf0d996572e65
    resource: repo://modules/batches/ui/KpiSummary.tsx
  - id: openwiki-source-1d56d4ea0a3a5a0ef9c322a5
    resource: repo://modules/shell/ui/MetricsRow.tsx
  - id: openwiki-source-3f1f3f4919f6d868d27df2e3
    resource: repo://modules/tenancy/data/platform.ts
  - id: openwiki-source-6d398bd6713150c971d852b0
    resource: repo://modules/tenancy/data/tenancy.ts
  - id: openwiki-source-4a6c5a1d0a57f700524b0a69
    resource: repo://modules/tenancy/domain/access.ts
  - id: openwiki-source-b5e9a80328ba1dcd462db5c3
    resource: repo://modules/tenancy/domain/scope.ts
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-03656dd9cbbc89345a506c19
    resource: repo://supabase/migrations/20260528160300_create_tenant_scoped_schema.sql
  - id: openwiki-source-6d151b9adff3e78556c9a327
    resource: repo://supabase/migrations/20260904120000_add_user_admin_write_policies.sql
  - id: openwiki-source-fc8bca54fd802af39662de6c
    resource: repo://supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql
  - id: openwiki-source-13117a840913dd27670d0422
    resource: repo://supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql
  - id: openwiki-source-10f9f8c998debff047489862
    resource: repo://supabase/migrations/20261111120000_add_t2mis_terminal_report_fields.sql
  - id: openwiki-source-4b1944144311805b722ef6ef
    resource: repo://tests/unit/dashboard-domain.test.ts
  - id: openwiki-source-a44fada99b4a2a21da27cb2e
    resource: repo://tests/unit/rqm.test.ts
  - id: openwiki-source-763cabdcd60de0e5da8f9a60
    resource: repo://tests/unit/supabase-server.test.ts
  - id: openwiki-source-0fd3605db2590862922583b6
    resource: repo://tests/unit/tenant-access.test.ts
  - id: openwiki-source-15e8a5a27099d775d1c019e1
    resource: repo://tests/unit/tenant-scope.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-21T03:38:28.236Z" }
---

# Tenant Isolation — Scope Selection on Top of RLS

Isolation has two halves. The boundary is Postgres RLS: which rows a caller may see is decided by policy, never by application code. The half this page owns is **selection** — how a signed-in caller is pointed at one school inside the set RLS already allows, why the query still carries `tenant_id` afterwards, and where the two mechanisms can be confused for each other.

The policy bodies, the `app_private` helpers and the per-table policy map live on [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md); the request path itself is [Next.js Routing and the Request Path](/openwiki/architecture/nextjs-routing-and-request-path.md). Three invariants frame everything below, all `[review]`-enforced in `RULES.md` §1 and all locked by ADR-001: RLS is the boundary and UI hiding is usability (rule 1), a JS tenant check used as access control is a bug even when it returns the right answer (rule 2), and the service-role key must never reach client code (rule 3). None fails `pnpm lint`, `pnpm exec tsc --noEmit`, or any test.

## The two clients, and which one a departure means

`lib/supabase/server.ts` is the default and the only client an ordinary read or write may use. It holds the anon key plus the caller's Clerk session via the `accessToken` callback — invoked with no template argument because `app_private.current_clerk_user_id()` needs only `auth.jwt() ->> 'sub'` and looks profile, role and memberships up in the database. The callback is re-invoked on expiry rather than being a static header, and it **throws** `NO_CLERK_TOKEN_MESSAGE` when `getToken()` returns `null`: RLS answers an anonymous query with zero rows *and no error*, which a compliance tool cannot distinguish from "this user has nothing". At the data layer the throw lands in the existing `catch` as `sync-failed` ([`getProfileSnapshot`](/modules/tenancy/data/tenancy.ts#L148-L151)); [`tests/unit/supabase-server.test.ts`](/tests/unit/supabase-server.test.ts#L114-L124) pins the throw against a silent `anon` client.

`lib/supabase/service.ts` is the **escape hatch**: `createSupabaseServiceClient()` builds a client from `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses RLS entirely**. No policy evaluates, so the client's own `where` clauses are the only thing narrowing rows — the one place in the app where an absent tenant filter is a leak rather than a wide-but-correct read. Its contract is written into its header: use it only for trusted server-to-server work with no Clerk session, import it only from server-only code, and never prefix the key `NEXT_PUBLIC_`. There is exactly one importer today, [`modules/auth/data/provisioning.ts`](/modules/auth/data/provisioning.ts#L58-L166), reached only through the Clerk webhook; `eslint.config.mjs` encodes no rule for it, so "no service client in a page" is a review obligation, not a lint one. What the webhook writes — profile rows, `is_active = false` on delete — is on [User Provisioning and Membership](/openwiki/workflows/user-provisioning-and-membership.md).

The service role also forfeits the "could not check" signal. On the Clerk-scoped client an empty membership list means "none this admin can see"; under the service role it means none, full stop, which is why `ensure_profile_tenant_membership` can set `is_default: true` from an atomic zero-membership gate where the admin UI cannot ([`provisioning.ts`](/modules/auth/data/provisioning.ts#L124-L129), [migration](/supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql#L1-L29)).

## Selection is not authorization

Rule 2 bans a JS tenant check **used as** access control. The failure mode is not a leak today but drift: a query written as if RLS did not exist keeps working when a policy is widened, and the reviewer of that policy has lost the reader who could see the consequence. The one sanctioned shape is a filter taken from a validated `TenantScope`:

```ts
scopeForCode(profile, code)   // → TenantScope | null, built ONLY from profile.tenants
supabase.from('batches').eq('tenant_id', scope.tenantId)   // selection, on top of RLS
```

[`modules/tenancy/domain/scope.ts`](/modules/tenancy/domain/scope.ts#L1-L57) is where the validation lives, and it is deliberately pure — it reads `profile.tenants`, itself an RLS-scoped read of `profile_tenant_memberships` under `can_access_tenant(tenant_id)` ([policy](/supabase/migrations/20260528160300_create_tenant_scoped_schema.sql#L494-L498)), and matches codes case-insensitively. A foreign or unknown code yields `null`, **never a fallback to "all schools"**. `defaultScope` is the only fallback path and it is used for *redirects*, not in-place broadening. [`tests/unit/tenant-scope.test.ts`](/tests/unit/tenant-scope.test.ts#L24-L43) pins all four properties — membership-only construction, the default ordering (flagged membership, then first, then none), and path round-tripping.

`tenant_id` never appears in `app/` code. Pages hand `scope.tenantId` to a module's `data/` function and the filter is written only in the query, under a comment saying so ([`getBatchesSnapshot`](/modules/batches/data/batches.ts#L339-L344), [`setBatchRqmCode`](/modules/batches/data/batches.ts#L378-L399)). Copying the `.eq` into a route, or filtering a returned array by tenant in JS, is the drift the rule describes.

<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
`app/(dashboard)/tenant-scope.ts` is the composition point, not a new rule: it lives in `app/` because it joins `modules/auth` identity to `modules/tenancy` profile data and no module may import another's `data/`. `resolveRouteScope` is `cache()`-wrapped so a layout and its page share one profile read per request, and it collapses the profile snapshot into a `RouteScope` verdict — `unknown` stays distinct from `no-tenant-access`, and a non-member keeps the caller's `defaultScope` as a `fallback` for the link rather than a substitute scope ([`tenant-scope.ts`](/app/(dashboard)/tenant-scope.ts#L38-L52)). The segment layout turns each non-`ok` verdict into a rendered state instead of a 404 ([`layout.tsx`](/app/(dashboard)/t/[tenantCode]/layout.tsx#L26-L49)). Pages use `requireScope`, which returns `null` for any non-`ok` verdict, so **a page with no scope has no tenant id to query with** — security never rests on the null. `requireScope` is also where trainer-screens redirect to `/trainer`, in the page path rather than the layout because a layout does not re-run on every navigation ([`tenant-scope.ts`](/app/(dashboard)/tenant-scope.ts#L54-L76)).

What a write does with the scope matters more than what a read does. [`t/[tenantCode]/actions.ts`](/app/(dashboard)/t/[tenantCode]/actions.ts#L91-L116) re-resolves the school from the URL code **on the server** — no tenant id is ever read from the form — then takes the role from `profiles.role` via `resolveTrustedRole`, and states that both are "defence in depth and usability; the boundary is the `batches` UPDATE policy, which for anyone else matches zero rows". That zero-row update surfaces as one status, `conflict-or-denied`, shared deliberately with a concurrent edit ([`setBatchRqmCode`](/modules/batches/data/batches.ts#L411-L412)); the layer pattern is on [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).

<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
A scope *can* be redundant and still be right. `getBatchesSnapshot(tenantId?)` appends the filter only when an id is passed; `/overview` and `/trainer` pass none and are correct because a policy already narrowed the rows. `/overview` is the one office screen that must not be scoped by path — it reads every school the caller belongs to and groups the figures by school so nothing is summed under one school's name (the audit I1 shape), labelling the groups from `profile.tenants` while the row set stays RLS's ([`overview/page.tsx`](/app/(dashboard)/overview/page.tsx#L1-L45)).

## The boundary a service client steps outside

Three failure modes follow directly from the two-client split. Each compiles, lints and passes the suite:

- **A tenant filter copied out of a `data/` function into a route.** Harmless while the policy holds, and the moment a policy widens, two spellings of the filter exist and neither is authoritative.
- **A service client in a page.** The page now reads across every school in the database, so a missing `tenant_id` filter silently becomes a cross-school read with no policy to catch it, and `null` memberships no longer read as "could not check".
- **A membership check re-implemented in JS** ("is the code in `profile.tenants`?") instead of `scopeForCode`, so the case-folding and the never-broaden rule get re-derived per route and diverge.

## Proving it

The evidence base is thinner than the model deserves: there is one hosted project and no staging, `tests/integration/` and `tests/security/` do not exist, and rule 35's real-Supabase isolation cases sit behind rule 36's `[deny]` permission ask. Every authorization statement in the wiki is therefore read out of the migrations and the route code; the unit suite pins the JS half only — scope construction, `resolveTrustedRole`'s `profiles.role`-only authority, and the no-token throw. Treat a migration as intent and an executed read as the only proof the chain is wired. [Verification and Test Strategy](/openwiki/operations/verification-and-test-strategy.md) owns the gap and the trap of trusting a green check.

## Extending safely

- **Adding a tenant-scoped read:** enable RLS, write the policy through an `app_private` helper, then ask whether your pre-filter does the policy's job. Put the school in the URL when the screen is per-school; omit it only when a policy already narrows the rows.
- **Adding a scoped screen:** take `/t/[tenantCode]` and call `requireScope` — never `resolveRouteScope` directly, or you drop the trainer redirect. Add the section to `SCOPED_SECTIONS` before writing the query; a screen that reads every school under one school's name was audit I1.
- **Needing the service role:** first check the caller actually has no session to scope by. If they do, a policy is the cheaper answer, and the filter you would have written in JS belongs in the query either way.
- **Proving any of it:** write the two-users-two-tenants case into `tests/integration/` against real Supabase (rule 35, no mocks) and budget for rule 36's ask. Until then, the migration is canonical.
