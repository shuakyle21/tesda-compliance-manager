# TODO

## Figma Prototype Integration

- [ ] Treat Figma as the visual reference, not as embedded runtime UI.
- [ ] Build shared dashboard shell first: `Topbar`, `MetricsRow`, `DashboardTabs`, and `ContentShell`.
- [ ] Move design tokens from `DESIGN.md` into `app/globals.css`: color, typography, spacing, radius, shadows, and status states.
- [ ] Create a shared mock data layer for batches, metrics, documents, activity events, and chart values.
- [ ] Implement screens in this order:
  1. Activity Log
  2. Table View
  3. Documents Matrix
  4. Batch Cards
  5. Analytics
- [ ] Use generic `ScholarshipProgram` records instead of hard-coded `TWSP | CFSP` logic.
- [ ] Keep red, amber, and green reserved for compliance status and urgency.
- [ ] Connect Supabase and Clerk only after the static dashboard shell and mock data flow are stable.
