'use client';

/**
 * Slim mobile header — only visible ≤800px (CSS `.mobile-header`). Its
 * hamburger opens the off-canvas sidebar drawer via the shared NavDrawer context.
 */

import { Icon } from '@/components/ui/Icon';
import { useNavDrawer } from './NavDrawerProvider';

export function MobileHeader() {
  const { openDrawer } = useNavDrawer();
  return (
    <header className="mobile-header">
      <button type="button" className="hamburger" onClick={openDrawer} aria-label="Open navigation">
        <Icon name="layout-sidebar" size={18} />
      </button>
      <span className="mh-title">TVI-CAMS</span>
    </header>
  );
}

export default MobileHeader;
