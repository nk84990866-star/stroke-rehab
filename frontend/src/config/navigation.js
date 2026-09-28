/**
 * Global navigation configuration — single source of truth for the
 * application's navigation items and active-route matching.
 *
 * Shared by the current Navbar and the upcoming Sidebar so both render
 * exactly the same items, in the same order, with the same active state.
 *
 * Only routes that actually exist in the router (src/App.jsx) are listed.
 * Detail routes such as /exercise/:id and /reports/:id are intentionally
 * NOT nav items — they are reached from their parent section and are
 * highlighted through `isActive` below.
 */
import {
  Award,
  BarChart2,
  Dumbbell,
  FileText,
  LayoutDashboard,
  User,
} from 'lucide-react';

/** Navigation items for the `patient` role. */
export const PATIENT_NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Exercises', path: '/exercises', icon: Dumbbell },
  { name: 'Progress', path: '/progress', icon: BarChart2 },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Achievements', path: '/achievements', icon: Award },
  { name: 'Profile', path: '/profile', icon: User },
];

/** Navigation items for the `therapist` role. */
export const THERAPIST_NAV_ITEMS = [
  { name: 'Clinician Panel', path: '/therapist', icon: User },
];

/**
 * Nav items for a role. Any non-therapist role falls back to the patient
 * list, matching the previous inline behaviour in Navbar.
 */
export const getNavItems = (role) =>
  role === 'therapist' ? THERAPIST_NAV_ITEMS : PATIENT_NAV_ITEMS;

/**
 * Whether `path` is the section that owns `pathname`.
 *
 * A link is "active" for the section it belongs to, so child/detail routes
 * highlight their parent. Moved verbatim from Navbar — the two clauses that
 * look redundant are load-bearing:
 *   - `path !== '/dashboard'` keeps /dashboard from matching any sub-path.
 *   - `path === '/exercises' && .../exercise/` maps the singular
 *     /exercise/:id route onto the plural "Exercises" item.
 * /reports/:id is covered by the generic `startsWith(path + '/')` clause.
 *
 * Takes the pathname explicitly so it stays a pure function that any
 * component can call, regardless of whether it uses useLocation().
 */
export const isActive = (path, pathname) =>
  pathname === path ||
  (path !== '/dashboard' && pathname.startsWith(`${path}/`)) ||
  (path === '/exercises' && pathname.startsWith('/exercise/'));
