---
type: Architecture
title: Tenant Isolation and the RLS Boundary at Runtime
description: What tenant isolation means once a caller is signed in — the RLS-scoped read that carries identity, scope selection versus authorization, the no-tenant-access verdict and its fold, and the standing risk that a JS tenant check silently replaces RLS.
tags: [security, rls, tenancy, authorization, failure-modes, invariants]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-18T03:56:44.398Z
sources:
  - id: openwiki-source-c6dae8084d42ad61957f6c24
    resource: repo://app/(dashboard)/overview/page.tsx
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
  - id: openwiki-source-10f9f8c998debff047489862
    resource: repo://supabase/migrations/20261111120000_add_t2mis_terminal_report_fields.sql
  - id: openwiki-source-4b1944144311805b722ef6ef
    resource: repo://tests/unit/dashboard-domain.test.ts
  - id: openwiki-source-763cabdcd60de0e5da8f9a60
    resource: repo://tests/unit/supabase-server.test.ts
  - id: openwiki-source-0fd3605db2590862922583b6
    resource: repo://tests/unit/tenant-access.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T03:56:44.398Z" }
---

# Tenant Isolation and the RLS Boundary at Runtime

This page is the runtime half of the isolation model: what actually carries a caller's identity into Postgres, what the application layer is allowed to decide on its own, and where the app must *deny* rather than merely hide. The schema, the `app_private` helper bodies and the per-table policy map live on [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md); this page links them rather than reproducing them.

Two invariants frame everything below, both `[review]`-enforced in `RULES.md` §1 (rules 1 and 2) and both locked by ADR-001: **RLS is the boundary and UI hiding is usability** (rule 1), and **a JS tenant check used as access control is a bug even when it returns the right answer** (rule 2). Neither fails `pnpm lint`, `pnpm exec tsc --noEmit`, or any test. That is why they are written down.

The evidence base is thinner than the model deserves. There is **one hosted project and no staging**, so rule 35's real-Supabase RLS tests cannot simply be run, and rule 36 (`[deny]`) puts any statement against that project behind an explicit permission ask. `tests/integration/` and `tests/security/` do not exist. Every authorization statement on this page is therefore *read out of the migrations and the route code*; the unit suite pins the JS verdicts, never a policy. A migration file is the intent, and a read the app performs today is the only proof the chain is wired.

## Identity reaches Postgres as a session, not a claim the app passes

`lib/supabase/server.ts` is the whole bridge, and it is an **anon-key** client — never the service-role key, which is confined to `lib/supabase/service.ts` for the one path with no session (the Clerk webhook). The `accessToken` callback re-invokes `getToken()` so a long-lived client never reuses an expired token, and it is called **with no template argument** because the schema needs no custom claims: `app_private.current_clerk_user_id()` reads `auth.jwt() ->> 'sub'` and then *looks the profile, role and memberships up in the database*, so nothing outside the session can widen access. Also see [Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) for why each helper is `security definer` with `search_path = ''`.

The load-bearing part is the **throw**. A missing token returns `null` from `getToken()`, and the client throws `NO_CLERK_TOKEN_MESSAGE` rather than building an unauthenticated client: RLS answers an anonymous query with zero rows *and no error*, a state indistinguishable from "this user has nothing" in a compliance tool. The sentinel is exported, `/api/debug/auth-check` matches it, and at the data layer the throw lands in the existing `catch` as `sync-failed` ([`getProfileSnapshot`](/modules/tenancy/data/tenancy.ts#L132-L152)).

Deactivation rides the same chain: the helpers resolve through `profiles.is_active`, so what the Clerk `user.deleted` webhook writes drops access at the next request with no revocation list to maintain.

## Selection is not authorization

Rule 2 bans a JS tenant check **used as access control**, even when it returns the right answer. The failure mode is not a leak today, it is drift: a query written as if RLS did not exist silently keeps working when a policy is widened, and the person reviewing the policy no longer has a reader who can see the consequence. The one sanctioned shape is a filter taken from a validated `TenantScope`:

```ts
scopeForCode(profile, code)   // → TenantScope | null, built ONLY from profile.tenants
supabase.from('batches').eq('tenant_id', scope.tenantId)   // selection, on top of RLS
```

`tenant_id = scope.tenantId` with a scope in hand is allowed. It picks one of the schools RLS already allows and grants nothing else; the route that stops validating is the one that regresses. [`modules/tenancy/domain/scope.ts`](/modules/tenancy/domain/scope.ts) builds a scope from `profile.tenants` alone — itself an RLS-scoped read of `profile_tenant_memberships` (row policy `can_access_tenant(tenant_id)`) — and compares codes case-insensitively, so a foreign or unknown URL code yields `null` and **never a fallback to "all schools"**. [`tests/unit/tenant-scope.test.ts`](/tests/unit/tenant-scope.test.ts) pins that one-way door plus the `resolveTrustedRole` half of the role boundary.

The scope itself is resolved once per request by the tenant segment's layout, which turns a null into a rendered state rather than a 404 — the routing arm is on [Next.js Routing and the Request Path](/openwiki/architecture/nextjs-routing-and-request-path.md). What matters here is what the server action behind a write does with it. [`t/[tenantCode]/actions.ts`](/app/(dashboard)/t/[tenantCode]/actions.ts#L13-L20) names both layers explicitly: the school comes from the URL code re-resolved on the server — **no tenant id is ever read from the form** — the role comes from `profiles.role` via `resolveTrustedRole`, and then the action states that both checks are "defence in depth and usability; the boundary is the `batches` UPDATE policy, which for anyone else matches zero rows". That zero-row update surfaces as one status, `conflict-or-denied`, deliberately shared with a concurrent edit (see [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md)).

Two related scoping facts worth knowing before touching a fetch:

- **An unscoped client is safe only because a policy narrows it.** [`getBatchesSnapshot(tenantId?)`](/modules/batches/data/batches.ts#L330-L345) appends `.eq('tenant_id', tenantId)` only when an id is passed. `/trainer` and `/overview` pass none; both are correct for the same reason — RLS already narrowed the rows (`can_read_batch` to a trainer's assignments, `can_access_tenant` to an admin's memberships).
- **`/overview` is the one office screen that must not be scoped by path.** It reads every school the caller belongs to and groups every figure by school, so nothing is summed under one school's name — the audit I1 shape. It groups on `profile.tenants` in application code to *label* the result; the set of rows is still RLS's.

## The empty read: a verdict, and the fold that uses it

RLS is *good* at silence, which is the one thing the UI cannot read. A caller with zero memberships gets an empty, successful read from every tenant-scoped table — correct, and far too easy to render as "No assigned batches — import one", an action they cannot perform. [`modules/tenancy/domain/access.ts`](/modules/tenancy/domain/access.ts) exists to name the difference:

| Verdict | Meaning | Render |
| --- | --- | --- |
| `granted` | at least one membership | ordinary empty states are true |
| `none` | no membership | `NoTenantAccessState` |
| `unknown` | could not check | nothing changes |

No query produces this verdict — RLS reports `none` as success — so it is derived from the profile snapshot by [`deriveTenantAccess`](/modules/tenancy/data/tenancy.ts#L158-L177), with `not-found` → `none` (a signed-in user with no profile row is unassigned too) and `sync-failed`/`unconfigured` → `unknown`. `unknown` must never render as `none`: falling through would tell a fully provisioned coordinator they were never assigned a school.

The verdict is applied by route code calling `withTenantAccess(snapshot, access)`, whose precedence is exact:

```ts
access === 'none' && snapshot.status === 'ok' ? { status: 'no-tenant-access' } : snapshot
```

It replaces **only** an `ok` snapshot. A `sync-failed` or `unconfigured` passes through untouched, because "you belong to no school" is a tidier story than "the fetch broke" and would bury the rule-19 banner; `unknown` changes nothing because an unverified verdict must not rewrite a successful read. [`tests/unit/tenant-access.test.ts`](/tests/unit/tenant-access.test.ts) pins both rules precisely because a refactor to `status === 'ok' ? … : …` would look like a simplification.

`withTenantAccess` lives in `domain/`, not in the route fold, because another module's `data/` is private (rule 8) and the fold must be callable from `app/` *and* from any module. The two screens that already hold a profile snapshot (billing, report) call `deriveTenantAccess` on it directly rather than fetching membership twice; the rest use `tenantAccessOf(profile)` off the scope they were handed.

<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
The correct order is resolve scope → derive access → fold → *then* the screen's guard ladder, which checks failure before emptiness. The dashboard's `guardState` puts `syncFailed && batchCount === 0` ahead of both the `no-tenant-access` arm and the empty arm for the same reason ([dashboard/page.tsx](/app/(dashboard)/t/[tenantCode]/dashboard/page.tsx#L136-L171)); a failed fetch yields zero rows and would otherwise satisfy a misleading empty state.

<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [/app/(dashboard] file "/app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
Billing is the shape **not** to copy: it returns `null` for the layout on a non-`ok` scope ([billing/page.tsx](/app/(dashboard)/t/[tenantCode]/(sections)/billing/page.tsx#L36-L37)), and `null` is also the `no-tenant-access` profile verdict — so below the layout the two are indistinguishable. It is safe only by luck: with no memberships there is no school to reach a `/t/<code>/…` URL with, so the layout always renders the state. Report has the same shape and same dependency ([report/page.tsx](/app/(dashboard)/t/[tenantCode]/(sections)/report/page.tsx#L36-L37)).

## Viewer read-only: server denial, not a hidden control

Rule 4 is stated as *server-denied*, and "the button is gone" does not satisfy it — a viewer can replay the request. Viewer is read-only because no write policy admits it: `can_manage_tenant()` requires `current_role() in ('admin','coordinator')`, `can_trainer_write_batch()` requires `trainer`, and viewer appears in exactly three policies, all `for select`. The role is resolved from `profiles.role` only, never Clerk metadata; the trusted-versus-preview split belongs to [Tenant Scoping and Role Authority](/openwiki/workflows/tenant-scoping-and-role-authority.md).

## Trainer trimming: server omission, and its RLS half

Rule 5 has two enforcement halves and they are not interchangeable. The **RLS half** is `can_read_batch()`, which narrows a trainer to `b.trainer_profile_id = current_profile_id()`; `learner_details` (contact, birth date, employer, salary) reads only for `admin`/`coordinator`/`viewer` because **RLS filters rows, not columns**. The **omission half** is narrow here and does not work the way the neighbouring pages describe: nothing is called `hideBilling`.

`/trainer` fetches with **no** scope and passes the display rows through `deriveTrainerMetrics`, which **strips the billing keys from the object itself** rather than typing them away (rule 5) — [`tests/unit/dashboard-domain.test.ts`](/tests/unit/dashboard-domain.test.ts#L120-L129) asserts the four keys are absent and that no billing date survives `JSON.stringify`. [`MetricsRow`](/modules/shell/ui/MetricsRow.tsx#L12-L25) is a thin placement wrapper used by the trainer dashboard alone and takes `TrainerDashboardMetrics`; [`KpiSummary`](/modules/batches/ui/KpiSummary.tsx#L132-L154) is shared, so the school dashboard passes `billing={metrics}` and renders `NextBillingCard`, while the trainer row passes nothing and **does not emit the element at all**. A missing prop, not a boolean flag and not CSS — the shape to plan for when adding a card.

The rest of the trainer boundary is redirects keyed on `resolveTrustedRole`, never the `?role=` preview: `/billing` and `/report` both `redirect('/trainer')` before fetching, and `/overview` is admin-only on arrival. `/trainer` sits outside the tenant segment precisely because a trainer's slice is not "one school".

## Where this goes wrong

Each of these compiles, lints, and passes the suite:

- A `tenant_id` filter added to make a screen parent-scoped while a policy still allows a wider read — it hides the drift until the policy is widened.
- A guard ladder that checks "empty" first, or a `null`-for-everything early return that collapses `no-tenant-access` into "render nothing".
- `deriveTenantAccess` normalising `sync-failed` to `none`, or `withTenantAccess` applied to a non-`ok` snapshot.
- A trainer redirect gated on `resolveRouteRole`, so `?role=admin` skips `/billing`.
- `accessToken: async () => getToken()` with no null check — one genuinely empty-looking page per expired session.
- Billing figures passed as `{}`-defaulted props to `KpiSummary` on a trainer screen, so the card renders with "—" and the payload still carries them.

## Extending safely

- **Adding a tenant-scoped read:** enable RLS on the table, write the policy through an `app_private` helper, and check the caller lacks a pre-filter that would *do the policy's job*. Put the scope in the URL before the query when the screen is per-school; leave it out only when a policy already narrows the row set.
- **Adding a scoped section:** it must appear in `SCOPED_SECTIONS` before its query is written — a screen that reads every school under one school's name was audit I1.
- **Proving any of it:** write the RLS case into `tests/integration/` against real Supabase (rule 35, no mocks) and budget for rule 36's ask before touching the hosted project. Until that lands, the migration is canonical and the unit suite proves only the JavaScript.
