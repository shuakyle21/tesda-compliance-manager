---
type: module-group
title: Analytics, Activity Log, Settings and App Shell
description: One scope for the supporting modules — analytics charting the shared batch snapshot, the activity log's total tone bridge and append-only audit intent, the toast-only settings overlay, and the shell chrome whose nav is curated from trusted role and the platform-admin axis.
tags: [modules, analytics, activity-log, audit, settings, app-shell, navigation, enum-bridge]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-17T04:33:34.390Z
---

# Analytics, Activity Log, Settings and App Shell

These four modules are grouped because each is a *consumer* of another module's truth,
which is where their failure modes live. Analytics reads the **batches** snapshot, the
activity module owns the only `activity_log` contract, settings owns no data at all, and
`shell` carries chrome.

Two of them are thinner than their README headings suggest: `modules/settings/` contains
`ui/SettingsModal.tsx` and nothing else, and `modules/shell/` is `ui/` only. The
`attendance`, `lamr` and `notifications` modules sit next to them as README-only stubs;
see [Modules, Overview and the ADR Index](/openwiki/modules/overview-and-adr-index.md).

## Analytics: a chart layer over someone else's snapshot

`app/(dashboard)/t/[tenantCode]/(sections)/analytics/page.tsx` resolves the school scope
with `requireScope`, fetches `getBatchesSnapshot(scope.tenantId)`, folds tenant access,
then hands `Batch[]` to the client island `AnalyticsView`. No chart data is queried
separately and there is no analytics table — the snapshot *is* the analytics source.

The consequence worth knowing is that counts cannot drift. The alerts donut is built
from `alertCategoryCounts(batches)` inside `modules/batches/domain/alerts.ts`, the same
function the dashboard's `AlertsPanel` uses on the same rows, and there is no
`alerts_log` table (alerts are computed on read, a locked domain fact in `RULES.md`). A
second, stored alert count would be the way this breaks. The same holds for document
compliance: `AnalyticsView` scores each batch against *its own* program catalog through
`criticalRequirements`, and ADR-004's untracked rule means a batch tracking no critical
requirement is dropped from the ranking rather than plotted at 0% — unknown is not zero.

Analytics is the deliberate exception to the app's hand-rolled chart primitives: Tremor's
charts render through Recharts, so `AnalyticsView` is a `'use client'` island while the
route stays a Server Component (rule 26 — client islands only for interactivity, and
Recharts needs the browser).

Its guard ladder follows rule 19's ordering rather than a tidy `status !== 'ok'`:
`sync-failed` renders the banner; `no-tenant-access` renders `NoTenantAccessState` — the
four "cannot be scored" panels would otherwise describe a school the caller has no
membership for — and `AnalyticsView` is skipped for a `sync-failed` snapshot that
produced no rows. The `withTenantAccess` fold rewrites only an `ok` snapshot, so "you
belong to no school" can never bury a real fetch failure. Honest empties are
[Error Snapshots and Honest Empty States](/openwiki/concepts/error-snapshots-and-honest-empty-states.md);
the fold itself is [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).

## Activity Log: bridge, paging, and who actually writes rows

`modules/activity/data/activity.ts` is the full fetch → map → derive contract (rule 17).
`ACTION_TO_TONE` is a **total** `Record<ActivityAction, ActivityEvent['tone']>` — the
same compilation discipline as `DB_TO_UI_STAGE` (rule 18): adding an `activity_action`
enum value in Postgres and regenerating `database.types.ts` fails the build here until
somebody picks a tone. The bridge is deliberately coarse and says so: the DB enum
(`created`/`updated`/`uploaded`/`submitted`/`verified`/`deleted`/`system_note`) is
generic CRUD, while severity narrative ("lag exceeded") has no column, so `verified` is
the only `green` and `system_note` the only `amber`.

`mapActivityLogRow` is the pure mapper and never assumes an actor: a system event has a
null `profiles` join and renders `who: 'System'`, `role: 'system'`. `toRelativeWhen`
turns an unparseable timestamp into `''` instead of `Invalid Date`, and displays a
future-dated row as a date rather than hiding it. Tone is a coloured dot next to text,
not the sole signal (rule 23).

`getActivitySnapshot(limit, offset, tenantId)` mirrors the batches layer's shaping. The
`tenant_id` filter only *selects* which of the caller's schools is shown on top of RLS
(rule 2). Paging fetches `limit + 1` rows and derives `hasMore` from the overflow, so
the page needs no count query and the subline can honestly say how many events are
loaded rather than claim a total. `ActivitySnapshot` is the full union and its own
comment records the trap: RLS reports "you belong to no school" as a **successful empty
feed**, which would read as "no activity yet", so the route folds
`no-tenant-access` in with `withTenantAccess(…, tenantAccessOf(profile))`. Only the
route can fold it; a data layer cannot see a profile.

The audit intent is append-only, and it is the one place the database does not enforce
anything stronger than membership: `Tenant users can read activity log` is
`can_access_tenant(tenant_id)` and `Tenant users can append activity log` is the same
predicate with no role check — so a **viewer** can insert, while most writes elsewhere
bottom out in `can_manage_tenant()` (rule 4). An `activity_log` ID is never updated or
deleted through app code. ADR-001 X2 leans on this: attendance is mutable in place and
every edit is supposed to write an `activity_log` event, and ADR-007 Elig-6 handles a
late dropout correction the same way.

**The gap that matters:** nothing in `app/` or `modules/` inserts into `activity_log`.
`from('activity_log')` appears once — the read in `activity.ts`. The feed therefore
renders whatever is in the table, and a batch edit that fires no event is invisible.
Treat "an action happened" and "an action was audited" as different claims until a
writer lands.

Two consumers share the contract: the paged `(sections)/activity-log` route
(`PAGE_SIZE = 50`, `?page=N`, "Load older events") and the dashboard's
`RecentActivityPanel`, which takes the first six events *fetched bounded* rather than
slicing a full feed. The unscoped `/activity-log` route is only a `legacyRoute`
forwarder. The Topbar's notifications bell links here — there is no read/seen column,
so the bell carries no unread badge rather than a fabricated number — and the bell is
hidden on `/trainer/*`, which has no activity-log nav row to land on.

## Settings: a toast, not a write

`SettingsModal` is not a route; it is an overlay owned by the Sidebar's Operations
group and mounted inside `SidebarOverlays`. It shows the real signed-in name, role,
school name and code passed down from the layout, so the Workspace section is truthful.
Nothing else persists:

- `tenant_settings` is a planned table, not a migrated one, so there is nothing to write.
- "Save changes" calls `onSaved`, which closes the modal and shows a `Settings saved`
  toast.
- The one Preferences row, compact density, is local `useState`; the `Switch` is wired
  to a flag and `.density-compact` is otherwise unused, because applying it would mean
  lifting the flag above the Server Component layout.
- The design's "Email notifications" and "Weekly digest" toggles are deliberately
  dropped: alerts are computed on read with no cron and no email, so the rows would
  promise a delivery mechanism that does not exist.

Anyone changing this surface should assume no configuration is stored: a new setting is
a migration plus a data layer, not a new row in this component. `sidebar.test.ts` pins
the tenant being passed to the modal and the toast firing after save.

## Shell: nav curated from trusted role, rendering from props

`Sidebar` decides its Operations group from three independent inputs — real
`profiles.role` (via `isAdmin`), the platform-admin boolean, and `isTrainerRoute` — and
a trainer route strips everything but Settings regardless of role. That is why "Add
user" (admin-only) and "Add school" (platform-operator, ADR-006) are their own lists
rather than entries in `OPERATIONS`: hiding is usability, but the role is still the
trusted one, so the row can be shown to exactly the people whose route would accept it.

The load-bearing detail is that both flags come from *trusted* sources in
`app/(dashboard)/layout.tsx`: `resolveTrustedRole(dbRole)` over the profile row, never
`resolveRouteRole`, whose `?role=` preview override would let any caller conjure an
admin row. `isPlatformAdmin` is the `security definer` boolean RPC
`current_user_is_platform_admin()`, a different axis from `profile_role` — holding
`admin` at a school grants nothing there. Neither flag authorizes anything: the route
and Server Action re-check and RLS sits under both, so `isAdmin: true` on the wrong
person is a usability bug, not a leak. `role` and `fullName` are the same server-resolved
values, and both are required props — `null` means "it did not resolve", rendered as
`Name not set` and no role tag, so a caller cannot omit its way into a plausible-looking
identity.

The school switcher is links, not local state. Each active-school resolution reads the
URL segment, so the switcher, the nav hrefs and the page data always name the same
school; a script switcher that only changed a label was the audit-of-record bug (I1).
Off a scoped page it falls back to the default membership, then the first; with fewer
than two memberships it renders locked, and `tenant === null` renders
`School not set`/`Tenant setup pending` rather than a plausible name.

`Topbar` keeps only what the Sidebar cannot own — the sidebar-expand button and the
bell — because the Sidebar holds all branding. `MetricsRow` is a thin placement wrapper
around `KpiSummary`; only `trainer` passes `hideBilling` (rule 5, omission half, on the
server rather than CSS-hidden), while `t/[tenantCode]/dashboard` renders `KpiSummary`
directly with the needs-attention card.

**Why the KPI row is not in the layout.** A root layout does not re-render on
client-side navigation, so a metric row placed there kept the *previous* school's
numbers after a school switch. Only the two dashboard pages render one, each from its
own data.

`sidebar.test.ts` is the coverage for all of this — escape-layer ordering, the switcher's
locked and not-set states, the user card's initials and role tag, the four Operations
list permutations including the trainer route, and URL-over-default school resolution.
`status-render.test.ts` covers the other half of the shell's display contract: status is
text plus icon, never colour alone (rule 23), and an absent source renders "not
recorded" instead of `Infinity` or a zero.

## Shell or module? where new chrome goes

`shell` is a module rather than `shared/` because its components carry tenant and data
context, and `shared/` must never import `modules/` (rule 9). Anything that starts
reading data or encoding a rule belongs to its owning module instead (rule 15) — and
analytics/settings show the corollary: a screen composition whose data is another
module's truth stays a thin consumer, because the alternative is a second fetch of the
same rows and a count that can drift. Import direction and the `data/` privacy zones
that enforce it (all four modules are in the `domains` array) are
[Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md);
the route tree and the `(sections)` segment layout are
[Routing, Layout Gates and the Request Path](/openwiki/architecture/nextjs-routing-and-request-path.md);
the trainer-omission and RLS split is
[Tenant Isolation and RLS](/openwiki/architecture/tenant-isolation-and-rls.md).