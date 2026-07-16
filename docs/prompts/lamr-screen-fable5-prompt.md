# Fable 5 Design Prompt — LAMR Structured Evidence Screen (FR-08)

> Paste everything below the line into Fable 5. It is self-contained: domain facts,
> data model, layout, exact design tokens, states, and role rules are all inline so
> the model never has to guess or invent a value.

---

## ROLE

You are a senior product designer for **TVI-CAMS**, an internal, multi-tenant
compliance tool used by TESDA-accredited farm schools (TVIs) to run scholarship
training batches (TWSP / CFSP). You design dense, government-grade operational
software — the opposite of a marketing site. Produce a single, production-faithful
screen design for the **LAMR** record, delivered as clean semantic HTML + CSS
(no framework), styled strictly to the design system defined below.

## WHAT YOU ARE DESIGNING

The **LAMR — Learners Achievement Monitoring Report** screen for one training
batch. LAMR is **structured training evidence**, not a file upload and not a
simple attendance sheet. It captures, for one module of one batch: a header, the
learner roster, the module's learning outcomes, the activities under each outcome,
a completion mark for every learner × activity pair, and a per-learner
institutional assessment verdict — plus a link to the scanned source document that
this structured record was transcribed from.

Route context: this lives at `/batches/[batchId]/lamr`. It is opened by a
Coordinator, Admin, or the batch's assigned Trainer. Treat it as a full page with
the standard app shell (left sidebar + top bar) already present — design the page
body only, but show where it sits.

**Critical product truth (must be honored in copy):** TVI-CAMS is an *internal
working layer only*. TESDA's SIS / T2MIS / BSRS remain the authoritative systems.
No copy may imply official approval, official submission, or that this record has
legal standing. It is evidence the school maintains for itself.

## THE DATA MODEL (use these exact fields and enums — do not invent others)

**Header (one per module per batch):**
- TVI name (school)
- Program title
- Batch / section
- Module title
- Schedule (free text, e.g. "MWF 8:00–12:00, Jun 2–Jul 18 2026")
- Prepared by (name)
- Approved by (name)
- Source document — a scanned/uploaded file OR an external link (LMS/BSRS
  evidence); show the linked filename + "View source" affordance.

**Learning Outcomes** — ordered list; each has:
- Outcome code (`LO1`, `LO2`, `LO3`, …)
- Outcome title (e.g. "Establish Nursery", "Plant Seedlings")
- Hours (numeric)

**Activities** — belong to one outcome; each has:
- Activity code (`ACT1`, `ACT2`, …)
- Activity title
- (multiple activities per outcome; the count varies per outcome)

**Learner entry** — one per learner × activity:
- `is_completed` (boolean → shown as a completion mark)
- Plus, once per learner (trailing column), an **assessment result** enum —
  exactly one of:
  - `competent` → "Competent"
  - `not_yet_competent` → "Not Yet Competent"
  - `pending` → "Pending" (not yet recorded)

**Invariant to surface in the UI:** each learner/activity pair is unique — the
matrix has exactly one cell per intersection.

## THE CORE LAYOUT CHALLENGE (this is the point of the screen)

The body is a **two-level grouped-column matrix**:

- **Rows** = learners (numbered, alphabetized), sticky first column with learner
  name + ULI.
- **Column groups** = Learning Outcomes. Each outcome is a spanning group header
  showing `LO1 · Establish Nursery · 6 hrs`.
- **Sub-columns** = the activities under that outcome (`ACT1`, `ACT2`, …), each a
  narrow column.
- **Cells** = completion mark for that learner × activity (done / not done —
  convey by icon + text/aria, never color alone).
- **Trailing frozen column** = that learner's **Assessment Result** badge.

The matrix is horizontally wide → it must scroll horizontally *inside its own
container* with the learner-name column and the assessment column pinned; the page
itself must never scroll sideways. The outcome group headers stay aligned above
their activity columns while scrolling.

Provide a compact summary strip above the matrix: total learners, # Competent, #
Not Yet Competent, # Pending, and overall completion (marks filled ÷ total cells).

## DESIGN SYSTEM (non-negotiable — pull every value from here)

**Type & icons**
- Fonts: **IBM Plex Sans** (UI), **IBM Plex Mono** (codes/IDs/numbers only).
  Never Inter, Geist, Roboto, Arial, or a bare system stack.
- Icons: **Tabler line icons**, 2px stroke. Never emoji anywhere. Never
  Heroicons / Material / Font Awesome.
- Body text 13px; this is dense operational tooling.

**Spacing & shape**
- 4px base spacing grid (2px half-steps only for icon-to-label gaps / badge
  padding). Table rows ~40px tall. Card padding 16px.
- Border radius: 3px sub-elements, 6px badges, 8px cards/buttons/inputs, 12px
  modals. **Nothing above 12px anywhere.**
- Flat surfaces. **No gradients. No colored/tinted shadows.** `shadow-sm` at rest,
  `shadow-md` on hover. Structure comes from 1px borders and background contrast,
  not elevation.

**Semantic color — one meaning each, never decorative**
- Green `#3B6D11` = completed / competent / on-track.
- Amber `#C7600F` = warning / pending-attention / moderate.
- Red `#C81F1F` = critical / error only.
- Blue `#185FA5` = informational callouts/icons; TWSP program badge.
- Teal `#0F6E56` = CFSP program badge only.
- Purple `#534AB7` = NC level indicators only.
- Neutral greys for everything structural.
- **Status must be conveyed by text + icon, never by color alone (WCAG 2.2 AA).**

Assessment badges (use the Status Badge component style — icon + label + tinted
pill): **Competent → green**, **Not Yet Competent → amber**, **Pending → neutral
grey**. Completion marks: filled check (green) with visible label/aria for done; a
neutral outline/dash for not-done — distinguishable without color.

**Explicit anti-patterns (this project banned these; do not reintroduce):**
- No 3px left-border urgency/accent stripe on cards, callouts, or rows
  (flagged as "AI-slop"). Use full-perimeter 1px tinted borders instead.
- No hero gradients, no playful illustrations, no rounded-blob shapes.
- No emoji, no decorative color.

## REQUIRED SCREEN STATES (show each as a labeled variant)

Design and label all of these — this project mandates every data screen implement
them:
1. **Loaded / populated** (the main design).
2. **Loading** (skeleton; never blocks the shell).
3. **Empty** — no LAMR created yet for this batch/module → an Empty State that
   says the next action ("Create the LAMR record for this module"), not just
   "No data".
4. **Partial / in-progress** — outcomes and activities defined but some cells and
   assessments still `pending` (show how pending reads).
5. **Error / sync-failed** — a banner that states the exact recovery step; never
   leak raw database or table names.
6. **Permission-denied / read-only** — Viewer role: the entire matrix is read-only
   with edit affordances removed (not merely greyed); a quiet "Read-only" chip.
7. **Stale data** — every screen with relative dates shows an exact **"Data as
   of &lt;timestamp&gt;"** line.

## ROLE RULES (server-truth, reflect in the UI)

- **Admin / Coordinator** — full view + edit of header, outcomes, activities,
  marks, and assessment results.
- **Assigned Trainer** — may edit marks, assessment results, and trainer-side
  evidence for their own batch; sees the same LAMR. LAMR contains **no billing /
  financial / deadline fields at all**, so nothing needs hiding here — but do not
  add any billing, NTP, or BSRS-status field to this screen.
- **Viewer** — strictly read-only (state 6).

## DELIVERABLE

- A single self-contained HTML file with inline `<style>` (CSS variables for the
  tokens above), IBM Plex loaded, Tabler-style inline SVG line icons.
- The populated state as the primary artifact, with the other six states shown as
  clearly separated, labeled sections below it (or a state switcher).
- Realistic Filipino sample data: a farm-school program (e.g. Horticulture NC II
  under CFSP, or a TWSP trade), 3 learning outcomes with 2–3 activities each,
  ~8–12 learners with mixed completion and a realistic spread of Competent / Not
  Yet Competent / Pending. Use plausible ULIs and names; never real personal data.
- Responsive: the page body never scrolls horizontally; only the matrix container
  does, with its first (learner) and last (assessment) columns pinned.
- Accessible: focus rings 2px solid blue with 2px offset (never `outline:none`),
  correct table semantics (`<th scope>` / grouped headers), and aria labels on the
  matrix, completion marks, and badges.

## HOW TO WORK

Think first about the matrix's grouped-column structure and the pinned columns —
that is the load-bearing decision. Keep density high but uncrowded. When a choice
is ambiguous, favor the government-grade, operational reading over anything
decorative. Do not output marketing polish; output a tool a coordinator would use
to validate blended-learning evidence at a glance.
