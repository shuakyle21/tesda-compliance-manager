# Security Scope

OWASP security audit of TVI-CAMS (TESDA Compliance Manager).
Started 2026-11-17. Status: Phases 1 to 5 done. Phases 6 and 7 done for item 1.1 only.

This file says **what** is being audited, **who** audits it, and **what the audit must not do**.

## 1. What the system is

A single Next.js 16 app (App Router, React 19) that talks straight to Supabase (Postgres and
Storage). Clerk handles sign-in. There is no separate backend.

Request path, in order:

1. `proxy.ts`: Clerk middleware. It attaches the session. It does **not** block anyone.
2. `app/(dashboard)/layout.tsx`: `requireAuthenticatedUser()`. This is the page-level gate.
3. `modules/<domain>/data/*`: the data layer. It builds a Supabase client with the public
   anon key plus the caller's Clerk session token (`lib/supabase/server.ts`).
4. Postgres row-level security (RLS). The `app_private.*` helper functions decide every
   read and write.

**The fact that shapes this whole audit:** the Supabase URL and anon key are public, and every
signed-in user holds their own Clerk token in the browser. So any user can skip the Next.js app
and call the database API directly. Whatever RLS allows, a user can do. Checks in the app are
for usability, not for security.

## 2. In scope

| Area | Where |
|---|---|
| Sign-in, session, role lookup | `proxy.ts`, `modules/auth/`, `app/sign-in`, `app/sign-up` |
| Clerk to Supabase token hand-off | `lib/supabase/server.ts`, `client.ts`, `service.ts` |
| Tenant (school) scoping | `modules/tenancy/`, `app/(dashboard)/tenant-scope.ts`, `tenant-access.ts` |
| Database schema, RLS, functions, grants | `supabase/migrations/*.sql` (10 files, about 2,500 lines) |
| Storage bucket and policies | `compliance-evidence` bucket, canonical migration, `modules/documents/data/evidence.ts` |
| API routes | `app/api/health`, `app/api/debug/auth-check`, `app/api/openapi.json`, `app/api/webhooks/clerk` |
| Server actions (writes) | `app/(dashboard)/users/new/actions.ts`, `app/(dashboard)/schools/new/actions.ts` |
| Data layers | `modules/*/data/*.ts` (batches, learners, billing, documents, evidence, import, activity, tenancy, auth) |
| Learner import (CSV) and report export (XLSX) | `modules/import-export/`, `modules/reports/` |
| Secrets and environment variables | `.env.example`, `process.env.*` usage, `.gitignore`, committed config files |
| Dependencies | `package.json`, `pnpm-lock.yaml` |
| CI and automation | `.github/workflows/*.yml`, `.claude/settings.json`, `.claude/hooks/` |
| Error handling and logging | snapshot shaping in data layers, `activity_log` table |
| Security headers and Next.js config | `next.config.ts`, `app/layout.tsx` |

Open PR #321 (NTP batch creation) is **not** on `main`. Leads from the earlier database audit
about it are listed in `FINDINGS.md` as "not on main", and are not re-audited here.

## 3. Out of scope

- The live Supabase project's data. No SQL is run against it (RULES.md rule 36).
- Clerk's and Supabase's own platforms. Only how this app configures and uses them.
- Penetration testing against any deployed URL.
- `assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` (static design hand-off, not app code).
- TESDA's own systems (SIS, T2MIS, BSRS).

## 4. Sensitive data

| Data | Table or place | Who should see it |
|---|---|---|
| Learner identity, ULI | `learners` | The learner's school. Trainers only for their batch. |
| Learner contact, birth date, address, salary | `learner_details` | Office roles of that school only. Never trainers. |
| Billing amounts, cost snapshots, NTP figures | `batches`, `billing_records`, `tenant_settings`, cost tables | Admin and coordinator. Never trainers. |
| Evidence files (scans, signed forms) | Storage bucket `compliance-evidence` | The school, by role and document audience. |
| Login link (`clerk_user_id`), role, membership | `profiles`, `profile_tenant_memberships` | Changing these changes who a person is in the system. |
| National reference data (cost schedule, required documents) | `scholarship_programs`, `program_*`, `scholarship_cost_schedule` | Read by all. Written by platform level only. |
| Audit trail | `activity_log` | Must be trustworthy, so it must not be forgeable. |
| Secrets | Service-role key, Clerk secret key, webhook signing secret | Server only. Never in the repo or the browser. |

## 5. Roles

| Role | Meant to do |
|---|---|
| `admin` | Manage one school, including its users. |
| `coordinator` | Manage one school's batches, documents, billing. |
| `viewer` | Read only. Writes must be refused by the server. |
| `trainer` | Only assigned batches. No billing or financial data. |
| Platform admin | School registry only (ADR-006). No compliance tables. |

`profiles.role` is one value per person, across all schools. This matters for several findings.

## 6. Reference frameworks

- OWASP Top 10: A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection,
  A04 Insecure Design, A05 Security Misconfiguration, A06 Vulnerable and Outdated Components,
  A07 Identification and Authentication Failures, A08 Software and Data Integrity Failures,
  A09 Security Logging and Monitoring Failures, plus Mishandling of Exceptional Conditions.
- OWASP ASVS (used as a checklist for the micro-audits).
- OWASP API Security Top 10 (BOLA, broken property-level and function-level authorization,
  misconfiguration, and so on), applied to the Supabase REST, RPC and Storage surface.

## 7. Who does what

| Agent | Model | Job |
|---|---|---|
| Orchestrator | Fable 5.2 | Scope, delegation, tracking, de-duplication, final reports. Accepts a finding only with evidence. |
| Security architect | Opus 5.5 | Threat model, review of critical and high findings, review of the fix plan. |
| Database architect | `tvicams-db-architect` definition (Opus) | Schema, RLS, grants, functions, storage policies, migration safety. |
| Micro-auditors | Haiku 5.5 | One narrow question each, with file and line evidence. |
| Implementation engineer | Sonnet 5.5 | Approved fixes and regression tests only (Phase 6). |

Note on the database agent: the audit request names it `database-design-database-architect`.
No file or branch with that name exists on the Mac checkout. The matching agent there is the
uncommitted file `.claude/agents/tvicams-db-architect.md`. Its definition was loaded unchanged
and used as that agent's instructions. It was not recreated.

## 8. Rules of engagement

- Read-only inspection of the repository until a fix plan is approved.
- No SQL, migration, or branch operation against the live Supabase project.
- No secrets or credentials in any report.
- No destructive operations. No testing against deployed URLs.
- Human approval before any fix is written, and again before any migration is applied.
- A finding is called "fixed" only with verification evidence.

## 9. Deliverables

`SECURITY_SCOPE.md` (this file), `THREAT_MODEL.md`, `SECURITY_AUDIT_PLAN.md`, `FINDINGS.md`,
`REMEDIATION_PLAN.md`, `VERIFICATION_REPORT.md`. All in `docs/security/`.
