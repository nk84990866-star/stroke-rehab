import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * ErrorState — friendly inline error panel with optional retry action.
 * `message` is the detail line; `title` defaults to "Something went wrong".
 */
const ErrorState = ({ title = 'Something went wrong', message, onRetry, className }) => (
  <div
    role="alert"
    className={cn('bg-white rounded-xl border border-red-200 shadow-card p-8 text-center', className)}
  >
    <span className="inline-flex items-center justify-center p-4 rounded-2xl bg-red-50 text-red-500 mb-4">
      <AlertTriangle className="h-8 w-8" aria-hidden="true" />
    </span>
    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
    {message && <p className="text-slate-500 mt-1 max-w-md mx-auto">{message}</p>}
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        Try again
      </button>
    )}
  </div>
);

export default ErrorState;
