'use client';

/**
 * Shares sidebar visibility across the shell. A client context so a
 * server-rendered layout can still wrap server-component children.
 *
 * Two independent states, one per breakpoint — the CSS shows exactly one
 * affordance at a time:
 *   `open`      ≤800px — off-canvas drawer (open: MobileHeader hamburger;
 *               close: scrim, X button, nav click, Esc)
 *   `collapsed` ≥801px — the rail slides out of flow (collapse: brand-row
 *               toggle; expand: <SidebarExpandButton> in the Topbar)
 *
 * Behavior imported from the claude.ai/design project (`open`/`onClose` in
 * 87e4718b… · components/Sidebar.jsx; `navOpen`/`toggleNav` in e3ea69aa…).
 */

import { createContext, useCallback, useContext, useState } from 'react';

type NavDrawerCtx = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const NavDrawerContext = createContext<NavDrawerCtx | null>(null);

export function NavDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  return (
    <NavDrawerContext.Provider value={{ open, openDrawer, closeDrawer, collapsed, toggleCollapsed }}>
      {children}
    </NavDrawerContext.Provider>
  );
}

export function useNavDrawer(): NavDrawerCtx {
  const ctx = useContext(NavDrawerContext);
  if (!ctx) throw new Error('useNavDrawer must be used within <NavDrawerProvider>');
  return ctx;
}
