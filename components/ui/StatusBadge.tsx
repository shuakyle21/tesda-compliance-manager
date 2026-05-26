/**
 * UI COMPONENT — StatusBadge
 *
 * WHY THIS COMPONENT EXISTS:
 * Status badges appear in the Table View, Batch Cards, and Documents Matrix.
 * Centralizing it means: if the spec changes a color, you change it once.
 *
 * SERVER vs CLIENT: Server Component. No interactivity, pure rendering.
 *
 * SPEC RULES:
 *   - Height: 20px (--h-badge)
 *   - Radius: 6px (--radius-md)
 *   - Typography: t-badge class (IBM Plex Mono, 11px, 500 weight, 0.04em spacing)
 *   - Colors: use semantic tokens (bg-lt, border-color, text-dk per tier)
 *   - Icon: 12px inside the badge, left of text, 4px gap
 *   - Never use raw hex colors — always CSS variables
 *
 * REFERENCE: ui_kits/admin/StatusBadge.jsx
 */

// TODO C1-1: Define the StatusTone type.
// LEARN Ch 2 — CSS Styling (clsx for conditional classes): https://nextjs.org/learn/dashboard-app/css-styling
// It maps to the semantic color tiers: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'muted'
type StatusTone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'muted';

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  // TODO C1-2: Add optional `icon` prop (Tabler icon name string).
}

// TODO C1-3: Define a TOKEN_MAP that maps each tone to its CSS variable set.
// LEARN Ch 2 — Conditional styles with clsx: https://nextjs.org/learn/dashboard-app/css-styling
// Example:
//   const TOKEN_MAP: Record<StatusTone, { bg: string; border: string; text: string }> = {
//     green:  { bg: 'var(--color-green-lt)', border: 'var(--color-green-border)', text: 'var(--color-green-dk)' },
//     amber:  { bg: 'var(--color-amber-lt)', border: 'var(--color-amber-border)', text: 'var(--color-amber-dk)' },
//     ...
//   };
//
// WHY a map instead of conditionals: Adding a new tone requires one new
// entry in the map — no scattered if/else chains across the component.

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  // TODO C1-4: Look up token values from TOKEN_MAP[tone].
  // Apply them as inline styles (since Tailwind can't interpolate CSS vars dynamically).

  return (
    <span
      className="t-badge inline-flex items-center gap-1 px-2 rounded-[var(--radius-md)]"
      style={{
        height: 'var(--h-badge)',
        // TODO C1-4: set backgroundColor, borderColor, color from TOKEN_MAP
        backgroundColor: 'var(--color-surface-alt)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-muted)',
      }}
    >
      {/* TODO C1-5: Render icon here once Icon component is built */}
      {label}
    </span>
  );
}
