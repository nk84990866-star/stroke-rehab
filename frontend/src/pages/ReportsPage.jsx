import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../services/api';
import { Calendar, ChevronRight, ChevronLeft, FileText, CheckCircle, ArrowLeft, X } from 'lucide-react';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back navigation */}
        <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Session Reports</h1>
          <p className="text-gray-600 mt-1">Track your day-to-day rehabilitation journey — pick a day on the calendar to see that day's sessions.</p>
        </div>

        {/* ===== Calendar ===== */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={goToPrevMonth} aria-label="Previous month"
                className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToToday}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
                Today
              </button>
              <button onClick={goToNextMonth} aria-label="Next month"
                className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="text-center text-xs font-semibold text-gray-400 uppercase py-1">{w}</div>
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
                  className={`relative h-14 rounded-lg text-sm font-medium transition-colors
                    ${isSelected ? 'bg-blue-600 text-white shadow' :
                      hasSessions ? 'bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100 cursor-pointer' :
                      'text-gray-300 bg-gray-50'}
                    ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}`}
                >
                  {day}
                  {hasSessions && (
                    <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5`}>
                      {daySessions.slice(0, 3).map((_, j) => (
                        <span key={j} className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                      ))}
                      {daySessions.length > 1 && (
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                          ×{daySessions.length}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Days highlighted in blue have completed sessions — click one to see that day's reports.
          </p>
        </div>

        {/* ===== Session list (filtered when a day is selected) ===== */}
        {selectedDate && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-blue-900">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' — '}{shownSessions.length} session{shownSessions.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setSelectedDate(null)}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 cursor-pointer"
            >
              <X className="h-4 w-4" /> Show all
            </button>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No sessions recorded yet</h3>
            <p className="text-gray-500 mt-1">Completed exercise sessions will list here with detailed reports.</p>
            <Link
              to="/exercises"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Start Exercises
            </Link>
          </div>
        ) : shownSessions.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No sessions on this day</h3>
            <p className="text-gray-500 mt-1">Pick another highlighted day, or press "Show all".</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 divide-y divide-gray-200">
            {shownSessions.map((session) => (
              <Link
                key={session.id}
                to={`/reports/${session.id}`}
                className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{session.exercise_name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(session.started_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>Duration: {session.duration_seconds}s</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-500 block">Score</span>
                    <span className="font-extrabold text-blue-600 text-lg">{session.overall_score}%</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
