import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import Sidebar from './Sidebar';
import { cn } from '../../lib/cn';

const STORAGE_KEY = 'sidebar-collapsed';

/**
 * Reads the persisted collapsed preference.
 *
 * Deliberately a lazy useState initializer (like ThemeContext's
 * readStoredTheme) so the sidebar renders at its final width on the very
 * first paint — a post-mount useEffect would show it expanded and then snap
 * it to collapsed.
 */
const readCollapsed = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false; // storage unavailable (private mode) — default to expanded
  }
};

/**
 * AppShell — the authenticated application shell.
 *
 * Owns sidebar presentation state (desktop collapsed/expanded, mobile drawer
 * open/closed), renders the Sidebar + Navbar, and hosts page content through
 * React Router's <Outlet />.
 *
 * Mounted only inside <ProtectedRoute>, so it is never rendered for
 * logged-out visitors and its <main> is the single `#main-content` landmark
 * the skip link targets.
 */
const AppShell = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* storage unavailable — the toggle still works for this session */
      }
      return next;
    });
  }, []);

  // Navigating dismisses the mobile drawer.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Escape dismisses the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  // Lock background scrolling while the drawer covers the page. The drawer can
  // only be opened by the Navbar's lg:hidden button, so this never applies on
  // desktop.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <div className="flex flex-1 min-h-0 bg-surface dark:bg-slate-950">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* Content column. The sidebar is position:fixed, so the shell reserves
          its width with padding rather than a flex sibling — this keeps the
          width transition off the main content's reflow path. */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-in-out',
          collapsed ? 'lg:pl-20' : 'lg:pl-64',
        )}
      >
        <Navbar onOpenMobileNav={openMobile} mobileNavOpen={mobileOpen} />

        <main id="main-content" className="flex-grow">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
