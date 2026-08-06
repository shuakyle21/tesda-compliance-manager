# Changelog

All notable changes to TVI-CAMS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**This project has not been released.** There are no tags, no GitHub releases, and
`package.json` sits at `0.1.0`. Everything below is therefore under `[Unreleased]`; no
version headings will be added until an actual release is cut. Entries describe what a
coordinator or trainer can now do, not the commits that got us there.

## [Unreleased]

### Added

- **Batch dashboard** for admin and coordinator roles: lifecycle pipeline
  (AOU → NTP → TIP → Training → Entre → Assessment → Billing), urgency tiering, and
  switchable card and table views over the active batch set.
- **Reports surface** covering the full batch set including completed cohorts: the EGACE
  outcomes funnel (Enrolled, Graduate, Assessed, Certified, Employed), the mandatory
  post-training employment follow-up, and a dependency-free `.xlsx` export in TESDA T2MIS
  terminal-report column order.
- **Billing packet queue** with derived packet identity and a `draft → ready → generated →
  submitted → settled` progression, plus a statement preview.
- **Documents surface** tracking the TESDA Circular 014-2026 checklist per batch, with
  critical-document compliance rolled into the dashboard metrics.
- **Authentication**: Clerk sign-in, a custom-styled sign-up modal matching the design
  system, a profile screen, and the organization-backed membership model.
- **Supabase-backed data access for batches** following a fetch → map → derive contract,
  with row-level security as the authorization boundary and discriminated result snapshots
  (`ok`, `sync-failed`, `unconfigured`) so screens can render each state deliberately.
- **Trainer routes** for teaching dashboard, class list, attendance, and per-batch
  documents.
- Functional-requirements use-case diagrams under `diagrams/`.

### Changed

- **Codebase reorganized around domain modules.** Code is grouped by domain
  (`modules/<domain>/{data,domain,ui}`) rather than by file type, with import direction
  enforced by ESLint: `app → modules → shared → lib/supabase`. Another module's `data/`
  layer is private.
- **Fixed TESDA vocabulary separated from mock data.** The EGACE stage set and employment
  classifications moved from `shared/mocks/seed.ts` to `shared/vocab.ts`. They are closed
  terminology that will never be fetched, so filing them alongside fixtures made every
  consumer read as though it depended on mock data.
- Raw generated database row types are now confined to data-access layers; components work
  exclusively with domain types.

### Fixed

- **The dashboard metrics strip no longer raises a false alarm on an empty tenant.** With
  no batches, the earliest-billing card rendered as critical (red) off a zero-day countdown
  for a deadline that does not exist, and document compliance read "All verified" when
  there was nothing to verify. Both now render as a neutral empty state. The strip also
  derives its empty state from the metrics it is given rather than from the mock dataset,
  so it stays correct once live data is connected.
- Supabase migration filenames reconciled with the applied migration ledger, so local and
  remote schema history agree.
- Corrected an arc computation in the document-status donut that mutated state during
  render.
- Restored Clerk v7 compatibility after a dependency upgrade.

[Unreleased]: https://github.com/shuakyle21/tesda-compliance-manager/commits/main
