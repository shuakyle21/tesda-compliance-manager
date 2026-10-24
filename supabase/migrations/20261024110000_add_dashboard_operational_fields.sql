-- Dashboard operational facts.
--
-- Decision record: docs/adr/ADR-008-recorded-batch-billing-deadline.md, which
-- amends ADR-003 P5 for the batch-level deadline only (packet due dates stay
-- derived). NOT APPLIED — RULES.md rule 36 requires explicit permission.
--
-- `billing_deadline` is an explicit operational commitment. It is deliberately
-- nullable: existing batches without a recorded deadline must render as
-- unavailable rather than inheriting `end_date`.
alter table public.batches
  add column if not exists billing_deadline date;

comment on column public.batches.billing_deadline is
  'Recorded billing submission deadline for the batch. Null means not recorded.';

create index if not exists batches_tenant_billing_deadline_idx
  on public.batches (tenant_id, billing_deadline)
  where billing_deadline is not null;
