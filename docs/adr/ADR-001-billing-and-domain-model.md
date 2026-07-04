# ADR-001 — Billing Engine & Domain Model

Status: Accepted
Date: 2026-06-30
Owner: Product + System Architecture
Supersedes: relevant non-goals in `docs/MVP_PRD.md` (see §12)
Source authorities:

- **TESDA Circular No. 015, series of 2026** — *Schedule of Costs of TESDA
  Scholarship Programs* (effective 12 Feb 2026; supersedes Circular 010 s.2025).
- **TESDA scholarship payment guidelines** §5.1.1–5.1.2 (Training Cost release)
  and §7.2.2–7.2.4 (TSF release).
- **Notice to Proceed (NTP / Annex M)** documents (RQM allocations).
- School billing template: *"BILLING - TSF & New Normal Allowance.docx"*.

## Context

This ADR records the decisions from a structured domain-modeling interview that
worked through how TVI-CAMS actually tracks attendance, computes scholar
eligibility, and **generates official TESDA billing documents**. The interview
revealed that billing — originally scoped in the MVP PRD as a passive
"preparation signal" — is in fact the system's most load-bearing workflow, with
regulator-defined computation rules. Several MVP non-goals are deliberately
revised as a result (§12).

Every decision below is referenced as a stable ID (e.g. **B2**, **F1**) so the
PRD, TRD, and Implementation Plan can cite them without restating them.

---

## 1. Attendance & Progress

| ID | Decision |
| --- | --- |
| **B2** | Progress is **attendance-derived**: `sessions_held ÷ total_sessions`. It is *not* time-elapsed and *not* manually typed. |
| **PathA** | **OCR is deferred, not in MVP.** Trainers enter attendance manually; the paper attendance sheet (with Time In/Out + signature) is uploaded as evidence. When OCR lands later, it populates the same `attendance_records` rows — schema unchanged, only the writer changes. |
| **C2** | Attendance is recorded **per learner per session date**, capturing `time_in`/`time_out`. Unique on `(tenant_id, batch_id, learner_id, attendance_date)`. |
| **E2** | `total_sessions` = program **nominal hours ÷ 8** (8-hour sessions), **snapshotted onto the batch at creation** — immune to later program/circular changes. Example: 360 hrs ÷ 8 = 45 sessions. |
| **D3** | Session target is **fixed at creation** (E2), not derived from the calendar. The weekly schedule pattern (Mon–Fri, Mon–Sat, …) is customizable per batch and affects *how fast* sessions are consumed and the batch's calendar duration, **not** the session count. |
| **X2** | Attendance is **mutable in place**; every edit writes an `activity_log` event (who, when, before→after). Editing is **never locked**, even post-billing (see Y-hybrid). |

## 2. Eligibility

| ID | Decision |
| --- | --- |
| **Elig** | A scholar is **ineligible for allowance if absences ≥ 5** (single rule, stored as `max_absences = 4` in program rules; tenant override allowed). No attendance-percentage rule is used for eligibility — only the absence count. |
| — | Eligibility is evaluated **per scholar**; the per-scholar absence count also drives the TSF absence deduction (§4). |

## 3. Cost Schedule (`scholarship_cost_schedule`)

| ID | Decision |
| --- | --- |
| **BB1** | The TESDA Schedule of Cost is modeled as a **seeded reference table** keyed by `(scholarship_program, qualification_code)`. The batch **snapshots its matching cost row at creation** (extends E2 to all cost components). |
| **BB1-prune** | **No `circular_no` / `effectivity_date` columns** — version-safety lives in the batch snapshot, so the reference table holds current rates only. Only **billing-relevant components**, only the MVP programs (**TWSP + CFSP**). |

**Components retained (TWSP + CFSP only):**

| Component | TWSP | CFSP |
| --- | --- | --- |
| Training Cost (per scholar) | ✓ (per qualification) | ✓ (per qualification) |
| National Assessment Fee | ✓ | ✓ |
| TSF day-rate | ₱160/day | ₱160/day |
| New Normal Assistance | — | ₱1,000 |
| Accident Insurance | — | ₱100.80 |
| Entrepreneurship Fee | via PAFSE (separate) | ₱800 (3 days included in hours) |
| Book / Learning Materials | — (PESFA only — out of scope) | — |

Worked example (CFSP, Agricultural Crops Production NC II, `AFFACP213`): 360 hrs
→ 45 days; TSF = 45 × ₱160 = **₱7,200**; New Normal ₱1,000; Insurance ₱100.80;
Entrepreneurship ₱800. All values appear verbatim in Circular 015 s.2026.

## 4. Billing — General Model

| ID | Decision |
| --- | --- |
| **V2** | The app **generates the official TESDA billing documents** (not merely a signal). *This reverses two MVP non-goals — see §12.* |
| **W1** | Generation **populates the school's existing `.docx` template** (school provides the template with per-school header; merge tokens are added). Output preserves the letterhead/signatures TESDA already accepts. |
| **AA2** | The app generates **all TVI-billed billing types** (not just one). |
| **TVI-scope** | The **TVI bills**: ① Training Cost, ② TSF/Allowance (TSF + New Normal + Insurance for CFSP), ③ Entrepreneurship. The **Assessment Center bills the Assessment Fee separately** — the app does **not** generate assessment billing. |
| **NoLedger** | **No running envelope ledger / no over-billing guard.** The TESDA Provincial Office reconciles totals. `billing_records` is a **generation log** (type, date, generated-by, amount, scholar snapshot), versioned/append-only — re-generation appends a new snapshot; nothing is overwritten. |
| **Y-hybrid** | Attendance stays editable post-billing (X2); each generation appends a new `billing_records` snapshot. The "student 5 forgotten" case is supported: correct attendance → re-generate → new snapshot. History shows the correction (e.g. ₱137,000 → ₱145,200). |
| **Order** | Billing scholar rows are **alphabetized by last name and sequentially numbered**. |
| **AmtWords** | The cover statement renders the **total amount in words** ("One Hundred Thirty Seven Thousand Pesos only"). |

### 4.1 TSF / Allowance release (rules 7.2.2 / 7.2.3 / 7.2.4)

Release schedule is a **function of the batch's calendar duration**; the trigger
for every tranche is **per-scholar % of nominal training duration**
(`attended_sessions ÷ total_sessions`).

| Duration | Tranches (% of total TSF @ per-scholar attendance threshold) |
| --- | --- |
| **< 2 months (7.2.2)** | 50% @ ≥20% · remaining 50% @ ≥80% |
| **≥ 2 months (7.2.3)** | 20% @ ≥20% · 40% @ ≥50% · 40% @ ≥80% |

| ID | Decision |
| --- | --- |
| **FF2** | The **absence deduction applies to the final (80%) tranche in BOTH schedules** (uniform). Final tranche = `tranche% × total_TSF − (absences × ₱160)`. Net effect: a scholar is paid for days actually attended. |
| **7.2.4** | Every TSF billing carries the **eligible-scholar list**, backed by daily attendance (manual sheets are accepted evidence — *"the manual daily attendance sheets, whichever is applicable"* — so the app's manually-entered attendance + uploaded sheet is a legitimate billing basis; no hard BSRS reconciliation required). |

### 4.2 Training Cost release (rules 5.1.1 / 5.1.2)

Amount: `training_cost_snapshot × eligible_scholars`. Boundary is **60 *training*
days** (distinct from TSF's 2-*month* boundary — a batch runs both schedules in
parallel).

| Duration | Tranches |
| --- | --- |
| **< 60 training days (5.1.1)** | Full payment, single document, at completion. |
| **> 60 training days (5.1.2)** | 50% @ ≥50% duration · 50% at end. |

Each tranche is *"subject to the submission of verified documents"* — see §5.

### 4.3 Entrepreneurship billing

| ID | Decision |
| --- | --- |
| **Entre** | `₱800 × scholars WITHOUT the entrepreneurship_completed flag`, single payment on delivery of the 3-day block. No tranche rule (none exists in the circular). |
| **Flag-3x** | `learners.entrepreneurship_completed` is a **dual-training guard** set by the registrar after verifying T2MIS/BSRS. It has **three effects**: (1) TSF −3 days = −₱480; (2) training duration −3 days; (3) **excluded from the ₱800 entrepreneurship billing**. |

## 5. Documents & Billing Checklists

| ID | Decision |
| --- | --- |
| **I2** | Document requirements are **lifecycle-staged** (`required_at_stage`), no hard gates: a requirement only shows as "missing" once its stage is reached. |
| **II1+II2** | The app **generates the Billing Statement** (W1) **and tracks a per-tranche supporting-document checklist** (the external artifacts: MIS-0302/Terminal Report, Annex K, Daily Attendance Sheet). |
| **KK1** | **Per-document verification** using the existing flow `missing → pending → submitted → verified`. Verify requires Admin/Coordinator. |
| **LL1** | Billing-supporting documents are tracked at **tranche level** (required attachment per tranche per batch), not per scholar. Annex K is one signed packet per tranche. |
| **Ready** | "Billing-ready" = **batch threshold reached AND all that tranche's supporting docs = verified.** |

## 6. RQM / NTP Authorization

| ID | Decision |
| --- | --- |
| **Z3** | The NTP authorization is modeled on the batch (one-to-one — see Card). One NTP document lists **multiple RQM lines** (each a unique allocation); each RQM line becomes **its own batch**. |
| **Card** | **One RQM code = one batch.** A batch is authorized by exactly one RQM allocation. The RQM/NTP fields live **directly on `batches`**: `rqm_code`, `ntp_number`, `approved_slots`, `total_amount`, `indicative_start_date`, `ntp_approval_date`, `ntp_received_date`. |
| **Cap** | `approved_slots` is the **billable-pax cap** (bill fewer for dropouts, never more). `total_amount` is the RQM funding envelope (recorded, but not enforced as a ledger — NoLedger). |
| **Lag** | The NTP "act within N days or lose the allocation" clause is the **"NTP lag"** deadline; computed from `ntp_received_date` / `indicative_start_date`. Trainer DTOs omit NTP-lag fields. |

RQM code structure (decoded): `RQM<tranche>-<year>-<program>-<institution>-<seq>`,
e.g. `RQM3-2026-CFSP-1263-0009` where `1263` = the school's TESDA institution
code. The `aou → ntp` lifecycle step is where RQM allocations attach to a batch,
during the import wizard's enrich step (§8).

## 7. Tenancy & Access

| ID | Decision |
| --- | --- |
| **K1** | The selected school lives in the **URL path segment** (`/{tenant}/dashboard`), under the admin/coordinator/viewer dashboard tree. SSR-native, shareable, never dropped. |
| **K1-redirect** | **Single-tenant users are auto-redirected** to their one school (no chooser). Trainer routes address **by batch** (`/trainer/classes/[batchId]/...`), not by tenant segment — the batch carries its own `tenant_id`. |
| **L1** | **One context = one tenant.** No cross-school aggregate view; a multi-school coordinator switches school to compare. |
| **Membership** | Membership is **plural & persistent** (`profile_tenant_memberships`, the RLS basis); active context is **singular & in the URL**. A coordinator *has* many schools but is always *in* one. |
| **M2** | Trainers are scoped to batches via a **`batch_trainer_assignments` join** (supports co-trainers + trainers across schools). RLS `can_trainer_write_batch` checks this join; trainer school-membership is optional. |
| **N2** | Trainer scheduling conflicts are checked at **day level** (shared training weekday + overlapping date range). Schema (schedule_pattern + dates) lands in Phase 0; the cross-tenant check is a **soft warning** added when the assignment UI is built. |

## 8. Learner Identity & Import

| ID | Decision |
| --- | --- |
| **Q1** | **ULI is the permanent primary key** on every learner row (a national TESDA identifier). Stored consistently; uniqueness is **by value, not by shared row** — the same person at two schools is two tenant-scoped rows with the same ULI. **TESDA's systems remain the authoritative lifetime record**; the app does not perform cross-TVET tracking. A thin global `learner_identities(uli, full_name, …)` dimension exists as a **future seam** only (no cross-school double-enrollment detection in MVP). |
| **R2** | A CSV import carries **batch metadata + learner roster in one file**, committed atomically (raw-T2MIS-export shape). |
| **S1** | Import is a **wizard: parse → enrich → commit.** The enrich step supplies what the CSV can't: confirm program/qualification, set `schedule_pattern`; `total_sessions` and the cost-row snapshot auto-fill from the program (E2/BB1). Validation + dedup live on this screen. |
| **T2** | Re-import of an existing `batch_code` is an **additive merge with mandatory preview**, dedup by **ULI**: new ULIs inserted, existing skipped, **nothing ever deleted**. Protects attendance/document history. |

## 9. Alerts

| ID | Decision |
| --- | --- |
| **JJ1** | Alerts are **computed on read** (derived from batch state), **not** stored/pushed — no cron, no email (consistent with MVP scope). Surfaced in an in-app notifications drawer + inline batch badges. `alerts_log` stays deferred. |
| **Triggers** | Billing-readiness (20/50/80% per billing type, gated on verified docs), NTP-lag deadline, missing per-tranche documents. |
| **Scope** | Alerts inherit data role/tenant scoping: **trainers never see billing/NTP alerts**; coordinators/admins see billing + document + NTP alerts for their tenant only. |

## 10. Configuration Surface

Three tiers:

| Tier | Settings |
| --- | --- |
| **System** | (none required for MVP) |
| **Program / qualification** | Cost-schedule rates (BB1), `max_absences` cap. |
| **Tenant** | Signatories (Prepared by / Approved by — name + title), letterhead/header image, TESDA PO addressee (name + office/region), partial-billing enabled + threshold overrides (COALESCE over program defaults). |

Billing generation pulls **signatories/header/addressee from tenant settings**,
**amounts from the batch snapshot**, and the **scholar list alphabetized +
numbered**. Signatories are tenant-level (not per-batch).

## 11. New / changed data model (summary)

**New tables:** `attendance_records`, `program_modules`,
`batch_trainer_assignments`, `scholarship_cost_schedule`, `billing_records`
(generation log), `tenant_settings`, `learner_identities` (future seam).

**Batch fields:** `rqm_code`, `ntp_number`, `approved_slots`, `total_amount`,
`indicative_start_date`, `ntp_approval_date`, `ntp_received_date`,
`schedule_pattern`, `total_sessions`, snapshotted cost components,
`entrepreneurship_delivered` (batch-level marker for entrepreneurship billing
trigger).

**Learner fields:** `uli` (permanent key, indexed), `entrepreneurship_completed`.

**LAMR:** one per module per batch; `lamr_reports` FK to `program_modules`
(`module_id`), unique `(tenant_id, batch_id, module_id)`. Missing-LAMR = program
modules with no matching report; named exactly by module.

## 12. Revised MVP non-goals (consequences of V2)

The following `docs/MVP_PRD.md` non-goals are **revised**:

1. *"No advanced TESDA-format report generation beyond basic CSV exports"* →
   **superseded** for billing: the app generates the official TSF/Allowance,
   Training Cost, and Entrepreneurship billing documents (V2/W1/AA2). It does
   **not** generate Assessment billing (TVI-scope) and does **not** implement an
   official submission workflow.
2. *"No OCR or document intelligence layer"* → **OCR is deferred, not excluded**
   (PathA). The attendance schema is designed so OCR can later populate it.
3. ULI cross-school identity → a **future seam only** (Q1); not built in MVP.
4. *"No advanced analytics charts" / "no email / no cron"* → **unchanged.**
   Alerts are computed on read (JJ1); reconciliation is the TESDA PO's job
   (NoLedger).

## 13. Open / deferred (not yet grilled)

CSV export format & scope; LAMR entry-workflow UI detail; MIS-0302 / Terminal
Report handling (tracked as an external attachment); attendance edit windows
beyond X2; ≥2-month Training Cost edge interactions. These are intentionally
left for a follow-up pass against the updated docs.

## Related

- [[MASTER_PRD_SRS]] — FR-09 revised per this ADR
- [[MVP_PRD]] — non-goals revised per §12
- [[TRD]] — §4.3a / §16 implement these decisions
- [[IMPLEMENTATION_PLAN]] — Phase 4B is this ADR's build plan
- [[TVI-CAMS Knowledge Base]]
