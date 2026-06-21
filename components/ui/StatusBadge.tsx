/**
 * UI COMPONENT — StatusBadge (ported from components/StatusBadge.jsx)
 *
 * Categorical-state chip. Variant maps to a semantic color pair; mono type,
 * 20px tall, 6px radius per spec. Server Component — pure render.
 */

import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type BadgeVariant =
  | 'twsp' | 'cfsp' | 'nc-ii' | 'nc-i' | 'ongoing' | 'completed'
  | 'upcoming' | 'cancelled' | 'approved' | 'not-approved'
  | 'critical' | 'warning' | 'on-track';

const BADGE_STYLES: Record<BadgeVariant, { bg: string; fg: string; border?: string }> = {
  twsp:           { bg: 'var(--color-blue-lt)',   fg: 'var(--color-blue-dk)' },
  cfsp:           { bg: 'var(--color-teal-lt)',   fg: 'var(--color-teal-dk)' },
  'nc-ii':        { bg: 'var(--color-purple-lt)', fg: 'var(--color-purple-dk)' },
  'nc-i':         { bg: 'var(--color-amber-lt)',  fg: 'var(--color-amber-dk)' },
  ongoing:        { bg: 'var(--color-blue-lt)',   fg: 'var(--color-blue-dk)' },
  completed:      { bg: 'var(--color-green-lt)',  fg: 'var(--color-green-dk)' },
  upcoming:       { bg: 'var(--color-amber-lt)',  fg: 'var(--color-amber-dk)' },
  cancelled:      { bg: 'var(--color-red-lt)',    fg: 'var(--color-red-dk)' },
  approved:       { bg: 'var(--color-green-lt)',  fg: 'var(--color-green-dk)' },
  'not-approved': { bg: 'var(--color-surface-alt)', fg: 'var(--color-text-muted)', border: 'var(--color-border)' },
  critical:       { bg: 'var(--color-red-lt)',    fg: 'var(--color-red-dk)' },
  warning:        { bg: 'var(--color-amber-lt)',  fg: 'var(--color-amber-dk)' },
  'on-track':     { bg: 'var(--color-green-lt)',  fg: 'var(--color-green-dk)' },
};

interface StatusBadgeProps {
  variant?: BadgeVariant;
  iconName?: IconName;
  children: ReactNode;
  style?: CSSProperties;
}

export function StatusBadge({ variant = 'ongoing', iconName, children, style }: StatusBadgeProps) {
  const s = BADGE_STYLES[variant] || BADGE_STYLES.ongoing;
  return (
    <span
      className="status-badge"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 20, padding: '0 8px',
        borderRadius: 'var(--radius-md)',
        background: s.bg, color: s.fg,
        border: s.border ? `1px solid ${s.border}` : 'none',
        fontFamily: 'var(--font-mono)',
        fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {iconName ? <Icon name={iconName} size={12} /> : null}
      {children}
    </span>
  );
}

export default StatusBadge;
