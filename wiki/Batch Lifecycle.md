# Batch Lifecycle

A batch progresses through internal lifecycle stages. The lifecycle is **internal tracking only** and must never imply official TESDA submission or approval.

## Stages

DB enum `lifecycle_stage`: `aou → ntp → tip → training → assessment → billing`, plus `completed` and `blocked`.

| Stage | Meaning |
| --- | --- |
| AOU | Authority to Undertake submitted or in preparation |
| NTP | Notice to Proceed received — where the RQM allocation attaches ([[RQM And NTP Authorization]]) |
| TIP | Training Induction Program conducted |
| Training | Training ongoing — attendance drives progress ([[Attendance And Progress]]) |
| Assessment | Assessment stage |
| Billing | Internal billing preparation / generation ([[Billing Engine]]) |

## The enum bridge (UI ≠ DB)

The UI lifecycle differs from the DB enum, and the translation lives **in the mapper layer, never in components** ([[Data Layer Pattern]]):

- DB `training` → UI `train`, `assessment` → `assess`, `billing` → `bill`
- UI **`entre`** (entrepreneurship) stage is **UI-only** — no DB column
- DB **`blocked`** surfaces as UI **`pending`** (the UI status union has no `blocked`)

`DB_TO_UI_STAGE` in `modules/batches/data/batches.ts` is a total map: a new DB enum variant fails compilation until its UI treatment is chosen.

## Rules

- Batch code is unique per tenant (`(tenant_id, batch_code)`).
- Stage transitions preserve audit history — every change writes an `activity_log` event.
- Impossible states are flagged (e.g., Billing marked ready before Assessment — test T-009).
- Viewers see the lifecycle but cannot edit it.
- Batch `status` enum: `pending, ongoing, completed, blocked`.

## Related

- [[Document Checklist And Evidence]] — requirements are lifecycle-staged (`required_at_stage`)
- [[Learner Identity And Import]] — how batches are created
- [[Database Schema]]

Sources: [[MASTER_PRD_SRS]] FR-04 · [[MVP_PRD]] §7.3 · [[TRD]] §4.2 · [[SUPABASE_SCHEMA_GUIDE]]
