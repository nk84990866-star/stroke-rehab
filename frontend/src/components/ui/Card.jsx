import React from 'react';
import { cn } from '../../lib/cn';

/**
 * Card — white rounded panel used everywhere.
 * `hoverable` adds the lift-on-hover treatment for clickable cards.
 */
const Card = ({ hoverable = false, className, children, ...props }) => (
  <div
    className={cn(
      'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card',
      hoverable && 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-primary-200 dark:hover:border-primary-800',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

const Header = ({ className, children, ...props }) => (
  <div className={cn('p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800', className)} {...props}>
    {children}
  </div>
);

const Title = ({ className, children, ...props }) => (
  <h3 className={cn('text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50', className)} {...props}>
    {children}
  </h3>
);

const Content = ({ className, children, ...props }) => (
  <div className={cn('p-5 sm:p-6', className)} {...props}>
    {children}
  </div>
);

Card.Header = Header;
Card.Title = Title;
Card.Content = Content;

export default Card;
