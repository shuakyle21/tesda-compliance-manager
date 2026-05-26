/* global React */
/* TrainerAvatar — initials only · deterministic color from name hash. */

const PALETTES = [
  { bg: '#B5D4F4', fg: '#0C447C' },   // blue-lt
  { bg: '#9FE1CB', fg: '#085041' },   // teal-lt
  { bg: '#FBCB91', fg: '#7A3806' },   // amber-lt (warm orange)
  { bg: '#B5D98A', fg: '#27500A' },   // green-lt
  { bg: '#D0CCF0', fg: '#3C3489' },   // purple-lt
];
// Spec-mandated overrides for the three known trainers
const OVERRIDES = {
  'Archelyn Gagula':       PALETTES[0],
  'Julius Maravilla':      PALETTES[1],
  'Agustin Pudadera III':  PALETTES[2],
};

function initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function TrainerAvatar({ name, size = 'md', style }) {
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

window.TrainerAvatar = TrainerAvatar;
