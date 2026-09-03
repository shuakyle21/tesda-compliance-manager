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

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { Toast, type ToastData } from '@/shared/ui/Toast';
import type { Tenant } from '@/shared/types';
import { ImportCsvModal } from '@/modules/import-export/ui/ImportCsvModal';
import { SettingsModal } from '@/modules/settings/ui/SettingsModal';
import { useNavDrawer } from './NavDrawerProvider';

type NavItem = { label: string; icon: IconName; href?: string; op?: 'import' | 'settings'; badge?: number };

// Static demo count, same fidelity as the design's own hardcoded `badge:3` —
// there is no real unread-activity tracking yet. Exported so the Topbar bell
// (which links to the same Activity Log) shows the same number.
export const ACTIVITY_UNREAD = 3;

const WORKSPACE: NavItem[] = [
  { label: 'Dashboard', icon: 'layout-dashboard', href: '/dashboard' },
  { label: 'Batch Cards', icon: 'folders', href: '/batch-cards' },
  { label: 'Table View', icon: 'file-text', href: '/table-view' },
  { label: 'Documents', icon: 'file-check', href: '/documents' },
  // Billing sits between Documents and Analytics per the Figma nav rail
  // (840:5128). The route itself redirects trainers — nav order is cosmetic,
  // the role gate is server-side.
  { label: 'Billing', icon: 'receipt', href: '/billing' },
  { label: 'Analytics', icon: 'chart-bar', href: '/analytics' },
  { label: 'Report', icon: 'file-invoice', href: '/report' },
  { label: 'Activity Log', icon: 'timeline', href: '/activity-log', badge: ACTIVITY_UNREAD },
];

/**
 * Schools this user can switch between. There is no live tenant-listing source
 * yet — the Sidebar is a client island and the layout has no tenant context to
 * pass down (blocked on TES-34) — so the list is empty and the switcher renders
 * locked rather than listing a fabricated catalog. Once a real list is plumbed
 * in as a prop, `canSwitch` and the dropdown below light up unchanged.
 */
const AVAILABLE_TENANTS: Tenant[] = [];

// Shown in place of a school name/meta while no tenant is resolved. Deliberately
// states the absence instead of naming a plausible-looking school.
const NO_TENANT_NAME = 'School not set';
const NO_TENANT_META = 'Tenant setup pending';
const NO_TENANT_MARK = '—';

const ACCOUNT: NavItem[] = [
  { label: 'My Account', icon: 'user', href: '/profile' },
];

const OPERATIONS: NavItem[] = [
  { label: 'Import records', icon: 'download', op: 'import' },
  { label: 'Settings', icon: 'settings', op: 'settings' },
];

interface SidebarProps {
  /**
   * The only role signal a Server Component layout can derive today (no real
   * role model until TES-34 — see layout.tsx's TRAINER OMISSION note). Mirrors
   * the design's `ROLES[role].ops`: trainer gets Settings only, every other
   * (assumed-coordinator) route gets both. Import CSV is an office-only
   * operation — a trainer must not see it, the same boundary `hideBilling`
   * already enforces for the metrics row.
   */
  isTrainerRoute?: boolean;
}

export function Sidebar({ isTrainerRoute = false }: SidebarProps) {
  const pathname = usePathname();
  const { open, closeDrawer, collapsed, toggleCollapsed } = useNavDrawer();
  const operations = isTrainerRoute ? OPERATIONS.filter((o) => o.op === 'settings') : OPERATIONS;

  // School selector. `tenant` is null until a real tenant list exists (TES-34);
  // the dropdown layer is kept so the Esc ordering below stays intact and so
  // wiring a live list in later is a one-line change.
  const [orgOpen, setOrgOpen] = useState(false);
  const closeOrg = useCallback(() => setOrgOpen(false), []);
  const [tenant, setTenant] = useState<Tenant | null>(() => AVAILABLE_TENANTS[0] ?? null);

  // Operations overlays (Import CSV / Settings); their completion toast lives in <SidebarOverlays>.
  const [activeOp, setActiveOp] = useState<'import' | 'settings' | null>(null);

  // Esc closes the dropdown, then the drawer (the op modals own their own Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || activeOp) return;
      if (orgOpen) closeOrg();
      else if (open) closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [orgOpen, open, closeDrawer, closeOrg, activeOp]);

  return (
    <>
      <div className={`sidebar-scrim${open ? ' show' : ''}`} onClick={closeDrawer} aria-hidden="true" />
      <aside className={`sidebar${open ? ' open' : ''}${collapsed ? ' collapsed' : ''}`} aria-label="Primary navigation">
        {/* Brand */}
        <div className="sb-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/tvi-cams-mark.svg"
            alt="TVI-CAMS"
            style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'contain', flexShrink: 0, background: '#fff', border: '1px solid var(--color-border-faint)' }}
          />
          <span className="sb-brand-text">
            <span className="sb-brand-name">TVI-CAMS</span>
            <span className="sb-brand-sub">Compliance &amp; Audit</span>
          </span>
          <button type="button" className="sb-close icon-btn" onClick={closeDrawer} aria-label="Close navigation">
            <Icon name="x" size={16} />
          </button>
          <button type="button" className="sb-collapse icon-btn" onClick={toggleCollapsed} aria-label="Collapse sidebar" title="Collapse sidebar">
            <Icon name="layout-sidebar" size={16} />
          </button>
        </div>

        {/* Sync status */}
        <button type="button" className="sb-sync sb-sync-top">
          <span className="synced-dot" />
          <span>Synced 4 min ago · Supabase</span>
          <Icon name="refresh" size={13} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
        </button>

        <SchoolSwitcher
          tenant={tenant}
          open={orgOpen}
          onToggle={() => setOrgOpen((o) => !o)}
          onClose={closeOrg}
          onSelect={setTenant}
        />

        {/* Navigation */}
        <nav className="sb-nav">
          <div className="sb-group-label">Workspace</div>
          {WORKSPACE.map((item) => (
            <NavRow key={item.label} item={item} active={item.href === pathname} onNavigate={closeDrawer} />
          ))}

          <div className="sb-group-label">Operations</div>
          {operations.map((item) => (
            <NavRow
              key={item.label}
              item={item}
              active={item.href === pathname}
              onNavigate={closeDrawer}
              onOp={item.op ? () => { closeDrawer(); setActiveOp(item.op!); } : undefined}
            />
          ))}

          <div className="sb-group-label">Account</div>
          {ACCOUNT.map((item) => (
            <NavRow key={item.label} item={item} active={item.href === pathname} onNavigate={closeDrawer} />
          ))}
        </nav>

        {/* User card — links to My Account (/profile) */}
        <div className="sb-user-wrap">
          <Link href="/profile" className="sb-user" aria-label="My account" onClick={closeDrawer}>
            <span className="user-avatar" style={{ background: 'var(--color-teal)' }}>KC</span>
            <span className="sb-user-text">
              <span className="sb-user-name">Karina Cruz</span>
              <span className="role-tag coordinator">coordinator</span>
            </span>
            <Icon name="chevron-right" size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          </Link>
        </div>
      </aside>

      <SidebarOverlays activeOp={activeOp} tenant={tenant} onClose={() => setActiveOp(null)} />
    </>
  );
}

/**
 * School selector. Controlled: `open`/`tenant` stay in <Sidebar> because its
 * Esc handler must close this dropdown *before* the drawer, and the Settings
 * modal reads the selected tenant. Click-outside dismissal is owned here.
 *
 * With no live tenant list (TES-34) `AVAILABLE_TENANTS` is empty, so
 * `canSwitch` is false: the control renders locked and non-interactive, and a
 * null `tenant` shows the "School not set" placeholder rather than a name.
 */
function SchoolSwitcher({ tenant, open, onToggle, onClose, onSelect }: {
  tenant: Tenant | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (t: Tenant) => void;
}) {
  const orgRef = useRef<HTMLDivElement>(null);
  const canSwitch = AVAILABLE_TENANTS.length > 1;

  // Click-outside closes the school dropdown.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose]);

  return (
    <div ref={orgRef} className="sb-org-wrap">
      <button
        type="button"
        className={`sb-org${canSwitch ? '' : ' locked'}`}
        onClick={() => canSwitch && onToggle()}
        aria-haspopup={canSwitch ? 'true' : undefined}
        aria-expanded={canSwitch ? open : undefined}
      >
        <span className="org-mark">{tenant ? tenant.code.slice(0, 3) : NO_TENANT_MARK}</span>
        <span className="sb-org-text">
          <span className="sb-org-name">{tenant?.name ?? NO_TENANT_NAME}</span>
          <span className="sb-org-meta">
            {canSwitch
              ? `${AVAILABLE_TENANTS.length} schools · registrar`
              : (tenant?.region || NO_TENANT_META)}
          </span>
        </span>
        <Icon name={canSwitch ? 'chevron-down' : 'shield-check'} size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </button>

      {open && canSwitch && (
        <div className="dropdown sb-org-dd">
          <div className="dd-section">Registrar · your schools</div>
          {AVAILABLE_TENANTS.map((t, i) => (
            <button
              type="button"
              key={t.id}
              className={`dd-item${t.id === tenant?.id ? ' active' : ''}`}
              onClick={() => { onSelect(t); onClose(); }}
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
              {t.id === tenant?.id && <Icon name="check" size={14} style={{ color: 'var(--color-blue-dk)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Operations overlays (Import CSV / Settings) and their completion toast. */
function SidebarOverlays({ activeOp, tenant, onClose }: {
  activeOp: 'import' | 'settings' | null;
  tenant: Tenant | null;
  onClose: () => void;
}) {
  const [toast, setToast] = useState<ToastData | null>(null);
  return (
    <>
      {activeOp === 'import' && (
        <ImportCsvModal
          onClose={onClose}
          onImported={(message) => {
            onClose();
            setToast({ title: 'Import complete', message });
          }}
        />
      )}
      {activeOp === 'settings' && (
        <SettingsModal
          workspaceName={tenant?.name ?? NO_TENANT_NAME}
          workspaceMeta={tenant ? `${tenant.code} · ${tenant.region}` : NO_TENANT_META}
          userName="Karina Cruz"
          userLabel="coordinator"
          onClose={onClose}
          onSaved={() => {
            onClose();
            setToast({ title: 'Settings saved' });
          }}
        />
      )}
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

function NavRow({ item, active, onNavigate, onOp }: { item: NavItem; active: boolean; onNavigate: () => void; onOp?: () => void }) {
  const inner = (
    <>
      <Icon name={item.icon} size={17} />
      <span>{item.label}</span>
      {!!item.badge && <span className="sb-badge">{item.badge}</span>}
    </>
  );

  if (onOp) {
    return (
      <button type="button" className="sb-nav-item" onClick={onOp}>
        {inner}
      </button>
    );
  }

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
