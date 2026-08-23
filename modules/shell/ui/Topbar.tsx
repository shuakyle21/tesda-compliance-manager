'use client';

/**
 * STEP 7a — Shell Component: Topbar
 *
 * Full-shell realignment (design sync, 2026-08-23): the design puts all
 * branding — mark, wordmark, active school, sync status — in the Sidebar
 * only. This bar used to duplicate all of that above every page's own
 * `.page-head` <h1>; now it carries only what the Sidebar can't own: the
 * desktop "expand sidebar" button (has to live outside <aside> once
 * `.sidebar.collapsed` sets it `visibility: hidden`) and the notifications
 * bell.
 *
 * The design bundle's own Notifications drawer (`openNotif`/`notif.items`/
 * `hasNotifUnread`) is referenced in its template but never implemented
 * anywhere in its script — dead markup, not a real spec. Rather than invent
 * one, the bell links to Activity Log, the one place unread compliance
 * events actually exist; the badge count is the same static demo number
 * Sidebar's Activity Log row shows (there is no real unread tracking yet).
 */

import Link from 'next/link';
import { Icon } from '@/shared/ui/Icon';
import { useNavDrawer } from './NavDrawerProvider';
import { ACTIVITY_UNREAD } from './Sidebar';

interface TopbarProps {
  /** Activity Log isn't in the trainer nav (design's `NAVS.trainer`) and
   * `/trainer/*` has no redirect off it the way `/dashboard` does — so the
   * bell must not offer a one-click path there, same boundary as Sidebar's
   * Import records gate. */
  isTrainerRoute?: boolean;
}

export function Topbar({ isTrainerRoute = false }: TopbarProps) {
  const { collapsed, toggleCollapsed } = useNavDrawer();

  return (
    <div className="topbar-flex">
      {collapsed && (
        <button type="button" className="sb-expand icon-btn" onClick={toggleCollapsed} aria-label="Expand sidebar" title="Expand sidebar">
          <Icon name="layout-sidebar" size={16} />
        </button>
      )}
      {!isTrainerRoute && (
        <Link href="/activity-log" className="topbar-bell icon-btn" aria-label={`Notifications, ${ACTIVITY_UNREAD} unread`} title="Notifications" style={{ marginLeft: 'auto', position: 'relative' }}>
          <Icon name="bell" size={17} />
          {ACTIVITY_UNREAD > 0 && <span className="sb-badge topbar-bell-badge">{ACTIVITY_UNREAD}</span>}
        </Link>
      )}
    </div>
  );
}

export default Topbar;
