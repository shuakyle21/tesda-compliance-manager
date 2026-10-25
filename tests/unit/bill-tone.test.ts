import { describe, it, expect } from 'vitest';
import { deriveBillTone } from '@/modules/batches/ui/billTone';

describe('deriveBillTone', () => {
  it('shows a missing deadline in the neutral tone, not as an alert', () => {
    const tone = deriveBillTone('muted');
    expect(tone.icon).toBe('info-circle');
    expect(tone.fg).toBe('var(--color-text-muted)');
    expect(tone.bg).not.toContain('red');
  });

  it('keeps overdue and critical red with the alert icon', () => {
    for (const tier of ['overdue', 'critical'] as const) {
      const tone = deriveBillTone(tier);
      expect(tone.icon).toBe('alert-triangle');
      expect(tone.fg).toBe('var(--color-red-dk)');
    }
  });

  it('keeps warning amber and on-track green', () => {
    expect(deriveBillTone('warning')).toMatchObject({ icon: 'clock', fg: 'var(--color-amber-dk)' });
    expect(deriveBillTone('on-track')).toMatchObject({ icon: 'check', fg: 'var(--color-green-dk)' });
  });
});
