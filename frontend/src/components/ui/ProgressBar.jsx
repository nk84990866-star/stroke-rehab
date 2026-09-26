import React from 'react';
import { cn } from '../../lib/cn';

const FILL = {
  primary: 'bg-primary-600',
  success: 'bg-emerald-50 dark:bg-emerald-950/400',
  warning: 'bg-amber-50 dark:bg-amber-950/400',
  danger: 'bg-red-50 dark:bg-red-950/400',
  purple: 'bg-purple-50 dark:bg-purple-950/400',
};

/**
 * ProgressBar — accessible, labeled progress bar (0–100).
 * `valueText` overrides the default "X%" announcement for screen readers.
 */
const ProgressBar = ({
  value = 0,
  max = 100,
  variant = 'primary',
  label,
  valueText,
  size = 'md',
  className,
}) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
            {valueText ?? `${Math.round(pct)}%`}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
        className={cn(
          'w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden',
          size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', FILL[variant] || FILL.primary)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
