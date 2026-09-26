import React from 'react';
import { cn } from '../../lib/cn';

const ICON_COLORS = {
  primary: 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 border-primary-100 dark:border-primary-900',
  success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100',
  danger: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-100',
  purple: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100',
};

/**
 * StatCard — the "kpi tile" used on dashboards.
 * Optional `footer` renders a line of muted text under the value.
 */
const StatCard = ({ icon: Icon, label, value, sub, footer, color = 'primary', className }) => (
  <div className={cn('bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card p-5', className)}>
    <div className="flex items-center gap-4">
      {Icon && (
        <span className={cn('inline-flex items-center justify-center p-3 rounded-xl border', ICON_COLORS[color])}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums leading-tight">
          {value}
          {sub && <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">{sub}</span>}
        </p>
      </div>
    </div>
    {footer && <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{footer}</p>}
  </div>
);

export default StatCard;
