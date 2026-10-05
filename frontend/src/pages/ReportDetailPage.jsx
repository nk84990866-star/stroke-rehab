import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionReport } from '../services/api';
import { CheckCircle, BrainCircuit, Crosshair, Gauge, Waves } from 'lucide-react';
import { BackLink, Badge, Card, ErrorState, LoadingState, StatCard } from '../components/ui';

const ReportDetailPage = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setReport(null);
    try {
      const data = await getSessionReport(id);
      setReport(data);
    } catch (err) {
      console.error('Error loading report:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading) {
    return <LoadingState fullPage message="Loading report…" />;
  }

  if (loadError) {
    return (
      <div className="bg-surface dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ErrorState
            title="We couldn't load this report"
            message="Check your connection and try again."
            onRetry={loadReport}
          />
        </div>
      </div>
    );
  }

  if (!report) return null;

  // Format metric numbers to a fixed number of decimals (older sessions were
  // stored with full float precision, e.g. 178.1310772640824).
  const fmt = (v, decimals = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(decimals) : "0";
  };

  return (
    <div className="bg-surface dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back Link */}
        <BackLink to="/reports">
          Back to Sessions
        </BackLink>

        {/* Header Block */}
        <Card className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 truncate">{report.exercise_name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Badge variant="primary">Level {report.exercise_level}</Badge>
              <span>{report.date}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Average Reaching Accuracy</span>
            <span className="text-4xl font-black text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 tabular-nums">{report.metrics?.accuracy_score}%</span>
            <p className="max-w-xs mt-1 text-xs text-slate-500 dark:text-slate-400">
              Average of frame-by-frame tracked hand-to-target scores while a target was active; scores decrease as distance increases.
            </p>
          </div>
        </Card>

        {/* Main Metrics Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            icon={Waves}
            label="Movement Range Estimate"
            value={`${fmt(report.metrics?.max_rom_achieved)}°`}
            footer="Highest app-specific screen-space movement estimate in this session, displayed on a degree-like scale; not calibrated anatomical range of motion."
          />
          <StatCard
            icon={Gauge}
            color="purple"
            label="Movement Smoothness"
            value={`${fmt(report.metrics?.smoothness_score, 1)}/100`}
            footer="App-specific score from a model trajectory generated with screen-space estimates; it is not a direct measurement of the observed hand path."
          />
          <StatCard
            icon={Crosshair}
            color="success"
            label="Targets Hit"
            value={report.metrics?.targets_hit_ratio}
            footer={
              <span className="block space-y-1">
                <span className="block">
                  Targets successfully hit / presented target opportunities. A hit counts when the tracked hand stays within the target's on-screen range for its required hold.
                </span>
                {report.metrics?.accuracy_score != null && (
                  <span className="block">
                    Accuracy: {fmt(report.metrics.accuracy_score, 1)}% average of frame scores while a target was active; scores decrease as tracked hand-to-target distance increases.
                  </span>
                )}
              </span>
            }
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Movement range is an app-specific estimate derived from 2D webcam pose coordinates. Its degree-scaled value is not a calibrated anatomical measurement.
        </p>

        {/* Rule-based recommendations panel */}
        <Card className="bg-primary-50/60 border-primary-100 dark:border-primary-900 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200" aria-hidden="true" /> Rule-based training suggestions
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            The app selects these suggestions from this session's recorded metrics and exercise level. Each suggestion describes the metric or condition behind it; the measured values are shown above. These are for training context only, not a diagnosis or clinical decision.
          </p>
          <ul className="space-y-2.5">
            {report.recommendations?.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                <CheckCircle className="h-4.5 w-4.5 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{rec}</span>
              </li>
            ))}
            {(!report.recommendations || report.recommendations.length === 0) && (
              <li className="text-sm text-slate-500 dark:text-slate-400">No specific warnings. Great effort! Keep executing exercises.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ReportDetailPage;
