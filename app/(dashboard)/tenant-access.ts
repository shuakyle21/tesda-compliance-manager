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

import { getCurrentUser } from '@/modules/auth/data/auth';
import { deriveTenantAccess, getProfileSnapshot } from '@/modules/tenancy/data/tenancy';
import type { TenantAccess } from '@/modules/tenancy/domain/access';

export async function resolveTenantAccess(): Promise<TenantAccess> {
  // A failed Clerk lookup is "we could not check", not "no school" — falling
  // through to `none` would tell a fully-provisioned coordinator that they
  // have not been assigned a school.
  const user = await getCurrentUser().catch(() => null);
  if (!user) return 'unknown';

  return deriveTenantAccess(await getProfileSnapshot(user.id));
}
