/**
 * Leaf-level copy helpers — pure string shaping, no data and no domain rules.
 *
 * WHY NOT `shared/vocab.ts`: that file is explicitly "terms only" — closed
 * TESDA vocabulary tables, not functions. A count-to-noun helper is copy
 * shaping, so it gets its own leaf module rather than bending vocab's contract.
 */

/**
 * Picks the singular or plural noun for a count. Defaults to batch/batches,
 * the only pairing the dashboard surfaces use today.
 */
export function pluralize(count: number, singular = 'batch', plural = 'batches'): string {
  return count === 1 ? singular : plural;
}
