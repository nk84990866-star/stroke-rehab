import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * BackLink — consistent page-level back navigation.
 * A React Router link with the ArrowLeft icon, muted text, and subtle hover.
 * Accepts the same props as Link plus an optional className.
 */
const BackLink = ({ to, className, children, ...props }) => (
  <Link
    to={to}
    className={cn(
      'inline-flex items-center gap-1.5 text-sm font-semibold cursor-pointer transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100',
      className,
    )}
    {...props}
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    {children}
  </Link>
);

export default BackLink;