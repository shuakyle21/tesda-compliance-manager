---
type: module
title: Tenancy, the School Registry and Tenant Scope
description: How a screen knows which school it is about and who may reach it — the profile snapshot and its verdict, the tenant-scope rule and its SCOPED_SECTIONS anchor, member and school write policies, and the ADR-006 platform-admin registry boundary behind /schools/new.
tags: [tenancy, membership, tenant-scope, platform-admin, school-registry, rls, domain-layer, failure-modes]
sources:
  - id: openwiki-source-1f0a12ecb6e407c4e68e28d8
    resource: repo://app/(dashboard)/layout.tsx
  - id: openwiki-source-a8f82cfd8b3b550b92770944
    resource: repo://app/(dashboard)/legacy-redirect.tsx
  - id: openwiki-source-0555213af97e8aa00bf4b119
    resource: repo://app/(dashboard)/schools/new/actions.ts
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
  - id: openwiki-source-7ded6d9e4b97a5fd4dd6e34e
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/layout.tsx
  - id: openwiki-source-34483bdeb5950b355468581b
    resource: repo://app/(dashboard)/tenant-access.ts
  - id: openwiki-source-20d1ca31256bf756f33f5462
    resource: repo://app/(dashboard)/tenant-scope.ts
  - id: openwiki-source-6e6cc525e98e274ad6c10b29
    resource: repo://app/(dashboard)/users/new/actions.ts
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-7cb0b5f9c6ed9ed4128872a0
    resource: repo://modules/shell/ui/Sidebar.tsx
  - id: openwiki-source-3f1f3f4919f6d868d27df2e3
    resource: repo://modules/tenancy/data/platform.ts
  - id: openwiki-source-2e2d8e1af455c1b26b721663
    resource: repo://modules/tenancy/data/schools.ts
  - id: openwiki-source-6d398bd6713150c971d852b0
    resource: repo://modules/tenancy/data/tenancy.ts
  - id: openwiki-source-5b30b77204ee0533570c731e
    resource: repo://modules/tenancy/data/users.ts
  - id: openwiki-source-4a6c5a1d0a57f700524b0a69
    resource: repo://modules/tenancy/domain/access.ts
  - id: openwiki-source-6a8e8eb585b473f51007f9ea
    resource: repo://modules/tenancy/domain/schoolDraft.ts
  - id: openwiki-source-b5e9a80328ba1dcd462db5c3
    resource: repo://modules/tenancy/domain/scope.ts
  - id: openwiki-source-d3e84a9ace1c1da681c2a858
    resource: repo://modules/tenancy/domain/userAccess.ts
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-fc8bca54fd802af39662de6c
    resource: repo://supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql
  - id: openwiki-source-b602958ed9a6de9282d8520d
    resource: repo://tests/unit/school-draft.test.ts
  - id: openwiki-source-0fd3605db2590862922583b6
    resource: repo://tests/unit/tenant-access.test.ts
  - id: openwiki-source-15e8a5a27099d775d1c019e1
    resource: repo://tests/unit/tenant-scope.test.ts
  - id: openwiki-source-fe5bad314b3fc436410eb4b1
    resource: repo://tests/unit/user-access.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T03:56:44.398Z" }
---

# Tenancy, the School Registry and Tenant Scope

`modules/tenancy` owns FR-02 and answers three questions no entity contract can answer for itself: *which school is this screen about*, *does this person belong to one at all*, and *is this person the operator who provisions schools*. It also owns the two write paths that grant school access and create schools. Where "who may see it" is decided is not here: that is Postgres RLS. This module supplies the selection layer and the honest verdicts above it — see [Tenant Isolation and RLS](/openwiki/architecture/tenant-isolation-and-rls.md) for the boundary and [Data Model and RLS](/openwiki/architecture/data-model-and-rls.md) for the policy shapes.

Two rules frame every decision below. Rule 1 and rule 2 put authorization in Postgres and allow a `tenant_id = scope.tenantId` filter only as scope *selection*; rule 30 is the ADR-006 boundary that keeps the platform admin inside the school registry.

## Which school a screen is about

Tenant context lives in the URL path segment (`/t/<code>/<section>`) — a locked domain fact, because before it existed every office screen read every school the caller belonged to and a multi-school user saw three schools' batches summed under one school's name (audit I1, recorded in the module header).

`scopeForCode(profile, code)` builds a `TenantScope` only from `profile.tenants`, itself an RLS-scoped read of `profile_tenant_memberships`. An unknown *or foreign* code therefore yields `null`, never a scope. Code matching is case-insensitive on both sides — the wanted code is lowercased and each membership's `code` is lowercased per comparison, so `/t/akb` finds `AKB` — and `scopedPath` lowercases on the way out, so a link and its match always agree.

`defaultScope` picks the `is_default` membership, falls back to the first, and returns `null` with none. ADR-005's one-membership-per-profile decision makes that fallback resolve to the single row, and the fallback is what lets an admin grant written with `is_default: false` still land a single-school person in their school.

`SCOPED_SECTIONS` is the single list of code that lives under `/t/<code>`. It is a compile-time anchor, not a mirror of the directory tree: `ScopedSection` is derived from it, the Sidebar's workspace rows name a section rather than an href, and `legacyRoute(section)` types each old unscoped route's target. Two consequences bite. **A section added outside the list is reachable but unscoped** — a section added outside the list is reachable but unlisted — `(sections)` already holds none of them automatically, and a page under `dashboard/` rather than inside the group earns no legacy redirect and no nav row. And `isScopedSection` is currently exported but called by nothing: the guarantee comes from the `ScopedSection` type at each call site, not from a runtime check.

Route composition lives in `app/(dashboard)/tenant-scope.ts`, not in the module, because it joins `modules/auth` identity to `modules/tenancy`'s profile and only `app/` may import two private `data/` layers (rule 8). `resolveRouteScope` is `cache()`-wrapped and the `/t/[tenantCode]` layout renders each non-`ok` state; the four arms, `requireScope()` and the trainer redirect are documented in [Next.js Routing and the Request Path](/openwiki/architecture/nextjs-routing-and-request-path.md). One detail belongs here: a foreign code yields `not-a-member` with a `fallback` scope, **never an all-schools scope** — `redirectToDefaultScope` is the only thing that forwards to a default, and only for a legacy unscoped path. `resolveTenantAccess()` in the sibling `app/(dashboard)/tenant-access.ts` is the same composition for the verdict alone; both files are `cache()`-backed so a layout and its page pay one profile read.

## Why the verdict is `domain/` and not `data/`

`domain/access.ts` names the difference between "this table is empty" and "this caller is attached to no tenant". Every tenant-scoped table reports the second as a *successful empty read*, so without the verdict a fully-provisioned-looking "No batches — import one" is offered to someone who cannot perform it.

It lives in `domain/` because another module's `data/` is private (rule 8, lint-enforced by the per-module `import/no-restricted-paths` zones in `eslint.config.mjs`): every module's snapshot contract has to fold this verdict, and none of them may import tenancy's `data/`. Rule 14 keeps it I/O-free.

`TenantAccess` is `granted` | `none` | `unknown`. `deriveTenantAccess` reads it off a profile snapshot with a deliberate mapping: `not-found` → `none` (a signed-in person with no profile row has no membership either way, and the honest message is the same one), `sync-failed` and `unconfigured` → `unknown`. `withTenantAccess` then replaces **only** an `ok` snapshot; `sync-failed` and `unconfigured` pass through untouched, and `unknown` changes nothing. The failure this prevents is silent and documented in `tests/unit/tenant-access.test.ts`: "you belong to no school" is a tidier story than "the fetch broke", so a fold that rewrote failures would bury a real error behind a plausible one. Screens render `shared/ui/NoTenantAccessState` for the folded state.

## The profile snapshot and its four states

`getProfileSnapshot(clerkUserId)` takes the Clerk id as a parameter rather than resolving it, because the `profiles` SELECT policy admits "own or same-tenant" rows and so needs an explicit filter — and the resolver lives in `modules/auth/data`, which this module may not import. The join to `profile_tenant_memberships(is_default, tenants(*))` is what makes one read serve both the review path and the scope; it is `cache()`-wrapped so a request pays one read however many callers ask.

Its snapshot is the standard union plus one: `ok`, `not-found` (authenticated but not yet provisioned — the `user.created` webhook usually beats the request), `sync-failed`, `unconfigured`. `not-found` is kept distinct from `sync-failed` because both are "no access yet", not errors.

`mapProfileRow` carries the conventions the rest of the codebase depends on: `DB_TO_UI_ROLE` is a total map (a new `profile_role` variant fails compilation until its UI treatment is chosen, per rule 18), and tenant registry fields fall back to `''` rather than `null` so consumers need no null check. `Profile` reuses the same `UserRole` the auth module resolves against, so there is one role vocabulary and `profiles.role` stays the only authority.

## Member administration

`data/users.ts` is the write half: set a person's role and grant them a school. `ASSIGNABLE_ROLES` in `domain/userAccess.ts` is deliberately narrower than `UserRole` — the UI-only `'owner'` has no enum value, so offering it would build a write Postgres rejects. `validateUserAccessDraft` takes `allowedTenantIds` as an argument so a submitted school outside the admin's own generates "Choose a school you have access to" instead of a bare RLS denial. Validation is a usability contract throughout; the Server Action's admin check is defence in depth, load-bearing only on the Clerk-invitation branch, which has no RLS beneath it. The action and the invitation flow are walked through in [User Provisioning and Membership](/openwiki/workflows/user-provisioning-and-membership.md).

`findUserByEmail` is where an access bug would be quietest, since `assignUserAccess` changes the role of whatever row comes back. Three defenses stack: `escapeLikePattern` escapes `\`, `%` and `_` for the `ILIKE` (backslash first, or it escapes its own output; `_` is a legal character in real addresses and matches any single character); a comment records that PostgREST rewrites `*` before Postgres could escape it; and an exact normalized-equality re-check turns any residue into `not-registered`, which falls through to the invitation path rather than granting the wrong person. `not-registered` stays ambiguous by design — distinguishing "nobody has that address" from "they belong to another school" would leak other tenants' membership.

`assignUserAccess` runs the role UPDATE **before** the membership INSERT — the safer half to stop after — and treats zero updated rows as `denied`, because an RLS-blocked UPDATE is not an error in PostgREST. On INSERT failure it compensates with a best-effort `restorePriorRole`, since policies 1 and 2 of migration `20260904120000` are keyed on `current_role() = 'admin'` and match profiles belonging to no tenant: a half-applied promotion could read and set roles across the whole unassigned pool. This is compensation, not a transaction (PostgREST exposes none; real atomicity would take a `security invoker` function), and a failed restore leaves the state as it would have been, logged.

The INSERT always writes `is_default: false`. `user.tenantIds` comes from that same RLS-scoped join, so an admin of school A sees an *empty* membership list for someone at school B; trusting it would write a second default, nothing in the schema forbids one, and `mapProfileRow` would then pick whichever flagged row comes back first — landing turns on row order. Writing `false` costs nothing because `mapProfileRow` falls back to `memberships[0]`. The only writer of `true` is the invitation path in `modules/auth/data/provisioning.ts`, where the profile is brand new and the service-role client can see it genuinely has no other membership.

## The platform-admin axis

A platform admin is an operator outside every tenant who provisions schools the way TESDA issues T2MIS/BSRS accounts (ADR-006 P1, superseding FR-02's "Super Admin is not implemented").

It is a separate table, `public.platform_admins`, never a fifth `profile_role` (P2): `profile_role` is a tenant-scoped vocabulary every policy switches on, and platform admin is a different axis — not "a bigger admin". The table has RLS enabled and **no policy at all**, so no authenticated statement can read or write it and the role cannot be self-granted through any application path; the deny comes from RLS-with-no-policies, not from withheld grants, which Supabase's default privileges would supply anyway. The Supabase linter's `rls_enabled_no_policy` finding is the design — any policy here is a way in. Conferring the role is a statement run against the project directly (rule 36), so "who can create schools" is answered by the table, not the migrations.

The app asks through `public.current_user_is_platform_admin()`, a `security definer` wrapper over the `app_private` helper that joins `platform_admins` to an **active** profile — deactivating a profile silently revokes the role. It returns only the caller's boolean, never the membership list.

`getPlatformAdminSnapshot` wraps that RPC in `cache()` and reads `data === true` — a false on an unexpected shape shows the smaller surface. `isPlatformAdmin` collapses every failure to `false` for callers where a failed check should *hide* a link rather than render into a denial (the Sidebar and the dashboard layout); the route and the action must use the snapshot, because they need `sync-failed` and `denied` told apart (rule 24's six states).

**The reach is the registry and nothing else** (P3, rule 30): `tenants` (SELECT/INSERT/UPDATE, no DELETE), `qualifications`, `tenant_qualifications`, unassigned `profiles`, and seating a tenant's *first* member. No policy grants `batches`, `learners`, `documents`, `lamr_*` or `activity_log`. Two sharp edges sit on that reach.

- **The seating INSERT policy carries two predicates and neither may be removed:** `profile_id <> current_profile_id()` — the operator seats other people, never themselves — and "the target tenant has no members yet". Without the first, an operator could insert `(any tenant, own profile_id)` and gain everything `can_access_tenant` gates in one statement. Without the second it would be self-service into established schools. The policy is correct only while the companion SELECT policy shows the operator every membership row; narrowing that silently weakens the INSERT, because the empty-tenant subquery reads the table through those policies.
- **`qualifications` is `for all`, not read-only.** There is `/schools/new`, but there is no screen editing the national qualifications list or an existing school's program list; those writes are reachable only by statement today.

Hiding the sidebar row is usability, the route and RLS are the control. `/schools/new` is also deliberately not gated on `resolveRouteRole` — the `?role=` override would let a screen be previewed into existence — nor on `resolveTrustedRole`, since holding `admin` at some school grants nothing here. Read the two seating predicates before touching that policy: dropping either is a boundary change needing its own ADR (rule 30).

## The school-provisioning path

`/schools/new` is the one write path outside a tenant, and unscoped for a structural reason: a school with no members cannot satisfy a membership-scoped `tenants` policy, so there is no tenant to scope to yet. The registry read the form depends on is public reference data — `listQualifications` filters `is_active` rather than a tenant.

`data/schools.ts` writes through the `create_school` RPC, which is `security invoker`: RLS evaluates every statement inside, the caller gets a policy violation rather than a privilege, and the two statements still land atomically — a school with no programs cannot run a batch and would leave nothing on screen to say so. The client stays anon-key throughout; the service-role client belongs only to the webhook. Failures are separated because they need different screens: `42501` → `denied`, `23505` → `duplicate-code` (`tenants.code` is the one unique constraint a typist can hit), anything else → `sync-failed`, and a null return from the `returns uuid` function is a failure rather than a success.

`domain/schoolDraft.ts` is the pure validator ahead of any write; `tests/unit/school-draft.test.ts` pins the decisions that are easy to tidy into something wrong. It normalizes the code to uppercase with whitespace stripped — `akb` beside `AKB` would be two schools reading as one and the unique constraint would not catch it — rejects a code outside `[A-Z0-9]{2,12}` and a non-numeric provider code, and leaves a blank COPR number valid, since a school is routinely entered while its certificate is still being issued. Programs are checked in the draft's own index space: blank rows are skipped as untouched spares, a partial row without a qualification is flagged, a duplicate qualification is caught before the `(tenant_id, qualification_id)` constraint produces an unactionable error, and an unknown id becomes "Choose a qualification from the list" instead of a foreign-key failure. Zero programs is an error. The row index matters — a check against the compacted command list would flag an innocent row and report only the first offender.

`app/(dashboard)/schools/new/actions.ts` sequences authorization, the qualification list, validation, then the write, returning a discriminated form state rather than throwing (a thrown digest strands the operator). A signed-out, non-admin or failed-check caller gets `denied`/`failed`/`unconfigured`, not a form. `duplicate-code` stays distinct from `failed` because it is the one failure the operator can fix. Because the action re-validates against the live list, a page rendered before the registry changed still cannot submit a foreign id.

One state stops at the page: an empty `qualifications` registry makes the form unsubmittable, because a school must record at least one program. And ADR-006 records "deliberately not done": no `/schools` list, no edit or deactivate flow, no way to enrol a new program at an existing school.

## Failure modes in one place

- **Folding too eagerly.** `withTenantAccess` must replace only `ok`; rewriting a `sync-failed` snapshot hides the failure behind the tidier story, and `unknown` must never behave like `none`.
- **A scope treated as authorization.** A scope that is `null` gives the page nothing to query with, but RLS still decides.
- **An unescaped email lookup.** `_` in an address matches a stranger, and the stranger gets the role and the school.
- **A second default membership.** Writing `is_default: true` from an RLS-scoped list produces a row-order-dependent wrong-school landing.
- **Trusting the platform flag as the boundary.** A non-admin who reached either action still gets `denied` from policy; but the "seats other people" predicate is the only thing between the operator and tenant-wide visibility.
- **A new section outside `SCOPED_SECTIONS`.** Reachable, unlinked, and unscoped — it inherits no legacy redirect and appears in no nav row.

## Tests that pin it

`tests/unit/tenant-access.test.ts` fixes the three-way verdict and the fold's precedence; `tests/unit/tenant-scope.test.ts` fixes scope-from-membership-only, the default fallback, path round-tripping, and that `resolveTrustedRole` reads `profiles.role` and never Clerk metadata. `tests/unit/user-access.test.ts` covers the assignable role set, the `ILIKE` escaping (including backslash order), and `parseInvitationGrant`'s all-or-nothing parse — load-bearing there because the webhook runs with no RLS above it. `tests/unit/school-draft.test.ts` covers every refusal above. Nothing exercises `assignUserAccess` or `createSchool` against a database: RLS itself has no unit coverage, real-Supabase isolation tests are still outstanding, and the seating predicates must be checked by reading the migration, not assumed.
