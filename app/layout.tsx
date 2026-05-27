/**
 * STEP 4 — Root Layout
 *
 * WHY THIS FILE EXISTS:
 * layout.tsx at the root of `app/` wraps every page in your application.
 * It renders once and persists across navigations — perfect for:
 *   - Loading fonts (next/font — zero layout shift, self-hosted automatically)
 *   - Setting <html> and <body> attributes
 *   - Global metadata (title, description, Open Graph)
 *
 * NEXT.JS CONCEPT: The App Router uses nested layouts. This root layout
 * wraps everything. The dashboard layout (app/(dashboard)/layout.tsx)
 * adds the shell (Topbar, MetricsRow, Tabs) on top of this.
 *
 * DOCS: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates
 * FONTS: https://nextjs.org/docs/app/building-your-application/optimizing/fonts
 */

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
// TODO 4a: Replace Geist with IBM_Plex_Sans and IBM_Plex_Mono.
// LEARN Ch 3 — Optimizing Fonts and Images: https://nextjs.org/learn/dashboard-app/optimizing-fonts-images
//
// The variable names declared here MUST match the --font-* variables
// you map in globals.css @theme (e.g. `--font-ibm-plex-sans`).
//
// Example pattern (verify exact export name from next/font/google):
//   import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
//   const ibmPlexSans = IBM_Plex_Sans({
//     weight: ['300', '400', '500', '600'],
//     subsets: ['latin'],
//     variable: '--font-ibm-plex-sans',
//   });
//
// TIP: Request only the weights you use — 300, 400, 500, 600 per the spec.
// next/font downloads only those variants, reducing the font payload.
import { Geist, Geist_Mono } from "next/font/google"; // TODO 4a: replace these

const geistSans = Geist({          // TODO 4a: replace with ibmPlexSans
  variable: "--font-geist-sans",   // TODO 4a: change to --font-ibm-plex-sans
  subsets: ["latin"],
});

const geistMono = Geist_Mono({     // TODO 4a: replace with ibmPlexMono
  variable: "--font-geist-mono",   // TODO 4a: change to --font-ibm-plex-mono
  subsets: ["latin"],
});

// ---------------------------------------------------------------------------
// TODO 4b: Update the Metadata export.
// LEARN Ch 16 — Adding Metadata: https://nextjs.org/learn/dashboard-app/adding-metadata
//
// Change title and description to match the product:
//   title: 'Training Compliance System'
//   description: 'TESDA Farm School Scholarship Compliance Dashboard'
//
// DOCS: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  title: "Training Compliance System",
  description: "TESDA Farm School Scholarship Compliance Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TODO 4c: Swap font class variable names once Step 4a is done.
  // Also add `bg-[var(--color-bg)]` on <body> so the warm off-white
  // (#F5F4F0) shows even before any page content loads.
  //
  // NOTE on providers: Do NOT add auth or query providers here yet.
  // The spec says "connect Supabase and Clerk only after static shell
  // and mock data flow are stable." Add providers at the lowest layout
  // that actually needs them, when you need them.
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
