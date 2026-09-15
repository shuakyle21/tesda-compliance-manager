# ADR-006 — Platform Admin and the School Registry

Status: Accepted
Date: 2026-09-06
Owner: System Architecture
Supersedes: `docs/MASTER_PRD_SRS.md` **FR-02** — "Super Admin is not implemented and must not
be assumed in production behavior."
Implemented by: `supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql`

## Context

`/users/new` (FR-01/FR-02) grants a person access to a school that **already exists**. Nothing
in the application creates the school. The three tenants in the system — `AKB`, `J3ED`, `NEN` —
were inserted by hand at the bottom of the canonical migration, so onboarding a new TVI means
editing SQL and redeploying.

Two structural facts make this more than a missing form.

**1. The tenant table cannot be written by anyone inside a tenant.** `public.tenants` has no
INSERT policy at all, and its SELECT policy is `app_private.can_access_tenant(id)` —
membership-scoped. A school that has just been created has no members, so even with an INSERT
policy added, `insert(...).select()` returns zero rows and the creator cannot tell a successful
write from a failed one. Creation genuinely requires an actor outside the tenant boundary.

**2. `scholarship_programs` is the wrong home for a school's programs.** That table holds TWSP
and CFSP — the *funding* programs ADR-001 builds the billing engine on. A school's "programs
based on their CTPR" are TESDA-registered **qualifications** (Organic Agriculture Production
NC II, Welding NC II): a different concept on a different axis. Reusing the table would corrupt
the billing model.

A third fact shaped the schema. A COPR number decomposes:

```
2022 | 1263 | AFFOAP212 | 009 | -R
year   provider  qualification  seq  status
```

That `1263` is the school's TESDA provider code — and it also appears inside the batch RQM code
(`RQM3-2026-CFSP-1263-0009`, see the batch-identity decision). It is the join between a school's
certificates and its batches, so it earns a column.

---

## Decisions

| ID | Decision |
| --- | --- |
| **P1** | A **platform admin** exists: an operator outside every tenant who provisions schools on request, in the way TESDA itself issues T2MIS/BSRS accounts. This reverses FR-02's "must not be assumed" wording. |
| **P2** | Platform admin is a **separate table** (`public.platform_admins`), never a fifth `public.profile_role` value. |
| **P3** | The platform admin's reach is the school **registry only**. No policy grants them `batches`, `learners`, `documents`, `lamr_*` or `activity_log`. |
| **P4** | Qualifications are a **shared national registry** (`public.qualifications`) keyed by TESDA's own code, not per-school text. |
| **P5** | The per-school **COPR number** lives on the link row (`public.tenant_qualifications`), not on the qualification and not on the school. |
| **P6** | School creation runs through `public.create_school(...)`, a **`security invoker`** function — atomicity, never an authorization bypass. |
| **P7** | Writes to `tenant_qualifications` are platform-admin-only for now. School admins maintaining their own list is a deliberate follow-up. |

---

## Rationale

### P1 — why a Super Admin after all

FR-02's prohibition was written when the tenant set was fixed and hand-seeded; it ruled out a
role that could *read across* tenants, which is the thing that would break the compliance
boundary. The role introduced here does not do that (see P3). What forced the decision is that
the alternative readings are all worse:

- *Admin creates a school and is auto-enrolled in it.* Workable, but it makes every school admin
  able to mint schools, and the people who hold that role are the schools' own staff. Provisioning
  is not their job and the audit trail would say nothing useful.
- *Schools stay migration-only.* Honest to the PRD, but it means there is no add-school screen —
  which is the requirement.

The operating model chosen matches how the surrounding institutions actually work: a school
requests an account, the operator creates it, the school administers itself thereafter.

### P2 — a table, not an enum value

`public.profile_role` is a **tenant-scoped** vocabulary. Every policy in the base migration
switches on `app_private.current_role()`, so adding a value would silently widen or narrow each
one until every policy had been re-audited. Platform admin is a different axis: it is not "a
bigger admin", it is "not in any tenant".

`shared/types.ts`'s UI-only `UserRole` value `'owner'` was considered as a home and rejected for
the same reason — it would make `Profile.role` mean two different scopes at once.

`platform_admins` carries **no policies and no grants** for `authenticated`, so it cannot be read
or written through the Clerk-scoped anon client at all. That is what stops the role from being
self-granted through any application path. The application learns the answer through
`public.current_user_is_platform_admin()`, a `security definer` function that returns only the
boolean about the *caller* — never the membership list.

### P3 — the boundary that keeps this from being god-mode

The platform admin can create a school, read every school's name and program list, and seat a
school's first member. They cannot read one scholar record, one document, or one billing figure.
This is checkable: `grep is_platform_admin` over the migrations should match only `tenants`,
`qualifications`, `tenant_qualifications`, `profiles` (unassigned only) and
`profile_tenant_memberships`.

**If a future policy adds `is_platform_admin()` to a compliance table, that is a boundary change
and needs its own ADR.**

One membership policy is load-bearing: without "Platform admins can seat a tenant's first
members", a newly created school is permanently unstaffable, because the existing grant policy
(migration `20260904120000`, policy 3) requires `can_access_tenant(tenant_id)` — which a platform
admin, belonging to no tenant by design, can never satisfy.

**That same policy is where P3 is won or lost, and the first draft of this change lost it.**
Written as `with check (app_private.is_platform_admin())`, it constrains the *actor* and says
nothing about the *row*. `app_private.can_access_tenant()` resolves purely from
`profile_tenant_memberships`, so an operator could insert `(any tenant, their own profile_id)`
and hand themselves everything that function gates — batches, learners, documents, LAMR — in one
statement. The UI gate does not narrow it; RLS is the boundary. Caught in review before the
migration was applied.

The policy therefore carries two predicates, and **neither may be removed**:

1. `profile_id <> app_private.current_profile_id()` — the operator seats other people, never
   themselves. This is the one that closes the escalation.
2. the target tenant has no members yet — "first members", as the name says. Provisioning a new
   school is the job; injecting an account into an established one is not. Racy under concurrent
   inserts, which is tolerable: guard 1 holds regardless, and the worst outcome is two seated
   members rather than one.

A reader checking P3 should confirm both are still present, not merely that the policy exists.

### P4/P5 — one national list, per-school certificates

"Organic Agriculture Production NC II" means the same thing at AKB as at J3ED, so storing it
per-tenant would produce three spellings of one qualification and make cross-school analytics
meaningless. What genuinely differs per school is the **registration**: the COPR number, its
status, the delivery mode, and when it expires. Hence the link row.

`copr_number` is **nullable**. A school is routinely entered while its certificate is still being
issued, and a required field would make the operator invent a number — corrupting the field it
was added to record. For the same reason the unique constraint is on
`(tenant_id, qualification_id)` rather than on the COPR.

**Naming:** the certificate says COPR (Certificate of Program Registration); the existing import
and export code says CTPR. They are the same number. The column takes the name on the
certificate; the T2MIS export's `'CTPR'` header string stays as it is because it must match the
file TESDA hands back.

### P6 — `security invoker`, deliberately

`public.create_school` exists so a school and its program list land in one transaction: a partial
write leaves a school with no registered program — which cannot legally run a batch — and nothing
on screen to say so. It is **`security invoker`** so RLS still evaluates every statement inside
it. A caller who is not a platform admin gets a policy violation, not a privilege. The security
boundary stays exactly where RULES.md §1 puts it.

Note this differs from `ensure_profile_tenant_membership` (migration `20260906120000`), which is
`security invoker` but granted to `service_role` only because the webhook has no session. This one
is granted to `authenticated`, because its caller is a signed-in operator.

---

## Consequences

**Unblocked.** The T2MIS export (`modules/reports/ui/exportXlsx.ts`) hardcoded `'Private'`,
`'TVIs'` and the school address for every row — correct for the three seeded schools and wrong for
any fourth. Those now read from the tenant row. Industry sector, registration status and CTPR
remain hardcoded there because they are facts about *the qualification at that school*, and
`Batch.qualification` is still free text with no link to `tenant_qualifications`.

**Deliberately not done.**

- `batches.qualification_title` stays free text. Making it a foreign key to `qualifications` would
  break `mapBatchRow` and every existing row.
- No `/schools` list route, and no edit or deactivate flow.
- `tenants.region` keeps its free-text `"Region IV-A, Laguna"` shape; the new `province` /
  `city_municipality` columns are authoritative going forward, and the export falls back to
  splitting `region` for schools seeded before they existed.

**Open.** Whether school admins should maintain their own program list (P7) — one additional
policy if so.
