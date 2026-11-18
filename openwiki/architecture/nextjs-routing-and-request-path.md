---
type: architecture
title: Routing, Layout Gates and the Request Path
description: Where a route lives and what guards it — proxy.ts as a non-gating header stamper, the (dashboard) layout as the sole authentication gate, the /t/[tenantCode] segment layout's four scope outcomes and why requireScope returns null, the legacy scoped-redirect factory, the /trainer exception, and the trusted-vs-presentation role split that alone may decide a redirect.
tags: [routing, app-router, middleware, auth-gate, tenant-scope, roles, failure-modes]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-17T04:33:34.390Z
---

# Routing, Layout Gates and the Request Path

Four route responsibilities are separated deliberately, and three of them are *not* the
middleware. `proxy.ts` stamps one header; `app/(dashboard)/layout.tsx` performs the only
authentication check; the `/t/[tenantCode]` segment layout renders the only scope state; pages
fetch through `requireScope()` and never render a scope state themselves. Which of those applies
is decided by *where a file sits* in [`app/`](/app), so the tree is the authorization map, not
decoration.

This page owns the route tree and the request path. RLS as the boundary under all of it is on
[Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md); the
end-to-end scoping/role workflow is on
[Tenant Scoping and Role Authority](/openwiki/workflows/tenant-scoping-and-role-authority.md);
honest empty states are on
[Error Snapshots and Honest Empty States](/openwiki/concepts/error-snapshots-and-honest-empty-states.md).

## The request path

```mermaid
flowchart TD
    Req["Browser request"] --> Proxy["proxy.ts — clerkMiddleware"]
    Proxy --> Stamp["stamp x-pathname, NextResponse.next()"]
    Stamp --> Where{"where does the route live?"}

    Where -->|"/sign-in, /sign-up, /api*"| Open["no gate of its own"]
    Where -->|"insider (dashboard) group"| Gate

    Gate["(dashboard)/layout.tsx<br/>requireAuthenticatedUser()"] -->|no session| SignIn["redirect /sign-in"]
    Gate -->|session| Shell["shell + children"]

    Shell --> Scoped{"under /t/school/ ?"}
    Scoped -->|yes| Seg["t/tenantCode/layout.tsx<br/>resolveRouteScope code"]
    Scoped -->|no| Page

    Seg -->|ok| Page["page: requireScope() then fetch"]
    Seg -->|no-tenant-access| S1["NoTenantAccessState"]
    Seg -->|unknown| S2["could not verify + Try again"]
    Seg -->|not-a-member| S3["School not available + fallback link"]

    Page -->|"null scope"| Nothing["renders nothing beneath the layout state"]
    Page --> Data["module data/ → anon-key client + Clerk token → RLS"]
```

*Each hop of a request, and the one place on it where a real gate and a scope decision exist.*

The gate is a layout, not the middleware, because Clerk deprecated `createRouteMatcher` in favour
of checking in the component that renders protected data. That choice carries the whole
guard model: a route is protected by a group it is *inside*.

## `proxy.ts` gates nothing by design

The middleware is `clerkMiddleware` wrapping a handler whose entire body is to add
`x-pathname` from `request.nextUrl.pathname` to the forwarded headers and return
`NextResponse.next()`. No session check, no redirect, no per-path matcher.

Its `matcher` list does real work of a different kind. Besides the negative pattern that excludes
`_next` and static extensions, it names `/__clerk/(.*)` and `/(api|trpc)(.*)` — so the middleware
runs on API routes, and Clerk's inbound webhook at
[`app/api/webhooks/clerk/route.ts`](/app/api/webhooks/clerk/route.ts) reaches the app through it
rather than being short-circuited. That route is unauthenticated on purpose: Clerk signs the body
and the handler verifies it with `verifyWebhook` against `CLERK_WEBHOOK_SIGNING_SECRET`, so no
middleware exclusion is needed for it to receive requests.

The header is the middleware's second product, consumed by
[`app/(dashboard)/layout.tsx`](/app/(dashboard)/layout.tsx) to decide `isTrainerRoute` for the
shell, and by the sign-in subtree for its own layout.

**Failure modes.**

- **A gate that looks like one.** `clerkMiddleware` sounds like route protection, and the handler
  never asks whether a session exists. Anything relying on it redirects nobody.
- **A missing or empty header.** Both consumers do `headers().get('x-pathname') ?? ''`. A blank
  value silently means "office route": `isTrainerRoute` is false and every trainer-only nav
  omission lapses. On the sign-in screen the same blank collapses its variant choice to the
  office default. The server shell also cannot see the current path the way `usePathname()` can
  in a client island — [`modules/shell/ui/Sidebar.tsx`](/modules/shell/ui/Sidebar.tsx) resolves
  the active school from `usePathname()`, so the two can disagree.
- **The header is a hint, never an authority.** Nothing authorizes on `x-pathname`; a forged or
  stale value changes presentation only.

## The `(dashboard)` gate

`(dashboard)` is a route group: it does not appear in the URL, and it exists to hang one layout
over every office screen. That layout's first statement is `requireAuthenticatedUser()`, which
redirects `/sign-in` when `auth().userId` is absent and otherwise returns the id.
[`e2e/auth.spec.ts`](/e2e/auth.spec.ts) asserts exactly this — an anonymous `/dashboard` visit
must land on `/sign-in` — and its header comment records that the redirect belongs to the layout,
not to `proxy.ts`, which "only forwards the pathname header".

Three consequences worth stating plainly:

- **Outside the group is unguarded until the route adds a gate.**
  [`app/api-docs/page.tsx`](/app/api-docs/page.tsx) calls `requireAuthenticatedUser()` itself.
  [`app/sign-in`](/app/sign-in) and `/sign-up` must stay open or sign-in could not be reached,
  and [`app/api/*`](/app/api) is reached by machines: the webhook verifies a signature, and
  `/api/health` answers `{"status":"ok"}` unauthenticated on purpose. A new data route added
  outside `(dashboard)` and without its own check is public.
- **The gate needs a live check each render.** `requireAuthenticatedUser()` is not a one-time
  middleware pass; anything that lets a signed-in user reach a protected tree without it
  re-running is a hole, not a cache.
- **The layout resolves identity once and hands it down.** A single `getProfileSnapshot()` +
  `isPlatformAdmin()` `Promise.all` supplies the nav's admin row, the user card, the school
  switcher and its default. A failed profile read yields `null` role and empty tenant list rather
  than throwing, so the shell renders a smaller, honest menu (`isAdmin` false) instead of a
  larger one.

### A page still renders under a failed layout

`Postgres` errors do not abort the layout. It renders, with `role: null` and `tenants: []`, and
the page renders beneath it — possibly fine, possibly into its own failure state. Two visible
symptoms: `Sidebar`'s `NO_TENANT_NAME`/`NO_TENANT_META` fallbacks render in place of a school
name rather than a plausible-looking one, and the row-level admin/platform rows disappear — hiding, not denying, which is why the route and the
Server Action re-check the same role. `isPlatformAdmin` is the sharpest case: it is a boolean, so
a failed read merely hides "Add school", which is why the *route* distinguishes a failed check
(`sync-failed`) from a real denial rather than trusting the nav.

**`/schools/new` and `/users/new` are unscoped, but not ungated.** Both live directly under
`(dashboard)/` so they stay reachable from a trainer route where the nav lists no school row, and
each resolves its own authority server-side — the router's `isTrainerRoute` flag says nothing
about them.

## The scoped segment: `/t/[tenantCode]`

Office screens take the school from the URL path segment (ADR-001 §7 K1), because SSR, shareable
links and "never dropped" were the point. The segment layout
[`app/(dashboard)/t/[tenantCode]/layout.tsx`](/app/(dashboard)/t/[tenantCode]/layout.tsx) turns
that promise into a validated scope *before any page in the segment renders*.

Its four arms are the four variants of `RouteScope`
([`tenant-scope.ts`](/app/(dashboard)/tenant-scope.ts)):

| `resolveRouteScope` arm | Layout renders |
|---|---|
| `ok` | `children` |
| `no-tenant-access` | `NoTenantAccessState` subject `"this school"` |
| `unknown` | "Couldn't verify your school access" — usually temporary, "Try again" |
| `not-a-member` | "School not available" — links to `resolved.fallback` when a default school exists |

The `not-a-member` link is the one place the tree answers a wrong code constructively:
`scopedPath(resolved.fallback.code, 'dashboard')` sends the caller to a school they do belong to
instead of a dead end. A foreign or unknown code never falls back to "all schools" implicitly —
the URL always ends up naming one school.

The rule under all four is in
[`modules/tenancy/domain/scope.ts`](/modules/tenancy/domain/scope.ts): a scope exists only for a
school in `profile.tenants`, so it is *selection, not authorization* (RULES rule 2). Queries add
`tenant_id = scope.tenantId` on top of RLS; RLS still decides. `scopeForCode` lowercases both
sides, and `defaultScope` takes the flagged `defaultTenantId`, then the first membership, then
`null` — pinned by [`tests/unit/tenant-scope.test.ts`](/tests/unit/tenant-scope.test.ts).

### Why `requireScope` returns `null` instead of calling `notFound()`

Pages call `requireScope(params)` and `return null` when it yields no scope. `null` means the
layout is already rendering the correct state — three of the four arms — and the page simply
contributes nothing.

`notFound()` would have been the reflex. It loses because **layouts and pages render in
parallel**: a thrown 404 could beat the layout's friendlier `no-tenant-access` explanation to the
response, and the user gets a generic 404 for "you are not a member of this school". Security does
not rest on the choice either way — with no scope there is no tenant id left to query with — so
the friendlier state wins.

The two helpers are `cache()`-wrapped, so the layout's read and the page's read of the same
`tenantCode` are one profile fetch per request. `getSignedInProfile()` collapses a failed
identity read to `'unknown'` and a missing row to `'none'` — never the other way round.

**Failure modes.**

- **Cheap navigation reads as broken access.** [`app/(dashboard)/t/loading.tsx`](/app/(dashboard)/t/loading.tsx)
  sits deliberately *above* `[tenantCode]/layout.tsx`, because "a loading file does not cover its
  own folder's layout" and that layout awaits the scope. Putting a `loading.tsx` inside the
  segment instead leaves the school switch blank.
- **A state rendered twice.** A page that handles the four arms itself duplicates the layout and
  the two can diverge; a page that forgets `if (!resolved) return null` runs with an undefined
  tenant id.
- **Naming the wrong absence.** `unknown` rendered as `none` tells a provisioned coordinator they
  were never assigned a school. The `unknown`-is-not-`none` rule is the same one
  [`tests/unit/tenant-access.test.ts`](/tests/unit/tenant-access.test.ts) pins for the
  `withTenantAccess` fold.

### The legacy unscoped paths

`/batch-cards`, `/documents`, `/report`, `/table-view`, `/analytics`, `/activity-log`, `/billing`
survive for bookmarks and old links as one-line stubs from `legacyRoute(section)` in
[`app/(dashboard)/legacy-redirect.tsx`](/app/(dashboard)/legacy-redirect.tsx).
`redirectToDefaultScope()` re-encodes the caller's search params onto
`/t/<default school>/<section>` and redirects; only "no school" and "could not verify" render.
The redirect keeps `batch=`/`state=`/`role=` intact, so a deep link survives the hop.

`/dashboard` is the same machinery with a router in front of it: trainers go to `/trainer`,
admins to `/overview`, everyone else falls through to the legacy redirect. Both decisions read
`profile.role` off `getSignedInProfile()`, the trusted read.

`/t/<school>` on its own lands on `dashboard` — `parseScopedPath` defaults the section that way,
and the unscoped sidebar's `sectionHref` falls back to `/<section>`, so the two trees stay wired
to each other.

## The `/trainer` subtree

`/trainer/**` is deliberately unscoped (ADR-001 §7 K1-redirect): trainer routes address by batch,
and `batch_trainer_assignments` carries the tenant, so a trainer never picks a school. The six
scoped sections keep a private copy of the same list, so `isScopedSection` is what tells the two
apart.

The shell is told which subtree it is on through `isTrainerRoute`, derived from the header.
`Sidebar.resolveOperations` keeps only the Settings op, drops the admin and platform lists, and
`Topbar` hides the activity bell — activity is per school, and no teacher-owned screen is one.
Both are listed as guarding *explicitly* rather than by implication, so the conditions cannot
drift apart later.

## The role split is a redirect rule

Two role sources, two jobs, and confusing them is a privilege bug.

`resolveTrustedRole(dbRole)` reads `profiles.role` — the column RLS reads — and nothing else.
Clerk is identity only; the old `publicMetadata` fallback once showed one admin as ADMIN and
VIEWER on the same screen. A user with no profile row resolves `null`, not a default.

`resolveRouteRole`/`resolveDisplayRole` let `?role=` win: any caller can type a role into the URL.
So `?role=` may pick a *variant* and may never decide a *redirect*:

| Decision | Function | Why the split matters |
|---|---|---|
| `/dashboard` dispatch | `profile.role` directly | a trainer must not be routed to an office screen |
| `billing` and `report` trainer refusal | `resolveTrustedRole(dbRole)` → `redirect('/trainer')` | `?role=admin` would let a real trainer skip the gate and read billing financials |
| `t/[school]/dashboard` trainer refusal | `profile.role` from the already-validated scope | same, without a second profile read |
| `/overview` admin-only | `resolveTrustedRole(profile.role)` → `redirect('/dashboard')` | tenant-scoped role read once, no override |
| `users/new`, `schools/new` | `resolveTrustedRole` / `isPlatformAdmin()` | the nav row that leads there is only a hint |
| rendered variants | `toOfficeRole` / `resolveDisplayRole` | a preview only |

`toOfficeRole` collapses everything that is not `admin`/`coordinator`/`viewer` —
trainer, `null`, `'superuser'` — to read-only `viewer`. That least-privilege fallback is the
safety net if a trainer ever reaches an office screen, and
[`tests/unit/display-role.test.ts`](/tests/unit/display-role.test.ts) pins it along with
`resolveDisplayRole` ignoring an unrecognized `?role=` trial value. The tests call these a
*usability* gate: the real boundary is RLS — `can_manage_tenant` is
admin/coordinator only, so a viewer write is denied whether or not a button rendered.

**Failure mode.** A trainer's `?role=admin` on billing renders admin chrome while the server
refuses them — or, worse, the redirect is skipped and trainer DTOs reach an office screen. The
mirror failure is a `null` role rendering write-enabled UI, which is why the fallback is `viewer`.

## Configuration and extension rules

- **A new scoped screen** is a directory under `t/[tenantCode]/(sections)/` plus an entry in
  `SCOPED_SECTIONS`; a directory without the constant is not a valid legacy target and the
  layout will not recognize it.
- **A new unscoped screen** goes directly under `(dashboard)/` and must carry its own authority
  check if it is not readable by everyone in the tenant.
- **The segment layout is the only place that renders a scope state.** Everything else returns
  `null`.
- **`proxy.ts` needs no change for a new route.** Only the header stamping applies; an API route
  that Clerk must reach is already covered by `/(api|trpc)(.*)`.
- **A page with no `data/` layer needs nothing from this page.** `/trainer/classes` is a
  placeholder and reaches no scope.

## What the tests cover

[`tests/unit/tenant-scope.test.ts`](/tests/unit/tenant-scope.test.ts) pins scope construction
(a foreign code yields `null`, the default chain degrades to `null`), the
`scopedPath`/`parseScopedPath` round trip, and — by mocking `getCurrentUser` to say `admin` —
that `resolveTrustedRole` still answers from the DB role. `/trainer` and the segment arms have no
direct unit coverage; the e2e suite proves the layout gate and stops there. The rest of the
verification loop is on
[Verification and Test Strategy](/openwiki/operations/verification-and-test-strategy.md).fication-and-test-strategy.md).