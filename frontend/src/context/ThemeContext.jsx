import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

const getSystemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia?.(MEDIA_QUERY).matches
    ? 'dark'
    : 'light';

const readStoredTheme = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system'; // default: follow the OS preference
  } catch {
    return 'system';
  }
};

/** Applies the resolved theme to <html> (class + color-scheme for form controls). */
const applyTheme = (resolved) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readStoredTheme); // 'light' | 'dark' | 'system'
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Resolve what the user should see right now
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // Persist on explicit change; 'system' removes the override
  useEffect(() => {
    try {
      if (theme === 'system') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      /* storage unavailable (private mode) — theme still works for the session */
    }
  }, [theme]);

  // Follow OS changes while in 'system' mode (and keep systemTheme fresh)
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia(MEDIA_QUERY);
    const onChange = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Apply whenever the resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const value = {
    theme,            // selected preference
    resolvedTheme,    // what is actually displayed
    setTheme,         // 'light' | 'dark' | 'system'
    toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
