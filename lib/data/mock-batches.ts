/**
 * STEP 2 — Data Layer: Mock Data Module
 *
 * WHY THIS FILE EXISTS:
 * The spec says: "Connect Supabase only after the static dashboard shell
 * and mock data flow are stable." This file is your data stand-in.
 * Every component imports from here — when Supabase is ready, you swap
 * this file's exports for real async fetches without touching the components.
 *
 * NEXT.JS CONCEPT: Server Components can `await` async functions at the
 * top level. When you're ready to go live, replace these exports with
 * async functions that call `createClient()` from Supabase. The component
 * call site stays the same — only the data source changes.
 *
 * DOCS (Server Components + data fetching):
 * https://nextjs.org/docs/app/building-your-application/data-fetching/fetching
 * LEARN Ch 7 — Fetching Data: https://nextjs.org/learn/dashboard-app/fetching-data
 * LEARN Ch 8 — Static vs Dynamic Rendering: https://nextjs.org/learn/dashboard-app/static-and-dynamic-rendering
 */

import type { Batch, ActivityEvent, DashboardMetrics } from './types';

// ---------------------------------------------------------------------------
// TODO 2a: Port the BATCHES array from ui_kits/admin/data.js.
//
// CHANGES to make while porting:
//   1. Type the array as `Batch[]` (satisfies the interface you just wrote)
//   2. Add an `urgency` field to each record — derive it from `daysToBilling`:
//        daysToBilling < 7  → 'critical'
//        daysToBilling < 21 → 'warning'
//        else               → 'on-track'
//   3. Remove the `window.BATCHES = BATCHES` line at the bottom of data.js
//      (that was for the static HTML preview; Next.js uses module exports)
//
// TIP: Sort batches by `daysToBilling` ascending so the most urgent always
// appears first. The spec says urgency must be visible before reading.
// ---------------------------------------------------------------------------
export const MOCK_BATCHES: Batch[] = [
  // TODO 2a: paste and type the 3 batch records here
];

// ---------------------------------------------------------------------------
// TODO 2b: Port the ACTIVITY array from ui_kits/admin/data.js.
//
// No structural changes needed — just add the ActivityEvent type.
// ---------------------------------------------------------------------------
export const MOCK_ACTIVITY: ActivityEvent[] = [
  // TODO 2b: paste the activity log records here
];

// ---------------------------------------------------------------------------
// TODO 2c: Derive the DashboardMetrics object from MOCK_BATCHES.
//
// DO NOT hardcode the values — compute them from the array:
//   totalBatches       = MOCK_BATCHES.length
//   totalScholars      = sum of batch.scholars
//   avgProgress        = mean of batch.progressPct (round to 1 decimal)
//   activeBatches      = count where batch.status === 'ongoing'
//   earliestBillingDeadline = batch with lowest daysToBilling → its billingDeadline
//
// WHY: If you hardcode "3 batches", the number lies the moment you add a 4th.
// Deriving from the array keeps the metrics row always in sync.
// ---------------------------------------------------------------------------
export function getMockMetrics(): DashboardMetrics {
  // TODO 2c: compute and return the metrics object
  throw new Error('getMockMetrics not implemented');
}
