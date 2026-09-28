import React from 'react';
import { cn } from '../../lib/cn';
import Card from './Card';

/**
 * SectionHeader — consistent page/section headings across the app.
 * Optional icon, eyebrow text, description, and right-side actions.
 * `variant="hero"` renders the same header inside a padded card, for
 * page-level welcome headers that already sit inside a Card.
 */
const SectionHeader = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  variant = 'default',
  className,
}) => {
  const isHero = variant === 'hero';

  const heading = (
    <div
      className={cn(
        'flex flex-col justify-between',
        isHero
          ? 'lg:flex-row lg:items-center gap-5'
          : 'sm:flex-row sm:items-end gap-3',
        className,
      )}
    >
      <div className={cn(isHero && 'min-w-0')}>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-widest text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 mb-1">
            {eyebrow}
          </p>
        )}

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
          {Icon && (
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 border border-primary-100 dark:border-primary-900">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          {title}
        </h1>

        {description && (
          <p
            className={cn(
              'text-slate-500 dark:text-slate-400 mt-1.5 text-pretty',
              isHero ? 'max-w-xl' : 'max-w-2xl',
            )}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );

  return isHero ? (
    <Card className="p-6 sm:p-7">{heading}</Card>
  ) : (
    heading
  );
};

export default SectionHeader;
