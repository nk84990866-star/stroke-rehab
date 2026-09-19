import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStats, getRecommendedProgram } from '../services/api';
import { Award, Flame, Play, Clock, BarChart2, Star, Calendar } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const statsData = await getStats();
        setStats(statsData);
        
        const progData = await getRecommendedProgram();
        setProgram(progData);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const strokeTypeLabels = {
    ischemic: 'Ischemic Stroke',
    hemorrhagic: 'Hemorrhagic Stroke',
    tia: 'TIA (Mini Stroke)',
    brainstem: 'Brainstem Stroke',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Welcome, {user.full_name}!</h1>
            <p className="text-gray-600 mt-1">
              Therapy Profile: <span className="font-semibold text-blue-600">{strokeTypeLabels[user.stroke_type] || user.stroke_type}</span> | Affected Side: <span className="font-semibold text-blue-600">{user.affected_side}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              to="/exercises"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 gap-2 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" /> Start Exercise
            </Link>
            <Link
              to="/progress"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 gap-2"
            >
              <BarChart2 className="h-4 w-4" /> View Analytics
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <Flame className="h-8 w-8 fill-current" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Exercise Streak</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.streak || 0} Days</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Clock className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_sessions || 0} Sessions</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
              <Star className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.avg_score || 0}%</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <Award className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Trophy Points</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.points || 0} XP</p>
            </div>
          </div>
        </div>

        {/* Recommended Program */}
        {program && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" /> Prescribed Exercises (Level {program.exercises?.[0]?.level_name || '1'})
              </h2>
              <p className="text-gray-600 mt-1">{program.program_description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {program.exercises?.map((ex) => (
                <div key={ex.id} className="border border-gray-200 rounded-lg p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Level {ex.level}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{ex.duration_seconds}s Duration</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{ex.name}</h3>
                    <p className="text-gray-600 text-sm mt-2 line-clamp-3">{ex.description}</p>
                  </div>
                  <div className="mt-6">
                    <Link
                      to={`/exercise/${ex.id}`}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 gap-2 cursor-pointer"
                    >
                      Start Exercise
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;
