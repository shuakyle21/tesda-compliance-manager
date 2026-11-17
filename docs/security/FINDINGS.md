# Findings

OWASP security audit of TVI-CAMS, 2026-11-17. Read-only review of the repository on `main`.

**Counts:** 1 Critical, 6 High, 1 conditional High, 15 Medium, 6 Low. Nothing has been fixed yet.

## How to read this

- **Confirmed** means the SQL or code in the repository shows the gap. An auditor found it, the
  orchestrator re-opened the cited lines, and for F-01 to F-16 the security architect (Opus)
  re-read them too.
- **Potential** means it depends on something the repository cannot show, such as a hosted setting.
- **Nothing was run against the live database.** The live project has drifted from the
  migrations before (`supabase/migrations/README.md`), so the first step of the fix plan is to
  confirm the live state with read-only queries.
- Findings describe the **missing control**. They are not instructions for abusing it.
- Migration short names: `canon` = `20260528160300_create_tenant_scoped_schema.sql`,
  `useradm` = `20260904120000_add_user_admin_write_policies.sql`,
  `registry` = `20260906114735_add_school_registry_and_platform_admin.sql`,
  `billing` = `20260910120000_add_adr001_billing_domain.sql`. All under `supabase/migrations/`.

**Why most of these are real even though the app looks fine:** the Supabase URL and anon key
are public, and every signed-in user holds their own session token. Anyone can call the
database API directly and skip the Next.js app. So the only checks that count are the ones in
Postgres row-level security (RLS). A hidden button protects nothing.

## Summary

| ID | Severity | OWASP | Title | Status |
|---|---|---|---|---|
| F-01 | **Critical** | A01, API3 | A school admin can edit user profiles in every school, including the login link | Confirmed |
| F-02 | High | A01, API1 | Membership insert checks the school but not the person | Confirmed |
| F-03 | High | A04 | A role is global, not per school | Confirmed (design) |
| F-04 | High | A01, API1 | Child rows are not tied to their batch's school | Confirmed |
| F-05 | High | A01, A05 | File storage checks school membership only | Confirmed |
| F-06 | High | A01, API3 | Trainers can mark their own documents as verified | Confirmed |
| F-07 | High | A01, API5 | Any school's admin or coordinator can edit national reference data | Confirmed |
| F-15 | High if set | A02, A05 | Demo password is read in browser code | Confirmed in code, deployment unknown |
| F-08 | Medium | A01, API3 | Trainers can read billing, NTP and deadline fields | Confirmed |
| F-09 | Medium | A07, A08 | An invitation's school grant can be applied again later | Confirmed |
| F-10 | Medium | A04 | Deleting a batch also deletes "append-only" billing records | Confirmed |
| F-11 | Medium | A09 | Anyone in a school can write audit-log rows in any name | Confirmed |
| F-12 | Medium | A09 | The app never writes the audit log, and nothing records denied actions | Confirmed |
| F-13 | Medium | A01 | A deactivated school keeps its access | Confirmed |
| F-14 | Medium | A01 | The after-sign-in redirect check can be bypassed | Confirmed |
| F-17 | Medium | A05 | No security headers | Confirmed |
| F-19 | Medium | A06 | Dependencies with known advisories, unused packages | Confirmed by `pnpm audit` |
| F-20 | Medium | A08 | CI has no quality gate and loose workflow settings | Confirmed |
| F-21 | Medium | A05 | One production database, no staging, write-capable agent access, repo and live differ | Confirmed |
| F-22 | Medium | A07 | Webhook stores the first email without checking it is primary or verified | Potential |
| F-24 | Medium | A08 | "Who did this" columns are supplied by the client; ULI can be empty | Confirmed |
| F-27 | Medium (latent) | A04, A05 | Upload and CSV import code is not safe to switch on yet | Confirmed, not yet reachable |
| F-28 | Medium | API4 | Unbounded queries, no rate limits | Confirmed |
| F-16 | Low | A07 | Invite-code check exists only in the browser | Confirmed |
| F-18 | Low | A02 | Session cookie, real emails and ids, a hostname and an IP are committed | Confirmed |
| F-23 | Low | A05 | Service-role module has no server-only guard | Confirmed |
| F-25 | Low | A05 | Small function hygiene gaps; hosted sign-up setting unknown | Confirmed / Potential |
| F-26 | Low | A05 | Debug route, docs routes and preview overrides | Confirmed |
| F-29 | Low | A04 | Role change is not atomic; co-trainers can write but not read | Confirmed |

---

## Critical

### F-01. A school admin can edit user profiles in every school, including the login link

- **OWASP:** A01 Broken Access Control. API3 Broken Object Property Level Authorization.
- **Component:** RLS policies on `public.profiles`; the "assign user" screen.
- **Where:** `useradm:45-56` (read policy), `useradm:64-88` (update policy), `canon:467`
  (table-wide grant), `canon:494-498` (membership read policy),
  `modules/tenancy/data/users.ts:147-177, 262-266`.

```sql
-- useradm:84-88, the whole "after" check of the update policy
with check (
  app_private.current_role() = 'admin'
);
```

- **What is wrong, in plain words.** Three gaps add up:
  1. *No column limit.* The policy says who may update a profile. It does not say which
     columns. Because of the table-wide grant, that includes `clerk_user_id` (the link between
     a login and a person), `email`, `role` and `is_active`.
  2. *The "unassigned" test is wrong.* The policy lets an admin edit profiles that have "no
     membership". But that test is a subquery, and a subquery inside a policy only sees rows
     the caller is allowed to read. An admin can only read memberships of their own school.
     So every person in every *other* school looks like they have no membership.
  3. *The "after" check is too thin.* It only re-checks that the caller is an admin.
- **Precondition:** one account with the `admin` role in any school.
- **Impact:** that admin can see the name, email and role of people in all schools, change
  their role or switch them off, and re-point a profile to a different login. The platform
  admin has no school by design (ADR-006), so their profile is in the same pool. One school's
  admin can therefore reach other schools and the platform level.
- **It also happens by accident.** The normal "assign user" screen looks people up by email
  under the same faulty test. An honest admin of school A can find a person from school B and
  give them a role, and that role then applies in school B as well (see F-03).
- **Severity:** Critical. **Confidence:** High for the repository. Live state not verified.
- **Fix:** see `REMEDIATION_PLAN.md` item 1.1. Limit updatable columns to `role`, `is_active`,
  `full_name`. Replace the membership test with a small trusted helper function that can see
  all memberships. Repeat the full rule in the "after" check. Never allow edits to a platform
  admin's profile. Must ship together with F-02.
- **Verified when:** on a local database, as admin of school A: reading or updating a school-B
  profile returns nothing; updating `clerk_user_id` or `email` on any profile is refused;
  the platform admin's profile is invisible; assigning a truly unassigned user still works.

---

## High

### F-02. Membership insert checks the school but not the person

- **OWASP:** A01. API1 Broken Object Level Authorization.
- **Component:** RLS on `public.profile_tenant_memberships`.
- **Where:** `useradm:98-105` (insert), `useradm:110-117` (delete), `registry:337-349`.

```sql
with check (
  app_private.current_role() = 'admin'
  and app_private.can_access_tenant(tenant_id)
);
```

- **What is wrong:** the rule checks that the admin belongs to the school. Nothing checks who
  is being added. `profile_id` and `is_default` are free.
- **Precondition:** a school admin who knows a profile id. F-01 exposes those ids.
- **Impact:** an admin can add another school's person, or the platform admin, to their own
  school. That breaks the ADR-006 rule that the platform admin has no compliance access. It
  also re-opens F-01: once someone "shares a school" with the admin, their global role is
  editable again. This is why F-01 and F-02 must be fixed in one migration.
- **Severity:** High. **Confidence:** High.
- **Fix:** plan item 1.1. Allow adding only active, non-platform-admin profiles that truly have
  no school, with `is_default = false`. Add a rule that a profile has at most one default.
- **Verified when:** admin A cannot add a school-B member or the platform admin to school A,
  and can still add a new unassigned user.

### F-03. A role is global, not per school

- **OWASP:** A04 Insecure Design.
- **Component:** `profiles.role`, `app_private.current_role()`, `can_manage_tenant()`.
- **Where:** `canon:77` (column), `canon:367-378`, `canon:397-406`.
- **What is wrong:** each person has one role for the whole system. `can_manage_tenant` means
  "global role is admin or coordinator, and is a member of this school". So someone who is an
  admin in school A and was meant to be a trainer in school B is an admin in B too.
- **Precondition:** a person who belongs to two schools, or an admin who can change a role
  (F-01, F-02).
- **Impact:** one school's decision changes another school's access. On its own it is
  unlikely, because people normally belong to one school. It is rated High because it makes
  every other role fix fragile.
- **Severity:** High (design). **Confidence:** High.
- **Fix:** plan item 3.1. Move the role onto the membership row. Needs an ADR.
- **Verified when:** a person with two memberships can hold different roles, and each school's
  policies use the role for that school.

### F-04. Child rows are not tied to their batch's school

- **OWASP:** A01. API1.
- **Component:** `learners`, `documents`, `lamr_reports`, `attendance_records`,
  `billing_records`, `activity_log`.
- **Where:** `canon:570-575`, `canon:590-604`, `canon:627-638`, `billing:185-200`,
  `billing:474-495`, `billing:543-547`.
- **What is wrong:** each child row has its own `tenant_id` and a separate `batch_id`. A plain
  foreign key only proves the batch exists somewhere. The policies check the row's `tenant_id`
  but not the batch's. Nothing forces the two to match. `learner_details`,
  `batch_trainer_assignments` and `lamr_outcomes` already do this correctly.
- **Precondition:** an admin or coordinator of school A (for documents, a trainer) who knows a
  batch id from school B. Ids are random and no listing of other schools' ids was found, so
  this is unlikely. A hard-to-guess id is still not an access control.
- **Impact:** rows could be attached to another school's batch and would then show up in that
  school's attendance, progress and billing inputs.
- **Severity:** High for integrity, low likelihood. **Confidence:** High.
- **Fix:** plan item 1.4 (policy check through a helper) now, then 2.1 (composite foreign keys
  `(batch_id, tenant_id)`) after a data check.
- **Verified when:** inserting a child row whose `tenant_id` differs from its batch's school is
  refused for every role, and normal trainer and co-trainer writes still work.

### F-05. File storage checks school membership only

- **OWASP:** A01, A05 Security Misconfiguration.
- **Component:** Storage bucket `compliance-evidence`, policies on `storage.objects`.
- **Where:** `canon:837-841` (bucket), `canon:843-872` (read, upload, update),
  `billing:614-621` (delete).

```sql
using (
  bucket_id = 'compliance-evidence'
  and app_private.can_access_tenant((storage.foldername(name))[1]::uuid)
)
```

- **What is wrong:** read, upload and overwrite all ask one question: "is the caller a member
  of this school?". Role, batch assignment and document audience are not checked. The bucket
  accepts any file type.
- **Precondition:** any member of the school, calling the Storage API directly. The app's own
  upload code is not connected to any screen yet, but the policy is live regardless.
- **Impact:** a viewer (meant to be read-only) can upload and overwrite. A trainer can read
  and overwrite every batch's evidence in the school, including office-only files. Evidence
  backs billing claims, so it must not be replaceable by the least-privileged users.
- **Good parts:** the bucket is private, the first folder must be the caller's school, delete
  is limited to admin and coordinator, the size limit is set.
- **Severity:** High. **Confidence:** High for the policy text. Whether the live bucket holds
  files is unknown.
- **Fix:** plan items 1.5 and 2.3.
- **Verified when:** viewer upload is refused, trainer access outside assigned batches is
  refused, a disallowed file type is refused, coordinator upload works.

### F-06. Trainers can mark their own documents as verified

- **OWASP:** A01. API3.
- **Component:** trainer policies on `public.documents`.
- **Where:** `canon:597-604` (insert), `canon:606-619` (update).
- **What is wrong:** the rules check the batch, the audience and (on update) that the trainer
  submitted the row. They do not restrict `status`, `verified_by` or `verified_at`.
  Verification is meant to be an office decision.
- **Precondition:** a trainer assigned to the batch, calling the API directly.
- **Impact:** a document can be recorded as verified when nobody verified it. Verified
  documents feed billing readiness (ADR-001, ADR-003).
- **Severity:** High. **Confidence:** High.
- **Fix:** plan item 1.3.
- **Verified when:** a trainer insert or update with a verified status or a verifier value is
  refused, a normal submission works, and office verification still works.

### F-07. Any school's admin or coordinator can edit national reference data

- **OWASP:** A01. API5 Broken Function Level Authorization.
- **Component:** `scholarship_programs`, `program_document_requirements`,
  `program_billing_rules`, `program_modules`, `scholarship_cost_schedule`.
- **Where:** `canon:506-511, 519-524, 532-537`, `billing:574-579, 587-592`.
- **What is wrong:** the write rules only check that the caller's role is admin or
  coordinator. They do not check a school or the platform admin. These tables are shared by
  all schools. `qualifications` already has the correct platform-admin-only rule.
- **Precondition:** any admin or coordinator, even one with no school.
- **Impact:** rates, thresholds and the required-document checklist can be changed for every
  school. New batches copy those values, so wrong amounts can end up on billing documents.
- **Severity:** High. **Confidence:** High.
- **Fix:** plan item 1.2. No app code writes these tables, so the app is not affected.
- **Verified when:** coordinator and school admin writes are refused, platform admin writes work.

### F-15. Demo password is read in browser code (High only if the variable is set)

- **OWASP:** A02 Cryptographic Failures (secret exposure), A05.
- **Component:** sign-in page.
- **Where:** `app/sign-in/[[...sign-in]]/sign-in-page.tsx:13-14, 261-269`.
- **What is wrong:** the page is a client component and reads `NEXT_PUBLIC_DEMO_EMAIL` and
  `NEXT_PUBLIC_DEMO_PASSWORD`. Any `NEXT_PUBLIC_` value is copied into the JavaScript files
  that every visitor downloads.
- **Precondition:** the variable is set in a build that is reachable from the internet. The
  repository cannot show this.
- **Impact if set:** every visitor gets a working login for the demo account, which is a
  viewer with a school membership. ADR-005 already says this must not reach production.
- **Severity:** High if set in a deployed build, otherwise Informational. **Confidence:** High
  on the code, unknown on deployment.
- **Fix:** plan items 0.1 and 1.10.
- **Verified when:** the variable name does not appear in the build output, and the demo
  password has been rotated if it was ever deployed.

---

## Medium

### F-08. Trainers can read billing, NTP and deadline fields

- **OWASP:** A01. API3.
- **Where:** database: `canon:539-543` with `canon:467`. App:
  `modules/batches/data/batches.ts:337` (`select('*')`),
  `app/(dashboard)/t/[tenantCode]/(sections)/batch-cards/page.tsx:23-58`, and the table-view,
  analytics and documents pages.
- **What is wrong, two parts.** (a) Database: RLS filters rows, not columns. A trainer who may
  read a batch row may read every column. (b) App: there is one `Batch` type for all roles,
  and the office pages under `/t/` have no trainer check, so full batch objects are sent to
  the browser. The billing and report pages redirect trainers, but let them through if the
  profile lookup fails.
- **Precondition:** a trainer in the school.
- **Impact:** breaks RULES.md rule 5. The data is the trainer's own school's internal billing
  information, not another school's and not learner personal data.
- **Protected already:** `billing_records` and `learner_details` are not readable by trainers.
- **Severity:** Medium. High if rule 5 is treated as a hard requirement (owner decision 3).
  **Confidence:** High.
- **Fix:** plan item 1.11 (app) and 3.3 (move the columns to an office-only table).
- **Verified when:** a trainer's direct read of a batch returns no financial columns, and
  trainers are redirected from office pages.

### F-09. An invitation's school grant can be applied again later

- **OWASP:** A07 Identification and Authentication Failures, A08.
- **Where:** `modules/auth/data/provisioning.ts:71-88`, `app/api/webhooks/clerk/route.ts:29-38`,
  `supabase/migrations/20260906120000_ensure_invitation_membership_atomic.sql:19-28`.
- **What is wrong:** the webhook re-applies the invitation's school on every `user.updated`
  event whenever the person has no membership. The invitation data in Clerk is never cleared.
  This was added on purpose as a repair path, but it has no "already used" marker.
- **Precondition:** someone removed the person's last membership without deactivating them.
  Then any change to their Clerk user, such as editing their own name, triggers it.
- **Impact:** a removed person gets their school back. Their role is not restored. The app
  has no "remove from school" button today, so this needs a manual removal first.
- **Severity:** Medium. **Confidence:** High on the code.
- **Fix:** plan items 0.7 and 1.8. Keep the retry repair, add an "applied" marker.
- **Verified when:** a unit test shows the grant is applied once, and a later update after
  removal does not restore it.

### F-10. Deleting a batch also deletes "append-only" billing records

- **OWASP:** A04.
- **Where:** `billing:233` (`on delete cascade`), `canon:558-562` (who may delete a batch),
  `canon:627-752` (LAMR rules).
- **What is wrong:** `billing_records` has no update or delete rule, so it looks append-only.
  But deleting the parent batch removes its billing records, attendance and LAMR data through
  the cascade, which skips RLS. Separately, trainers can delete LAMR reports.
- **Precondition:** an admin or coordinator deleting a batch; a trainer for LAMR.
- **Impact:** loss of billing history and compliance records, by mistake or on purpose.
- **Severity:** Medium. **Confidence:** High.
- **Fix:** plan items 1.7, 2.2, 3.4.
- **Verified when:** deleting a batch that has billing records is refused, and a trainer
  cannot delete a LAMR report.

### F-11. Anyone in a school can write audit-log rows in any name

- **OWASP:** A09 Security Logging and Monitoring Failures.
- **Where:** `canon:760-764`.
- **What is wrong:** the insert rule only checks school membership. A viewer can insert. The
  actor (`profile_id`), action and time are whatever the caller sends. Update and delete are
  correctly denied.
- **Impact:** the audit trail cannot be trusted.
- **Severity:** Medium. **Confidence:** High.
- **Fix:** plan item 1.6, then 3.5.
- **Verified when:** a viewer insert is refused, and a row sent with someone else's id is
  stored with the caller's id.

### F-12. The app never writes the audit log, and nothing records denied actions

- **OWASP:** A09.
- **Where:** the only use of `activity_log` in app code is the read at
  `modules/activity/data/activity.ts:117`. No monitoring hook exists.
- **What is wrong:** role changes, membership changes, invitations and school creation leave
  no record in the product. Failed permission checks are not recorded anywhere.
- **Impact:** abuse of F-01 would leave no trail in the app. Supabase's own logs are the only
  record, with limited retention.
- **Severity:** Medium. **Confidence:** High.
- **Fix:** plan items 0.9 and 3.5. Use database triggers so direct API writes are logged too.
- **Verified when:** a role change through the API produces a log row that the caller did not
  write.

### F-13. A deactivated school keeps its access

- **OWASP:** A01.
- **Where:** `canon:380-395` (`can_access_tenant`).
- **What is wrong:** the helper checks membership and that the profile is active. It never
  checks `tenants.is_active`.
- **Impact:** switching a school off does not stop its users.
- **Severity:** Medium. **Confidence:** High.
- **Fix:** plan item 1.13.
- **Verified when:** a member of an inactive school reads nothing.

### F-14. The after-sign-in redirect check can be bypassed

- **OWASP:** A01 (open redirect).
- **Where:** `modules/auth/domain/redirectUrl.ts:12-24`, used at
  `app/sign-in/[[...sign-in]]/sign-in-page.tsx:100` and five other places.
- **What is wrong:** the check inspects the raw text. Browsers remove tab and newline
  characters inside a URL before using it, and `trim()` only removes them at the ends. So a
  value can pass every check and still lead to another site. An auditor reproduced this with
  Node's URL parser. No browser test was run.
- **Impact:** a sign-in link could send a user to an outside site right after a real sign-in.
  No data is exposed by this alone.
- **Severity:** Medium. **Confidence:** High.
- **Fix:** plan item 1.9. Parse the value with `new URL(value, origin)` and compare origins.
- **Verified when:** unit tests with control characters, backslashes and `//` all fall back
  to `/`, and normal paths still work.

### F-17. No security headers

- **OWASP:** A05.
- **Where:** `next.config.ts:1-9` has no `headers()`.
- **What is wrong:** no Content-Security-Policy, no frame protection, no HSTS, no `nosniff`,
  no referrer policy. `X-Powered-By` is on. Headers added by the host cannot be seen from here.
- **Impact:** weaker defence against clickjacking and script injection.
- **Severity:** Medium. **Confidence:** High for the repository.
- **Fix:** plan Wave 4. **Verified when:** the response headers of the deployed site show them.

### F-19. Dependencies with known advisories, unused packages

- **OWASP:** A06 Vulnerable and Outdated Components.
- **Where:** `package.json`, `pnpm-lock.yaml`. Source: `pnpm audit` run on 2026-11-17.
- **What is wrong:** `next` is below the release that fixes a reported advisory. The
  `swagger-ui-react` package brings in older `dompurify`, `axios` and `follow-redirects` with
  advisories. `openwiki` (dev and CI only) brings in several more. `drizzle-orm`, `postgres`
  and `next-swagger-doc` are installed but never imported.
- **Impact:** depends on whether the affected code paths are used. For `next`, the affected
  features were not found in the app. Advisory details were taken from the tool only.
- **Severity:** Medium. **Confidence:** Medium.
- **Fix:** Wave 4. **Verified when:** `pnpm audit` shows no high or critical runtime advisory.

### F-20. CI has no quality gate and loose workflow settings

- **OWASP:** A08 Software and Data Integrity Failures.
- **Where:** `.github/workflows/claude.yml:15-19`, `openwiki-update.yml:9-11, 87-93`,
  `qodana.yml:14-24`, all workflow `uses:` lines.
- **What is wrong:** no workflow runs lint, typecheck, tests or build before merge. Actions
  are pinned to tags that can move, not to commit ids. The `@claude` workflow has no check on
  who wrote the comment. The wiki workflow has write access and can open pull requests that
  change agent instruction files and its own workflow. No Dependabot, CodeQL or CODEOWNERS.
- **Protected:** no untrusted text is placed into shell commands, and fork pull requests do
  not receive secrets.
- **Severity:** Medium. **Confidence:** High. Branch protection cannot be seen from the repo.
- **Fix:** Wave 4. **Verified when:** a pull request with a failing test cannot be merged.

### F-21. One production database, no staging, write-capable agent access, repo and live differ

- **OWASP:** A05.
- **Where:** `.mcp.json:3-6`, `.claude/settings.json`, `supabase/migrations/README.md:102-126`.
- **What is wrong:** there is one hosted project and no staging. The Supabase MCP entry is not
  read-only. The deny list protects Claude sessions only. The README records that the live
  database has a `tenants` policy that no migration defines, and migrations applied by hand.
- **Impact:** a mistake lands on real data, and this audit cannot be sure the live rules match
  what it read.
- **Severity:** Medium. **Confidence:** High.
- **Fix:** plan items 0.3, 0.8, 2.6, 3.6. **Verified when:** a schema comparison shows no
  difference, and agents point at staging.

### F-22. Webhook stores the first email without checking it is primary or verified

- **OWASP:** A07. **Status:** Potential.
- **Where:** `app/api/webhooks/clerk/route.ts:31`, `modules/tenancy/data/users.ts:147-177`.
- **What is wrong:** the webhook saves `email_addresses[0]`. Admins later find people by that
  email. If the first address is not the primary or not verified, the wrong person could be
  matched. Whether this can happen depends on Clerk settings.
- **Severity:** Medium. **Confidence:** Medium.
- **Fix:** plan items 0.5 and 1.8. **Verified when:** a unit test shows only the primary,
  verified address is stored.

### F-24. "Who did this" columns are supplied by the client; ULI can be empty

- **OWASP:** A08.
- **Where:** `created_by`, `submitted_by`, `generated_by`, `marked_by`, `verified_by` across
  `canon:149-263` and `billing:195-240`; `learners.uli` at `canon:161`.
- **What is wrong:** these columns record who acted, but the caller fills them in. ULI is the
  permanent learner key (a locked domain fact) yet may be empty and has no format check.
- **Severity:** Medium. **Confidence:** High.
- **Fix:** plan items 1.3, 1.6, 2.4, 3.5. **Verified when:** a row sent with another person's
  id is stored with the caller's id.

### F-27. Upload and CSV import code is not safe to switch on yet (latent)

- **OWASP:** A04, A05.
- **Where:** `modules/documents/data/evidence.ts:145-197`,
  `modules/import-export/data/learnerImport.ts:65-121, 175`,
  `modules/import-export/domain/learnerImport.ts:121-166`.
- **What is wrong:** neither feature is connected to a screen. When they are: the file type is
  taken from the browser, downloads are not forced to save as files, the batch id in the
  storage path is not checked against the school, the CSV has no size or row limit, and raw
  database error text is returned to the caller (breaks RULES.md rule 6).
- **Protected:** path traversal is rejected, uploads do not overwrite, size limit matches the
  bucket.
- **Severity:** Medium, latent. **Confidence:** High.
- **Fix:** Wave 4, before wiring. **Verified when:** unit tests cover each limit.

### F-28. Unbounded queries, no rate limits

- **OWASP:** API4 Unrestricted Resource Consumption.
- **Where:** `modules/batches/data/batches.ts:51-60` (no limit, embedded rows),
  `app/(dashboard)/users/new/actions.ts:129`, `app/(dashboard)/schools/new/actions.ts:134`.
- **Severity:** Medium, low priority for an internal tool. **Confidence:** High.
- **Fix:** Wave 4.

---

## Low

| ID | OWASP | Title | Where | What is wrong | Fix | Verified when |
|---|---|---|---|---|---|---|
| F-16 | A07 | Invite-code check exists only in the browser | `modules/auth/ui/SignUpModal.tsx:47, 468-469, 487` | The code is only checked for being non-empty. The server never compares it. A self sign-up gets `viewer` with no school, so the direct risk is small. | 0.5: invitation-only sign-up in Clerk | Self sign-up is refused by Clerk |
| F-18 | A02 | Session cookie, real emails and ids, a hostname and an IP are committed | `requests/http-client.env.json:4`, `supabase/seeds/dev_profile_memberships.sql`, `supabase/seeds/verify_user_admin_setup.sql`, `registry:1-2` | A Clerk development session cookie (short-lived, expired) and personal-looking data are in git. No live key was found. | 0.10, 2.5 | A secret scan of the tree is clean |
| F-23 | A05 | Service-role module has no server-only guard | `lib/supabase/service.ts:16` | Nothing stops a future client component from importing it. Today only the webhook code does. | 1.12 | Build fails if a client file imports it |
| F-25 | A05 | Function hygiene; hosted sign-up unknown | `canon:281-289` (`set_updated_at` has no `search_path`), `canon:346-350` (claim fallbacks) | Small hardening gaps. Whether Supabase's own sign-up is enabled on the hosted project cannot be seen (Potential). | 0.6, Wave 4 | Catalog query shows `search_path` set; sign-up off |
| F-26 | A05 | Debug route, docs routes, preview overrides | `app/api/debug/auth-check/route.ts:25`, `app/api-docs/page.tsx:4-7`, `app/api/openapi.json/route.ts:5-11`, `?state=` and `?role=` on dashboard and billing pages | Debug route is guarded by `NODE_ENV` only. Docs need only a sign-in. Overrides change the UI only, since RLS still decides data. | Wave 4 | Production build returns 404 for the debug route |
| F-29 | A04 | Role change is not atomic; co-trainers can write but not read | `modules/tenancy/data/users.ts:325-381`, `canon:408-428` vs `billing:416-440` | Role update and membership insert are two requests with a manual undo. `can_read_batch` was never widened for co-trainers. | 3.2, Wave 4 | One function does both; co-trainer can read their batch |

---

## Checked and found adequate

These controls were looked for and are in place. They are part of the evidence too.

- Every `(dashboard)` page is behind `requireAuthenticatedUser()`.
- Role and school come from database tables, never from token claims or Clerk metadata a user
  can edit.
- A missing session token throws. The server never silently queries as an anonymous user.
- The school in the URL is validated against the caller's own memberships on every page.
- Both server actions re-check the session and the role themselves. Inputs are allow-listed.
  No mass assignment.
- The webhook verifies the signature before doing anything, and fails closed.
- The service-role key is read in one file and used only by the webhook's provisioning code.
- No SQL injection path: no dynamic SQL in migrations, no string-built queries in the app.
  No PostgREST filter injection. No unsafe HTML rendering. No server-side fetch of user URLs.
- XLSX export writes text cells, so spreadsheet formulas are not executed.
- Every `security definer` helper sets `search_path = ''`. `platform_admins` has RLS with no
  policies. The anonymous role can read and write nothing.
- `billing_records` and `learner_details` are not readable by trainers.
- The lockfile is single, pinned and has integrity hashes for every package.
- Data functions never turn a failure into an "ok" result, and never fall back to fake data.

## Could not be verified from the repository

- The live RLS policies, grants, functions and bucket settings.
- Hosted Supabase auth settings and Clerk instance settings.
- Whether `NEXT_PUBLIC_DEMO_PASSWORD` is set in any deployed build.
- Whether the storage bucket holds files today.
- GitHub branch protection and deployed response headers.

## Leads from the earlier database audit about PR #321 (not on `main`, not re-audited)

- Its NTP and AOU document rows default to an audience that trainers can see.
- Its copy of the T2MIS migration may be the older version that puts personal fields on
  `learners`.
- It adds NTP and AOU files to the same storage bucket, so F-05 applies to them.
- It cites ADR-009, which is not in the repository.

These should be checked against F-05, F-06 and F-08 before that PR merges.
