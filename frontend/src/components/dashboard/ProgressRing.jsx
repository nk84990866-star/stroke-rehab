import React from 'react';

const R = 34;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * ProgressRing — circular completion indicator for the dashboard's
 * "today" summary. `value` is 0–100, or null when no plan exists
 * (renders an em-dash instead of inventing data).
 */
const ProgressRing = ({ value, size = 112, label }) => {
  const pct = value == null ? null : Math.max(0, Math.min(100, value));
  const ariaLabel =
    label || (pct != null ? `${Math.round(pct)}% complete` : 'Completion progress');

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} viewBox="0 0 88 88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r={R}
          fill="none"
          stroke="var(--color-primary-100)"
          strokeWidth="8"
        />
        {pct != null && (
          <circle
            cx="44"
            cy="44"
            r={R}
            fill="none"
            stroke="var(--color-primary-600)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">
          {pct != null ? `${Math.round(pct)}%` : '—'}
        </span>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
          {pct != null ? 'done' : 'no plan'}
        </span>
      </span>
    </div>
  );
};

export default ProgressRing;
