-- Self-service profile provisioning (live-data cutover, Phase 1).
--
-- profiles has a SELECT policy ("Users can read own or same-tenant profiles",
-- see the base migration) but no INSERT policy at all — RLS defaults to deny
-- for any command with no matching policy, so a signed-in user could never
-- get their own first-sign-in profiles row created via the normal anon-key +
-- Clerk-JWT client every data/ layer uses. This adds exactly one policy: a
-- user may insert a row only when the row's own clerk_user_id matches their
-- own Clerk id, reusing app_private.current_clerk_user_id() (the same helper
-- current_profile_id() uses) rather than reading auth.jwt() ->> 'sub'
-- directly, since that helper already falls back across the three claim
-- shapes this project's Clerk JWT template has used. They can create their
-- own profile, never anyone else's, and never assign themselves to a tenant
-- (profile_tenant_memberships has no matching policy here, deliberately —
-- tenant assignment stays an admin action, not self-service).

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (clerk_user_id = app_private.current_clerk_user_id());
