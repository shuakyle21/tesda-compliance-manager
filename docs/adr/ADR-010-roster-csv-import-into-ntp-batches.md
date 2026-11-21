# ADR-010: Roster CSV imports into an existing batch

Status: Accepted (2026-11-16, product owner: Shua)
Supersedes: ADR-001 §8 **R2**, **S1** and **T2**
Related: ADR-001 §6 (RQM/NTP), ADR-009 (NTP batch creation, not in this repo)

## Context

ADR-001 assumed the roster CSV creates the batch. The TES-105 work changed the
order. The NTP PDF now creates the batch first, one per RQM line, before any
roster exists.

If the roster import still created a batch, one RQM would end up with two
batches. That breaks the rule **one RQM code = one batch**.

So the roster import has to find a batch that already exists. The T2MIS sheet
has no RQM column, so the file cannot say which batch it belongs to. A person
has to choose it.

## Decisions

### 1. The coordinator picks the batch

The import always runs against a batch the coordinator has chosen. The file
does not pick the batch.

**Why:** the file has no reliable key. A wrong guess puts scholars under the
wrong RQM, which changes billing pax and attendance.

The server still checks the batch through the normal row security rules, so a
user can only import into a batch they can already see.

### 2. Rows over the approved slots: warn, do not block

If the roster has more scholars than `approved_slots`, show a warning in the
preview. The import can still go ahead.

**Why:** slots are the billing cap. Billing already enforces the cap. The
import should not refuse data that a coordinator may need to review first.

### 3. All-or-nothing save

Either every row is saved, or none is. If any part of the save fails, nothing
is kept and the import reports a failure.

**Why:** a half-saved roster is hard to understand and hard to undo. Re-running
a partial import also risks confusion about which scholars were saved.

**Consequence:** the import must run in one database transaction. Writing
`learners` and `learner_details` in separate requests, as the code does today,
is not enough. The save goes in one database function, the same pattern as
`create_batches_from_ntp`.

### 4. Existing ULIs are skipped

If a ULI is already in the batch, leave that row alone and list it as
"skipped" in the preview.

**Why:** a ULI is the permanent learner key (ADR-001 Q1). Skipping avoids
duplicates and keeps history safe. ADR-001 T2 already says this.

**Consequence:** a re-import no longer fills in assessment results or
corrected names for scholars already in the batch. Those edits need their own
path, which is not designed yet.

### 5. Schedule and nominal hours: only on the batch edit screen

Schedule and nominal hours (which set `total_sessions`) are entered on the
batch edit screen. The roster import never sets them.

**Why:** these are batch facts, not roster facts. Putting them in the import
would make a roster file change the batch.

## What this means for the code (not done yet)

- `importLearnersCsv` changes to: skip existing ULIs, check the batch
  id, and save everything in one transaction.
- The preview shows warnings for slot overflow and lists the skipped rows.
- The import wizard stops creating batches.

## Open

- The exact wording of the "partial failure" message for the coordinator.
- Editing a scholar's assessment result after import (a separate design).
- Whether an RQM column in the file should pre-select the batch. Still a hint
  only, never the key.
