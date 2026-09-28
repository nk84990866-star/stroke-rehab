import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';
import Card from './Card';
import Button from './Button';

/**
 * EmptyState — friendly placeholder when a list/chart has nothing to show.
 * Optional `action` renders a call-to-action below the text.
 */
const EmptyState = ({ icon: Icon = Inbox, title, description, action, className }) => (
  <Card className={cn('p-8 sm:p-12 text-center', className)}>
    <span className="inline-flex items-center justify-center p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-4">
      <Icon className="h-8 w-8" aria-hidden="true" />
    </span>
    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h3>
    {description && <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </Card>
);

/** Convenience: same look but renders a router Link CTA. */
export const EmptyStateLink = ({ to, children, ...props }) => (
  <EmptyState
    {...props}
    action={
      to ? (
        <Button asChild variant="primary">
          <Link to={to}>{children}</Link>
        </Button>
      ) : undefined
    }
  />
);

export default EmptyState;
