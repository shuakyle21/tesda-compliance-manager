# Product Overview

TVI-CAMS (TESDA Document and Compliance Manager) is an **internal, multi-tenant compliance and document-tracking tool** for TVI schools and farm schools running TESDA scholarship training batches — initially **TWSP** and **CFSP**. It gives a small (~5-user) operations team one role-scoped view of batch lifecycle status, missing evidence, training progress, LAMR evidence, audit history, and billing readiness.

## The official-systems boundary (load-bearing)

The app is an **internal working layer only**. TESDA SIS, T2MIS, and BSRS remain the authoritative systems for official records, reports, schedules, attendance, ULI, and billing approval. UI copy must never imply official approval or submission — use language like "internal", "preparation", "working copy". The app *generates* billing documents (see [[Billing Engine]]) but never transmits them to TESDA.

## Initial tenants

| Code | School | Region |
| --- | --- | --- |
| AKB | AKB Technical Vocational Inc. | IV-A, Laguna |
| J3ED | J3ED Farm School | IV-A, Quezon |
| NEN | Nenita Farm Rice-Based School | III, Nueva Ecija |

## Goals (from the PRD)

- **G1** Compliance visibility — one role-scoped dashboard of lifecycle, readiness, urgency
- **G2** Reduce missing-evidence risk — exact required documents per program/batch
- **G3** Protect tenant and role boundaries — Clerk + Supabase RLS ([[Auth And Tenancy]])
- **G4** Trainer updates without overexposure — no billing/financial fields for trainers ([[Roles And Permissions]])
- **G5** Prepare internal billing packages — now a full [[Billing Engine]] per ADR-001
- **G6** Traceability — goals map to screens, APIs, entities, and tests ([[Testing Strategy]])

## Out of scope for first ship

No direct SIS/T2MIS/BSRS integration, no official submission workflow, no email automation or cron ([[Alerts]] are computed on read), no advanced analytics, no OCR (deferred, not excluded), no PWA/offline, no Super Admin role.

## Related

- [[Batch Lifecycle]] — the core object the tool tracks
- [[Roles And Permissions]] — who sees what
- [[Docs Precedence]] — where these facts come from

Sources: [[MASTER_PRD_SRS]] §1–2 · [[MVP_PRD]] §1–4 · [[ADR-001-billing-and-domain-model]] §12
