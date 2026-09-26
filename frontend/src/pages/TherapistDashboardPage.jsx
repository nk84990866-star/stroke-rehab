import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import {
  Activity,
  Award,
  ChevronDown,
  ChevronRight,
  Flame,
  Gauge,
  RefreshCw,
  Search,
  Stethoscope,
  User,
  Waves,
} from 'lucide-react';
import { getAssignedPatients, getPatientSessions, updatePatientSeverity } from '../services/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatCard,
} from '../components/ui';
import { STROKE_TYPE_LABELS, AFFECTED_SIDE_LABELS, SEVERITY_LABELS } from '../config/labels';

const mean = (values) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

/** Real per-patient aggregates computed from that patient's saved sessions. */
const summarizeSessions = (sessions) => {
  const scores = sessions.map((s) => Number(s.overall_score)).filter(Number.isFinite);
  const durations = sessions.map((s) => Number(s.duration_seconds) || 0);
  const smoothness = sessions
    .map((s) => Number(s.movement_smoothness_score))
    .filter((v) => Number.isFinite(v) && v > 0);
  const rom = sessions.map((s) => Number(s.max_rom_achieved)).filter((v) => Number.isFinite(v) && v > 0);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    total: sessions.length,
    avgScore: mean(scores),
    bestScore: scores.length ? Math.max(...scores) : null,
    totalSeconds: durations.reduce((s, v) => s + v, 0),
    avgSmoothness: mean(smoothness),
    maxRom: rom.length ? Math.max(...rom) : null,
    weekly: sessions.filter((s) => s.started_at && new Date(s.started_at).getTime() >= weekAgo).length,
    lastSession: sessions.length ? sessions[0] : null, // backend returns newest first
  };
};

/** Chronological score sparkline (no axes; values are summarized as text). */
const ScoreSparkline = ({ sessions }) => {
  const data = useMemo(
    () =>
      [...sessions]
        .reverse() // backend sends newest first; charts read left→right in time order
        .map((s) => ({ score: Number(s.overall_score) || 0 })),
    [sessions],
  );
  if (data.length < 2) return null;
  return (
    <div className="h-16 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 2, left: 4 }}>
          <YAxis domain={[0, 100]} hide />
          <Line type="monotone" dataKey="score" stroke="var(--color-primary-500)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const fmtDuration = (totalSeconds) => {
  if (!totalSeconds) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

/** Expanded per-patient panel: lazy-loads that patient's real sessions. */
const PatientDetails = ({ patientId }) => {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getPatientSessions(patientId);
        if (!cancelled) setSessions(data);
      } catch (err) {
        console.error('Error loading patient sessions:', err);
        if (!cancelled) setError(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (error) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        This patient's sessions could not be loaded. Try collapsing and expanding again.
      </p>
    );
  }
  if (!sessions) {
    return (
      <div className="py-6">
        <LoadingState message="Loading patient activity…" />
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        No completed sessions recorded yet for this patient.
      </p>
    );
  }

  const s = summarizeSessions(sessions);
  const recent = sessions.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sessions</p>
          <p className="text-lg font-extrabold text-slate-900 tabular-nums">{s.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg score</p>
          <p className="text-lg font-extrabold text-slate-900 tabular-nums">
            {s.avgScore != null ? `${Math.round(s.avgScore * 10) / 10}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Max ROM</p>
          <p className="text-lg font-extrabold text-slate-900 tabular-nums">
            {s.maxRom != null ? `${Math.round(s.maxRom * 100) / 100}°` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total time</p>
          <p className="text-lg font-extrabold text-slate-900 tabular-nums">{fmtDuration(s.totalSeconds)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Score trend ({s.total} sessions)
          </p>
          <ScoreSparkline sessions={sessions} />
        </div>
        <div className="space-y-1 text-sm">
          <p className="text-slate-600">
            <Gauge className="inline h-4 w-4 mr-1 -mt-0.5 text-purple-600" aria-hidden="true" />
            Avg smoothness:{' '}
            <strong className="text-slate-900 tabular-nums">
              {s.avgSmoothness != null ? `${Math.round(s.avgSmoothness * 10) / 10}/100` : '—'}
            </strong>
          </p>
          <p className="text-slate-600">
            <Activity className="inline h-4 w-4 mr-1 -mt-0.5 text-primary-600" aria-hidden="true" />
            Last 7 days:{' '}
            <strong className="text-slate-900 tabular-nums">
              {s.weekly} session{s.weekly !== 1 ? 's' : ''}
            </strong>
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Recent sessions</p>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          {recent.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {session.exercise_name || 'Exercise session'}
                </p>
                <p className="text-xs text-slate-500">
                  {session.started_at
                    ? new Date(session.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
                      ' · ' +
                      new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                  {session.duration_seconds ? ` · ${fmtDuration(session.duration_seconds)}` : ''}
                </p>
              </div>
              <Badge variant={(session.overall_score || 0) >= 70 ? 'success' : 'default'}>
                {session.overall_score ?? 0}%
              </Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Showing the 3 most recent of {s.total} saved session{s.total !== 1 ? 's' : ''}.
        </p>
      </div>
    </div>
  );
};

const TherapistDashboardPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [savingSeverityId, setSavingSeverityId] = useState(null);

  const loadPatients = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getAssignedPatients();
      setPatients(data);
    } catch (err) {
      console.error('Error loading patient list:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleSeverityChange = async (patientId, newLevel) => {
    setSavingSeverityId(patientId);
    try {
      await updatePatientSeverity(patientId, newLevel);
      await loadPatients();
    } catch (err) {
      console.error('Error adjusting severity:', err);
    } finally {
      setSavingSeverityId(null);
    }
  };

  const visiblePatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q),
    );
  }, [patients, search]);

  const cohortSummary = useMemo(() => {
    const streaks = patients.map((p) => Number(p.streak_count) || 0);
    return {
      activeStreaks: streaks.filter((v) => v > 0).length,
      bestStreak: streaks.length ? Math.max(...streaks) : 0,
      totalBadges: patients.reduce((sum, p) => sum + (Array.isArray(p.badges) ? p.badges.length : 0), 0),
    };
  }, [patients]);

  if (loading) {
    return <LoadingState fullPage message="Loading your patients…" />;
  }

  if (error) {
    return (
      <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <ErrorState
            title="We couldn't load your patient list"
            message="Check your connection and try again. If the problem continues, the service may be temporarily unavailable."
            onRetry={loadPatients}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <SectionHeader
          icon={Stethoscope}
          eyebrow="Clinician"
          title="Clinician Portal"
          description="Review assigned patient activity, session summaries, and adjust training program levels."
          actions={
            <Button variant="outline" onClick={loadPatients}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
            </Button>
          }
        />

        {patients.length === 0 ? (
          <EmptyState
            icon={User}
            title="No patients assigned"
            description="Connect patient profiles using your clinician license identifier."
          />
        ) : (
          <>
            {/* Cohort summary — real values from assigned patients */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
              <StatCard icon={User} label="Assigned patients" value={patients.length} />
              <StatCard
                icon={Flame}
                color="warning"
                label="Active streaks"
                value={cohortSummary.activeStreaks}
                footer={`Longest current streak: ${cohortSummary.bestStreak} day${cohortSummary.bestStreak === 1 ? '' : 's'}`}
              />
              <StatCard
                icon={Award}
                color="purple"
                label="Badges earned (cohort)"
                value={cohortSummary.totalBadges}
                footer="Across all assigned patients"
              />
              <StatCard
                icon={Activity}
                color="primary"
                label="Severity range"
                value={
                  patients.length
                    ? `${Math.min(...patients.map((p) => p.severity_level ?? 3))}–${Math.max(...patients.map((p) => p.severity_level ?? 3))}`
                    : '—'
                }
                footer="Across assigned patients (1 = severe, 5 = recovery)"
              />
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <label htmlFor="patient-search" className="sr-only">
                Search patients by name or email
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="patient-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients…"
                className="block w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {visiblePatients.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No patients match your search"
                description="Try a different name or email."
              />
            ) : (
              <div className="space-y-4">
                {visiblePatients.map((patient) => {
                  const isExpanded = expandedId === patient.id;
                  return (
                    <Card key={patient.id} className="overflow-hidden">
                      {/* Summary row (button controls expansion) */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : patient.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`patient-panel-${patient.id}`}
                        className="w-full text-left p-5 sm:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                      >
                        <div className="flex items-start gap-4 min-w-0">
                          <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary-50 text-primary-700 font-bold text-base uppercase border border-primary-100 shrink-0">
                            {(patient.full_name || '?').trim().charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-slate-900 text-lg truncate">{patient.full_name}</h3>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm text-slate-500">
                              <span>{STROKE_TYPE_LABELS[patient.stroke_type] || patient.stroke_type}</span>
                              <span aria-hidden="true">•</span>
                              <span>{AFFECTED_SIDE_LABELS[patient.affected_side] || patient.affected_side}</span>
                              <span aria-hidden="true">•</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                                <Flame className="h-4 w-4 fill-current" aria-hidden="true" /> {patient.streak_count || 0} day streak
                              </span>
                              {Array.isArray(patient.badges) && patient.badges.length > 0 && (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span className="inline-flex items-center gap-1 font-semibold text-purple-600">
                                    <Award className="h-4 w-4" aria-hidden="true" /> {patient.badges.length} badge{patient.badges.length !== 1 ? 's' : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-stretch lg:self-auto justify-between border-t lg:border-t-0 pt-4 lg:pt-0">
                          <span
                            className="inline-flex items-center gap-1 text-sm font-bold text-primary-600"
                            aria-hidden="true"
                          >
                            {isExpanded ? 'Hide details' : 'View details'}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                      </button>

                      {/* Expanded panel */}
                      {isExpanded && (
                        <div
                          id={`patient-panel-${patient.id}`}
                          className="px-5 sm:px-6 pb-6 space-y-5 border-t border-slate-100 pt-5"
                        >
                          <PatientDetails patientId={patient.id} />

                          {/* Severity control (existing endpoint, unchanged) */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                            <label
                              htmlFor={`severity-${patient.id}`}
                              className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                            >
                              Severity level
                            </label>
                            <select
                              id={`severity-${patient.id}`}
                              value={patient.severity_level}
                              disabled={savingSeverityId === patient.id}
                              onChange={(e) => handleSeverityChange(patient.id, Number(e.target.value))}
                              className="py-2 px-3 border border-slate-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-semibold cursor-pointer disabled:opacity-60"
                            >
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  {lvl} - {SEVERITY_LABELS[lvl]}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-slate-500">
                              Changing severity adjusts this patient's prescribed program and daily plan.
                            </p>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-slate-500 flex items-start gap-1.5">
              <Waves className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              Session summaries reflect saved exercise activity only and are not a clinical assessment.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default TherapistDashboardPage;
