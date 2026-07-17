# Implementation Roadmap

The build plan is **phased and dependency-ordered** — phases are sequential, items within a phase may parallelize. Effort tags: S ≤0.5d · M 1–2d · L 3–5d · XL 1–2wk.

## Phases

| Phase | Goal | Key items |
| --- | --- | --- |
| **0 — Foundation** (blocks everything) | Make real data, types, and tests possible | 0.1 ADR-001 schema migration ([[Database Schema]]) · 0.2 regenerate DB types · 0.3 complete `modules/<domain>/data/*` contracts ([[Data Layer Pattern]]) · 0.4 test harness ([[Testing Strategy]]) · 0.5 tenant-role resolver + storage path/signed-URL helpers |
| **1 — `/dashboard`** (the audit's #1 P0 gap) | Real, role-correct, Supabase-wired landing page | Wire off `MOCK_BATCHES`; complete role variants; real state signals; remove `?role=`/`?state=` overrides |
| **2 — Batch + Documents** | The core compliance loop | Batch detail modal · document matrix + upload ([[Document Checklist And Evidence]]) · [[LAMR Evidence]] UI · lifecycle transitions with validation |
| **3 — Trainer views** | Mobile-first trainer workflow, no financial exposure | My Classes · attendance form → `attendance_records` · trainer evidence upload |
| **4 — Admin/Coordinator** | Operational tooling | CSV import wizard + export ([[Learner Identity And Import]]) · notifications drawer ([[Alerts]]) · settings modal · T2MIS/BSRS overlay |
| **4B — Billing Engine** | ADR-001's build plan | Pure domain logic (`modules/billing/domain/*`) · cost snapshot + RQM on creation · readiness + tranche gating + alerts — UI, domain rules, and statement preview **shipped** (TES-70); `.docx` generation + append-only `billing_records` log remain ([[Billing Engine]]) |
| **5 — Quality & Handoff** | Production readiness | Figma-route parity · WCAG 2.2 AA pass ([[Design System Rules]]) · full T-001..T-030 suite · production readiness checklist |

## Dependency spine

```text
0.1 schema → 0.2 types → 0.3 contracts → 0.4 tests / 0.5 resolver
  → Phase 1 (/dashboard) → Phase 2 (batch+docs) → Phases 3/4 (can overlap)
  → Phase 4B (needs 3.2 attendance + 2.2 docs + 4.1/4.3) → Phase 5 gates release
```

## Exit gates (abridged)

- **Phase 0:** contracts compile and pass unit + real-Supabase tests; role/tenant resolves from the session; attendance schema exists.
- **Phase 1:** dashboard serves real, tenant-scoped data with full states.
- **Phase 3:** a trainer completes a daily update in under 2 minutes, seeing no billing data.
- **Phase 4B:** a coordinator generates a regulation-correct billing document (worked CFSP example = ₱137,000) with readiness gated on verified docs.
- **Phase 5:** Figma parity, WCAG AA, green suite, signed readiness checklist.

## Related

- [[Project Process]] — how the work flows through Linear/GitHub
- [[Docs Precedence]] — this plan executes the [[TRD]]

Sources: [[IMPLEMENTATION_PLAN]] · [[TRD]] §15 · [[Priority PLAN]] (early priority order, superseded by this plan)
