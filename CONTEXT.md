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

### Documents

**Untracked (document)**:
A required document the batch has **no record for at all** — its programme requirement catalog never listed it. A third state, equal to neither Verified nor Missing: excluded from every compliance percentage (numerator *and* denominator), and never satisfying a readiness gate. With nothing tracked, compliance reads **"—"**, not 0% and not 100%. The rule lives in one place, `modules/documents/domain/compliance.ts` — see [[ADR-004-untracked-document-semantics]].
_Avoid_: Treating an absent record as Verified ("compliant by omission") or as Missing (asserts absence of a document nobody required)

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

### Access & authorization

**Profile**:
A signed-in user's `public.profiles` row (`clerk_user_id`, `role`, `is_active`). The record RLS actually reads via `app_private.current_profile_id()`/`current_role()` — the resolver must read the same row, not a separate copy.
_Avoid_: User (ambiguous between the Clerk identity and this row), Account

**Tenant membership**:
A `public.profile_tenant_memberships` row — one profile's grant of access to one tenant. Today a profile has exactly one active membership in practice; multi-membership (a profile spanning tenants) is out of scope until a real need appears.
_Avoid_: Assignment, tenant link

**Resolved role**:
The lowercase role value (`'admin' | 'coordinator' | 'trainer' | 'viewer'`) the app trusts for a request — sourced from the profile's `role` column, matching the `public.profile_role` Postgres enum exactly. `ProfileRole` in `modules/tenancy/domain/profile.ts` must use this same lowercase vocabulary, not its own capitalized set.
**Admin** is the school's proprietor; **coordinator** is staff running batches day to day; **viewer** is read-only; **trainer** sees only their own batches and no billing. Admin and coordinator are indistinguishable in every current policy — each check pairs them — so today the difference records who someone *is*, not what they may do.
_Avoid_: Capitalized role labels as a type (`'Admin'`, etc.) — those are display copy, not the domain value

**Denied**:
A profile that resolves (active, has a role) but fails `can_access_tenant` for the tenant in question — distinct from **unresolved**.
_Avoid_: Using "denied" for a missing profile row

**Unresolved**:
No active `public.profiles` row exists for the signed-in Clerk user at all — nothing to resolve a role or tenant from. The least-privileged fallback (viewer, read-only) applies here, same as it does for denied, but the two causes are not interchangeable when diagnosing an access problem.

### Entrepreneurship (three distinct concepts)

**Entrepreneurship component**:
A program-level trait: whether the scholarship program includes entrepreneurship (e.g. CFSP does). The `entre` pipeline stage appears **only** for programs that carry it — it is not a per-batch toggle. Hovering the stage surfaces the entrepreneurship-enrolled count.
_Avoid_: `entrepreneurship_delivered` as a batch input (the stage is program-derived)

**Entrepreneurship history**:
A per-scholar flag (`entrepreneurship_completed`), set at training start as "Entrepreneurship attended? ☐ + date". Means the scholar _already_ has entrepreneurship and skips the module. One flag, three effects: excluded from the ₱800 track, training duration −3 days, TSF allowance −₱480.
_Avoid_: "completed entrepreneurship this batch" (it means _prior_ history)

**Entrepreneurship billing**:
The ₱800-per-scholar track: bill `₱800 × scholars enrolled in entrepreneurship who lack prior history`. Scholars with entrepreneurship history are excluded; a batch where all have it bills ₱0.
