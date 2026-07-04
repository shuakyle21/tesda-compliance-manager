# Wiki Home

Distilled knowledge base for TVI-CAMS, built entirely from `docs/`. Each note is one topic; follow the links or open Obsidian's graph view. Raw source documents are linked at the bottom of every note — the wiki summarizes, the docs decide.

> **Precedence rule:** [[MASTER_PRD_SRS]] is the product source of truth, but [[ADR-001-billing-and-domain-model]] supersedes any conflicting "billing = preparation signal" wording. See [[Docs Precedence]].

## Product — what and why

- [[Product Overview]] — what the tool is, the official-systems boundary, tenants, goals
- [[Roles And Permissions]] — Admin, Coordinator, Trainer, Viewer and what each may do
- [[Batch Lifecycle]] — AOU → NTP → TIP → Training → Assessment → Billing
- [[Attendance And Progress]] — attendance-derived progress and the 5-absence eligibility rule
- [[Billing Engine]] — the document-generating engine (TSF/Allowance, Training Cost, Entrepreneurship)
- [[RQM And NTP Authorization]] — one RQM code = one batch; NTP lag deadline
- [[Document Checklist And Evidence]] — required documents, statuses, verification, storage
- [[LAMR Evidence]] — structured Learners Achievement Monitoring Report
- [[Learner Identity And Import]] — ULI as permanent key; the import wizard
- [[Alerts]] — computed on read, no cron, no email

## Engineering — how

- [[Architecture Overview]] — single Next.js app → Supabase, Clerk identity, Laravel future-only
- [[Auth And Tenancy]] — Clerk→Supabase JWT bridge, RLS helpers, tenant-in-URL
- [[Data Layer Pattern]] — fetch → map → derive; the two type families; DTO rules
- [[Database Schema]] — implemented tables, enums, and the ADR-001 additions
- [[Implementation Roadmap]] — Phase 0 foundation → Phase 4B billing → Phase 5 QA
- [[Testing Strategy]] — unit mappers, real-Supabase integration, test matrix T-001..T-030

## Design and UX

- [[Design System Rules]] — no emoji, IBM Plex, semantic tokens, mandatory screen states
- [[Modals And Drawers]] — the modal interaction contract and audit findings

## Process

- [[Project Process]] — git/Linear workflow, GitHub Projects setup, priority order
- [[Docs Precedence]] — which document wins when sources conflict

## Source documents

[[MASTER_PRD_SRS]] · [[TRD]] · [[IMPLEMENTATION_PLAN]] · [[MVP_PRD]] · [[ADR-001-billing-and-domain-model]] · [[SUPABASE_SCHEMA_GUIDE]] · [[UI_UX_MODAL_AUDIT]] · [[API_MERMAID_DIAGRAMS]] · [[TVI_CAMS_REGENERATED_REQUIREMENTS_2026-06-19]] · [[GIT_PROCESS_REPORT]] · [[GITHUB_PROJECTS_INTEGRATION]] · [[GITHUB_PROJECT_BACKLOG]] · [[Priority PLAN]]

Related: [[TVI-CAMS Knowledge Base]]
