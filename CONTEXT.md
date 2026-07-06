# TVI-CAMS

Internal multi-tenant compliance working layer for TVI schools running TESDA scholarship batches (TWSP/CFSP). It tracks batch lifecycle, documents, attendance, and LAMR evidence, and generates the TVI's official billing documents. TESDA SIS/T2MIS/BSRS remain the authoritative systems — this tool never holds official standing.

## Language

### Batch & authorization

**Batch**:
One RQM code's worth of scholars trained toward one qualification. The unit everything else hangs off. `One RQM code = one batch`.
_Avoid_: Class (a Trainer's view of a batch), cohort, group

**RQM**:
The Request-for-QM authorization code that names a batch. Modeled as attributes **on the batch** (`rqm_code`, `ntp_number`, `approved_slots`, `total_amount`, dates), never a separate table.
_Avoid_: Program-RQM table (a rejected design)

**NTP**:
Notice To Proceed — the approval that authorizes a batch to run. Lives on the batch (`ntp_number`, `ntp_approval_date`, `ntp_received_date`).

**Approved slots**:
The billable-pax cap for a batch. You may bill for fewer scholars, never more.

**ULI**:
The permanent national learner key (TESDA-issued). The same person at two schools is two tenant-scoped learner rows sharing one ULI.
_Avoid_: Learner id, student number

### Training & attendance

**Training progress**:
`sessions_held ÷ total_sessions`, where `total_sessions = nominal_hours ÷ 8`, snapshotted on the batch at creation. Attendance-derived, never time-elapsed. Answers "how far through training is this batch."
_Avoid_: % complete, days elapsed, duration progress

**Ineligible (scholar)**:
A scholar with **≥5 absences**, excluded from the allowance. This is the only eligibility rule (no attendance-% rule). Note: stored as `max_absences = 4`, but copy always states the rule as "≥5".

### Billing

**Billing track**:
One of the three parallel schedules a batch bills on — **Training Cost**, **TSF/Allowance**, **Entrepreneurship** — each releasing money on its **own clock**. Assessment Fee is out of scope (billed by the Assessment Center).
_Avoid_: Billing type used loosely; "the billing" (there are three)

**Billing tranche**:
A single releasable payment within a billing track, unlocked at an attendance threshold. Distinct from **training progress**: tranches answer "which money is releasable," not "how far through training."
_Avoid_: Installment, milestone payment

**Readiness gate**:
The compound, per-tranche condition that unlocks document generation: the tranche's attendance threshold reached **AND** that tranche's supporting documents (MIS-0302/Terminal Report, Annex K, Daily Attendance Sheet) all Verified. Supporting docs are tracked at **tranche level**, not per scholar.
_Avoid_: "Billing-ready" meaning threshold-only

**Billing document**:
A populated `.docx` generated from the school's own template (letterhead, tenant signatories, TESDA-PO addressee). Generation is append-only history — corrections re-generate a new versioned snapshot, nothing is overwritten.
_Avoid_: Invoice, bill (these imply external issuance the tool does not perform)

### Entrepreneurship (three distinct concepts)

**Entrepreneurship component**:
A program-level trait: whether the scholarship program includes entrepreneurship (e.g. CFSP does). The `entre` pipeline stage appears **only** for programs that carry it — it is not a per-batch toggle. Hovering the stage surfaces the entrepreneurship-enrolled count.
_Avoid_: `entrepreneurship_delivered` as a batch input (the stage is program-derived)

**Entrepreneurship history**:
A per-scholar flag (`entrepreneurship_completed`), set at training start as "Entrepreneurship attended? ☐ + date". Means the scholar _already_ has entrepreneurship and skips the module. One flag, three effects: excluded from the ₱800 track, training duration −3 days, TSF allowance −₱480.
_Avoid_: "completed entrepreneurship this batch" (it means _prior_ history)

**Entrepreneurship billing**:
The ₱800-per-scholar track: bill `₱800 × scholars enrolled in entrepreneurship who lack prior history`. Scholars with entrepreneurship history are excluded; a batch where all have it bills ₱0.
