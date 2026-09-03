-- Active: 1787931874292@@aws-1-ap-northeast-2.pooler.supabase.com@5432@postgres
-- Seed dev operational data: batches, learners, documents.
--
-- Scope note: tenants (AKB/J3ED/NEN), scholarship programs (TWSP/CFSP), the
-- 8-key program_document_requirements catalog, program_billing_rules and the
-- compliance-evidence storage bucket are ALREADY seeded idempotently by
-- 20260528160300_create_tenant_scoped_schema.sql. This migration adds only the
-- operational rows that have no seed today, resolving tenants and programs by
-- their natural `code` rather than hardcoded UUIDs.
--
-- Source: shared/mocks/seed.ts (BATCHES). This is a DEV fixture, not real data.
--
-- batch_code: the schema's natural key is unique (tenant_id, batch_code) and the
-- locked domain fact is batch_code = the RQM code parsed from the NTP. The mock
-- has no RQM codes, and fabricating official-looking identifiers inside a
-- compliance tool is not acceptable. These rows therefore use an obviously
-- non-authoritative DEV- prefix, greppable for replacement when real NTPs land.
--
-- official_system_reference is left NULL for the same reason: TESDA SIS/T2MIS/
-- BSRS remain authoritative and this tool must never invent their references.

-- ---------------------------------------------------------------------------
-- 0. Idempotency guard for public.documents
-- ---------------------------------------------------------------------------
-- public.documents ships with no unique constraint on (batch_id, document_key),
-- so any repeated insert -- this seed, or a real upload path -- silently
-- duplicates rows. Add it here so ON CONFLICT below is well-defined and the
-- hazard is closed for real writes too.
-- NOTE: this fails loudly if duplicate (batch_id, document_key) pairs already
-- exist. That is intended -- de-duplicate first rather than seeding on top.
-- A unique index adds no column or constraint row, so no database.types.ts
-- change is expected.
create unique index if not exists documents_batch_id_document_key_key
  on public.documents (batch_id, document_key);

-- ---------------------------------------------------------------------------
-- 1. Batches
-- ---------------------------------------------------------------------------
with seed (
  tenant_code, program_code, batch_code, batch_section, qualification_title,
  nc_level, trainer_name, learner_count, start_date, end_date,
  current_stage, status, progress_percent, billing_report_status
) as (
  values
    ('AKB',  'TWSP', 'DEV-AKB-001',  'Batch 1',      'Cookery NC II',                   'NC II', 'Archelyn Gagula',     15, date '2026-04-21', date '2026-06-08', 'training'::public.lifecycle_stage,  'ongoing'::public.batch_status,   74, 'missing'::public.document_status),
    ('J3ED', 'CFSP', 'DEV-J3ED-001', 'Batch 1',      'Agri Crops Production NC I',      'NC I',  'Julius Maravilla',    15, date '2026-04-28', date '2026-06-22', 'training'::public.lifecycle_stage,  'ongoing'::public.batch_status,   92, 'missing'::public.document_status),
    ('NEN',  'CFSP', 'DEV-NEN-001',  'Batch 1',      'Rice Machinery Operations NC II',  'NC II', 'Agustin Pudadera III', 17, date '2026-05-05', date '2026-07-10', 'training'::public.lifecycle_stage,  'ongoing'::public.batch_status,   28, 'pending'::public.document_status),
    ('NEN',  'CFSP', 'DEV-NEN-002',  'Batch 2',      'Rice Machinery Operations NC II',  'NC II', 'Lourdes Catalan',     22, date '2026-04-14', date '2026-06-19', 'training'::public.lifecycle_stage,  'ongoing'::public.batch_status,   81, 'missing'::public.document_status),
    ('J3ED', 'CFSP', 'DEV-J3ED-002', 'Batch 2025-B', 'Agri Crops Production NC I',      'NC I',  'Julius Maravilla',    20, date '2025-11-04', date '2025-12-15', 'completed'::public.lifecycle_stage, 'completed'::public.batch_status, 100, 'verified'::public.document_status)
)
insert into public.batches (
  tenant_id, program_id, batch_code, batch_section, qualification_title,
  nc_level, trainer_name, learner_count, start_date, end_date,
  current_stage, status, progress_percent, billing_report_status
)
select
  t.id, p.id, s.batch_code, s.batch_section, s.qualification_title,
  s.nc_level, s.trainer_name, s.learner_count, s.start_date, s.end_date,
  s.current_stage, s.status, s.progress_percent, s.billing_report_status
from seed s
join public.tenants t              on t.code = s.tenant_code
join public.scholarship_programs p on p.code = s.program_code
on conflict (tenant_id, batch_code) do update set
  program_id            = excluded.program_id,
  batch_section         = excluded.batch_section,
  qualification_title   = excluded.qualification_title,
  nc_level              = excluded.nc_level,
  trainer_name          = excluded.trainer_name,
  learner_count         = excluded.learner_count,
  start_date            = excluded.start_date,
  end_date              = excluded.end_date,
  current_stage         = excluded.current_stage,
  status                = excluded.status,
  progress_percent      = excluded.progress_percent,
  billing_report_status = excluded.billing_report_status,
  updated_at            = now();

-- trainer_profile_id / created_by / updated_by are deliberately left NULL.
-- They reference public.profiles, which is Clerk-backed; seeding placeholder
-- profiles would create identities that no Clerk user can ever authenticate as.
-- The nullable trainer_name text column carries the trainer for now.

-- ---------------------------------------------------------------------------
-- 2. Learners
-- ---------------------------------------------------------------------------
-- Placeholder roster sized to each batch's learner_count. Names are explicitly
-- synthetic and ULI is NULL: ULI is the permanent learner key and inventing one
-- would pollute the identity space that real T2MIS records must occupy.
insert into public.learners (
  tenant_id, batch_id, learner_no, uli, last_name, first_name, assessment_result, is_active
)
select
  b.tenant_id,
  b.id,
  lpad(g::text, 3, '0'),
  null,
  'Learner',
  'Dev ' || lpad(g::text, 3, '0'),
  case when b.status = 'completed' then 'competent'::public.assessment_result
       else 'pending'::public.assessment_result end,
  true
from public.batches b
cross join lateral generate_series(1, b.learner_count) as g
where b.batch_code like 'DEV-%'
on conflict (tenant_id, batch_id, learner_no) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Documents
-- ---------------------------------------------------------------------------
-- Key mapping, mock (12 keys) -> DB catalog (8 keys):
--   aou            -> aou
--   ntp            -> ntp
--   tip_report     -> tip_report
--   training_sched -> training_schedule
--   attendance     -> attendance
--   assessment     -> assessment
--   billing_rpt    -> billing_report
--   (no mock key)  -> lamr              seeded 'missing'
--
-- The mock keys master_list, trainer_qual, progress_rpt, bsrs and nc_cert have
-- NO row in program_document_requirements and are therefore NOT seeded. They
-- are the unresolved half of the doc-key mismatch: documents.document_key is
-- plain text with no FK, so inserting them would create silently orphaned rows
-- that read as untracked. Resolve the catalog first, then extend this seed.
with doc_status (batch_code, document_key, status) as (
  values
    ('DEV-AKB-001',  'aou',               'verified'::public.document_status),
    ('DEV-AKB-001',  'ntp',               'verified'::public.document_status),
    ('DEV-AKB-001',  'tip_report',        'verified'::public.document_status),
    ('DEV-AKB-001',  'training_schedule', 'verified'::public.document_status),
    ('DEV-AKB-001',  'attendance',        'submitted'::public.document_status),
    ('DEV-AKB-001',  'lamr',              'missing'::public.document_status),
    ('DEV-AKB-001',  'assessment',        'pending'::public.document_status),
    ('DEV-AKB-001',  'billing_report',    'missing'::public.document_status),
    ('DEV-J3ED-001', 'aou',               'verified'::public.document_status),
    ('DEV-J3ED-001', 'ntp',               'verified'::public.document_status),
    ('DEV-J3ED-001', 'tip_report',        'verified'::public.document_status),
    ('DEV-J3ED-001', 'training_schedule', 'verified'::public.document_status),
    ('DEV-J3ED-001', 'attendance',        'submitted'::public.document_status),
    ('DEV-J3ED-001', 'lamr',              'missing'::public.document_status),
    ('DEV-J3ED-001', 'assessment',        'pending'::public.document_status),
    ('DEV-J3ED-001', 'billing_report',    'missing'::public.document_status),
    ('DEV-NEN-001',  'aou',               'verified'::public.document_status),
    ('DEV-NEN-001',  'ntp',               'verified'::public.document_status),
    ('DEV-NEN-001',  'tip_report',        'verified'::public.document_status),
    ('DEV-NEN-001',  'training_schedule', 'verified'::public.document_status),
    ('DEV-NEN-001',  'attendance',        'submitted'::public.document_status),
    ('DEV-NEN-001',  'lamr',              'missing'::public.document_status),
    ('DEV-NEN-001',  'assessment',        'pending'::public.document_status),
    ('DEV-NEN-001',  'billing_report',    'pending'::public.document_status),
    ('DEV-NEN-002',  'aou',               'verified'::public.document_status),
    ('DEV-NEN-002',  'ntp',               'verified'::public.document_status),
    ('DEV-NEN-002',  'tip_report',        'verified'::public.document_status),
    ('DEV-NEN-002',  'training_schedule', 'verified'::public.document_status),
    ('DEV-NEN-002',  'attendance',        'submitted'::public.document_status),
    ('DEV-NEN-002',  'lamr',              'missing'::public.document_status),
    ('DEV-NEN-002',  'assessment',        'pending'::public.document_status),
    ('DEV-NEN-002',  'billing_report',    'missing'::public.document_status),
    ('DEV-J3ED-002', 'aou',               'verified'::public.document_status),
    ('DEV-J3ED-002', 'ntp',               'verified'::public.document_status),
    ('DEV-J3ED-002', 'tip_report',        'verified'::public.document_status),
    ('DEV-J3ED-002', 'training_schedule', 'verified'::public.document_status),
    ('DEV-J3ED-002', 'attendance',        'verified'::public.document_status),
    ('DEV-J3ED-002', 'lamr',              'verified'::public.document_status),
    ('DEV-J3ED-002', 'assessment',        'verified'::public.document_status),
    ('DEV-J3ED-002', 'billing_report',    'verified'::public.document_status)
)
insert into public.documents (
  tenant_id, batch_id, requirement_id, document_key, document_name, status, audience
)
select
  b.tenant_id,
  b.id,
  r.id,
  r.document_key,
  r.document_name,
  ds.status,
  r.audience
from doc_status ds
join public.batches b                            on b.batch_code = ds.batch_code
join public.program_document_requirements r      on r.program_id = b.program_id
                                                and r.document_key = ds.document_key
on conflict (batch_id, document_key) do update set
  requirement_id = excluded.requirement_id,
  document_name  = excluded.document_name,
  status         = excluded.status,
  audience       = excluded.audience,
  updated_at     = now();

-- storage_path / external_url stay NULL: the mock's storage:// URLs point at no
-- real object in the compliance-evidence bucket, and a dead link on a
-- compliance document is worse than a visibly absent one.
