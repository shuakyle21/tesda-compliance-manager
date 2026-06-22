/**
 * UI COMPONENT — TrainerAvatar (ported from components/TrainerAvatar.jsx)
 *
 * Initials-only avatar with a deterministic color from a name hash, plus
 * spec-mandated overrides for the three known trainers.
 */

import type { CSSProperties } from 'react';

const PALETTES = [
  { bg: '#B5D4F4', fg: '#0C447C' },
  { bg: '#9FE1CB', fg: '#085041' },
  { bg: '#FBCB91', fg: '#7A3806' },
  { bg: '#B5D98A', fg: '#27500A' },
  { bg: '#D0CCF0', fg: '#3C3489' },
];

const OVERRIDES: Record<string, { bg: string; fg: string }> = {
  'Archelyn Gagula': PALETTES[0],
  'Julius Maravilla': PALETTES[1],
  'Agustin Pudadera III': PALETTES[2],
};

function initials(name: string) {
  const parts = (name || '').trim().split(/\s+/);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

export function TrainerAvatar({ name, size = 'md', style }: { name: string; size?: 'sm' | 'md'; style?: CSSProperties }) {
  const palette = OVERRIDES[name] || PALETTES[hash(name) % PALETTES.length];
  const px = size === 'sm' ? 24 : 32;
  const fs = size === 'sm' ? 10 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: px, height: px, borderRadius: 9999,
      background: palette.bg, color: palette.fg,
      fontFamily: 'var(--font-sans)', fontSize: fs, fontWeight: 600,
      flexShrink: 0,
      ...style,
    }}>
      {initials(name)}
    </span>
  );
}

export default TrainerAvatar;
