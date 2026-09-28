import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

/**
 * ErrorState — friendly inline error panel with optional retry action.
 * `message` is the detail line; `title` defaults to "Something went wrong".
 */
const ErrorState = ({ title = 'Something went wrong', message, onRetry, className }) => (
  <div
    role="alert"
    className={cn('bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800 shadow-card p-8 text-center', className)}
  >
    <span className="inline-flex items-center justify-center p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 mb-4">
      <AlertTriangle className="h-8 w-8" aria-hidden="true" />
    </span>
    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h3>
    {message && <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{message}</p>}
    {onRetry && (
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export default ErrorState;
