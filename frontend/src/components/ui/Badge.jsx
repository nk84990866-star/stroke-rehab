import React from 'react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
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
