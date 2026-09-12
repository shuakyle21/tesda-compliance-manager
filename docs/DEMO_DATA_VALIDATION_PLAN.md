# Demo data & validation plan

Status: Draft — needs two decisions before any SQL is written (§2)
Date: 2026-09-10
Goal as asked: the demo account should hold enough demo data and seeds that every
function, screen and state of the app as it works today can be validated.
Relates to: [[ADR-005-demo-account-tenant-scoping]], [[ADR-004-untracked-document-semantics]],
[[ADR-006-platform-admin-and-school-registry]], `supabase/seeds/dev_profile_memberships.sql`,
`supabase/migrations/20260831120000_seed_dev_operational_data.sql`

---

## 1. The short answer

The goal as stated is **not reachable with the demo account as it exists today**, and
not because the seed is too small. Three things block it, and each needs a different fix:

1. **One account cannot show role behaviour.** `demo` is a single `viewer` on one
   school. Trainer field omission and viewer write-denial are enforced **server-side**
   (RULES.md), so they can only be seen by signing in as those roles. `?role=` does
   not test them — it is a preview override that is read *before* the database role,
   so it exercises the override path, not the real one.
2. **Two datasets are wanted, not one.** The current seed deliberately spreads five
   batches across three schools *to prove tenant isolation*, so AKB — demo's school —
   holds exactly one batch. Demo breadth wants many batches **inside one school**.
   Those two shapes fight each other in one file.
3. **Seeding reaches only two of the six required states.** Rule 24 requires loading,
   empty, no-results, error/sync-failed, permission-denied and stale-data on every data
   screen. Only *empty* and *no-results* come from data. The rest need env changes, a
   denied account, latency, or the "Data as of" path.

Everything below is what *is* reachable, plus what is honestly out of reach and why.

Three areas are excluded outright, with reasons in §8: attendance (FR-07), LAMR (FR-08)
and document preview/download. They cannot be validated by seeding at all.

---

## 2. Two decisions needed first

These change the whole plan, so they come before any SQL.

### Decision A — who is the demo account for?

ADR-005 decision 3 scopes it **internal only**. Two facts make that boundary
load-bearing rather than cautious:

- `NEXT_PUBLIC_DEMO_PASSWORD` is compiled into the client bundle and served to every
  browser that loads `/sign-in`.
- `?role=` outranks the database role, so demo's `viewer` restriction is not enforced
  against anyone willing to edit the URL.

If the audience is internal (you, a reviewer with repo access), both are tolerable and
this plan proceeds as written. If the audience is a **panel, evaluator, or TESDA
reviewer**, both are disqualifying and must be fixed before any demo data matters at all.

### Decision B — one demo account or one per role?

Validating role behaviour needs real accounts. Proposal:

| Clerk identity | `profiles.role` | Membership | Exists to prove |
| --- | --- | --- | --- |
| `demo-admin@…` | `admin` | AKB | full read/write, user + school admin screens |
| `demo-coordinator@…` | `coordinator` | AKB | same policies as admin today — records the distinction |
| `demo-trainer@…` | `trainer` | AKB | server-side omission of billing / NTP lag / BSRS fields |
| `demo-viewer@…` (today's `demo`) | `viewer` | AKB | read-only; writes denied by the server |
| *(existing platform admin)* | `admin` + `platform_admins` row | none | school registry reach, and that it stops there |

A trainer account is also the only way `batches.trainer_profile_id` becomes fillable —
the current seed leaves it NULL on purpose and carries the trainer as loose text, which
the trainer screens will eventually need.

**This reverses ADR-005 decisions 2 and 3.** It needs an ADR-007 (or an amendment to
005), not a quiet `update profiles set role = …`. Writing that ADR is a task in Phase 1.

---

## 3. Phase 0 — reconcile the database before adding data

The live project's migration history returns four versions:

```
20260528160300  create_tenant_scoped_schema
20260705070510  add_trainer_credentials
20260717054607  migrate_akb_tenant_and_drop_rogue_table
20260906114735  add_school_registry_and_platform_admin
```

So three checked-in migrations are **not tracked**:

- `20260831120000_seed_dev_operational_data` — yet `batches`/`learners`/`documents`
  hold row counts (5 / 89 / 40) matching its content exactly, so its data is present
  while its version is not recorded. Its `documents_batch_id_document_key_key` unique
  index is therefore of unknown existence, and **any new seed using
  `on conflict (batch_id, document_key)` fails without it**.
- `20260904120000_add_user_admin_write_policies`
- `20260906120000_ensure_invitation_membership_atomic`

And the school registry landed as `20260906114735` while its filename says
`20260906130000` — the same migration under two versions.

**Phase 0 tasks** (all read-only checks first; nothing applied without an explicit yes,
per RULES.md rule 36):

1. Confirm actual row counts with `select count(*)` — the numbers above are planner
   estimates and some are visibly stale (`scholarship_programs` reads 0 next to 40
   documents that reference it; `tenants` reads 1 next to batches spanning three
   school codes).
2. Confirm whether `documents_batch_id_document_key_key` exists.
3. Confirm `demo`'s membership is still AKB-only.
4. Decide per untracked migration: repair the history table, or re-apply idempotently.
5. Decide what to do about the duplicated school-registry version.

Until step 1 lands, every size figure below is provisional.

---

## 4. Workstream A — demo breadth dataset inside AKB

New file: `supabase/seeds/demo_tenant_dataset.sql`. Separate from the existing
migration so the isolation shape stays intact.

Target ~12–14 AKB batches, chosen so each is the *only* row exercising something. The
coverage this must hit:

| Dimension | Values to cover |
| --- | --- |
| `current_stage` | aou, ntp, tip, training, assessment, billing, completed, blocked (8) |
| `status` | pending, ongoing, completed, blocked (4) |
| `progress_percent` | 0, below the 80% billing threshold, exactly 80, above, 100 |
| Urgency tiers | every branch of `modules/batches/domain/urgency.ts`, driven by `end_date` relative to a fixed as-of date |
| Document mix | all-verified, all-missing, partial, and one batch with untracked requirements (ADR-004 — `docCompliancePct` must be `null`, not 0) |
| Billing readiness | not-ready, ready, and each packet state `draft → ready → generated → submitted → settled` from `modules/billing/domain/packets.ts` |
| Assessment results | competent, not_yet_competent, pending across learners |
| Programs | both TWSP and CFSP |
| Roster size | one small (≤5) and one large (≥30), for pagination and table density |

**Isolation assertion, restated.** ADR-005's "demo sees exactly one batch" stops being
the test. It becomes: **signed in as a demo account, `/dashboard` shows the N AKB
batches and zero J3ED or NEN batches.** Update ADR-005's assertion section when this
lands, or the next person will read five-vs-one as the regression signal.

Billing packet state is derived, not stored (ADR-003). Reaching each state means
setting the *inputs* that derive it — read `modules/billing/domain/packets.ts` and
`readiness.ts` and work backwards. Don't add a status column.

---

## 5. Workstream B — accounts, activity, and the empty tables

### B1 — role accounts
Create the Clerk identities from Decision B, then extend
`supabase/seeds/dev_profile_memberships.sql` (or a sibling `demo_accounts.sql`) with
their profiles and one membership each. Keep it a seed, not a migration — ADR-005's
reasoning holds: Clerk issues different IDs per instance, and a migration would insert
dead identities into the table RLS trusts most.

While editing that file, resolve the warning block already in it: it says the file no
longer matches the dev database, and running it as written would drop the developer's
J3ED and NEN grants.

### B2 — `activity_log` (0 rows)
`RecentActivityPanel` and `/activity-log` render an empty state on every screen today,
and `/activity-log` is paginated with nothing to page. Seed ~40–60 entries across the
AKB batches covering all seven `activity_action` values, spread over dates so relative
timestamps and the "Data as of" line have something to say. `profile_id` should point
at the new demo profiles so attribution renders.

### B3 — `trainer_credentials` (0 rows)
One row per demo trainer, so the profile screen and any trainer-credential surface has
content. Expiry dates: one comfortably valid, one near expiry.

### B4 — school registry (`tenant_qualifications`, 1 row)
Add several qualifications to AKB with COPR numbers, delivery modes and validity dates
so `/schools/new` and the qualification pickers show a realistic registry.

---

## 6. Workstream C — the six states

Seeding is one of five mechanisms. This matrix is the part a seed-only plan silently
skips. Mechanism per cell:

| State | How it is produced | Notes |
| --- | --- | --- |
| **empty** | a demo account with a membership in a school holding zero batches | needs one throwaway tenant; do **not** empty AKB |
| **no-results** | a filter/search in the UI that matches nothing | pure UI, no seed needed — but every filterable screen must be walked |
| **error / sync-failed** | point `NEXT_PUBLIC_SUPABASE_URL` at an unreachable host | must render the sync-failed banner **and** an honest empty state, never fabricated rows |
| **unconfigured** | remove Supabase env vars | distinct from sync-failed; must not substitute mock data |
| **permission-denied** | sign in as `demo-viewer` and attempt a write; and a profile with **no** membership for `no-tenant-access` | the no-membership case must render `NoTenantAccessState`, not the ordinary empty state |
| **loading** | throttle the network, or a deliberate delay in a dev-only branch | the weakest cell; may only be checkable by eye |
| **stale-data** | the "Data as of" timestamp on every screen showing relative dates | verify it is an exact timestamp, per rule 24 |

Deliverable: a route × state checklist covering all 15 dashboard routes, filled in by
hand during the walkthrough in §7. `no-tenant-access` needs its own profile with zero
memberships — worth adding as a fifth demo identity.

---

## 7. Workstream D — how "validated" gets proven

Seeding is setup, not validation. Three layers, cheapest first:

1. **Unit tests** (`pnpm test`, Node 22 required — the suite will not start on 21).
   Add specs asserting the seeded dataset hits every branch of `urgency.ts`,
   `readiness.ts`, `packets.ts` and `metrics.ts` at a fixed as-of date. These run
   against fixtures mirroring the seed, not the live database.
2. **RLS / tenant-isolation integration tests** against the real Supabase project, no
   mocks. CLAUDE.md already lists these as outstanding. This dataset is what makes them
   writable: sign in as each demo role and assert the row sets. This is the single
   highest-value item in the plan — it is the only automated check of the security
   boundary.
3. **In-browser walkthrough**, one pass per role, filling in the §6 matrix. `e2e/` and
   `playwright.config.ts` already exist, so the walkthrough can be captured as specs
   rather than done by hand each time.

Definition of done for the whole plan: every cell of the route × state matrix is either
ticked or has a written reason it cannot be, and the isolation assertion passes for all
five demo identities.

---

## 8. Deliberately out of scope, with reasons

- **Attendance (FR-07).** There is no attendance table, and `batches` has no
  `sessions_held`, `total_sessions` or absence column. So the locked domain facts
  "progress = sessions_held / total_sessions" and "≥5 absences is ineligible" cannot be
  driven by data at all. This needs a migration first (see the TES-36 Phase 0.1 work,
  which omitted those columns on purpose). Not a seeding task.
- **LAMR (FR-08).** Four tables, zero rows, and `modules/lamr/` is a README. Seeding
  would produce data no screen reads. Sequence: build the module, then seed.
- **Trainer routes.** `/trainer`, `/trainer/classes` and the two `[batchId]` routes are
  20–28-line placeholders with no data calls. A trainer account will sign in
  successfully and see placeholder text. Worth knowing before it reads as a seed bug.
- **Document preview / download.** `storage_path` and `external_url` are NULL by
  design — the existing seed's reasoning is that a dead link on a compliance document is
  worse than a visibly absent one. Uploading placeholder objects to
  `compliance-evidence` is a **decision**, not a seed detail. If demoing upload matters,
  decide it explicitly; the alternative is demoing the upload flow live.
- **The uncatalogued document keys** (`master_list`, `trainer_qual`, `progress_rpt`,
  `bsrs`, `nc_cert`). No row in `program_document_requirements`, and
  `documents.document_key` has no FK, so seeding them creates orphans that read as
  untracked under ADR-004. Fix the catalog separately; do not widen the seed.

---

## 9. Invariants any new seed must keep

These are reasoned decisions in the existing seed's comments, not boilerplate:

- **Batch codes stay obviously non-authoritative.** `DEMO-` prefix, greppable. Never
  invent RQM-shaped codes — `batch_code` is the RQM code parsed from a real NTP.
- **`official_system_reference` stays NULL.** TESDA SIS/T2MIS/BSRS are authoritative;
  this tool must never invent their references.
- **`uli` stays NULL.** ULI is the permanent learner key; a fabricated one pollutes the
  identity space real T2MIS records must occupy.
- **Learner names stay visibly synthetic.**
- **Only the 8 catalogued document keys.**
- **Idempotent.** Every insert carries a real `on conflict` target, so a re-run is a
  no-op — which depends on the Phase 0 unique-index check.
- **Copy never implies official approval or submission**, in seeded `summary` and
  `notes` text as much as in UI strings.

---

## 10. Sequence

| Phase | Work | Blocked by |
| --- | --- | --- |
| 0 | Read-only verification; decide the migration-drift repair | nothing |
| 1 | Decisions A and B; write ADR-007 | 0 |
| 2 | Clerk identities + `demo_accounts.sql` (B1) | 1 |
| 3 | `demo_tenant_dataset.sql` (A) | 0, 2 — needs trainer profile IDs |
| 4 | `activity_log`, `trainer_credentials`, registry seeds (B2–B4) | 3 |
| 5 | Unit specs pinning branch coverage | 3 |
| 6 | RLS / isolation integration tests | 2, 3 |
| 7 | Walkthrough + state matrix; update ADR-005's assertion | all |

Phases 0–2 are decision and verification work and should not be skipped to get to the
SQL: writing the dataset before the trainer accounts exist means `trainer_profile_id`
stays NULL and Workstream A gets rewritten.
