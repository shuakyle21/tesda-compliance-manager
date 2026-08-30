# modules/notifications — Notifications Drawer (FR-13)

No module code yet. Alerts are computed on read (no cron/email — ADR-001); the dashboard `AlertsPanel` currently lives in `modules/batches/ui/dashboard/` and derives alert rows live from the `batches` already loaded for the dashboard (billing-ready, BSRS approved, critical billing window, missing critical docs, NTP lag) — not a static mock log.

## Planned
- `domain/alerts.ts` — on-read alert derivation rules
- `ui/` — notifications drawer; `AlertsPanel` may migrate here if alerting outgrows the dashboard widget
