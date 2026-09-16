import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkLocalization } from "@/modules/auth/ui/clerkLocalization";
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});
export const metadata: Metadata = {
  title: "Training Compliance System",
  description: "TESDA Farm School Scholarship Compliance Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
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
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-(--color-bg)">
        <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
