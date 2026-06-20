import type { ComponentProps } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

// Derive the localization type from the provider prop so we don't depend on the
// transitive `@clerk/types` package (not hoisted in this install) — same pattern
// as lib/clerkAppearance.ts.
type Localization = NonNullable<ComponentProps<typeof ClerkProvider>['localization']>;

/**
 * Clerk copy overrides that align the prebuilt <SignIn>/<SignUp> widgets with the
 * TCS "Auth · Sign-in" design (Figma node 741:2438). Clerk's widget text is
 * localization-driven, so these keys replace the default strings in TVI-CAMS voice.
 *
 * IMPORTANT — what this file CANNOT change (these are Clerk *instance* settings,
 * configured in the Clerk dashboard, not in code):
 *   - Which OAuth providers appear (TVI-CAMS uses Google only).
 *   - The in-card brand logo/mark.
 *   - Whether public sign-up is enabled (drives the footer link).
 *   - The "Development mode" badge (only absent on a production Clerk instance).
 */
export const clerkLocalization: Localization = {
  signIn: {
    start: {
      title: 'Sign in to TVI-CAMS',
      subtitle: 'Welcome back. Sign in to continue to the Compliance & Audit dashboard.',
    },
  },
  // Top-level key — matches the email field across sign-in and sign-up.
  formFieldInputPlaceholder__emailAddress: 'you@school.ph',
};
