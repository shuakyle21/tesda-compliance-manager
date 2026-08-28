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
