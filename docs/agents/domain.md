# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the
codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.
  - `ADR-001-billing-and-domain-model.md` — but see the precedence note below.
  - `ADR-002-design-prototype-portrays-adr-001-target.md`
  - `ADR-003-billing-packet-queue.md` — amends ADR-001 §4 (packet-queue projection) while
    upholding NoLedger and JJ1.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest
creating them upfront.

## File structure (single-context)

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── ADR-001-billing-and-domain-model.md
│   ├── ADR-002-design-prototype-portrays-adr-001-target.md
│   └── ADR-003-billing-packet-queue.md
└── modules/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a
test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary
explicitly avoids.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding.
**`ADR-001-billing-and-domain-model.md` is superseded by `ADR-003-billing-packet-queue.md` on
anything touching §4** — check ADR-003 first for billing/packet-queue work before citing ADR-001.
