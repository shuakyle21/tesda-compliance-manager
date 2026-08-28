# RULES.md

The non-negotiable invariants for this repo, in checklist form. `CLAUDE.md` explains the
architecture and *why* these exist; this file is the *what*, to check against before writing,
reviewing, or merging code.

**Read this file before any code change.** Each rule states its enforcement level:

- **[hook]** — blocked by a PreToolUse hook; cannot be bypassed by an agent
- **[deny]** — blocked by `permissions.deny` in `.claude/settings.json`; an agent cannot
  request an exception in-session, so lifting it means editing that file first
- **[lint]** / **[types]** — fails `pnpm lint` or `pnpm exec tsc --noEmit`
- **[rls]** — enforced by Postgres row-level security, not application code
- **[review]** — no automated check; a human or agent must catch it

---

## 1. Security boundary

1. **RLS is the security boundary; UI hiding is usability only.** Every authorization decision
   is made by Postgres RLS (`app_private.*` helpers). **[rls]**
2. **Never manually filter by tenant in JS.** RLS scopes rows. A JS-side tenant filter is a bug
   even when it returns the right answer — it signals the query was written assuming no RLS. **[review]**
3. **The service-role key must never reach client code.** Server-side clients use the anon key
   plus the Clerk JWT (template named exactly `supabase`) as a bearer token. **[review]**
4. **Viewer is read-only and must be server-denied on writes.** Not just hidden. **[review]**
5. **Trainer-facing DTOs omit billing deadline, billing preparation, NTP lag, BSRS, and financial
   fields server-side** — not CSS-hidden. **[review]**
6. **Never leak raw Supabase/SQL errors, table names, or internal IDs to the UI.** **[review]**

## 2. Module boundaries

7. **Import direction is `app → modules → shared → lib/supabase`.** **[lint]**
   (`import/no-restricted-paths` in `eslint.config.mjs`)
8. **Another module's `data/` is private.** Import its `domain/` or `ui/` instead; only `app/` may
   fetch from any module's `data/`. **[lint]**
9. **`shared/` must never import `modules/` or `app/`.** **[lint]**
10. **Only module `data/` layers may import `lib/supabase/database.types.ts`** (besides
    `lib/supabase` itself). Components import domain types from `shared/types.ts` only. **[lint]**
11. **No business logic in `app/`.** Routes are thin: fetch via a module's `data/`, compose module UI. **[review]**
12. **Add new code inside its owning module, not in a new top-level folder.** Modules with no code
    yet hold a README naming their FR. **[review]**
13. **No index barrels.** Deep imports are the convention. **[review]**
14. **`domain/` is pure** — business rules with no I/O. **[review]**
15. **If a `shared/ui` component starts reading data or encoding business rules, move it into its
    owning module.** **[review]**
16. **Do not split `shared/types.ts` per-module** without first relocating `shared/mocks/seed.ts`
    out of `shared/` — it constructs 11 domain types and `shared/` cannot import `modules/`
    (deliberately deferred in TES-68). **[review]**

## 3. Data layer

17. **Every entity contract follows fetch → map → derive**, per the reference implementation
    `modules/batches/data/batches.ts`. **[review]**
18. **The enum bridge lives in the mapper, not components.** `DB_TO_UI_STAGE` is a total map — a new
    DB enum variant must fail compilation until its UI treatment is chosen. **[types]**
19. **Data functions return discriminated snapshots** (`ok` / `sync-failed` / `unconfigured`).
    `unconfigured` falls back to mocks silently; `sync-failed` **must** surface the sync-failed
    banner. **[review]**
20. **After any migration: regenerate `database.types.ts`, then update affected mappers and domain
    types.** New migrations are additive; `supabase/migrations/20260528160300_create_tenant_scoped_schema.sql`
    is canonical. **[review]**

## 4. Design system (spec-mandated)

21. **No emoji anywhere in UI.** Icons are `@tabler/icons-react` line icons. **[review]**
22. **IBM Plex fonts; semantic color tokens only** (`app/globals.css`, `app/design-system.css`) —
    never raw hex in components. **[review]**
23. **Status is conveyed by text + icon, never color alone.** WCAG 2.2 AA target. **[review]**
24. **Every data screen implements all six states:** loading, empty, no-results, error/sync-failed,
    permission-denied, stale-data. Screens with relative dates show an exact "Data as of"
    timestamp. **[review]**
25. **Reuse existing primitives** (`BatchCard`, `BatchModal`, `StatusBadge`, `LifecyclePipeline`,
    `EmptyState`, `InfoCallout`, …) rather than creating parallels. **[review]**
26. **Default to Server Components**; client islands only for interactivity. **[review]**

## 5. Copy and product framing

27. **UI copy must never imply official TESDA approval or submission.** This is an internal working
    layer; TESDA SIS/T2MIS/BSRS remain authoritative. **[review]**

## 6. Do-not-edit directories

28. **`assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/` are ported verbatim** from the
    design bundle and excluded from lint/build. Edit the source design files instead, or confirm
    with the user first. **[hook]** (`.claude/hooks/protect-static-dirs.sh`)
29. **`FIGMA FILES/`, `diagrams/`, `.design-sync/` are design artifacts, not app code.** **[review]**

## 7. Docs precedence

30. **`docs/adr/ADR-001-billing-and-domain-model.md` supersedes** any conflicting
    "billing = preparation signal only" wording in the PRD/TRD.
    **`docs/adr/ADR-003-billing-packet-queue.md` amends ADR-001 §4.**
    **Consult the ADRs before changing schema or billing math.** **[review]**
31. Otherwise: `docs/MASTER_PRD_SRS.md` (product) → `docs/TRD.md` (engineering) →
    `docs/IMPLEMENTATION_PLAN.md` (phasing).

## 8. Git / workflow

32. **Create issues on one side only** — Linear team `TES` two-way syncs with this GitHub repo, so
    creating on both produces duplicate pairs. **[review]**
33. **Branch names follow Linear's `klynejoshua13/tes-NN-…` convention.** **[review]**

## 9. Testing (when the runner exists)

34. There is **no test runner yet** — `pnpm test` is a placeholder. Standing up Vitest is Phase 0.4
    of `docs/IMPLEMENTATION_PLAN.md`.
35. When tests exist: **mappers and module `domain/` layers are unit-tested with fixed as-of
    dates**; **RLS/tenant-isolation tests run against real Supabase, no mocks.** **[review]**

## 10. Agent conduct

36. **Never execute statements against the live Supabase project without explicit user
    permission, or an agreed plan that covers it.** Covers `execute_sql` (**including
    read-only `select`s** — the tool is denied, not the statement kind), `apply_migration`,
    branch create/merge/reset, and edge-function deploys, by any route: the MCP server, the
    CLI (`db push`, `db reset`, `migration up`), or `psql`. State exactly what will run and
    why, then wait. There is one hosted project and no staging, so an unreviewed statement
    lands on real tenant data. **[deny]** (`.claude/settings.json` `permissions.deny`)

    Schema questions should be answered from the checked-in migrations and
    `lib/supabase/database.types.ts` first. The read-only introspection tools
    (`list_tables`, `list_migrations`, `get_advisors`, `search_docs`) remain available for
    what those cannot answer — note that `list_tables` row counts are `reltuples` planner
    estimates, not counts.

---

## Locked domain facts

Not rules about code, but constants that code must not contradict:

- progress = `sessions_held / total_sessions` (nominal hours ÷ 8, snapshotted on the batch)
- a scholar with **≥5 absences is ineligible**
- **one RQM code = one batch** (NTP authorization lives on the batch)
- **ULI is the permanent learner key**
- tenant context lives in the **URL path segment**
- alerts are **computed on read** — no cron, no email
- billing is a **document-generating engine** (TSF/Allowance, Training Cost, Entrepreneurship as
  populated `.docx`; Assessment Fee is out of scope)
- packet lifecycle: `draft → ready → generated → submitted → settled` (ADR-003)
