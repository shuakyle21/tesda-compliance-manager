# TVI-CAMS Knowledge Base

Map of content for every markdown document in this repo. The repo itself is the Obsidian vault — open the graph view to see how these connect. Follow a cluster top-to-bottom for a guided reading order.

## Wiki (distilled topic notes)

[[Wiki Home]] is the entry point to `wiki/` — ~20 short, interlinked topic notes distilled from `docs/` (one concept per note: [[Billing Engine]], [[Auth And Tenancy]], [[Batch Lifecycle]], [[Data Layer Pattern]], …). Read the wiki for orientation; follow its source links into the raw docs below for authority.

## Start Here

- [[README]] — what the tool is, official-systems boundary, roles, initial tenants
- [[CLAUDE]] — agent operating guide: commands, architecture invariants, doc precedence, design rules
- [[ARCHITECTURE]] — system architecture overview
- [[DESIGN]] — design language reference
- [[TODO]] — running task notes

## Product (what and why)

Precedence: [[MASTER_PRD_SRS]] is the consolidated source of truth, but [[ADR-001-billing-and-domain-model]] supersedes any conflicting "billing = preparation signal" wording.

- [[MASTER_PRD_SRS]] — consolidated PRD/SRS: goals, FR-01..FR-15, permission matrix, test matrix T-001..T-030
- [[MVP_PRD]] — MVP scope: workflows, revised non-goals (§4.1), billing engine (§7.7)
- [[TVI_CAMS_REGENERATED_REQUIREMENTS_2026-06-19]] — regenerated requirements snapshot
- [[Priority PLAN]] — prioritization notes

## Engineering (how)

- [[TRD]] — technical requirements: auth chain, RLS model, data architecture, §16 billing engine
- [[IMPLEMENTATION_PLAN]] — phased plan: Phase 0 foundation → Phase 4B billing engine → Phase 5 QA
- [[ADR-001-billing-and-domain-model]] — ~43 locked domain decisions: attendance-derived progress, 5-absence eligibility, TSF/Training Cost tranche rules (TESDA 7.2.x / 5.1.x), one RQM = one batch, ULI as permanent key, tenant-in-URL-path
- [[SUPABASE_SCHEMA_GUIDE]] — tables, enums, RLS helpers from the canonical migration
- [[API_MERMAID_DIAGRAMS]] — API and ER diagrams

## Design and UX

- [[UI_UX_MODAL_AUDIT]] — modal/drawer accessibility and state requirements (WCAG 2.2 AA)
- [[FIGMA-ROUTE-MAP]] — Figma frames mapped to app routes
- [[UI-IMPROVEMENTS]] — latest Figma audit findings
- [[TVI-CAMS-HANDOFF-READINESS]] — handoff readiness and component contracts

## Process

- [[GIT_PROCESS_REPORT]] — git workflow report
- [[GITHUB_PROJECTS_INTEGRATION]] — GitHub Projects setup (note: Linear team TESDA-CAMS two-way syncs with GitHub — create issues on one side only)
- [[GITHUB_PROJECT_BACKLOG]] — backlog snapshot

## Key cross-cutting facts

- RLS is the security boundary; UI hiding is usability only → [[TRD]], [[CLAUDE]]
- Trainer DTOs omit billing/NTP-lag/BSRS fields server-side → [[MASTER_PRD_SRS]], [[TRD]]
- Billing generates official documents from `.docx` templates; Assessment Fee is out of scope → [[ADR-001-billing-and-domain-model]]
- Enum bridge (`entre` UI-only, DB `blocked` → UI `pending`) lives in the mapper layer → [[TRD]], [[CLAUDE]]
- Static/handoff directories are edit-blocked by hook → [[CLAUDE]]
