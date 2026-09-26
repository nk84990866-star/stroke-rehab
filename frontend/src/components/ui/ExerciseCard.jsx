import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/cn';
import Badge from './Badge';
import { EXERCISE_LEVELS, EXERCISE_CATEGORY_LABELS, SPEED_LABELS, getExerciseIcon } from '../../config/labels';

/**
 * ExerciseCard — one shared card for the exercise library and dashboard.
 * Renders only fields that exist on the Exercise model (no fake data).
 * Optional `statusBadge` node (e.g. completion Badge) renders in the header row.
 * Optional `meta` node renders as extra chips in the details row (hold time, suitability…).
 */
const ExerciseCard = ({ exercise, to, cta = 'Start Training', statusBadge, meta, className }) => {
  if (!exercise) return null;
  const level = EXERCISE_LEVELS[exercise.level] || { name: `Level ${exercise.level}`, badge: 'default' };
  const Icon = getExerciseIcon(exercise.icon_name);
  const href = to || `/exercise/${exercise.id}`;

  return (
    <div className={cn('bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card p-5 sm:p-6 flex flex-col', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 border border-primary-100 dark:border-primary-900">
          <Icon className="h-5.5 w-5.5" aria-hidden="true" />
        </span>
        <div className="flex items-center gap-2">
          {statusBadge}
          <Badge variant={level.badge}>
            Level {exercise.level} · {level.name}
          </Badge>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{exercise.name}</h3>
      {exercise.category && (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-0.5">
          {EXERCISE_CATEGORY_LABELS[exercise.category] || exercise.category}
        </p>
      )}
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed text-pretty line-clamp-3">
        {exercise.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {exercise.duration_seconds}s
        </span>
        {exercise.speed_requirement && (
          <span className="inline-flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> {SPEED_LABELS[exercise.speed_requirement] || exercise.speed_requirement}
          </span>
        )}
        {meta}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Link
          to={href}
          className="w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition-colors gap-2 cursor-pointer"
        >
          <Play className="h-4 w-4 fill-current" aria-hidden="true" /> {cta}
        </Link>
      </div>
    </div>
  );
};

export default ExerciseCard;
