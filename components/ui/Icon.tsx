/**
 * UI COMPONENT — Icon
 *
 * WHY THIS COMPONENT EXISTS:
 * Every use of a Tabler icon goes through this component. It enforces:
 *   1. Consistent stroke width (always 2px per spec)
 *   2. Consistent sizing via predefined size presets
 *   3. `currentColor` inheritance — icon color is set by the parent's CSS color
 *
 * REFERENCE: ui_kits/admin/Icon.jsx
 *
 * HOW TABLER ICONS WORK IN REACT:
 * Install: npm install @tabler/icons-react
 * Usage: import { IconFolders } from '@tabler/icons-react'
 * Each icon is an SVG component that accepts `size`, `stroke`, `color` props.
 *
 * DOCS: https://tabler.io/icons (search by name)
 * NPM:  https://www.npmjs.com/package/@tabler/icons-react
 *
 * SPEC RULES:
 *   - Always 2px stroke (the spec calls Tabler "2px stroke library")
 *   - Size presets: 12 (badge), 13 (metric label), 14 (button/inline), 16 (tab), 18 (standalone)
 *   - Standalone icons (no label) MUST have a title or aria-label
 *   - Color: inherit from parent via `currentColor` (default Tabler behavior)
 */

// TODO C2-1: Install @tabler/icons-react first:
// LEARN Ch 3 — Optimizing Images and Icons: https://nextjs.org/learn/dashboard-app/optimizing-fonts-images
//   npm install @tabler/icons-react
//
// Then import the icons you need. Example:
//   import { IconFolders, IconUsers, IconChartDots, ... } from '@tabler/icons-react';

// TODO C2-2: Define the IconName type.
// List all icon names used in the app (from the spec's semantic icon assignments table in README.md).
// Example: type IconName = 'folders' | 'users' | 'chart-dots' | 'chart-bar' | ...
export type IconName =
  | 'folders'
  | 'users'
  | 'chart-dots'
  | 'chart-bar'
  | 'file-check'
  | 'certificate'
  | 'receipt'
  | 'calendar'
  | 'alert-triangle'
  | 'alert-circle'
  | 'info-circle'
  | 'check'
  | 'clock'
  | 'file-text'
  | 'search'
  | 'filter'
  | 'download'
  | 'settings'
  | 'user'
  | 'timeline'
  | 'refresh'
  | 'external-link'
  | 'shield-check'
  | 'shield-off'
  | 'presentation'
  | 'file-invoice'
  | 'send'
  | 'file-off'
  | 'list';

type IconSize = 12 | 13 | 14 | 16 | 18;

interface IconProps {
  name: IconName;
  size?: IconSize;
  className?: string;
  // TODO C2-3: Add `title` prop for standalone (no-label) icons. Required for accessibility.
  // title?: string;
}

// TODO C2-4: Build the ICON_MAP — maps IconName to the imported Tabler component.
// Example:
//   const ICON_MAP: Record<IconName, React.ComponentType<{ size: number; stroke: number }>> = {
//     'folders':  IconFolders,
//     'users':    IconUsers,
//     ...
//   };
//
// TIP: If you get a TypeScript error on the component type, use:
//   React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number; stroke?: number }>

export function Icon({ name, size = 14, className }: IconProps) {
  // TODO C2-5: Look up the component from ICON_MAP[name] and render it.
  // Pass size={size} stroke={2} to enforce consistent stroke width.
  //
  // Placeholder until @tabler/icons-react is installed:
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* TODO C2-5: Replace with actual Tabler icon path once installed */}
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
