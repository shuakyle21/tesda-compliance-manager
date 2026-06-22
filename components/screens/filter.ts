/**
 * Shared batch filtering — search across name/id/qualification/trainer + program
 * pill, then sort by earliest billing deadline. Used by Cards, Table, Documents.
 */

import type { Batch } from '@/lib/data/types';

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
