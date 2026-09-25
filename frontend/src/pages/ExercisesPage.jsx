import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getExercises } from '../services/api';
import { ShieldAlert, Play, Clock, ArrowRight } from 'lucide-react';

const ExercisesPage = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(1); // 1 = Basic, 2 = Moderate, 3 = High
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const levelBadges = {
    1: 'bg-green-100 text-green-800 border border-green-200',
    2: 'bg-amber-100 text-amber-800 border border-amber-200',
    3: 'bg-red-100 text-red-800 border border-red-200',
  };

  const filteredExercises = exercises.filter(ex => {
    if (selectedStrokeType === 'all') return true;
    // API returns a parsed array (`suitable_stroke_types`), not raw JSON
    const types = Array.isArray(ex.suitable_stroke_types)
      ? ex.suitable_stroke_types
      : (() => { try { return JSON.parse(ex.suitable_stroke_types_json || '[]'); } catch { return []; } })();
    return types.includes(selectedStrokeType);
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Exercise Library</h1>
          <p className="text-gray-600 mt-1">Select from our level-based rehabilitative exercises matching your recovery trajectory.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex border-b border-gray-200 w-full sm:w-auto">
            {[
              { label: 'Basic (Level 1)', value: 1 },
              { label: 'Moderate (Level 2)', value: 2 },
              { label: 'High (Level 3)', value: 3 },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedLevel(tab.value)}
                className={`py-2 px-4 font-medium text-sm border-b-2 focus:outline-none transition-colors cursor-pointer ${
                  selectedLevel === tab.value
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Stroke Type:</span>
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white border"
              value={selectedStrokeType}
              onChange={(e) => setSelectedStrokeType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="ischemic">Ischemic</option>
              <option value="hemorrhagic">Hemorrhagic</option>
              <option value="tia">TIA (Mini Stroke)</option>
              <option value="brainstem">Brainstem</option>
            </select>
          </div>
        </div>

        {/* Exercises Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredExercises.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500">
              No exercises found for this stroke type and level combination.
            </div>
          )}
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow ${
                ex.level === 3 ? 'hover:border-red-300' : ex.level === 2 ? 'hover:border-amber-300' : 'hover:border-green-300'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${levelBadges[ex.level]}`}>
                    Level {ex.level} - {ex.level_name}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <Clock className="h-4.5 w-4.5" />
                    <span>{ex.duration_seconds}s</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{ex.name}</h3>
                <p className="text-gray-600 text-sm mt-2 line-clamp-3 leading-relaxed">{ex.description}</p>
                
                {ex.speed_requirement && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
                    Speed: {ex.speed_requirement}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <Link
                  to={`/exercise/${ex.id}`}
                  className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors gap-2 cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" /> Start Training
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExercisesPage;
