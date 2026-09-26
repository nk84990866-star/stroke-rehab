import React from 'react';
import { cn } from '../../lib/cn';

/**
 * SectionHeader — consistent page/section headings across the app.
 * Optional icon, eyebrow text, description, and right-side actions.
 */
const SectionHeader = ({ icon: Icon, eyebrow, title, description, actions, className }) => (
  <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3', className)}>
    <div>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-1">{eyebrow}</p>
      )}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
        {Icon && (
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary-50 text-primary-600 border border-primary-100">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        {title}
      </h1>
      {description && <p className="text-slate-500 mt-1.5 max-w-2xl text-pretty">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
  </div>
);

export default SectionHeader;
