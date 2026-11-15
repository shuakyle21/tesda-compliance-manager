/**
 * The batch's displayed ID: its RQM code, or — while none is recorded — the
 * internal batch code plus a visible "RQM code not recorded" label (icon + text,
 * never colour alone). Colour and size are inherited from the parent, except the "not recorded" note, which sets its own small amber text.
 */

import { Icon } from '@/shared/ui/Icon';
import type { Batch } from '@/shared/types';

export function BatchIdLabel({ batch, className }: { batch: Pick<Batch, 'id' | 'rqmCode'>; className?: string }) {
  if (batch.rqmCode) {
    return <span className={className} style={{ fontFamily: 'var(--font-mono)' }}>{batch.rqmCode}</span>;
  }
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-mono)' }}>{batch.id}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-sans, inherit)', fontSize: 11, color: 'var(--color-amber-dk)' }}>
        <Icon name="alert-circle" size={11} />RQM code not recorded
      </span>
    </span>
  );
}
