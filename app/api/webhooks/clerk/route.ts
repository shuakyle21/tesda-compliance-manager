import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest, NextResponse } from 'next/server';
import {
  deactivateProfileFromClerkUser,
  upsertProfileFromClerkUser,
} from '@/modules/auth/data/provisioning';

/**
 * Syncs Clerk user lifecycle events into `public.profiles`. See
 * `modules/auth/data/provisioning.ts` for the provisioning rules (new users
 * get `viewer` + no tenant; deletes deactivate, never hard-delete).
 *
 * Unauthenticated by design — Clerk signs the request body and it's verified
 * below via `CLERK_WEBHOOK_SIGNING_SECRET`. This repo's Clerk middleware
 * (`proxy.ts`) doesn't gate `/api/*` on a session (route protection moved to
 * per-component `requireAuthenticatedUser()` calls), so no middleware
 * exclusion is needed for this route to receive Clerk's request.
 */
export async function POST(req: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(req);
  } catch (error) {
    console.error('Clerk webhook verification failed', error);
    return new NextResponse('Verification failed', { status: 400 });
  }

  try {
    if (event.type === 'user.created' || event.type === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = event.data;
      const email = email_addresses[0]?.email_address ?? null;
      const fullName = [first_name, last_name].filter(Boolean).join(' ') || null;
      await upsertProfileFromClerkUser({ id, email, fullName });
    }

    if (event.type === 'user.deleted') {
      if (event.data.id) {
        await deactivateProfileFromClerkUser(event.data.id);
      }
    }
  } catch (error) {
    console.error(`Failed to sync profile for Clerk event "${event.type}"`, error);
    return new NextResponse('Sync failed', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
