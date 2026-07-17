# Docs Precedence

Which document wins when sources conflict.

## The hierarchy

1. **[[MASTER_PRD_SRS]]** — consolidated product source of truth (goals, FR-01..FR-15, permission matrix, screen inventory, test matrix T-001..T-030).
2. **[[ADR-001-billing-and-domain-model]]** — *supersedes* any conflicting "billing = preparation signal only" wording in the PRD and [[MVP_PRD]]. It promotes billing to a document-generating engine ([[Billing Engine]]) and locks ~43 domain decisions with stable IDs (B2, V2, K1, Q1, …).
3. **[[TRD]]** — the engineering companion: *how* and *why for the system*. §4.3a and §16 implement ADR-001.
4. **[[IMPLEMENTATION_PLAN]]** — the phased, dependency-ordered build plan ([[Implementation Roadmap]]).

## Source-register precedence inside the PRD

When the PRD itself consolidates conflicting sources: live Figma (UI structure) → current repository code (shipped state) → Supabase migration (DB/RLS behavior) → repo docs (approved direction) → the legacy PDF (portfolio-level only).

## Key resolved conflicts

- **Future backend:** README says "no Laravel assumptions"; older route/API docs proposed a Laravel API ([[API_MERMAID_DIAGRAMS]]). Resolution: MVP is Next.js + Clerk + Supabase; a dedicated backend is **future-only** — and as of 2026-07-06 the recommended one is **Express.js** (Node/TS), superseding Laravel ([[TRD]] §1.3, [[Architecture Overview]]).
- **Billing scope:** passive signal (original FR-09) vs. document generation. Resolution: **ADR-001 wins** — generation is in scope; Assessment Fee billing and official submission are not.
- **Tenant access shape:** `tenant_ids` arrays in older docs vs. the `profile_tenant_memberships` table in the migration. The **membership table is canonical**.
- **RQM:** diagrams mention a `program_rqm` table; ADR-001 resolves RQM as an **NTP authorization on the batch** ([[RQM And NTP Authorization]]), not a table.

## Superseded / historical docs

[[TVI_CAMS_REGENERATED_REQUIREMENTS_2026-06-19]] is an earlier regenerated snapshot; [[SUPABASE_SCHEMA_GUIDE]] predates the migration (it still shows `tenant_ids` arrays) and is a design walkthrough, not the canonical schema ([[Database Schema]]). [[Priority PLAN]] and [[GITHUB_PROJECT_BACKLOG]] are early planning artifacts superseded by the [[Implementation Roadmap]].

## Related

- [[Wiki Home]]

Sources: [[MASTER_PRD_SRS]] "Source Register and Precedence" · [[TRD]] "Document Purpose" · [[ADR-001-billing-and-domain-model]]
