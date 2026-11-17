---
type: operations-runbook
title: Operating the Live Database and Landing Migrations
description: How to run statements against the one hosted Supabase project under rule 36 — what is refused without a permission ask and how the refusal is wired — plus the read-only introspection tools and their estimation traps, the version-string recording trap, and the ordered steps for landing an additive migration and reconciling the type layer.
tags: ["operations", "supabase", "migrations", "rule-36", "permissions-deny", "migration-ledger", "introspection-traps", "database-types"]
verified:
  - by: openwiki/0.5.0
    at: 2026-11-17T04:33:34.390Z
---

# Operating the Live Database and Landing Migrations

This page is the *procedure*. What the live schema actually is, which migration created what, and the RLS detail that decides access live on [Data Model and RLS](/openwiki/architecture/data-model-and-rls.md) and [Tenant Isolation and RLS](/openwiki/architecture/tenant-isolation-and-rls.md); the local gate that has to be green before any of this is worth doing is on [Verification and Test Strategy](/openwiki/operations/verification-and-test-strategy.md). Read this page when you are about to touch the project, not to answer a schema question.

## The rule, stated exactly

`RULES.md` rule 36, `[deny]` level:

> **Never execute statements against the live Supabase project without explicit user permission, or an agreed plan that covers it.** Covers `execute_sql` (**including read-only `select`s** — the tool is denied, not the statement kind), `apply_migration`, branch create/merge/reset, and edge-function deploys, by any route: the MCP server, the CLI (`db push`, `db reset`, `migration up`), or `psql`. State exactly what happened and why, then wait. There is one hosted project and no staging, so an unreviewed statement lands on real tenant data.

Two things about the phrasing matter more than the list. The line is drawn at the **tool**, not the statement kind: `list_migrations` sails through, a `select count(*)` through `execute_sql` does not. And the rule is *permission first* — stating a plan is not a yes. The `/users/new` screen cannot assign anyone, for instance, without policies that a migration must apply; wanting the screen working does not authorise the push.

Everything the rule protects is **real tenant compliance data**. There is no throwaway database to rehearse on: `supabase db reset` against a project that is not the local stack is indistinguishable from an outage, and a wrong `alter table` lands on schools' learner records.

## How the refusal is actually wired

Rule 36 is not a habit, and the mechanism is `.claude/settings.json`'s `permissions.deny` (committed, because `.gitignore` re-includes it) plus the Supabase MCP server registration in [`.mcp.json`](/.mcp.json) — bound to the single hosted project `azywaivpyphhsblxjgtn`.

The deny list:

- **MCP tools, in two spellings each** — `mcp__supabase__*` and the instance-id-prefixed `mcp__bd43a5a2-…__*`: `execute_sql`, `apply_migration`, `deploy_edge_function`, `create_branch`, `delete_branch`, `merge_branch`, `rebase_branch`, `reset_branch`.
- **CLI, under both `supabase` and `npx supabase`**: `db push`, `db reset`, `migration up`.
- **`Bash(psql:*)`** — the direct route, which no wrapper can sanity-check.

Because `permissions.deny` is session-wide, an agent cannot request an exception in-session: lifting a deny means editing the file first. Three unrelated destructive shell commands (`rm -rf`, `git reset --hard`, force-push) sit in the same list, and four work-discarding Git commands (`checkout --`, `restore`, `clean`, `stash`) are parked in `permissions.ask` — so "the deny list" as a whole is about protecting uncommitted work, and rule 36 is one section of it.

`/docs/agents/issue-tracker.md` carries the same obligation into task filing: a `research` ticket that needs the live project is noted as such and not auto-fired. A companion rule keeps reviewers from being the exception — a review agent may run `Bash` and the suite but is bound by the same deny file (rule 37).

**The state that makes this concrete.** `supabase/migrations/20261024110000_add_dashboard_operational_fields.sql` is the standing example of the rule doing its job: written, reviewed under [ADR-008](/docs/adr/ADR-008-recorded-batch-billing-deadline.md), and left sitting with `NOT APPLIED — RULES.md rule 36 requires explicit permission` in its own header (line 5). [ADR-008's Applying section](/docs/adr/ADR-008-recorded-batch-billing-deadline.md) says the same and adds the post-apply step — apply with `apply_migration` only on a yes, then rename the file to the version Supabase recorded. That is the shape of every ask.

## Read-only: what you may run without asking

Rule 36 names its own escape hatch. Answer schema questions from the checked-in migrations and `lib/supabase/database.types.ts` **first**; the read-only introspection tools — `list_tables`, `list_migrations`, `get_advisors`, `search_docs` — remain available for what those cannot answer. `supabase/migrations/README.md` shows the intended use, in one block, before a push: read the recorded versions, then the tables.

Both introspection tools lie in ways that have already cost this repo time. Use them as indexes, never as evidence.

| Tool | What it actually returns | The trap |
| --- | --- | --- |
| `list_tables` | tables with an `rls_enabled` flag, plus a **row count that is a `reltuples` planner estimate** | estimates have been wrong *by whole orders of magnitude* — a table reporting 0 held 16 rows. Never call a table empty on it; a real `count(*)` costs an `execute_sql` ask |
| `list_tables` | the table list itself | a **column** is never authoritative from here. ADR-007's `excused`/`max_absence_percent` swap has to be read from the migration |
| `list_migrations` | recorded **version strings** | says nothing about objects. A hand-applied file has its objects and no version |
| `list_migrations` vs a directory listing | two orderings | neither is the deployed schema. Comparing them is how a benign difference becomes a question nobody can answer |

**Confirm by name, never by set.** To check that one migration landed, look for *its* objects: `pg_proc` for functions, `pg_policies` for policies. Do not compare policy *sets* — several migrations add policies to the same tables, so a set comparison comes back a superset and reads as a match no matter what is missing. The same reasoning applies to columns: ask for `attendance_records.excused` by name, not for "the ADR-007 columns".

**A real `execute_sql` ask looks like this:** state the statement verbatim, say which object and version it verifies, and say what you will do with the answer. That is a request, not a run.

## The version-string recording trap

Supabase keys its applied-migrations table on the **version string** — the numeric prefix of the filename — not on file content.

Because the key is a name, the repo and the database can silently diverge, and both directions have bitten this repo (issue #230):

- **Renaming a file makes it look unapplied.** The recorded version matches no filename, so `db push` re-runs a file whose objects already exist. The standing fix is to name the file for the version that was actually recorded; both surviving renames (`20260906114735`, `20261024071359`) were made for exactly that reason.
- **Applying SQL by hand records nothing.** The objects exist and the migration table has no row, so the database ends up *ahead* of its records. Neither the directory nor the migration table can then answer "what is deployed?" — and the next `db push` starts from the wrong ordering.

`apply_migration` carries its own variant of the first trap: the tool assigns the version itself, so a file written with a guessed timestamp is renamed by reality. Check the version it recorded and rename to match.

Three further consequences follow, and they are why checked-in text is never evidence:

- A `-- Active: <connection string>` header is the marker a SQL editor writes when a buffer runs against a live connection. Two migrations carry one, both duplicated: [`20260906114735`](/supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql) and `20261024110000`. **A `-- Active:` line means hand-execution, with no record written.**
- **Repair-recording** is the honest repair, and the ledger says so in those words: verify the objects live (by name), then insert the version rather than re-run the file. It is a compromise — it records *that objects match*, not that the file reproduces them from scratch.
- A **header cannot be trusted over a ledger**. `20261024110000`'s header says NOT APPLIED while its `billing_deadline` column is live and the ledger marks it "partly checked". A header is an author's belief on a date; a dated ledger block is an operator's check on a date. The ledger wins, and where both are stale only `list_migrations` plus objects-by-name settles it — behind rule 36.

## Additive wins, and why it is safe whichever way the question lands

Migrations run in **filename order**, so a new file that only adds or alters objects created by an existing file is correct whether that file ran before or runs for the first time in the same push.

That is what makes the additive rule survive an *unanswered* applied/unapplied question, and it is how [ADR-007](/docs/adr/ADR-007-attendance-based-dropout-rule.md) was re-cut after being written as an in-place edit: the schema change moved into `20261024071359_adr007_attendance_dropout_rule.sql` because `20260910120000` had meanwhile been recorded, and editing a recorded file changes only the repository. A recorded version still matches, so nothing re-runs, and the repo ends up claiming an object the database does not have. The canonical file `20260528160300_create_tenant_scoped_schema.sql` is the one to read for shape and for RLS style (rule 20).

The other half of additive is **guarding every statement** so a re-run is a no-op. `20261024071359` guards each one (`add column if not exists`, `drop column if exists`); `20261111120000` does not, using bare `add constraint` — which is exactly why, when its objects were found already live, the repair (re)created them from an idempotent script instead of re-running the file.

## Landing a migration, in order

1. **Write an additive file** named `<UTC timestamp>_<what_it_does>.sql`, guarded throughout, with a header that says what it is and cites its ADR. Do not edit a recorded migration; if the object you need altered is in a recorded file, add a new one.
2. **Check for data preconditions** in the file itself as a comment, since the whole file runs in one transaction and a failing statement rolls it back. `20261111120000` does this for its ULI unique index: a duplicate `(tenant_id, batch_id, uli)` fails the migration, so the query to check is written in next to it.
3. **Commit the file without applying it.** This is a complete, mergeable change: the file is a *pending claim* until someone records it. Keep it pending, and say so in the header.
4. **Read the record and the objects-by-name before asking.** `list_migrations`, then the `pg_policies`/`pg_proc` checks. The question is *which objects exist*, not whether a dump looks familiar.
5. **Ask, stating what will run and why.** Wait. Rename the file to whatever version the apply tool assigns.
6. **Record it** in [`supabase/migrations/README.md`](/supabase/migrations/README.md) — a new dated block, one row per file, with the file name, Recorded, Objects present, and the verification used. Creating that table is mandatory; a file with no ledger row is drift.
7. **Regenerate `lib/supabase/database.types.ts`** ([rule 20](/RULES.md)), then **update the affected mappers and domain types** — including any total enum bridge, where a new variant must fail compilation until its UI treatment is chosen (rule 18). The runbook sorts by migration, not by feature: map it to the owning module's `data/` and `domain/` files.

Step 7 is where the loop currently stops, and the reason is mechanical: **a generator output is a snapshot of one database**, so regeneration is safe only against a database already holding *every* object the file describes. It does not. The file is hand-maintained, carries `billing_deadline` and the T2MIS shapes **by hand ahead of their records**, and holds no `excused`, no `max_absence_percent` and none of the billing tables. Regenerate today and the generator deletes the hand-carried halves. Until the objects are applied and recorded in a full inventory, hand-carry the type and mirror it with a `?? null` at the mapper.

## Reading drift defensively

Checked-in SQL and the type layer can run ahead of the database, so mappers must tolerate objects that are not there yet and let the shape change beneath them.

The working pattern: a hand-written insert that tolerates the object's absence, and a read that distinguishes "column absent" from "value null". `modules/batches/data/learners.ts` writes `learner_details` for the T2MIS import, and its roster read embeds the table — so before `20261111120000` applied, every cell had to render blank rather than error. That is achieved with `?? ''` per cell, against a column that may be a legitimately-null "not recorded". On the deadline side, `billing_deadline ?? null` is the same mechanism from the other direction: `select('*')` yields `undefined`, never `null`, when the column is absent, so a bare null check would read a missing column as "no deadline recorded".

The cost of this pattern is that a bug which *needs* one of these columns to exist produces blanks, not a crash. Keeping it means keeping one rule: `orEmpty` / `?? null` at the mapper, and a real error everywhere else.

## What the environment looks like

[`.env.example`](/.env.example) is not the database — it documents the **Clerk `pk_test_*`/`sk_test_*` pair** and `E2E_CLERK_USER_*` for Playwright. Supabase's two variables are stack-level; `SUPABASE_SERVICE_ROLE_KEY` is read *only* by [`lib/supabase/service.ts`](/lib/supabase/service.ts) and must never be `NEXT_PUBLIC_` (rule 3). Every path that is not a service-role call goes through anon key plus the Clerk session token, so RLS decides.

`isSupabaseConfigured()` — the first thing a data function checks — only looks for the *public* pair. So a host with no service-role key still serves every RLS-scoped read and returns `unconfigured` snapshots, while the Clerk webhook's provisioning fails at request time with the service client's own missing-env throw. Absent variables also make the live RLS tests fail in a way that reads like a policy bug; check them before believing a failure.

## Failure modes, ranked

1. **Re-running an applied migration** — from a renamed file, a hand-applied one, or a directory running ahead of `list_migrations`. A file whose statements are not guarded applies partially, or rolls back only because the CLI wrapped it in a transaction.
2. **A pending file left pending.** It reads as done; every read above it carries `?? null` indefinitely. `20261024110000` is this state and must be verified by name and recorded *before* any `db push`.
3. **Regenerating against a database missing objects.** It silently drops hand-carried types and the divergence moves into compile-time silence.
4. **A normalisation-only edit to a recorded migration.** It changes the repo, never the database, and the two copies diverge invisibly — the repo has had formatter churn land inside the already-applied canonical file.
5. **Trusting a `reltuples` row count, a policy-set diff, or a `NOT APPLIED` header.** Each is a record of a belief on a date, never a measurement.