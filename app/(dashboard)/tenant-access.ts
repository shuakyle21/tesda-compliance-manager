/**
 * Route-tree composition: "does the signed-in person belong to a school yet?"
 *
 * Lives in `app/` — not in a module — for the same reason the create-user
 * Server Action does: it composes two modules' **private** `data/` layers
 * (`modules/auth`'s Clerk identity and `modules/tenancy`'s profile read), and
 * a module may not import another module's `data/`. `app/` is the only layer
 * allowed to fetch from both, so the join belongs here. Everything it joins is
 * itself pure or already-owned logic — no rule is encoded in this file.
 *
 * Both underlying reads are `cache()`-wrapped, so calling this from several
 * routes (or a route plus its layout) in one request costs one query.
 *
 * See `modules/tenancy/domain/access.ts` for what the verdict means and why
 * `unknown` must never be rendered as `none`.
 */

import { getAuthUserId } from '@/modules/auth/data/auth';
import { deriveTenantAccess, getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import type { TenantAccess } from '@/modules/tenancy/domain/access';

export async function resolveTenantAccess(): Promise<TenantAccess> {
  // `getAuthUserId()` reads the id off the session token locally;
  // `getCurrentUser()` would fetch the whole user object from Clerk's Backend
  // API, and the id is all this needs. The routes that already hold a profile
  // snapshot (billing, report) call `deriveTenantAccess` on it directly rather
  // than coming through here at all.
  //
  // A failed lookup is "we could not check", not "no school" — falling through
  // to `none` would tell a fully-provisioned coordinator they were never
  // assigned a school.
  const userId = await getAuthUserId().catch(() => null);
  if (!userId) return 'unknown';

  return deriveTenantAccess(await getProfileSnapshot(userId));
}
