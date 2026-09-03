/**
 * Shared vocabulary — fixed TESDA terminology, not data.
 *
 * These tables are closed sets defined by the TESDA program itself. They are not
 * rows, they will never be fetched, and they do not vary by tenant — unaffected
 * by the mock-data retirement (`shared/mocks/` was removed entirely).
 *
 * WHY NOT `shared/mocks/` (where they used to live, TES-74, before its removal):
 * `mocks/` was the `unconfigured` fallback dataset. Filing fixed vocabulary there
 * made every consumer read as if it depended on mock data, and hid the real
 * coupling behind a large import count — vocabulary is an input to fixtures, not
 * an output of them.
 *
 * WHY NOT a module `domain/`: `shared/` may not import `modules/`
 * (eslint.config.mjs, `import/no-restricted-paths`), and `modules/reports/ui`
 * consumes `EMPLOYMENT_STATUSES` — so a module home would invert into a
 * boundary violation.
 * EGACE_STAGES stays here alongside it because it has consumers in two modules
 * (batches/ui, reports/ui); homing it in either would invent a cross-module
 * dependency that does not exist today. Its `EgaceStage` type is in
 * `shared/types.ts`, so value and type sit together.
 *
 * Business rules that operate *on* this vocabulary belong in a module `domain/`,
 * not here. This file holds terms only.
 */

import type { EgaceStage } from '@/shared/types';

/**
 * The EGACE funnel — Enrolled, Graduate, Assessed, Certified, Employed. Carries
 * presentation keys (`icon`, `colorKey`) so the dashboard and report surfaces
 * render the same stage identically instead of each restating the mapping.
 */
export const EGACE_STAGES: EgaceStage[] = [
  { key: 'enrolled',  label: 'Enrolled',  short: 'E', icon: 'users',        colorKey: 'blue' },
  { key: 'graduate',  label: 'Graduate',  short: 'G', icon: 'presentation', colorKey: 'teal' },
  { key: 'assessed',  label: 'Assessed',  short: 'A', icon: 'file-check',   colorKey: 'amber' },
  { key: 'certified', label: 'Certified', short: 'C', icon: 'certificate',  colorKey: 'purple' },
  { key: 'employed',  label: 'Employed',  short: 'E', icon: 'briefcase',    colorKey: 'green' },
];

/**
 * Post-training employment classifications used by the employment follow-up.
 * `na` is the empty string on purpose — it means "not yet followed up", which is
 * distinct from `unemployed` (followed up, confirmed without work).
 */
export const EMPLOYMENT_STATUSES = {
  wage: 'Wage-Employed',
  self: 'Self-Employed',
  awaiting: 'Awaiting Follow-up',
  unemployed: 'Unemployed',
  na: '',
} as const;
