import React from 'react';
import { cn } from '../../lib/cn';

/**
 * SegmentedControl — single-select pill group.
 * `options` is an array of `{ value, label }`; `value` is the active option's value.
 *
 * `semantic` preserves the caller's existing ARIA model (never silently converts):
 *  - 'tabs'  -> container `role="tablist"`, buttons `role="tab"` + `aria-selected`
 *  - 'group' -> container `role="group"`,  buttons `aria-pressed`
 *
 * Native button keyboard behavior is preserved (Tab focus, Enter/Space activate);
 * no arrow-key navigation or roving tabindex is added.
 *
 * Horizontal button padding is supplied by the caller via `buttonClassName`
 * (the base button classes deliberately omit `px-*` so per-site padding never
 * cascades — `cn` has no tailwind-merge).
 */
const SegmentedControl = ({
  options,
  value,
  onChange,
  semantic = 'group',
  ariaLabel,
  className,
  buttonClassName = 'px-4',
}) => {
  const isTabs = semantic === 'tabs';
  return (
    <div
      role={isTabs ? 'tablist' : 'group'}
      aria-label={ariaLabel}
      className={cn('inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1', className)}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            {...(isTabs ? { role: 'tab', 'aria-selected': selected } : { 'aria-pressed': selected })}
            onClick={() => onChange(option.value)}
            className={cn(
              'py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer',
              buttonClassName,
              selected
                ? 'bg-white dark:bg-slate-900 text-primary-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;