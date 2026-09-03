/**
 * Shared batch filtering — search across name/id/qualification/trainer + program
 * pill, then sort by earliest billing deadline. Used by Cards, Table, Documents.
 */

import type { Batch } from '@/shared/types';

/**
 * Filter and sort batches by program and search query.
 *
 * First filters by program (if not 'all'), then by free-text search across
 * batch name, ID, qualification, and trainer name. Results are sorted by
 * earliest billing deadline (ascending days to billing).
 *
 * @param batches - The batches to filter
 * @param query - Free-text search query (case-insensitive)
 * @param program - Program filter ('all' or specific program code)
 * @returns Filtered and sorted batches
 */
export function filterBatches(batches: Batch[], query: string, program: string): Batch[] {
  let xs = batches;
  if (program !== 'all') xs = xs.filter((b) => b.program === program);
  if (query) {
    const q = query.toLowerCase();
    xs = xs.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q) ||
      b.qualification.toLowerCase().includes(q) ||
      b.trainer.toLowerCase().includes(q));
  }
  return [...xs].sort((a, b) => a.daysToBilling - b.daysToBilling);
}
