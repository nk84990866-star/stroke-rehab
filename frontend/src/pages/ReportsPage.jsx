import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../services/api';
import { Calendar, ChevronRight, ChevronLeft, FileText, CheckCircle, ArrowLeft, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Card, EmptyStateLink, LoadingState, SectionHeader } from '../components/ui';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ReportsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar state: which month is displayed + which day is selected
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD' or null = show all

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        console.error('Error loading session logs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, []);

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

  // Sessions actually shown in the list below the calendar
  const shownSessions = selectedDate ? (sessionsByDate[selectedDate] || []) : sessions;

  if (loading) {
    return <LoadingState fullPage message="Loading your reports…" />;
  }

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back navigation */}
        <Link to="/dashboard" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 gap-1.5 cursor-pointer">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Dashboard
        </Link>

        <SectionHeader
          icon={FileText}
          eyebrow="History"
          title="Session Reports"
          description="Track your day-to-day rehabilitation journey — pick a day on the calendar to see that day's sessions."
        />

        {/* ===== Calendar ===== */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-600" aria-hidden="true" />
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={goToPrevMonth} aria-label="Previous month"
                className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button onClick={goToToday}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                Today
              </button>
              <button onClick={goToNextMonth} aria-label="Next month"
                className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1" role="row">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="text-center text-[11px] font-bold text-slate-400 uppercase py-1">{w}</div>
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
                      hasSessions ? 'bg-primary-50 border border-primary-200 text-primary-900 hover:bg-primary-100 cursor-pointer' :
                      'text-slate-300 bg-slate-50',
                    isToday && !isSelected ? 'ring-2 ring-primary-300' : '',
                  )}
                >
                  {day}
                  {hasSessions && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                      {daySessions.slice(0, 3).map((_, j) => (
                        <span key={j} className={cn('h-1.5 w-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-primary-500')} />
                      ))}
                      {daySessions.length > 1 && (
                        <span className={cn('text-[10px] font-bold', isSelected ? 'text-white' : 'text-primary-600')}>
                          ×{daySessions.length}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 mt-3">
            Days highlighted in blue have completed sessions — click one to see that day's reports.
          </p>
        </Card>

        {/* ===== Session list (filtered when a day is selected) ===== */}
        {selectedDate && (
          <div className="flex items-center justify-between gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
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
          <EmptyStateLink
            icon={Calendar}
            title="No sessions on this day"
            description='Pick another highlighted day, or press "Show all".'
          />
        ) : (
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {shownSessions.map((session) => (
              <Link
                key={session.id}
                to={`/reports/${session.id}`}
                className="p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="p-3 bg-primary-50 text-primary-600 rounded-xl border border-primary-100 shrink-0">
                    <CheckCircle className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{session.exercise_name}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-sm text-slate-500">
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
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Score</span>
                    <span className="font-extrabold text-primary-600 text-lg tabular-nums">{session.overall_score}%</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300" aria-hidden="true" />
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
