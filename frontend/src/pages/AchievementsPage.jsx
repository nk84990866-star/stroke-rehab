import React, { useState, useEffect } from 'react';
import { getStats } from '../services/api';
import { Award, ShieldAlert, Star, Flame, Lock, Trophy } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Card, LoadingState, ProgressBar, SectionHeader, StatCard } from '../components/ui';

const BADGE_DESCRIPTIONS = {
  first_session: {
    name: 'First Reaches',
    description: 'Complete your first exercise session.',
    icon: Award,
    color: 'text-primary-600 bg-primary-50 border-primary-200',
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
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
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
    return <LoadingState fullPage message="Loading achievements…" />;
  }

  const userBadges = stats?.badges || [];
  const earnedCount = Object.keys(BADGE_DESCRIPTIONS).filter((k) => userBadges.includes(k)).length;
  const totalBadges = Object.keys(BADGE_DESCRIPTIONS).length;

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <SectionHeader
          icon={Trophy}
          eyebrow="Motivation"
          title="Rehabilitation Milestones"
          description="Unlock badges, score higher accuracy rates, and build streaks to support neuroplasticity."
        />

        {/* Progress snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <StatCard
            icon={Award}
            color="warning"
            label="Badges earned"
            value={`${earnedCount} / ${totalBadges}`}
            footer="Keep completing sessions to unlock more"
          />
          <Card className="p-5 flex flex-col justify-center">
            <ProgressBar
              label="Collection progress"
              value={(earnedCount / totalBadges) * 100}
              valueText={`${earnedCount} of ${totalBadges} badges`}
              variant="warning"
            />
            <p className="text-xs text-slate-400 mt-3">Trophy points: <strong className="text-slate-600 tabular-nums">{stats?.points || 0} XP</strong></p>
          </Card>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {Object.entries(BADGE_DESCRIPTIONS).map(([key, info]) => {
            const isEarned = userBadges.includes(key);
            const Icon = info.icon;

            return (
              <Card
                key={key}
                hoverable={isEarned}
                className={cn(
                  'p-5 sm:p-6 flex items-center gap-4',
                  !isEarned && 'border-dashed opacity-75',
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center p-4 rounded-xl border shrink-0',
                    isEarned ? info.color : 'bg-slate-100 text-slate-400 border-slate-200',
                  )}
                >
                  {isEarned ? <Icon className="h-7 w-7" aria-hidden="true" /> : <Lock className="h-7 w-7" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 flex-wrap">
                    {info.name}
                    {isEarned && <Badge variant="success">Earned</Badge>}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">{info.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage;
