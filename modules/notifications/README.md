# modules/notifications — Notifications Drawer (FR-13)

No module code yet. Alerts are computed on read (no cron/email — ADR-001); the dashboard `AlertsPanel` currently lives in `modules/batches/ui/dashboard/` and reads `ALERTS_LOG` from `shared/mocks`.

## Planned
- `domain/alerts.ts` — on-read alert derivation rules
- `ui/` — notifications drawer; `AlertsPanel` may migrate here if alerting outgrows the dashboard widget
