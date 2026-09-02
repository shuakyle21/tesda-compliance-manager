# Implementation Plan

## [Overview]
Refactor `modules/reports/ui/ReportView.tsx` (601 lines) by extracting its pure logic — the zero-dependency `.xlsx` zip/OOXML writer, the T2MIS export row mapper, and the EGACE/employment computations — into `modules/reports/domain/`, per the repo's DDD-influenced module layout (CLAUDE.md, TES-68) and unit-testing rules (RULES.md #35). The React component shrinks to rendering + two thin orchestrators. Behavior is preserved byte-for-byte on the exported workbook; no public API changes; no new dependencies.

**Alignment with the app system**
- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic belongs in `domain/`, like `billing`, `batches`, `import-export`.
- RULES.md #8: import direction — a module's public surface is `domain/` + `ui/` (enforced by `import/no-restricted-paths` in eslint.config.mjs).
- RULES.md #35: mappers and m# Implementation Plan

## [Overview]
Refactor `modules/reports/ui/ReportView.tsx` (601 lines) by extracting its p, 15]`; `ReportView` currently measures
**Alignment with the app system**
- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic belongs in `domain/`, like `billing`, `batches`, `import-export`.
- RULES.md #8: import direction — a module's public surface is `domain/` + `ui/` (enforced by `import/no-restricted-paths` in eslint.config.mjs).
- RULES.md #35: mappers and m# Implementation Plan

## [Overview]
Refactor `modules/reports/ui/ReportView.tsx` (601 lines) by extracting its p, 15]`; `ReportView` currently measures
**Aes/reports/domain/xlsx.ts` (verbatim - RULES.md #8: import direction — a module's public surface is `domain/` + `ui/` (enforced by `import/no-restricted-paths` in eslint.config.msx`; exports `ZipEntry`, `crc32`, `buildXlsx`) · `modules/reports/domain/t2misExport.ts` (`T2MIS_HEADERS` 47 cols, `splitRegion`, `addressRegionFor`,
## [Overview]
Refactor `modules/reports/ui/Reporce.Refactor `moal**Alignment with the app system**
- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- CLAUDE.md: code grouped by dom·- RULES.md #8: import direction — a module's public surface is `domain/` + `ui/` (enforced by `import/no-restricted-paths` in eslint.config.mts- RULES.te lines 27–161 + inline computations; import domain; slim `exportXlsx`; add `downloadBlob` module-scope helper; header comment updated) ?## [Overview]
Refactor `modules/reports/ui/Reporin/Refactor `moCo**Aes/reports/domain/xlsx.ts` (verbatim - RULES.md #8: import direction — a module's public surface is `domain/`` ## [Overview]
Refactor `modules/reports/ui/Reporce.Refactor `moal**Alignment with the app system**
- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- CLAUDE.md: code grouped by dom·- RULES.md #8: import direction — a mce: string }`; `addressRegionFor(employer: string, tenantRegion: string): stringRefactor `mow.- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- TRefactor `modules/reports/ui/Reporin/Refactor `moCo**Aes/reports/domain/xlsx.ts` (verbatim - RULES.md #8: import direction — a module's public surface is `domain/`` ## [Overview]
Refactor `modules/reports/ui/Reporce.Refactor `moal**Alignment with the app system**
- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- CLAUDE.md: code grouped by dom·- RULES.md #8: import direction — a mcorRefactor `modules/reports/ui/Reporce.Refactor `moal**Alignment with the app system**
- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- CLAUDE.md:de- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup-RLRefactor `modules/reports/ui/Reporce.Refactor `moal**Alignment with the app system**
- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- CLAUDE.md: code grouped by dom·- RULES.md #8: import direction — a mcorRefactor `modules/reports/ui/Reporce.Refactor `moal**Alignment with the app system**
- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- Crt.test.ts` — 47 headers pinned; full 47-column row equals the legacy literal mapping; `splitRegion` with/without `·`; `addressRegionFor` named/Self-employed/empty; no `scholars_list` → no rows; unknown tenantId → blank fallback tenant; one row per scholar across batches; numeric age stringified.
3. `egace.test.ts` — `egaceVal` absent/unknown → 0; totals summed; `egaceRate` zero-guard; roster = `employmentFollowUp` - CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- CLAUDE.md: code grouped by dom·- RULES.md #8: import direction — a mcorRefactor `modules/reports/ui/Reporce.Refactor `moal**` (baseline: 4 pre-existing failures in `supabase-serve- CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- Crt.test.ts` — 47 headers pinned; full 47-column row equals the legacy literal mapping; `splitRegion` with/without `·`; `addressRegionFor` named/Self-empl153. `egace.test.ts` — `egaceVal` absent/unknown → 0; totals summed; `egaceRate` zero-guard; roster = `employmentFollowUp` - CLAUDE.md: code grouped by domain (`data/`, `domain/`, `ui/`) — pure logic bup- CLAUDE.md: code grouped by dom·- RULES.md #8: import direction — a mcorRefactor `modules/reports/ui/Reporce.Refactor `moal**` (baseline: 4 pre-lint warning) | < 15, no warning |
| `exportXlsx` | 11 | ~3 |
| `empTone` | 5 | 1–2 (lookup) |
| `buildT2misRows` (new) | — | ~9, named + tested |
