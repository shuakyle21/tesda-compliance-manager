# Billing Module

**FR:** FR-09 — billing document-generating engine (ADR-001)
**Path:** `modules/billing/` (`data/billing.ts`, `domain/readiness.ts`, `ui/`)
**Status:** implemented — data, domain, ui (TES-70: billing UI + statement preview)

Not a "preparation signal" — a **document engine** producing populated `.docx` (TSF/Allowance, Training Cost, Entrepreneurship; Assessment Fee out of scope). `domain/readiness.ts` computes the readiness gate. Per ADR-001, which supersedes any conflicting docs wording.

**Concept:** [[Billing Engine]]

[[Codebase Map]]
