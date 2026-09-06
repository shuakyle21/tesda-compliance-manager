# modules/auth — Authentication (FR-01)

Authentication and protected access via Clerk.

## Contents
- `data/auth.ts` — `getCurrentUser`, `getAuthPayload`, `getAuthUserId` (Clerk-backed session reads)
- `data/provisioning.ts` — `upsertProfileFromClerkUser`, `deactivateProfileFromClerkUser`: syncs Clerk user lifecycle events into `public.profiles` via the service-role client (`lib/supabase/service.ts`). Called only from `app/api/webhooks/clerk/route.ts`. New profiles get `role: 'viewer'` and no tenant membership — an admin assigns both later; see the function docs for why.
- `ui/clerkAppearance.ts`, `ui/clerkLocalization.ts` — Clerk widget theming/localization
- `ui/SignOutButton.tsx` — sign-out behavior component

## Notes
The route-protection middleware itself lives in `proxy.ts` (Clerk middleware, repo root) — it is infrastructure, not module code. The Clerk JWT template is named exactly `supabase`; see CLAUDE.md auth chain.

The Clerk webhook (`app/api/webhooks/clerk/route.ts`) needs `CLERK_WEBHOOK_SIGNING_SECRET` (from the Clerk Dashboard's webhook endpoint) and `SUPABASE_SERVICE_ROLE_KEY` (Supabase project settings — never `NEXT_PUBLIC_`-prefixed, never used outside `lib/supabase/service.ts`) set in the deployment environment. Locally, test with `clerk webhooks listen --token "$(clerk webhooks token)" --forward-to http://localhost:3000/api/webhooks/clerk`.

## Invitations
- `domain/invitationMetadata.ts` — the access grant an admin attaches to a Clerk invitation.
  `profiles.clerk_user_id` is NOT NULL, so a person who has never signed up has no row to
  assign; the grant rides on the invitation's `publicMetadata` (Backend-API-only, so the
  invitee cannot forge it) and Clerk copies it onto the user at sign-up.
- `data/invitations.ts` — `inviteUser`. Server-only; reads `CLERK_SECRET_KEY`.
- `data/provisioning.ts` — now applies that grant on the **insert** path only. Self sign-up
  still lands as `viewer` with no tenant membership; the update path still never touches
  role or `is_active`, so metadata appearing on an existing user changes no authorization.

`inviteUser` uses `NEXT_PUBLIC_APP_URL` (optional) to build the invitation's redirect back to
`/sign-up`; without it Clerk falls back to the instance's own setting.
