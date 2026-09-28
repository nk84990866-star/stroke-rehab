import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';
import { Activity, Flame, LogOut, Menu, X, UserCircle2 } from 'lucide-react';
import { getNavItems, isActive } from '../config/navigation';
import { cn } from '../lib/cn';

/**
 * Navbar — the top bar.
 *
 * Rendered in two modes:
 *  - standalone (public routes): unchanged — owns the desktop links and its
 *    own mobile dropdown.
 *  - inside AppShell (`onOpenMobileNav` supplied): the Sidebar is the single
 *    navigation system, so the desktop links and the mobile dropdown are
 *    suppressed and the hamburger opens the sidebar drawer instead. Brand,
 *    theme switcher, streak and the profile dropdown are unchanged.
 */
const Navbar = ({ onOpenMobileNav, mobileNavOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const inShell = Boolean(onOpenMobileNav);

  // Close the profile dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  // Close menus whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const links = getNavItems(user.role);

  const navLinkClass = (active) =>
    cn(
      'inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors gap-1.5 cursor-pointer',
      active
        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50',
    );

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 dark:border-slate-700 dark:bg-slate-900/90 dark:border-slate-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center min-w-0">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-primary-600 text-white shadow-sm">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-bold text-lg text-slate-900 dark:text-slate-50 dark:text-slate-50 whitespace-nowrap">
                NeuroMotion <span className="text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200">AI</span>
              </span>
            </Link>
            {/* Desktop links — the Sidebar owns navigation inside AppShell. */}
            {!inShell && (
              <div className="hidden lg:ml-8 lg:flex lg:items-center lg:gap-1">
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.path, location.pathname);
                  return (
                    <Link key={link.path} to={link.path} className={navLinkClass(active)} aria-current={active ? 'page' : undefined}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeSwitcher />
            {user.role === 'patient' && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full"
                title="Daily exercise streak"
              >
                <Flame className="h-4 w-4 fill-current" aria-hidden="true" />
                <span className="text-sm font-bold tabular-nums">{user.streak_count || 0}</span>
                <span className="text-xs font-semibold">day streak</span>
              </div>
            )}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                // Inside AppShell the Sidebar footer already shows the user's
                // name, so this pill is avatar-only (see the name span below).
                // That span is the button's accessible name, so supply one
                // explicitly here. Standalone mode leaves it undefined and
                // falls back to the visible name, exactly as before.
                aria-label={inShell ? `Account menu for ${user.full_name || 'user'}` : undefined}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 text-xs font-bold uppercase dark:bg-primary-800 dark:text-primary-100">
                  {(user.full_name || '?').trim().charAt(0)}
                </span>
                {!inShell && (
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-200 max-w-[10rem] truncate">{user.full_name}</span>
                )}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-50 dark:bg-slate-900 dark:border-slate-700"
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate dark:text-slate-50">{user.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate dark:text-slate-400">{user.email}</p>
                    <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded dark:bg-slate-800 dark:text-slate-300">
                      {user.role}
                    </span>
                  </div>
                  {user.role === 'patient' && (
                    <Link
                      role="menuitem"
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <UserCircle2 className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" /> My Profile
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 text-left cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeSwitcher />
            {user.role === 'patient' && (
              <span className="mr-2 inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold">
                <Flame className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> {user.streak_count || 0}
              </span>
            )}
            <button
              type="button"
              onClick={inShell ? onOpenMobileNav : () => setMobileOpen((v) => !v)}
              aria-expanded={inShell ? Boolean(mobileNavOpen) : mobileOpen}
              aria-label={inShell ? 'Open navigation menu' : mobileOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex items-center justify-center p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {mobileOpen && !inShell ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — standalone mode only; inside AppShell the Sidebar
          drawer is the mobile navigation system. */}
      {!inShell && mobileOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-3 pt-2 pb-4 space-y-1 shadow-lg dark:bg-slate-900 dark:border-slate-700">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path, location.pathname);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-base font-semibold gap-2.5',
                  active ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="px-3 py-2 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate dark:text-slate-50">{user.full_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate dark:text-slate-400">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 rounded-lg cursor-pointer"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
