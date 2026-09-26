import React, { useState, useEffect, useMemo } from 'react';
import { Award, Dumbbell, Lock, Star, Target, Trophy, Flame } from 'lucide-react';
import { getStats, getSessions, getAchievements } from '../services/api';
import {
  Badge,
  Card,
  EmptyStateLink,
  ErrorState,
  LoadingState,
  ProgressBar,
  SectionHeader,
  StatCard,
} from '../components/ui';
import { BADGE_META, BADGE_PROGRESS } from '../config/labels';
import { cn } from '../lib/cn';

/** Achievement groups (only badges whose data is real & reliable). */
const CATEGORIES = [
  {
    id: 'sessions',
    title: 'Session Milestones',
    icon: Dumbbell,
    keys: ['first_session', 'sessions_10', 'sessions_25'],
  },
  {
    id: 'consistency',
    title: 'Consistency',
    icon: Flame,
    keys: ['streak_3', 'streak_7'],
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: Target,
    keys: ['perfect_score', 'rom_milestone_90', 'rom_milestone_135'],
  },
  {
    id: 'variety',
    title: 'Exercise Variety',
    icon: Star,
    keys: ['variety_5', 'level_2_unlocked', 'level_3_unlocked'],
  },
];

/** Requirement wording for locked cards. */
const REQUIREMENTS = {
  first_session: 'Complete 1 exercise session',
  sessions_10: 'Complete 10 exercise sessions',
  sessions_25: 'Complete 25 exercise sessions',
  streak_3: 'Reach a 3-day exercise streak',
  streak_7: 'Reach a 7-day exercise streak',
  perfect_score: 'Score 95% or higher in a session',
  rom_milestone_90: 'Reach a maximum ROM of 90 degrees',
  rom_milestone_135: 'Reach a maximum ROM of 135 degrees',
  level_2_unlocked: 'Complete a Level 2 (Moderate) exercise',
  level_3_unlocked: 'Complete a Level 3 (High) exercise',
  variety_5: 'Complete sessions with 5 different exercises',
};

/** Maps a BADGE_PROGRESS `current` key to its real value from loaded data. */
const resolveCurrent = (source, data) => {
  switch (source) {
    case 'sessions_count':
      return data.sessions.length;
    case 'streak':
      return Number(data.stats?.streak) || 0;
    case 'best_score':
      return Number(data.stats?.best_score) || 0;
    case 'distinct_exercises':
      return data.distinctExercises;
    default:
      return null;
  }
};

const AchievementsPage = () => {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [achievementRows, setAchievementRows] = useState(null); // [{badge_name, earned_at}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recentBadge, setRecentBadge] = useState(null);

  const loadAchievements = async () => {
    setLoading(true);
    setError(false);
    try {
      const [statsRes, sessionsRes, achRes] = await Promise.allSettled([
        getStats(),
        getSessions(),
        getAchievements(),
      ]);
      if (statsRes.status !== 'fulfilled') {
        throw new Error('Achievement data unavailable');
      }
      setStats(statsRes.value);
      setSessions(sessionsRes.status === 'fulfilled' ? sessionsRes.value : []);
      setAchievementRows(achRes.status === 'fulfilled' ? achRes.value : null);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  /* ---- Earned keys: prefer the persisted badge list (stats.badges) ---- */
  const earnedKeys = useMemo(
    () => new Set(Array.isArray(stats?.badges) ? stats.badges : []),
    [stats],
  );

  /* ---- Earned dates from real Achievement rows ---- */
  const earnedDates = useMemo(() => {
    const map = {};
    for (const row of achievementRows || []) {
      if (row?.badge_name && row?.earned_at) {
        map[row.badge_name] = row.earned_at;
      }
    }
    return map;
  }, [achievementRows]);

  /* ---- Real values for progress toward locked badges ---- */
  const progressData = useMemo(() => {
    if (!sessions) return { sessions: [], distinctExercises: 0 };
    return {
      sessions,
      distinctExercises: new Set(sessions.map((s) => s.exercise_id)).size,
    };
  }, [sessions]);

  /* ---- Real personal best (from stored session scores) ---- */
  const personalBest = stats?.best_session || null;

  /* ---- Celebration: only right after a session save flagged it ---- */
  useEffect(() => {
    const fresh = sessionStorage.getItem('nm_new_badges');
    if (fresh && earnedKeys.size > 0) {
      try {
        const keys = JSON.parse(fresh);
        const newest = keys.find((k) => earnedKeys.has(k));
        if (newest) setRecentBadge(newest);
      } catch {
        /* ignore malformed flag */
      }
      sessionStorage.removeItem('nm_new_badges');
    }
  }, [earnedKeys]);

  if (loading) {
    return <LoadingState fullPage message="Loading achievements…" />;
  }

  if (error) {
    return (
      <div className="bg-surface dark:bg-slate-950 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ErrorState
            title="We couldn't load your achievements"
            message="Check your connection and try again. If the problem continues, the service may be temporarily unavailable."
            onRetry={loadAchievements}
          />
        </div>
      </div>
    );
  }

  const earnedCount = earnedKeys.size;
  const totalBadges = Object.keys(BADGE_META).length;

  /* ---- Fully empty account ---- */
  if (stats && stats.total_sessions === 0) {
    return (
      <div className="bg-surface dark:bg-slate-950 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <SectionHeader
            icon={Trophy}
            eyebrow="Milestones"
            title="Achievements"
            description="Milestones you've earned from your rehabilitation activity."
          />
          <EmptyStateLink
            icon={Trophy}
            to="/exercises"
            title="No achievements yet"
            description="Complete your first exercise session to start earning milestones."
          >
            View Exercises
          </EmptyStateLink>
        </div>
      </div>
    );
  }

  /* ---- Celebration banner (shown once, only for a real persisted badge) ---- */
  const celebration = recentBadge ? (
    <div
      role="status"
      className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3.5"
    >
      <span className="inline-flex items-center justify-center p-2.5 rounded-xl bg-amber-100 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
        <Award className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-extrabold text-amber-900">Achievement unlocked!</p>
        <p className="text-sm text-amber-800">
          {BADGE_META[recentBadge]?.name || recentBadge}
          {REQUIREMENTS[recentBadge] ? ` — ${REQUIREMENTS[recentBadge].replace(/^Complete/, 'you completed')}` : ''}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="bg-surface dark:bg-slate-950 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <SectionHeader
          icon={Trophy}
          eyebrow="Milestones"
          title="Achievements"
          description="Milestones you've earned from your rehabilitation activity."
        />

        {celebration}

        {/* Summary + personal best */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            icon={Award}
            color="warning"
            label="Badges earned"
            value={`${earnedCount} / ${totalBadges}`}
            footer="Across all milestone categories"
          />
          <Card className="p-5 flex flex-col justify-center">
            <ProgressBar
              label="Collection progress"
              value={totalBadges ? (earnedCount / totalBadges) * 100 : 0}
              valueText={`${earnedCount} of ${totalBadges} badges`}
              variant="warning"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Trophy points: <strong className="text-slate-600 dark:text-slate-300 tabular-nums">{stats?.points || 0} XP</strong>
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Personal Best</h2>
            {personalBest ? (
              <>
                <p className="text-2xl font-extrabold text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 tabular-nums">
                  {Math.round(personalBest.overall_score)}%
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold truncate">
                  {personalBest.exercise_name || 'Exercise session'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {personalBest.started_at
                    ? new Date(personalBest.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No sessions recorded yet.</p>
            )}
          </Card>
        </div>

        {/* Categorized badge grid */}
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <section key={category.id} className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 border border-primary-100 dark:border-primary-900">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                {category.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {category.keys.map((key) => {
                  const meta = BADGE_META[key];
                  if (!meta) return null;
                  const isEarned = earnedKeys.has(key);
                  const BadgeIcon = meta.icon;
                  const earnedDate = earnedDates[key];

                  // Real progress toward locked badges, when a reliable value exists
                  const prog = BADGE_PROGRESS[key];
                  let progressInfo = null;
                  if (!isEarned && prog) {
                    const current = resolveCurrent(prog.current, { sessions: progressData.sessions, distinctExercises: progressData.distinctExercises, stats });
                    if (current != null) {
                      progressInfo = { current: Math.min(current, prog.target), target: prog.target };
                    }
                  }

                  return (
                    <Card
                      key={key}
                      hoverable={isEarned}
                      className={cn('p-5', !isEarned && 'border-dashed')}
                    >
                      <div className="flex items-start gap-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center p-3 rounded-xl border shrink-0',
                            isEarned
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                          )}
                        >
                          {isEarned ? <BadgeIcon className="h-6 w-6" aria-hidden="true" /> : <Lock className="h-6 w-6" aria-hidden="true" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 dark:text-slate-50 text-sm">{meta.name}</h3>
                            {isEarned ? (
                              <Badge variant="success">Earned</Badge>
                            ) : (
                              <Badge variant="default">Locked</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {isEarned ? meta.description : REQUIREMENTS[key] || meta.description}
                          </p>
                          {isEarned && earnedDate && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                              Earned {new Date(earnedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          )}
                          {!isEarned && progressInfo && (
                            <div className="mt-2.5">
                              <ProgressBar
                                size="sm"
                                variant="primary"
                                value={(progressInfo.current / progressInfo.target) * 100}
                                valueText={`${progressInfo.current} of ${progressInfo.target}`}
                                label={`${progressInfo.current} / ${progressInfo.target}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Achievements are calculated from your saved exercise sessions only. They reflect activity
          milestones, not a medical assessment.
        </p>
      </div>
    </div>
  );
};

export default AchievementsPage;
