'use client';

/**
 * Shares the mobile sidebar-drawer open/close state between the off-canvas
 * <Sidebar> (close: scrim, X button, nav click, Esc) and the <MobileHeader>
 * hamburger (open). A client context so a server-rendered layout can still
 * wrap server-component children.
 *
 * Behavior imported from the claude.ai/design project
 * (87e4718b… · components/Sidebar.jsx `open`/`onClose`).
 */

import { createContext, useCallback, useContext, useState } from 'react';

type NavDrawerCtx = { open: boolean; openDrawer: () => void; closeDrawer: () => void };

const NavDrawerContext = createContext<NavDrawerCtx | null>(null);

export function NavDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  return (
    <NavDrawerContext.Provider value={{ open, openDrawer, closeDrawer }}>
      {children}
    </NavDrawerContext.Provider>
  );
}

export function useNavDrawer(): NavDrawerCtx {
  const ctx = useContext(NavDrawerContext);
  if (!ctx) throw new Error('useNavDrawer must be used within <NavDrawerProvider>');
  return ctx;
}
