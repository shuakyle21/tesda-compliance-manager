# Project Process

How work flows through Linear, GitHub, and git for this repo.

## Linear ↔ GitHub sync

The Linear team **TESDA-CAMS** (key `TES`) two-way syncs with the GitHub repo (`shuakyle21/tesda-compliance-manager`). **Create issues on one side only** to avoid duplicate pairs. Branch names follow Linear's convention: `klynejoshua13/tes-NN-description`.

## Branching model

Linear-style feature branches → PR → `main` (default branch, unprotected). The GitHub↔Linear sync drives issue status. The [[GIT_PROCESS_REPORT]] documents a representative period (2026-06-17→23): stacked feature branches (TES-7 Supabase client, TES-40 dashboard route, TES-48 reports, TES-59 auth, TES-8 dashboard UI) landing as a coordinated multi-PR merge.

## GitHub Projects (planning layer)

[[GITHUB_PROJECTS_INTEGRATION]] recommends a "TESDA Compliance Manager MVP" project with custom fields: Status (Backlog→Done/Blocked), MVP Area (Auth & Tenant, Dashboard, Batch Lifecycle, Documents, Trainer, LAMR, Billing Prep, Import/Export, Security), Priority (P0–P2). [[GITHUB_PROJECT_BACKLOG]] holds the initial ~14 seeded issues across Foundation / Core Workflows milestones.

## Priority order (historical)

[[Priority PLAN]] captured the original P0–P3 ordering (Clerk auth and Supabase schema first; billing signal last). Note the billing item is now much bigger than "P3 signal" — ADR-001 promoted it to the [[Billing Engine]], and the [[Implementation Roadmap]] (Phase 4B) supersedes this ordering.

## Related

- [[Implementation Roadmap]] — the current dependency-ordered plan
- [[Docs Precedence]] — which planning doc wins

Sources: [[GIT_PROCESS_REPORT]] · [[GITHUB_PROJECTS_INTEGRATION]] · [[GITHUB_PROJECT_BACKLOG]] · [[Priority PLAN]]
