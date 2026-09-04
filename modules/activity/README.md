# modules/activity — Activity Log and Audit Trail (FR-12)

`data/activity.ts` — fetch → map → derive, per the `modules/batches/data/batches.ts` reference implementation. `getActivitySnapshot()` is read by the dashboard's Recent Activity panel and the full `app/(dashboard)/activity-log/page.tsx` feed; neither falls back to mock data on `unconfigured`/`sync-failed`.

## Planned
- `ui/` — activity feed components extracted from the page if it grows beyond a thin route
