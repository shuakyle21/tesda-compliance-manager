# OpenWiki instructions — TVI-CAMS

A code wiki for TVI-CAMS: an internal multi-tenant Next.js 16 / React 19 / Supabase /
Clerk compliance working layer for TVI schools running TESDA TWSP/CFSP scholarship
batches. It tracks batch lifecycle, documents, attendance, LAMR evidence, and generates
official TESDA billing documents. The audience is a coding agent about to change this
repository safely.

Focus on usage and business rules: how to work in the codebase, the domain rules (batch
lifecycle, billing, attendance, documents, tenancy), the data contract, and the
invariants that gate a change. Visual design (CSS, tokens, fonts, colours, icons, layout
assets) is out of scope; the rule-level design constraints live in `RULES.md` §4 and are
cited from there, never re-derived from stylesheets.

TESDA SIS/T2MIS/BSRS remain the authoritative systems; this app is an internal working
layer only. Never write copy implying official approval or submission.

`CLAUDE.md` (architecture and the why) and `RULES.md` (enforced invariants, each with its
enforcement level) are the primary map. `docs/adr/` wins over `docs/MASTER_PRD_SRS.md` and
`docs/TRD.md` wherever they conflict — ADR-001 (billing as a document-generating engine),
ADR-003 (billing packet queue, amends ADR-001 §4), ADR-006 (platform admin and school
registry, reverses PRD FR-02), ADR-007 (attendance dropout rule, replaced the ≥5-absence
rule). Document the ADR precedence chain; never the superseded PRD wording.

## Page set — fixed, do not expand

Exactly these four pages. Do not plan a fifth, do not rename, do not delete, and do not
plan generated `index.md` pages:

- `/openwiki/quickstart.md` — task → page routing, the verification loop, the invariants
  that gate every change.
- `/openwiki/architecture/overview.md` — stack, request path, the Clerk → proxy →
  `requireAuthenticatedUser()` → anon-key client → RLS auth chain, the
  `app → modules → shared → lib/supabase` import model, a one-line-per-module catalog,
  docs precedence. This page is the map: delegate all depth to its neighbours and link
  them. Target 200 lines; it is currently an unfinished stub and will be authored fresh.
- `/openwiki/architecture/module-boundaries-and-data-pattern.md` — the ESLint-enforced
  import direction, private `data/` layers, fetch → map → derive, the discriminated
  snapshot union and its guard ordering, the enum bridge as a total map.
- `/openwiki/architecture/data-model-and-rls.md` — schema, enums, the migration ledger,
  the `database.types.ts` regeneration contract, `app_private.*` RLS helpers and the
  per-table policy map.

## Retired page — `design-system.md`

`/openwiki/architecture/design-system.md` was deliberately removed. Do not recreate it or
any other page about visual design. `quickstart.md`, `overview.md`,
`data-model-and-rls.md`, and `module-boundaries-and-data-pattern.md` still link to it:
delete those links (and any table row that only routes to it), and where a pointer to UI
rules is still needed, link `RULES.md` §4 instead. Removing a dead link is a permitted
edit on the grandfathered pages below.

## Existing oversized pages are grandfathered

`data-model-and-rls.md` (698 lines) and `module-boundaries-and-data-pattern.md` (452
lines) exceed the ceiling below. Do **not** split them, delete them, or restructure them
in this run. Correct outright inaccuracies and retract Claims that current source no
longer supports, but do not add new material to either page and do not rewrite sections
that are still accurate. Leaving an accurate long page untouched is the correct outcome.

## Out of scope — do not read, document, or cite

- `node_modules/`, `.next/`, `test-results/`, `pnpm-lock.yaml`, `tsconfig.tsbuildinfo`.
- Design-bundle and handoff directories, ported verbatim and excluded from lint/build:
  `assets/`, `preview/`, `screenshots/`, `ui_kits/`, `uploads/`, `FIGMA FILES/`,
  `diagrams/` (at any depth, including `docs/diagrams/`), `.design-sync/`.
- Visual design sources: every `*.css` file, `docs/design/`, `docs/DESIGN.md`,
  `docs/UI_UX_MODAL_AUDIT.md`, `tremor.config.mjs`, `postcss.config.mjs`, `public/`, and
  binary assets (images, fonts, PDFs). These are token-heavy and carry no business rules.
- `wiki/` — hand-maintained Obsidian vault notes whose titles duplicate this wiki. Never
  ground a Claim in it.
- `.claude/skills/` — vendored third-party skill reference docs, not app code.
- Any `.env` file other than `.env.example`, and `requests/http-client.private.env.json`.
- Generated `lib/supabase/database.types.ts` — document the regeneration contract, never
  the generated content.
- Module stubs holding only a README naming their FR (currently `modules/attendance/`,
  `modules/lamr/`, `modules/notifications/`). One line each in the overview's module
  catalog; no sections, no pages.
- Per-file inventories of `app/`, `shared/ui/`, or `tests/unit/`.

## Per-page scope — copy this block verbatim into every page's `instructions` array

1. Ceiling for new or rewritten pages: 200 lines of body and 25 Claims. A page
   approaching either is over-scoped — cut breadth, not evidence. Pages listed as
   grandfathered above are exempt and must not be split.
2. Explain mechanism, invariants, and failure modes. Do not restate table columns, prop
   lists, token values, or file trees that the source already states plainly.
3. Ground every Claim in application source, migrations, `eslint.config.mjs`, tests, or
   `CLAUDE.md`/`RULES.md`/`docs/adr/`. Never in `wiki/`, `.claude/skills/`, or an excluded
   directory.
4. Cite invariants by their `RULES.md` rule number and the ADR that locks them.
5. Stay inside your own page's topic. Link a neighbour rather than re-explaining it.
6. Prefer 5–10 targeted greps and partial reads over whole-file reads of large files.
7. Never grow a page past its ceiling to absorb new material, and never widen a page's
   purpose. The four-page set is the budget and it is already spent.
