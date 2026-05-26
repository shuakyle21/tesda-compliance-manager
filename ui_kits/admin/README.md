# Admin Dashboard — UI Kit

The single product surface covered by this design system: a coordinator-facing dashboard for managing TESDA farm school scholarship batches through the six-stage compliance lifecycle (AOU → NTP → TIP → Training → Assessment → Billing).

`index.html` is a clickable, working prototype of the four primary views: **Batch Cards**, **Table View**, **Analytics**, and **Activity Log**.

This kit is a static demo. It still uses TWSP and CFSP as sample scholarship program records in `data.js` and a few component variants. In the production app, these must be replaced by configurable scholarship program records and program badge colors from the Scholarship Program Catalog.

## Components

| File                       | Component(s)                             | Spec section |
| -------------------------- | ---------------------------------------- | ------------ |
| `Icon.jsx`                 | `<Icon name=… size=… />`                 | §7           |
| `StatusBadge.jsx`          | `<StatusBadge variant=… />`              | §8.1         |
| `ProgressBar.jsx`          | `<ProgressBar percent=… variant=… />`    | §8.2         |
| `MetricCard.jsx`           | `<MetricCard label value sub variant />` | §8.3         |
| `BatchCard.jsx`            | `<BatchCard batch=… />`                  | §8.4         |
| `LifecyclePipeline.jsx`    | `<LifecyclePipeline steps=… />`          | §8.5         |
| `UrgencyIndicator.jsx`     | `<UrgencyIndicator days=… variant=… />`  | §8.6         |
| `TrainerAvatar.jsx`        | `<TrainerAvatar name=… size=… />`        | §8.8         |
| `Misc.jsx`                 | `DocumentLinkRow`, `EmptyState`, `Toast` | §8.9 / §8.12 / §11.4 |
| `InfoCallout.jsx`          | `<InfoCallout variant=… />`              | §8.10        |
| `TabBar.jsx`               | `<TabBar tabs value onChange />`         | §8.11        |
| `Charts.jsx`               | `HBar`, `VBar`, `StackedBar`             | §9           |
| `App.jsx`                  | Composes everything into the dashboard.  | §10          |
| `data.js`                  | Sample data: 3 batches, 47 scholars, 7 activity events. | — |
| `kit.css`                  | Layout-only styles (tokens come from `../../colors_and_type.css`). |

## What it demonstrates

- The four-tab dashboard layout described in spec §10.1.
- All 12 components from spec §8.
- The four chart types from spec §9 (HBar progress, stacked elapsed/remaining, VBar with reference line × 2).
- Live filtering (search + program filter), sort-by-urgency default.
- A toast on the Re-sync button (success variant).

## Production alignment notes

- Treat TWSP and CFSP as sample data only, not fixed program branches.
- Replace hard-coded program filter pills with values loaded from the Scholarship Program Catalog.
- Replace program-specific badge variants with a generic program badge that receives configured colors.
- Keep red, amber, and green reserved for compliance status and urgency.
- Keep this kit as visual reference until the production Next.js app has its own typed domain model and live data layer.

## Deviations from spec

- **No left-border urgency accent on Batch Cards.** The user flagged that the 3px coloured left border felt "AI-slop." Urgency is still communicated via the urgency badge in the card header and the colour of the billing-deadline value. This intentionally diverges from spec §6.3.
- **No left-border accent on InfoCallouts** for the same reason. Spec §8.10 specified a 3px left accent; we use a 1px tinted full-perimeter border instead.
- **No left-border accent on warning/critical MetricCards.** Spec §8.3 specified one; we tint the label icon and sub-label instead.
- **Amber and red palettes were re-tinted** by the user — amber is warmer/more orange, red is more vivid/urgent. The spec's hex values are no longer canonical; `../../colors_and_type.css` is the source of truth.

## How to run

Open `index.html` in any modern browser. No build step. Babel transpiles the JSX in the page; React 18 + the IBM Plex webfonts load from CDNs.
