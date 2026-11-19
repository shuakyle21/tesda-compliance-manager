---
type: module-group
title: Analytics, Activity Log, Settings and App Shell
description: One scope for the supporting modules — analytics charting the shared batch snapshot, the activity append/contract pair and its two consumers, the toast-only settings overlay, and the shell chrome whose nav is curated from trusted role and the platform-admin axis.
tags: [modules, analytics, activity-log, audit, settings, app-shell, navigation, enum-bridge]
sources:
  - id: openwiki-source-8b8ccbee2926d1d4e2880059
    resource: repo://app/(dashboard)/activity-log/page.tsx
  - id: openwiki-source-1f0a12ecb6e407c4e68e28d8
    resource: repo://app/(dashboard)/layout.tsx
  - id: openwiki-source-a91e40a49a660ad476d08b65
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/activity-log/page.tsx
  - id: openwiki-source-f58ae64a916f7cb6fffb67c4
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/(sections)/analytics/page.tsx
  - id: openwiki-source-ce194fb513f902915fafa99b
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/actions.ts
  - id: openwiki-source-fac1d0830b5bfbb903fdd40f
    resource: repo://app/(dashboard)/t/%5BtenantCode%5D/dashboard/page.tsx
  - id: openwiki-source-f8cfb11c14504e1f5bffb66c
    resource: repo://app/(dashboard)/trainer/page.tsx
  - id: openwiki-source-6c5e30490a0c4602d7931405
    resource: repo://docs/adr/ADR-001-billing-and-domain-model.md
  - id: openwiki-source-9c4f624af786337110d6df8a
    resource: repo://docs/adr/ADR-004-untracked-document-semantics.md
  - id: openwiki-source-a201158b72d575d540d15779
    resource: repo://docs/adr/ADR-007-attendance-based-dropout-rule.md
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-bac9ca9767a57004b7fbd175
    resource: repo://lib/supabase/database.types.ts
  - id: openwiki-source-4976e2df62af98c2fbd74920
    resource: repo://modules/activity/data/activity.ts
  - id: openwiki-source-9f5cba7a8936b6015f479258
    resource: repo://modules/analytics/README.md
  - id: openwiki-source-6787d888d949c1ba35fe2037
    resource: repo://modules/analytics/ui/AnalyticsView.tsx
  - id: openwiki-source-9244ced37838980939ffbdc8
    resource: repo://modules/batches/domain/alerts.ts
  - id: openwiki-source-6af3f09918cb46eabe775144
    resource: repo://modules/batches/domain/metrics.ts
  - id: openwiki-source-2cad937ecfecf0d996572e65
    resource: repo://modules/batches/ui/KpiSummary.tsx
  - id: openwiki-source-6d9a7943f1ca24910c3bbd3b
    resource: repo://modules/batches/ui/RqmCodeEditor.tsx
  - id: openwiki-source-e54269333553bf2d86431b33
    resource: repo://modules/settings/README.md
  - id: openwiki-source-43fc612be62686095244f140
    resource: repo://modules/settings/ui/SettingsModal.tsx
  - id: openwiki-source-ba13cf29306de2b7b8f8a402
    resource: repo://modules/shell/README.md
  - id: openwiki-source-1d56d4ea0a3a5a0ef9c322a5
    resource: repo://modules/shell/ui/MetricsRow.tsx
  - id: openwiki-source-db7ba2f4f82647195d728010
    resource: repo://modules/shell/ui/MobileHeader.tsx
  - id: openwiki-source-7cb0b5f9c6ed9ed4128872a0
    resource: repo://modules/shell/ui/Sidebar.tsx
  - id: openwiki-source-a73ad3d1378cdffc9904678c
    resource: repo://modules/shell/ui/Topbar.tsx
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-03656dd9cbbc89345a506c19
    resource: repo://supabase/migrations/20260528160300_create_tenant_scoped_schema.sql
  - id: openwiki-source-e1c58fb209c8aac5e0abb15d
    resource: repo://tests/unit/display-role.test.ts
  - id: openwiki-source-0a5743f3b49f658216da5228
    resource: repo://tests/unit/sidebar.test.ts
  - id: openwiki-source-bd488927017b83e124fb024a
    resource: repo://tests/unit/status-render.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-11-18T03:56:44.398Z" }
---

# Analytics, Activity Log, Settings and App Shell

These four modules are grouped because each is a *consumer* of another module's truth —
except the activity module, which is now also the one place app code *writes* an audit row,
so its failure mode is the mirror image: a write that never reaches it. `shell` carries
chrome, `settings` owns no data at all, and `analytics` computes nothing of its own.

Two of them are thinner than their README headings suggest: `modules/settings/` contains
`ui/SettingsModal.tsx` and nothing else, `modules/analytics/` is `ui/` only, and
`modules/shell/` is `ui/` only. The `attendance`, `lamr` and `notifications` modules sit
next to them as README-only stubs; see
<!-- openwiki: broken internal link [/openwiki/modules/overview-and-adr-index.md] file "/openwiki/modules/overview-and-adr-index.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[Modules, Overview and the ADR Index](/openwiki/modules/overview-and-adr-index.md).

## Analytics: a chart layer over someone else's snapshot

`app/(dashboard)/t/[tenantCode]/(sections)/analytics/page.tsx` resolves the school scope
with `requireScope`, fetches `getBatchesSnapshot(scope.tenantId)`, folds tenant access,
then hands `Batch[]` to the client island `AnalyticsView`. No chart data is queried
separately and there is no analytics table — the snapshot *is* the analytics source.

The consequence worth knowing is that counts cannot drift. The alerts donut is built from
`alertCategoryCounts(batches)` inside `modules/batches/domain/alerts.ts`, the same function
the dashboard's `AlertsPanel` uses on the same rows, and there is no `alerts_log` table
(alerts are computed on read, a locked domain fact in `RULES.md`). A second, stored alert
count would be the way this breaks. The same holds for document compliance:
`AnalyticsView` scores each batch against *its own* program catalog through
`criticalRequirements`, and ADR-004's untracked rule means a batch tracking no critical
requirement is dropped from the ranking rather than plotted at 0% — unknown is not zero.
When nothing at all is scored the card says which of the two causes applies (no
requirements defined at all, or no batch tracking one) instead of leaving an empty
titled frame.

Analytics is the deliberate exception to the app's hand-rolled chart primitives: Tremor's
charts render through Recharts, so `AnalyticsView` is a `'use client'` island while the
route stays a Server Component (rule 26 — client islands only for interactivity, and
Recharts needs the browser). Tremor restyling is confined to this module by
`tremor.config.mjs`'s `content` globs, so no other screen inherits it.

Its guard ladder follows rule 19's ordering rather than a tidy `status !== 'ok'`:
`sync-failed` renders the banner; `no-tenant-access` renders `NoTenantAccessState` — the
four "cannot be scored" panels would otherwise describe a school the caller has no
membership for — and `AnalyticsView` is skipped for a `sync-failed` snapshot that produced
no rows. The `withTenantAccess` fold rewrites only an `ok` snapshot, so "you belong to no
school" can never bury a real fetch failure. Honest empties are
<!-- openwiki: broken internal link [/openwiki/concepts/error-snapshots-and-honest-empty-states.md] file "/openwiki/concepts/error-snapshots-and-honest-empty-states.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[Error Snapshots and Honest Empty States](/openwiki/concepts/error-snapshots-and-honest-empty-states.md);
the fold itself is [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md).

`AnalyticsView` is props-only and holds no derivation beyond shaping its own chart series:
each figure comes from the page's snapshot or a module's `domain/`. Nothing here is a
client-side aggregation over untrimmed rows, so the module adds no rule 5 exposure of its
own — the fields it plots (progress, NTP lag, scholars) are all fields the trainer *is*
allowed to see.

## Activity Log: bridge, paging, and who actually writes rows

`modules/activity/data/activity.ts` is the full fetch → map → derive contract (rule 17) and
the only `activity_log` writer in the repository. `ACTION_TO_TONE` is a **total**
`Record<ActivityAction, ActivityEvent['tone']>` — the same compilation discipline as
`DB_TO_UI_STAGE` (rule 18): adding an `activity_action` enum value in Postgres and
regenerating `database.types.ts` fails the build here until somebody picks a tone. The
bridge is deliberately coarse and says so: the DB enum
(`created`/`updated`/`uploaded`/`submitted`/`verified`/`deleted`/`system_note`) is generic
CRUD, while severity narrative ("lag exceeded") has no column, so `verified` is the only
`green` and `system_note` the only `amber`.

`mapActivityLogRow` is the pure mapper and never assumes an actor: a system event has a
null `profiles` join and renders `who: 'System'`, `role: 'system'`. `toRelativeWhen` turns
an unparseable timestamp into `''` instead of `Invalid Date`, and displays a future-dated
row as a date rather than hiding it. Tone is a coloured dot next to text, not the sole
signal (rule 23).

`getActivitySnapshot(limit, offset, tenantId)` mirrors the batches layer's shaping. The
`tenant_id` filter only *selects* which of the caller's schools is shown on top of RLS
(rule 2). Paging fetches `limit + 1` rows and derives `hasMore` from the overflow, so the
page needs no count query and the subline can honestly say how many events are loaded
rather than claim a total. `ActivitySnapshot` is the full union and its own comment records
the trap: RLS reports "you belong to no school" as a **successful empty feed**, which would
read as "no activity yet", so the route folds `no-tenant-access` in with
`withTenantAccess(…, tenantAccessOf(profile))`. Only the route can fold it; a data layer
cannot see a profile.

The paged route reads `?page=N` (`PAGE_SIZE = 50`), prints `Page N` in the header, and
offers "Load older events" only while `hasMore` holds. The dashboard's `RecentActivityPanel`
takes the first six events *fetched bounded* rather than slicing a full feed. The unscoped
`/activity-log` route is only a `legacyRoute` forwarder. The Topbar's bell links here —
there is no read/seen column, so the bell carries no unread badge rather than a fabricated
number — and the bell is hidden on `/trainer/*`, which has no activity-log nav row.

### The writer, and the gap it leaves open

`appendActivity(entry)` is the only insert. It is **best effort by contract**: the caller's
write has already committed, so a logging failure is logged to the server console and
returned as `{ ok: false }`, never thrown, never rolled back. The reporting channel is the
single Server Action that calls it, `setBatchRqmCodeAction` in
`app/(dashboard)/t/[tenantCode]/actions.ts`: it skips the entry when from and to are equal
(re-saving the same code is not worth an event), records `action: 'updated'` on
`entity_type: 'batch'` with the `from`/`to`/`source` in `metadata`, and surfaces
`logFailed` so `RqmCodeEditor` can print "The activity log entry could not be written."
next to the saved code. A successful edit with a failed append is therefore a *silent*
failure on the dashboard and activity log, and a visible note only where the edit happened.

The rest of the write surface is the gap: no other route, action or module calls
`appendActivity`, and there is no Postgres trigger on `activity_log`. So batch edits,
uploads, verifications and deletions that go through their own data-layer writes leave no
event, and the feed renders exactly what the action path recorded. Treat "an action
happened" and "an action was audited" as different claims until a writer covers them.

The audit intent is append-only, and it is the one place the database does not enforce
anything stronger than membership: `Tenant users can read activity log` is
`can_access_tenant(tenant_id)` and `Tenant users can append activity log` is the same
predicate with no role check — so a **viewer** can insert, while most writes elsewhere
bottom out in `can_manage_tenant()` (rule 4). An `activity_log` ID is never updated or
deleted through app code. ADR-001 X2 leans on this: attendance is mutable in place and
every edit is supposed to write an `activity_log` event, and ADR-007 Elig-6 handles a late
dropout correction the same way.

## Settings: a toast, not a write

`SettingsModal` is not a route; it is an overlay opened from the Sidebar's Operations
group and mounted inside `SidebarOverlays`. It shows the real signed-in name, role, school
name and code passed down from the layout, so the Workspace section is truthful. Nothing
else persists:

- `tenant_settings` is a planned table, not a migrated one, so there is nothing to write.
- "Save changes" calls `onSaved`, which closes the modal and shows a `Settings saved`
  toast.
- The one Preferences row, compact density, is local `useState` — so a reload resets it;
  the `Switch` is wired to a flag and `.density-compact` is otherwise unused, because
  applying it would mean lifting the flag above the Server Component layout.
- The design's "Email notifications" and "Weekly digest" toggles are deliberately dropped:
  alerts are computed on read with no cron and no email, so the rows would promise a
  delivery mechanism that does not exist.

Anyone changing this surface should assume no configuration is stored: a new setting is a
migration plus a data layer, not a new row in this component. `sidebar.test.ts` pins the
tenant being passed to the modal, the honest placeholders when nothing resolves, and the
toast firing after save.

## Shell: nav curated from trusted role, rendering from props

`Sidebar` decides its Operations group from three independent inputs — real
`profiles.role` (via `isAdmin`), the platform-admin boolean, and `isTrainerRoute` — and a
trainer route strips everything but Settings regardless of role. That is why "Add user"
(admin-only) and "Add school" (platform-operator, ADR-006) are their own lists rather than
entries in `OPERATIONS`: hiding is usability, but the role is still the trusted one, so the
row can be shown to exactly the people whose route would accept it. The `All schools`
overview row is gated the same way, on `isAdmin && !isTrainerRoute`. Workspace rows are
never gated — Billing shows for everyone because its route redirects trainers server-side,
so the row is not a dead end.

The load-bearing detail is that both flags come from *trusted* sources in
`app/(dashboard)/layout.tsx`: `resolveTrustedRole(dbRole)` over the profile row, never
`resolveRouteRole`, whose `?role=` preview override would let any caller conjure an admin
row. `isPlatformAdmin` is the boolean `security definer` RPC behind
`modules/tenancy/data/platform.ts`, a different axis from `profile_role` — holding `admin`
at a school grants nothing there, and the layout passes the boolean rather than the
snapshot because a failed check should hide the row rather than link into a denial. Neither
flag authorizes anything: the route and Server Action re-check and RLS sits under both, so
`isAdmin: true` on the wrong person is a usability bug, not a leak. `role` and `fullName`
are the same server-resolved values, and both are required props — `null` means "it did
not resolve", rendered as `Name not set` and no role tag, so a caller cannot omit its way
into a plausible-looking identity. `tenants` is required for the same reason: an empty
array is an explicit "no real membership exists", and the switcher then renders locked
rather than listing a fabricated catalog.

The school switcher is links, not local state. Each active-school resolution reads the URL
segment, so the switcher, the nav hrefs and the page data always name the same school; a
script switcher that only changed a label was the audit-of-record bug (I1). Off a scoped
page it falls back to the default membership, then the first; with fewer than two
memberships it renders locked, and `tenant === null` renders `School not set`/`Tenant setup
pending` rather than a plausible name.

`Topbar` keeps only what the Sidebar cannot own — the sidebar-expand button and the bell —
because the Sidebar holds all branding, and the expand button has to live outside `<aside>`
once collapse sets it `visibility: hidden`. `MobileHeader` adds only the drawer hamburger
below 800px.

`MetricsRow` is a thin placement wrapper around `KpiSummary` and is used by the trainer
dashboard alone. That page does not pass `hideBilling`; it passes metrics that no longer
*have* billing keys, because `deriveTrainerMetrics` destructures `nextBilling`,
`openBillingObligations`, `billingDeadlinesMissing` and `overdueBilling` out of
`deriveDashboardMetrics` before returning. The trim is therefore in the DTO, not in CSS and
not in a prop switch — exactly rule 5. `KpiSummary` renders its billing card only when a
`billing` prop is supplied, so the school dashboard passes `billing={metrics}` and
`attention={…}` while `trainer` passes neither and gets only the active-batches, documents
and session-progress cards.

**Why the KPI row is not in the layout.** A root layout does not re-render on client-side
navigation, so a metric row placed there kept the *previous* school's numbers after a
school switch. Only two surfaces render one, each from its own data — and neither computes
a metric in the browser: the dashboard page derives `deriveDashboardMetrics` from
server-fetched batches and the trainer page derives `deriveTrainerMetrics` the same way.
A metric computed client-side from untrimmed rows would be the rule 5 regression to watch
for; the isolation contract is
[Tenant Isolation and RLS](/openwiki/architecture/tenant-isolation-and-rls.md).

**The trainer dashboard is a deliberate placeholder.** `app/(dashboard)/trainer/page.tsx`
renders the KPI row and a title/subtitle/link block, and nothing else: no panels, no
activity feed, and it fetches `getBatchesSnapshot()` with no tenant argument because
`can_read_batch` already limits rows to batches assigned to the caller. Its copy promises
"attendance and training progress", which is why it is self-contained — the `attendance`
module is still a README stub, so the page is sized to grow into an attendance home rather
than growing panels it would have to re-source later. Trainers are redirected here from
`/t/<code>/dashboard`.

`sidebar.test.ts` is the coverage for the nav and identity contract — escape-layer ordering
(menu before drawer before the op modals' own Esc), the switcher's locked and not-set
states, the user card's initials and role tag, the four Operations list permutations
including the trainer route, and URL-over-default school resolution. `display-role.test.ts`
pins the presentation counterpart: `toOfficeRole` and `resolveDisplayRole` narrow an
unknown or trainer role to the read-only `viewer` variant, and an unrecognised `?role=`
falls back to the trusted role rather than being treated as one. `status-render.test.ts`
covers the other half of the shell's display contract: status is text plus icon, never
colour alone (rule 23), and an absent source renders "not recorded" instead of `Infinity`
or a zero.

## Shell or module? where new chrome goes

`shell` is a module rather than `shared/` because its components carry tenant and data
context, and `shared/` must never import `modules/` (rule 9). Anything that starts reading
data or encoding a rule belongs to its owning module instead (rule 15) — and
analytics/settings show the corollary: a screen composition whose data is another module's
truth stays a thin consumer, because the alternative is a second fetch of the same rows and
a count that can drift. Import direction and the `data/` privacy zones that enforce it are
[Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md);
the route tree and the `(sections)` segment layout are
[Routing, Layout Gates and the Request Path](/openwiki/architecture/nextjs-routing-and-request-path.md);
the trainer-omission and RLS split is
[Tenant Isolation and RLS](/openwiki/architecture/tenant-isolation-and-rls.md).
