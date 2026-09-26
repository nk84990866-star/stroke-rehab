import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * EmptyState — friendly placeholder when a list/chart has nothing to show.
 * Optional `action` renders a call-to-action below the text.
 */
const EmptyState = ({ icon: Icon = Inbox, title, description, action, className }) => (
  <div className={cn('bg-white rounded-xl border border-slate-200 shadow-card p-8 sm:p-12 text-center', className)}>
    <span className="inline-flex items-center justify-center p-4 rounded-2xl bg-slate-100 text-slate-500 mb-4">
      <Icon className="h-8 w-8" aria-hidden="true" />
    </span>
    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
    {description && <p className="text-slate-500 mt-1 max-w-md mx-auto">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

/** Convenience: same look but renders a router Link CTA. */
export const EmptyStateLink = ({ to, children, ...props }) => (
  <EmptyState
    {...props}
    action={
      to ? (
        <Link
          to={to}
          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition-colors cursor-pointer"
        >
          {children}
        </Link>
      ) : undefined
    }
  />
);

export default EmptyState;
