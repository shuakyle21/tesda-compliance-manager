# TODO

## Production Architecture Direction

- [ ] Use **Next.js** for the production frontend: App Router pages, dashboard shell, role-based screen rendering, and design-system components.
- [ ] Use a **Laravel API** as the recommended production backend for tenant-scoped compliance data, roles, policies, uploads, CSV import/export, queues, and activity logs.
- [ ] Treat **NestJS** as the alternate backend only if the implementation team wants a full TypeScript stack or already has stronger Nest/Node experience than Laravel/PHP.
- [ ] Do not build the full domain backend only with Next.js Route Handlers; use them only for lightweight frontend/BFF endpoints if needed.
- [ ] Keep Clerk as the auth provider, then verify Clerk user/session claims inside the Laravel API before applying role and tenant rules.
- [ ] Keep PostgreSQL/Supabase as the likely database/storage layer unless the Laravel implementation moves storage fully into Laravel-managed infrastructure.
- [ ] Enforce tenant boundaries server-side for every API query and mutation; never rely on frontend filtering for school or trainer scope.
- [ ] Hide billing deadline, BSRS, NTP lag, billing preparation, and financial documents from Trainer API responses, not only from the UI.
- [ ] Model TESDA scholarship program RQM as first-class program metadata, not as loose notes or hard-coded UI text.

## Figma Prototype Integration

- [ ] Treat Figma as the visual reference, not as embedded runtime UI.
- [x] Map current Figma `Screens` page frames to Next.js routes in `specs/general/FIGMA-ROUTE-MAP.md`.
- [x] Add route stubs for `/dashboard`, `/trainer`, `/trainer/classes`, `/trainer/classes/[batchId]/attendance`, and `/trainer/classes/[batchId]/documents`.
- [ ] Build shared dashboard shell first: `Topbar`, `MetricsRow`, `DashboardTabs`, and `ContentShell`.
- [ ] Move design tokens from `DESIGN.md` into `app/globals.css`: color, typography, spacing, radius, shadows, and status states.
- [ ] Create a shared mock data layer for batches, metrics, documents, activity events, and chart values.
- [ ] Implement screens in this order:
  1. Dashboard
  2. Activity Log
  3. Table View
  4. Documents Matrix
  5. Batch Cards
  6. Trainer Dashboard
  7. Trainer My Classes
  8. Trainer Attendance Flow
  9. Trainer Document Upload
  10. Analytics
- [ ] Use generic `ScholarshipProgram` records instead of hard-coded `TWSP | CFSP` logic.
- [ ] Include RQM fields/status in `ScholarshipProgram`, batch setup, document requirements, import/export, and relevant admin/coordinator screens.
- [ ] Keep red, amber, and green reserved for compliance status and urgency.
- [ ] Connect Supabase and Clerk only after the static dashboard shell and mock data flow are stable.
