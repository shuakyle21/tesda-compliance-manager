# ADR-005 — Demo account tenant scoping, roles, and the dev membership seed

Status: Accepted
Date: 2026-09-02
Owner: System Architecture
Relates to: [[CONTEXT]] (Tenant membership, Resolved role),
`supabase/seeds/dev_profile_memberships.sql`

## Context

Signing in does not grant visibility. Identity (Clerk) and authorization
(Supabase) are separate systems: RLS reads only the `sub` claim, resolves it to
a `public.profiles` row, and scopes every table through
`app_private.can_access_tenant`, which requires a
`public.profile_tenant_memberships` row.

`upsertProfileFromClerkUser` creates the profile as `viewer` with **no**
membership, on the stated assumption that an admin assigns a tenant later. That
admin assignment flow was never built. The consequence is that every real
signed-in user resolves to zero rows — correct RLS behaviour, but it reads as a
broken dashboard, and it makes the app unusable against live data.

`supabase/seeds/dev_profile_memberships.sql` is the stopgap: it grants the three
real Clerk users a profile and a membership so RLS has something to match.

**Why it is a seed and not a migration.** It hardcodes Clerk user IDs, and
development and production instances issue different IDs for the same person. A
migration carrying these values would run in production and insert rows keyed to
users that cannot exist there — dead identities in the table RLS trusts most.
Migrations carry schema and reference data; this is environment-specific fixture
data.

## Decisions

**1. One tenant membership per profile.** Upholds the existing `CONTEXT.md`
rule that multi-membership is out of scope until a real need appears. The draft
had granted the developer three memberships; that need has not appeared.

Three facts made the multi-membership grant actively harmful rather than merely
premature:

| Layer | Behaviour |
| --- | --- |
| `app_private.can_access_tenant` | grants on **any** membership; does not consult `is_default` |
| `mapProfileRow` | exposes a `tenants` list and `defaultTenantId` |
| `Sidebar` school selector | cosmetic — reads `TENANTS` from `shared/mocks/seed`, hardcodes `tnt_j3ed` |

Together these produce one merged, unscoped batch list spanning every granted
tenant, with no way to tell the rows apart and a switcher that changes nothing.

Under one-membership-per-profile, `is_default` is redundant: the
`memberships.find((m) => m.is_default) ?? memberships[0]` fallback always
resolves to the same single row.

**2. `demo@tvicams.app` is a `viewer` scoped to AKB.** `viewer` is not denied
billing — it is read-only (`canWrite = role !== 'viewer'`) — so a viewer can
read every screen the isolation assertion needs to check. Least privilege
therefore costs nothing here.

**3. The demo account is internal-only** — developer use and tenant-isolation
testing. It is not for a panel, evaluator, or TESDA reviewer. See Consequences
for why that boundary is load-bearing rather than cautious.

**4. Human accounts keep `admin`, defined as the school's proprietor.**
`admin` and `coordinator` are indistinguishable in every current policy, so
least privilege does not discriminate between them; the role therefore encodes
who the person *is*. `klynejoshua13` → AKB, `nenitarmo` → NEN.

**5. `app/(dashboard)/billing/page.tsx` must stop falling back to mock data on
an empty result.** It reads:

```ts
snapshot.status === 'ok' && snapshot.batches.length > 0 ? snapshot.batches : MOCK_BATCHES
```

The `.length > 0` clause means an `ok` snapshot returning zero rows renders the
full mock dataset for all three schools. `app/(dashboard)/dashboard/page.tsx`
has no such clause and is correct. Two failures follow from it: a correctly
scoped user sees mock financials for schools they do not belong to, and zero
rows becomes indistinguishable from all rows — which would defeat the assertion
below on the one live screen where it matters most.

## The isolation assertion

The dev seed creates **three** batches, not five:

| Tenant | Batch | Course |
| --- | --- | --- |
| AKB | `DEV-AKB-001` | Cookery NC II |
| NEN | `DEV-NEN-001` | Rice Machinery Operations NC II |
| NEN | `DEV-NEN-002` | Rice Machinery Operations NC II |
| J3ED | *(none)* | — |

So the assertion the demo account exists to prove is: **signed in as demo, on
`/dashboard`, exactly one batch is visible — `DEV-AKB-001` — and neither NEN
batch appears.** A scoping regression shows three.

(The seed's own comment claimed "the other four batches". That count came from
the mock dataset and is wrong for live data.)

## Consequences

- **`admin` and `coordinator` are identical in every policy today.** Keeping
  `admin` on the two human accounts means they will silently acquire any
  future admin-only capability without review. Whoever introduces the first
  real `admin` privilege must revisit these two rows deliberately.

- **The `?role=` preview override outranks the database role.**
  `resolveRouteRole` checks `?role=` first, ahead of the profile's `role`
  column, and is documented as staying available once real identity exists. The
  demo account's `viewer` role is therefore not enforced against anyone willing
  to edit the URL. This is the primary reason the account is internal-only.

- **`NEXT_PUBLIC_DEMO_PASSWORD` is inlined into the client bundle** and served
  to every browser that loads `/sign-in`. Acceptable for a throwaway account on
  a development instance; it must not survive into a production instance.

- **Eight of ten dashboard routes render `MOCK_BATCHES` unconditionally.** Only
  `/dashboard` and `/billing` read live data. Tenant scoping therefore appears
  violated on most screens regardless of RLS, which is tolerable for internal
  use and disqualifying for external use. Wiring those routes, or hiding them,
  is a precondition for ever reclassifying this account as external.

## Considered and rejected

- **Multi-membership for the developer.** Rejected: contradicts `CONTEXT.md`,
  and with a cosmetic switcher it yields a merged unscoped list rather than
  switchable tenants. Revisit when the Sidebar reads the profile's real
  `tenants` and the batch query takes a tenant argument.
- **`coordinator` for the demo account.** Rejected: `viewer` can already read
  everything the assertion checks, and the credential is shared.
- **Downgrading the human accounts to `coordinator`.** Rejected: a no-op today
  that would misrepresent the holders.

## Related, deliberately out of scope

The absent admin tenant-assignment flow is the product hole this seed patches.
It is multi-session work and belongs on the `/to-prd` → `/to-issues` path, not
in this decision.
