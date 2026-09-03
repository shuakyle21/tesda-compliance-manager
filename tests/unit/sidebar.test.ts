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
import { Sidebar } from '@/modules/shell/ui/Sidebar';
import type { Tenant } from '@/shared/types';
import { Toast } from '@/shared/ui/Toast';

/**
 * Local fixture. The Sidebar has no live tenant list (TES-34) and no longer
 * reads a mock catalog, so a resolved tenant is only ever something a caller
 * hands the private components directly — the Sidebar itself renders null.
 */
const TENANT_FIXTURE: Tenant = {
  id: 'tnt_fixture',
  code: 'FIX-001',
  name: 'Fixture Farm School',
  region: 'Region IV-A',
  type: 'Private',
  color: '',
  plan: '',
  activeBatches: 0,
  totalScholars: 0,
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

function privateComponent(name: string): PrivateComponent {
  arrangeSidebarState();
  const element = elementsIn(Sidebar({})).find(
    (candidate) => typeof candidate.type === 'function' && candidate.type.name === name,
  );
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

    Sidebar({});
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

    Sidebar({});
    (hooks.useEffect.mock.calls[0][0] as Effect)();
    listeners.get('keydown')!({ key: 'Escape' } as KeyboardEvent);

    expect(closeDrawer).toHaveBeenCalledOnce();
  });

  it('leaves both layers alone while an operation modal owns Escape', () => {
    const { setOrgOpen } = arrangeSidebarState({ orgOpen: true, activeOp: 'settings' });
    const closeDrawer = vi.fn();
    hooks.useNavDrawer.mockReturnValue({ open: true, closeDrawer, collapsed: false, toggleCollapsed: vi.fn() });
    const { listeners } = fakeDocument();

    Sidebar({});
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

    Sidebar({});
    (hooks.useEffect.mock.calls[0][0] as Effect)();
    listeners.get('keydown')!({ key: 'Enter' } as KeyboardEvent);

    expect(setOrgOpen).not.toHaveBeenCalled();
    expect(closeDrawer).not.toHaveBeenCalled();
  });
});

describe('SchoolSwitcher', () => {
  // There is no live tenant-listing source yet (TES-34), so the switcher's only
  // reachable state is locked: no school choices are ever offered, and the
  // trigger must not pretend to be a menu.
  it('stays locked and offers no school choices when no tenant list exists', () => {
    const SchoolSwitcher = privateComponent('SchoolSwitcher');
    const onToggle = vi.fn();
    const onSelect = vi.fn();

    const tree = SchoolSwitcher({
      tenant: TENANT_FIXTURE,
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
    const switcher = elementsIn(Sidebar({})).find(
      (candidate) => typeof candidate.type === 'function' && candidate.type.name === 'SchoolSwitcher',
    );

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

    const tree = SidebarOverlays({ activeOp: 'import', tenant: TENANT_FIXTURE, onClose });
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

    const tree = SidebarOverlays({ activeOp: 'settings', tenant: TENANT_FIXTURE, onClose });
    const modal = componentElement(tree, SettingsModal);

    expect(modal.props).toMatchObject({
      workspaceName: TENANT_FIXTURE.name,
      workspaceMeta: `${TENANT_FIXTURE.code} · ${TENANT_FIXTURE.region}`,
      userName: 'Karina Cruz',
      userLabel: 'coordinator',
      onClose,
    });
    (modal.props.onSaved as () => void)();
    expect(onClose).toHaveBeenCalledOnce();
    expect(setToast).toHaveBeenCalledWith({ title: 'Settings saved' });
  });

  // No tenant resolved (the Sidebar's real state today): Settings must say so
  // rather than label the workspace with a fabricated school.
  it('labels Settings honestly when no school is resolved', () => {
    const SidebarOverlays = privateComponent('SidebarOverlays');
    hooks.useState.mockReturnValue([null, vi.fn()]);

    const tree = SidebarOverlays({ activeOp: 'settings', tenant: null, onClose: vi.fn() });
    const modal = componentElement(tree, SettingsModal);

    expect(modal.props).toMatchObject({
      workspaceName: 'School not set',
      workspaceMeta: 'Tenant setup pending',
    });
  });

  it('keeps a completion toast mounted after the operation closes and dismisses it', () => {
    const SidebarOverlays = privateComponent('SidebarOverlays');
    const setToast = vi.fn();
    const toast = { title: 'Import complete', message: '3 batches updated' };
    hooks.useState.mockReturnValue([toast, setToast]);

    const tree = SidebarOverlays({ activeOp: null, tenant: TENANT_FIXTURE, onClose: vi.fn() });
    expect(elementsIn(tree).some((element) => element.type === ImportCsvModal || element.type === SettingsModal)).toBe(false);
    const toastElement = componentElement(tree, Toast);
    expect(toastElement.props).toMatchObject(toast);

    (toastElement.props.onDismiss as () => void)();
    expect(setToast).toHaveBeenCalledWith(null);
  });
});
