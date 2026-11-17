# Remediation Plan

Status: item 1.1 was approved on 2026-11-17 and is written and tested locally, **not applied**.
Every other item is proposed and waits for approval.

Finding IDs refer to `FINDINGS.md`. The plan was drafted from the auditors' proposals and
reviewed by the security architect (Opus), who changed or rejected some of them (see section 7).

## 1. Ground rules

- Every database change is a **new** migration file. No recorded migration is edited.
- Every migration is written together with its rollback migration.
- Everything is tested on a **local** Supabase stack (`supabase start`, `supabase db reset`).
  Nothing is tested on the hosted project.
- You approve each migration before it is applied to the hosted project. You apply it, not an agent.
- After any migration: regenerate `database.types.ts`, then update mappers (RULES.md rule 20).
- A finding is closed only when its test passes and an independent agent has checked the diff.

## 2. How the database fixes will be tested

Tests use pgTAP (`supabase test db`), a tool for writing tests in SQL. Each test switches to
the same database role the API uses and sets one test person's identity, then checks that an
action is allowed or refused. This runs the real policies, with no mocks.

Test people (in a test-only seed): admin A, admin B, coordinator A, trainer A, co-trainer A,
viewer A, platform admin, a user with no school, an inactive user, a member of an inactive school.

## 3. Wave 0: checks only you can do (no code)

These are dashboard settings and read-only queries. Do them first, because they tell us
whether the live database matches what the audit read.

| # | Action | Informs |
|---|---|---|
| 0.1 | In your hosting settings, check every environment for `NEXT_PUBLIC_DEMO_PASSWORD`. If it was ever set on a reachable build: remove it, rebuild, and change or delete the demo account's password in Clerk. | F-15 |
| 0.2 | Compare `profiles` with your Clerk user list: does each `clerk_user_id`, `role` and `is_active` look right? Does the platform admin's profile still point to your own Clerk user, and have no school? | F-01, F-02 |
| 0.3 | Run the catalog queries below in the Supabase SQL editor and paste the results back. | F-01, F-05, F-21, F-25 |
| 0.4 | Run the data checks below. | Waves 1 and 2 |
| 0.5 | Clerk dashboard: set sign-up to invitation-only ("Restricted") if open sign-up is not needed. Confirm email verification is required. | F-16, F-22 |
| 0.6 | Supabase dashboard, Authentication: turn off Supabase's own email sign-ups. The app uses Clerk only. | F-25 |
| 0.7 | For users who joined by invitation, clear the invitation keys from their Clerk public metadata. | F-09 |
| 0.8 | Do not use the Supabase MCP connection in write mode on the hosted project. | F-21 |
| 0.9 | Check how long Supabase keeps API and Postgres logs on your plan. Until Wave 3 this is the only audit trail. | F-12 |
| 0.10 | In Clerk, end the sessions of the development user whose old cookie is committed. | F-18 |

Read-only catalog queries for 0.3:

```sql
-- Policies that are really live
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname in ('public','storage') order by 1,2,3;

-- Who may update which profile columns
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles'
  and grantee in ('anon','authenticated') order by 1,2,3;

-- Functions: definer or invoker, search_path, who can execute
select n.nspname, p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'execute') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','app_private') order by 1,2;

-- Storage bucket settings
select id, public, file_size_limit, allowed_mime_types from storage.buckets;
```

Read-only data checks for 0.4 (each returns a count, no personal data):

```sql
-- People who belong to more than one school (decides how F-03 affects the F-01 fix)
select count(*) from (
  select profile_id from public.profile_tenant_memberships
  group by profile_id having count(*) > 1) t;

-- Child rows whose school differs from their batch's school (must be 0 before Wave 2)
select 'learners' as t, count(*) from public.learners c join public.batches b on b.id = c.batch_id where c.tenant_id <> b.tenant_id
union all select 'documents', count(*) from public.documents c join public.batches b on b.id = c.batch_id where c.tenant_id <> b.tenant_id
union all select 'attendance_records', count(*) from public.attendance_records c join public.batches b on b.id = c.batch_id where c.tenant_id <> b.tenant_id
union all select 'billing_records', count(*) from public.billing_records c join public.batches b on b.id = c.batch_id where c.tenant_id <> b.tenant_id
union all select 'lamr_reports', count(*) from public.lamr_reports c join public.batches b on b.id = c.batch_id where c.tenant_id <> b.tenant_id;

-- Files in the evidence bucket, and inactive schools that still have members
select count(*) from storage.objects where bucket_id = 'compliance-evidence';
select count(*) from public.tenants t where not t.is_active
  and exists (select 1 from public.profile_tenant_memberships m where m.tenant_id = t.id);

-- Learners with no ULI
select count(*) from public.learners where uli is null;
```

## 4. Wave 1: small changes that close the Critical and the easy Highs

App code today writes only `profiles`, memberships and the school-creation path. It never
writes documents, attendance, LAMR, billing records, storage or reference tables. So
tightening those write rules has almost no risk for existing screens.

| # | Fix | Closes | Kind | What could break | Test |
|---|---|---|---|---|---|
| 1.1 | Profiles and memberships rewrite (details below) | F-01, F-02 | Migration + small app change | The assign-user flow in `modules/tenancy/data/users.ts`, platform admin seating in `platform.ts` and `schools.ts` | pgTAP list below |
| 1.2 | Reference tables: writes for platform admin only, same pattern as `qualifications` | F-07 | Migration, 5 policies | Nothing in the app. Hand edits of rates must be done as platform admin | Coordinator and school admin refused, platform admin allowed |
| 1.3 | Trainer document rules: status limited to pending or submitted, verifier fields empty, `submitted_by` is the caller, row's school equals the batch's school | F-06, part of F-04, F-24 | Migration, 2 policies | Nothing today. A future trainer upload screen must not send verifier fields | Trainer "verified" write refused, normal submit allowed, office verify allowed |
| 1.4 | Child rows: the "after" check also requires the row's school to equal the batch's school, through a trusted helper | F-04 (interim) | Migration | Low. A plain subquery would block co-trainers, so a helper is used | Cross-school insert refused, trainer and co-trainer writes allowed |
| 1.5 | Storage: viewers cannot upload or overwrite, overwrite for office roles only, allowed file types set on the bucket | F-05 (most) | Migration | Nothing, upload is not wired | Viewer upload refused, coordinator allowed, bad file type refused |
| 1.6 | Audit log: no viewer inserts, a trigger stamps the actor and time from the session | F-11, part of F-24 | Migration | Nothing, the app never writes it | Viewer refused, forged actor replaced by caller |
| 1.7 | LAMR: trainers may insert and update, only office roles may delete | F-10 (part) | Migration | Nothing, no LAMR writer in the app | Trainer delete refused, trainer update allowed |
| 1.8 | Webhook: apply an invitation's school once, keep the retry repair, store only the primary verified email | F-09, F-22 | App + tiny migration | Medium. This is the invitation flow | Vitest: applied once, not restored after removal, unverified address not stored |
| 1.9 | Redirect check: parse with `URL` and compare origins | F-14 | App | Deep links after sign-in | Vitest with control characters, backslashes, `//`, normal paths |
| 1.10 | Remove the demo password from browser code | F-15 | App | The demo button stops filling the form | Build, then search the output for the variable name |
| 1.11 | Office pages under `/t/`: redirect trainers, and refuse when the role is unknown | F-08 (app part) | App | Trainers with bookmarks get redirected | Test per page |
| 1.12 | `import 'server-only'` in `lib/supabase/service.ts` | F-23 | App | None | Build |
| 1.13 | `can_access_tenant` also requires an active school | F-13 | Migration | Only if check 0.4 finds members in an inactive school | Member of inactive school reads nothing |

### 1.1 in detail (the Critical)

Tools used, and why each one:

- **Column grants.** Remove the table-wide update right on `profiles`, then allow updates only
  on `role`, `is_active`, `full_name`. This makes `clerk_user_id` and `email` impossible to
  change through the API. It is simple and declarative.
- **Trusted helper functions inside the policies.** A `security definer` function runs with
  its owner's rights, so it can see every membership. Each helper answers only yes or no, for
  example "does this profile have any membership at all?". This fixes the faulty "unassigned" test.
- **A small trigger as a safety net.** It rejects any change to `clerk_user_id` unless the
  caller is the service role. It exists in case a later migration re-grants table-wide rights.

The rules the new policies will express:

1. A school admin can **see** a profile only if it shares a school with them, or it truly has
   no school, is active and is not a platform admin.
2. A school admin can **change** `role`, `is_active` or `full_name` only if every school that
   profile belongs to is one the caller administers, or the profile truly has no school. Never
   a platform admin's profile. (The "every school" part is needed because roles are global.)
3. The "after" check repeats rule 2.
4. A school admin can **add a membership** only to their own school, only for an active,
   non-platform-admin profile with no school. One default per profile. `is_default` is not
   restricted: the person has no other school, so `true` is correct for this first school.
   (Changed from the first draft, which said `is_default = false`; the app writes `false`
   until the migration is live, and both values land correctly.) Two admins adding the same
   person at the same moment are serialized by a lock on the person, so only one succeeds.
5. Platform admin seating gets the same "truly unassigned" test.

What must keep working: `setTargetRole`, `restorePriorRole`, `grantMembership` and
`findUserByEmail` in `users.ts`; webhook provisioning (service role, unaffected); school
creation and first-admin seating; sign-in for every role.

One visible change: looking up a person who belongs to another school will return "not
registered". The screen should then say "this person already has an account at another
school, contact the platform operator".

pgTAP tests: admin A cannot see or change admin B's profile; cannot see or change the platform
admin; cannot change `clerk_user_id` or `email` on any profile; can set the role of an
unassigned user and add them to school A; cannot add a school-B member or the platform admin;
cannot change the role of someone who is also in school B; a second default is refused;
platform admin can still seat a first admin and still cannot seat themselves; coordinator A
can do none of it.

Rollback: a migration that restores the old policy text and grant. Use it only if the assign
flow is broken for real users, and switch the assign screen off at the same time, because the
old state is the Critical finding.

## 5. Wave 2: changes that need a data check first

| # | Fix | Closes | Check first | Rollback |
|---|---|---|---|---|
| 2.1 | Composite foreign keys `(batch_id, tenant_id)` to `batches(id, tenant_id)` on child tables. Added as `not valid` (applies to new rows), then validated | F-04 | Mismatch counts from 0.4 are zero | Drop the constraint |
| 2.2 | `billing_records.batch_id` becomes `on delete restrict` | F-10 | No flow deletes billed batches | Swap back |
| 2.3 | Storage: trainers limited to their batch folders, office-only files for office roles. Folder parsing in a helper that returns null on bad input | F-05 (rest) | Layout of existing object paths | Recreate old policies |
| 2.4 | ULI format check, added as `not valid` | F-24 | Counts of empty and malformed ULIs | Drop the check |
| 2.5 | Replace real emails and Clerk ids in seeds with placeholders, remove the connection header lines, delete the committed cookie file | F-18 | Which seeds are still needed | Not needed |
| 2.6 | Bring repo and live back in line: either add a migration for the untracked `tenants` policy or drop it live | F-21 | Output of 0.3 | Not needed |

## 6. Wave 3: design decisions that need an ADR

| # | Decision | Closes |
|---|---|---|
| 3.1 | Per-school roles: move `role` to the membership row | F-03 |
| 3.2 | One database function for "assign user to school with role", then remove direct writes. Closes the concurrent-assignment role race left after item 1.1 (see F-29) | F-29, hardens F-01 and F-02 |
| 3.3 | Move financial, NTP and deadline columns from `batches` to an office-only table, and build a separate trainer DTO | F-08 |
| 3.4 | Archive batches instead of deleting them | F-10 |
| 3.5 | Audit logging by database triggers (role, membership, verification, billing, deletes), plus logging of refused actions | F-12, F-11, F-24 |
| 3.6 | A staging Supabase project; agents point there | F-21 |
| 3.7 | Unassigned users: exact-email lookup instead of a browsable list | F-01 residual |

## 7. Wave 4: hardening

- Security headers in `next.config.ts`. Frame protection, HSTS, `nosniff`, referrer policy
  first. CSP in report-only mode first, because Clerk needs specific sources. (F-17)
- Upgrade `next`. Remove unused packages. Serve Swagger docs in development only. (F-19, F-26)
- CI: lint, typecheck, test, build on every PR. Pin actions to commit ids. Author check on the
  `@claude` workflow. CODEOWNERS on migrations, workflows and agent instruction files.
  Dependabot, and make the existing CodeQL check required. (F-20)
- `.mcp.json` read-only. (F-21)
- `set_updated_at` gets a `search_path`. `current_clerk_user_id` reads `sub` only. (F-25)
- Remove the debug route. Disable `?state=` in production. (F-26)
- Before wiring upload or import: server-side file type check, forced download, size and row
  limits, shaped errors, batch-in-school check on the storage path. (F-27)
- Rate limits on invitations and school creation. Paginate the batches query. (F-28)
- Let co-trainers read the batches they can write. (F-29)

## 8. Proposals the reviewer rejected or changed

| Proposal | Why not |
|---|---|
| Revoke the financial columns on `batches` | Admins and coordinators use the same database role as trainers, so it would hide the columns from them too. Use a separate table (3.3). |
| F-04 interim check as a plain subquery on `batches` | Co-trainers cannot read the batch, so it would block their attendance writes. Use a helper (1.4). |
| Apply the invitation grant only on `user.created` | It removes the retry repair that the invite flow relies on. Record "applied" instead (1.8). |
| A regex test and a `::uuid` cast in one storage policy expression | Postgres may run the cast first and raise an error. Parse in a helper (2.3). |
| A trigger alone for F-01 | It is a safety net. Column grants and correct policies are the fix. |
| Testing on the hosted project | One project, known drift. Local stack only. |

## 9. Decisions only you can make

| # | Question | Recommendation |
|---|---|---|
| 1 | May school admins browse the list of unassigned users, or only look up one exact email? | Exact email only |
| 2 | Until per-school roles exist, may one person belong to two schools? | Only through the platform admin, rarely |
| 3 | Is RULES.md rule 5 (trainers never see financial or NTP data) a hard requirement? | Yes. That makes F-08 High and 3.3 a priority |
| 4 | May the codebase add its first `security definer` function for user assignment? | Yes, after Wave 1 is stable |
| 5 | May a batch with billing history ever be deleted? | No. Archive instead |
| 6 | Rewrite git history to remove the seed data and the old cookie? | No. The cookie is expired and no key was found. Remove going forward |
| 7 | Keep a demo account on any deployed instance? | No |
| 8 | Create a staging Supabase project before Wave 2? | Yes |
| 9 | Who owns national reference data? | Platform admin only |
| 10 | Open sign-up or invitation-only? | Invitation-only |

## 10. Suggested order

1. Wave 0 today (you).
2. Wave 1 item 1.1 on its own branch, with its tests. This is the Critical.
3. The rest of Wave 1 as two changes: one migration for 1.2 to 1.7 and 1.13, one app change
   for 1.8 to 1.12.
4. Wave 2 after the data checks come back clean.
5. Wave 3 as ADRs, one at a time.
6. Wave 4 as normal backlog.
