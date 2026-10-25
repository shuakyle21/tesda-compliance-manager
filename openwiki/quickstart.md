---
type: Reference
title: Quickstart and Change Routing
description: "First stop before changing TVI-CAMS: what the system is and where the official-systems boundary lies, the doc-reading order and full ADR precedence chain, the invariants that gate every change and their enforcement levels, the exact verification loop, the durable substrate facts a change must account for, and a task → page routing table over the fixed four-page set."
tags: ["quickstart", "task-routing", "onboarding", "invariants", "verification", "tesda-compliance-manager", "nextjs", "supabase", "clerk", "rls", "migrations", "adr-precedence"]
verified:
  - by: openwiki/0.5.0
    at: 2026-10-25T05:56:04.137Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-89a62965cacab8710f57d4cf
    resource: repo://.github/workflows/qodana.yml
  - id: openwiki-source-75140e138296a68cc258200e
    resource: repo://app/(dashboard)/schools/new/page.tsx
  - id: openwiki-source-d9ee1df1a1fa6105c9c562bf
    resource: repo://app/sign-in/%5B%5B...sign-in%5D%5D/sign-in-page.tsx
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-aa73e0f7c001cde7c90e254e
    resource: repo://docs/adr/ADR-003-billing-packet-queue.md
  - id: openwiki-source-852d3a9765c4d719dcd1ae2c
    resource: repo://docs/adr/ADR-006-platform-admin-and-school-registry.md
  - id: openwiki-source-a201158b72d575d540d15779
    resource: repo://docs/adr/ADR-007-attendance-based-dropout-rule.md
  - id: openwiki-source-6274a82a4962ca0eff3e198d
    resource: repo://docs/adr/ADR-008-recorded-batch-billing-deadline.md
  - id: openwiki-source-0d40866d6dce044e0547eef9
    resource: repo://docs/DATA_MODEL.md
  - id: openwiki-source-77b021311c7cb4c8d8432fb2
    resource: repo://e2e/auth.spec.ts
  - id: openwiki-source-e6f02f5d20be6272be761347
    resource: repo://lib/supabase/server.ts
  - id: openwiki-source-4afc6c67d0142492979e14f5
    resource: repo://lib/supabase/service.ts
  - id: openwiki-source-fff5b0f28701e5c247650fab
    resource: repo://modules/auth/domain/oauthSignIn.ts
  - id: openwiki-source-d8c97a76fddda28591be8a4c
    resource: repo://modules/auth/domain/redirectUrl.ts
  - id: openwiki-source-fa1460427741e716baf8631a
    resource: repo://modules/batches/data/batches.ts
  - id: openwiki-source-05b5b2c042bb4f3b47496b1f
    resource: repo://modules/documents/data/evidence.ts
  - id: openwiki-source-764eda3eb972fdc48c5584a5
    resource: repo://modules/documents/domain/compliance.ts
  - id: openwiki-source-3f1f3f4919f6d868d27df2e3
    resource: repo://modules/tenancy/data/platform.ts
  - id: openwiki-source-2e2d8e1af455c1b26b721663
    resource: repo://modules/tenancy/data/schools.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-f7ae5e0747518115ed202c7e
    resource: repo://RULES.md
  - id: openwiki-source-9db8826ef803807be7854211
    resource: repo://supabase/migrations/20260910120000_add_adr001_billing_domain.sql
  - id: openwiki-source-79c2984b4ebc22667b81e541
    resource: repo://supabase/migrations/20261024071359_adr007_attendance_dropout_rule.sql
  - id: openwiki-source-bde01a456257d0b7caf19920
    resource: repo://supabase/migrations/20261024110000_add_dashboard_operational_fields.sql
  - id: openwiki-source-acb73c82b90d7c0325351e5f
    resource: repo://supabase/migrations/README.md
  - id: openwiki-source-4b1944144311805b722ef6ef
    resource: repo://tests/unit/dashboard-domain.test.ts
  - id: openwiki-source-892600aba8a4baaca4ccc7a9
    resource: repo://tests/unit/doc-blockers.test.ts
  - id: openwiki-source-34d1790c8509224339ebf77e
    resource: repo://tests/unit/redirect-url.test.ts
  - id: openwiki-source-5840c4db50eac7206a874ca9
    resource: repo://tests/unit/sign-in-verification.test.ts
  - id: openwiki-source-4a8c4e61ab290d00b22b6541
    resource: repo://tests/unit/urgency.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
generated: { by: "openwiki/0.5.0", at: "2026-10-25T05:56:04.137Z" }
---

# Quickstart and Change Routing

This is the first page an agent or human opens before touching TVI-CAMS. It is a routing map, not a tutorial: orient on the system, find the page that answers your task, know the invariants no change may cross, and know how to verify work.

## What TVI-CAMS is

TVI-CAMS (TESDA Compliance Manager) is an **internal multi-tenant compliance working layer** for TVI schools running TESDA scholarship batches (TWSP/CFSP). It tracks batch lifecycle, documents, attendance, and LAMR evidence, and generates the school's billing documents as populated `.docx` templates (ADR-001: TSF/Allowance, Training Cost, Entrepreneurship; Assessment Fee is out of scope).

**The official-systems boundary.** This tool never holds official standing. TESDA's **SIS, T2MIS, and BSRS remain authoritative** for official records, approved qualification maps, schedules, ULI records, attendance submissions, billing documents, and required reports; Supabase stores internal working copies, evidence, status tracking, and references to official records. UI copy must never imply official TESDA approval or submission (RULES rule 27) — a packet marked `submitted` or `settled` is a person's bookkeeping note, not an official fact (ADR-003 P3).

Orientation facts:

- **Tenants:** three initial schools — AKB, J3ED, NEN — strictly scoped by Supabase RLS. New schools are provisioned through `/schools/new`.
- **Roles:** Admin, Coordinator, Trainer, Viewer — lowercase `profile_role` values; capitalized labels are display copy only (`CONTEXT.md`, RULES "Locked domain facts"). Role authority is `profiles.role`; Clerk is identity only.
- **Platform admin / school registry (ADR-006):** a *separate axis* from `profile_role`, never a fifth role value. `/schools/new` runs a `security invoker` `create_school` RPC that lands a tenant **plus its registered programs in one transaction**. Its reach is the registry only — `tenants`, `qualifications`, `tenant_qualifications`, unassigned `profiles`, seating a tenant's first member — and holding `admin` at a school grants nothing on `/schools/new`.
- **Programs:** TWSP and CFSP, stored as configurable records, not hard-coded UI branches.
- **Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Supabase (Postgres + Storage), Clerk, pnpm as the only package manager. One app talks directly to Supabase; there is no separate backend. **Node 22+ is required** (`engines` in `package.json`).

## Run it locally

```bash
pnpm install
pnpm dev          # Next.js dev server on :3000
```

`.env.example` documents the Clerk test keys (`pk_test_*` / `sk_test_*`) the e2e suite uses. The Supabase pair is `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read by [`lib/supabase/server.ts`](/lib/supabase/server.ts)); `SUPABASE_SERVICE_ROLE_KEY` is read only by [`lib/supabase/service.ts`](/lib/supabase/service.ts) and must never reach client code (RULES rule 3). With the Supabase pair unset, `isSupabaseConfigured()` is false and data functions return `unconfigured` snapshots — never fabricated data (RULES rule 19).

## Read the docs in this order

1. [`README.md`](/README.md) — what this is, features, roles, layout, commands.
2. [`CONTEXT.md`](/CONTEXT.md) — domain model and ubiquitous language (Batch, RQM, NTP, ULI, tranche, readiness gate, "untracked"…).
3. [`CLAUDE.md`](/CLAUDE.md) — architecture guidance and the *why* behind the invariants.
4. [`RULES.md`](/RULES.md) — the *what*: the non-negotiable checklist, each rule tagged with its enforcement level (hook / deny / lint / types / rls / review). **Read it before any code change.** Where `CLAUDE.md` and `RULES.md` appear to disagree, **RULES.md wins** and the drift gets fixed (rule 34 still claims no test runner exists; `tests/unit/` holds 25 spec files).

### ADR precedence

`RULES.md` rule 30 is the chain, and it resolves in one direction. Never quote superseded PRD wording as current:

| ADR | Effect on the chain | Status |
| --- | --- | --- |
| [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md) | Billing is a document-generating engine; supersedes conflicting "billing = preparation signal only" PRD/TRD wording. Locks progress `=` `sessions_held ÷ total_sessions`, one RQM = one batch, NoLedger. | base of the chain |
| [ADR-003](/docs/adr/ADR-003-billing-packet-queue.md) | **Amends ADR-001 §4**: the packet queue is a derived projection; `due_date` derived, never stored (P5). | amends |
| [ADR-004](/docs/adr/ADR-004-untracked-document-semantics.md) | A requirement with no record is `untracked` — excluded from measurement, failing closed at gates, decided once in `modules/documents/domain/compliance.ts`. | accepted |
| [ADR-006](/docs/adr/ADR-006-platform-admin-and-school-registry.md) | **Supersedes FR-02's "no Super Admin"**: a platform admin exists, registry-scoped only. Extending its reach needs its own ADR. | supersedes |
| [ADR-007](/docs/adr/ADR-007-attendance-based-dropout-rule.md) | **Supersedes ADR-001's `Elig` row**: dropout is absences above 20% of `total_sessions` **or** 3 consecutive unexcused absences. The retired ≥5-absence count and `max_absences` column are gone. | supersedes |
| [ADR-008](/docs/adr/ADR-008-recorded-batch-billing-deadline.md) | **Amends ADR-003 P5** for the batch-level deadline only: `batches.billing_deadline` is recorded, null means *not recorded*; packet `due_date` stays derived. | proposes |

ADR-002 and ADR-005 remain accepted and load-bearing for scope (the prototype portrays the ADR-001 target; one membership per profile, seeds never migrations).

## The fixed four-page wiki

Four pages, this one plus three architecture pages. No fifth page, and no `design-system.md` — UI, token, state and copy questions route to [`RULES.md`](/RULES.md) §4–§5.

| Page | Answers |
| --- | --- |
| [Architecture Overview](/openwiki/architecture/overview.md) | The map: stack, the Clerk → proxy → `requireAuthenticatedUser()` → RLS request path, scoped `/t/<school>` routing, the lint-enforced import model, the module catalog, ADR precedence. |
| [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md) | Schema shape, enums, the [migration ledger](/openwiki/architecture/data-model-and-rls.md#migration-history) and repo-vs-database drift, `app_private.*` helpers and the [per-table policy map](/openwiki/architecture/data-model-and-rls.md#per-table-policy-map), the [ADR-006 boundary](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006), the `database.types.ts` regeneration contract, rule-36 guardrails. |
| [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) | Where code goes, [import direction](/openwiki/architecture/module-boundaries-and-data-pattern.md#import-direction-is-lint-enforced), the private `data/` surface, [fetch → map → derive](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-data-contract-fetch--map--derive), the [snapshot union](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-four-state-snapshot-contract), [enum bridges](/openwiki/architecture/module-boundaries-and-data-pattern.md#enum-bridges-total-maps-in-the-mapper-never-in-components), the documents-module gate-vs-measurement split. |

## Invariants that gate every change

1. **RLS is the security boundary; UI hiding is usability only** (rule 1, **[rls]**). Every authorization decision is Postgres RLS via `app_private.*`. **A JS-side tenant filter is a bug even when it returns the right answer** — it signals a query written assuming no RLS (rule 2). Tenant-scope selection in `modules/tenancy` rides *on top of* RLS, never instead of it.
2. **Import direction is `app → modules → shared → lib/supabase`, lint-enforced** (rule 7; `import/no-restricted-paths` in [`eslint.config.mjs`](/eslint.config.mjs)). Raw `database.types.ts` rows are data-layer only (rule 10), `shared/` never imports upward (rule 9), and another module's `data/` is private (rule 8).
3. **Never execute statements against the live Supabase project without explicit permission** (rule 36, **[deny]**): `execute_sql` — *including read-only `select`s* — `apply_migration`, branch create/merge/reset, and edge-function deploys, by any route (MCP, CLI, `psql`). One hosted project, no staging. Answer schema questions from the migrations and `lib/supabase/database.types.ts` first; the read-only introspection tools (`list_migrations`, `list_tables`) are for what those cannot answer.
4. **`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are do-not-edit handoff** (rule 28, **[hook]**): ported verbatim, `globalIgnores`d, edit-blocked by `.claude/hooks/protect-static-dirs.sh`.
5. **After any migration: regenerate `lib/supabase/database.types.ts`, then update affected mappers and domain types** (rule 20); new migrations are additive and `20260528160300_create_tenant_scoped_schema.sql` is canonical.
6. **ADR precedence closes doors.** ADR-006's platform-admin reach is closed: granting `app_private.is_platform_admin()` any compliance table, or letting the operator seat itself into a tenant, needs its own ADR. ADR-004 makes `modules/documents/domain/compliance.ts` the single home of untracked-document semantics; no surface re-decides it.
7. **Locked domain facts code must not contradict** (RULES, bottom): progress is `sessions_held / total_sessions`; the ADR-007 dropout rule; one RQM code = one batch; ULI is the permanent learner key; tenant context lives in the URL path segment; alerts are computed on read — no cron, no email.

## Verification loop

Run these in order, commands exactly as invoked:

```bash
pnpm lint               # ESLint flat config; enforces the import boundaries above
pnpm test               # Vitest over tests/unit/ (Node 22+ required)
pnpm exec tsc --noEmit  # strict typecheck — there is no dedicated script
pnpm test:e2e           # Playwright e2e (e2e/), Clerk test keys only per .env.example
```

- `pnpm test` runs `vitest run` over `tests/unit/**/*.test.ts` ([`vitest.config.mts`](/vitest.config.mts)); **25 spec files** at this head. Mappers and `domain/` layers are asserted with **fixed as-of dates** so time-dependent rules stay deterministic — `urgency.test.ts`, `dashboard-domain.test.ts`, `learner-import.test.ts`, `evidence-path.test.ts`, `doc-blockers.test.ts` and the rest.
- **Node 22+ is required:** Vitest 4's rolldown calls `util.styleText` with an array argument and throws `ERR_INVALID_ARG_VALUE` on Node 21 or older — a bundler stack trace at startup, not a test failure.
- `pnpm test:e2e` boots the app via `pnpm dev` (the `webServer` in [`playwright.config.ts`](/playwright.config.ts)); `e2e/global.setup.ts` obtains a Clerk testing token and [`e2e/auth.spec.ts`](/e2e/auth.spec.ts) asserts that an unauthenticated `/dashboard` visit redirects to `/sign-in` — proof the layout gate, not `proxy.ts`, is the gate. **Clerk test keys only**, never production keys.
- No CI workflow runs this loop; green is a local, self-imposed gate.

## Durable substrate facts a change must account for

Read from checked-in records, not from the live project (rule 36). The dated per-version catalog lives in [`supabase/migrations/README.md`](/supabase/migrations/README.md) and the [migration ledger](/openwiki/architecture/data-model-and-rls.md#migration-history) — consult those, do not assume.

1. **Migrations: nine `.sql` files.** `20260528160300` is canonical; the rest are additive. `20261024071359` (ADR-007) is applied and verified live; `20261024110000` (ADR-008) is checked in and **not applied**. `20260910120000` (ADR-001) and `20260906120000` are now repair-recorded, and the `ensure_profile_tenant_membership` gap is closed — the ledgers' older prose about it is history.
2. **Version ≠ filename, and the directory is not the deployed schema.** Supabase keys applied migrations on the version string: a renamed file looks unapplied, and hand-run SQL records nothing. ADR-007's file was renamed to the version Supabase actually recorded. Confirm a migration by object name (`pg_proc`, `pg_policies`), never by comparing policy *sets* — a set reads as a superset regardless. `list_tables` row counts are `reltuples` estimates.
3. **One policy is not reproducible from the repo.** `public.tenants` carries "Tenants selectable by Clerk user", defined by no checked-in migration, omitting the `is_active` check its reviewed counterpart enforces — so the checked-in policy map describes intent, not every policy enforcing it.
4. **The type layer is out of step in both directions.** `database.types.ts` predates the billing domain and ADR-007 (no billing tables, no `excused`, and `program_billing_rules` still describes the retired `max_absences`) while carrying `billing_deadline` **by hand** ahead of its migration. Regenerate only against a database that already has what the file describes.
5. **Nothing reads the ADR-007 or ADR-008 columns yet.** `max_absence_percent` and `excused` have no code caller (`modules/attendance/domain/eligibility.ts` is unbuilt), so the rule is schema and docs only; `modules/batches/data/batches.ts` reads `row.billing_deadline ?? null`, so until `20261024110000` applies every batch reports "not recorded". Someone must still enter deadlines — there is no edit path for the column.
6. **Seeds never run automatically.** `20260831120000` lives in [`supabase/seeds/`](/supabase/seeds/README.md); `[db.seed]` points at a placeholder, and its rows are already in the hosted project.
7. **Evidence storage I/O is unverified** until issue #122 (unset Clerk-Supabase/Third-Party Auth toggles make every call fail as an indistinguishable RLS denial), and `storage.objects` has **no DELETE policy** for the bucket — which is why `modules/documents/data/evidence.ts` exposes no delete.
8. **The blocker-gate family has no screen.** `blockingDocuments` / `blockerCount` / `blockingDocumentNames` implement ADR-004 D4 and are tested in `tests/unit/doc-blockers.test.ts`, but nothing in `app/` imports them — a ready public domain surface.

## Task → page routing

| Task family | Start here |
| --- | --- |
| Before any code change (all families) | [`RULES.md`](/RULES.md) — the checklist, every rule tagged with its enforcement level |
| Schema, RLS policies, migrations, enums, triggers, the `compliance-evidence` bucket | [data-model-and-rls](/openwiki/architecture/data-model-and-rls.md) — [migration history](/openwiki/architecture/data-model-and-rls.md#migration-history), [per-table policy map](/openwiki/architecture/data-model-and-rls.md#per-table-policy-map), [storage policies](/openwiki/architecture/data-model-and-rls.md#storage-policies) |
<!-- openwiki: broken internal link [</app/(dashboard] file "</app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
| Provisioning a school; platform admin; registry; qualifications/COPR | [data-model-and-rls, School registry and platform admin (ADR-006)](/openwiki/architecture/data-model-and-rls.md#school-registry-and-platform-admin-adr-006); write path [`app/(dashboard)/schools/new/page.tsx`](</app/(dashboard)/schools/new/page.tsx>), [`modules/tenancy/domain/schoolDraft.ts`](/modules/tenancy/domain/schoolDraft.ts), [`modules/tenancy/data/schools.ts`](/modules/tenancy/data/schools.ts) |
<!-- openwiki: broken internal link [</app/(dashboard] file "</app/(dashboard" does not exist. Fix the href or restore the target, then delete this comment. -->
| Adding or inviting a user; profile provisioning; `/users/new` | [data-model-and-rls, Profile provisioning and user administration](/openwiki/architecture/data-model-and-rls.md#profile-provisioning-and-user-administration) + [`app/(dashboard)/users/new/actions.ts`](</app/(dashboard)/users/new/actions.ts>), [`modules/auth/data/provisioning.ts`](/modules/auth/data/provisioning.ts) |
<!-- openwiki: broken internal link [/openwiki/architecture/overview.md#the-auth-chain-in-one-breath] heading anchor "the-auth-chain-in-one-breath" does not exist in "/openwiki/architecture/overview.md". Fix the href or restore the target, then delete this comment. -->
| Sign-in, post-sign-in redirect handling, MFA, error shaping | [overview, the auth chain](/openwiki/architecture/overview.md#the-auth-chain-in-one-breath) + `modules/auth` (`sanitizeRedirectUrl` in [`domain/redirectUrl.ts`](/modules/auth/domain/redirectUrl.ts)) |
| Adding a migration or regenerating `database.types.ts` | [data-model-and-rls, the regeneration contract](/openwiki/architecture/data-model-and-rls.md#the-database-types-regeneration-contract) + the [`supabase/migrations/README.md`](/supabase/migrations/README.md) ledger in the same PR |
| Where code goes; import boundaries; adding a module | [module-boundaries-and-data-pattern, layer model](/openwiki/architecture/module-boundaries-and-data-pattern.md#layer-model) and [import direction](/openwiki/architecture/module-boundaries-and-data-pattern.md#import-direction-is-lint-enforced) |
| New entity data layer; snapshot/error states; enum bridges; `no-tenant-access` fold | [module-boundaries-and-data-pattern, the data contract](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-data-contract-fetch--map--derive), [snapshot union](/openwiki/architecture/module-boundaries-and-data-pattern.md#the-four-state-snapshot-contract), [enum bridges](/openwiki/architecture/module-boundaries-and-data-pattern.md#enum-bridges-total-maps-in-the-mapper-never-in-components) |
| Document-compliance semantics (untracked, gate vs. measurement, evidence paths) | [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md) + [ADR-004](/docs/adr/ADR-004-untracked-document-semantics.md) |
| Billing and packet work (ADR-001 engine, ADR-003 queue, ADR-008 deadline) | Read the ADR first (rule 30): [ADR-001](/docs/adr/ADR-001-billing-and-domain-model.md), then [ADR-003](/docs/adr/ADR-003-billing-packet-queue.md), then [ADR-008](/docs/adr/ADR-008-recorded-batch-billing-deadline.md) — ADR-008 **amends P5**, so stale P5 wording is not current |
| Dashboard urgency engine; alerts and attention ordering | [overview](/openwiki/architecture/overview.md) → the domain rules in [module-boundaries-and-data-pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md); urgency is computed on read, defined in `modules/batches/domain/`, covered by `tests/unit/urgency.test.ts` and `dashboard-domain.test.ts` |
| Dropout / eligibility questions | [ADR-007](/docs/adr/ADR-007-attendance-based-dropout-rule.md) — the ≥5-absence rule is retired even where older prose still cites it |
| UI rules, tokens, states, copy, icons | [`RULES.md`](/RULES.md) §4 (rules 21–26) and §5 (rule 27); [`CLAUDE.md`](/CLAUDE.md) gives the why — no wiki page owns this, by design |
| Domain vocabulary; locked domain facts | [`CONTEXT.md`](/CONTEXT.md) + [RULES.md, Locked domain facts](/RULES.md) |
| Verifying a change | The [verification loop](#verification-loop) above |
| Touching the live database at all | Rule 36 — explicit permission first; [data-model-and-rls, operations](/openwiki/architecture/data-model-and-rls.md#operations-and-agent-constraints-rules-10) |

## Related pages

- [Architecture Overview](/openwiki/architecture/overview.md)
- [Supabase Data Model and RLS Policies](/openwiki/architecture/data-model-and-rls.md)
- [Module Boundaries and the Data Layer Pattern](/openwiki/architecture/module-boundaries-and-data-pattern.md)
