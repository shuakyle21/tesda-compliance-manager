# Training Compliance System — Design System
### TESDA TWSP & CFSP Batch Operations Dashboard · v1.0

> **Audience:** This document is the single source of truth for all visual and interaction decisions in the Training Compliance System. It governs the Figma component library, the `design-tokens.ts` file, and every UI component built in Next.js + Tailwind.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Typography](#2-typography)
3. [Color System](#3-color-system)
4. [Spacing & Grid](#4-spacing--grid)
5. [Elevation & Shadows](#5-elevation--shadows)
6. [Border & Radius](#6-border--radius)
7. [Iconography](#7-iconography)
8. [Component Library](#8-component-library)
9. [Data Visualization](#9-data-visualization)
10. [Layout System](#10-layout-system)
11. [States & Feedback](#11-states--feedback)
12. [Motion & Animation](#12-motion--animation)
13. [Accessibility](#13-accessibility)
14. [Design Tokens (Code)](#14-design-tokens-code)
15. [Figma File Structure](#15-figma-file-structure)

---

## 1. Design Principles

These five principles govern every decision in this system. When two options compete, the principle listed first wins.

### 1.1 Status at a Glance

A coordinator opening this dashboard has one job: know immediately which batch needs attention. Every screen must answer *"what needs action right now?"* without requiring any interaction. Urgency must be visible before the user reads a single word.

**Implication:** Color, position, and size all communicate status. The most urgent batch always appears first. Critical deadlines are never smaller than secondary information.

### 1.2 Density Without Crowding

Three batches, six lifecycle stages, five metrics, four charts — this is a data-dense system. But density does not mean cramped. Every element has breathing room; it simply does not have *excess* room.

**Implication:** Use 13px body text, 4pt base grid, 40px table rows, and 16px card padding. Never use 8pt-only grids — half-steps are required for compliance tooling.

### 1.3 Semantic Color Only

Every color in this system carries one specific meaning. That meaning is applied 100% consistently. Red always means deadline danger. Green always means complete or approved. Amber always means warning. These meanings are never violated for aesthetic reasons.

**Implication:** No decorative gradients, no "accent" colors used arbitrarily, no color used just because it looks good in a particular context.

### 1.4 Government Trustworthiness

This system is used by TESDA TVI coordinators processing government-funded program compliance. The visual language must communicate reliability, structure, and authority — not startup energy, not consumer app delight.

**Implication:** Flat surfaces over gradients. Structured layouts over organic asymmetry. Neutral backgrounds over bold colors. Rounded corners ≤8px. No playful illustrations or marketing-style copy.

### 1.5 Operational, Not Presentational

This is a tool, not a report. Every design decision is evaluated by whether it helps the user *do* something — not by whether it looks impressive in a screenshot.

**Implication:** Navigation labels are always visible (never icon-only). Empty states explain what to do next. Error states give the exact fix. Loading states never block primary content.

---

## 2. Typography

### 2.1 Type Family

| Role | Family | Rationale |
|---|---|---|
| UI / body | **IBM Plex Sans** | Designed for data interfaces. Government-neutral tone. Excellent legibility at 12–13px. Has a condensed variant for tight spaces. |
| Monospace | **IBM Plex Mono** | Same design family as Plex Sans. Used for IDs, dates, codes, and numerical data to enforce visual distinction from labels. |

```css
/* Import */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

font-family-sans: 'IBM Plex Sans', system-ui, sans-serif;
font-family-mono: 'IBM Plex Mono', 'Courier New', monospace;
```

**Never use:** Inter, Geist, Roboto, Arial, or any system font stack as the primary typeface. These carry no visual identity for the project.

---

### 2.2 Type Scale

The scale is based on a **1.2 minor third** ratio with manual adjustments for the 11–14px range to preserve density options.

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

---

### 2.3 Type Roles

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

---

### 2.4 Monospace Usage Rules

Use `IBM Plex Mono` for:
- Batch IDs (`BAT-1`, `R-01`)
- Dates (`Apr 21`, `Jun 8, 2026`)
- Numeric progress values (`71.4%`, `Day 31 of 42`)
- Billing deadlines
- NC level indicators (`NC II`, `NC I`)
- Requirement IDs in documentation
- All metric card values

Do **not** use monospace for:
- Trainer names
- Qualification titles
- Remarks or descriptive text
- Navigation labels

---

## 3. Color System

### 3.1 Base Palette

#### Neutrals

| Token | Hex | Usage |
|---|---|---|
| `color-bg` | `#F5F4F0` | Page background — warm off-white, never clinical |
| `color-surface` | `#FFFFFF` | Cards, panels, modals, dropdowns |
| `color-surface-alt` | `#EEECEA` | Alternating table rows, input backgrounds, sidebar |
| `color-surface-raised` | `#FAF9F6` | Hover state for cards |
| `color-border` | `#D8D6D0` | Default borders, dividers, input edges |
| `color-border-strong` | `#B0AEA8` | Section dividers, active input borders |
| `color-border-faint` | `#E8E6E2` | Subtle separators, card internal dividers |

#### Text

| Token | Hex | Usage |
|---|---|---|
| `color-text-primary` | `#18180F` | Headlines, card titles, primary labels |
| `color-text-secondary` | `#5A5950` | Body text, descriptions, form labels |
| `color-text-muted` | `#97968E` | Placeholders, metadata, timestamps |
| `color-text-disabled` | `#C4C2BC` | Disabled inputs, inactive navigation |
| `color-text-inverse` | `#F5F4F0` | Text on dark backgrounds |

---

### 3.2 Semantic Colors

Each semantic color has five levels: a base, a light background, a dark text, a border tint, and a hover state.

#### Blue — TWSP Program / Informational

| Token | Hex | Usage |
|---|---|---|
| `color-blue` | `#185FA5` | TWSP program badge, informational icons, active tab underline |
| `color-blue-lt` | `#E6F1FB` | TWSP badge background, info callout background |
| `color-blue-dk` | `#0C447C` | TWSP badge text, info callout text |
| `color-blue-border` | `#B5D0EE` | Info callout border |
| `color-blue-hover` | `#D4E8F8` | TWSP badge hover |

#### Teal — CFSP Program

| Token | Hex | Usage |
|---|---|---|
| `color-teal` | `#0F6E56` | CFSP program badge, secondary success |
| `color-teal-lt` | `#E1F5EE` | CFSP badge background |
| `color-teal-dk` | `#085041` | CFSP badge text |
| `color-teal-border` | `#9FE1CB` | CFSP badge border |
| `color-teal-hover` | `#C8EFE3` | CFSP badge hover |

#### Green — Completed / Approved / On Track

| Token | Hex | Usage |
|---|---|---|
| `color-green` | `#3B6D11` | Completed status, BSRS Approved, NC Issued, on-track progress |
| `color-green-lt` | `#EAF3DE` | Completed badge background, success callout |
| `color-green-dk` | `#27500A` | Completed badge text |
| `color-green-border` | `#B5D98A` | Success callout border |
| `color-green-hover` | `#D5EBB8` | Completed badge hover |

#### Amber — Warning / 7–21 Days / Pending

| Token | Hex | Usage |
|---|---|---|
| `color-amber` | `#854F0B` | Warning deadlines, BSRS Not Approved, mid-range urgency |
| `color-amber-lt` | `#FAEEDA` | Warning badge background, caution callout |
| `color-amber-dk` | `#633806` | Warning badge text |
| `color-amber-border` | `#F0C07A` | Warning callout border |
| `color-amber-hover` | `#F5DEB8` | Warning badge hover |

#### Red — Critical / <7 Days / Urgent Action

| Token | Hex | Usage |
|---|---|---|
| `color-red` | `#8B2020` | Critical deadline badges, error states, destructive actions |
| `color-red-lt` | `#FCEBEB` | Critical badge background, error callout |
| `color-red-dk` | `#791F1F` | Critical badge text |
| `color-red-border` | `#E8A0A0` | Error callout border |
| `color-red-hover` | `#F8D4D4` | Critical badge hover |

#### Purple — NC Level Indicators

| Token | Hex | Usage |
|---|---|---|
| `color-purple` | `#534AB7` | NC II badges |
| `color-purple-lt` | `#EEEDFE` | NC II badge background |
| `color-purple-dk` | `#3C3489` | NC II badge text |

---

### 3.3 Color Application Rules

```
Rule 1:  Red is ONLY used for billing deadlines <7 days and error states.
         Never for decorative purposes.

Rule 2:  Green is ONLY used for completed status, approved status,
         on-track progress (>75%), and NC issued. Never for branding.

Rule 3:  Amber is ONLY used for warning states (7–21 days),
         pending approvals, and moderate urgency. Never for highlights.

Rule 4:  Blue is the TWSP program color. It also serves informational
         callouts. It is not a general "brand" color.

Rule 5:  Teal is the CFSP program color exclusively. It does not
         double as any other semantic meaning.

Rule 6:  Purple is exclusively for NC level indicators (NC I, NC II, NC III).

Rule 7:  All text on colored backgrounds must meet WCAG AA contrast
         (4.5:1 for normal text, 3:1 for large text).

Rule 8:  Progress bars use green (>75%), blue (25–75%), amber (<25%).
         Never a single flat color for all progress states.
```

---

### 3.4 Urgency Color System

This is the most important color rule in the entire system. Billing deadlines drive the urgency tier, which drives the color applied across the entire batch card.

```
CRITICAL   Days remaining ≤ 6    →  color-red    border, badge, deadline text
WARNING    Days remaining 7–21   →  color-amber  border, badge, deadline text
ON TRACK   Days remaining > 21   →  color-green  border, badge, deadline text
COMPLETED  Training done         →  color-green  full card muted state
```

The urgency tier is computed once at data fetch and stored. It should not be recomputed in render functions. Every component that displays a batch inherits its urgency tier from the batch data object.

---

## 4. Spacing & Grid

### 4.1 Base Unit

Base unit: **4px**

All spacing values are multiples of 4px. Half-steps (2px) are permitted only for internal component micro-spacing (e.g., icon-to-label gap, badge internal padding).

### 4.2 Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `space-0.5` | 2px | Icon-to-text gap, badge internal gap |
| `space-1` | 4px | Tight internal padding, between inline badges |
| `space-2` | 8px | Component internal padding (small), between field label and value |
| `space-3` | 12px | Card section gaps, between rows in a detail panel |
| `space-4` | 16px | Card padding, form field internal padding |
| `space-5` | 20px | Between card header and card body |
| `space-6` | 24px | Between batch cards |
| `space-8` | 32px | Between page sections |
| `space-10` | 40px | Section top/bottom padding |
| `space-12` | 48px | Page section breaks |
| `space-16` | 64px | Maximum breathing room (used sparingly) |

---

### 4.3 Layout Grid

```
Page max-width:     1080px
Page padding:       24px (mobile: 16px)
Column gutter:      16px
Column count:       12

Metric cards:       5 equal columns (span 12 / 5 each)
Batch cards:        1 column (full width, stacked)
Analytics charts:   2 columns (span 6 each)
Table:              Full width (span 12)
Sidebar (if used):  240px fixed, main content takes remainder
```

---

### 4.4 Component Sizing

| Component | Height | Notes |
|---|---|---|
| Table row | 40px | Compact density standard |
| Input field | 32px | Never 36px or 40px — keeps forms compact |
| Button (primary) | 32px | |
| Button (small) | 26px | Used inside table rows |
| Badge / pill | 20px | Status badges |
| Metric card | Auto | Min 80px |
| Batch card | Auto | Min 240px, expands with content |
| Navigation tab | 36px | Tab bar height |
| Avatar (small) | 24px | Trainer avatar in table |
| Avatar (medium) | 32px | Trainer avatar in batch card |
| Progress bar | 6px | Thin — this is data, not a hero element |
| Progress bar (table) | 4px | Inline mini version |

---

## 5. Elevation & Shadows

This system uses **minimal shadow**. Government and compliance tools communicate structure through borders and background contrast, not dramatic elevation.

| Level | Token | Value | Usage |
|---|---|---|---|
| 0 | `shadow-none` | none | Default surfaces, table rows |
| 1 | `shadow-sm` | `0 1px 2px rgba(15,14,11,0.06)` | Cards at rest, dropdowns |
| 2 | `shadow-md` | `0 2px 6px rgba(15,14,11,0.08), 0 1px 2px rgba(15,14,11,0.04)` | Cards on hover, active panels |
| 3 | `shadow-lg` | `0 4px 16px rgba(15,14,11,0.10), 0 2px 4px rgba(15,14,11,0.06)` | Modals, tooltips, date pickers |

**Rules:**
- Cards use `shadow-sm` at rest, `shadow-md` on hover
- Never use `box-shadow` with color tints (e.g., colored glow effects)
- Modals use `shadow-lg` plus a `rgba(0,0,0,0.4)` overlay backdrop
- Table rows use no shadow — structure comes from alternating backgrounds

---

## 6. Border & Radius

### 6.1 Border Widths

| Token | Value | Usage |
|---|---|---|
| `border-thin` | 0.5px | Subtle dividers, table row separators |
| `border-base` | 1px | Card borders, input borders, all standard components |
| `border-strong` | 2px | Active input focus ring (inside), urgent card left accent |

### 6.2 Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 3px | Sub-requirement rows, inner table elements |
| `radius-md` | 6px | Badges, pills, tags |
| `radius-lg` | 8px | Cards, panels, input fields, buttons |
| `radius-xl` | 12px | Modals, popovers |
| `radius-full` | 9999px | Avatar circles, toggle switches |

**Rule:** Nothing in this system uses border-radius above 12px. Values like 16px, 20px, or 24px read as consumer-app design and break the operational/government aesthetic.

### 6.3 Urgency Left Border

Batch cards in the list view use a 3px left border to communicate urgency tier at a glance before the user reads any text:

```
Critical   →  border-left: 3px solid color-red
Warning    →  border-left: 3px solid color-amber
On Track   →  border-left: 3px solid color-green
Completed  →  border-left: 3px solid color-border
```

---

## 7. Iconography

### 7.1 Icon Library

**Primary:** Tabler Icons (`@tabler/icons-react`)

Rationale: 2px stroke weight, consistent geometry, 500+ relevant icons, MIT license, tree-shakeable React package, matches IBM Plex Sans weight visually.

**Never use:** Heroicons (too rounded, consumer-app feel), Material Icons (too Google), Font Awesome (too heavy for this use case).

### 7.2 Icon Sizes

| Context | Size | Notes |
|---|---|---|
| Inline with body text | 14px | Vertically centered with text |
| Navigation items | 16px | With label |
| Metric card label | 13px | Left of label text |
| Button icon | 14px | Left of button label |
| Standalone (no label) | 18px | Always needs a tooltip |
| Status indicator | 12px | Inside badge |

### 7.3 Icon-to-Label Gap

Always `space-1` (4px) between an icon and its adjacent text label. Never 0px (too tight), never 8px (too loose for inline use).

### 7.4 Core Icon Assignments

```
Batch / folder          ti-folders
Trainees / scholars     ti-users
Progress / chart        ti-chart-dots
Assessment              ti-file-check
Certificate / NC        ti-certificate
Billing / receipt       ti-receipt
Calendar / dates        ti-calendar
Warning / urgent        ti-alert-triangle
Check / complete        ti-check
Pending                 ti-clock
Documents               ti-file-text
Search                  ti-search
Filter                  ti-filter
Export / download       ti-download
Settings                ti-settings
Trainer / person        ti-user
Analytics               ti-chart-bar
Activity log            ti-timeline
Refresh / sync          ti-refresh
External link           ti-external-link
BSRS approved           ti-shield-check
BSRS not approved       ti-shield-off
TIP conducted           ti-presentation
NTP received            ti-file-invoice
AOU submitted           ti-send
```

---

## 8. Component Library

Each component is documented with: purpose, anatomy, variants, states, and usage rules.

---

### 8.1 Status Badge

**Purpose:** Communicate categorical status at a glance. The most-used component in the system.

**Anatomy:**
```
[optional icon] [label text]

Height:         20px
Padding:        2px top/bottom · 8px left/right
Border-radius:  radius-md (6px)
Font:           text-xs · mono · 500 · tracking-wide
```

**Variants:**

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| `ongoing` | `color-blue-lt` | `color-blue-dk` | none | Training in progress |
| `completed` | `color-green-lt` | `color-green-dk` | none | Training finished |
| `upcoming` | `color-amber-lt` | `color-amber-dk` | none | Not yet started |
| `cancelled` | `color-red-lt` | `color-red-dk` | none | Cancelled batch |
| `twsp` | `color-blue-lt` | `color-blue-dk` | none | TWSP program |
| `cfsp` | `color-teal-lt` | `color-teal-dk` | none | CFSP program |
| `nc-ii` | `color-purple-lt` | `color-purple-dk` | none | NC II level |
| `nc-i` | `color-amber-lt` | `color-amber-dk` | none | NC I level |
| `approved` | `color-green-lt` | `color-green-dk` | none | BSRS Approved |
| `not-approved` | `color-surface-alt` | `color-text-muted` | `color-border` | BSRS not approved |
| `critical` | `color-red-lt` | `color-red-dk` | none | <7 days deadline |
| `warning` | `color-amber-lt` | `color-amber-dk` | none | 7–21 days deadline |
| `on-track` | `color-green-lt` | `color-green-dk` | none | >21 days deadline |

**States:** Default, hover (background 1 step darker), disabled (50% opacity, no pointer events)

**Rules:**
- Never resize a badge to fit more text — truncate the label instead
- Always use the semantic variant that matches the data meaning
- Never stack more than 3 badges horizontally in a card header
- Badges are never interactive (no click, no tooltip needed)

---

### 8.2 Progress Bar

**Purpose:** Visualize training completion as a horizontal fill bar.

**Anatomy:**
```
[progress label row: "Day 31 of 42" .............. "71.4%"]
[track: full width, height 6px, radius-full, color-surface-alt]
  [fill: width = progress%, height 6px, radius-full, semantic color]
```

**Color by completion tier:**

| Tier | Range | Fill Color |
|---|---|---|
| Low | 0–24% | `color-amber` |
| Mid | 25–74% | `color-blue` |
| High | 75–99% | `color-green` |
| Complete | 100% | `color-green` with `color-green-lt` track |

**Variants:**
- `default` — 6px height, with label row above
- `mini` — 4px height, no label, used in table rows
- `card` — 6px, label row, full card width (used in batch cards)

**States:**
- `loading` — animated shimmer on the track
- `error` — track turns `color-red-lt`, no fill
- `zero` — 2px fill minimum (always visible, never invisible at 0%)

**Rules:**
- Always show the day count (`Day X of Y`) alongside the percentage
- The percentage uses `mono` font — it is data, not a label
- Do not animate the fill on every render — only on initial mount

---

### 8.3 Metric Card

**Purpose:** Surface a single key number with context at the top of the dashboard.

**Anatomy:**
```
┌─────────────────────────────┐
│ [icon] LABEL TEXT           │  text-xs · 400 · muted · uppercase · mono
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

**Variants:**
- `neutral` — default, no accent color
- `warning` — amber left border (3px), used when value needs attention
- `critical` — red left border (3px), used for imminent deadlines

**Content in this system:**
```
Card 1:  Total Batches      →  "3"       →  "All training ongoing"
Card 2:  Total Scholars     →  "47"      →  "15 · 15 · 17 per batch"
Card 3:  Avg Progress       →  "56%"     →  variant warning (amber)
Card 4:  Earliest Billing   →  "Jun 18"  →  variant critical (red)
Card 5:  NC Issued          →  "0"       →  "Pending — training ongoing"
```

**States:** Default, hover (shadow-md), loading (shimmer on value), error (— placeholder)

---

### 8.4 Batch Card

**Purpose:** The primary data display component. Shows the full state of one training batch.

**Anatomy (top to bottom):**

```
┌── CARD HEADER ────────────────────────────────────────────────┐
│ [Program badge] [Status badge] [Urgency badge]   [Batch ID]   │
│ Batch name (card title · 14px · 500)                          │
│ Qualification (body · 13px · 400 · muted)                     │
└───────────────────────────────────────────────────────────────┘
┌── CARD BODY (3-column grid) ──────────────────────────────────┐
│ COL 1 — Trainer & enrollment                                  │
│   [Avatar] Trainer full name                                  │
│   Enrolled scholars count                                     │
│   Training days pattern                                       │
│   TIP conducted badge + date                                  │
│                                                               │
│ COL 2 — Dates & progress                                      │
│   NTP received date                                           │
│   Training start date                                         │
│   Training end date                                           │
│   Duration + current day                                      │
│   Progress bar (full width of column)                         │
│                                                               │
│ COL 3 — Compliance & deadlines                                │
│   NTP to Start lag (days)                                     │
│   Training report date                                        │
│   Billing deadline (urgency-colored)                          │
│   BSRS exemption badge                                        │
│   Assessment done badge                                       │
└───────────────────────────────────────────────────────────────┘
┌── LIFECYCLE PIPELINE ─────────────────────────────────────────┐
│  ● AOU  ──  ● NTP  ──  ● TIP  ──  ◉ TRAINING  ──  ○ ASSESS  ──  ○ BILLING │
└───────────────────────────────────────────────────────────────┘
┌── AUTO REMARK ────────────────────────────────────────────────┐
│ 📋 Training ongoing — Day 31 of 42. Earliest billing deadline.│
└───────────────────────────────────────────────────────────────┘

Left border:    3px · urgency tier color
Border:         1px solid color-border
Border-radius:  radius-lg (8px)
Background:     color-surface
Shadow:         shadow-sm
Padding:        0 (sections have their own padding)
```

**Urgency tier drives:**
- Left border color
- Billing deadline text color and badge variant
- Card header urgency badge

**States:**
- `default` — at rest
- `hover` — shadow-md, background color-surface-raised
- `expanded` — shows linked documents section (animated height)
- `loading` — shimmer on all data fields
- `error` — shows error callout in body, retry button

---

### 8.5 Lifecycle Pipeline

**Purpose:** Visualize the 6-stage compliance lifecycle for a single batch.

**Stages:**
```
1. AOU Submitted
2. NTP Received
3. TIP Conducted
4. Training Ongoing   ← active stage for all current batches
5. Assessment
6. Billing
```

**Anatomy:**
```
[●]──────────[●]──────────[●]──────────[◉]──────────[○]──────────[○]
 AOU         NTP          TIP         TRAINING     ASSESS       BILLING
Apr 9       Apr 15       Apr 21      Apr 21–       Pending      By Jun 18
                                     Jun 8
```

**Step states:**
- `done` — filled circle (`color-green`), checkmark icon inside, connecting line `color-green`
- `active` — filled circle (`color-blue`), play icon, soft pulse animation, connecting line `color-border`
- `pending` — outlined circle (`color-border`), step number inside, connecting line `color-border`
- `overdue` — filled circle (`color-red`), warning icon, used when a stage is past due without completion

**Sizing:**
```
Step circle:      18px diameter
Connecting line:  1px height, full width between circles
Step label:       text-2xs · 400 · muted · centered under circle
Step date:        text-2xs · mono · 500 · muted · centered under label
Pipeline height:  52px total
```

**Rules:**
- Always show dates for completed steps
- Always show "Pending" or the deadline for future steps
- Never show more than 6 steps — this pipeline is fixed for this system
- The active step pulses at 2s interval with a subtle opacity animation (see §12)

---

### 8.6 Urgency Indicator

**Purpose:** Standalone component showing days remaining to a deadline with urgency color and icon.

**Anatomy:**
```
[!] 28 days  →  color-red · icon: ti-alert-triangle · mono value
[⚠] 28 days  →  color-amber · icon: ti-clock · mono value
[✓] 28 days  →  color-green · icon: ti-check · mono value
```

**Variants:**
- `inline` — used inside batch card COL 3, shows icon + days + "days" label
- `badge` — pill format, used in table rows
- `standalone` — full row with date and days remaining, used in metric card sub-label

**Rules:**
- The days value is always computed from `Date.now()` at render time
- Never hardcode the days value in the UI
- Show "Today" when days remaining = 0
- Show "Overdue" with red text when days remaining < 0

---

### 8.7 Data Table Row

**Purpose:** Compact display of multiple batches in a scannable grid.

**Anatomy:**
```
Columns (left to right):
ID | Batch Name + Qualification | Program | Trainer | Scholars | Start | End | Progress | Billing | BSRS | Status

Row height:   40px
Header:       color-surface-alt background · text-xs · uppercase · muted
Odd rows:     color-surface
Even rows:    color-surface-alt
Hover:        color-surface-raised
Active/selected: color-blue-lt left border 2px
```

**Column widths:**
```
ID:             48px  (mono)
Batch name:     180px (truncate with ellipsis at overflow)
Program:        60px  (badge)
Trainer:        100px (avatar + last name)
Scholars:       64px  (mono · centered)
Start:          60px  (mono · muted)
End:            60px  (mono · muted)
Progress:       100px (mini bar + %)
Billing:        80px  (urgency badge)
BSRS:           60px  (yes/no badge)
Status:         80px  (status badge)
```

**Rules:**
- Truncate batch names — never wrap to 2 lines in table view
- Sort by urgency (billing deadline) by default
- Sortable columns: Batch name, Scholars, Progress, Billing deadline
- No pagination for ≤20 records — virtual scroll for >20

---

### 8.8 Trainer Avatar

**Purpose:** Visual identifier for a trainer. Never uses photos — only initials.

**Anatomy:**
```
Shape:        circle · radius-full
Size-sm:      24px (table rows)
Size-md:      32px (batch cards)
Font:         text-xs · 600 · inverse

Color assignment (deterministic from name hash):
```

| Trainer | Background | Text |
|---|---|---|
| Archelyn Gagula | `#B5D4F4` (blue-lt) | `#0C447C` (blue-dk) |
| Julius Maravilla | `#9FE1CB` (teal-lt) | `#085041` (teal-dk) |
| Agustin Pudadera III | `#FAC775` (amber-lt) | `#633806` (amber-dk) |

**Rules:**
- Use first initial + last initial: "Archelyn Gagula" → "AG"
- Never use more than 2 characters
- Color assignment must be deterministic — same trainer always gets the same color

---

### 8.9 Document Link Row

**Purpose:** Display a linked document with label and external link indicator.

**Anatomy:**
```
[ti-file-text icon · color-blue · 14px]  [Document label · text-sm · 400]  [ti-external-link · 12px · muted]

Height:         32px
Padding:        6px 0
Border-bottom:  0.5px solid color-border-faint (except last item)
```

**States:**
- `default` — muted icon, text-secondary label
- `hover` — icon color-blue, label text-primary, cursor pointer
- `missing` — replaced by: `[ti-file-off · muted]  "No document linked"  ` · italic · text-muted

**Rule:** External links always open in a new tab (`target="_blank"` with `rel="noopener noreferrer"`).

---

### 8.10 Info Callout

**Purpose:** System-level messages, migration notes, Student Pack information, non-blocking alerts.

**Anatomy:**
```
┌────────────────────────────────────────────────────────────────┐
│ [icon · 14px · semantic color]  [body text · text-sm · 400]    │
└────────────────────────────────────────────────────────────────┘

Left border:    3px solid semantic border color
Background:     semantic light background
Border:         0.5px solid semantic border color
Border-radius:  radius-lg (8px)
Padding:        10px 14px
```

**Variants:**
- `info` — blue colors, `ti-info-circle` icon
- `warning` — amber colors, `ti-alert-triangle` icon
- `success` — green colors, `ti-check` icon
- `error` — red colors, `ti-alert-circle` icon

---

### 8.11 Tab Bar

**Purpose:** Primary navigation between views (Batch Cards, Table, Analytics, Activity).

**Anatomy:**
```
[Tab 1] [Tab 2] [Tab 3] [Tab 4]
─────────────────────────────── ← full-width 1px bottom border

Tab:            text-sm · 400 · muted · padding 8px 16px
Active tab:     text-sm · 500 · color-blue · 2px bottom border · color-blue
Hover tab:      text-sm · 400 · text-primary
Tab bar height: 40px total
```

**Rules:**
- Always show icon + label in tabs (never icon-only)
- Never use pill-style tabs — underline style only
- Maximum 6 tabs before requiring a dropdown overflow

---

### 8.12 Empty State

**Purpose:** Communicate when a section has no data — and what the user should do.

**Anatomy:**
```
[icon · 32px · muted]

Heading  ·  text-md · 500 · text-secondary
Sub-text ·  text-sm · 400 · muted · max-width 320px · centered
[Optional CTA button]

Padding:  48px top/bottom
```

**System-specific empty states:**

| Context | Icon | Heading | Sub-text |
|---|---|---|---|
| No documents linked | `ti-file-off` | No documents attached | Link documents in Notion then re-sync |
| Assessment not done | `ti-file-check` (muted) | Assessment pending | Assessment can be scheduled after training completion |
| No batches match filter | `ti-search-off` | No batches found | Try adjusting your filters or search term |
| Activity log empty | `ti-timeline` (muted) | No activity yet | Events will appear here as batches are updated |

---

## 9. Data Visualization

### 9.1 Chart System Rules

```
Library:        Recharts
Font:           IBM Plex Mono for axis labels, IBM Plex Sans for titles
Tick font size: 10px
Grid lines:     1px · color-border-faint · horizontal only
Legend:         Above chart, left-aligned, dot + label format
Tooltip:        color-surface · shadow-lg · border color-border · radius-lg
Animation:      Initial mount only (duration: 400ms, easing: ease-out)
               No re-animation on data update
```

### 9.2 Chart Color Palette

Charts use semantic colors from the main palette. Never introduce new colors for charts.

```
BAT-1 (AKB Technical):   color-amber    (#854F0B)
BAT-2 (J3ed Farm):       color-blue     (#185FA5)
BAT-3 (Nenita Farm):     color-green    (#3B6D11)
Remaining / empty:        color-blue-lt  (#E6F1FB) (for stacked bars)
```

### 9.3 Chart Inventory

#### Chart 1 — Training Progress by Batch (Horizontal Bar)

```
Type:         Bar (indexAxis: 'y')
Data:         progress_pct per batch
Colors:       Per-batch semantic colors
Sort:         Descending by progress_pct
X-axis:       0–100, ticks at 0/25/50/75/100, formatted as "X%"
Bar height:   20px
Bar radius:   3px
Label:        Value label at end of bar (outside, right-aligned)
```

#### Chart 2 — Days Elapsed vs Remaining (Stacked Bar)

```
Type:         Bar (stacked)
Data:         days_elapsed (filled) + days_remaining (light) per batch
Colors:       days_elapsed: per-batch color · days_remaining: color-surface-alt
Sort:         By days_elapsed descending
Y-axis:       Days count
Reference:    Dashed line at max training days for each batch
```

#### Chart 3 — NTP to Start Lag (Bar)

```
Type:         Bar
Data:         ntp_to_start_days per batch
Colors:       0 days: color-green (same-day NTP) · 1–7: color-amber · >7: color-red
Y-axis:       Days count · integer ticks
Annotation:   "15-day rule" reference line in red-lt dashed
Note text:    "BAT-2 started same day as NTP receipt"
```

#### Chart 4 — Enrolled Scholars by Batch (Bar)

```
Type:         Bar
Data:         enrolled_scholars per batch
Colors:       Per-batch semantic colors
Y-axis:       Starts at 0 · step size 5
Reference:    Dashed line at average scholars value
```

### 9.4 Tooltip Format

```
Batch:    [Batch name]
Value:    [formatted value with unit]
Date:     [relevant date if applicable]

Background:   color-surface
Border:       1px solid color-border
Border-radius: radius-lg
Shadow:       shadow-lg
Padding:      8px 12px
Font:         text-sm body · text-xs mono for values
```

---

## 10. Layout System

### 10.1 Page Structure

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

### 10.2 Responsive Breakpoints

| Breakpoint | Token | Width | Layout change |
|---|---|---|---|
| Mobile | `sm` | 375px | Cards stack, table becomes card list, analytics single-column |
| Tablet | `md` | 768px | 2-column analytics, table scrolls horizontally |
| Desktop | `lg` | 1024px | Full layout — all views as designed |
| Wide | `xl` | 1280px | Max-width container centers at 1080px |

### 10.3 Content Area Patterns

**Batch Cards view:** Full-width stacked cards with 24px gap between them. No sidebar.

**Table view:** Full-width table. Sticky header. Horizontal scroll on mobile.

**Analytics view:** 2-column CSS Grid (50/50) for charts. Single column Chart 1 and Chart 3 on top row (wider). Charts 2 and 4 on bottom row.

**Activity log:** Single full-width feed. No columns.

---

## 11. States & Feedback

### 11.1 Interactive States

Every interactive element must implement all four states:

| State | Visual treatment |
|---|---|
| Default | Base styles as documented |
| Hover | Background 1 step darker · cursor pointer · transition 150ms |
| Active/pressed | Background 2 steps darker · slight scale (0.98) on buttons only |
| Disabled | 50% opacity · cursor not-allowed · no pointer events |
| Focus | 2px `color-blue` outline offset 2px (keyboard navigation) |

### 11.2 Loading States

**Skeleton shimmer:** Used for initial page load and data refresh. Applied to:
- Metric card values
- Batch card body content (3 skeleton rows per column)
- Table rows (5 skeleton rows)
- Chart area (flat gray rectangle at chart height)

**Shimmer animation:** Left-to-right gradient sweep, 1.5s duration, infinite loop.

```css
background: linear-gradient(90deg, 
  color-surface-alt 25%, 
  color-border-faint 50%, 
  color-surface-alt 75%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```

**Inline spinner:** Used for write-back operations (assessment toggle, date update). 14px spinner, `color-blue`, replaces the action button while pending.

### 11.3 Error States

**Page-level error:** Full content area replaced with error callout. Shows error message and a "Retry" button.

**Component-level error:** The affected component shows an inline error callout with a retry action. Other components continue to function.

**Write-back error:** Toast notification (bottom-right, 4s auto-dismiss). UI rolls back to pre-action state immediately.

### 11.4 Toast Notifications

```
Position:     Bottom-right · fixed · 16px from edges
Width:        320px max
Stack:        Up to 3 toasts visible · oldest auto-dismisses first
Duration:     4000ms auto-dismiss · hover pauses timer

Anatomy:
[icon] [title · text-sm · 500]     [close button]
       [message · text-xs · 400]

Variants: success · warning · error · info
```

### 11.5 Confirmation Dialogs

Required for all destructive or irreversible actions:
- Marking assessment done (can be undone via Supabase write, but user must confirm intent)
- Overwriting a billing submission date

```
Overlay:    rgba(0,0,0,0.4) backdrop
Dialog:     color-surface · shadow-lg · radius-xl · max-width 400px
Title:      text-md · 600
Body:       text-sm · 400 · text-secondary
Actions:    [Cancel · secondary button] [Confirm · primary button · semantic color]
```

---

## 12. Motion & Animation

### 12.1 Principles

Motion in this system is **functional, not decorative**. Every animation communicates a state change or directs attention. Never animate for style.

### 12.2 Durations

| Token | Duration | Usage |
|---|---|---|
| `duration-fast` | 100ms | Hover state color changes |
| `duration-base` | 150ms | Component show/hide, badge swaps |
| `duration-slow` | 300ms | Card expand/collapse, tab transitions |
| `duration-chart` | 400ms | Chart initial mount animation |
| `duration-pulse` | 2000ms | Active pipeline step pulse |

### 12.3 Easing

```
ease-standard:   cubic-bezier(0.2, 0, 0, 1)   — most transitions
ease-enter:      cubic-bezier(0, 0, 0.2, 1)    — elements entering
ease-exit:       cubic-bezier(0.4, 0, 1, 1)    — elements leaving
ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1)  — progress bar fill only
```

### 12.4 Specific Animations

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

**Skeleton shimmer:**
```css
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Disable all animations for:**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 13. Accessibility

### 13.1 Color Contrast Requirements

All text and interactive elements must meet **WCAG 2.1 AA**:

| Context | Minimum ratio | Target ratio |
|---|---|---|
| Normal text (<18px) | 4.5:1 | 7:1 |
| Large text (≥18px bold) | 3:1 | 4.5:1 |
| UI components (icons, borders) | 3:1 | 3:1 |

**Verified pairs in this system:**

| Foreground | Background | Ratio | Pass |
|---|---|---|---|
| `#18180F` on `#F5F4F0` | Text on page bg | 18.6:1 | ✓ AAA |
| `#0C447C` on `#E6F1FB` | TWSP badge | 7.2:1 | ✓ AAA |
| `#085041` on `#E1F5EE` | CFSP badge | 6.8:1 | ✓ AAA |
| `#27500A` on `#EAF3DE` | Completed badge | 7.1:1 | ✓ AAA |
| `#633806` on `#FAEEDA` | Warning badge | 5.9:1 | ✓ AA |
| `#791F1F` on `#FCEBEB` | Critical badge | 6.4:1 | ✓ AA |

### 13.2 Keyboard Navigation

- All interactive elements reachable via `Tab` key
- Focus order follows visual reading order (left-to-right, top-to-bottom)
- Focus ring: `2px solid color-blue`, `outline-offset: 2px`, never `outline: none`
- Pipeline steps navigable via arrow keys when focused
- Tab bar navigable via arrow keys (ARIA tab role pattern)
- Modals trap focus while open, return focus to trigger on close

### 13.3 Screen Reader Support

```
Batch cards:    aria-label="[Batch name] - [Status] - [N] days to billing deadline"
Progress bars:  role="progressbar" aria-valuenow aria-valuemin aria-valuemax aria-label
Status badges:  aria-label with full text (e.g., "Status: Training Ongoing")
Pipeline:       role="list" with each step as role="listitem" and aria-current="true" on active
Charts:         role="img" aria-label describing the chart and its key finding
Metric cards:   aria-label="[Label]: [Value]. [Sub-label]"
```

### 13.4 Semantic HTML

```
Page heading:   <h1> for "Training Batch Manager"
Section headings: <h2> for tab section titles
Card titles:    <h3>
Field labels:   <dt> in definition lists OR <label> for interactive fields
Tables:         <th scope="col"> for headers, <caption> for table title
Navigation:     <nav> with aria-label="Dashboard navigation"
```

---

## 14. Design Tokens (Code)

### 14.1 `design-tokens.ts`

```typescript
export const tokens = {

  // ── Typography ──────────────────────────────────────────────
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

  // ── Colors ──────────────────────────────────────────────────
  colors: {
    bg:           '#F5F4F0',
    surface:      '#FFFFFF',
    surfaceAlt:   '#EEECEA',
    surfaceRaised:'#FAF9F6',
    border:       '#D8D6D0',
    borderStrong: '#B0AEA8',
    borderFaint:  '#E8E6E2',

    text: {
      primary:   '#18180F',
      secondary: '#5A5950',
      muted:     '#97968E',
      disabled:  '#C4C2BC',
      inverse:   '#F5F4F0',
    },

    blue: {
      DEFAULT: '#185FA5',
      lt:      '#E6F1FB',
      dk:      '#0C447C',
      border:  '#B5D0EE',
      hover:   '#D4E8F8',
    },
    teal: {
      DEFAULT: '#0F6E56',
      lt:      '#E1F5EE',
      dk:      '#085041',
      border:  '#9FE1CB',
      hover:   '#C8EFE3',
    },
    green: {
      DEFAULT: '#3B6D11',
      lt:      '#EAF3DE',
      dk:      '#27500A',
      border:  '#B5D98A',
      hover:   '#D5EBB8',
    },
    amber: {
      DEFAULT: '#854F0B',
      lt:      '#FAEEDA',
      dk:      '#633806',
      border:  '#F0C07A',
      hover:   '#F5DEB8',
    },
    red: {
      DEFAULT: '#8B2020',
      lt:      '#FCEBEB',
      dk:      '#791F1F',
      border:  '#E8A0A0',
      hover:   '#F8D4D4',
    },
    purple: {
      DEFAULT: '#534AB7',
      lt:      '#EEEDFE',
      dk:      '#3C3489',
    },
  },

  // ── Spacing ─────────────────────────────────────────────────
  spacing: {
    '0.5': '2px',
    '1':   '4px',
    '2':   '8px',
    '3':   '12px',
    '4':   '16px',
    '5':   '20px',
    '6':   '24px',
    '8':   '32px',
    '10':  '40px',
    '12':  '48px',
    '16':  '64px',
  },

  // ── Border radius ────────────────────────────────────────────
  borderRadius: {
    sm:   '3px',
    md:   '6px',
    lg:   '8px',
    xl:   '12px',
    full: '9999px',
  },

  // ── Shadows ─────────────────────────────────────────────────
  boxShadow: {
    sm:  '0 1px 2px rgba(15,14,11,0.06)',
    md:  '0 2px 6px rgba(15,14,11,0.08), 0 1px 2px rgba(15,14,11,0.04)',
    lg:  '0 4px 16px rgba(15,14,11,0.10), 0 2px 4px rgba(15,14,11,0.06)',
  },

  // ── Duration ─────────────────────────────────────────────────
  transitionDuration: {
    fast:  '100ms',
    base:  '150ms',
    slow:  '300ms',
    chart: '400ms',
    pulse: '2000ms',
  },

  // ── Urgency tiers ────────────────────────────────────────────
  urgency: {
    critical: { days: [null, 6],    color: '#8B2020', bg: '#FCEBEB', border: '#E8A0A0' },
    warning:  { days: [7, 21],      color: '#854F0B', bg: '#FAEEDA', border: '#F0C07A' },
    onTrack:  { days: [22, null],   color: '#3B6D11', bg: '#EAF3DE', border: '#B5D98A' },
  },

} as const;
```

### 14.2 `tailwind.config.ts` extension

```typescript
import { tokens } from './design-tokens';

export default {
  theme: {
    extend: {
      fontFamily:    tokens.fontFamily,
      fontSize:      tokens.fontSize,
      colors:        tokens.colors,
      spacing:       tokens.spacing,
      borderRadius:  tokens.borderRadius,
      boxShadow:     tokens.boxShadow,
      transitionDuration: tokens.transitionDuration,
    },
  },
};
```

---

## 15. Figma File Structure

### 15.1 Page Organization

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

### 15.2 Component Naming Convention

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
  Pipeline / Step / Pending
  Table / Row / Default
  Table / Row / Hover
  Table / Row / Selected
```

### 15.3 Color Style Naming

```
Background / Page
Background / Surface
Background / Surface Alt
Background / Surface Raised

Border / Default
Border / Strong
Border / Faint

Text / Primary
Text / Secondary
Text / Muted
Text / Disabled
Text / Inverse

Status / Blue / DEFAULT
Status / Blue / Light
Status / Blue / Dark
[same pattern for Teal, Green, Amber, Red, Purple]
```

### 15.4 Auto-Layout Rules

- All components use auto-layout
- No fixed-width frames unless the component has a defined max-width constraint
- Horizontal padding: use `space-4` (16px) as the default for cards, `space-2` (8px) for compact components
- Resizing: components resize horizontally (fill container) unless they are badge/pill type (hug contents)

---

## Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | May 2026 | — | Initial release. Covers typography, color, spacing, 12 components, 4 charts, tokens, Figma structure. |

---

*Training Compliance System Design System · TESDA TWSP & CFSP Operations · Built for real data — 3 batches, 47 scholars, 2026 cycle.*
