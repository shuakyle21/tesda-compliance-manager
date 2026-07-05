import type { ComponentProps } from 'react';
import type { SignIn } from '@clerk/nextjs';

// Derive the appearance type from the component prop so we don't depend on the
// transitive `@clerk/types` package (not hoisted in this install).
type Appearance = NonNullable<ComponentProps<typeof SignIn>['appearance']>;

/**
 * Shared Clerk `appearance` config that brands the prebuilt <SignIn>/<SignUp>
 * widgets with the TCS design system.
 *
 * NOTE: `variables` colors must be parseable values (hex/rgb) — Clerk runs them
 * through a color library to derive hover/active shades, so CSS `var(--token)`
 * references are NOT supported here. The literals below mirror the tokens in
 * app/globals.css; keep them in sync if those tokens change. Non-color values
 * (fontFamily, borderRadius) DO accept CSS variables.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#185FA5', // --color-blue
    colorText: '#18180F', // --color-text-primary
    colorTextSecondary: '#5A5950', // --color-text-secondary
    colorBackground: '#FFFFFF', // --color-surface
    colorInputBackground: '#FFFFFF',
    colorInputText: '#18180F',
    colorDanger: '#C81F1F', // --color-red
    colorNeutral: '#18180F',
    fontFamily: 'var(--font-ibm-plex-sans), ui-sans-serif, system-ui, sans-serif',
    fontFamilyButtons: 'var(--font-ibm-plex-sans), ui-sans-serif, system-ui, sans-serif',
    fontSize: '13px',
    borderRadius: 'var(--radius-lg)',
  },
  elements: {
    // Additive, non-conflicting tweaks layered on Clerk's defaults.
    card: 'auth-clerk-card',
    headerTitle: 'auth-clerk-title',
  },
};
