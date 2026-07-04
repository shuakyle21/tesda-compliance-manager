# Document Checklist And Evidence

Required documents are **configurable per scholarship program** (`program_document_requirements`), never hard-coded. The UI must show **exact missing document names** — no raw storage/table terminology.

## Status flow

`missing → pending → submitted → verified`

- Evidence is an uploaded file **or** an external link (`documents.storage_path` vs `documents.external_url`).
- A valid upload sets status `submitted` and writes an `activity_log` event.
- **Verify requires Admin or Coordinator** (KK1). Viewers get open-only actions; trainers attach only trainer-audience docs on assigned batches.

## Lifecycle staging (I2)

Requirements are **lifecycle-staged** (`required_at_stage`), with no hard gates: a requirement only shows as "missing" once its stage is reached ([[Batch Lifecycle]]). Example document keys: `aou`, `ntp`, `tip_report`, `training_schedule`, `attendance`, `lamr`, `assessment`, `billing_report`.

## Billing supporting documents (II2, LL1)

The app both **generates** the Billing Statement ([[Billing Engine]]) and **tracks a per-tranche supporting-document checklist** for the external artifacts: MIS-0302 / Terminal Report, Annex K, Daily Attendance Sheet. These are tracked at **tranche level** (one required attachment per tranche per batch), not per scholar. "Billing-ready" = threshold reached AND all tranche docs verified.

## Storage

- Private Supabase Storage bucket **`compliance-evidence`**, 50 MB file limit.
- Object keys **must begin with the tenant UUID** (`<tenant_uuid>/<batch>/<document_key>/<filename>`) to satisfy tenant-folder RLS. The path is built **server-side**; the client never chooses the prefix.
- Files are served via scoped authorization or signed URLs; the UI says "evidence" / "source file", never storage paths.

## Related

- [[LAMR Evidence]] — structured evidence beyond file uploads
- [[Auth And Tenancy]] — storage RLS
- [[Database Schema]] — `documents`, `program_document_requirements`

Sources: [[MASTER_PRD_SRS]] FR-06 · [[MVP_PRD]] §7.4 · [[ADR-001-billing-and-domain-model]] §5 · [[TRD]] §9
