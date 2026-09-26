import React from 'react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  primary: 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 border-primary-200 dark:border-primary-800',
  success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  danger: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  purple: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

/** Badge — small pill for levels, statuses, counts. */
const Badge = ({ variant = 'default', className, children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      VARIANTS[variant] || VARIANTS.default,
      className,
    )}
    {...props}
  >
    {children}
  </span>
);

export default Badge;
