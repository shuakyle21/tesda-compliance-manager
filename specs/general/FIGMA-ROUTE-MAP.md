# Figma To Route Map

This file maps the current TVI-CAMS Figma `Screens` page to production Next.js routes.

Figma source: `TVI-CAMS`, page `Screens` (`0:1`)

## Route Strategy

- Use Next.js App Router for all frontend screens.
- Keep the existing `(dashboard)` route group so URLs stay clean.
- Use Laravel API for production data, authorization, file uploads, CSV import/export, RQM, trainer updates, and activity logging.
- Treat modal/drawer frames as route states where they represent a shareable workflow; otherwise implement them as UI state inside the parent route.
- Enforce role and tenant scope in the API, not only in React.

## Primary Routes

| Figma frame | Node ID | Production route | Next.js file | Role scope | Status |
|---|---:|---|---|---|---|
| Frame 1 - Dashboard | `8:3122` | `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Admin, Coordinator, Viewer | Stub added |
| Frame 2 - Batch Cards | `42:1891` | `/batch-cards` | `app/(dashboard)/batch-cards/page.tsx` | Admin, Coordinator, Viewer | Existing placeholder |
| Frame 3 - Table View | `1:7780` | `/table-view` | `app/(dashboard)/table-view/page.tsx` | Admin, Coordinator, Viewer | Existing placeholder |
| Frame 4 - Documents | `9:2603` | `/documents` | `app/(dashboard)/documents/page.tsx` | Admin, Coordinator, Viewer | Existing placeholder |
| Frame 5 - Analytics | `12:1719` | `/analytics` | `app/(dashboard)/analytics/page.tsx` | Admin, Coordinator, Viewer | Existing placeholder |
| Frame 6 - Activity Log | `1:945` | `/activity-log` | `app/(dashboard)/activity-log/page.tsx` | Admin, Coordinator | Existing placeholder |

## Trainer Routes

| Figma frame | Node ID | Production route | Next.js file | Role scope | Status |
|---|---:|---|---|---|---|
| Frame 7 - Trainer Dashboard | `363:1839` | `/trainer` | `app/(dashboard)/trainer/page.tsx` | Trainer only | Stub added |
| Frame 8 - Trainer My Classes | `363:1907` | `/trainer/classes` | `app/(dashboard)/trainer/classes/page.tsx` | Trainer only | Stub added |
| Frame 9 - Trainer Attendance Flow | `363:1972` | `/trainer/classes/[batchId]/attendance` | `app/(dashboard)/trainer/classes/[batchId]/attendance/page.tsx` | Trainer only, assigned batch only | Stub added |
| Frame 10 - Trainer Document Upload | `363:2007` | `/trainer/classes/[batchId]/documents` | `app/(dashboard)/trainer/classes/[batchId]/documents/page.tsx` | Trainer only, assigned batch only | Stub added |

## Overlay And State Frames

| Figma frame | Node ID | Implementation route/state | Notes |
|---|---:|---|---|
| Frame 2 - Batch Cards - Modal Open | `165:1750` | `/batch-cards?batchId=:batchId` initially; optional future route `/batch-cards/[batchId]` | Use a modal/drawer state inside Batch Cards first. Add a deep route only when direct linking is required. |
| Annotations - Batch Cards | `324:1837` | No route | Handoff annotation only. |
| Annotations - design system basis | `363:2095` | No route | Handoff annotation only. |

## Operations And Utility Surfaces

These appear in navigation or handoff notes but are not full Figma screen frames yet.

| Surface | Proposed route/state | Role scope | Notes |
|---|---|---|---|
| Import CSV | `/import` or modal state on `/batch-cards` | Admin, Coordinator | MVP can keep this as a modal before adding a route. |
| Notifications | drawer state on current route | All signed-in roles with scoped content | Not a standalone route for MVP. |
| Settings and roles | `/settings` | Admin initially | Add only after auth/profile model is stable. |
| Scholarship Program / RQM setup | `/settings/programs` or `/programs` | Admin, Coordinator | Required because TESDA scholarship programs have RQM. |
| LAMR evidence | `/batches/[batchId]/lamr` | Admin, Coordinator, assigned Trainer as allowed | Required by MVP PRD; no dedicated Figma frame yet. |

## Backend API Alignment

| Frontend route | Laravel API dependencies |
|---|---|
| `/dashboard` | `GET /api/dashboard`, `GET /api/batches?summary=true` |
| `/batch-cards` | `GET /api/batches`, `GET /api/batches/{batch}` |
| `/table-view` | `GET /api/batches?view=table` |
| `/documents` | `GET /api/documents/matrix`, `POST /api/batches/{batch}/documents` |
| `/analytics` | `GET /api/analytics/summary` |
| `/activity-log` | `GET /api/activity-log` |
| `/trainer` | `GET /api/trainer/dashboard` |
| `/trainer/classes` | `GET /api/trainer/classes` |
| `/trainer/classes/[batchId]/attendance` | `GET /api/trainer/classes/{batch}/attendance`, `POST /api/trainer/classes/{batch}/attendance` |
| `/trainer/classes/[batchId]/documents` | `GET /api/trainer/classes/{batch}/documents`, `POST /api/trainer/classes/{batch}/documents` |

## Guard Rules

- Admin: one-school scope, full write inside assigned tenant.
- Coordinator: one or more school scopes, full compliance workflow access inside assigned tenants.
- Trainer: assigned batches only; no billing deadline, BSRS, NTP lag, billing preparation, or financial documents in API responses.
- Viewer: read-only assigned school access.
- RQM must be modeled as scholarship program metadata and reflected in document requirements, import/export, and readiness validation.

## Default Navigation

- `/` redirects to `/dashboard`.
- Admin/Coordinator sidebar: Dashboard, Batch Cards, Table View, Documents, Analytics, Activity Log.
- Trainer sidebar: Dashboard, My Classes.
- Viewer sidebar: Dashboard, Batch Cards, Table View, Documents, Analytics. Hide Activity Log unless explicitly granted.
