# RQM And NTP Authorization

How TESDA authorizes a batch, per ADR-001 decisions Z3, Card, Cap, Lag.

## One RQM code = one batch (Card)

One Notice to Proceed (NTP / Annex M) document lists **multiple RQM lines**, each a unique allocation. **Each RQM line becomes its own batch.** There is no `program_rqm` table — the RQM/NTP fields live **directly on `batches`**:

`rqm_code`, `ntp_number`, `approved_slots`, `total_amount`, `indicative_start_date`, `ntp_approval_date`, `ntp_received_date`

RQM code structure: `RQM<tranche>-<year>-<program>-<institution>-<seq>`, e.g. `RQM3-2026-CFSP-1263-0009` (1263 = the school's TESDA institution code).

## The two money fields (Cap)

- `approved_slots` — the **billable-pax cap**: bill fewer for dropouts, never more.
- `total_amount` — the RQM funding envelope. Recorded but **not enforced as a ledger** — the TESDA Provincial Office reconciles ([[Billing Engine]] NoLedger).

## NTP lag (Lag)

The NTP's "act within N days or lose the allocation" clause is the **NTP-lag deadline**, computed from `ntp_received_date` / `indicative_start_date` and flagged when it exceeds the configured threshold. **Trainer DTOs omit all NTP-lag fields** ([[Roles And Permissions]]).

## When it attaches

RQM allocations attach to a batch at the `aou → ntp` lifecycle step, during the import wizard's **enrich** step ([[Learner Identity And Import]]).

## Related

- [[Batch Lifecycle]] — the NTP stage
- [[Billing Engine]] — `approved_slots` caps billed pax
- [[Alerts]] — NTP-lag is an alert trigger

Sources: [[ADR-001-billing-and-domain-model]] §6 · [[MVP_PRD]] §7.9 · [[TRD]] §4.3
