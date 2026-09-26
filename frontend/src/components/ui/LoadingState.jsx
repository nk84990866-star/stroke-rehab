import React from 'react';
import { cn } from '../../lib/cn';

/** LoadingState — full-page or inline centered spinner with optional message. */
const LoadingState = ({ message, fullPage = false, className }) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      'flex flex-col items-center justify-center gap-3',
      fullPage ? 'min-h-screen' : 'py-16',
      className,
    )}
  >
    <span
      className="inline-block h-10 w-10 rounded-full border-[3px] border-primary-100 dark:border-primary-900 border-t-primary-600 animate-spin"
      aria-hidden="true"
    />
    {message && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>}
    <span className="sr-only">Loading…</span>
  </div>
);

export default LoadingState;
