import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNavItems, isActive } from '../../config/navigation';
import { cn } from '../../lib/cn';

/**
 * Sidebar — global application navigation.
 *
 * Desktop (lg and up): a permanent, collapsible rail. Expanded is `lg:w-64`,
 * collapsed is `lg:w-20` (icons only, labels supplied via the native `title`
 * attribute plus `aria-label` so the collapsed rail stays fully accessible).
 *
 * Below lg: the same element becomes an off-canvas drawer driven by
 * `mobileOpen` — closed by default, dismissed by the scrim, the close button,
 * Escape (handled in AppShell) or a route change.
 *
 * Items and active-state matching come from config/navigation.js so this
 * component can never drift from the rest of the app. Detail routes
 * (/exercise/:id, /reports/:id) are not items — isActive() maps them onto
 * their parent section.
 */
const Sidebar = ({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // The shell only renders for authenticated users, but stay defensive so the
  // sidebar can never flash for a logged-out visitor.
  if (!user) return null;

  const links = getNavItems(user.role);

  const handleLogout = async () => {
    onCloseMobile();
    await logout();
    navigate('/login');
  };

  // Shared geometry: centred and padding-free when the rail is collapsed,
  // icon + label with a gap when expanded. cn() does not merge utilities, so
  // the two variants are kept mutually exclusive.
  const itemLayout = collapsed
    ? 'justify-center px-0 py-2.5'
    : 'gap-3 px-3 py-2.5';

  return (
    <>
      {/* Scrim — mobile only; clicking it dismisses the drawer. */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          // Position: fixed, full height, slides over the content on mobile.
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col',
          'border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
          'transition-[width,transform] duration-200 ease-in-out',
          // Desktop width follows the collapsed preference.
          collapsed ? 'lg:w-20' : 'lg:w-64',
          // Mobile visibility; always pinned open at lg and above.
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* ---------------- Header ---------------- */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 dark:border-slate-700">
          {/* Mobile drawer: brand mark, so the drawer identifies itself. */}
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
              NeuroMotion{' '}
              <span className="text-primary-700 dark:text-primary-300">AI</span>
            </span>
          </div>

          {/* Desktop: collapse / expand control. */}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn(
              'hidden shrink-0 items-center justify-center rounded-lg p-2 transition-colors lg:flex',
              'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              'cursor-pointer',
            )}
            style={collapsed ? { marginLeft: 'auto' } : undefined}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          {/* Mobile: close the drawer. */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* ---------------- Navigation ---------------- */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4"
        >
          <ul className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path, location.pathname);
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={onCloseMobile}
                    aria-current={active ? 'page' : undefined}
                    // Collapsed: no visible text, so name the link explicitly.
                    aria-label={collapsed ? link.name : undefined}
                    title={collapsed ? link.name : undefined}
                    className={cn(
                      'relative flex items-center rounded-lg text-sm font-semibold transition-colors',
                      itemLayout,
                      active
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
                    )}
                  >
                    {/* Active rail — stays visible at the collapsed width. */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-600 dark:bg-primary-400"
                        aria-hidden="true"
                      />
                    )}
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{link.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ---------------- User + logout ---------------- */}
        <div className="shrink-0 space-y-1 border-t border-slate-200 p-3 dark:border-slate-700">
          <div
            className={cn(
              'flex items-center rounded-lg bg-slate-50 dark:bg-slate-800/60',
              collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
            )}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold uppercase text-primary-700 dark:bg-primary-900/50 dark:bg-primary-800 dark:text-primary-100">
              {(user.full_name || '?').trim().charAt(0)}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {user.full_name}
                </p>
                <p className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">
                  {user.role}
                </p>
              </div>
            )}
          </div>

          {/* NOTE: no Profile link here. `/profile` is a patient nav item owned
              by config/navigation.js and is already rendered in the list
              above; a second link in the footer would duplicate it. The
              footer is deliberately limited to identity + sign-out. */}

          <button
            type="button"
            onClick={handleLogout}
            aria-label={collapsed ? 'Log out' : undefined}
            title={collapsed ? 'Log out' : undefined}
            className={cn(
              'flex w-full items-center rounded-lg text-sm font-semibold transition-colors',
              itemLayout,
              'text-left text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300',
              'cursor-pointer',
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
