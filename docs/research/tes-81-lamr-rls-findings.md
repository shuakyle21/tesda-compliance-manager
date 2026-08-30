# TES-81: Does RLS on the LAMR tables enforce the PRD access matrix?

**Question:** Does RLS on the four LAMR tables (`lamr_reports`, `lamr_outcomes`, `lamr_activities`, `lamr_entries`) enforce the access matrix in `docs/MASTER_PRD_SRS.md` (lines 1026-1027)?

## PRD source (docs/MASTER_PRD_SRS.md, lines 1012-1027)

Exact matrix rows (lines 1026-1027):

```
| View LAMR | Future | Yes | Yes | Assigned batch | Yes if granted |
| Edit LAMR | Future | Yes | Yes | Assigned batch | No |
```

Columns are: Super Admin | Admin | Coordinator | Trainer | Viewer.

Line 1038 (RBAC Inconsistencies) confirms the canonical linkage: "Trainer assignment is modeled through `batches.trainer_profile_id`; earlier docs mention `assigned_batch_ids`, which is not canonical in the migration."

## Primary source: `supabase/migrations/20260528160300_create_tenant_scoped_schema.sql`

CLAUDE.md declares this migration canonical for schema + RLS. The `supabase/migrations/` directory was enumerated and contains two later migrations: `20260705070510_add_trainer_credentials.sql` (adds an unrelated `trainer_credentials` table, no LAMR references) and `20260717054607_migrate_akb_tenant_and_drop_rogue_table.sql` (a corrective data migration reconciling an out-of-band `public.tenant` table into `public.tenants`, also no LAMR references). Neither later migration touches `lamr_reports`, `lamr_outcomes`, `lamr_activities`, `lamr_entries`, or their policies, so the 20260528160300 migration's LAMR policies are confirmed current and unaltered.

### Relevant helper functions (`app_private` schema, lines 353-445)

```sql
create or replace function app_private.current_profile_id() ...  -- line 353
create or replace function app_private.current_role() ...        -- line 367
create or replace function app_private.can_access_tenant(target_tenant_id uuid) ...  -- line 380
create or replace function app_private.can_manage_tenant(target_tenant_id uuid)
returns boolean ... as $$
  select app_private.current_role() in ('admin', 'coordinator')
    and app_private.can_access_tenant(target_tenant_id);
$$;                                                                -- lines 397-406

create or replace function app_private.can_read_batch(target_batch_id uuid)
returns boolean ... as $$
  select exists (
    select 1
    from public.batches b
    where b.id = target_batch_id
      and app_private.can_access_tenant(b.tenant_id)
      and (
        app_private.current_role() in ('admin', 'coordinator', 'viewer')
        or (
          app_private.current_role() = 'trainer'
          and b.trainer_profile_id = app_private.current_profile_id()
        )
      )
  );
$$;                                                                -- lines 408-428

create or replace function app_private.can_trainer_write_batch(target_batch_id uuid)
returns boolean ... as $$
  select exists (
    select 1
    from public.batches b
    where b.id = target_batch_id
      and b.trainer_profile_id = app_private.current_profile_id()
      and app_private.current_role() = 'trainer'
      and app_private.can_access_tenant(b.tenant_id)
  );
$$;                                                                -- lines 430-445
```

`can_trainer_write_batch` is the write-scoping gate: it requires `b.trainer_profile_id = app_private.current_profile_id()` on the actual `batches` row — i.e. it is scoped to the trainer's assigned batch, not role-only.

`batches.trainer_profile_id` is defined at line 139 (`references public.profiles(id) on delete set null`), confirming the linkage the PRD's line 1038 refers to.

RLS is enabled on all four LAMR tables (lines 460-463):
```sql
alter table public.lamr_reports enable row level security;
alter table public.lamr_outcomes enable row level security;
alter table public.lamr_activities enable row level security;
alter table public.lamr_entries enable row level security;
```

### `lamr_reports` (table def lines 193-209; policies lines 621-638)

```sql
create policy "Tenant users can read scoped LAMR reports"
on public.lamr_reports
for select
to authenticated
using (app_private.can_read_batch(batch_id));

create policy "Admins coordinators and assigned trainers can manage LAMR reports"
on public.lamr_reports
for all
to authenticated
using (
  app_private.can_manage_tenant(tenant_id)
  or app_private.can_trainer_write_batch(batch_id)
)
with check (
  app_private.can_manage_tenant(tenant_id)
  or app_private.can_trainer_write_batch(batch_id)
);
```

**Verdict:** Trainer write IS scoped to the assigned batch — both `using` and `with check` route through `can_trainer_write_batch(batch_id)`, which requires `batches.trainer_profile_id = current_profile_id()`. Viewer cannot write: the `for all` policy only admits `can_manage_tenant` (admin/coordinator) or `can_trainer_write_batch` (trainer-on-own-batch); viewer role satisfies neither branch. Matches PRD Edit LAMR row exactly.

Viewer read: `can_read_batch` grants read to role `viewer` unconditionally (subject only to `can_access_tenant`, i.e. tenant membership) — there is no batch-assignment check and no separate grant/permission gate for viewer.

**Secondary note (tenant-integrity, not part of verdict (a)/(b)):** the `lamr_reports` `with check` (`can_manage_tenant(tenant_id) or can_trainer_write_batch(batch_id)`) never pins `tenant_id` to `batches.tenant_id` for the given `batch_id`. A trainer satisfying `can_trainer_write_batch(batch_id)` could in principle write an arbitrary `tenant_id` value into the row — `can_trainer_write_batch` only validates the batch, not that the submitted `tenant_id` matches it. This does not widen which *batches* a trainer can write to (verdict (a) is unaffected — the batch-ownership check still holds), but it is a tenant-column integrity gap in this specific policy block worth flagging, especially since the three child tables (`lamr_outcomes`/`lamr_activities`/`lamr_entries`) all explicitly pin `r.tenant_id = <child>.tenant_id` in their `with check` and `lamr_reports` does not have the equivalent `tenant_id = (select tenant_id from batches where id = batch_id)` pin.

### `lamr_outcomes` (table def lines 211-222; policies lines 640-676)

```sql
create policy "Tenant users can read scoped LAMR outcomes"
on public.lamr_outcomes
for select
to authenticated
using (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_outcomes.lamr_report_id
      and app_private.can_read_batch(r.batch_id)
  )
);

create policy "Admins coordinators and assigned trainers can manage LAMR outcomes"
on public.lamr_outcomes
for all
to authenticated
using (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_outcomes.lamr_report_id
      and (
        app_private.can_manage_tenant(r.tenant_id)
        or app_private.can_trainer_write_batch(r.batch_id)
      )
  )
)
with check (
  exists (
    select 1 from public.lamr_reports r
    where r.id = lamr_outcomes.lamr_report_id
      and r.tenant_id = lamr_outcomes.tenant_id
      and (
        app_private.can_manage_tenant(r.tenant_id)
        or app_private.can_trainer_write_batch(r.batch_id)
      )
  )
);
```

**Verdict:** Same shape as `lamr_reports`. The policy walks the join `lamr_outcomes -> lamr_reports (r) -> r.batch_id` and re-checks `can_trainer_write_batch(r.batch_id)` in both `using` and `with check`, so trainer write is correctly scoped to their assigned batch through the parent report's batch, not role-only. The `with check` additionally pins `r.tenant_id = lamr_outcomes.tenant_id`, preventing a trainer from re-parenting a row to a report belonging to a different tenant (cross-tenant), and re-validates `can_trainer_write_batch(r.batch_id)` against whatever `lamr_report_id`/batch is being written, so a trainer cannot re-parent a row onto a report tied to a batch they don't own either. Viewer cannot write (same reasoning as `lamr_reports`).

### `lamr_activities` (table def lines 224-235; policies lines 678-714)

Structurally identical to `lamr_outcomes`, joining through `lamr_reports r` on `lamr_activities.lamr_report_id`:

```sql
create policy "Tenant users can read scoped LAMR activities" ... using (
  exists (select 1 from public.lamr_reports r
    where r.id = lamr_activities.lamr_report_id
      and app_private.can_read_batch(r.batch_id))
);

create policy "Admins coordinators and assigned trainers can manage LAMR activities"
... using (
  exists (select 1 from public.lamr_reports r
    where r.id = lamr_activities.lamr_report_id
      and (app_private.can_manage_tenant(r.tenant_id)
           or app_private.can_trainer_write_batch(r.batch_id)))
)
with check (
  exists (select 1 from public.lamr_reports r
    where r.id = lamr_activities.lamr_report_id
      and r.tenant_id = lamr_activities.tenant_id
      and (app_private.can_manage_tenant(r.tenant_id)
           or app_private.can_trainer_write_batch(r.batch_id)))
);
```

**Verdict:** Same as `lamr_outcomes` — trainer write correctly scoped to assigned batch via the parent report's `batch_id`; viewer cannot write.

### `lamr_entries` (table def lines 237-251; policies lines 716-752)

Structurally identical again, joining on `lamr_entries.lamr_report_id`:

```sql
create policy "Tenant users can read scoped LAMR entries" ... using (
  exists (select 1 from public.lamr_reports r
    where r.id = lamr_entries.lamr_report_id
      and app_private.can_read_batch(r.batch_id))
);

create policy "Admins coordinators and assigned trainers can manage LAMR entries"
... using (
  exists (select 1 from public.lamr_reports r
    where r.id = lamr_entries.lamr_report_id
      and (app_private.can_manage_tenant(r.tenant_id)
           or app_private.can_trainer_write_batch(r.batch_id)))
)
with check (
  exists (select 1 from public.lamr_reports r
    where r.id = lamr_entries.lamr_report_id
      and r.tenant_id = lamr_entries.tenant_id
      and (app_private.can_manage_tenant(r.tenant_id)
           or app_private.can_trainer_write_batch(r.batch_id)))
);
```

**Verdict:** Same as `lamr_outcomes`/`lamr_activities` — trainer write correctly scoped to assigned batch; viewer cannot write.

## Answers to the three verification questions

**(a) Is trainer write scoped only to assigned batches across all 4 tables, not tenant-wide?**

**Fully enforced, no gap.** All four `for all` policies gate trainer access through `app_private.can_trainer_write_batch(batch_id)` (directly on `lamr_reports`, or via a join to `lamr_reports.batch_id` for the three child tables). That function's body (lines 430-445) explicitly requires `b.trainer_profile_id = app_private.current_profile_id()` against the real `batches` row — it is not a role-only check. A trainer assigned to Batch A cannot write LAMR rows belonging to Batch B; the `exists` subquery would find no matching report/batch and both `using` and `with check` would fail. Every child table's `with check` also re-validates `r.tenant_id = <child>.tenant_id`, closing the row-reparenting angle (a trainer can't move a row onto a report from a batch/tenant they don't own).

**(b) Can Viewer write? (should be no)**

**Fully enforced, no gap.** Every `for all` (write) policy on all four tables is `can_manage_tenant(tenant_id) or can_trainer_write_batch(...)`. `can_manage_tenant` restricts to roles `admin`/`coordinator` (line 404); `can_trainer_write_batch` restricts to role `trainer` with an owned batch (line 442). Viewer role satisfies neither disjunct on any of the four tables, so Viewer has no INSERT/UPDATE/DELETE path. Matches PRD "Edit LAMR ... Viewer: No" exactly.

**(c) Is Viewer read appropriately gated ("yes if granted")?**

**Gap — not modeled.** `can_read_batch` (lines 408-428) admits role `viewer` in the same branch as `admin`/`coordinator`, subject only to `can_access_tenant` (tenant membership) — there is no batch-level assignment check for viewer (unlike trainer) and no conditional "granted" gate. The migration defines no grants/permission table anywhere (the full list of tables created is: `tenants`, `profiles`, `profile_tenant_memberships`, `scholarship_programs`, `program_document_requirements`, `program_billing_rules`, `batches`, `learners`, `documents`, `lamr_reports`, `lamr_outcomes`, `lamr_activities`, `lamr_entries`, `activity_log`, plus the later `trainer_credentials` — none represents a per-viewer or per-batch grant). So today, any Viewer with tenant membership can read LAMR data for every batch in that tenant, not gated behind a "granted" flag and not even batch-scoped the way Trainer read is. This is a real gap relative to the PRD's "Yes if granted" qualifier — the PRD anticipates a conditional/opt-in read for Viewer, and the migration currently implements unconditional tenant-wide read instead. (Note for comparison: `documents` table read policy, lines 577-588, does add an `audience in ('trainer', 'all')` gate for the trainer branch, but still has no analogous per-viewer grant gate either — so this is a pattern across the schema, not unique to LAMR.)

Worth noting: the PRD itself flags this area as unresolved, not just unimplemented. Lines ~1035-1041 are headed "RBAC Inconsistencies," and line 1039 explicitly says Viewer activity-log/grant scope "differs by source" across the PRD's own inputs and proposes a resolution ("hide global Activity Log for Viewer by default, allow batch-scoped activity inside read-only detail if approved"). So the "Yes if granted" qualifier on View LAMR reads less like a settled spec the migration failed to implement, and more like an open design question the PRD authors hadn't yet resolved into a concrete grant mechanism when the schema was written — there was no settled mechanism to build against. Either way, the schema currently has zero representation of a viewer-grant concept, so the gap stands; it just changes what kind of follow-up ticket is appropriate (design the grant mechanism, not "fix a missed implementation").

## Summary

| Check | Verdict |
| --- | --- |
| Trainer write scoped to assigned batch (all 4 LAMR tables) | Fully enforced |
| Viewer cannot write (all 4 LAMR tables) | Fully enforced |
| Viewer read gated behind "if granted" | Gap — no grant mechanism exists; viewer read is unconditional tenant-wide, not batch-scoped and not opt-in |

**Overall:** The PRD's Trainer/Admin/Coordinator rows of the LAMR access matrix (lines 1026-1027) are fully and correctly enforced by RLS, including the assignment-scoped trainer write path via `batches.trainer_profile_id` → `app_private.can_trainer_write_batch`. The Viewer "yes if granted" qualifier on View LAMR is not implemented — Viewer read is currently unconditional (any tenant member with role `viewer`), which is broader than the PRD's conditional wording and worth a follow-up ticket if precise viewer gating is required.
