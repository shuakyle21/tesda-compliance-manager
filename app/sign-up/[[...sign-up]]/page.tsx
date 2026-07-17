/**
 * Sign-up route — sign-up now happens in the custom <SignUpModal> launched
 * from the sign-in screen (per the sign-up modal design handoff), so this
 * route only preserves deep links: /sign-up redirects to the sign-in screen
 * with the modal already open.
 *
 * The `[[...sign-up]]` catch-all is kept so any stale Clerk sub-path links
 * (e.g. /sign-up/verify-email-address) land here too instead of 404ing; the
 * custom modal flow never navigates to sub-paths itself.
 */

import { redirect } from 'next/navigation';

export default function SignUpPage() {
  redirect('/sign-in?sign_up=1');
}
