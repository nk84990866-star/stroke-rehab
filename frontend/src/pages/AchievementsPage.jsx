import React, { useState, useEffect } from 'react';
import { getStats } from '../services/api';
import { Award, ShieldAlert, Star, Flame, Lock } from 'lucide-react';

const BADGE_DESCRIPTIONS = {
  first_session: {
    name: 'First Reaches',
    description: 'Complete your first exercise session.',
    icon: Award,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  streak_3: {
    name: 'Consistent Start',
    description: 'Maintain a 3-day exercise streak.',
    icon: Flame,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  streak_7: {
    name: 'Weekly Warrior',
    description: 'Maintain a 7-day exercise streak.',
    icon: Flame,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  perfect_score: {
    name: 'Precision Master',
    description: 'Score 95%+ overall in a single exercise session.',
    icon: Star,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  },
  rom_milestone_90: {
    name: '90-Degree Reach',
    description: 'Achieve a maximum joint range of motion of 90 degrees or more.',
    icon: Award,
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  rom_milestone_135: {
    name: '135-Degree Extension',
    description: 'Achieve a maximum joint range of motion of 135 degrees or more.',
    icon: Award,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  level_2_unlocked: {
    name: 'Moderate Explorer',
    description: 'Complete a session in Level 2 (Moderate) exercises.',
    icon: ShieldAlert,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  level_3_unlocked: {
    name: 'High Velocity Athlete',
    description: 'Complete a session in Level 3 (High/Fast) exercises.',
    icon: ShieldAlert,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
};

const AchievementsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getStats();
        setStats(data);
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userBadges = stats?.badges || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Rehabilitation Milestones</h1>
          <p className="text-gray-600 mt-1">Unlock badges, score higher accuracy rates, and build streaks to support neuroplasticity.</p>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(BADGE_DESCRIPTIONS).map(([key, info]) => {
            const isEarned = userBadges.includes(key);
            const Icon = info.icon;
            
            return (
              <div
                key={key}
                className={`p-6 bg-white rounded-lg shadow-sm border flex items-center gap-4 transition-all ${
                  isEarned ? 'border-gray-200 opacity-100' : 'border-dashed border-gray-300 opacity-60'
                }`}
              >
                <div className={`p-4 rounded-lg border ${isEarned ? info.color : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                  {isEarned ? <Icon className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                    {info.name}
                    {isEarned && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        Earned
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">{info.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage;
