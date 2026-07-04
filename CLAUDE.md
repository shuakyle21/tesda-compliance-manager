# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TVI-CAMS — an internal multi-tenant compliance tool for TVI schools running TESDA scholarship batches (TWSP/CFSP). It tracks batch lifecycle, documents, attendance, LAMR evidence, and generates official TESDA billing documents. It is an **internal working layer only**: TESDA SIS/T2MIS/BSRS remain the authoritative systems, and UI copy must never imply official approval or submission.

## Commands

```bash
npm run dev       # Next.js dev server
npm run build     # production build
npm run lint      # ESLint (flat config; static dirs below are globally ignored)
npx tsc --noEmit  # typecheck (strict) — no dedicated script
npm run preview   # serve the static design preview bundle on :5000
```

There is **no test runner yet** — `npm test` is a placeholder (`echo "No tests defined."`). Standing up Vitest + real-Supabase integration tests is Phase 0.4 of `docs/IMPLEMENTATION_PLAN.md`; when tests exist, mappers and `lib/domain/*` must be unit-tested with fixed as-of dates, and RLS/tenant-isolation tests run against real Supabase (no mocks).

## Architecture

Single **Next.js 16 App Router** app (React 19, TS strict, Tailwind v4) talking directly to **Supabase** (Postgres + Storage), with **Clerk** as identity. No separate backend; Laravel is documented as future-only — do not build it or treat it as present.

**Auth chain:** `proxy.ts` (Clerk middleware, protects everything except `/sign-in`, `/sign-up`) → `lib/supabase/server.ts` attaches the Clerk JWT (template named exactly `supabase`) as a bearer token on an **anon-key** client → Postgres RLS (`app_private.*` helper functions from the migration) makes every authorization decision. **RLS is the security boundary; UI hiding is usability only.** The service-role key must never reach client code.

**Data layer — the fetch → map → derive pattern.** `lib/data/batches.ts` is the reference implementation every entity contract must follow:

1. **fetch** — typed Supabase query; RLS scopes rows (never manually filter by tenant in JS)
2. **map** — pure DB-row → domain translation (`mapBatchRow`), unit-testable, no I/O
3. **derive** — lifecycle/date helpers computed from the row

Two type families stay deliberately separate: `lib/supabase/database.types.ts` (generated raw rows — regenerate after every migration) and `lib/data/types.ts` (UI domain types). **Only `lib/data/*` may import `database.types`; components import domain types only.**

**Enum bridge lives in the mapper, not components:** DB `training→train`, `assessment→assess`, `billing→bill`; UI `entre` stage is UI-only (no DB column); DB `blocked` surfaces as UI `pending`. `DB_TO_UI_STAGE` in `lib/data/batches.ts` is a total map — a new DB enum variant must fail compilation there until its UI treatment is chosen.

**Error shaping:** data functions return discriminated snapshots (see `BatchesSnapshot`: `ok` / `sync-failed` / `unconfigured`) so Server Components map states straight to UI. `unconfigured` (no Supabase env) falls back to mock data silently; `sync-failed` (configured but errored) must surface the sync-failed banner. Never leak raw Supabase/SQL errors, table names, or internal IDs to the UI.

**Component layering:** `app/(dashboard)/<route>/page.tsx` (Server Component: fetch + compose) → `components/screens/*` → `components/ui/*` primitives + `components/dashboard/*` widgets; `components/shell/*` is the app shell (Sidebar → Topbar → MetricsRow). Default to Server Components; client islands only for interactivity. Reuse existing primitives (`BatchCard`, `BatchModal`, `StatusBadge`, `LifecyclePipeline`, `EmptyState`, `InfoCallout`, …) rather than creating parallels.

**Role rules that are load-bearing:** Trainer-facing DTOs must omit billing deadline, billing preparation, NTP lag, BSRS, and financial fields **server-side** (not CSS-hidden). Viewer is read-only and must be server-denied on writes. The dashboard currently accepts `?role=` / `?state=` preview overrides until the real tenant/role resolver lands (TES-34).

## Docs precedence and ADR-001

`docs/MASTER_PRD_SRS.md` is the product source of truth, `docs/TRD.md` the engineering companion, `docs/IMPLEMENTATION_PLAN.md` the phased plan — but **`docs/adr/ADR-001-billing-and-domain-model.md` supersedes any conflicting "billing = preparation signal only" wording**. Billing is a document-generating engine (TSF/Allowance, Training Cost, Entrepreneurship — populated `.docx` templates; Assessment Fee is out of scope). Key locked domain facts: progress = `sessions_held / total_sessions` (nominal hours ÷ 8, snapshotted on the batch); a scholar with ≥5 absences is ineligible; one RQM code = one batch (NTP authorization on the batch); ULI is the permanent learner key; tenant context lives in the URL path segment; alerts are computed on read (no cron/email). Consult the ADR before changing schema or billing math.

## Design system rules (spec-mandated, non-negotiable)

- **No emoji** anywhere in UI; icons are `@tabler/icons-react` line icons
- IBM Plex fonts; semantic color tokens only (defined in `app/globals.css` + `app/design-system.css`) — never raw hex in components
- Status conveyed by text + icon, never color alone; WCAG 2.2 AA target
- Every data screen implements: loading, empty, no-results, error/sync-failed, permission-denied, stale-data states; screens with relative dates show an exact "Data as of" timestamp

## Static/handoff directories — do not edit

`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are ported verbatim from the design bundle and excluded from lint/build (`eslint.config.mjs` globalIgnores). A PreToolUse hook (`.claude/hooks/protect-static-dirs.sh`) blocks edits there. Edit the source design files instead, or confirm with the user first. `FIGMA FILES/`, `diagrams/`, `.design-sync/` are likewise design artifacts, not app code.

## Git / workflow

- Linear team **TESDA-CAMS** (key `TES`) two-way syncs with this GitHub repo: create issues on **one side only** to avoid duplicate pairs. Branch names follow Linear's `klynejoshua13/tes-NN-…` convention.
- The single migration `supabase/migrations/20260528160300_create_tenant_scoped_schema.sql` is canonical for schema + RLS; new migrations are additive. After any migration: regenerate `database.types.ts`, then update affected mappers and domain types.
