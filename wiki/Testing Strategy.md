# Testing Strategy

**There is no test runner yet** — `npm test` is a placeholder. Standing up the harness is Phase 0.4 of the [[Implementation Roadmap]] and blocks trustworthy feature work.

## Three levels

| Level | Scope | Rule |
| --- | --- | --- |
| **Unit** | Pure mappers + derive helpers (`mapBatchRow`), date/progress/urgency engine, billing math (`lib/domain/*`) | Use **fixed as-of dates**; no I/O. The fetch/map split exists specifically to make this trivial ([[Data Layer Pattern]]) |
| **Integration** | Data contracts against **real Supabase — no mocks**: RLS scoping, tenant isolation, trainer field omission, writes + activity logging | Seeded tenants (AKB/J3ED/NEN) with per-role JWTs |
| **E2E** | Role journeys: unauthenticated redirect, cross-tenant denial, trainer unassigned-batch denial, viewer write-block, upload flow, modal focus trap | Maps to the PRD test matrix **T-001..T-030** |

## Anchor test cases

- T-003/T-005: Admin cross-tenant read and Trainer unassigned-batch access are denied by RLS ([[Auth And Tenancy]])
- T-010/T-011: 6 days → Critical, 7–21 days → Warning ([[Attendance And Progress]])
- T-020/T-021: billing signal visible to Admin/Coordinator, hidden from Trainer ([[Billing Engine]])
- 4B.1 acceptance: worked CFSP example reproduces **₱137,000 exactly**

## Security test suite

Cross-tenant read/write denial · trainer cannot read admin/coordinator-only document audiences · viewer cannot mutate · Storage blocks cross-tenant file access even with a guessed path · **service-role key absent from the browser bundle** · raw DB errors never surfaced.

## Success metrics tied to tests

Tenant isolation must be **100% scoped in automated tests** (PRD success metric); the activity log must record 100% of batch/document/trainer/LAMR/import/export/verification events.

## Related

- [[Data Layer Pattern]] — why mappers are pure
- [[Roles And Permissions]] — the rules under test

Sources: [[TRD]] §12 · [[MASTER_PRD_SRS]] §15 · [[IMPLEMENTATION_PLAN]] Phase 0.4, 5.3
