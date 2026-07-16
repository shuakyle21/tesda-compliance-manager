'use client';

/**
 * Brings the collapsed desktop sidebar back. Rendered inside the Topbar so the
 * Topbar itself can stay a Server Component.
 *
 * Renders nothing while the sidebar is open: `.sb-expand` is display:none on
 * mobile (the MobileHeader hamburger covers that breakpoint) but unconditionally
 * inline-flex ≥801px, so "only when collapsed" has to be a render decision
 * rather than a CSS one.
 */

import { Icon } from '@/shared/ui/Icon';
import { useNavDrawer } from './NavDrawerProvider';

export function SidebarExpandButton() {
  const { collapsed, toggleCollapsed } = useNavDrawer();
  if (!collapsed) return null;
  return (
    <button
      type="button"
      className="sb-expand icon-btn"
      onClick={toggleCollapsed}
      aria-label="Expand sidebar"
    >
      <Icon name="layout-sidebar" size={18} />
    </button>
  );
}

export default SidebarExpandButton;
