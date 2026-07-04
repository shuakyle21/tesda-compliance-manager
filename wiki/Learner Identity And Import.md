# Learner Identity And Import

ADR-001 decisions Q1, R2, S1, T2.

## ULI is the permanent key (Q1)

The **ULI** (a national TESDA identifier) is the permanent primary key on every learner row. Uniqueness is **by value, not by shared row** — the same person at two schools is two tenant-scoped rows with the same ULI. TESDA's systems remain the authoritative lifetime record; the app does **no cross-TVET tracking**. A thin global `learner_identities(uli, full_name)` dimension exists as a **future seam only** — created empty, not populated in MVP.

## Import wizard: parse → enrich → commit (S1)

A CSV import carries **batch metadata + learner roster in one file** (raw-T2MIS-export shape), committed atomically (R2). The **enrich** step supplies what the CSV can't:

- confirm program/qualification
- set `schedule_pattern`
- auto-fill `total_sessions` and the cost-row snapshot from the program ([[Attendance And Progress]] E2, [[Billing Engine]] BB1)
- capture the RQM/NTP authorization ([[RQM And NTP Authorization]])

Validation and dedup live on this screen; imports never mix unauthorized tenants and are internal working data only.

## Re-import is an additive merge (T2)

Re-importing an existing `batch_code` is an **additive merge with mandatory preview**, deduped by ULI: new ULIs inserted, existing skipped, **nothing ever deleted** — protecting attendance and document history.

## Export

Admin/Coordinator can export current filtered batch/document readiness data as CSV, respecting tenant and role scope. A specialized T2MIS/BSRS import overlay (with source-specific column mapping) reuses the same validate → preview → commit pipeline.

## Related

- [[Roles And Permissions]] — import/export is Admin/Coordinator only
- [[Implementation Roadmap]] — Phase 4.1/4.4
- [[Database Schema]]

Sources: [[ADR-001-billing-and-domain-model]] §8 · [[MASTER_PRD_SRS]] FR-10 · [[MVP_PRD]] §7.8
