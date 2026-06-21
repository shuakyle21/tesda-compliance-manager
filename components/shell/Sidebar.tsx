'use client';

/**
 * Primary navigation aside — replaces the top DashboardTabs.
 *
 * Figma source of truth: node 8:4330 ("Aside - Primary navigation").
 * Interaction behavior imported from the claude.ai/design project
 * (87e4718b… · components/Sidebar.jsx): an off-canvas drawer (scrim + X +
 * nav-click + Esc close, opened by the MobileHeader hamburger) and a school
 * selector dropdown (click-outside / Esc to dismiss).
 *
 * Uses the existing `.sidebar` / `sb-*` / `dropdown` design-system classes.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TENANTS } from '@/lib/data/seed';
import type { Tenant } from '@/lib/data/types';
import { useNavDrawer } from './NavDrawerProvider';

type NavItem = { label: string; icon: IconName; href?: string };

const WORKSPACE: NavItem[] = [
  { label: 'Dashboard', icon: 'chart-dots', href: '/dashboard' },
  { label: 'Batch Cards', icon: 'folders', href: '/batch-cards' },
  { label: 'Table View', icon: 'file-text', href: '/table-view' },
  { label: 'Documents', icon: 'file-check', href: '/documents' },
  { label: 'Analytics', icon: 'chart-bar', href: '/analytics' },
  { label: 'Report', icon: 'file-invoice', href: '/report' },
  { label: 'Activity Log', icon: 'timeline', href: '/activity-log' },
];

const ACCOUNT: NavItem[] = [
  { label: 'My Account', icon: 'user', href: '/profile' },
];

const OPERATIONS: NavItem[] = [
  { label: 'Import CSV', icon: 'download' }, // route not built yet
  { label: 'Settings', icon: 'settings' }, // route not built yet
];

export function Sidebar() {
  const pathname = usePathname();
  const { open, closeDrawer } = useNavDrawer();

  // School selector (no tenant backend yet — switch updates local display).
  const [orgOpen, setOrgOpen] = useState(false);
  const [tenant, setTenant] = useState<Tenant>(
    () => TENANTS.find((t) => t.id === 'tnt_j3ed') ?? TENANTS[0],
  );
  const orgRef = useRef<HTMLDivElement>(null);
  const canSwitch = TENANTS.length > 1;

  // Click-outside closes the school dropdown.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) setOrgOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Esc closes the dropdown, then the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (orgOpen) setOrgOpen(false);
      else if (open) closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [orgOpen, open, closeDrawer]);

  return (
    <>
      <div className={`sidebar-scrim${open ? ' show' : ''}`} onClick={closeDrawer} aria-hidden="true" />
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Primary navigation">
        {/* Brand */}
        <div className="sb-brand">
          <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--color-blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            TVI
          </span>
          <span className="sb-brand-text">
            <span className="sb-brand-name">TVI-CAMS</span>
            <span className="sb-brand-sub">Compliance &amp; Audit</span>
          </span>
          <button type="button" className="sb-close icon-btn" onClick={closeDrawer} aria-label="Close navigation">
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Sync status */}
        <button type="button" className="sb-sync sb-sync-top">
          <span className="synced-dot" />
          <span>Synced 4 min ago · Supabase</span>
          <Icon name="refresh" size={13} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
        </button>

        {/* School switcher */}
        <div ref={orgRef} className="sb-org-wrap">
          <button
            type="button"
            className={`sb-org${canSwitch ? '' : ' locked'}`}
            onClick={() => canSwitch && setOrgOpen((o) => !o)}
            aria-haspopup={canSwitch ? 'true' : undefined}
            aria-expanded={canSwitch ? orgOpen : undefined}
          >
            <span className="org-mark">{tenant.code.slice(0, 3)}</span>
            <span className="sb-org-text">
              <span className="sb-org-name">{tenant.name}</span>
              <span className="sb-org-meta">{canSwitch ? `${TENANTS.length} schools · registrar` : tenant.region}</span>
            </span>
            <Icon name={canSwitch ? 'chevron-down' : 'shield-check'} size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          </button>

          {orgOpen && canSwitch && (
            <div className="dropdown sb-org-dd">
              <div className="dd-section">Registrar · your schools</div>
              {TENANTS.map((t, i) => (
                <button
                  type="button"
                  key={t.id}
                  className={`dd-item${t.id === tenant.id ? ' active' : ''}`}
                  onClick={() => { setTenant(t); setOrgOpen(false); }}
                >
                  <span className={`org-mark${i > 0 ? ' alt' : ''}`} style={{ width: 22, height: 22, fontSize: 9 }}>
                    {t.code.slice(0, 3)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{t.name}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                      {t.region} · {t.type}
                    </span>
                  </span>
                  {t.id === tenant.id && <Icon name="check" size={14} style={{ color: 'var(--color-blue-dk)' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sb-nav">
          <div className="sb-group-label">Workspace</div>
          {WORKSPACE.map((item) => (
            <NavRow key={item.label} item={item} active={item.href === pathname} onNavigate={closeDrawer} />
          ))}

          <div className="sb-group-label">Operations</div>
          {OPERATIONS.map((item) => (
            <NavRow key={item.label} item={item} active={item.href === pathname} onNavigate={closeDrawer} />
          ))}

          <div className="sb-group-label">Account</div>
          {ACCOUNT.map((item) => (
            <NavRow key={item.label} item={item} active={item.href === pathname} onNavigate={closeDrawer} />
          ))}
        </nav>

        {/* User card */}
        <div className="sb-user-wrap">
          <button type="button" className="sb-user" aria-label="Account menu">
            <span className="user-avatar" style={{ background: 'var(--color-teal)' }}>KC</span>
            <span className="sb-user-text">
              <span className="sb-user-name">Karina Cruz</span>
              <span className="role-tag coordinator">coordinator</span>
            </span>
            <Icon name="chevron-down" size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          </button>
        </div>
      </aside>
    </>
  );
}

function NavRow({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const inner = (
    <>
      <Icon name={item.icon} size={17} />
      <span>{item.label}</span>
    </>
  );

  if (!item.href) {
    return (
      <span className="sb-nav-item" aria-disabled="true" title="Coming soon" style={{ opacity: 0.45, cursor: 'default' }}>
        {inner}
      </span>
    );
  }

  return (
    <Link href={item.href} className={`sb-nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
      {inner}
    </Link>
  );
}

export default Sidebar;
