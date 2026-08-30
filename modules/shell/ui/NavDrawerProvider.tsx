'use client';

/**
 * Shares sidebar visibility state between the shell components that need it:
 * the mobile off-canvas drawer (open/close, shared by <Sidebar> and
 * <MobileHeader>'s hamburger) and the desktop collapse toggle (shared by
 * <Sidebar>'s own collapse button and the expand button that has to live
 * outside <aside> once it's `visibility: hidden`, per design-system.css's
 * `.sidebar.collapsed` / `.sb-expand` rules). A client context so a
 * server-rendered layout can still wrap server-component children.
 *
 * Drawer behavior imported from the claude.ai/design project
 * (87e4718b… · components/Sidebar.jsx `open`/`onClose`).
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
