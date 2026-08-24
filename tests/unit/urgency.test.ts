import { describe, it, expect } from 'vitest';
import { urgencyTier } from '@/modules/batches/domain/urgency';

describe('urgencyTier', () => {
  it('returns critical at the boundary (6 days)', () => {
    expect(urgencyTier(6)).toBe('critical');
  });

  it('returns critical below the boundary (0 days)', () => {
    expect(urgencyTier(0)).toBe('critical');
  });

  it('returns critical for an overdue deadline (negative days)', () => {
    expect(urgencyTier(-3)).toBe('critical');
  });

  it('returns warning just past the critical boundary (7 days)', () => {
    expect(urgencyTier(7)).toBe('warning');
  });

  it('returns warning at the warning boundary (21 days)', () => {
    expect(urgencyTier(21)).toBe('warning');
  });

  it('returns on-track just past the warning boundary (22 days)', () => {
    expect(urgencyTier(22)).toBe('on-track');
  });

  it('returns on-track for a far-off deadline', () => {
    expect(urgencyTier(90)).toBe('on-track');
  });
});
