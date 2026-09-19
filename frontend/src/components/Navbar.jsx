import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Flame, LogOut, Menu, X, Award, BarChart2, FileText, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const patientLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity },
    { name: 'Exercises', path: '/exercises', icon: Activity },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Progress', path: '/progress', icon: BarChart2 },
    { name: 'Achievements', path: '/achievements', icon: Award },
  ];

  const therapistLinks = [
    { name: 'Clinician Panel', path: '/therapist', icon: User },
  ];

  const links = user.role === 'therapist' ? therapistLinks : patientLinks;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NeuroMotion AI
              </span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4 items-center">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors gap-2 ${
                      isActive(link.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
            {user.role === 'patient' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                <Flame className="h-4 w-4 fill-current" />
                <span className="text-sm font-semibold">{user.streak_count || 0} Day Streak</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <User className="h-5 w-5 text-gray-400" />
              <span>{user.full_name}</span>
              <span className="text-xs uppercase bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-bold">
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 gap-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200 px-2 pt-2 pb-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium gap-2 ${
                  isActive(link.path)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.name}
              </Link>
            );
          })}
          {user.role === 'patient' && (
            <div className="flex items-center gap-2 px-3 py-2 text-amber-700 font-semibold">
              <Flame className="h-5 w-5 fill-current" />
              <span>{user.streak_count || 0} Day Streak</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 gap-2 text-left cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
