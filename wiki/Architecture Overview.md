# Architecture Overview

TVI-CAMS is a **single Next.js 16 App Router application** (React 19, TypeScript strict, Tailwind v4) that talks **directly to Supabase** (Postgres + Storage), with **Clerk** as the identity provider. There is no separate backend service; authorization is enforced in the database via Row Level Security ([[Auth And Tenancy]]).

```text
Browser (client islands: sidebar, modals, uploads)
  ↓ HTML / RSC payload
Next.js 16 App Router (Vercel)
  - Server Components: fetch + role-scoped render
  - Route Handlers / Server Actions: mutations
  - Clerk middleware (route protection)
  - lib/data/* contracts (fetch → map → derive)
  ↓ Clerk JWT (template "supabase")        ↓ session
Supabase Postgres + Storage                Clerk
  - tenant-scoped schema, RLS (app_private.*)
  - bucket compliance-evidence
```

## Key decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Data layer | Supabase direct from Next server | Schema, RLS, Storage, seeds already exist in one migration; zero extra infra for a ~5-user tool |
| Auth | Clerk | Already wired; offloads session/MFA/account UI |
| Authorization | Supabase RLS keyed on Clerk JWT | Defense in depth — even a wrong query returns zero unauthorized rows |
| Framework | Next.js App Router + RSC | Role-scoped data fetched server-side; secrets never reach the client |
| Future backend | **Laravel — documented only, never built** | The `lib/data/*` DTO boundary is the designed seam: Laravel could later slot in behind the same shapes without a UI rewrite |

## Laravel is future-only

The [[API_MERMAID_DIAGRAMS]] describe a *planned* Laravel API architecture. Per the PRD conflict table, **the MVP is Next.js + Clerk + Supabase** — do not build Laravel or treat it as present ([[Docs Precedence]]).

## Component layering

`app/(dashboard)/<route>/page.tsx` (Server Component: fetch + compose) → `components/screens/*` → `components/ui/*` primitives + `components/dashboard/*` widgets; `components/shell/*` is the app shell (Sidebar → Topbar → MetricsRow). Default to Server Components; client islands only for interactivity. Reuse existing primitives (`BatchCard`, `BatchModal`, `StatusBadge`, `LifecyclePipeline`, `EmptyState`, …) rather than creating parallels.

## State management

Server state via RSC + `lib/data/*` (no React Query in MVP); **URL state** for anything shareable (filters, sort, tenant, `?batchId=`); local client state only for transient UI (modals, uploads, unsaved forms).

## Related

- [[Data Layer Pattern]] — the contract layer in detail
- [[Database Schema]] — what's underneath
- [[Implementation Roadmap]] — build order

Sources: [[TRD]] §1–2, §6–8 · [[MASTER_PRD_SRS]] §11–12 · [[API_MERMAID_DIAGRAMS]]
