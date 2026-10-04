import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../services/api';
import { Calendar, ChevronRight, ChevronLeft, Download, FileText, CheckCircle, RotateCcw, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { BackLink, Button, Card, EmptyState, EmptyStateLink, ErrorState, LoadingState, SectionHeader } from '../components/ui';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ReportsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Calendar state: which month is displayed + which day is selected
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD' or null = show all
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Error loading session logs:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Group sessions by local calendar day
  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      const key = dateKey(new Date(s.started_at));
      (map[key] = map[key] || []).push(s);
    }
    return map;
  }, [sessions]);

  // Calendar grid geometry for the viewed month
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  const goToPrevMonth = () => {
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    setViewYear(y); setViewMonth(m);
  };
  const goToNextMonth = () => {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    setViewYear(y); setViewMonth(m);
  };
  const goToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear()); setViewMonth(t.getMonth());
  };

  const exerciseNames = useMemo(
    () => [...new Set(sessions.map((session) => session.exercise_name).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [sessions],
  );
  const exerciseLevels = useMemo(
    () => [...new Set(sessions.map((session) => session.exercise_level).filter((level) => level != null))]
      .sort((a, b) => Number(a) - Number(b)),
    [sessions],
  );

  // Apply filters to the loaded session list without changing the source data.
  const shownSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const sessionDate = dateKey(new Date(session.started_at));
        return (
          (!selectedDate || sessionDate === selectedDate) &&
          (!startDate || sessionDate >= startDate) &&
          (!endDate || sessionDate <= endDate) &&
          (!selectedExercise || session.exercise_name === selectedExercise) &&
          (!selectedLevel || String(session.exercise_level) === selectedLevel)
        );
      }),
    [sessions, selectedDate, startDate, endDate, selectedExercise, selectedLevel],
  );
  const hasActiveFilters = Boolean(selectedDate || startDate || endDate || selectedExercise || selectedLevel);

  const resetFilters = () => {
    setSelectedDate(null);
    setStartDate('');
    setEndDate('');
    setSelectedExercise('');
    setSelectedLevel('');
  };

  const exportSessions = () => {
    if (shownSessions.length === 0) return;

    const escapeCsvCell = (value) => {
      const text = String(value ?? '');
      const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Exercise', 'Level', 'Date', 'Time', 'Duration (seconds)', 'Session score (%)'],
      ...shownSessions.map((session) => {
        const startedAt = new Date(session.started_at);
        return [
          session.exercise_name,
          session.exercise_level,
          startedAt.toLocaleDateString(),
          startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          session.duration_seconds,
          session.overall_score,
        ];
      }),
    ];
    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'session-reports.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  if (loading) {
    return <LoadingState fullPage message="Loading your reports…" />;
  }

  if (loadError) {
    return (
      <div className="bg-surface dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ErrorState
            title="We couldn't load your reports"
            message="Check your connection and try again."
            onRetry={loadSessions}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back navigation */}
        <BackLink to="/dashboard">
          Back to Dashboard
        </BackLink>

        <SectionHeader
          icon={FileText}
          eyebrow="History"
          title="Session Reports"
          description="Track your day-to-day rehabilitation journey — pick a day on the calendar to see that day's sessions."
        />

        {/* ===== Calendar ===== */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200" aria-hidden="true" />
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={goToPrevMonth} aria-label="Previous month"
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button onClick={goToToday}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                Today
              </button>
              <button onClick={goToNextMonth} aria-label="Next month"
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1" role="row">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase py-1">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Leading blanks before the 1st */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const daySessions = sessionsByDate[key] || [];
              const hasSessions = daySessions.length > 0;
              const isSelected = selectedDate === key;
              const isToday = key === todayKey;
              const bestScore = hasSessions ? Math.max(...daySessions.map((s) => s.overall_score || 0)) : 0;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  disabled={!hasSessions && !isSelected}
                  title={hasSessions ? `${daySessions.length} session(s) — best score ${bestScore}%` : 'No sessions'}
                  aria-label={`${MONTH_NAMES[viewMonth]} ${day}${hasSessions ? ` — ${daySessions.length} session(s)` : ''}`}
                  aria-pressed={isSelected}
                  className={cn(
                    'relative h-14 rounded-lg text-sm font-semibold transition-colors',
                    isSelected ? 'bg-primary-600 text-white shadow-sm' :
                      hasSessions ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-primary-900 hover:bg-primary-100 cursor-pointer' :
                      'text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/60',
                    isToday && !isSelected ? 'ring-2 ring-primary-300' : '',
                  )}
                >
                  {day}
                  {hasSessions && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                      {daySessions.slice(0, 3).map((_, j) => (
                        <span key={j} className={cn('h-1.5 w-1.5 rounded-full', isSelected ? 'bg-white dark:bg-slate-900' : 'bg-primary-50 dark:bg-primary-950/400')} />
                      ))}
                      {daySessions.length > 1 && (
                        <span className={cn('text-[10px] font-bold', isSelected ? 'text-white' : 'text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200')}>
                          ×{daySessions.length}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            Days highlighted in blue have completed sessions — click one to see that day's reports.
          </p>
        </Card>

        {sessions.length > 0 && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">Filter sessions</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Filters apply to the sessions already loaded.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters} disabled={!hasActiveFilters}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset filters
                </Button>
                <Button variant="secondary" size="sm" onClick={exportSessions} disabled={shownSessions.length === 0} aria-label="Export visible session reports as CSV">
                  <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="min-w-0">
                <label htmlFor="report-start-date" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">From date</label>
                <input
                  id="report-start-date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full min-w-0 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="report-end-date" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">To date</label>
                <input
                  id="report-end-date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full min-w-0 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="report-exercise" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Exercise</label>
                <select
                  id="report-exercise"
                  value={selectedExercise}
                  onChange={(event) => setSelectedExercise(event.target.value)}
                  className="w-full min-w-0 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All exercises</option>
                  {exerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="report-level" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Exercise level</label>
                <select
                  id="report-level"
                  value={selectedLevel}
                  onChange={(event) => setSelectedLevel(event.target.value)}
                  className="w-full min-w-0 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All levels</option>
                  {exerciseLevels.map((level) => <option key={level} value={level}>Level {level}</option>)}
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <p role="status" aria-live="polite" className="text-xs font-medium text-primary-700 dark:text-primary-300">
                Filters active · showing {shownSessions.length} of {sessions.length} sessions.
              </p>
            )}
          </Card>
        )}

        {/* ===== Session list (filtered when a day is selected) ===== */}
        {selectedDate && (
          <div className="flex items-center justify-between gap-3 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-primary-900">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' — '}{shownSessions.length} session{shownSessions.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setSelectedDate(null)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-900 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" /> Show all
            </button>
          </div>
        )}

        {sessions.length === 0 ? (
          <EmptyStateLink
            icon={FileText}
            to="/exercises"
            title="No sessions recorded yet"
            description="Completed exercise sessions will list here with detailed reports."
          >
            Start Exercises
          </EmptyStateLink>
        ) : shownSessions.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={hasActiveFilters ? 'No sessions match these filters' : 'No sessions on this day'}
            description={hasActiveFilters
              ? 'Try adjusting your filters or reset them to see all sessions.'
              : 'Pick another highlighted day, or press "Show all".'}
            action={hasActiveFilters && (
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset filters
              </Button>
            )}
          />
        ) : (
          <Card className="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            <p className="px-5 sm:px-6 py-3 text-xs text-slate-500 dark:text-slate-400">
              Duration is the time counted by the exercise timer while the session was running. Session score combines average reaching accuracy (40%), target-hit ratio (30%), and movement smoothness (30%).
            </p>
            {shownSessions.map((session) => (
              <Link
                key={session.id}
                to={`/reports/${session.id}`}
                className="p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 rounded-xl border border-primary-100 dark:border-primary-900 shrink-0">
                    <CheckCircle className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 truncate">{session.exercise_name}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      <span>{new Date(session.started_at).toLocaleDateString()}</span>
                      <span aria-hidden="true">•</span>
                      <span>{new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span aria-hidden="true">•</span>
                      <span>Duration: {session.duration_seconds}s</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Session Score</span>
                    <span className="font-extrabold text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 text-lg tabular-nums">{session.overall_score}%</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
