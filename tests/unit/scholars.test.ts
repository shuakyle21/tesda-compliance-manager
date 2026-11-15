import { describe, expect, it } from 'vitest';
import { scholarCountLabel } from '@/modules/batches/domain/scholars';

describe('scholarCountLabel', () => {
  it('shows enrolled against approved slots when the slots are recorded', () => {
    expect(scholarCountLabel({ scholars: 12, approvedSeats: 25 })).toBe('12/25');
    expect(scholarCountLabel({ scholars: 0, approvedSeats: 25 })).toBe('0/25');
  });

  it('shows enrolled scholars alone when no slots are recorded', () => {
    expect(scholarCountLabel({ scholars: 12 })).toBe('12');
    expect(scholarCountLabel({ scholars: 12, approvedSeats: 0 })).toBe('12');
  });
});
