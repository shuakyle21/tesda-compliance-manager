/**
 * Auth helpers — Clerk server-side utilities
 *
 * Centralises all server-side Clerk calls so the rest of the codebase
 * imports from here rather than directly from `@clerk/nextjs/server`.
 * This makes it easy to add role/tenant logic as the app grows.
 *
 * USAGE (Server Components, Route Handlers, Server Actions):
 *
 *   import { getCurrentUser, getAuthUserId } from '@/modules/auth/data/auth';
 *
 *   // Inside a Server Component or async Route Handler:
 *   const user = await getCurrentUser();
 *   if (!user) { ... } // unauthenticated
 *
 * DOCS: https://clerk.com/docs/references/nextjs/auth
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';

/**
 * Returns the authenticated Clerk `User` object or `null` when no session
 * exists.  Use this when you need full user data (name, email, metadata).
 */
export async function getCurrentUser(): Promise<User | null> {
  return currentUser();
}

/**
 * Returns the raw `auth()` payload from Clerk.
 * `userId` is `null` when no session exists.
 * Use this when you only need the user ID or session claims.
 */
export async function getAuthPayload() {
  return auth();
}

/**
 * Returns the Clerk `userId` of the signed-in user, or `null`.
 * Useful as a lightweight check before loading tenant/role data.
 *
 * Example:
 *   const userId = await getAuthUserId();
 *   if (!userId) redirect('/sign-in');
 */
export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
