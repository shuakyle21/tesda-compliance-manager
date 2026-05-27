import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

/**
 * AuthHeader — Clerk auth controls for the top of every page.
 *
 * - Signed out: renders Sign In and Sign Up buttons.
 * - Signed in:  renders the Clerk UserButton (avatar + profile menu).
 *
 * This component is intentionally display-only; all session logic lives
 * inside Clerk's components. It can be dropped into any layout that
 * needs visible auth controls.
 */
export function AuthHeader() {
  return (
    <header className="flex items-center justify-end gap-3 h-10 px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  );
}
