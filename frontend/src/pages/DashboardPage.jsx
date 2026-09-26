import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import {
  Award,
  BarChart2,
  CalendarDays,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  History,
  Lock,
  Play,
  Star,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStats, getDailyPlan, getSessions, getProgress } from '../services/api';
import {
  Button,
  Card,
  Badge,
  ProgressBar,
  EmptyState,
  EmptyStateLink,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatCard,
  ExerciseCard,
} from '../components/ui';
import ProgressRing from '../components/dashboard/ProgressRing';
import { BADGE_META } from '../config/labels';
import { cn } from '../lib/cn';


/* ---------- Small dashboard-specific pieces ---------- */

/** Achievement chip; locked variant shows a lock instead of the icon. */
const BadgeChip = ({ badgeKey, earned }) => {
  const meta = BADGE_META[badgeKey];
  const Icon = meta?.icon || Award;
  const name = meta?.name || badgeKey;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border',
        earned
          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      )}
      title={earned ? 'Unlocked' : 'Locked'}
    >
      {earned ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
      {name}
    </span>
  );
};

/** Compact sparkline of recent scores (no axes; values announced as text beside it). */
const ScoreSparkline = ({ data }) => (
  <div className="h-20 w-full" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 4, bottom: 2, left: 4 }}>
        <YAxis domain={[0, 100]} hide />
        <Line type="monotone" dataKey="score" stroke="var(--color-primary-500)" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

/** One recent-activity row. */
const ActivityRow = ({ session }) => (
  <Link
    to={`/reports/${session.id}`}
    className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
  >
    <div className="flex items-center gap-3 min-w-0">
      <span className="inline-flex items-center justify-center p-2.5 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 border border-primary-100 dark:border-primary-900 shrink-0">
        <Dumbbell className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">{session.exercise_name || 'Exercise session'}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {session.started_at
            ? new Date(session.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
              ' · ' +
              new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <Badge variant={(session.overall_score || 0) >= 70 ? 'success' : 'default'}>
        {session.overall_score ?? 0}%
      </Badge>
      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" aria-hidden="true" />
    </div>
  </Link>
);

/** One quick-action tile. */
const QuickAction = ({ to, icon: Icon, label }) => (
  <Link
    to={to}
    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-card hover:shadow-card-hover hover:border-primary-200 dark:hover:border-primary-800 hover:-translate-y-0.5 transition-all text-slate-700 dark:text-slate-200 hover:text-primary-700 cursor-pointer"
  >
    <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 border border-primary-100 dark:border-primary-900">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span className="text-sm font-semibold text-center">{label}</span>
  </Link>
);

/* ---------- Page ---------- */

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [plan, setPlan] = useState(null);            // today's deterministic daily plan
  const [sessions, setSessions] = useState(null);   // null = not loaded / failed
  const [progress, setProgress] = useState(null);   // null = not loaded / failed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError(false);
    try {
      // Core data (existing endpoints)
      const [statsData, planData, sessionsData, progressData] = await Promise.allSettled([
        getStats(),
        getDailyPlan(),
        getSessions(),
        getProgress(),
      ]);

      if (statsData.status !== 'fulfilled') {
        throw new Error('Dashboard data unavailable');
      }
      setStats(statsData.value);
      // Plan failure degrades to the empty state, not a whole-page error
      setPlan(planData.status === 'fulfilled' ? planData.value : null);
      setSessions(sessionsData.status === 'fulfilled' ? sessionsData.value : null);
      setProgress(progressData.status === 'fulfilled' ? progressData.value : null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* ----- Derived values (existing data only — nothing invented) ----- */

  // Today's plan (backend-derived; completion comes from saved sessions)
  const planExercises = useMemo(() => plan?.exercises || [], [plan]);
  const totalCount = plan?.total_exercises ?? 0;
  const doneCount = plan?.completed_exercises ?? 0;
  const remainingCount = plan?.remaining_exercises ?? 0;
  const completionPct = plan ? plan.completion_percentage : null;

  const nextExercise = planExercises.find((ex) => !ex.completed) || planExercises[0] || null;
  const continueHref = nextExercise ? `/exercise/${nextExercise.id}` : '/exercises';

  const firstName = (user?.full_name || '').trim().split(' ')[0];

  const recentSessions = useMemo(() => (sessions || []).slice(0, 3), [sessions]);
  const weeklyCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (sessions || []).filter(
      (s) => s.started_at && new Date(s.started_at).getTime() >= weekAgo,
    ).length;
  }, [sessions]);

  const progressSeries = progress || [];
  const lastScores = progressSeries.slice(-7).map((p) => ({ date: p.date, score: p.score }));
  const recentAvgScore = lastScores.length
    ? Math.round(lastScores.reduce((sum, p) => sum + (p.score || 0), 0) / lastScores.length)
    : null;

  const earnedBadges = Array.isArray(user?.badges) ? user.badges : [];
  const lockedBadgeKeys = Object.keys(BADGE_META).filter((k) => !earnedBadges.includes(k));
  const badgePreview = [
    ...earnedBadges.slice(0, 3).map((k) => ({ key: k, earned: true })),
    ...lockedBadgeKeys.slice(0, Math.max(0, 3 - earnedBadges.slice(0, 3).length)).map((k) => ({ key: k, earned: false })),
  ].slice(0, 3);

  /* ----- States ----- */

  if (loading) {
    return <LoadingState fullPage message="Loading your dashboard…" />;
  }

  if (error) {
    return (
      <div className="bg-surface dark:bg-slate-950 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ErrorState
            title="We couldn't load your dashboard"
            message="Check your connection and try again. If the problem continues, the service may be temporarily unavailable."
            onRetry={loadDashboard}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-slate-950 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ============ 1. WELCOME HEADER ============ */}
        <Card className="p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-1">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                {firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl text-pretty">
                Every steady rep builds new pathways — here's your rehabilitation at a glance.
              </p>
            </div>
            <div className="shrink-0">
              <Button asChild size="lg">
                <Link to={continueHref} aria-label="Continue today's rehabilitation session">
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  Continue Today's Session
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* ============ 2. TODAY'S REHABILITATION PLAN ============ */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing
              value={completionPct}
              label={
                completionPct != null
                  ? `${doneCount} of ${totalCount} planned exercises completed today`
                  : 'No rehabilitation plan is available for today'
              }
            />
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Today's Rehabilitation Plan</h2>
              {plan && totalCount > 0 ? (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <strong className="text-slate-900 dark:text-slate-50 tabular-nums">{doneCount}</strong> of{' '}
                    <strong className="text-slate-900 dark:text-slate-50 tabular-nums">{totalCount}</strong> completed
                    {remainingCount > 0 && <> · <strong className="text-slate-900 dark:text-slate-50 tabular-nums">{remainingCount}</strong> remaining</>}
                  </p>
                  <ProgressBar
                    className="mt-3 max-w-md"
                    value={completionPct}
                    valueText={`${doneCount} of ${totalCount} completed`}
                    variant={completionPct === 100 ? 'success' : 'primary'}
                    label={null}
                  />
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                    {completionPct === 100 ? (
                      <Badge variant="success">
                        <Award className="h-3 w-3" aria-hidden="true" /> All done for today — great work!
                      </Badge>
                    ) : doneCount > 0 ? (
                      <Badge variant="warning">In progress — {remainingCount} remaining</Badge>
                    ) : (
                      <Badge variant="primary">Not started — your plan is ready</Badge>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  No rehabilitation plan is available for today. You can still browse the full exercise library and
                  train any exercise.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ============ 3. QUICK STATISTICS ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            icon={Clock}
            color="primary"
            label="Total Sessions"
            value={stats?.total_sessions ?? 0}
            sub={stats?.total_sessions === 1 ? 'session' : 'sessions'}
            footer="All-time completed sessions"
          />
          <StatCard
            icon={Flame}
            color="warning"
            label="Current Streak"
            value={stats?.streak ?? 0}
            sub={(stats?.streak ?? 0) === 1 ? 'day' : 'days'}
            footer="Consecutive days of exercise"
          />
          <StatCard
            icon={Star}
            color="purple"
            label="Average Score"
            value={stats?.avg_score ?? 0}
            sub="%"
            footer="Mean accuracy across sessions"
          />
          <StatCard
            icon={Zap}
            color="success"
            label="Trophy Points"
            value={stats?.points ?? 0}
            sub="XP"
            footer="Earned across all exercises"
          />
        </div>

        {/* ============ 4. TODAY'S PLAN EXERCISES ============ */}
        <section className="space-y-4">
          <SectionHeader
            icon={CalendarDays}
            eyebrow="Today's plan"
            title={plan?.program_name || 'Planned Exercises'}
            description={plan?.program_description}
          />
          {planExercises.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {planExercises.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  cta={ex.completed ? 'Practice Again' : 'Start Exercise'}
                  statusBadge={
                    ex.completed ? (
                      <Badge variant="success">
                        <Award className="h-3 w-3" aria-hidden="true" /> Done
                      </Badge>
                    ) : undefined
                  }
                  meta={
                    ex.hold_time_seconds != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Hold up to {ex.hold_time_seconds}s
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyStateLink
              icon={CalendarDays}
              to="/exercises"
              title="No rehabilitation plan is available for today."
              description="This can happen when your profile is missing exercise details — browse the library to train any exercise."
            >
              Browse Exercises
            </EmptyStateLink>
          )}
        </section>

        {/* ============ 5 + 6. PROGRESS PREVIEW & ACHIEVEMENT PREVIEW ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress preview */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary-600" aria-hidden="true" /> Your Progress
              </h2>
              <Link
                to="/progress"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
              >
                View Full Progress <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {progressSeries.length > 0 ? (
              <>
                <ScoreSparkline data={lastScores} />
                <p className="sr-only">
                  Score trend over your last {lastScores.length} sessions, from{' '}
                  {lastScores[0]?.score ?? 0}% to {lastScores[lastScores.length - 1]?.score ?? 0}%.
                </p>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Weekly sessions</p>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">{weeklyCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent avg score</p>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                      {recentAvgScore != null ? `${recentAvgScore}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sessions tracked</p>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">{progressSeries.length}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Complete your first session to start building your progress trend.
              </p>
            )}
          </Card>

          {/* Achievements preview */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" /> Achievements
              </h2>
              <Link
                to="/achievements"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
              >
                View All <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {badgePreview.map(({ key, earned }) => (
                <BadgeChip key={key} badgeKey={key} earned={earned} />
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              {earnedBadges.length > 0
                ? `${earnedBadges.length} badge${earnedBadges.length !== 1 ? 's' : ''} unlocked so far.`
                : 'No badges unlocked yet — complete a session to earn your first!'}
            </p>
          </Card>
        </div>

        {/* ============ 7 + 8. RECENT ACTIVITY & QUICK ACTIONS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent activity */}
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 sm:p-6 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <History className="h-5 w-5 text-primary-600" aria-hidden="true" /> Recent Activity
              </h2>
              <Link
                to="/reports"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
              >
                View Reports <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {recentSessions.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
                {recentSessions.map((session) => (
                  <ActivityRow key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="p-5 sm:p-6 pt-0">
                <EmptyState
                  icon={History}
                  title="No sessions yet"
                  description="Your completed exercises will appear here. Start your first session to begin your recovery journey."
                  className="border-0 shadow-none"
                />
              </div>
            )}
          </Card>

          {/* Quick actions */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction to={continueHref} icon={Play} label="Start Exercise" />
              <QuickAction to="/exercises" icon={Dumbbell} label="View Exercises" />
              <QuickAction to="/progress" icon={BarChart2} label="View Progress" />
              <QuickAction to="/reports" icon={History} label="View Reports" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
