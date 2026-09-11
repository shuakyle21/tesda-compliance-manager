# Files

- [Supabase Data Model and RLS Policies](data-model-and-rls.md)
- [Design System and UI Invariants](design-system.md) - Non-negotiable UI rules of the Training Compliance System: the CSS token layer, semantic color and urgency tiers, no-emoji Tabler iconography, text+icon status rule, the mandatory screen states and their snapshot-driven derivation, component layering, copy rules, and the do-not-edit design handoff directories.
- [Module Boundaries and the Data Layer Pattern](module-boundaries-and-data-pattern.md) - How TVI-CAMS groups code into app/, modules/<domain>/{data,domain,ui}, shared/, and lib/supabase/ — the ESLint-enforced import direction, each module's private data/ surface, the fetch → map → derive contract, the four-state snapshot union (ok / no-tenant-access / sync-failed / unconfigured) that every data-driven screen maps onto, the documents module's ADR-004 gate-versus-measurement split, and its evidence-storage write path.
