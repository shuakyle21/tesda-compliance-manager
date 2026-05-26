# Training Compliance System — Design Reference
### TESDA Farm School Scholarship Compliance Dashboard · v1.0

> **Single source of truth** for all visual and interaction decisions in the Training Compliance System. Covers design principles, tokens, components, layout, motion, and accessibility.
>
> **Key deviations from spec** are marked with `⚠ DEVIATION` and reflect decisions made during implementation. When spec and deviation conflict, the deviation wins — `colors_and_type.css` and `ui_kits/admin/` are the live ground truth.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Voice & Copy Rules](#2-voice--copy-rules)
3. [Typography](#3-typography)
4. [Color System](#4-color-system)
5. [Spacing & Grid](#5-spacing--grid)
6. [Elevation & Shadows](#6-elevation--shadows)
7. [Border & Radius](#7-border--radius)
8. [Iconography](#8-iconography)
9. [Component Library](#9-component-library)
10. [Data Visualization](#10-data-visualization)
11. [Layout System](#11-layout-system)
12. [States & Feedback](#12-states--feedback)
13. [Motion & Animation](#13-motion--animation)
14. [Accessibility](#14-accessibility)
15. [Design Tokens (Code)](#15-design-tokens-code)
16. [Figma File Structure](#16-figma-file-structure)
17. [File Index](#17-file-index)

---

## 1. Design Principles

Five principles govern every decision. When two options compete, the one listed first wins.

### 1.1 Status at a Glance
A coordinator opening this dashboard has one job: know immediately which batch needs attention. Every screen must answer *"what needs action right now?"* without requiring any interaction. Urgency must be visible before the user reads a single word.

**Implication:** Color, position, and size all communicate status. The most urgent batch always appears first. Critical deadlines are never smaller than secondary information.

### 1.2 Density Without Crowding
Three batches, six lifecycle stages, five metrics, four charts — this is a data-dense system. But density does not mean cramped. Every element has breathing room; it simply does not have *excess* room.

**Implication:** 13px body text, 4pt base grid, 40px table rows, 16px card padding. Never use 8pt-only grids — half-steps are required for compliance tooling.

### 1.3 Semantic Color Only
Every color in this system carries one specific meaning. That meaning is applied 100% consistently. Red always means deadline danger. Green always means complete or approved. Amber always means warning. These meanings are never violated for aesthetic reasons.

**Implication:** No decorative gradients, no "accent" colors used arbitrarily, no color used just because it looks good in a particular context.

### 1.4 Government Trustworthiness
This system is used by TESDA farm school and TVI coordinators processing government-funded program compliance. The visual language must communicate reliability, structure, and authority — not startup energy, not consumer app delight.

**Implication:** Flat surfaces over gradients. Structured layouts over organic asymmetry. Neutral backgrounds over bold colors. Rounded corners ≤ 12px. No playful illustrations or marketing-style copy.

### 1.5 Operational, Not Presentational
This is a tool, not a report. Every design decision is evaluated by whether it helps the user *do* something — not by whether it looks impressive in a screenshot.

**Implication:** Navigation labels are always visible (never icon-only). Empty states explain what to do next. Error states give the exact fix. Loading states never block primary content.

---

## 2. Voice & Copy Rules

The voice of this system is **administrative, exact, never decorative**. It's a tool for moving government funds through a compliance pipeline — copy reads like a competent operations coordinator, not a marketing site.

### Writing rules

- **Direct and structural.** "Training ongoing — Day 31 of 42." Not "Looking good! 🎯". No exclamation marks. No "we" or "you" — the dashboard refers to data, not people.
- **Title Case for data-system nouns.** *Batch*, *Scholar*, *Trainer*, *Billing Deadline*, *Notice to Proceed (NTP)*, *Assessment*, *BSRS*, *NC II*. These are proper nouns inside the operational domain.
- **Sentence case for everything else** — buttons (`Export report`, not `Export Report`), inline text, section labels.
- **No emoji. Anywhere.** Icons carry semantic weight; emoji read as consumer-app delight.
- **Always include the unit.** "31 days", "Day 31 of 42", "71.4%". Naked numbers are forbidden in coordinator-facing text.
- **Abbreviations are explained on first use, then used everywhere.** Scholarship Program, Program Code, Funding Source, NTP, TIP, AOU, BSRS, NC I/II. Once defined in a tooltip, the abbreviation is used consistently.
- **Auto-remarks are imperative-mode summaries.** Not "This batch is doing well." Instead: "Training ongoing — Day 31 of 42. Earliest billing deadline."

### Sample copy

| Surface | Example |
|---|---|
| Page title | Training Batch Manager |
| Tab labels | Batch Cards · Table View · Analytics · Activity Log |
| Metric card label | TOTAL BATCHES · TOTAL SCHOLARS · AVG PROGRESS · EARLIEST BILLING |
| Batch auto-remark | Training ongoing — Day 31 of 42. Earliest billing deadline. |
| Empty assessment | Assessment pending. Schedule after training completion. |
| Empty docs | No documents attached. Link in Notion then re-sync. |
| Error toast | Could not save assessment date. Retry, or check connection. |
| Confirm dialog title | Mark assessment done for BAT-1? |

### What never appears in copy

"Awesome", "Great job", "🎉", "Let's go" — vague urgency words like "soon" or "shortly" — "Click here" or "tap here" — sentences ending in "!" — branded mascot language.

---

## 3. Typography

### Type families

| Role | Family | Rationale |
|---|---|---|
| UI / body | **IBM Plex Sans** | Designed for data interfaces. Government-neutral tone. Excellent legibility at 12–13px. |
| Monospace | **IBM Plex Mono** | Same design family. Used for IDs, dates, codes, and numerical data to enforce visual distinction from labels. |

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
```

**Never use:** Inter, Geist, Roboto, Arial, or any system font stack as the primary typeface.

### Type scale

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `text-2xs` | 10px | 14px | 400 | Footnotes, version numbers |
| `text-xs` | 11px | 15px | 400 / 500 | Badge labels, table metadata, secondary field labels |
| `text-sm` | 12px | 17px | 400 | Table cell content, sub-requirement text |
| `text-base` | 13px | 19px | 400 | Primary body text, card descriptions, form labels |
| `text-md` | 14px | 20px | 500 | Card titles, section sub-labels |
| `text-lg` | 16px | 22px | 500 / 600 | Section headings, panel titles |
| `text-xl` | 20px | 26px | 600 | Page-level headings |
| `text-2xl` | 24px | 30px | 600 | Metric card values |
| `text-3xl` | 32px | 38px | 300 | Hero / cover display (print only) |

### Type roles

```
Page title          text-xl · 600 · text-primary
Section heading     text-lg · 600 · text-primary
Card title          text-md · 500 · text-primary
Body / description  text-base · 400 · text-secondary
Field label         text-xs · 500 · text-muted · uppercase · tracking-wide
Table header        text-xs · 500 · text-muted · uppercase · tracking-wide
Table cell          text-sm · 400 · text-primary
Badge text          text-xs · 500 · mono · tracking-wide
Metric value        text-2xl · 600 · text-primary · mono
Metric label        text-xs · 400 · text-muted · uppercase
Date / ID / code    text-sm · 400 · mono · text-secondary
Remark / note       text-sm · 400 · italic · text-muted
```

### Monospace usage rules

Use `IBM Plex Mono` for: Batch IDs (`BAT-1`), dates (`Apr 21`), numeric progress values (`71.4%`, `Day 31 of 42`), billing deadlines, NC level indicators (`NC II`), requirement IDs, and all metric card values.

Do **not** use monospace for: trainer names, qualification titles, remarks or descriptive text, navigation labels.

---

## 4. Color System

### Neutral palette

| Token | Hex | Usage |
|---|---|---|
| `color-bg` | `#F5F4F0` | Page background — warm off-white, never clinical |
| `color-surface` | `#FFFFFF` | Cards, panels, modals, dropdowns |
| `color-surface-alt` | `#EEECEA` | Alternating table rows, input backgrounds, sidebar |
| `color-surface-raised` | `#FAF9F6` | Hover state for cards |
| `color-border` | `#D8D6D0` | Default borders, dividers, input edges |
| `color-border-strong` | `#B0AEA8` | Section dividers, active input borders |
| `color-border-faint` | `#E8E6E2` | Subtle separators, card internal dividers |

### Text palette

| Token | Hex | Usage |
|---|---|---|
| `color-text-primary` | `#18180F` | Headlines, card titles, primary labels |
| `color-text-secondary` | `#5A5950` | Body text, descriptions, form labels |
| `color-text-muted` | `#97968E` | Placeholders, metadata, timestamps |
| `color-text-disabled` | `#C4C2BC` | Disabled inputs, inactive navigation |
| `color-text-inverse` | `#F5F4F0` | Text on dark backgrounds |

### Semantic colors

Each semantic color has five levels: base, light background, dark text, border tint, and hover state.

**Blue — Informational / Active Navigation**

| Token | Hex | Usage |
|---|---|---|
| `color-blue` | `#185FA5` | Informational badge, informational icons, active tab underline |
| `color-blue-lt` | `#E6F1FB` | Informational badge background, info callout background |
| `color-blue-dk` | `#0C447C` | Informational badge text, info callout text |
| `color-blue-border` | `#B5D0EE` | Info callout border |
| `color-blue-hover` | `#D4E8F8` | Informational badge hover |

**Teal — Configurable Program Accent**

| Token | Hex | Usage |
|---|---|---|
| `color-teal` | `#0F6E56` | Configured program badge |
| `color-teal-lt` | `#E1F5EE` | Configured program badge background |
| `color-teal-dk` | `#085041` | Configured program badge text |
| `color-teal-border` | `#9FE1CB` | Configured program badge border |
| `color-teal-hover` | `#C8EFE3` | Configured program badge hover |

**Green — Completed / Approved / On Track**

| Token | Hex | Usage |
|---|---|---|
| `color-green` | `#3B6D11` | Completed status, BSRS Approved, on-track progress |
| `color-green-lt` | `#EAF3DE` | Completed badge background |
| `color-green-dk` | `#27500A` | Completed badge text |
| `color-green-border` | `#B5D98A` | Success callout border |
| `color-green-hover` | `#D5EBB8` | Completed badge hover |

**Amber — Warning / 7–21 Days / Pending** ⚠ DEVIATION: hex values re-tinted warmer/more orange than spec

| Token | Hex | Usage |
|---|---|---|
| `color-amber` | `#C7600F` | Warning deadlines, mid-range urgency |
| `color-amber-lt` | `#FCE6CC` | Warning badge background |
| `color-amber-dk` | `#7A3806` | Warning badge text |
| `color-amber-border` | `#F2B673` | Warning callout border |
| `color-amber-hover` | `#F8D4A8` | Warning badge hover |

**Red — Critical / < 7 Days / Urgent Action** ⚠ DEVIATION: hex values re-tinted more vivid/urgent than spec

| Token | Hex | Usage |
|---|---|---|
| `color-red` | `#C81F1F` | Critical deadline badges, error states |
| `color-red-lt` | `#FCE4E4` | Critical badge background |
| `color-red-dk` | `#8B1414` | Critical badge text |
| `color-red-border` | `#ED9999` | Error callout border |
| `color-red-hover` | `#F6C2C2` | Critical badge hover |

**Purple — NC Level Indicators**

| Token | Hex | Usage |
|---|---|---|
| `color-purple` | `#534AB7` | NC II badges |
| `color-purple-lt` | `#EEEDFE` | NC II badge background |
| `color-purple-dk` | `#3C3489` | NC II badge text |

### Color application rules

```
Rule 1:  Red is ONLY for billing deadlines <7 days and error states. Never decorative.
Rule 2:  Green is ONLY for completed, approved, on-track (>75%), and NC issued. Never branding.
Rule 3:  Amber is ONLY for warning states (7–21 days), pending approvals, moderate urgency.
Rule 4:  Blue is reserved for informational callouts and active navigation. It is not a hard-coded scholarship program color.
Rule 5:  Program badge colors come from scholarship program configuration. They must not override red, amber, or green status meanings.
Rule 6:  Purple is exclusively for NC level indicators (NC I, NC II, NC III).
Rule 7:  All text on colored backgrounds must meet WCAG AA contrast (4.5:1 normal, 3:1 large).
Rule 8:  Progress bars use green (>75%), blue (25–75%), amber (<25%). Never a flat single color.
```

### Urgency color system

This is the most important color rule in the system. Billing deadlines drive the urgency tier across the entire batch card.

```
CRITICAL   Days remaining ≤ 6    →  color-red    border, badge, deadline text
WARNING    Days remaining 7–21   →  color-amber  border, badge, deadline text
ON TRACK   Days remaining > 21   →  color-green  border, badge, deadline text
COMPLETED  Training done         →  color-green  full card muted state
```

Urgency tier is computed once at data fetch and stored — never recomputed in render functions.

---

## 5. Spacing & Grid

### Base unit: 4px

All spacing values are multiples of 4px. Half-steps (2px) are permitted only for internal component micro-spacing.

### Spacing scale

| Token | Value | Usage |
|---|---|---|
| `space-0.5` | 2px | Icon-to-text gap, badge internal gap |
| `space-1` | 4px | Tight internal padding, between inline badges |
| `space-2` | 8px | Component internal padding (small) |
| `space-3` | 12px | Card section gaps, between rows in a detail panel |
| `space-4` | 16px | Card padding, form field internal padding |
| `space-5` | 20px | Between card header and card body |
| `space-6` | 24px | Between batch cards |
| `space-8` | 32px | Between page sections |
| `space-10` | 40px | Section top/bottom padding |
| `space-12` | 48px | Page section breaks |
| `space-16` | 64px | Maximum breathing room (used sparingly) |

### Layout grid

```
Page max-width:     1080px
Page padding:       24px (mobile: 16px)
Column gutter:      16px
Column count:       12

Metric cards:       5 equal columns
Batch cards:        1 column (full width, stacked)
Analytics charts:   2 columns (span 6 each)
Table:              Full width (span 12)
Sidebar (if used):  240px fixed
```

### Component sizing

| Component | Height | Notes |
|---|---|---|
| Table row | 40px | Compact density standard |
| Input field | 32px | Never 36px or 40px |
| Button (primary) | 32px | |
| Button (small) | 26px | Used inside table rows |
| Badge / pill | 20px | Status badges |
| Navigation tab | 36px | Tab bar height |
| Avatar (small) | 24px | Trainer avatar in table |
| Avatar (medium) | 32px | Trainer avatar in batch card |
| Progress bar | 6px | Card variant |
| Progress bar (table) | 4px | Mini inline variant |

---

## 6. Elevation & Shadows

Structure comes from borders and background contrast, not dramatic elevation.

| Level | Token | Value | Usage |
|---|---|---|---|
| 0 | `shadow-none` | none | Default surfaces, table rows |
| 1 | `shadow-sm` | `0 1px 2px rgba(15,14,11,0.06)` | Cards at rest |
| 2 | `shadow-md` | `0 2px 6px rgba(15,14,11,0.08), 0 1px 2px rgba(15,14,11,0.04)` | Cards on hover |
| 3 | `shadow-lg` | `0 4px 16px rgba(15,14,11,0.10), 0 2px 4px rgba(15,14,11,0.06)` | Modals, tooltips |

Rules: no `box-shadow` with color tints. Modals use `shadow-lg` plus a `rgba(0,0,0,0.4)` backdrop. Table rows use no shadow.

---

## 7. Border & Radius

### Border widths

| Token | Value | Usage |
|---|---|---|
| `border-thin` | 0.5px | Subtle dividers, table row separators |
| `border-base` | 1px | Card borders, input borders, all standard components |
| `border-strong` | 2px | Active input focus ring, urgent card left accent |

### Border radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 3px | Sub-requirement rows, inner table elements |
| `radius-md` | 6px | Badges, pills, tags |
| `radius-lg` | 8px | Cards, panels, input fields, buttons |
| `radius-xl` | 12px | Modals, popovers |
| `radius-full` | 9999px | Avatar circles, toggle switches |

Nothing uses border-radius above 12px. Values like 16px, 20px, or 24px break the operational/government aesthetic.

### Urgency left border

⚠ DEVIATION: The 3px colored left border on Batch Cards was removed as it felt out of place. Urgency is communicated instead via the urgency badge in the card header and the billing-deadline value color. The same removal applies to InfoCallouts (using a 1px tinted full-perimeter border instead) and warning/critical Metric Cards (using a tinted label icon and sub-label instead).

**Spec §6.3 (for reference):**
```
Critical   →  border-left: 3px solid color-red
Warning    →  border-left: 3px solid color-amber
On Track   →  border-left: 3px solid color-green
Completed  →  border-left: 3px solid color-border
```

---

## 8. Iconography

### Library: Tabler Icons

**Required:** `@tabler/icons-react` — 2px stroke weight, MIT licensed, 500+ relevant icons, matches IBM Plex Sans weight visually.

**Never substitute:** Heroicons (too round), Material Icons (too Google), Font Awesome (too heavy).

A curated SVG subset is available in `assets/icons/` for offline reference.

### Icon sizes

| Context | Size | Notes |
|---|---|---|
| Inline with body text | 14px | Centered against text baseline |
| Navigation / tab item | 16px | Always paired with a label |
| Metric card label | 13px | Left of label text |
| Button icon | 14px | Left of button label |
| Standalone (no label) | 18px | Requires a tooltip |
| Status indicator in badge | 12px | Inside the 20px-tall badge |

Icon-to-label gap is always **4px**. Never 0, never 8.

### Semantic icon assignments

| Concept | Icon |
|---|---|
| Batch / folder | `ti-folders` |
| Trainees / scholars | `ti-users` |
| Progress / chart | `ti-chart-dots` |
| Analytics | `ti-chart-bar` |
| Assessment | `ti-file-check` |
| Certificate / NC | `ti-certificate` |
| Billing / receipt | `ti-receipt` |
| Calendar / dates | `ti-calendar` |
| Warning / urgent | `ti-alert-triangle` |
| Critical / error | `ti-alert-circle` |
| Info | `ti-info-circle` |
| Complete | `ti-check` |
| Pending | `ti-clock` |
| Documents | `ti-file-text` |
| Search | `ti-search` |
| Filter | `ti-filter` |
| Export / download | `ti-download` |
| Settings | `ti-settings` |
| Trainer / person | `ti-user` |
| Activity log | `ti-timeline` |
| Refresh / sync | `ti-refresh` |
| External link | `ti-external-link` |
| BSRS approved | `ti-shield-check` |
| BSRS not approved | `ti-shield-off` |
| TIP conducted | `ti-presentation` |
| NTP received | `ti-file-invoice` |
| AOU submitted | `ti-send` |
| Missing document | `ti-file-off` |

Icons inherit `color-text-secondary` unless they are status-bearing. **No emoji. No Unicode glyphs. No PNG icons.**

---

## 9. Component Library

### 9.1 Status Badge

**Purpose:** Communicate categorical status at a glance.

```
Height:         20px
Padding:        2px top/bottom · 8px left/right
Border-radius:  radius-md (6px)
Font:           text-xs · mono · 500 · tracking-wide
```

| Variant | Background | Text | Usage |
|---|---|---|---|
| `ongoing` | `color-blue-lt` | `color-blue-dk` | Training in progress |
| `completed` | `color-green-lt` | `color-green-dk` | Training finished |
| `upcoming` | `color-amber-lt` | `color-amber-dk` | Not yet started |
| `cancelled` | `color-red-lt` | `color-red-dk` | Cancelled batch |
| `program` | configured light color | configured dark color | Scholarship program |
| `nc-ii` | `color-purple-lt` | `color-purple-dk` | NC II level |
| `nc-i` | `color-amber-lt` | `color-amber-dk` | NC I level |
| `approved` | `color-green-lt` | `color-green-dk` | BSRS Approved |
| `not-approved` | `color-surface-alt` | `color-text-muted` | BSRS not approved |
| `critical` | `color-red-lt` | `color-red-dk` | <7 days deadline |
| `warning` | `color-amber-lt` | `color-amber-dk` | 7–21 days deadline |
| `on-track` | `color-green-lt` | `color-green-dk` | >21 days deadline |

Rules: Never resize a badge to fit more text — truncate. Never stack more than 3 badges horizontally. Badges are never interactive.

---

### 9.2 Progress Bar

**Anatomy:**
```
[progress label row: "Day 31 of 42" .............. "71.4%"]
[track: full width · height 6px · radius-full · color-surface-alt]
  [fill: width = progress% · height 6px · radius-full · semantic color]
```

**Color by completion tier:**

| Tier | Range | Fill Color |
|---|---|---|
| Low | 0–24% | `color-amber` |
| Mid | 25–74% | `color-blue` |
| High | 75–99% | `color-green` |
| Complete | 100% | `color-green` with `color-green-lt` track |

**Variants:** `default` (6px, with label), `mini` (4px, no label, table rows), `card` (6px, label, full width).

Rules: Always show the day count alongside the percentage. Percentage uses `mono` font. Animate fill on initial mount only.

---

### 9.3 Metric Card

**Anatomy:**
```
┌─────────────────────────────┐
│ [icon] LABEL TEXT           │  text-xs · 400 · muted · uppercase
│                             │
│ VALUE                       │  text-2xl · 600 · primary · mono
│                             │
│ Sub-label or change note    │  text-xs · 400 · muted
└─────────────────────────────┘

Padding:        16px all sides
Border:         1px solid color-border
Border-radius:  radius-lg (8px)
Background:     color-surface
Shadow:         shadow-sm
```

**Variants:** `neutral` (default), `warning` (amber accent), `critical` (red accent). ⚠ DEVIATION: accent is applied via tinted label icon and sub-label, not a 3px left border.

**Content:**
```
Card 1:  Total Batches      →  "3"       →  "All training ongoing"
Card 2:  Total Scholars     →  "47"      →  "15 · 15 · 17 per batch"
Card 3:  Avg Progress       →  "56%"     →  variant warning
Card 4:  Earliest Billing   →  "Jun 18"  →  variant critical
Card 5:  NC Issued          →  "0"       →  "Pending — training ongoing"
```

---

### 9.4 Batch Card

**Anatomy (top to bottom):**

```
┌── CARD HEADER ─────────────────────────────────────────────────────┐
│ [Program badge] [Status badge] [Urgency badge]        [Batch ID]   │
│ Batch name (card title · 14px · 500)                               │
│ Qualification (body · 13px · 400 · muted)                          │
└────────────────────────────────────────────────────────────────────┘
┌── CARD BODY (3-column grid) ───────────────────────────────────────┐
│ COL 1 — Trainer & enrollment                                       │
│   [Avatar] Trainer full name                                       │
│   Enrolled scholars count                                          │
│   Training days pattern                                            │
│   TIP conducted badge + date                                       │
│                                                                    │
│ COL 2 — Dates & progress                                           │
│   NTP received date                                                │
│   Training start / end dates                                       │
│   Duration + current day                                           │
│   Progress bar (full width of column)                              │
│                                                                    │
│ COL 3 — Compliance & deadlines                                     │
│   NTP to Start lag (days)                                          │
│   Training report date                                             │
│   Billing deadline (urgency-colored)                               │
│   BSRS exemption badge                                             │
│   Assessment done badge                                            │
└────────────────────────────────────────────────────────────────────┘
┌── LIFECYCLE PIPELINE ──────────────────────────────────────────────┐
│  ● AOU  ──  ● NTP  ──  ● TIP  ──  ◉ TRAINING  ──  ○ ASSESS  ──  ○ BILLING │
└────────────────────────────────────────────────────────────────────┘
┌── AUTO REMARK ─────────────────────────────────────────────────────┐
│ Training ongoing — Day 31 of 42. Earliest billing deadline.        │
└────────────────────────────────────────────────────────────────────┘

Border:         1px solid color-border
Border-radius:  radius-lg (8px)
Background:     color-surface
Shadow:         shadow-sm
```

**States:** `default`, `hover` (shadow-md, surface-raised bg), `expanded` (shows linked documents), `loading` (shimmer), `error` (callout + retry button).

---

### 9.5 Lifecycle Pipeline

**Stages:**
```
1. AOU Submitted  →  2. NTP Received  →  3. TIP Conducted  →  4. Training Ongoing  →  5. Assessment  →  6. Billing
```

**Step states:**
- `done` — filled circle (`color-green`), checkmark icon, green connecting line
- `active` — filled circle (`color-blue`), play icon, pulse animation, muted connecting line
- `pending` — outlined circle (`color-border`), step number inside
- `overdue` — filled circle (`color-red`), warning icon

**Sizing:**
```
Step circle:      18px diameter
Connecting line:  1px height
Step label:       text-2xs · 400 · muted · centered
Step date:        text-2xs · mono · 500 · muted · centered
Pipeline height:  52px total
```

Always show dates for completed steps. Always show "Pending" or the deadline for future steps. The active step pulses at a 2s interval.

---

### 9.6 Urgency Indicator

**Anatomy:**
```
[!] 28 days  →  color-red · icon: ti-alert-triangle · mono value
[⚠] 28 days  →  color-amber · icon: ti-clock · mono value
[✓] 28 days  →  color-green · icon: ti-check · mono value
```

**Variants:** `inline` (batch card), `badge` (table rows), `standalone` (metric card sub-label).

Days value is always computed from `Date.now()` at render. Never hardcoded. Show "Today" when days = 0. Show "Overdue" with red text when days < 0.

---

### 9.7 Data Table Row

**Columns:**

| Column | Width | Notes |
|---|---|---|
| ID | 48px | mono |
| Batch Name | 180px | truncate with ellipsis |
| Program | 60px | badge |
| Trainer | 100px | avatar + last name |
| Scholars | 64px | mono · centered |
| Start | 60px | mono · muted |
| End | 60px | mono · muted |
| Progress | 100px | mini bar + % |
| Billing | 80px | urgency badge |
| BSRS | 60px | yes/no badge |
| Status | 80px | status badge |

Row height: 40px. Odd rows: `color-surface`. Even rows: `color-surface-alt`. Hover: `color-surface-raised`. Sort by urgency (billing deadline) by default. No pagination for ≤ 20 records.

---

### 9.8 Trainer Avatar

Initials only — no photos. First initial + last initial (`Archelyn Gagula` → `AG`). Color assignment is deterministic from name.

| Trainer | Background | Text |
|---|---|---|
| Archelyn Gagula | `#B5D4F4` | `#0C447C` |
| Julius Maravilla | `#9FE1CB` | `#085041` |
| Agustin Pudadera III | `#FAC775` | `#633806` |

Sizes: 24px (table), 32px (batch card). Never more than 2 characters.

---

### 9.9 Document Link Row

```
[ti-file-text · color-blue · 14px]  [Label · text-sm · 400]  [ti-external-link · 12px · muted]

Height:         32px
Padding:        6px 0
Border-bottom:  0.5px solid color-border-faint (except last item)
```

States: `default` (muted), `hover` (blue icon, primary label), `missing` (`ti-file-off` + "No document linked" in italic muted text). External links always open `target="_blank" rel="noopener noreferrer"`.

---

### 9.10 Info Callout

```
┌────────────────────────────────────────────────────────────────┐
│ [icon · 14px · semantic color]  [body text · text-sm · 400]    │
└────────────────────────────────────────────────────────────────┘

Left border:    ⚠ DEVIATION — removed; using 1px tinted full-perimeter border instead
Background:     semantic light background
Border-radius:  radius-lg (8px)
Padding:        10px 14px
```

**Variants:** `info` (blue, `ti-info-circle`), `warning` (amber, `ti-alert-triangle`), `success` (green, `ti-check`), `error` (red, `ti-alert-circle`).

---

### 9.11 Tab Bar

```
[Tab 1] [Tab 2] [Tab 3] [Tab 4]
─────────────────────────────── ← full-width 1px bottom border

Tab:            text-sm · 400 · muted · padding 8px 16px
Active tab:     text-sm · 500 · color-blue · 2px bottom border
Hover tab:      text-sm · 400 · text-primary
Tab bar height: 40px total
```

Always show icon + label. Never use pill-style tabs — underline only. Maximum 6 tabs before requiring a dropdown overflow.

---

### 9.12 Empty State

```
[icon · 32px · muted]
Heading  ·  text-md · 500 · text-secondary
Sub-text ·  text-sm · 400 · muted · max-width 320px · centered
[Optional CTA button]

Padding:  48px top/bottom
```

| Context | Icon | Heading | Sub-text |
|---|---|---|---|
| No documents | `ti-file-off` | No documents attached | Link in Notion then re-sync |
| Assessment not done | `ti-file-check` (muted) | Assessment pending | Schedule after training completion |
| No batches match filter | `ti-search-off` | No batches found | Try adjusting your filters |
| Activity log empty | `ti-timeline` (muted) | No activity yet | Events will appear as batches are updated |

---

## 10. Data Visualization

### Chart rules

```
Library:        Recharts
Font:           IBM Plex Mono for axis labels, IBM Plex Sans for titles
Tick font size: 10px
Grid lines:     1px · color-border-faint · horizontal only
Legend:         Above chart, left-aligned, dot + label
Tooltip:        color-surface · shadow-lg · border color-border · radius-lg
Animation:      Initial mount only (400ms, ease-out). No re-animation on data update.
```

### Chart color palette

```
BAT-1 (AKB Technical):   color-amber   (#C7600F)
BAT-2 (J3ed Farm):       color-blue    (#185FA5)
BAT-3 (Nenita Farm):     color-green   (#3B6D11)
Remaining / empty:        color-blue-lt (#E6F1FB)
```

### Chart inventory

**Chart 1 — Training Progress by Batch (Horizontal Bar)**
- Type: Bar (`indexAxis: 'y'`), data: `progress_pct` per batch
- X-axis: 0–100, ticks at 0/25/50/75/100 formatted as "X%"
- Bar height: 20px, radius: 3px, value label at end of bar

**Chart 2 — Days Elapsed vs Remaining (Stacked Bar)**
- Type: Stacked bar — `days_elapsed` (filled) + `days_remaining` (`color-surface-alt`)
- Dashed reference line at max training days per batch

**Chart 3 — NTP to Start Lag (Bar)**
- Type: Bar, color by lag: 0 days → `color-green`, 1–7 → `color-amber`, >7 → `color-red`
- "15-day rule" dashed reference line in red-lt

**Chart 4 — Enrolled Scholars by Batch (Bar)**
- Type: Bar, per-batch semantic colors, dashed average reference line

### Tooltip format

```
Background:   color-surface
Border:       1px solid color-border
Border-radius: radius-lg
Shadow:       shadow-lg
Padding:      8px 12px
Font:         text-sm body · text-xs mono for values
```

---

## 11. Layout System

### Page structure

```
┌─ TOPBAR ──────────────────────────────────────────────────────────┐
│  [Logo + title]                    [Status badge] [Last synced]   │
├─ METRICS ROW ─────────────────────────────────────────────────────┤
│  [Metric 1] [Metric 2] [Metric 3] [Metric 4] [Metric 5]          │
├─ TAB BAR ─────────────────────────────────────────────────────────┤
│  [Batch Cards] [Table View] [Analytics] [Activity Log]            │
├─ FILTERS ROW (conditional) ───────────────────────────────────────┤
│  [Search input]  [Program filter]  [Status filter]  [BSRS filter] │
├─ CONTENT AREA ────────────────────────────────────────────────────┤
│                                                                    │
│  (view-specific content renders here)                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Responsive breakpoints

| Breakpoint | Width | Layout change |
|---|---|---|
| Mobile (`sm`) | 375px | Cards stack, table becomes card list, analytics single-column |
| Tablet (`md`) | 768px | 2-column analytics, table scrolls horizontally |
| Desktop (`lg`) | 1024px | Full layout as designed |
| Wide (`xl`) | 1280px | Max-width container centers at 1080px |

### Content area patterns

**Batch Cards:** Full-width stacked cards, 24px gap. No sidebar.  
**Table:** Full-width, sticky header, horizontal scroll on mobile.  
**Analytics:** 2-column CSS Grid (50/50) for charts.  
**Activity log:** Single full-width feed.

---

## 12. States & Feedback

### Interactive states

| State | Treatment |
|---|---|
| Default | Base styles as documented |
| Hover | Background 1 step darker · cursor pointer · 150ms transition |
| Active/pressed | Background 2 steps darker · scale `0.98` on buttons only |
| Disabled | 50% opacity · `cursor: not-allowed` · no pointer events |
| Focus | `2px solid color-blue` · `outline-offset: 2px` — never `outline: none` |

### Loading states

**Skeleton shimmer** — initial page load and data refresh:
```css
background: linear-gradient(90deg, color-surface-alt 25%, color-border-faint 50%, color-surface-alt 75%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```

**Inline spinner** — write-back operations: 14px, `color-blue`, replaces action button while pending.

### Error states

- **Page-level:** Full content area replaced with error callout + "Retry" button.
- **Component-level:** Inline error callout with retry. Other components continue to function.
- **Write-back:** Toast (bottom-right, 4s auto-dismiss). UI rolls back to pre-action state immediately.

### Toast notifications

```
Position:     Bottom-right · fixed · 16px from edges
Width:        320px max
Stack:        Up to 3 toasts · oldest auto-dismisses first
Duration:     4000ms auto-dismiss · hover pauses timer

Anatomy:
[icon] [title · text-sm · 500]     [close button]
       [message · text-xs · 400]

Variants: success · warning · error · info
```

### Confirmation dialogs

Required for: marking assessment done, overwriting a billing submission date.

```
Overlay:    rgba(0,0,0,0.4) backdrop
Dialog:     color-surface · shadow-lg · radius-xl · max-width 400px
Title:      text-md · 600
Body:       text-sm · 400 · text-secondary
Actions:    [Cancel · secondary] [Confirm · primary · semantic color]
```

---

## 13. Motion & Animation

Motion is **functional, not decorative**. Every animation communicates a state change or directs attention. Never animate for style.

### Durations

| Token | Duration | Usage |
|---|---|---|
| `duration-fast` | 100ms | Hover state color changes |
| `duration-base` | 150ms | Component show/hide, badge swaps |
| `duration-slow` | 300ms | Card expand/collapse, tab transitions |
| `duration-chart` | 400ms | Chart initial mount animation |
| `duration-pulse` | 2000ms | Active pipeline step pulse |

### Easing

```
ease-standard:   cubic-bezier(0.2, 0, 0, 1)          — most transitions
ease-enter:      cubic-bezier(0, 0, 0.2, 1)           — elements entering
ease-exit:       cubic-bezier(0.4, 0, 1, 1)           — elements leaving
ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1)   — progress bar fill only
```

### Keyframe animations

**Pipeline active step pulse:**
```css
@keyframes pipeline-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(24, 95, 165, 0.4); }
  50%       { opacity: 0.85; box-shadow: 0 0 0 4px rgba(24, 95, 165, 0); }
}
animation: pipeline-pulse 2s ease-in-out infinite;
```

**Progress bar fill (on mount):**
```css
@keyframes progress-fill {
  from { width: 0%; }
  to   { width: var(--progress-width); }
}
animation: progress-fill 400ms ease-spring forwards;
animation-delay: 100ms;
```

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 14. Accessibility

### Color contrast (WCAG 2.1 AA minimum)

| Context | Minimum ratio |
|---|---|
| Normal text (<18px) | 4.5:1 |
| Large text (≥18px bold) | 3:1 |
| UI components (icons, borders) | 3:1 |

**Verified pairs:**

| Pair | Ratio | Grade |
|---|---|---|
| `#18180F` on `#F5F4F0` | 18.6:1 | AAA |
| `#0C447C` on `#E6F1FB` (Informational badge) | 7.2:1 | AAA |
| `#085041` on `#E1F5EE` (Configured program badge) | 6.8:1 | AAA |
| `#27500A` on `#EAF3DE` (Completed badge) | 7.1:1 | AAA |
| `#633806` on `#FAEEDA` (Warning badge) | 5.9:1 | AA |
| `#791F1F` on `#FCEBEB` (Critical badge) | 6.4:1 | AA |

### Keyboard navigation

All interactive elements reachable via `Tab`. Focus order follows visual reading order. Pipeline steps and tab bar navigable via arrow keys. Modals trap focus while open and return focus to trigger on close.

### Screen reader support

```
Batch cards:    aria-label="[Batch name] - [Status] - [N] days to billing deadline"
Progress bars:  role="progressbar" aria-valuenow aria-valuemin aria-valuemax aria-label
Status badges:  aria-label with full text (e.g., "Status: Training Ongoing")
Pipeline:       role="list" · each step role="listitem" · aria-current="true" on active
Charts:         role="img" aria-label describing chart and key finding
Metric cards:   aria-label="[Label]: [Value]. [Sub-label]"
```

### Semantic HTML

```
Page heading:     <h1> for "Training Batch Manager"
Section headings: <h2> for tab section titles
Card titles:      <h3>
Tables:           <th scope="col"> for headers, <caption> for title
Navigation:       <nav aria-label="Dashboard navigation">
```

---

## 15. Design Tokens (Code)

### `design-tokens.ts`

```typescript
export const tokens = {
  fontFamily: {
    sans: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
  },
  fontSize: {
    '2xs': ['10px', { lineHeight: '14px' }],
    xs:    ['11px', { lineHeight: '15px' }],
    sm:    ['12px', { lineHeight: '17px' }],
    base:  ['13px', { lineHeight: '19px' }],
    md:    ['14px', { lineHeight: '20px' }],
    lg:    ['16px', { lineHeight: '22px' }],
    xl:    ['20px', { lineHeight: '26px' }],
    '2xl': ['24px', { lineHeight: '30px' }],
    '3xl': ['32px', { lineHeight: '38px' }],
  },
  colors: {
    bg:            '#F5F4F0',
    surface:       '#FFFFFF',
    surfaceAlt:    '#EEECEA',
    surfaceRaised: '#FAF9F6',
    border:        '#D8D6D0',
    borderStrong:  '#B0AEA8',
    borderFaint:   '#E8E6E2',
    text: {
      primary:   '#18180F',
      secondary: '#5A5950',
      muted:     '#97968E',
      disabled:  '#C4C2BC',
      inverse:   '#F5F4F0',
    },
    blue:   { DEFAULT: '#185FA5', lt: '#E6F1FB', dk: '#0C447C', border: '#B5D0EE', hover: '#D4E8F8' },
    teal:   { DEFAULT: '#0F6E56', lt: '#E1F5EE', dk: '#085041', border: '#9FE1CB', hover: '#C8EFE3' },
    green:  { DEFAULT: '#3B6D11', lt: '#EAF3DE', dk: '#27500A', border: '#B5D98A', hover: '#D5EBB8' },
    amber:  { DEFAULT: '#C7600F', lt: '#FCE6CC', dk: '#7A3806', border: '#F2B673', hover: '#F8D4A8' },
    red:    { DEFAULT: '#C81F1F', lt: '#FCE4E4', dk: '#8B1414', border: '#ED9999', hover: '#F6C2C2' },
    purple: { DEFAULT: '#534AB7', lt: '#EEEDFE', dk: '#3C3489' },
  },
  spacing: {
    '0.5': '2px', '1': '4px', '2': '8px', '3': '12px', '4': '16px',
    '5': '20px', '6': '24px', '8': '32px', '10': '40px', '12': '48px', '16': '64px',
  },
  borderRadius: { sm: '3px', md: '6px', lg: '8px', xl: '12px', full: '9999px' },
  boxShadow: {
    sm: '0 1px 2px rgba(15,14,11,0.06)',
    md: '0 2px 6px rgba(15,14,11,0.08), 0 1px 2px rgba(15,14,11,0.04)',
    lg: '0 4px 16px rgba(15,14,11,0.10), 0 2px 4px rgba(15,14,11,0.06)',
  },
  transitionDuration: { fast: '100ms', base: '150ms', slow: '300ms', chart: '400ms', pulse: '2000ms' },
  urgency: {
    critical: { days: [null, 6],  color: '#C81F1F', bg: '#FCE4E4', border: '#ED9999' },
    warning:  { days: [7, 21],    color: '#C7600F', bg: '#FCE6CC', border: '#F2B673' },
    onTrack:  { days: [22, null], color: '#3B6D11', bg: '#EAF3DE', border: '#B5D98A' },
  },
} as const;
```

### `tailwind.config.ts` extension

```typescript
import { tokens } from './design-tokens';

export default {
  theme: {
    extend: {
      fontFamily:         tokens.fontFamily,
      fontSize:           tokens.fontSize,
      colors:             tokens.colors,
      spacing:            tokens.spacing,
      borderRadius:       tokens.borderRadius,
      boxShadow:          tokens.boxShadow,
      transitionDuration: tokens.transitionDuration,
    },
  },
};
```

> Note: The amber and red values above reflect implemented (re-tinted) hex values, not the original spec values.

---

## 16. Figma File Structure

### Page organization

```
📄 0. Cover & Changelog
📄 1. Design Tokens          ← color styles, text styles, effect styles
📄 2. Icons                  ← Tabler icon subset used in the system
📄 3. Components             ← all 12 components with variants
📄 4. Page Templates         ← full screen layouts for each view
📄 5. Prototype              ← linked screens for interactive demo
📄 6. Specs & Handoff        ← redlines, spacing annotations
📄 _Archive                  ← deprecated versions (never delete, just move)
```

### Component naming convention

```
[Component] / [Variant] / [State]

Examples:
  Badge / Status / Ongoing
  Badge / Status / Critical
  Card / Batch / Default
  Card / Batch / Hover
  Card / Metric / Warning
  Pipeline / Step / Done
  Pipeline / Step / Active
  Table / Row / Default
  Table / Row / Hover
```

### Color style naming

```
Background / Page
Background / Surface
Background / Surface Alt
Background / Surface Raised

Border / Default
Border / Strong
Border / Faint

Text / Primary · Secondary · Muted · Disabled · Inverse

Status / Blue / DEFAULT · Light · Dark
Status / Teal / DEFAULT · Light · Dark
Status / Green / DEFAULT · Light · Dark
Status / Amber / DEFAULT · Light · Dark
Status / Red / DEFAULT · Light · Dark
Status / Purple / DEFAULT · Light · Dark
```

---

## 17. File Index

| Path | Purpose |
|---|---|
| `DESIGN.md` | **This file.** Complete design reference. |
| `README.md` | Origin story, content rules, visual foundations overview. |
| `colors_and_type.css` | All design tokens as CSS custom properties. **Source of truth for color.** |
| `assets/logo.svg` | TCS wordmark — replace with real TESDA/TVI brand mark when available. |
| `assets/mark.svg` | TCS mark (square only, for favicons). |
| `assets/icons/` | Tabler icon subset (SVG, 24×24, `stroke="currentColor"`). |
| `preview/` | Standalone HTML cards for type, color, spacing, shadow, and component previews. |
| `ui_kits/admin/index.html` | Working prototype of all four dashboard views. Open in any modern browser — no build step. |
| `ui_kits/admin/*.jsx` | React components: `StatusBadge`, `ProgressBar`, `MetricCard`, `BatchCard`, `LifecyclePipeline`, `UrgencyIndicator`, `TrainerAvatar`, `DocumentLinkRow`, `InfoCallout`, `TabBar`, `EmptyState`, `Charts`. |
| `ui_kits/admin/kit.css` | Layout-only styles (tokens come from `colors_and_type.css`). |
| `ui_kits/admin/data.js` | Sample data — 3 batches, 47 scholars, 7 activity events. |
| `uploads/training-compliance-design-system.md` | Original v1.0 spec. Re-read before making any visual decision not covered here. |

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | May 2026 | Initial release. Typography, color, spacing, 12 components, 4 charts, tokens, Figma structure. |

---

*Training Compliance System Design System · TESDA Farm School Scholarship Operations · 3 batches · 47 scholars · 2026 cycle.*
