# Security Audit Plan

How the audit is run, who checks what, and where it stands.
Hypothesis IDs (T-01 and so on) come from `THREAT_MODEL.md`.

## Phases

| Phase | What | Who | Status |
|---|---|---|---|
| 1 | Repository discovery, scope | Orchestrator (Fable) | Done |
| 2 | Threat model | Security architect (Opus) | Done, see authorship note in `THREAT_MODEL.md` |
| 3 | Parallel micro-audits | 9 Haiku lanes + database architect | Done |
| 4 | Consolidate findings, review critical and high | Orchestrator + Opus | Done |
| 5 | Remediation plan, reviewed | Orchestrator + Opus | Done, **waiting for human approval** |
| 6 | Implement approved fixes and regression tests | Sonnet | Not started |
| 7 | Independent verification | Haiku, automated tools, Opus for open high risks | Not started |
| 8 | Final assessment | Orchestrator | Not started |

## Phase 3 lanes

Every lane was read-only, had one scope, and had to give file and line evidence. No lane was
allowed to rely on another lane's conclusion.

| Lane | Agent | OWASP focus | Scope | Hypotheses |
|---|---|---|---|---|
| DB | Database architect (Opus) | A01, A04, A05, API1/3/5 | All migrations: RLS policies, grants, functions, storage policies, cascades, drift | T-01 to T-03, T-05 to T-13, T-23 |
| H1 | Haiku | A07, A01 | Route gating, role resolution, preview overrides, sign-up, redirects | T-13, T-14, T-17 |
| H2 | Haiku | A08, A07 | Clerk webhook, provisioning, invitations, service-role client | T-04, T-15, T-16 |
| H3 | Haiku | A01, A04, API5 | Every server-side write path and id-based read | T-15 |
| H4 | Haiku | A03 | SQL, PostgREST filter, XSS, CSV and XLSX injection, redirects, paths | T-22 |
| H5 | Haiku | A02, A05 | Committed secrets, env vars, headers, Supabase config, debug surfaces, MCP config | T-12, T-17, T-18, T-20, T-21 |
| H6 | Haiku | A06, A08 | Dependencies, lockfile, GitHub workflows, hooks | T-19 |
| H7 | Haiku | A09, exceptional conditions | Activity log, server logging, fail-open checks, swallowed errors, limits | T-09 |
| H8 | Haiku | A01, API3 | What data reaches the browser for trainers and viewers | T-05, T-14 |
| H9 | Haiku | A01, A04, A05 | Evidence upload and download, storage keys, CSV upload | T-06 |

## Acceptance rule for findings

A lane's item becomes a finding in `FINDINGS.md` only when:

1. It cites a file and line that the orchestrator re-opened and read.
2. For critical and high items, the security architect (Opus) reviewed it.
3. It is labelled as one of: **Confirmed** (the code or SQL shows it), **Potential**
   (depends on something not visible in the repo, such as hosted settings or live policies),
   or **Informational**.

Conflicts between lanes are settled by re-reading the code, not by vote.

## What cannot be checked from the repository

These need the owner to look in a dashboard or run a read-only catalog query:

- Hosted Supabase auth settings (native sign-up, email confirmation, third-party auth).
- Live RLS policies, grants and functions (the repo and the live project have drifted before).
- Storage bucket settings on the hosted project.
- GitHub branch protection, CODEOWNERS enforcement, secret scanning.
- Clerk instance settings (sign-up mode, session lifetime, allowed email domains).
- Deployed HTTP response headers.

## Phase 7 verification approach (planned)

- Database fixes: tests against a **local** Supabase stack (`supabase start`), one test per
  finding, run as each role. Never against the hosted project.
- App fixes: Vitest unit tests, `pnpm lint`, `pnpm exec tsc --noEmit`.
- A Haiku agent that did not write the fix compares each diff with its finding.
- `pnpm audit` and a secret scan as automated evidence.
