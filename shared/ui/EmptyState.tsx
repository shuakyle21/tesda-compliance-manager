/**
 * UI COMPONENT — EmptyState (ported from components/Misc.jsx)
 * Centered icon + heading + optional sub-copy + optional action node.
 */

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  iconName?: IconName;
  heading: string;
  sub?: string;
  action?: ReactNode;
}

export function EmptyState({ iconName = 'search-off', heading, sub, action }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 8, textAlign: 'center' }}>
      <Icon name={iconName} size={32} style={{ color: 'var(--color-text-muted)' }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', marginTop: 6 }}>{heading}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 320 }}>{sub}</div>}
      {action}
    </div>
  );
}

export default EmptyState;
