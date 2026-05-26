# Training Compliance System — Design System

> **TESDA Farm School Scholarship Compliance Dashboard · v1.0**
> Single source of truth for visual and interaction decisions across the dashboard.

The Training Compliance System (TCS) is the internal operations dashboard used by TESDA farm school and TVI coordinators to manage government-funded training programs. The system tracks three concurrent batches (47 scholars total in the 2026 cycle) through a six-stage compliance lifecycle: **AOU → NTP → TIP → Training → Assessment → Billing**.

Built for one job: **a coordinator opening this dashboard should know immediately which batch needs attention** — without reading a single word.

---

## Sources & origin

This design system was authored from a complete v1.0 specification document (`uploads/training-compliance-design-system.md`). Every token, component, and rule in this folder traces back to a section of that spec. Treat the spec as canonical; this folder is its operational expression as code + preview cards + a UI kit.

- **Spec doc:** `uploads/training-compliance-design-system.md` (also included)
- **Codebase / Figma:** none attached. The UI kit is built directly against the spec, not against a real implementation.
- **Real-world context referenced in the spec:** 3 batches (BAT-1 AKB Technical, BAT-2 J3ed Farm, BAT-3 Nenita Farm), 47 scholars, 3 trainers (Archelyn Gagula, Julius Maravilla, Agustin Pudadera III), configurable TESDA scholarship programs, NC I / NC II qualifications, BSRS approval flow.

---

## What's in this folder

| Path                  | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `README.md`           | This file. Brand, content, visual, iconography, index.                 |
| `ARCHITECTURE.md`     | Product architecture alignment for the farm school scholarship system. |
| `SKILL.md`            | Agent-skill manifest — load this to design with the brand.             |
| `colors_and_type.css` | Every token from spec §3, §2, §4, §5, §6, §12 as CSS variables.        |
| `assets/logo.svg`     | TCS wordmark (square mark + dashboard subtitle).                       |
| `assets/mark.svg`     | TCS mark (square only, for favicons / tight spaces).                   |
| `assets/icons/`       | Tabler icon subset — the spec's primary icon library.                  |
| `preview/`            | Card files that populate the Design System tab.                        |
| `ui_kits/admin/`      | Admin dashboard UI kit — components + clickable `index.html`.          |

## Architecture alignment

This folder is **Design System v0**, not the full production application. The production target is a multi-tenant TESDA Farm School Scholarship Compliance Manager with configurable scholarship programs, document requirements, billing rules, and tenant-scoped data.

The static UI kit still uses TWSP and CFSP sample data in places to demonstrate visual states. Treat those as demo records only. Production code should use a Scholarship Program Catalog and should not hard-code TWSP or CFSP as the only programs.

See `ARCHITECTURE.md` before using this design system as the base for application implementation.

---

## Content fundamentals

The voice of this system is **administrative, exact, never decorative**. It's a tool for moving government funds through a compliance pipeline — copy reads like a competent operations coordinator, not a marketing site.

### Voice rules

- **Direct and structural.** "Training ongoing — Day 31 of 42." Not "Looking good! 🎯". No exclamation marks. No "we" or "you" — the dashboard refers to data, not people.
- **Title Case for nouns that are data-system terms.** *Batch*, *Scholar*, *Trainer*, *Billing Deadline*, *Notice to Proceed (NTP)*, *Assessment*, *BSRS*, *NC II*. These are proper nouns inside the operational domain.
- **Sentence case for everything else** — buttons (`Export report`, not `Export Report`), inline text, section labels.
- **No emoji. Anywhere.** Icons carry semantic weight; emoji read as consumer-app delight.
- **Always include the unit.** "31 days", "Day 31 of 42", "71.4%". Naked numbers are forbidden in coordinator-facing text.
- **Abbreviations are explained on first use, then used everywhere.** Scholarship Program, Program Code, Funding Source, NTP, TIP, AOU, BSRS, NC I/II. The dashboard assumes a coordinator audience — once defined in a tooltip, the system uses the abbreviation.
- **Auto-remarks are imperative-mode summaries.** Not "This batch is doing well." Instead: "Training ongoing — Day 31 of 42. Earliest billing deadline."

### Sample copy

| Surface              | Example                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| Page title           | Training Batch Manager                                                 |
| Tab labels           | Batch Cards · Table View · Analytics · Activity Log                    |
| Metric card label    | TOTAL BATCHES · TOTAL SCHOLARS · AVG PROGRESS · EARLIEST BILLING       |
| Metric sub-label     | All training ongoing · 15 · 15 · 17 per batch                          |
| Batch auto-remark    | Training ongoing — Day 31 of 42. Earliest billing deadline.            |
| Empty assessment     | Assessment pending. Schedule after training completion.                |
| Empty docs           | No documents attached. Link in Notion then re-sync.                    |
| Error toast          | Could not save assessment date. Retry, or check connection.            |
| Confirm dialog title | Mark assessment done for BAT-1?                                        |

### What never appears in copy

- "Awesome", "Great job", "🎉", "Let's go"
- Vague urgency words: "soon", "shortly", "in a bit"
- "Click here", "tap here" — links are described by what they go to
- Sentences ending in "!"
- Branded mascot language

---

## Visual foundations

### Surfaces & background

The page sits on **warm off-white** (`#F5F4F0`), not stark white. Cards are crisp `#FFFFFF`; recessed surfaces (alt table rows, input fields, sidebars) drop to `#EEECEA`. There is no full-bleed imagery, no gradient backgrounds, no patterns, no textures — the system is built on flat warm neutrals with structure delivered by 1px borders.

### Color logic

Every color carries **one specific semantic meaning**, applied 100% consistently. Red = critical billing (<7 days) or error. Amber = warning (7–21 days) or pending. Green = completed / approved / on-track. Blue = informational and active navigation. Program badge colors are configured per scholarship program. Purple = NC level indicators only.

Never use a color "because it looks good." Decorative accents are forbidden by spec rule 3.3.

### Typography

**IBM Plex Sans** for everything readable (UI labels, body, headings). **IBM Plex Mono** for everything *machine-readable inside the dashboard* — batch IDs, dates, percentages, day counts, NC levels, billing deadlines, all metric card values. The mono shift visually separates data from labels at a glance. Body is **13px** (`text-base`); page titles are **20px**; metric values are **24px mono semibold**.

### Spacing & rhythm

4px base unit. 16px is card padding. 24px is the gap between batch cards. 32px between page sections. The system **never** uses a pure 8pt grid — half-steps are required for the data density.

### Borders & radius

- 1px borders (`#D8D6D0`) carry the structure — shadows are minimal.
- Border radius caps at **12px**. Cards and inputs are 8px, badges and pills are 6px, sub-rows are 3px. Nothing larger — values ≥ 16px read as consumer-app design.
- **Urgency left border** (3px) on batch cards tells you the tier before you read a word: red / amber / green / muted.

### Shadows

Cards rest at `shadow-sm` (1px down, 2px blur, 6% opacity); hover bumps to `shadow-md`; modals use `shadow-lg`. **No colored shadows. No glows. Never.**

### Hover / press / focus states

- **Hover** — background steps one tier darker (`surface` → `surface-raised`); transitions in 150ms; never a scale or lift on hover for cards.
- **Press** — background two tiers darker; buttons scale to `0.98`.
- **Focus** — 2px solid `color-blue` outline with 2px offset (keyboard nav, never `outline: none`).
- **Disabled** — 50% opacity, `cursor: not-allowed`.

### Motion

Functional, not decorative. Pipeline active step pulses every 2s. Progress bars animate from 0% to value on mount (400ms spring), once. Skeletons shimmer at 1.5s. Reduced-motion preference disables everything. Easing tokens: `ease-standard` (most), `ease-enter` (entrances), `ease-exit` (exits), `ease-spring` (progress fill only).

### Transparency & blur

The system uses neither. There are no glass cards, no backdrop blurs, no `rgba` overlays except the modal scrim (`rgba(0,0,0,0.4)`).

### Cards

White surface, 1px `#D8D6D0` border, 8px radius, `shadow-sm`. The batch card has a **3px urgency-tier left border** that overrides the regular border on that edge. No card uses a colored fill or gradient. Card padding is 16px; section gaps inside a card are 12–20px.

### Layout fixed elements

- Topbar: full-width, logo + last-synced badge, sticky.
- Metrics row: 5 equal columns, full-width, no scroll.
- Tab bar: underline style (never pill), `36px` tall.
- Content max-width: **1080px** centered with 24px page padding.
- No sidebar in the default layout; navigation is the tab bar.

### Imagery

There is none. The product is data + status. No photos, no illustrations, no decorative SVGs. The only graphical elements are: the logo mark, Tabler icons, and Recharts data visualizations.

---

## Iconography

### Library: Tabler Icons

Tabler is the spec's required icon library — 2px stroke, MIT licensed, matches IBM Plex Sans weight visually. **Never substitute** Heroicons (too round, consumer feel), Material Icons (too Google), Font Awesome (too heavy), or Lucide.

A curated subset of Tabler icons is included in `assets/icons/` for offline reference. In production HTML, prefer the CDN: `https://unpkg.com/@tabler/icons-react`. The icons in this folder use the canonical Tabler 24×24 viewBox with `stroke="currentColor"` so they inherit color via CSS.

### Sizes

| Context                  | Size | Notes                              |
| ------------------------ | ---- | ---------------------------------- |
| Inline with body text    | 14px | Centered against text baseline     |
| Navigation / tab item    | 16px | Always paired with a label         |
| Metric card label        | 13px | Left of label text                 |
| Button icon              | 14px | Left of button label, `space-1` gap|
| Standalone (no label)    | 18px | Requires a tooltip                 |
| Status indicator in badge| 12px | Inside the 20px-tall badge         |

Icon-to-label gap is always **4px**. Never 0, never 8.

### Semantic icon assignments

Every recurring concept has one icon. The mapping is fixed:

| Concept            | Icon              |
| ------------------ | ----------------- |
| Batch / folder     | `folders`         |
| Trainees           | `users`           |
| Progress / chart   | `chart-dots`      |
| Analytics          | `chart-bar`       |
| Assessment         | `file-check`      |
| Certificate / NC   | `certificate`     |
| Billing / receipt  | `receipt`         |
| Calendar / dates   | `calendar`        |
| Warning / urgent   | `alert-triangle`  |
| Critical / error   | `alert-circle`    |
| Info               | `info-circle`     |
| Complete           | `check`           |
| Pending            | `clock`           |
| Documents          | `file-text`       |
| Search             | `search`          |
| Filter             | `filter`          |
| Export / download  | `download`        |
| Settings           | `settings`        |
| Trainer / person   | `user`            |
| Activity log       | `timeline`        |
| Refresh / sync     | `refresh`         |
| External link      | `external-link`   |
| BSRS approved      | `shield-check`    |
| BSRS not approved  | `shield-off`      |
| TIP conducted      | `presentation`    |
| NTP received       | `file-invoice`    |
| AOU submitted      | `send`            |
| Missing document   | `file-off`        |

### What does NOT appear

- **Emoji** — never used as icons, never used as decoration. The spec is unambiguous.
- **Unicode glyphs** — no ★, ✓, ⚠️ substituted for SVG.
- **PNG icons** — all icons are SVG, `currentColor` strokes.
- **Brand color in icons by default** — icons inherit `color-text-secondary` unless they are status-bearing (a status badge's icon takes the badge's `dk` text color).

---

## Caveats / things I had to interpret

- **Logo.** No real TCS logo was provided. The `assets/logo.svg` is a small placeholder mark (three descending bars with a green check, inside a navy-blue rounded square). **Replace with the real TESDA/TVI brand mark when available.**
- **Tabler icons** are written here as canonical 2px-stroke SVGs based on the public Tabler library (MIT). If you need icons not in `assets/icons/`, add them via `@tabler/icons-react` or copy from the Tabler site — do not redraw by hand.
- **IBM Plex fonts** are loaded from Google Fonts CDN in HTML — no local font files are bundled. Switch to self-hosted webfonts before production.
- **Surfaces covered:** only the Admin Dashboard. The spec does not describe a learner-facing surface; one is not built.

---

## Index — what to read next

1. **`SKILL.md`** — read this first if you are an agent or designer joining the system.
2. **`colors_and_type.css`** — every token. Import this stylesheet on any new HTML file.
3. **`preview/`** — render examples for type, color, spacing, shadows, components.
4. **`ui_kits/admin/index.html`** — the four dashboard views built end-to-end: Batch Cards, Table, Analytics, Activity Log.
5. **`ui_kits/admin/*.jsx`** — small React components used by `index.html`: `StatusBadge`, `ProgressBar`, `MetricCard`, `BatchCard`, `LifecyclePipeline`, `UrgencyIndicator`, `DataTableRow`, `TrainerAvatar`, `DocumentLinkRow`, `InfoCallout`, `TabBar`, `EmptyState`.
6. **`uploads/training-compliance-design-system.md`** — the canonical spec. Re-read before making any visual decision not covered here.
