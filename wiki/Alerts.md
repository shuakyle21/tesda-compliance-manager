# Alerts

ADR-001 decision JJ1: alerts are **computed on read** — derived from batch state at render time. **No cron, no email, no stored alert rows** (`alerts_log` stays deferred). They surface in an in-app notifications drawer plus inline batch badges.

## Triggers

- **Billing readiness** — per billing type at the 20/50/80% thresholds, gated on verified tranche documents ([[Billing Engine]])
- **NTP-lag deadline** — the "act within N days" clause ([[RQM And NTP Authorization]])
- **Missing per-tranche documents** ([[Document Checklist And Evidence]])

## Scoping

Alerts inherit data role/tenant scoping: **trainers never see billing or NTP alerts**; coordinators/admins see billing + document + NTP alerts for their tenant only ([[Roles And Permissions]]).

## The notifications drawer

An accessible modal surface: focus trap, inert background, Escape closes, bell icon's accessible name includes the unread count ([[Modals And Drawers]]). For MVP it is derived from activity/blocker queries — email delivery (Resend), scheduled checks, and `alerts_log` are all later-backlog items.

## Related

- [[Attendance And Progress]] — urgency tiers feed alert display
- [[Implementation Roadmap]] — Phase 4.2

Sources: [[ADR-001-billing-and-domain-model]] §9 · [[MASTER_PRD_SRS]] FR-13 · [[MVP_PRD]] §4
