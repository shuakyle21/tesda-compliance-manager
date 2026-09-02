import { describe, expect, it } from 'vitest';
import { MILESTONE_TONE } from '@/modules/batches/ui/dashboard/BatchTimeline';
import type { LifecycleStatus } from '@/shared/types';

/**
 * Locks the milestone diamond's per-status styling.
 *
 * Before the lookup existed these fifteen values were spelled out as five
 * repeated `done ? … : active ? … : …` ternaries inside the milestone render
 * callback. The timeline is only reachable behind Clerk auth, so this spec is
 * what actually proves the extraction preserved behaviour — if any value here
 * drifts, a milestone silently renders the wrong status.
 */
describe('MILESTONE_TONE', () => {
  it('covers every lifecycle status and nothing else', () => {
    expect(Object.keys(MILESTONE_TONE).sort()).toEqual(['active', 'done', 'pending']);
  });

  it('matches the styling the ternaries produced', () => {
    expect(MILESTONE_TONE.done).toEqual({
      fillVar: '--color-blue',
      strokeVar: '--color-blue',
      labelVar: '--color-text-secondary',
      dash: null,
      word: 'done',
    });
    expect(MILESTONE_TONE.active).toEqual({
      fillVar: '--color-amber',
      strokeVar: '--color-amber',
      labelVar: '--color-text-secondary',
      dash: null,
      word: 'in progress',
    });
    expect(MILESTONE_TONE.pending).toEqual({
      fillVar: '--color-surface',
      strokeVar: '--color-border-strong',
      labelVar: '--color-text-muted',
      dash: '2 2',
      word: 'pending',
    });
  });

  // d3's `.attr(name, null)` REMOVES an attribute; 'none' would set it. Only
  // pending draws a dashed outline, so the other two must stay null, not 'none'.
  it('leaves stroke-dasharray unset for the solid diamonds', () => {
    expect(MILESTONE_TONE.done.dash).toBeNull();
    expect(MILESTONE_TONE.active.dash).toBeNull();
    expect(MILESTONE_TONE.pending.dash).toBe('2 2');
  });

  // Status must read as text in the accessible tree, never colour alone
  // (RULES.md §4) — these words go into each milestone's <title>.
  it('gives every status a distinct word for the accessible title', () => {
    const words = (['done', 'active', 'pending'] as LifecycleStatus[]).map((s) => MILESTONE_TONE[s].word);
    expect(new Set(words).size).toBe(3);
    expect(words.every((w) => w.length > 0)).toBe(true);
  });
});
