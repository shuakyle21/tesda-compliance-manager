# Design System Rules

Spec-mandated, non-negotiable visual constraints. Principles: status at a glance · density without crowding · semantic color only · government trustworthiness · operational, not presentational.

## Hard rules

- **No emoji** anywhere in UI; icons are `@tabler/icons-react` line icons; icon-only controls require accessible names
- **IBM Plex Sans** for UI text, **IBM Plex Mono** for IDs, dates, codes, percentages, NC levels, metric values
- **Semantic color tokens only** (defined in `app/globals.css` + `app/design-system.css`) — never raw hex in components
- **Status conveyed by text + icon, never color alone**; must remain clear in grayscale
- Target **WCAG 2.2 AA** — contrast, keyboard operation, dialog semantics, live regions

## Color semantics

Red = critical/error only · Amber = warning/pending only · Green = approved/on-track only · Blue = informational/active nav · Teal = program accent · Purple = NC levels. Background is warm off-white; surfaces restrained neutral.

## Layout

4px base grid (2px micro steps) · 40px desktop table rows · 32px dense desktop controls, **44px touch targets** · restrained 8px radius · no nested card-on-card layouts · no muted 9–11px text for operationally critical data.

## Mandatory screen states

Every data screen implements: **loading, empty, no-results, error/sync-failed, permission-denied, stale-data** (plus success and long-text handling). Empty states name the next action. Screens with relative dates show an exact **"Data as of"** timestamp — relative labels are computed, never hand-typed ([[Data Layer Pattern]]).

## Copy voice

Direct and administrative. Never expose implementation terms (`tenant_id`, table names, SQL, "Supabase") — say "School-level access", "Evidence", "Batch records". Never imply official TESDA approval ([[Product Overview]]).

## Related

- [[Modals And Drawers]] — the overlay-specific contract
- [[Architecture Overview]] — component layering

Sources: [[MASTER_PRD_SRS]] §14 · [[TRD]] §13 · [[UI_UX_MODAL_AUDIT]]
