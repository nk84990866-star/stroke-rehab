import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Flame,
  LogOut,
  Menu,
  X,
  Award,
  BarChart2,
  Dumbbell,
  FileText,
  LayoutDashboard,
  User,
  UserCircle2,
} from 'lucide-react';
import { cn } from '../lib/cn';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  const patientLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Exercises', path: '/exercises', icon: Dumbbell },
    { name: 'Progress', path: '/progress', icon: BarChart2 },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Achievements', path: '/achievements', icon: Award },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const therapistLinks = [
    { name: 'Clinician Panel', path: '/therapist', icon: User },
  ];

  const links = user.role === 'therapist' ? therapistLinks : patientLinks;

  // A link is "active" for the section it belongs to (e.g. /exercise/3 lights up Exercises)
  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(`${path}/`)) ||
    (path === '/exercises' && location.pathname.startsWith('/exercise/'));

  const navLinkClass = (active) =>
    cn(
      'inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors gap-1.5 cursor-pointer',
      active
        ? 'bg-primary-50 text-primary-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    );

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center min-w-0">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-primary-600 text-white shadow-sm">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-bold text-lg text-slate-900 whitespace-nowrap">
                NeuroMotion <span className="text-primary-600">AI</span>
              </span>
            </Link>
            <div className="hidden lg:ml-8 lg:flex lg:items-center lg:gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link key={link.path} to={link.path} className={navLinkClass(active)} aria-current={active ? 'page' : undefined}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-3">
            {user.role === 'patient' && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full"
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
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold uppercase">
                  {(user.full_name || '?').trim().charAt(0)}
                </span>
                <span className="text-sm font-semibold text-slate-700 max-w-[10rem] truncate">{user.full_name}</span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50"
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {user.role}
                    </span>
                  </div>
                  {user.role === 'patient' && (
                    <Link
                      role="menuitem"
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <UserCircle2 className="h-4 w-4 text-slate-500" aria-hidden="true" /> My Profile
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 text-left cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center lg:hidden">
            {user.role === 'patient' && (
              <span className="mr-2 inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                <Flame className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> {user.streak_count || 0}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex items-center justify-center p-2.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-3 pt-2 pb-4 space-y-1 shadow-lg">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-base font-semibold gap-2.5',
                  active ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="px-3 py-2 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
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
