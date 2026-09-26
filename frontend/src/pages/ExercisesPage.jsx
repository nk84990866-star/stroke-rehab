import React, { useState, useEffect } from 'react';
import { getExercises } from '../services/api';
import { Dumbbell } from 'lucide-react';
import { cn } from '../lib/cn';
import { EmptyState, LoadingState, SectionHeader, ExerciseCard } from '../components/ui';
import { STROKE_TYPE_LABELS } from '../config/labels';

const LEVEL_TABS = [
  { label: 'Basic (Level 1)', value: 1 },
  { label: 'Moderate (Level 2)', value: 2 },
  { label: 'High (Level 3)', value: 3 },
];

const ExercisesPage = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedStrokeType, setSelectedStrokeType] = useState('all');
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <LoadingState fullPage message="Loading exercises…" />;
  }

  const filteredExercises = exercises.filter((ex) => {
    if (selectedStrokeType === 'all') return true;
    // API returns a parsed array (`suitable_stroke_types`), not raw JSON
    const types = Array.isArray(ex.suitable_stroke_types)
      ? ex.suitable_stroke_types
      : (() => { try { return JSON.parse(ex.suitable_stroke_types_json || '[]'); } catch { return []; } })();
    return types.includes(selectedStrokeType);
  });

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <SectionHeader
          icon={Dumbbell}
          eyebrow="Training"
          title="Exercise Library"
          description="Select from our level-based rehabilitative exercises matching your recovery trajectory."
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div
            className="inline-flex p-1 bg-slate-100 rounded-xl gap-1"
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

          <div className="flex items-center gap-2">
            <label htmlFor="strokeFilter" className="text-sm font-semibold text-slate-700 whitespace-nowrap">
              Stroke Type:
            </label>
            <select
              id="strokeFilter"
              className="block w-full sm:w-56 pl-3 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedStrokeType}
              onChange={(e) => setSelectedStrokeType(e.target.value)}
            >
              <option value="all">All Types</option>
              {Object.entries(STROKE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results meta */}
        <p className="text-sm text-slate-500" aria-live="polite">
          Showing <strong>{filteredExercises.length}</strong> exercise{filteredExercises.length !== 1 ? 's' : ''}
          {selectedStrokeType !== 'all' && <> for <strong>{STROKE_TYPE_LABELS[selectedStrokeType]}</strong></>}
        </p>

        {/* Exercises Grid */}
        {filteredExercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No exercises found"
            description="No exercises match this stroke type and level combination yet. Try a different filter."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredExercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;
