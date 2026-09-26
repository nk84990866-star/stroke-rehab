import React from 'react';
import { cn } from '../../lib/cn';

const ICON_COLORS = {
  primary: 'bg-primary-50 text-primary-600 border-primary-100',
  success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  warning: 'bg-amber-50 text-amber-600 border-amber-100',
  danger: 'bg-red-50 text-red-600 border-red-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
};

/**
 * StatCard — the "kpi tile" used on dashboards.
 * Optional `footer` renders a line of muted text under the value.
 */
const StatCard = ({ icon: Icon, label, value, sub, footer, color = 'primary', className }) => (
  <div className={cn('bg-white rounded-xl border border-slate-200 shadow-card p-5', className)}>
    <div className="flex items-center gap-4">
      {Icon && (
        <span className={cn('inline-flex items-center justify-center p-3 rounded-xl border', ICON_COLORS[color])}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-tight">
          {value}
          {sub && <span className="text-sm font-semibold text-slate-500 ml-1">{sub}</span>}
        </p>
      </div>
    </div>
    {footer && <p className="text-xs text-slate-500 mt-3">{footer}</p>}
  </div>
);

export default StatCard;
