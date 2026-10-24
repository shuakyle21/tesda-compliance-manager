-- ADR-007: attendance-based dropout rule. Supersedes ADR-001 Elig.
--
-- A scholar is dropped from the program when absences exceed a percentage of
-- the batch's snapshotted `total_sessions` (Elig-2), or on 3 consecutive
-- unexcused absences (Elig-3/Elig-4). This replaces the retired fixed-count
-- rule rather than running beside it, per the product decision recorded in
-- the ADR.
--
-- WHY THIS IS A SEPARATE FILE, not an edit to
-- `20260910120000_add_adr001_billing_domain.sql`, which is where these columns
-- were introduced:
--
-- ADR-007 was first written on 2026-09-15, when `list_migrations` reported
-- 20260910120000 as unrecorded, and it edited that file in place on that
-- basis. README.md in this directory now records it as repair-recorded on
-- 2026-10-04 with its object inventory verified live. That record has not been
-- re-checked against the database here, and this file does not depend on it
-- being right -- see the paragraph below. Supabase keys applied
-- migrations on the version string, so editing a recorded file changes the
-- repository and never the database: the recorded version still matches, so
-- nothing re-runs. The repo would claim `max_absence_percent` while the live
-- column stayed `max_absences`.
--
-- Being additive also makes this correct whichever way that question lands.
-- Migrations run in filename order, so 20260910120000 creates the columns
-- below before this file alters them, whether it ran earlier or runs for the
-- first time in the same push. RULES.md rule 3: new migrations are additive.
--
-- Every statement is guarded, so re-running this file is a no-op.

-- ---------------------------------------------------------------------------
-- 1. Elig-3 — "unexcused" needs a field that did not exist
-- ---------------------------------------------------------------------------
-- Only meaningful where `present = false`. Defaults to unexcused: an absence
-- nobody has explicitly excused must count toward the dropout threshold.
-- Defaulting the other way would silently understate dropout risk, which in a
-- compliance tool is the more damaging direction to be wrong in.
alter table public.attendance_records
  add column if not exists excused boolean not null default false;

comment on column public.attendance_records.excused is
  'ADR-007 Elig-3. Meaningful only when present = false. Default false means '
  'an absence counts as unexcused until a trainer or registrar marks it '
  'otherwise -- the safe default for the dropout threshold.';

-- ---------------------------------------------------------------------------
-- 2. Elig-2 — a percentage of the batch, replacing the fixed count
-- ---------------------------------------------------------------------------
-- NOT a rename, and deliberately not a type cast of the old column.
-- `max_absences = 4` is a count of sessions; `max_absence_percent = 20.00` is
-- a share of however many sessions a batch has. Casting 4 to 4.00 would read
-- as "4 percent" and silently impose a far stricter rule than either ADR
-- intends -- on a 45-session batch, 1 allowed absence instead of 9. So the new
-- column takes the policy default and the old one is dropped; the retired
-- count has no meaningful conversion into the new unit.
--
-- Allowed absences = floor(total_sessions * percent / 100), and the next
-- absence beyond that disqualifies -- the same `actual > allowed` shape
-- ADR-001 used, with `allowed` now derived per batch instead of hardcoded.
alter table public.program_billing_rules
  add column if not exists max_absence_percent numeric(5, 2) not null default 20.00
    check (max_absence_percent > 0 and max_absence_percent <= 100);

comment on column public.program_billing_rules.max_absence_percent is
  'ADR-007 Elig-2. A scholar whose absences exceed this percent of the '
  'batch''s total_sessions (floored) is dropped from the program -- default 20, '
  'per the TESDA Omnibus Guidelines. A 3-consecutive-unexcused-absence streak '
  '(attendance_records.excused) drops the scholar independently of this '
  'threshold. Overridable per tenant via tenant_settings.max_absence_percent.';

-- Dropped, not kept alongside: two thresholds in two units on the same axis
-- is exactly the "silently disagree" failure the ADR-001 comment warned about,
-- and no shipped code reads this column (`modules/attendance/domain/
-- eligibility.ts` is still unbuilt, and grep over app/ modules/ shared/ lib/
-- finds no reference). What is lost is a retired rule's configuration, never
-- learner or attendance data.
alter table public.program_billing_rules
  drop column if exists max_absences;

-- ---------------------------------------------------------------------------
-- 3. The tenant override, in the same new unit
-- ---------------------------------------------------------------------------
-- Nullable, and null still means "inherit the program rule" -- a nullable
-- override rather than a duplicated default, so the two cannot disagree.
alter table public.tenant_settings
  add column if not exists max_absence_percent numeric(5, 2)
    check (max_absence_percent > 0 and max_absence_percent <= 100);

comment on column public.tenant_settings.max_absence_percent is
  'Tenant override for program_billing_rules.max_absence_percent (ADR-007 '
  'Elig-2). Null means inherit the program rule.';

alter table public.tenant_settings
  drop column if exists max_absences;
