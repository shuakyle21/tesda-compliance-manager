# Live-Data Migration Plan — mock fixtures → real Clerk + Supabase

**Status:** Draft for review · **Date:** 2026-08-31 · **Audience:** solo junior developer

**Supersedes** the "no Supabase env vars" premise in the TES-82 cutover map, which is stale.
Findings marked 🔎 were independently confirmed by a `tvicams-reviewer` pass against `RULES.md`.

---

## 0. TL;DR

You are further along than you think, and blocked somewhere other than you think.

The env vars are wired. The schema is sound. The RLS design is genuinely well-built. But the
**auth chain is broken at its first link**: your code asks Clerk for a JWT template named
`supabase`, and your Clerk instance has **zero JWT templates**. Every request fails before
reaching Postgres, gets caught, and falls back to mock data — so the app *looks* like it is still
"on mocks by design" when it is actually failing.

The highest-value change here is a few lines of code plus two dashboard settings.

A review pass then found three things serious enough to promote **ahead of seeding**:

1. `/billing` renders **mock data as live, with no banner**.
2. A missing token degrades silently to `anon`, so a broken auth chain reads as *"you have no batches."*
3. `?role=` is a **real privilege-escalation surface**, not the preview affordance it is documented
   as — trainer financial-field omissions have no server-side enforcement whatsoever.

One thread connects nearly every finding in this document: each is a place where **"I don't know"
gets rendered as "here is the answer."** For a compliance tool, that is the failure mode to design
against.

---

## 0.1 Diagrams

Three self-contained HTML diagrams accompany this plan. Open them in a browser.

| Diagram | Answers | File |
|---|---|---|
| Where the auth chain breaks | Why the app falls back to mocks, and how the same break can instead read as "no batches" | [`diagrams/auth-chain-break.html`](diagrams/auth-chain-break.html) |
| Four reasons a screen shows zero batches | What "empty" can actually mean, and which state each case *should* return | [`diagrams/four-causes-of-empty.html`](diagrams/four-causes-of-empty.html) |
| Why the phases run in this order | The prerequisite fan-in a numbered list flattens away | [`diagrams/phase-dependencies.html`](diagrams/phase-dependencies.html) |

---

## 1. Current-state assessment

### 1.1 The intended auth chain

```
Browser
  │
  ▼
proxy.ts ─────────────── (see §1.5 — this does NOT gate auth, despite CLAUDE.md)
  │
  ▼
app/(dashboard)/layout.tsx  ── requireAuthenticatedUser()
  │
  ▼
createSupabaseServerClient()  ── lib/supabase/server.ts
  │   getToken({ template: 'supabase' })   ◄── ✗ BREAKS HERE
  │   attaches token as Bearer on an ANON-KEY client
  ▼
PostgREST  ── request arrives as role `authenticated` … or `anon` if no token (§1.4)
  │
  ▼
RLS policies ── app_private.current_clerk_user_id()  →  auth.jwt() ->> 'sub'
                app_private.current_profile_id()     →  profiles lookup
                app_private.current_role()           →  profiles.role
                app_private.can_access_tenant()      →  profile_tenant_memberships
  │
  ▼
Rows, already tenant-scoped. No JS-side tenant filtering anywhere.
```

### 1.2 What is verified true today

| Thing | State | Evidence |
|---|---|---|
| Supabase env vars | ✅ present | `.env.local` has URL + anon key + service-role key |
| `isSupabaseConfigured()` | returns **true** | both vars set → the `unconfigured` branch is dead code in dev |
| Clerk JWT template `supabase` | ❌ **does not exist** | Clerk Backend API `/v1/jwt_templates` returns `[]` |
| Clerk → `profiles` webhook | ✅ working | `profiles` has rows; provisioning code is sound |
| Domain tables | ⚠️ empty | `batches`, `learners`, `documents`, `tenants`, all reference tables at 0 |
| RLS | ✅ enabled on all 15 tables | migration + advisors |
| `pnpm lint` / `tsc --noEmit` | ✅ both clean | every finding below is a `[review]` rule |
| Tenant assignment flow | ❌ **does not exist** | nothing in the app writes `profile_tenant_memberships` |
| Tenant in URL path segment (ADR) | ❌ unimplemented | routes are `app/(dashboard)/dashboard`, no `[tenant]` |

> ⚠️ Row counts from `list_tables` are `reltuples` **estimates**. They currently report
> `tenants: 0` alongside `profile_tenant_memberships: 1`, which is foreign-key impossible — so at
> least one is wrong. Get real counts with `select count(*)` when you run the seed (§Phase 3).

### 1.3 The failure you are actually seeing

```
getToken({ template: 'supabase' })   →  throws (no such template)
        │
        ▼
catch in getBatchesSnapshot()        →  returns { status: 'sync-failed' }
        │
        ▼
dashboard/page.tsx                   →  status !== 'ok'  →  renders MOCK_BATCHES
```

The mock fallback is firing — but for a **failure** reason, not the intended "this environment has
no Supabase" reason. That distinction is the entire point of your three-state snapshot union, and
it is currently being papered over.

### 1.4 The second, worse path 🔎

`lib/supabase/server.ts:32-33`:

```ts
headers: token ? { Authorization: `Bearer ${token}` } : {}
```

If `getToken` returns `null` rather than throwing, the client is built with **no Authorization
header at all** and queries Postgres as `anon`. Every policy is `to authenticated`, so this returns
zero rows **with no error** → `status: 'ok'`, `batches: []` → the dashboard confidently renders
*"No assigned batches."*

**A broken auth chain is being reported to the user as a fact about their data.** This is why
Phase 1 adds an explicit failure rather than only swapping the token call.

### 1.5 Anti-patterns found

| # | Finding | Severity | Where |
|---|---|---|---|
| A1 | Auth chain depends on a Clerk JWT template that does not exist | 🔴 Critical | `lib/supabase/server.ts` |
| A2 | No flow anywhere assigns a profile to a tenant → multi-tenancy unusable | 🔴 Critical | absent |
| A3 🔎 | **`?role=` is a live privilege-escalation surface; trainer omissions have _no_ server-side enforcement** | 🔴 Critical | `modules/auth/data/role.ts:39-40` |
| A9 🔎 | **`/billing` renders mock data as live, with no banner** — `&& batches.length > 0` turns a correctly-empty live read into mocks on the `ok` branch | 🔴 Critical | `app/(dashboard)/billing/page.tsx:62-63` |
| A10 🔎 | **Missing token degrades silently to `anon`** — converts a broken auth chain into a confident empty state | 🔴 Critical | `lib/supabase/server.ts:32-33` |
| A4 | Snapshot cannot distinguish "zero rows" / "no tenant access" / "RLS denied" | 🟠 High | `modules/batches/data/batches.ts` |
| A11 🔎 | **Two swallowed sync-failed banners** — empty-state early returns sit *above* the banner | 🟠 High | `billing/page.tsx:96`, `dashboard/page.tsx:195-207` |
| A12 🔎 | **Banner copy asserts a provenance the data lacks** — "the last values this workspace held" describes seed fixtures | 🟠 High | `dashboard/page.tsx:215`, `BillingQueueView.tsx:167` |
| A13 🔎 | **`billingDeadline` stands in with `end_date`** but renders unhedged as a red "Earliest Billing · N days left" tile | 🟠 High | `batches.ts:207-210` → `dashboard/page.tsx:275-287` |
| A5 | ADR-locked "tenant in URL path segment" silently unimplemented | 🟡 Medium | routing |
| A6 | Mock fallback still live in 9 route files | 🟡 Medium | `app/(dashboard)/*` |
| A14 🔎 | **No `error.tsx` anywhere; `loading.tsx` only for `/dashboard`** | 🟡 Medium | `app/` |
| A15 🔎 | Hardcoded tenant id + JS-side tenant filtering in a route; duplicated role resolver | 🟡 Medium | `dashboard/page.tsx:119-121, 403-423` |
| A7 | `rls_auto_enable()` is SECURITY DEFINER and callable by `anon` | 🟡 Medium | DB advisor |
| A16 🔎 | Status conveyed by color alone (activity dots, lifecycle strip) | 🟢 Low | `dashboard/page.tsx:383, 343-357` |
| A8 | `set_updated_at` has a mutable `search_path` | 🟢 Low | DB advisor |

**Verified clean** — checked, not assumed: service-role confinement (one reader, one importer, one
caller); `database.types` import direction; no raw Supabase error text reaching any UI;
fetch → map → derive in `batches`/`documents`/`activity`; `domain/` purity; webhook provisioning.

**Doc drift to fix:** `CLAUDE.md` says `proxy.ts` "protects everything except `/sign-in`,
`/sign-up`." It does not — `proxy.ts` only stamps `x-pathname`; auth moved to
`requireAuthenticatedUser()` in `app/(dashboard)/layout.tsx`. Coverage is fine *today* because
every data route happens to live under `(dashboard)`, but the next route group added on that false
assumption will be unguarded.

---

## 2. Your setup vs. the professional real-world setup

You asked how this compares to how a real team would build it. Honest answer: **your foundations
are above average for a junior project.** The schema-side authorization design is the part most
teams get wrong, and you got it right.

| Concern | Professional norm | Your setup | Verdict |
|---|---|---|---|
| Authorization boundary | Enforced in the database (RLS), not the UI | RLS on all 15 tables; `RULES.md` states UI hiding is usability only | ✅ **Correct, unusually disciplined** |
| Role/tenant source | Looked up server-side from tables, not trusted from JWT claims | `current_role()` / `can_access_tenant()` read `profiles` + memberships | ✅ **Better than the common pattern** |
| Clerk↔Supabase bridge | **Native third-party auth** (JWT templates deprecated Apr 2025) | Legacy `getToken({ template: 'supabase' })`, template missing | ❌ **Wrong era — fix this** |
| Column-level role scoping | Narrower queries per role; DTOs never carry fields the role can't see | Not implemented — every caller gets every column | ❌ **See A3** |
| Service-role key | Server-only, one file, webhook paths only | Exactly that, well documented | ✅ **Correct** |
| User provisioning | Webhook creates a least-privileged row; admin grants access later | Implemented; defaults to `viewer` + no tenant | ✅ **Correct** |
| Tenant assignment | An admin screen writes the membership row | **Missing entirely** | ❌ **The real blocker** |
| Layering | Fetch → map → derive; DB types isolated from UI types | Implemented and lint-enforced | ✅ **Genuinely senior-grade** |
| Seed strategy | Committed, idempotent SQL run per environment | Mock TS fixtures, no SQL seed | ⚠️ **Needs converting** |
| Tests against real RLS | Prove tenant A cannot read tenant B | None yet | ⚠️ **Gap** |

**Headline:** the ❌ rows are small and well-scoped. Nothing in your architecture needs rethinking.
You are not facing a rewrite.

### 2.1 Why the modern Clerk↔Supabase integration is right for you

**Option A — legacy JWT template.** Create a `supabase` template in Clerk, signed with the Supabase
JWT secret. Keeps your code as-is. But Clerk deprecated this on **1 April 2025**, it requires
holding a shared signing secret, and rotating that secret breaks both systems at once.

**Option B — native third-party auth (recommended).** Register Clerk as a third-party auth provider
in Supabase; Supabase validates Clerk's *ordinary session token* against Clerk's public JWKS. No
shared secret, no template to maintain, automatic key rotation, and no extra round-trip to mint a
second JWT.

Per the [Supabase docs](https://supabase.com/docs/guides/auth/third-party/clerk), the deprecation
reasons are exactly the ones that matter to you: sharing your project's JWT secret with a third
party is poor security practice, rotating it causes downtime, and minting a separate JWT adds
latency to every request.

**Option B works for you with almost no change, because of a design decision you already made:**
`app_private.current_clerk_user_id()` reads only `sub`. It does not need custom claims for role or
tenant — those come from your tables. A team that had stuffed roles into JWT claims would need a
template. You don't.

---

## 3. Target architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ IDENTITY (Clerk)                                                  │
│   session token: { sub, role: "authenticated", exp, ... }          │
│   webhook user.created / user.deleted ─────────────┐               │
└────────────────────────────────────────────────────┼──────────────┘
                     │ plain getToken()              │ service-role
                     ▼                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ APP (Next.js, server-side only)                                   │
│   app/(dashboard)/…            thin routes, compose only          │
│   modules/<domain>/data/       fetch → map → derive                │
│                                + role-scoped selects (A3 fix)      │
│   modules/<domain>/domain/     pure rules, no I/O                  │
└──────────────────────────────────────────────────────────────────┘
                     │ anon key + Bearer(session token)
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│ POSTGRES — THE SECURITY BOUNDARY                                  │
│   third-party auth: validates Clerk token via Clerk JWKS           │
│   RLS: sub → profiles → role → memberships → tenant-scoped ROWS    │
│   ⚠ RLS scopes rows, NOT columns — see §3.2                        │
└──────────────────────────────────────────────────────────────────┘
```

This *is* your architecture. Phase 1 repairs the one broken arrow; §3.1 and §3.2 add the two pieces
that were never built.

### 3.1 The snapshot union needs a fourth state

Today `ok` + empty array means four different things, and for a compliance tool they are not
interchangeable. A coordinator shown "0 batches" who actually has *no tenant access* has been told
a falsehood.

```ts
export type BatchesSnapshot =
  | { status: 'ok'; batches: Batch[]; dataAsOf: string | null }
  | { status: 'no-tenant-access' }   // ← NEW: authenticated, but no membership row
  | { status: 'sync-failed'; error: string }
  | { status: 'unconfigured' };
```

`no-tenant-access` renders *"Your school access hasn't been assigned yet — ask your registrar,"*
not an empty table. This is correctness, not polish.

### 3.2 RLS scopes rows; column omission is the data layer's job

The reviewer confirmed the gap precisely: `app_private.can_read_batch`'s trainer branch grants a
trainer SELECT on **all columns** of their assigned batches. That is not a bug in the policy — it
is what row-level security *is*.

So the rule "trainer DTOs must omit billing deadline, NTP lag, BSRS and financial fields
**server-side**" has to be enforced by a **narrower select in the data layer**, not by RLS and not
by conditional rendering. A separate query listing only the trainer-visible columns — not a filtered
object built from a full row.

---

## 4. Migration roadmap

### Phase 1 — Repair the auth chain (half a day) 🔴 do this first

Nothing else is testable until a request reaches Postgres as a known user.

1. **Clerk side:** visit Clerk's [Connect with Supabase page](https://dashboard.clerk.com/setup/supabase).
   It configures your instance automatically. *(HITL — only you can.)*
   *Manual fallback:* add a `role` claim with value `authenticated` to your session tokens via
   [custom session token](https://clerk.com/docs/backend-requests/custom-session-token). Supabase
   reads that claim to choose the Postgres role; without it, every policy denies.
2. **Supabase side:** Authentication → Third-Party Auth → add a Clerk integration. *(HITL.)*
   For local dev via the CLI, add to `supabase/config.toml`:
   ```toml
   [auth.third_party.clerk]
   enabled = true
   domain = "your-instance.clerk.accounts.dev"
   ```
3. **Code — `lib/supabase/server.ts`.** Two changes, not one. Drop the template argument, and move
   from a hand-set header to the `accessToken` option, which is the pattern the Supabase docs
   specify for third-party auth:

   ```diff
   - const { getToken } = await auth();
   - const token = await getToken({ template: 'supabase' });
   -
     return createClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
   -     global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
   +     accessToken: async () => {
   +       const { getToken } = await auth();
   +       const token = await getToken();
   +       if (!token) throw new Error('No Clerk session token — refusing to query unauthenticated.');
   +       return token;
   +     },
         auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
       },
     );
   ```

   **Why the option rather than the header:** the client refreshes the token itself when it
   expires, instead of pinning whatever token existed at construction time.
   **Why the throw (fixes A10):** it makes the silent `anon` fallback impossible. The throw is
   caught by the existing `catch` in each contract and surfaces as `sync-failed` — an honest
   *"something is broken"* rather than a confident *"you have no batches."*
   Note: once `accessToken` is set you must not call `supabase.auth.*` on that client. You aren't,
   so this costs you nothing.
4. Update the doc comment asserting the template requirement, **and** the matching line in
   `CLAUDE.md` ("the JWT template in Clerk must be named exactly `supabase`"). A stale comment here
   is what will mislead the next person — including you, in three months.
5. **Prove it, without printing a token.** As a signed-in user:

   ```ts
   const { data, error } = await supabase.from('profiles').select('id').maybeSingle();
   ```

   | Result | Diagnosis |
   |---|---|
   | a row | ✅ whole chain works — token validated, `sub` matched a profile |
   | `data === null`, no error | token validated, but **no active profile matches that `sub`** → check `profiles.clerk_user_id` and `is_active` |
   | an error | the token did not validate → Phase 1 dashboard config is wrong |

   Never log the decoded token to check this. It is a live credential, and `RULES.md` forbids
   leaking internal IDs.

**Exit criterion:** a signed-in request returns `status: 'ok'` rather than `sync-failed`.

### Phase 1b — Stop the app from lying (half a day) 🔴 promoted by review

Not polish. Each item currently causes the UI to state something untrue.

6. **A9 — `/billing` shows mocks as live.** Delete the `&& snapshot.batches.length > 0` clause at
   `billing/page.tsx:62-63`. It converts a *successful, correctly-empty* live read into the mock
   fallback on the `ok` branch, so `syncFailed` stays false and **no banner renders**. Today a
   coordinator opening `/billing` sees fabricated school codes, scholar counts and TSF peso amounts,
   with a "Data as of" stamp corroborating the fiction.
   *The lesson worth keeping: `ok` and `non-empty` are different questions.*
7. **A11 — swallowed sync-failed banners.** In both `billing/page.tsx:96` and
   `dashboard/page.tsx:195-207`, the empty-state early return sits *above* the sync-failed callout,
   so a failed sync yielding zero items renders "No batches to bill yet" — a confident factual
   claim — instead of the failure. Check `syncFailed` before any empty-state return.
8. **A12 — banner copy claims a provenance the data lacks.** "Showing the last cached snapshot" and
   "the last values this workspace held" describe `shared/mocks` fixtures. There is no cache; this
   workspace never held those values. Rewrite the copy — or better, stop rendering mocks behind
   that banner at all.

**Exit criterion:** every screen either shows real data, or says plainly that it cannot.

### Phase 1c — Close the privilege-escalation surface (half a day) 🔴 promoted by review

This was filed as a "preview affordance." The review confirms it is live, so it moves up from
Phase 5.

**The trainer field omissions are not enforced server-side at all:**

- `mapBatchRow` (`batches.ts:180-229`) unconditionally populates `billingDeadline`,
  `daysToBilling`, `bsrs`, `ntpLag` and `remark` for *every* caller. No trainer DTO exists.
- **RLS cannot substitute** — see §3.2.
- The only guard is a `role === 'trainer'` redirect, keyed on the **spoofable query param**
  (`role.ts:39-40` reads `?role=` *before* Clerk metadata).

So a trainer visiting `/billing?role=coordinator` is not redirected and receives billing deadlines,
BSRS and TSF figures. `RULES.md` requires those omitted server-side, not CSS-hidden — and a
redirect driven by a URL parameter is *weaker* than CSS-hiding, because the user picks the value.

9. Make Clerk metadata (later `profiles.role`) authoritative. Read `?role=` **only** when
   `NODE_ENV !== 'production'`, and never to select a role more privileged than the real one.
10. Build the real trainer DTO: a distinct select list that never fetches the financial columns.
11. `BillingQueueView.tsx:136` derives `canWrite` from the same param. No Server Actions exist yet
    (`grep 'use server'` returns nothing), so nothing is exploitable today — but **the first write
    wired to that prop inherits the escalation.** Fix the source before authoring one.

**Exit criterion:** changing `?role=` in production changes nothing, and a trainer's response body
physically lacks the financial fields.

### Phase 2 — Make "empty" honest (half a day)

12. Add `no-tenant-access` to the snapshot union (§3.1) and to the sibling contracts in
    `documents`, `billing`, `metrics`, `activity`.
13. Derive it from a real membership check, not from `batches.length === 0`.
14. Add the matching empty-state UI. Your design system already mandates six states per data
    screen — this is the one that is missing.

**Exit criterion:** with zero rows seeded, the dashboard says something *true*.

### Phase 3 — Seed reference + demo data (1–2 days) 🔒 HITL

Foreign keys dictate the order. Getting it wrong produces confusing constraint errors.

```
1. tenants
2. scholarship_programs                     (needs nothing)
3. program_document_requirements            → scholarship_programs
   program_billing_rules                    → scholarship_programs
4. profiles (already exist via webhook)
   profile_tenant_memberships               → profiles, tenants
5. batches                                  → tenants, scholarship_programs, profiles(trainer)
6. learners, documents                      → batches
7. activity_log                             → batches, profiles
```

15. Convert `shared/mocks/seed.ts` into an **idempotent SQL seed** at
    `supabase/seed/0001_demo_data.sql`. Use `on conflict do nothing` and deterministic UUIDs so
    re-running is safe.
16. ⚠️ **`program_document_requirements` must be seeded.** `mapDocumentsMap` backfills every
    requirement key to `MISSING_DOC`; with an empty catalog every document silently resolves to
    **untracked** instead of *missing*. Empty reference data doesn't just show less — it changes
    the compliance meaning.
17. Reconcile the known `document_key` vocabulary mismatch between mock fixtures and the DB enum
    (was TES-89) **before** seeding, not after.
18. **Protect the one membership row you already have.** `profile_tenant_memberships` holds a single
    hand-inserted row that is currently the only reason the demo user sees anything. Phase 4 builds
    the flow that would recreate it; until then it is irreplaceable. Either assert the seed leaves
    it untouched, or have the seed recreate it deterministically. **Do not run a `truncate`-style
    seed.**
19. **You run the seed.** The agent writes and reviews the SQL; applying it to the live project is
    yours. Capture real `select count(*)` figures at the same time (see §1.2).
    ⚠️ Confirm the project ref is `azywaivpyphhsblxjgtn` — two similarly-named projects exist.

**Exit criterion:** the dashboard renders real rows for the demo user.

### Phase 4 — Build the tenant-assignment flow (2–3 days) 🔴 the real blocker

Until this exists, every new signup is permanently stranded as a `viewer` with no school, and your
sign-up copy ("your registrar will assign your school and role") is a promise the product cannot
keep.

20. Admin screen listing profiles with no membership.
21. Server Action that writes `profile_tenant_memberships` and sets `profiles.role`.
    **Do not write this before Phase 1c** — see step 11.
22. **Enforce it in RLS, not the UI:** only `admin` may insert memberships. Verify the existing
    policy says so; if not, that is a new additive migration.
23. Log every assignment to `activity_log`. This is a compliance tool — who granted access to which
    school is an audit fact.

**Exit criterion:** a brand-new Clerk sign-up can be granted access entirely through the UI.

### Phase 5 — Retire the mocks & prove isolation (2–3 days)

24. Delete the `MOCK_BATCHES` fallback from all 9 route files. Live and fake data must never be
    indistinguishable in a compliance tool.
25. Keep `shared/mocks` only as test fixtures — never as a runtime path.
26. Complete the real resolver (TES-34): read role from `profiles` rather than Clerk metadata, and
    remove the duplicated inline copy at `dashboard/page.tsx:403-423` (A15). The urgent half
    shipped in Phase 1c.
27. **Write the RLS isolation tests.** Two tenants, two users; prove user A cannot read tenant B's
    batches, and that a trainer's response body physically lacks the financial fields. Against real
    Supabase, no mocks. This is the test that makes the whole design trustworthy.

### Phase 6 — Hardening (ongoing)

28. **A13 — hedge or fix the billing deadline.** `billingDeadline` stands in with `end_date` (its
    own `TODO(contract)`) but renders as a red "Earliest Billing · N days left" tile with
    critical/warning tiers. A coordinator is acting on a training end date dressed as an operational
    deadline. Add the real column, or hedge the label until it exists.
29. **A14 — add the missing route states.** No `error.tsx` anywhere under `app/`; `loading.tsx` only
    for `/dashboard`.
30. **A15 — move the hardcoded `tnt_j3ed` filter out of the route.** It operates on mocks, so it is
    not a live RLS bypass — but it is precisely the "query written as if RLS were absent" smell, and
    it sits in `app/`, where business logic is forbidden.
31. **A16 — status by color alone.** Activity dots (`:383`) and the lifecycle strip (`:343-357`)
    encode severity purely as color. `title` attributes are unreliable for assistive tech and
    unavailable on touch.
32. **A7/A8 — DB advisors.** Revoke `execute` on `rls_auto_enable()` from `anon`/`authenticated`;
    set `search_path = ''` on `set_updated_at`.
33. **Fix the `CLAUDE.md` drift** about `proxy.ts` (§1.5). Cheap now; a trap later.
34. **A5 — decide the ADR-locked "tenant in URL path segment" question.** Implement `[tenant]`
    routing, or write an ADR amendment recording the deferral. Do not leave a locked decision
    silently unimplemented.

---

## 5. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mock data read as live on `/billing` | **Confirmed live** | Coordinator acts on fabricated peso figures | Phase 1b, step 6 |
| `?role=` reachable in production | **Confirmed live** | Trainer reads billing/BSRS/TSF figures | Phase 1c — security, not preview |
| A write wired to `canWrite` before Phase 1c | Medium | Escalated write | Fix the role source before any Server Action |
| Third-party auth config wrong → everything 401s | High | Blocks all work | Verify with the `profiles.select('id')` check before touching other code |
| Seed applied to the wrong Supabase project | Medium | Data in a stranger's DB | Confirm ref `azywaivpyphhsblxjgtn` |
| Seed wipes the lone membership row | Medium | Demo user loses all access | Step 18 — no `truncate`; deterministic recreate |
| Mocks removed before seeding works | Medium | Blank unusable app | Phase 5 strictly after Phase 3's exit criterion |
| `document_key` mismatch seeded as-is | High | Silently wrong compliance % | Step 17, before seeding |
| FK order wrong during seed | High | Confusing constraint errors | Follow the Phase 3 dependency order exactly |
| Service-role key leaks client-side | Low | Total RLS bypass | Already isolated; add `import 'server-only'` to `service.ts` and a lint rule |

---

## 6. Trade-offs

**What you gain from this order:** the app is never broken for more than one phase; the mock
fallback stays as a safety net until real data provably works; every phase has a testable exit
criterion, so you always know whether you're done.

**What you give up:** speed. A faster route would be to seed and rip out the mocks in one go — but
then a failure could be in auth, in the seed, or in the mappers, with no way to tell which. For a
solo junior developer, that ambiguity is the expensive thing, not the extra day.

**Why 1b and 1c come before seeding:** otherwise you will debug seed data through a UI that
misreports what it is showing you, and you will not be able to distinguish a seeding bug from a
display bug.

**Deliberately deferred:** `[tenant]` URL routing, the per-module type split, LAMR schema work, and
the Express backend (documented as future-only — do not build it).

---

## 7. What to do next, concretely

1. Read §1.3 and §1.4 and confirm you recognise the symptom.
2. Do Phase 1 steps 1–2 in the two dashboards (only you can).
3. On a branch — **never on `main`** — make the token change *and* the fail-loud throw.
4. Confirm one real row comes back using the `profiles.select('id')` check. Don't log the token.
5. Do Phase 1b and 1c — half a day each, and each removes a way the app currently misleads its user.
6. Only then seed.

**Sequencing note:** Phase 1c and Phase 4 are related. 1c stops the URL from choosing your role;
4 builds the flow that assigns the real one. Between them, your single hand-inserted membership row
is the only thing granting anyone access — see step 18.

---
---

# Appendix A — Per-module inventory and per-entity contract gaps

**Added 2026-08-31.** Extends §1 and §4 of this plan with a module-by-module inventory of what
reads mocks, and a per-entity table of the schema/mapper work each screen needs. It does **not**
restate §1.3–§1.5 or the Phase 1 auth fix — those stand as written. Section references below
(§1.2, §4 Phase 1b, step 17, …) point back into the plan above.

---

## A.0 Check this first — is the reference data actually there?

The canonical migration seeds reference data **idempotently**, at
`supabase/migrations/20260528160300_create_tenant_scoped_schema.sql:766-835`:

- `tenants` — AKB, J3ED, NEN (the same three schools, with the same codes, as mock `TENANTS`)
- `scholarship_programs` — TWSP, CFSP
- `program_document_requirements` — **8 keys**, cross-joined to both programs
- `program_billing_rules` — 80% threshold per program
- `storage.buckets` — `compliance-evidence`, private, 50 MB cap

All three migrations are recorded as applied (`list_migrations`: `20260528160300`,
`20260705070510`, `20260717054607`). But `list_tables` reports `tenants: 0`,
`scholarship_programs: 0`, `program_document_requirements: 0` alongside
`profile_tenant_memberships: 1` — which is foreign-key impossible. Those are `reltuples`
planner estimates on tables that have never been `analyze`d, so at least one number is wrong.
This appendix cannot settle it: `execute_sql` is denied to agents (rule 36).

**You run one query, and it changes the size of Phase 3:**

```sql
select
  (select count(*) from public.tenants)                        as tenants,
  (select count(*) from public.scholarship_programs)           as programs,
  (select count(*) from public.program_document_requirements)  as requirements,
  (select count(*) from public.profile_tenant_memberships)     as memberships;
```

| If | Then |
|---|---|
| requirements = 16 (8 keys × 2 programs) | Reference data is live. Phase 3 shrinks to `batches`, `learners`, `documents`, `activity_log`. Step 17's doc-key reconciliation becomes an **additive migration against existing rows**, not a seed edit. |
| requirements = 0 | `mapDocumentsMap` has nothing to backfill from, so **every document on every batch resolves to `untracked`** (ADR-004) and compliance renders "—" rather than a percentage. Seeding the catalog moves from "nice" to "the screen is blank without it." |

---

## A.1 Module-by-module inventory

The single most useful fact in this appendix: **five data contracts are fully written and wired to
nothing.** Only `getBatchesSnapshot` has a caller outside its own `data/` directory.

```
                        contract exists?   route wired?   reads mocks?
batches      ████████████    yes              YES (2)        yes (fallback)
documents    ████████░░░░    yes              no             yes (100%)
activity     ████████░░░░    yes              no             yes (100%)
learners     ████████░░░░    yes              no             n/a (unreachable)
metrics      ██████░░░░░░    derive-only      no             yes (100%)
billing      ████░░░░░░░░    derive-only      YES            yes (mock reference data)
analytics    ░░░░░░░░░░░░    no               no             yes (100%)
reports      ░░░░░░░░░░░░    no               no             yes (100%)
tenancy      ░░░░░░░░░░░░    no               no             yes (100%)
attendance   ░░░░░░░░░░░░    NO TABLE         README only    —
lamr         ░░░░░░░░░░░░    tables, no code  README only    —
settings     ░░░░░░░░░░░░    no               UI only        —
notifications░░░░░░░░░░░░    no               README only    —
```

### The detail

| Module | Data contract | Consumed by | Mock reads | Status |
|---|---|---|---|---|
| **batches** | `modules/batches/data/batches.ts` — the reference implementation | `app/(dashboard)/dashboard/page.tsx:221`, `app/(dashboard)/billing/page.tsx:57` | fallback in both routes | **Live-capable.** Blocked only by §Phase 1. |
| **batches (learners)** | `modules/batches/data/learners.ts` → `getBatchLearnersSnapshot(batchId)` | **nothing** | — | Written, **unwired**. Roster only exists as `Batch.scholars_list` from mock enrichment. |
| **batches (metrics)** | `modules/batches/data/metrics.ts` → `getDashboardMetrics` (pure derive) | **nothing** — the dashboard uses `modules/batches/domain/metrics.ts` instead | — | Duplicate of the domain function. Decide which survives. |
| **documents** | `modules/documents/data/documents.ts` → `getDocumentRequirementsSnapshot`, `getBatchDocumentsSnapshot` | **nothing** | `app/(dashboard)/documents/page.tsx:6`, `DocumentsView.tsx:20`, `TableView.tsx:20`, `DocumentStatusDonut.tsx:14`, `AlertsPanel.tsx:31` | Written, **unwired**. `/documents` is 100% mock. |
| **activity** | `modules/activity/data/activity.ts` → `getActivitySnapshot(limit)` | **nothing** | `app/(dashboard)/activity-log/page.tsx:9` | Written, **unwired**. |
| **billing** | `modules/billing/data/billing.ts` — derive-only, **imports mock reference data** (`billing.ts:12`) | `app/(dashboard)/billing/page.tsx:88` | `DOCUMENT_REQUIREMENTS`, `TENANTS` from `shared/mocks` | Live batches + mock reference data. **See A.3 — the gate cannot open.** |
| **analytics** | none | `app/(dashboard)/analytics/page.tsx:11` | `MOCK_BATCHES`, `DOCUMENT_REQUIREMENTS` | 100% mock. Charts are derive-over-`Batch[]`, so it goes live for free once the route swaps. |
| **reports** | none | `app/(dashboard)/report/page.tsx:10-11`, `ReportView.tsx:24` | `MOCK_BATCHES` + `TENANTS` | 100% mock. Uses `ALL_BATCHES` scope (includes completed cohorts). |
| **tenancy** | `modules/tenancy/domain/profile.ts` only (pure) | — | `Sidebar.tsx:20`, `profile/page.tsx:18`, `report`, `billing` all read mock `TENANTS` | **No fetch layer at all.** The `tenants` table is never queried by any code. |
| **shell** | none | `MetricsRow.tsx:11` reads `MOCK_BATCHES` directly | yes | A `shared`-adjacent component reading fixtures — the chrome shows mock KPIs on every screen, including live ones. |
| **attendance** (FR-07) | **no table, no code** | 4 placeholder routes under `app/(dashboard)/trainer/` | — | See A.4. |
| **lamr** (FR-08) | 4 tables exist (`lamr_reports`/`_outcomes`/`_activities`/`_entries`), **zero TypeScript** | — | — | Schema ahead of code — the only module in that direction. |
| **import-export** | `modules/import-export/data/learnerImport.ts` | `ImportCsvModal` | — | Write path; live-capable, untested against real RLS. |
| **settings / notifications** | none | `SettingsModal` is UI-only | — | Out of scope for this migration. |
| **auth** | `modules/auth/data/{auth,role,provisioning}.ts` | layout, dashboard, billing | — | Live. `role.ts` is the §Phase 1c escalation surface. |

### Doc drift found while inventorying

The four trainer routes are placeholders whose copy still says **"Laravel must verify the trainer
is assigned to this batch"** (`trainer/classes/[batchId]/attendance/page.tsx:24`). Laravel was
never implemented. Fix the copy when these routes get built, or now — it is the same class of trap
as the `proxy.ts` drift noted in §1.5.

---

## A.2 The trap nobody has hit yet: `Batch` is mostly unfillable

`mapBatchRow` (`modules/batches/data/batches.ts:180-229`) already defaults a large share of the
`Batch` type because the schema has no column for it. **These fields render as empty or zero the
moment §Phase 1 succeeds** — the app will look *more* broken right after the fix, and that is
expected, not a regression.

| `Batch` field | Source today | Disposition |
|---|---|---|
| `id`, `tenantId`, `name`, `qualification`, `ncLevel`, `trainer`, `trainerId`, `scholars`, `trainingStart`, `trainingEnd`, `status`, `bsrs`, `progressPct`, `updatedAt` | real columns | ✅ done |
| `program` | join on `scholarship_programs.code` | ✅ done |
| `lifecycle[]` | derived from the single `current_stage` enum | ⚠️ **stage dates are all `''`.** Real per-stage dates need `activity_log` reconstruction. `LifecyclePipeline` will render bare labels. |
| `documents{}` | embedded `documents(*)` + requirement backfill | ⚠️ correct, but keyed to the 8 DB keys — see A.3 |
| `billingDeadline`, `daysToBilling` | **stands in with `end_date`** | 🔴 add a real `billing_deadline` column, or hedge the label (§Phase 6 step 28). Still true as of today. |
| `ntpLag` | `0` | needs `ntp_date` column |
| `tipDate` | `''` | needs `tip_date` column |
| `duration`, `currentDay`, `totalDays` | `0` | 🔴 **needs the attendance/sessions table — see A.4** |
| `trainingDays`, `trainingDaySchedule` | `''` / `[]` | needs a schedule column (or a `batch_schedule` table) |
| `notes` | `''` | add a `notes` column (trivial) |
| `remark` | `official_system_reference` | ⚠️ mismatched semantics — the mock `remark` is a coordinator-facing summary sentence; the column is an external system reference. Pick one. |
| `entreStart`, `entreEnd` | absent | ENTRE is UI-only per the enum bridge. Decide: real dates, or drop from the type. |
| `approvedSeats`, `completers`, `dropouts` | absent | derivable from `learners` once seeded (`is_active`, `assessment_result`) |
| `aouDate`, `ntpDate`, `reportDate`, `assessedDate` | absent | needs either columns or `activity_log` reconstruction |
| `egace` (`EgaceCounts`) | mock enrichment | derivable from `learners.assessment_result` **except** `employed` — no employment column exists |
| `employmentFollowUp`, `followUpDue`, `followUpReportDate` | mock enrichment | 🔴 no schema at all. `learners` has no employment fields; `ScholarRow` declares 10 of them (`employmentStatus`, `dateEmployed`, `occupation`, `employer`, `salary`, …). |
| `scholars_list` (`ScholarRow[]`) | mock enrichment | `mapLearnerRow` supplies ~8 of `ScholarRow`'s 28 fields. Sex, DOB, age, civil status, education, nationality, client class, contact, email have **no columns**. |
| `competencies`, `competenciesDone`, `currentCompetency` | mock enrichment | maps onto `lamr_outcomes` / `lamr_activities` — the tables exist, the code does not |
| `hoursPerDay`, `remainingDays`, `remainingHours`, `scheduleAdjustments` | mock enrichment | 🔴 attendance-dependent — see A.4 |

**Screens that will empty out:** `BatchModal` (schedule, competencies, notes, remark tabs),
`EgaceOutcomes`, `ProgressTrend`, the trainer-curriculum views, `ReportView`'s roster export.

**Recommendation:** rather than adding ~15 columns at once, split `Batch` in the type layer —
a `Batch` core that the schema genuinely backs, and an explicitly optional enrichment block that
UI must handle as absent. This is a split *within* `shared/types.ts`, not the per-module type split
that RULES.md rule 16 defers — rule 16 is about moving types into `modules/`, which would break
`shared/mocks/seed.ts`. Restructuring the interface in place does not. That is cheaper than pretending every field will arrive, and it makes
"this data does not exist yet" a compile-time fact instead of a blank card.

---

## A.3 🔴 The document-key mismatch makes billing non-functional on live data

The plan's step 17 calls this "reconcile before seeding." It is worse than imprecision. The
arithmetic, traced end to end:

```
mock DOCUMENT_REQUIREMENTS (shared/mocks/seed.ts:50-63)     12 keys
DB program_document_requirements (migration :789-798)        8 keys

deriveDocReadiness (modules/billing/data/billing.ts:55-62)
  supporting = requirements.filter(critical && stage ∈ {aou,ntp,tip,train})
             = aou, ntp, tip_report, training_sched, master_list, attendance   → requiredTotal = 6
                                     ^^^^^^^^^^^^^^  ^^^^^^^^^^^
                                     MOCK-ONLY       MOCK-ONLY  (DB has `training_schedule`; no master_list at all)

  verified = supporting.filter(isDocOnFile)
  isDocOnFile(untracked) === false        ← ADR-004 gating rule, deliberate

  on a live batch (admin/coordinator): max verified = 4  (aou, ntp, tip_report, attendance)
  on a live batch (trainer):             max verified = 4  — same four; `attendance` is seeded
                                         audience='trainer', and the documents SELECT policy
                                         narrows by audience ONLY on the trainer branch
                                         (`audience in ('trainer','all')`). admin/coordinator go
                                         through `can_manage_tenant` and see every audience.

billingGate (modules/billing/domain/readiness.ts:53)
  docsVerified = verified >= requiredTotal   →   4 >= 6   →   FALSE, always
  ready = thresholdMet && docsVerified       →   FALSE, always
```

**No live batch can ever pass the billing gate**, regardless of its documents, because two
requirements in the denominator can never appear in the numerator. Every card reads
"4 of 6 documents" forever and no `.docx` can be generated. This is a *silent* failure — the gate
closing looks exactly like a batch that is genuinely not ready.

**Fix before Phase 3, not during it.** Three options:

1. **Extend the DB catalog** (additive migration): add `master_list`, and rename or alias
   `training_schedule` → `training_sched`. Keeps the mock catalog as the vocabulary of record.
2. **Retire the mock catalog** as the default argument: `deriveDocReadiness` and
   `getDashboardMetrics` take the live requirement list, fetched via
   `getDocumentRequirementsSnapshot`. Cleaner, and it removes a `shared/mocks` import from a
   `data/` layer.
3. **Both** — extend the DB catalog to the 12-key vocabulary *and* stop defaulting to the mock
   array. This is the recommendation: the 12 keys are the compliance vocabulary the product
   documents, and the 8 were a first-pass seed.

**Also amends §Phase 1b step 6.** Deleting `&& snapshot.batches.length > 0` in
`app/(dashboard)/billing/page.tsx:62-63` is necessary but not sufficient: on the `ok` branch,
`modules/billing/data/billing.ts:12` still imports mock `DOCUMENT_REQUIREMENTS` and `TENANTS`.
And `resolveTenant(batch.tenantId)` (`billing.ts:65`) looks a **live tenant UUID** up in an array
keyed `tnt_akb` / `tnt_j3ed` / `tnt_nenita` → no match → the fallback `t?.name ?? tenantId`
**prints the raw UUID as the school name in the billing statement header.** That is RULES.md rule
6 (never leak internal IDs to the UI), reached on the live path. Give `tenancy` a real fetch layer
in the same change.

---

## A.4 Two entities that need schema, not mappers

Both touch facts that `RULES.md` lists as locked, so neither can be quietly deferred.

### Attendance (FR-07) — no table exists

`modules/attendance/` is a README. There is no attendance, session, or schedule table anywhere in
the migration history. But:

- **Locked fact:** `progress = sessions_held / total_sessions`, total = nominal hours ÷ 8,
  snapshotted on the batch.
- **Locked fact:** a scholar with **≥5 absences is ineligible**.
- **The schema contradicts both:** `batches.progress_percent` is a stored `integer` with a
  `check between 0 and 100`, written by whoever inserts the row. It is not derived from anything.
  `learners` has no absence column, so ineligibility is uncomputable.

So today, progress on live data is *asserted*, not measured — and the eligibility rule is
unenforced. Minimum additive migration:

```
batches:  + total_sessions integer     (nominal_hours / 8, snapshotted per the locked fact)
          + sessions_held integer      (or derive from the sessions table)
          + nominal_hours integer

attendance_sessions(id, tenant_id, batch_id, session_date, session_no, held boolean,
                    recorded_by, recorded_at, …)
attendance_entries (id, tenant_id, session_id, learner_id, present boolean, excused boolean, …)
```

Then `progress_percent` becomes a generated/derived value, and absences become
`count(*) where not present`. Until that lands, keep `progress_percent` but **label it as entered,
not measured** — the same hedge §Phase 6 step 28 applies to `billingDeadline`.

### Billing packets (ADR-003) — no table exists

ADR-003 locks the packet lifecycle `draft → ready → generated → submitted → settled` with derived
packet identity and derived due dates. `modules/billing/domain/packets.ts` computes packets purely
from a `Batch`, so today a packet has **no persistent state** — nothing records that a document was
generated, submitted, or settled, and a page reload forgets it. That is fine while billing is
read-only, and it stops being fine the first time someone clicks Generate.

ADR-003 upholds **NoLedger**, so this is deliberately *not* a full billing ledger. What is still
needed is minimal state on the derived identity:

```
billing_packets(id, tenant_id, batch_id, track, packet_state, generated_at, generated_by,
                submitted_at, settled_at, document_storage_path, …)
                unique (tenant_id, batch_id, track)
```

Write the ADR-003 amendment (or a short ADR-005) *before* the migration — the projection is
derived, and persisting a slice of a derived thing is exactly the decision an ADR should record.

---

## A.5 Per-screen snapshot handling

Each route below needs the same three (soon four, per §3.1) branches. This is the checklist for
the wiring phase in A.6.

| Route | Contract to call | `ok` | `sync-failed` | `unconfigured` | Also needs |
|---|---|---|---|---|---|
| `/dashboard` | `getBatchesSnapshot` ✅ wired | render | ⚠️ **banner is swallowed** by the empty-state early return (§A11, `:195-207`) | mocks, silent | `no-tenant-access`; six-state pass |
| `/billing` | `getBatchesSnapshot` ✅ wired | ⚠️ **falls to mocks when empty** (§A9) | ⚠️ swallowed at `:96` | mocks, silent | A.3 catalog fix + real tenant fetch |
| `/documents` | `getBatchesSnapshot` + `getDocumentRequirementsSnapshot` | — | — | — | 🔴 no snapshot handling at all — pure mock import |
| `/table-view` | `getBatchesSnapshot` + requirements | — | — | — | 🔴 none |
| `/batch-cards` | `getBatchesSnapshot` | — | — | — | 🔴 none |
| `/analytics` | `getBatchesSnapshot` + requirements | — | — | — | 🔴 none. Charts derive; empty state matters most here (a chart of nothing is a lie) |
| `/report` | `getBatchesSnapshot` (all-batches scope) + tenants | — | — | — | 🔴 none. Needs a completed-cohort scope the contract does not expose |
| `/activity-log` | `getActivitySnapshot` | — | — | — | 🔴 none |
| `/profile` | tenancy fetch (does not exist) | — | — | — | 🔴 none |
| `MetricsRow` (all screens) | must take data as props | — | — | — | 🔴 reads `MOCK_BATCHES` inside a shell component |
| `Sidebar` | tenancy fetch (does not exist) | — | — | — | 🔴 reads mock `TENANTS` |

`RULES.md` rule 24 requires **six** states on every data screen: loading, empty, no-results,
error/sync-failed, permission-denied, stale-data. Today only `/dashboard` has a `loading.tsx`, and
there is no `error.tsx` anywhere (§A14). Wiring a route without its states just moves the lie.

---

## A.6 Where this lands in the roadmap

Insert one phase; amend two.

```
Phase 1   auth chain repair                    ← unchanged, still first
Phase 1b  stop the app from lying              ← AMEND with A.3's tenant-UUID leak
Phase 1c  close the ?role= escalation          ← unchanged
Phase 2   no-tenant-access state               ← unchanged
Phase 2b  ★ NEW: reconcile the document-key catalog   (A.3)  — half a day
Phase 2c  ★ NEW: wire the five unwired contracts       (A.1)  — 1–2 days
Phase 3   seed batches / learners / documents  ← AMEND with A.0 and A.7
Phase 4   tenant-assignment flow               ← unchanged, still the real blocker
Phase 4b  ★ NEW: tenancy fetch layer                   (A.3)  — half a day
Phase 5   retire the mock *fallback paths*     ← keep shared/mocks itself (A.7)
Phase 6   hardening + the A.4 schema work
```

**Numbering note.** §4 above uses one running step sequence (1–34) and that stays the canonical
checklist. The phases added here carry no step numbers — 2b, 2c and 4b are *sequencing
constraints* slotted between existing phases, not a second numbering scheme. Cross-references in
this appendix ("§Phase 1b step 6", "step 15", "step 18") point at §4's numbers.

**Phase 2b — reconcile document keys (half a day).** Must precede any seeding. Without it billing
is dead on live data (A.3) and every compliance percentage is computed against the wrong
denominator.

**Phase 2c — wire the five unwired contracts (1–2 days).** The cheapest real progress in this
plan: `/documents`, `/activity-log`, `/table-view`, `/batch-cards` are each a route-file edit away
from live. Three rules for this phase:

1. **It sits after Phase 1/1b, not before.** With the token broken, every one of these returns
   `sync-failed` and falls back to mocks — reproducing the exact "mocks rendered as live" failure
   Phase 1b exists to kill. Wiring first would multiply the bug across four more screens.
2. **Each route ships with its sync-failed banner and empty state in the same commit.** Never wire
   a contract and defer the states.
3. **One route per PR.** Each is independently shippable and independently revertible.

`/analytics`, `/report`, `/profile`, `MetricsRow` and `Sidebar` need contracts written first
(analytics and report derive from `Batch[]`, so they mostly need the route to receive a snapshot;
profile and Sidebar need the tenancy fetch from Phase 4b).

---

## A.7 Seeding strategy

Per `CLAUDE.md`, **`shared/mocks` stays** — it is the `unconfigured` fallback for an environment
with no Supabase env, and it is the fixture source for the Vitest harness. Phase 5 removes the
*fallback wiring in routes that also have live data*, not the dataset. Do not delete
`shared/mocks/seed.ts`.

**Order** is dictated by foreign keys; the plan's §Phase 3 step-15 list is correct and unchanged.
Three things it does not yet say:

**1. Batch identity — resolve before writing any INSERT.** Locked fact: *one RQM code = one
batch*, and NTP authorization lives on the batch. `mapBatchRow` sets `Batch.id = row.batch_code`,
so `batch_code` is both the RQM code and the string rendered in card titles and the URL. Mock
batches are `BAT-1`, `BAT-2`, `BAT-3` — not RQM codes. Seeding them verbatim contradicts the
locked fact; seeding real codes
(`RQM3-2026-CFSP-1263-0009`) turns every short UI label into a 25-character string the cards were
never designed for. **Recommendation:** seed the real RQM code into `batch_code`, add a separate
short `display_label` column (or reuse `batch_section`), and have `mapBatchRow` prefer the label
for `name` while `id` stays the RQM code. Decide this before the seed, not after — `batch_code`
carries a unique constraint and is referenced by `Batch.id` everywhere.

**2. Documents point at storage objects that do not exist.** Mock `DocRecord.url` values are
`storage://akb/aou-bat1` — a pseudo-scheme with nothing behind it. The `compliance-evidence`
bucket exists and is private, and its RLS policies key on
`(storage.foldername(name))[1]::uuid` — **the first path segment must be the tenant UUID.** So a
seeded document row either:
- sets `storage_path = null` and `external_url = null` → `mapDocumentRow` yields
  `url: null, source: null`, which is honest; or
- gets a real uploaded object at `<tenant_uuid>/<batch_id>/<document_key>.pdf`.

Prefer the first for the initial seed. A `storage_path` pointing at a missing object produces a
download button that 404s — a compliance tool claiming evidence it does not hold.

**3. Idempotency and the one irreplaceable row.** As §Phase 3 step 18 says: no `truncate`. Use
deterministic UUIDs (`gen_random_uuid()` is *not* deterministic — hardcode literals, or derive
them, so a re-run is a no-op) and `on conflict do nothing`. The single hand-inserted
`profile_tenant_memberships` row is currently the only thing granting anyone access, and nothing in
the app can recreate it until Phase 4.

```
seed order (FK-dictated)

  tenants ──┬─────────────────────────────────────────┐   already seeded by the migration
            │                                         │   (verify with A.0's query)
  scholarship_programs ──┬── program_document_requirements
                         └── program_billing_rules
            │            │
            ▼            ▼
  profiles (webhook-created — do NOT seed)
            │
            ▼
  profile_tenant_memberships   ⚠ protect the existing row
            │
            ▼
  batches ──┬── learners ── (lamr_entries, later)
            ├── documents  ⚠ storage_path = null unless a real object exists
            └── activity_log
```

---

## A.8 Risk register — additions

Extends §5; does not replace it.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Billing gate can never open on live data** (A.3) | **Confirmed by arithmetic** | Billing screen is decorative; no `.docx` generatable | Phase 2b, before any seeding |
| **Tenant UUID printed as the school name** on billing statements (A.3) | **High** once Phase 1 lands | RULES.md rule 6 breach on a document-shaped surface | Phase 4b tenancy fetch, or a null-safe fallback in the same commit as Phase 1b |
| Screens empty out right after the auth fix (A.2) | **Certain** | Looks like a regression; invites a rushed schema sprint | Pre-announce it; split `Batch` into core + optional enrichment |
| `progress_percent` is asserted, not measured (A.4) | **Confirmed** | Billing threshold and dashboard KPIs rest on a hand-entered number, against a locked formula | Hedge the label now; attendance schema in Phase 6 |
| Packet state lost on reload (A.4) | Medium | First "Generate" click has nowhere to record itself | ADR amendment + `billing_packets` before wiring any generate action |
| Wiring the five contracts before Phase 1 | Medium | Multiplies the "mocks as live" bug across four more screens | Phase 2c ordering rule 1 |
| Reference data absent (A.0) | Unknown | Every document reads untracked; compliance shows "—" everywhere | Run A.0's query first |
| Mock `remark` vs `official_system_reference` semantics (A.2) | Medium | A coordinator reads an external system reference where a summary sentence belongs | Pick one meaning; the mapper currently picks silently |
| Deleting `shared/mocks` in Phase 5 | Medium | Loses the `unconfigured` fallback and the future test fixtures | A.7 — remove fallback *wiring*, keep the dataset |

---

## A.9 Trade-offs in this appendix's recommendations

**Phase 2c (wire the unwired contracts) before Phase 3 (seed).** You gain four screens that
correctly say "no data yet" instead of confidently showing fiction, and you prove the contracts
work against a real (empty) database before any rows exist to confuse the diagnosis. You give up
the satisfaction of seeing data — the app looks emptier for a week.

**Extending the DB catalog to 12 keys rather than trimming the mock catalog to 8.** You gain the
compliance vocabulary the product actually documents, and `master_list` / `trainer_qual` are real
TESDA artifacts, not fixture inventions. You give up a smaller schema, and you take on a
migration that must run before seeding.

**Splitting `Batch` into core + optional enrichment (A.2).** You gain compile-time honesty about
what the database can supply, and every consumer is forced to handle absence. You give up ~20
call-site edits, and `shared/mocks/seed.ts` must keep constructing the full shape — which is fine,
since it is a fixture.

**Deferring the attendance schema to Phase 6.** You gain a much shorter path to a working app.
You give up, for that period, the ability to compute the locked progress formula or the ≥5-absence
eligibility rule — so both must be *labelled* as unmeasured, not silently rendered as facts. For a
compliance tool that hedge is the whole point; an unhedged number here is the single most
expensive thing in this document.
