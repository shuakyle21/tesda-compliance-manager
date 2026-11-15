/**
 * UI COMPONENT — MetricCard (ported from components/MetricCard.jsx)
 *
 * Single KPI tile: label, value, one status line. Metric value renders in IBM
 * Plex Mono.
 *
 * warning/critical variants keep the spec's "no left border" deviation (§8.3)
 * and tint the label + status line — in the `-dk` shades, since base amber is
 * 4.1:1 on white and fails AA at 11px. They ALSO prefix the status line with a
 * status glyph, so severity is never carried by color alone (RULES.md rule 23;
 * this amends deviation #3, which specified the tint only).
 *
 * With `href`, the whole tile is one link to the place that explains the
 * number; `ariaLabel` gives screen readers the "[Label]: [Value]. [Status]"
 * sentence the spec requires when `value`/`sub` are rich nodes.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  variant?: 'neutral' | 'warning' | 'critical';
  iconName?: IconName;
  href?: string;
  ariaLabel?: string;
}

// chip/chipInk tint the label icon: a `-dk` glyph on its own `-lt` family, the
// pairing DESIGN.md §18 already uses for AA-safe semantic text.
const VARIANTS: Record<string, { tone?: string; statusIcon?: IconName; chip: string; chipInk: string }> = {
  neutral: { chip: 'var(--color-blue-lt)', chipInk: 'var(--color-blue-dk)' },
  warning: { tone: 'var(--color-amber-dk)', statusIcon: 'alert-circle', chip: 'var(--color-amber-lt)', chipInk: 'var(--color-amber-dk)' },
  critical: { tone: 'var(--color-red-dk)', statusIcon: 'alert-triangle', chip: 'var(--color-red-lt)', chipInk: 'var(--color-red-dk)' },
};

export function MetricCard({ label, value, sub, variant = 'neutral', iconName, href, ariaLabel }: MetricCardProps) {
  const v = VARIANTS[variant] || VARIANTS.neutral;

  const body = (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11, fontWeight: 500,
        color: v.tone || 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {iconName && (
          <span aria-hidden="true" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, flexShrink: 0,
            borderRadius: 'var(--radius-md)', background: v.chip, color: v.chipInk,
          }}>
            <Icon name={iconName} size={13} />
          </span>
        )}
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600,
        color: 'var(--color-text-primary)', marginTop: 8, lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 4,
          fontSize: 11, marginTop: 8,
          color: v.tone || 'var(--color-text-muted)',
          fontWeight: v.tone ? 500 : 400,
        }}>
          {/* Glyph stays beside the first line; only the text wraps. */}
          {v.statusIcon && <span style={{ flexShrink: 0, display: 'inline-flex', marginTop: 1 }}><Icon name={v.statusIcon} size={12} /></span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>{sub}</span>
        </div>
      )}
    </>
  );

  const style = {
    display: 'block',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 16,
    boxShadow: 'var(--shadow-sm)',
    minHeight: 80,
    color: 'inherit',
    textDecoration: 'none',
  } as const;

  return href ? (
    <Link href={href} className="metric-card-link" style={style} aria-label={ariaLabel}>{body}</Link>
  ) : (
    <div role="group" style={style} aria-label={ariaLabel}>{body}</div>
  );
}

export default MetricCard;
