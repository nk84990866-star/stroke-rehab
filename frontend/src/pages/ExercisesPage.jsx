import React, { useState, useEffect, useMemo } from 'react';
import { getExercises } from '../services/api';
import { Dumbbell, Search, SlidersHorizontal, Timer, Users, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, EmptyState, LoadingState, SectionHeader, ExerciseCard } from '../components/ui';
import {
  STROKE_TYPE_LABELS,
  STROKE_TYPE_SHORT_LABELS,
  SEVERITY_LABELS,
  EXERCISE_CATEGORY_LABELS,
} from '../config/labels';

const LEVEL_TABS = [
  { label: 'Basic (Level 1)', value: 1 },
  { label: 'Moderate (Level 2)', value: 2 },
  { label: 'High (Level 3)', value: 3 },
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'Any severity' },
  ...[1, 2, 3, 4, 5].map((lvl) => ({ value: String(lvl), label: `Level ${lvl} — ${SEVERITY_LABELS[lvl]}` })),
];

/** Client-side search across real fields only (no backend search endpoint exists). */
const matchesSearch = (ex, q) => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    (ex.name || '').toLowerCase().includes(needle) ||
    (ex.description || '').toLowerCase().includes(needle) ||
    (ex.category && (EXERCISE_CATEGORY_LABELS[ex.category] || ex.category).toLowerCase().includes(needle))
  );
};

const ExercisesPage = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedStrokeType, setSelectedStrokeType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch once per level via the existing wrapper; search/stroke/severity
  // filters are client-side (no extra API requests, no new endpoints).
  useEffect(() => {
    const loadExercises = async () => {
      setLoading(true);
      try {
        const data = await getExercises(selectedLevel || undefined);
        setExercises(data);
      } catch (err) {
        console.error('Error loading exercises:', err);
      } finally {
        setLoading(false);
      }
    };
    loadExercises();
  }, [selectedLevel]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (!matchesSearch(ex, search)) return false;
      if (selectedStrokeType !== 'all') {
        // API returns a parsed array (`suitable_stroke_types`)
        const types = Array.isArray(ex.suitable_stroke_types)
          ? ex.suitable_stroke_types
          : (() => { try { return JSON.parse(ex.suitable_stroke_types_json || '[]'); } catch { return []; } })();
        if (!types.includes(selectedStrokeType)) return false;
      }
      if (selectedSeverity !== 'all') {
        const sev = Number(selectedSeverity);
        if (sev < (ex.min_severity ?? 1) || sev > (ex.max_severity ?? 5)) return false;
      }
      return true;
    });
  }, [exercises, search, selectedStrokeType, selectedSeverity]);

  const hasActiveFilters =
    search.trim() !== '' || selectedStrokeType !== 'all' || selectedSeverity !== 'all';

  const resetFilters = () => {
    setSearch('');
    setSelectedStrokeType('all');
    setSelectedSeverity('all');
  };

  const selectClass =
    'block w-full sm:w-52 pl-3 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer';

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <SectionHeader
          icon={Dumbbell}
          eyebrow="Training"
          title="Exercise Library"
          description="Browse the rehabilitation exercises available in your program and choose one that fits your level and goals."
        />

        {/* Search + filters */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative lg:w-80">
            <label htmlFor="exercise-search" className="sr-only">
              Search exercises by name, description, or target area
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
            <input
              id="exercise-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 w-fit"
            role="tablist"
            aria-label="Exercise difficulty level"
          >
            {LEVEL_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={selectedLevel === tab.value}
                onClick={() => setSelectedLevel(tab.value)}
                className={cn(
                  'px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer',
                  selectedLevel === tab.value
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:ml-auto">
            <div className="flex items-center gap-2">
              <label htmlFor="strokeFilter" className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                <Users className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden="true" />Stroke:
              </label>
              <select
                id="strokeFilter"
                className={selectClass}
                value={selectedStrokeType}
                onChange={(e) => setSelectedStrokeType(e.target.value)}
              >
                <option value="all">All types</option>
                {Object.entries(STROKE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="severityFilter" className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                <SlidersHorizontal className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden="true" />Severity:
              </label>
              <select
                id="severityFilter"
                className={selectClass}
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results meta / grid with inline loading state */}
        {loading ? (
          <LoadingState message="Loading exercises…" />
        ) : (
          <>
            <p className="text-sm text-slate-500" aria-live="polite">
              Showing <strong>{filteredExercises.length}</strong> of {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
              {hasActiveFilters && <> matching your filters</>}
            </p>

            {filteredExercises.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No exercises found"
                description="Try changing your search or filters."
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" onClick={resetFilters}>Reset filters</Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredExercises.map((ex) => {
                  const targets = Array.isArray(ex.target_positions) ? ex.target_positions : [];
                  const holdSecs = targets.map((t) => Number(t.hold_sec) || 0).filter(Boolean);
                  const maxHold = holdSecs.length ? Math.max(...holdSecs) : null;
                  const suitable = Array.isArray(ex.suitable_stroke_types) ? ex.suitable_stroke_types : [];

                  return (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      cta="Start Exercise"
                      meta={
                        <>
                          {maxHold != null && (
                            <span className="inline-flex items-center gap-1">
                              <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Hold up to {maxHold}s
                            </span>
                          )}
                          {suitable.length > 0 && suitable.length < 4 && (
                            <span className="inline-flex items-center gap-1 flex-wrap">
                              <Users className="h-3.5 w-3.5" aria-hidden="true" />
                              {suitable.map((t) => STROKE_TYPE_SHORT_LABELS[t] || t).join(', ')}
                            </span>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;
