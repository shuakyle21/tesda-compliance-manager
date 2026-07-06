# modules/auth — Authentication (FR-01)

Authentication and protected access via Clerk.

## Contents
- `data/auth.ts` — `getCurrentUser`, `getAuthPayload`, `getAuthUserId` (Clerk-backed session reads)
- `ui/clerkAppearance.ts`, `ui/clerkLocalization.ts` — Clerk widget theming/localization
- `ui/SignOutButton.tsx` — sign-out behavior component

## Notes
The route-protection middleware itself lives in `proxy.ts` (Clerk middleware, repo root) — it is infrastructure, not module code. The Clerk JWT template is named exactly `supabase`; see CLAUDE.md auth chain.
