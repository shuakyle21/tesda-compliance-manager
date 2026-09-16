import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  useCallback: vi.fn(),
  useEffect: vi.fn(),
  useRef: vi.fn(),
  useState: vi.fn(),
  usePathname: vi.fn(),
  useNavDrawer: vi.fn(),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useCallback: hooks.useCallback,
    useEffect: hooks.useEffect,
    useRef: hooks.useRef,
    useState: hooks.useState,
  };
});

vi.mock('next/navigation', () => ({ usePathname: hooks.usePathname }));
vi.mock('@/modules/shell/ui/NavDrawerProvider', () => ({ useNavDrawer: hooks.useNavDrawer }));

import { ImportCsvModal } from '@/modules/import-export/ui/ImportCsvModal';
import { SettingsModal } from '@/modules/settings/ui/SettingsModal';
import { Sidebar, type SidebarProps } from '@/modules/shell/ui/Sidebar';
import type { Tenant } from '@/shared/types';
import { Toast } from '@/shared/ui/Toast';

/**
 * Local fixture. The Sidebar takes its tenant list from the `tenants` prop
 * (populated by the layout from the caller's real memberships) — a resolved
 * `tenant` is only ever something a caller hands the private components
 * directly, so tests exercise `SchoolSwitcher`/`SidebarOverlays` with a
 * fixture rather than the top-level `Sidebar({})`, which has no props here.
 */
const TENANT_FIXTURE: Tenant = {
  id: 'tnt_fixture',
  code: 'FIX-001',
  name: 'Fixture Farm School',
  region: 'Region IV-A',
  type: 'Private',
  tesdaProviderCode: '',
  province: '',
  cityMunicipality: '',
  streetAddress: '',
  providerType: '',
  providerClassification: '',
  color: '',
  plan: '',
  activeBatches: 0,
  totalScholars: 0,
};

/**
 * `fullName`/`role`/`tenants`/`defaultTenantId` are required Sidebar props —
 * there is no silent default a caller can omit its way into. Tests that
 * don't care about identity/tenant state still have to say so explicitly.
 */
const NO_IDENTITY: Pick<SidebarProps, 'fullName' | 'role' | 'tenants' | 'defaultTenantId'> = {
  fullName: null,
  role: null,
  tenants: [],
  defaultTenantId: null,
};

type Effect = () => void | (() => void);
type PrivateComponent = (props: Record<string, unknown>) => ReactElement;

function isElement(value: unknown): value is ReactElement<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

function elementsIn(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(elementsIn);
  if (!isElement(value)) return [];
  return [value, ...elementsIn(value.props.children)];
}

function textIn(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textIn).join('');
  return isElement(value) ? textIn(value.props.children) : '';
}

function componentElement(root: unknown, component: unknown): ReactElement<Record<string, unknown>> {
  const element = elementsIn(root).find((candidate) => candidate.type === component);
  expect(element, 'expected component element to be present').toBeDefined();
  return element!;
}

function namedElement(root: unknown, name: string): ReactElement<Record<string, unknown>> | undefined {
  return elementsIn(root).find((candidate) => typeof candidate.type === 'function' && candidate.type.name === name);
}

function elementWithClassName(root: unknown, className: string): ReactElement<Record<string, unknown>> | undefined {
  return elementsIn(root).find((candidate) => candidate.props.className === className);
}

/** Every `NavRow` in the tree, regardless of which nav group rendered it. */
function navRowLabels(root: unknown): string[] {
  return elementsIn(root)
    .filter((candidate) => typeof candidate.type === 'function' && candidate.type.name === 'NavRow')
    .map((candidate) => (candidate.props.item as { label: string }).label);
}

function privateComponent(name: string): PrivateComponent {
  arrangeSidebarState();
  const element = namedElement(Sidebar({ ...NO_IDENTITY }), name);
  expect(element, `expected Sidebar to contain ${name}`).toBeDefined();

  // The caller is about to exercise the extracted component in isolation.
  hooks.useEffect.mockClear();
  hooks.useRef.mockClear();
  hooks.useState.mockClear();
  return element!.type as PrivateComponent;
}

// Mirrors Sidebar's useState call order exactly: orgOpen, tenant, activeOp.
function arrangeSidebarState({
  orgOpen = false,
  tenant = null,
  activeOp = null,
}: {
  orgOpen?: boolean;
  tenant?: Tenant | null;
  activeOp?: 'import' | 'settings' | null;
} = {}) {
  const setOrgOpen = vi.fn();
  const setTenant = vi.fn();
  const setActiveOp = vi.fn();
  hooks.useState
    .mockReturnValueOnce([orgOpen, setOrgOpen])
    .mockReturnValueOnce([tenant, setTenant])
    .mockReturnValueOnce([activeOp, setActiveOp]);
  return { setOrgOpen, setTenant, setActiveOp };
}

function fakeDocument() {
  const listeners = new Map<string, EventListener>();
  const document = {
    addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    }),
  };
  vi.stubGlobal('document', document);
  return { document, listeners };
}

beforeEach(() => {
  hooks.useCallback.mockReset().mockImplementation((callback) => callback);
  hooks.useEffect.mockReset();
  hooks.useRef.mockReset().mockReturnValue({ current: null });
  hooks.useState.mockReset();
  hooks.usePathname.mockReset().mockReturnValue('/dashboard');
  hooks.useNavDrawer.mockReset().mockReturnValue({
    open: true,
    closeDrawer: vi.fn(),
    collapsed: false,
    toggleCollapsed: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Sidebar Escape handling', () => {
  it('closes the school menu before closing an open navigation drawer', () => {
    const { setOrgOpen } = arrangeSidebarState({ orgOpen: true });
    const closeDrawer = vi.fn();
    hooks.useNavDrawer.mockReturnValue({ open: true, closeDrawer, collapsed: false, toggleCollapsed: vi.fn() });
    const { document, listeners } = fakeDocument();

    Sidebar({ ...NO_IDENTITY });
    const cleanup = (hooks.useEffect.mock.calls[0][0] as Effect)();
    listeners.get('keydown')!({ key: 'Escape' } as KeyboardEvent);

    expect(setOrgOpen).toHaveBeenCalledWith(false);
    expect(closeDrawer).not.toHaveBeenCalled();

    cleanup?.();
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('closes the drawer when the school menu is already closed', () => {
    arrangeSidebarState({ orgOpen: false });
    const closeDrawer = vi.fn();
    hooks.useNavDrawer.mockReturnValue({ open: true, closeDrawer, collapsed: false, toggleCollapsed: vi.fn() });
    const { listeners } = fakeDocument();

    Sidebar({ ...NO_IDENTITY });
    (hooks.useEffect.mock.calls[0][0] as Effect)();
    listeners.get('keydown')!({ key: 'Escape' } as KeyboardEvent);

    expect(closeDrawer).toHaveBeenCalledOnce();
  });

  it('leaves both layers alone while an operation modal owns Escape', () => {
    const { setOrgOpen } = arrangeSidebarState({ orgOpen: true, activeOp: 'settings' });
    const closeDrawer = vi.fn();
    hooks.useNavDrawer.mockReturnValue({ open: true, closeDrawer, collapsed: false, toggleCollapsed: vi.fn() });
    const { listeners } = fakeDocument();

    Sidebar({ ...NO_IDENTITY });
    (hooks.useEffect.mock.calls[0][0] as Effect)();
    listeners.get('keydown')!({ key: 'Escape' } as KeyboardEvent);

    expect(setOrgOpen).not.toHaveBeenCalled();
    expect(closeDrawer).not.toHaveBeenCalled();
  });

  it('ignores keys other than Escape', () => {
    const { setOrgOpen } = arrangeSidebarState({ orgOpen: true });
    const closeDrawer = vi.fn();
    hooks.useNavDrawer.mockReturnValue({ open: true, closeDrawer, collapsed: false, toggleCollapsed: vi.fn() });
    const { listeners } = fakeDocument();

    Sidebar({ ...NO_IDENTITY });
    (hooks.useEffect.mock.calls[0][0] as Effect)();
    listeners.get('keydown')!({ key: 'Enter' } as KeyboardEvent);

    expect(setOrgOpen).not.toHaveBeenCalled();
    expect(closeDrawer).not.toHaveBeenCalled();
  });
});

describe('SchoolSwitcher', () => {
  // With 0 or 1 memberships passed in via `tenants`, the switcher's only
  // reachable state is locked: no school choices are ever offered, and the
  // trigger must not pretend to be a menu.
  it('stays locked and offers no school choices when the tenant list has no more than one school', () => {
    const SchoolSwitcher = privateComponent('SchoolSwitcher');
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    const tree = SchoolSwitcher({
      tenant: TENANT_FIXTURE,
      tenants: [TENANT_FIXTURE],
      open: true,
      onToggle,
      onClose: vi.fn(),
      onSelect,
    });
    const buttons = elementsIn(tree).filter((element) => element.type === 'button');
    const trigger = buttons[0];

    expect(buttons).toHaveLength(1);
    expect(trigger.props.className).toContain('locked');
    expect(trigger.props['aria-haspopup']).toBeUndefined();
    expect(trigger.props['aria-expanded']).toBeUndefined();
    expect(elementsIn(tree).filter((element) => element.props.className === 'dd-item')).toHaveLength(0);

    (trigger.props.onClick as () => void)();
    expect(onToggle).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('names the resolved school when one is passed in', () => {
    const SchoolSwitcher = privateComponent('SchoolSwitcher');
    const tree = SchoolSwitcher({
      tenant: TENANT_FIXTURE,
      tenants: [TENANT_FIXTURE],
      open: false,
      onToggle: vi.fn(),
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    const text = textIn(tree);
    expect(text).toContain(TENANT_FIXTURE.name);
    expect(text).toContain(TENANT_FIXTURE.region);
  });

  // The Sidebar itself passes null: honest about having no school rather than
  // naming a plausible-looking one.
  it('shows an honest placeholder instead of a school name when none is resolved', () => {
    const SchoolSwitcher = privateComponent('SchoolSwitcher');
    const tree = SchoolSwitcher({
      tenant: null,
      tenants: [],
      open: false,
      onToggle: vi.fn(),
      onClose: vi.fn(),
      onSelect: vi.fn(),
    });

    const text = textIn(tree);
    expect(text).toContain('School not set');
    expect(text).toContain('Tenant setup pending');
  });

  it('renders with no resolved school by default from the Sidebar', () => {
    arrangeSidebarState();
    const switcher = namedElement(Sidebar({ ...NO_IDENTITY }), 'SchoolSwitcher');

    expect(switcher?.props.tenant).toBeNull();
  });

  it('closes only for clicks outside its own element and removes its listener on cleanup', () => {
    const SchoolSwitcher = privateComponent('SchoolSwitcher');
    const inside = {};
    const outside = {};
    const contains = vi.fn((target) => target === inside);
    hooks.useRef.mockReturnValue({ current: { contains } });
    const onClose = vi.fn();
    const { document, listeners } = fakeDocument();

    SchoolSwitcher({
      tenant: TENANT_FIXTURE,
      tenants: [TENANT_FIXTURE],
      open: true,
      onToggle: vi.fn(),
      onClose,
      onSelect: vi.fn(),
    });
    const cleanup = (hooks.useEffect.mock.calls[0][0] as Effect)();
    const onMouseDown = listeners.get('mousedown')!;

    onMouseDown({ target: inside } as unknown as MouseEvent);
    expect(onClose).not.toHaveBeenCalled();

    onMouseDown({ target: outside } as unknown as MouseEvent);
    expect(onClose).toHaveBeenCalledOnce();

    cleanup?.();
    expect(document.removeEventListener).toHaveBeenCalledWith('mousedown', onMouseDown);
  });

});

describe('SidebarOverlays', () => {
  it('closes a completed import and publishes its result in a toast', () => {
    const SidebarOverlays = privateComponent('SidebarOverlays');
    const setToast = vi.fn();
    hooks.useState.mockReturnValue([null, setToast]);
    const onClose = vi.fn();

    const tree = SidebarOverlays({ activeOp: 'import', tenant: TENANT_FIXTURE, fullName: null, role: null, onClose });
    const modal = componentElement(tree, ImportCsvModal);
    (modal.props.onImported as (message: string) => void)('124 batches updated');

    expect(modal.props.onClose).toBe(onClose);
    expect(onClose).toHaveBeenCalledOnce();
    expect(setToast).toHaveBeenCalledWith({ title: 'Import complete', message: '124 batches updated' });
  });

  it('passes the selected tenant to Settings and toasts after saving', () => {
    const SidebarOverlays = privateComponent('SidebarOverlays');
    const setToast = vi.fn();
    hooks.useState.mockReturnValue([null, setToast]);
    const onClose = vi.fn();

    const tree = SidebarOverlays({
      activeOp: 'settings',
      tenant: TENANT_FIXTURE,
      fullName: 'Rosa Mendiola',
      role: 'coordinator',
      onClose,
    });
    const modal = componentElement(tree, SettingsModal);

    expect(modal.props).toMatchObject({
      workspaceName: TENANT_FIXTURE.name,
      workspaceMeta: `${TENANT_FIXTURE.code} · ${TENANT_FIXTURE.region}`,
      userName: 'Rosa Mendiola',
      userLabel: 'coordinator',
      onClose,
    });
    (modal.props.onSaved as () => void)();
    expect(onClose).toHaveBeenCalledOnce();
    expect(setToast).toHaveBeenCalledWith({ title: 'Settings saved' });
  });

  // No tenant/identity resolved: Settings must say so rather than label the
  // workspace or the user with a fabricated school/name/role.
  it('labels Settings honestly when no school or identity is resolved', () => {
    const SidebarOverlays = privateComponent('SidebarOverlays');
    hooks.useState.mockReturnValue([null, vi.fn()]);

    const tree = SidebarOverlays({ activeOp: 'settings', tenant: null, fullName: null, role: null, onClose: vi.fn() });
    const modal = componentElement(tree, SettingsModal);

    expect(modal.props).toMatchObject({
      workspaceName: 'School not set',
      workspaceMeta: 'Tenant setup pending',
      userName: 'Name not set',
      userLabel: '—',
    });
  });

  it('keeps a completion toast mounted after the operation closes and dismisses it', () => {
    const SidebarOverlays = privateComponent('SidebarOverlays');
    const setToast = vi.fn();
    const toast = { title: 'Import complete', message: '3 batches updated' };
    hooks.useState.mockReturnValue([toast, setToast]);

    const tree = SidebarOverlays({ activeOp: null, tenant: TENANT_FIXTURE, fullName: null, role: null, onClose: vi.fn() });
    expect(elementsIn(tree).some((element) => element.type === ImportCsvModal || element.type === SettingsModal)).toBe(false);
    const toastElement = componentElement(tree, Toast);
    expect(toastElement.props).toMatchObject(toast);

    (toastElement.props.onDismiss as () => void)();
    expect(setToast).toHaveBeenCalledWith(null);
  });
});

describe('Sidebar user card', () => {
  it('shows initials from the first and last name, the full name, and a matching role tag', () => {
    arrangeSidebarState();
    const tree = Sidebar({ ...NO_IDENTITY, fullName: 'Karina Cruz', role: 'coordinator' });

    expect(textIn(elementWithClassName(tree, 'user-avatar'))).toBe('KC');
    expect(textIn(elementWithClassName(tree, 'sb-user-name'))).toBe('Karina Cruz');
    const roleTag = elementWithClassName(tree, 'role-tag coordinator');
    expect(roleTag).toBeDefined();
    expect(textIn(roleTag)).toBe('coordinator');
  });

  it('falls back to a single initial for a one-word name', () => {
    arrangeSidebarState();
    const tree = Sidebar({ ...NO_IDENTITY, fullName: 'Cher', role: null });

    expect(textIn(elementWithClassName(tree, 'user-avatar'))).toBe('C');
  });

  it('collapses extra internal whitespace the same way as a normal two-word name', () => {
    arrangeSidebarState();
    const tree = Sidebar({ ...NO_IDENTITY, fullName: '  Karina   Cruz  ', role: null });

    expect(textIn(elementWithClassName(tree, 'user-avatar'))).toBe('KC');
  });

  it('shows an honest placeholder and omits the role tag when no identity is resolved', () => {
    arrangeSidebarState();
    const tree = Sidebar({ ...NO_IDENTITY });

    expect(textIn(elementWithClassName(tree, 'user-avatar'))).toBe('—');
    expect(textIn(elementWithClassName(tree, 'sb-user-name'))).toBe('Name not set');
    expect(elementsIn(tree).some((el) => typeof el.props.className === 'string' && el.props.className.startsWith('role-tag'))).toBe(false);
  });
});

describe('Sidebar operations list', () => {
  it('shows only the base operations by default', () => {
    arrangeSidebarState();
    const labels = navRowLabels(Sidebar({ ...NO_IDENTITY }));

    expect(labels).toContain('Import records');
    expect(labels).toContain('Settings');
    expect(labels).not.toContain('Add user');
    expect(labels).not.toContain('Add school');
  });

  it('adds the admin-only row for an admin on a non-trainer route', () => {
    arrangeSidebarState();
    const labels = navRowLabels(Sidebar({ ...NO_IDENTITY, isAdmin: true }));

    expect(labels).toContain('Add user');
    expect(labels).not.toContain('Add school');
  });

  it('adds the platform-operator row for a platform admin on a non-trainer route', () => {
    arrangeSidebarState();
    const labels = navRowLabels(Sidebar({ ...NO_IDENTITY, isPlatformAdmin: true }));

    expect(labels).toContain('Add school');
    expect(labels).not.toContain('Add user');
  });

  // A trainer route never gains either extra list, even when both role
  // flags are true — the two checks are independent, the way the two roles
  // are, but neither survives the trainer-route gate.
  it('strips every operation but Settings on a trainer route, regardless of role flags', () => {
    arrangeSidebarState();
    const labels = navRowLabels(Sidebar({
      ...NO_IDENTITY,
      isTrainerRoute: true,
      isAdmin: true,
      isPlatformAdmin: true,
    }));

    expect(labels).toContain('Settings');
    expect(labels).not.toContain('Import records');
    expect(labels).not.toContain('Add user');
    expect(labels).not.toContain('Add school');
  });
});

describe('Sidebar tenant seeding', () => {
  // Sidebar seeds its `tenant` state lazily via useState's initializer, which
  // this file mocks — so the only way to exercise the seeding logic itself is
  // to capture that initializer (the second useState call: orgOpen, tenant,
  // activeOp) and invoke it directly, the same way Escape-handling tests
  // above capture and invoke the useEffect callback.
  function captureTenantSeed(): Tenant | null {
    return (hooks.useState.mock.calls[1][0] as () => Tenant | null)();
  }

  it('seeds the membership flagged as default when one exists among several', () => {
    const other: Tenant = { ...TENANT_FIXTURE, id: 'tnt_other', name: 'Other Farm School' };
    arrangeSidebarState();

    Sidebar({ ...NO_IDENTITY, tenants: [other, TENANT_FIXTURE], defaultTenantId: TENANT_FIXTURE.id });

    expect(captureTenantSeed()).toBe(TENANT_FIXTURE);
  });

  it('falls back to the first tenant when no membership is flagged as default', () => {
    arrangeSidebarState();

    Sidebar({ ...NO_IDENTITY, tenants: [TENANT_FIXTURE], defaultTenantId: null });

    expect(captureTenantSeed()).toBe(TENANT_FIXTURE);
  });

  it('resolves to null when the profile has no memberships at all', () => {
    arrangeSidebarState();

    Sidebar({ ...NO_IDENTITY });

    expect(captureTenantSeed()).toBeNull();
  });

  it('falls back to the first tenant when the flagged default id matches none of them', () => {
    arrangeSidebarState();

    Sidebar({ ...NO_IDENTITY, tenants: [TENANT_FIXTURE], defaultTenantId: 'tnt_does_not_exist' });

    expect(captureTenantSeed()).toBe(TENANT_FIXTURE);
  });
});
