# Roles And Permissions

Four roles exist in the schema (`profile_role` enum): **admin, coordinator, trainer, viewer**. Super Admin is requested but *not implemented* — do not assume it in production behavior.

| Role | Scope | Core access |
| --- | --- | --- |
| **Admin** | One school | Full write inside assigned school; reviews readiness, verifies documents, manages settings/members |
| **Coordinator** | One or more schools | Primary compliance operator: create/import batches, track lifecycle, chase evidence, verify, export |
| **Trainer** | Assigned batches only | Mark attendance/progress, upload trainer-side evidence, maintain LAMR. **Never sees billing** |
| **Viewer** | Assigned schools | Read-only review (internal audit / external reviewer). Server-denied on all writes |

## Load-bearing rules

- **RLS is the security boundary; UI hiding is usability only.** Every authorization decision is made in Postgres via the `app_private.*` helper functions ([[Auth And Tenancy]]).
- **Trainer DTOs must omit** billing deadline, billing preparation, NTP lag, BSRS, and financial fields **server-side** — not CSS-hidden ([[Data Layer Pattern]]).
- **Viewer writes are always blocked**, both hidden in the UI and denied by RLS.
- Trainers are scoped to batches via the `batch_trainer_assignments` join (ADR-001 M2), which supports co-trainers and trainers across schools; trainer routes address by batch, not tenant.
- Membership is plural and persistent (`profile_tenant_memberships`); the *active* tenant context is singular and lives in the URL path ([[Auth And Tenancy]]).

## Navigation per role

- Admin/Coordinator: Dashboard, Batch Cards, Table View, Documents, Analytics, Activity Log (+ Settings for Admin, Reports for Coordinator)
- Trainer: Dashboard, My Classes only — a focused, mobile-first shell
- Viewer: same read surfaces, Activity Log hidden unless explicitly granted

The full capability-by-role matrix is in [[MASTER_PRD_SRS]] §8; billing visibility rules in [[Billing Engine]].

## Related

- [[Auth And Tenancy]] — how the roles are enforced
- [[Alerts]] — alert scoping inherits these rules
- [[Product Overview]]

Sources: [[MASTER_PRD_SRS]] §3, §8 · [[MVP_PRD]] §5 · [[TRD]] §3 · [[ADR-001-billing-and-domain-model]] §7
