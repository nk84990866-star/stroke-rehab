import React, { useRef } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/cn';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

/**
 * ThemeSwitcher — radio-group semantics (arrow keys move between options),
 * works with keyboard only, and announces the current selection via the
 * group label. Compact segmented-button style for the navbar.
 */
const ThemeSwitcher = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const optionRefs = useRef([]);

  const onKeyDown = (e) => {
    const current = optionRefs.current.indexOf(document.activeElement);
    const idx = current >= 0 ? current : OPTIONS.findIndex((o) => o.value === theme);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % OPTIONS.length;
      setTheme(OPTIONS[next].value);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx - 1 + OPTIONS.length) % OPTIONS.length;
      setTheme(OPTIONS[next].value);
      optionRefs.current[next]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Select color theme"
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 dark:border-slate-700 dark:bg-slate-800',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            ref={(element) => { optionRefs.current[OPTIONS.findIndex((option) => option.value === value)] = element; }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            tabIndex={selected ? 0 : -1} // roving tabindex: one tab stop for the group
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex items-center justify-center rounded-full p-2 transition-colors cursor-pointer',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
              selected
                ? 'bg-white dark:bg-slate-900 text-primary-700 shadow-sm dark:bg-slate-950 dark:text-primary-300'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitcher;
