-- Qualification header images (batch-detail hero).
--
--
-- Each national qualification can carry one landscape header image, shown at
-- the top of the batch detail view for every batch of that qualification.
--
-- WHERE IT LIVES. On `public.qualifications`, the canonical national registry
-- (migration 20260906114735) -- not on `tenant_qualifications` (a school's
-- registration of it) and not on `batches`. One image per qualification, so
-- "Rice Machinery Operations NC II" looks the same at every school, and no
-- second qualification record is created.
--
-- STORAGE. The binary lives in Supabase Storage; Postgres holds only the
-- object key. The bucket is new rather than `compliance-evidence` because
-- every policy on that bucket casts folder segment 1 to a tenant id and checks
-- `can_access_tenant`. A national qualification has no tenant, and a platform
-- admin belongs to none, so both reads and writes would be refused there.
--
-- The bucket is PRIVATE, like `compliance-evidence`: reads go through
-- short-lived signed URLs minted server-side. Who may read matches who may
-- read `qualifications` (any signed-in user); who may write matches who may
-- write `qualifications` (platform admins only).
--
-- Object key shape: `{qualification_id}/{random}.{ext}`. A replacement is
-- uploaded to a new key and the old object deleted after the column moves, so
-- a failed upload never leaves the column pointing at nothing.

alter table public.qualifications
  add column if not exists header_image_path text;

-- A qualification can only point at an object under its own folder.
alter table public.qualifications
  add constraint qualifications_header_image_path_own_folder
    check (header_image_path is null or header_image_path like id::text || '/%');

comment on column public.qualifications.header_image_path is
  'Object key in the private qualification-images bucket for the batch-detail hero image. Null = no image; the UI shows a neutral header.';

-- Type and size are enforced by Storage itself, not only by the app: this is
-- the trust-boundary check. 5 MB comfortably fits a 1600x900+ JPEG/WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qualification-images',
  'qualification-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can read qualification images"
on storage.objects
for select
to authenticated
using (bucket_id = 'qualification-images');

create policy "Platform admins can upload qualification images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'qualification-images'
  and app_private.is_platform_admin()
);

create policy "Platform admins can update qualification images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'qualification-images'
  and app_private.is_platform_admin()
)
with check (
  bucket_id = 'qualification-images'
  and app_private.is_platform_admin()
);

create policy "Platform admins can delete qualification images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'qualification-images'
  and app_private.is_platform_admin()
);
