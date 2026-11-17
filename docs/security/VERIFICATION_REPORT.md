# Verification Report

Status on 2026-11-17: **one fix (item 1.1, findings F-01 and F-02) is written and verified on a
local test database. It is not applied to the hosted project.** Every other finding is open.

## 1. Evidence for the findings (Phases 3 and 4)

| Check | Result |
|---|---|
| Independent lanes | 9 Haiku lanes and the database architect each reviewed one scope without seeing the others' conclusions |
| Orchestrator re-read | The SQL and code behind F-01, F-02, F-05, F-06, F-09, F-11, F-14, F-15 were re-opened and match the reports |
| Architect review (Opus) | F-01 to F-16 re-read at the cited lines. Severity lowered for F-08, F-09, F-12, F-16. One addition: F-01 is also reachable through the normal assign-user screen |
| Agreement between lanes | F-01 and F-03 were reported independently by three lanes. F-05 by three. No lane contradicted another on a Critical or High item |
| Automated tool | `pnpm audit` was run once (F-19). Raw output kept outside the repo |
| Reproduction | F-14 was reproduced with Node's URL parser only. No other finding was exercised |

## 2. What has not been verified

- Nothing was run against the hosted database, storage, Clerk or any deployed URL.
- The live policies may differ from the migrations. Wave 0 of `REMEDIATION_PLAN.md` checks this.
- Lint, typecheck and the unit suite were not run as part of this audit, because no code changed.
- One auditor's claim that a documents page omits required props was not checked. It is a
  code-quality lead, not a security finding.

## 3. Process notes

- The threat-model agent's run was stopped by an automated safety check part-way through its
  scenario table. Sections 1 to 5 are its work. The orchestrator finished the rest at the
  level of missing controls, and the architect reviewed the consolidated findings afterwards.
- All ten Phase 3 agents were paused once by a usage limit and then resumed. No work was lost.
- The database agent's definition was loaded from the uncommitted file
  `.claude/agents/tvicams-db-architect.md` on the owner's machine. No agent named
  `database-design-database-architect` was found there.
- The database agent chose not to use the read-only live introspection tools, so its report is
  based on migration files only.

## 4. Per-finding verification table (to be completed in Phase 7)

"Test" is the regression test named in `REMEDIATION_PLAN.md`. A row is marked Verified only
when the test passes on a local stack and an agent that did not write the fix has compared
the diff with the finding.

| ID | Severity | Fix item | Fix status | Test evidence | Independent check | Result |
|---|---|---|---|---|---|---|
| F-01 | Critical | 1.1 | Written, not applied | 89 of 89 cases pass with the migration, 42 fail without it | Haiku verifier: pass with notes, both notes then fixed | Verified locally, open on the hosted project |
| F-02 | High | 1.1 | Written, not applied | same test file | same check | Verified locally, open on the hosted project |
| F-03 | High | 3.1 | Not started | none | none | Open |
| F-04 | High | 1.4, 2.1 | Not started | none | none | Open |
| F-05 | High | 1.5, 2.3 | Not started | none | none | Open |
| F-06 | High | 1.3 | Not started | none | none | Open |
| F-07 | High | 1.2 | Not started | none | none | Open |
| F-15 | High if set | 0.1, 1.10 | Not started | none | none | Open |
| F-08 | Medium | 1.11, 3.3 | Not started | none | none | Open |
| F-09 | Medium | 0.7, 1.8 | Not started | none | none | Open |
| F-10 | Medium | 1.7, 2.2, 3.4 | Not started | none | none | Open |
| F-11 | Medium | 1.6 | Not started | none | none | Open |
| F-12 | Medium | 3.5 | Not started | none | none | Open |
| F-13 | Medium | 1.13 | Not started | none | none | Open |
| F-14 | Medium | 1.9 | Not started | none | none | Open |
| F-17 | Medium | Wave 4 | Not started | none | none | Open |
| F-19 | Medium | Wave 4 | Not started | none | none | Open |
| F-20 | Medium | Wave 4 | Not started | none | none | Open |
| F-21 | Medium | 0.3, 0.8, 2.6, 3.6 | Not started | none | none | Open |
| F-22 | Medium | 0.5, 1.8 | Not started | none | none | Open |
| F-24 | Medium | 1.3, 1.6, 2.4, 3.5 | Not started | none | none | Open |
| F-27 | Medium (latent) | Wave 4 | Not started | none | none | Open |
| F-28 | Medium | Wave 4 | Not started | none | none | Open |
| F-16 | Low | 0.5 | Not started | none | none | Open |
| F-18 | Low | 0.10, 2.5 | Not started | none | none | Open |
| F-23 | Low | 1.12 | Not started | none | none | Open |
| F-25 | Low | 0.6, Wave 4 | Not started | none | none | Open |
| F-26 | Low | Wave 4 | Not started | none | none | Open |
| F-29 | Low | 3.2, Wave 4 | Not started | none | none | Open |

## 5. Item 1.1 verification detail (F-01, F-02)

Files: `supabase/migrations/20261117120000_harden_profile_and_membership_policies.sql`,
`supabase/rollbacks/20261117120000_harden_profile_and_membership_policies.rollback.sql`,
`supabase/tests/profile_membership_hardening.test.sql`.

| Evidence | Result |
|---|---|
| Test file on a database with all 11 migrations | 89 cases, 89 pass. Re-run by the author, the verifier (first version, 86 cases) and the orchestrator |
| Same test file on a database with only the 10 earlier migrations | 89 cases, 47 pass, 42 fail. Every security case fails, which shows the tests detect the problem |
| Denied cases | Each asserts the kind of refusal, then checks as a privileged role that the rows are unchanged |
| Rollback file | Restores the old policies and grants and removes the new objects. Checked by the verifier on a separate database |
| `pnpm lint` | Pass |
| `pnpm test` | 353 tests pass |
| `pnpm exec tsc --noEmit` | One error in `app/(dashboard)/t/[tenantCode]/(sections)/documents/page.tsx`. It exists on `main` and is not part of this change |
| Independent check | A Haiku agent that did not write the fix mapped each gap in F-01 and F-02 to the lines that close it |

The verifier found two gaps. Both were fixed in a second commit and re-tested: platform admin
seating now also requires an active, unassigned person, and the "denied" tests now check the
data is unchanged.

Limits of this evidence:

- The tests ran on plain Postgres 16 with small stand-ins for Supabase's `auth` and `storage`
  schemas. They have not run on a real local Supabase stack (`supabase db reset`). Do that
  before applying.
- The hosted database may differ from the migrations. Run the Wave 0 catalog queries first. If
  the live policies have other names, the `drop policy if exists` lines will not remove them.

What remains open after this fix:

- A role is still global (F-03). The fix works around it: an admin can change a person's role
  only when the admin belongs to every school that person belongs to.
- Every school admin can still list people who have signed up but belong to no school yet.
  This includes an admin who has no school. Plan item 3.7 narrows it to an exact-email lookup.
- No one can add a person who already belongs to another school. Before the fix an admin could,
  which was part of the problem. Per-school roles (3.1) are the proper way to bring that back.
- Two requests are still needed to assign a user (F-29).

### 5.1 Follow-up: concurrent first-membership race

A code review found a race. Both membership INSERT policies check "the person has no
membership yet" on the statement snapshot. Under READ COMMITTED, two admins of different
schools adding the same unassigned person at once can both pass, and with `is_default = false`
the unique index does not stop it. The person would end up in two schools with one global role.

Fix: section 8 of the migration adds an AFTER INSERT row trigger on
`public.profile_tenant_memberships`, `app_private.serialize_first_membership()`. For the
`authenticated` role only, it locks the person's profile row, then checks (fresh snapshot) for
any other membership and raises 42501 "This person already belongs to a school." if one exists.
service_role, the table owner and definer functions are untouched. It is an AFTER trigger so
that inserts the policies already refuse never reach it (no lock, no existence probe). The
rollback file drops the trigger and function.

| Evidence | Result |
|---|---|
| `profile_membership_hardening.test.sql` with the migration | 91 cases, 91 pass (two new cases: service_role second membership allowed; trigger refuses an assigned person even when a permissive test policy lets the insert through) |
| Same file without the migration | 91 cases, 48 pass, 43 fail |
| `profile_membership_concurrency.test.sh` with the trigger | Pass. Session A commits, session B fails with 42501, one membership exists |
| Same script with the trigger dropped | Fail. Both sessions commit, two memberships exist |

Limits: the concurrency test ran on plain Postgres 16 at READ COMMITTED. Under REPEATABLE READ
the second transaction would get a serialization error instead, which is also safe.

## 6. Final assessment (Phase 8)

Not written yet. It will list verified fixes, findings still open, and risks that remain.
