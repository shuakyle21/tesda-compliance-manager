/**
 * STEP 1 — Data Layer: TypeScript Interfaces
 *
 * WHY THIS FILE EXISTS:
 * Before writing any React component, define the *shape* of your data.
 * TypeScript interfaces act as a contract between your mock data, your
 * components, and (eventually) your Supabase database schema.
 *
 * NEXT.JS CONCEPT: TypeScript is first-class in Next.js App Router.
 * Files in `lib/` are never bundled into the browser unless explicitly
 * imported by a Client Component. Keep pure data types here.
 *
 * DOCS: https://nextjs.org/docs/app/building-your-application/configuring/typescript
 * LEARN (TypeScript setup in Next.js): https://nextjs.org/learn/dashboard-app/getting-started
 */

// ---------------------------------------------------------------------------
// TODO 1a: Define the lifecycle stage type.
//
// A lifecycle stage has:
//   - key: one of 'aou' | 'ntp' | 'tip' | 'train' | 'assess' | 'bill'
//   - label: the display string (e.g. 'AOU', 'TRAINING')
//   - status: 'done' | 'active' | 'pending'
//   - date: a human-readable date string (e.g. 'Apr 9' or 'Pending')
//
// TIP: Use a string union type for `key` and `status` so TypeScript will
// catch typos at compile time. See: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
// ---------------------------------------------------------------------------
export type LifecycleStageKey = // TODO: fill in the union
  never;

export type LifecycleStatus = // TODO: fill in the union
  never;

export interface LifecycleStage {
  // TODO 1a: add fields here
}

// ---------------------------------------------------------------------------
// TODO 1b: Define the UrgencyTier type.
//
// Urgency drives the left-border color on batch cards:
//   'critical' → red  (< 7 days to billing)
//   'warning'  → amber (7–21 days)
//   'on-track' → green (> 21 days)
//   'muted'    → neutral (no deadline soon)
//
// TIP: This is a discriminated union pattern — a single string that controls
// both color and icon choice across many components.
// ---------------------------------------------------------------------------
export type UrgencyTier = // TODO: fill in the union
  never;

// ---------------------------------------------------------------------------
// TODO 1c: Define the Batch interface.
//
// Look at ui_kits/admin/data.js for the real field names.
// Key fields to include:
//   - id, name, qualification, ncLevel
//   - program: string  (generic — NOT a union of 'TWSP' | 'CFSP')
//   - trainer, scholars (number)
//   - progressPct (number 0–100)
//   - billingDeadline (string), daysToBilling (number)
//   - bsrs (boolean)
//   - remark (string)
//   - status: 'ongoing' | 'completed' | 'pending'
//   - lifecycle: LifecycleStage[]
//   - urgency: UrgencyTier  ← derive this from daysToBilling
//
// NOTE on `program`: The spec says to use generic ScholarshipProgram records,
// not hard-coded 'TWSP' | 'CFSP'. Using `string` now keeps the door open.
// ---------------------------------------------------------------------------
export interface Batch {
  // TODO 1c: add fields here
}

// ---------------------------------------------------------------------------
// TODO 1d: Define the ActivityEvent interface.
//
// From ui_kits/admin/data.js, an activity event has:
//   - id, when (display string), who, text
//   - tone: 'green' | 'blue' | 'amber' | 'red'  ← maps to semantic colors
// ---------------------------------------------------------------------------
export interface ActivityEvent {
  // TODO 1d: add fields here
}

// ---------------------------------------------------------------------------
// TODO 1e: Define the DashboardMetrics interface.
//
// The metrics row shows 5 cards:
//   - totalBatches, totalScholars, avgProgress (number)
//   - earliestBillingDeadline (string), activeBatches (number)
//
// DESIGN RULE: metric values always render in IBM Plex Mono (t-metric-value class).
// ---------------------------------------------------------------------------
export interface DashboardMetrics {
  // TODO 1e: add fields here
}
