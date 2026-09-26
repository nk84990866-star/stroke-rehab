import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  BarChart2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Gauge,
  Star,
  Timer,
  Waves,
} from 'lucide-react';
import { getStats, getProgress, getSessions } from '../services/api';
import { Badge, Card, EmptyStateLink, ErrorState, LoadingState, SectionHeader, StatCard } from '../components/ui';
import { cn } from '../lib/cn';

const RANGES = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: 'All Time', value: null },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Local YYYY-MM-DD key for a Date (same convention as ReportsPage). */
const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtDuration = (totalSeconds) => {
  if (!totalSeconds) return '0s';
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

const mean = (values) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

/** Short month/day label for chart ticks. */
const tickDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const ProgressPage = () => {
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(null);   // chronological {date, score, rom, smoothness}
  const [sessions, setSessions] = useState(null);   // full session rows
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rangeDays, setRangeDays] = useState(30);

  const loadProgress = async () => {
    setLoading(true);
    setError(false);
    try {
      const [statsRes, progressRes, sessionsRes] = await Promise.allSettled([
        getStats(),
        getProgress(),
        getSessions(),
      ]);
      if (statsRes.status !== 'fulfilled') {
        throw new Error('Progress data unavailable');
      }
      setStats(statsRes.value);
      // Degrade gracefully: if a secondary endpoint fails, show what loaded.
      setProgress(progressRes.status === 'fulfilled' ? progressRes.value : []);
      setSessions(sessionsRes.status === 'fulfilled' ? sessionsRes.value : []);
    } catch (err) {
      console.error('Error loading progress:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  /* ---------- Range filtering on real data (no extra API calls) ---------- */
  const cutoff = useMemo(() => {
    if (rangeDays == null) return null;
    const now = Date.now();
    return now - rangeDays * 24 * 60 * 60 * 1000;
  }, [rangeDays]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (cutoff == null) return sessions;
    return sessions.filter((s) => s.started_at && new Date(s.started_at).getTime() >= cutoff);
  }, [sessions, cutoff]);

  const filteredProgressData = useMemo(() => {
    if (!progress) return [];
    if (cutoff == null) return progress;
    const cutoffDateStr = dateKey(new Date(cutoff));
    return progress.filter((p) => p.date && p.date >= cutoffDateStr);
  }, [progress, cutoff]);

  /* ---------- Real summary values (range-scoped) ---------- */
  const summary = useMemo(() => {
    const scores = filteredSessions.map((s) => Number(s.overall_score)).filter(Number.isFinite);
    const durations = filteredSessions.map((s) => Number(s.duration_seconds) || 0);
    const smoothnessValues = filteredSessions
      .map((s) => Number(s.movement_smoothness_score))
      .filter((v) => Number.isFinite(v) && v > 0); // 0.0 = not recorded (older sessions)
    const romValues = filteredSessions
      .map((s) => Number(s.max_rom_achieved))
      .filter((v) => Number.isFinite(v) && v > 0);

    return {
      totalSessions: filteredSessions.length,
      totalSeconds: durations.reduce((s, v) => s + v, 0),
      avgScore: mean(scores),
      bestScore: scores.length ? Math.max(...scores) : null,
      avgSmoothness: mean(smoothnessValues),
      smoothnessRecorded: smoothnessValues.length,
      maxRom: romValues.length ? Math.max(...romValues) : null,
      avgRom: mean(romValues),
      romRecorded: romValues.length,
    };
  }, [filteredSessions]);

  /* ---------- Current calendar week (Mon–Sun) from real session dates ---------- */
  const weekCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
    if (!sessions) return counts;
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    const weekKeys = new Set(
      Array.from({ length: 7 }, (_, i) => dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))),
    );
    for (const s of sessions) {
      if (!s.started_at) continue;
      const key = dateKey(new Date(s.started_at));
      if (weekKeys.has(key)) {
        const idx = (new Date(`${key}T00:00:00`).getDay() + 6) % 7;
        counts[idx] += 1;
      }
    }
    return counts;
  }, [sessions]);

  if (loading) {
    return <LoadingState fullPage message="Loading your progress…" />;
  }

  if (error) {
    return (
      <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ErrorState
            title="We couldn't load your progress"
            message="Check your connection and try again. If the problem continues, the service may be temporarily unavailable."
            onRetry={loadProgress}
          />
        </div>
      </div>
    );
  }

  /* ---------- Fully empty account ---------- */
  if (stats && stats.total_sessions === 0) {
    return (
      <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <SectionHeader
            icon={BarChart2}
            eyebrow="Analytics"
            title="Your Progress"
            description="A summary of your completed rehabilitation sessions over time."
          />
          <EmptyStateLink
            icon={BarChart2}
            to="/exercises"
            title="No completed sessions yet"
            description="Complete your first exercise session to start seeing your progress."
          >
            View Exercises
          </EmptyStateLink>
        </div>
      </div>
    );
  }

  const rangeLabel = RANGES.find((r) => r.value === rangeDays)?.label || 'Selected period';
  const activeSessions = filteredSessions.length;
  const trendSummary =
    filteredProgressData.length > 0
      ? `Score trend across ${filteredProgressData.length} recorded sessions, from ${filteredProgressData[0].date} to ${filteredProgressData[filteredProgressData.length - 1].date}.`
      : 'No sessions recorded in this period.';

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        <SectionHeader
          icon={BarChart2}
          eyebrow="Analytics"
          title="Your Progress"
          description="A summary of your completed rehabilitation sessions over time."
          actions={
            <div
              className="inline-flex p-1 bg-slate-100 rounded-xl gap-1"
              role="group"
              aria-label="Time range filter"
            >
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  aria-pressed={rangeDays === r.value}
                  onClick={() => setRangeDays(r.value)}
                  className={cn(
                    'px-3 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer',
                    rangeDays === r.value
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
        />

        {/* ============ SUMMARY CARDS (range-scoped, real values) ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            icon={Clock}
            color="primary"
            label="Total Sessions"
            value={summary.totalSessions}
            sub={summary.totalSessions === 1 ? 'session' : 'sessions'}
            footer={`${rangeLabel} · completed sessions only`}
          />
          <StatCard
            icon={Star}
            color="purple"
            label="Average Score"
            value={summary.avgScore != null ? `${Math.round(summary.avgScore * 10) / 10}%` : '—'}
            footer={summary.bestScore != null ? `Best in range: ${summary.bestScore}%` : 'No scores in range yet'}
          />
          <StatCard
            icon={Flame}
            color="warning"
            label="Current Streak"
            value={stats?.streak ?? 0}
            sub={(stats?.streak ?? 0) === 1 ? 'day' : 'days'}
            footer="Consecutive days with at least one session"
          />
          <StatCard
            icon={Timer}
            color="success"
            label="Total Exercise Time"
            value={fmtDuration(summary.totalSeconds)}
            footer={`${rangeLabel} · sum of session durations`}
          />
        </div>

        {/* ============ SCORE TREND ============ */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-600" aria-hidden="true" /> Score Trend
            </h2>
            <p className="text-sm text-slate-500" aria-live="polite">
              {activeSessions} session{activeSessions !== 1 ? 's' : ''} in range
            </p>
          </div>
          {filteredProgressData.length > 0 ? (
            <figure className="m-0">
              <div className="h-72 w-full" role="img" aria-label={`Line chart of session scores over time. ${trendSummary}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredProgressData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickFormatter={tickDate} tick={{ fontSize: 12, fill: '#64748b' }} minTickGap={24} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} width={36} />
                    <Tooltip labelFormatter={(l) => `Date: ${tickDate(l)}`} formatter={(v) => [`${v}%`, 'Score']} />
                    <Line type="monotone" dataKey="score" stroke="var(--color-primary-500)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="sr-only">{trendSummary}</figcaption>
            </figure>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">
              No completed sessions in this period. Try a longer time range.
            </p>
          )}
        </Card>

        {/* ============ ROM & SMOOTHNESS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Range of motion — real values from saved sessions */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Waves className="h-5 w-5 text-emerald-600" aria-hidden="true" /> Range of Motion
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Max ROM in range</p>
                <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                  {summary.maxRom != null ? `${Math.round(summary.maxRom * 100) / 100}°` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg ROM in range</p>
                <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                  {summary.avgRom != null ? `${Math.round(summary.avgRom * 100) / 100}°` : '—'}
                </p>
              </div>
            </div>
            {filteredProgressData.some((p) => Number(p.rom) > 0) ? (
              <figure className="m-0">
                <div className="h-56 w-full" role="img" aria-label="Line chart of maximum range of motion reached per session.">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredProgressData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tickFormatter={tickDate} tick={{ fontSize: 12, fill: '#64748b' }} minTickGap={24} />
                      <YAxis domain={[0, 180]} tick={{ fontSize: 12, fill: '#64748b' }} width={36} />
                      <Tooltip labelFormatter={(l) => `Date: ${tickDate(l)}`} formatter={(v) => [`${v}°`, 'Max ROM']} />
                      <Line type="monotone" dataKey="rom" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Max ROM" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <figcaption className="sr-only">
                  Maximum range of motion per session in degrees, from saved session data.
                </figcaption>
              </figure>
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">
                No ROM values recorded in this period yet.
              </p>
            )}
            {summary.romRecorded > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Averaged over {summary.romRecorded} session{summary.romRecorded !== 1 ? 's' : ''} with a recorded ROM value.
              </p>
            )}
          </Card>

          {/* Smoothness — existing backend values only */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Gauge className="h-5 w-5 text-purple-600" aria-hidden="true" /> Movement Smoothness
            </h2>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average in range</p>
              <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                {summary.avgSmoothness != null ? `${Math.round(summary.avgSmoothness * 10) / 10} / 100` : '—'}
              </p>
            </div>
            {filteredProgressData.some((p) => Number(p.smoothness) > 0) ? (
              <figure className="m-0">
                <div className="h-56 w-full" role="img" aria-label="Line chart of movement smoothness score per session.">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredProgressData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tickFormatter={tickDate} tick={{ fontSize: 12, fill: '#64748b' }} minTickGap={24} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} width={36} />
                      <Tooltip labelFormatter={(l) => `Date: ${tickDate(l)}`} formatter={(v) => [`${v}`, 'Smoothness']} />
                      <Line type="monotone" dataKey="smoothness" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Smoothness" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <figcaption className="sr-only">
                  Movement smoothness score per session, as calculated by the backend kinematics engine.
                </figcaption>
              </figure>
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">
                No smoothness values recorded in this period yet.
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              {summary.smoothnessRecorded > 0
                ? `Averaged over ${summary.smoothnessRecorded} session${summary.smoothnessRecorded !== 1 ? 's' : ''} with a recorded value. Sessions saved before a scoring update may show 0.`
                : 'Smoothness is calculated when a session is saved.'}
            </p>
          </Card>
        </div>

        {/* ============ WEEKLY ACTIVITY (current week, real sessions only) ============ */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Dumbbell className="h-5 w-5 text-primary-600" aria-hidden="true" /> This Week's Activity
          </h2>
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {WEEKDAYS.map((day, i) => {
              const count = weekCounts[i];
              return (
                <div
                  key={day}
                  className={cn(
                    'rounded-xl border p-2 sm:p-3 text-center',
                    count > 0
                      ? 'border-primary-200 bg-primary-50'
                      : 'border-slate-200 bg-slate-50',
                  )}
                  aria-label={`${day}: ${count} session${count !== 1 ? 's' : ''}`}
                >
                  <p className="text-xs font-bold text-slate-500 uppercase">{day}</p>
                  <p className={cn('text-lg font-extrabold tabular-nums mt-1', count > 0 ? 'text-primary-700' : 'text-slate-300')}>
                    {count}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {count > 0 ? (count === 1 ? 'session' : 'sessions') : '—'}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Counts are saved exercise sessions only — planned but not-yet-completed exercises are not included.
          </p>
        </Card>

        {/* ============ RECENT SESSIONS ============ */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5 sm:p-6 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Sessions in Range</h2>
            <Link to="/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 cursor-pointer">
              All Reports <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {filteredSessions.length > 0 ? (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {filteredSessions.slice(0, 10).map((session) => (
                <Link
                  key={session.id}
                  to={`/reports/${session.id}`}
                  className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="p-2.5 rounded-lg bg-primary-50 text-primary-600 border border-primary-100 shrink-0">
                      <Activity className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{session.exercise_name || 'Exercise session'}</p>
                      <p className="text-xs text-slate-500">
                        {session.started_at
                          ? `${new Date(session.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                        {session.duration_seconds ? ` · ${fmtDuration(session.duration_seconds)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={(session.overall_score || 0) >= 70 ? 'success' : 'default'}>
                      {session.overall_score ?? 0}%
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 p-6">
              No completed sessions in this period. Try a longer time range above.
            </p>
          )}
        </Card>

        <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <BarChart2 className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          This page summarizes your recorded exercise activity (sessions, scores, timing). It is an activity
          statistic, not a medical assessment — discuss your rehabilitation progress with your clinician.
        </p>
      </div>
    </div>
  );
};

export default ProgressPage;
