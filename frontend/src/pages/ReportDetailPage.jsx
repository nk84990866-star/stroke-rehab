import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getSessionReport } from '../services/api';
import { CheckCircle, BrainCircuit, Download } from 'lucide-react';
import { BackLink, Button, Card, ErrorState, LoadingState } from '../components/ui';
import {
  formatReportMetric,
  formatReportText,
  formatTargetHitRatio,
  LEGACY_SMOOTHNESS_NOTE,
  SESSION_REPORT_LABELS,
} from '../lib/sessionReport';

const ReportDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [generatedAt] = useState(() => new Date());

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

  const isTherapistReport = location.pathname.startsWith('/therapist/reports/');
  const metrics = report.metrics || {};

  return (
    <div className="bg-surface dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 report-screen-only">
          <BackLink to={isTherapistReport ? '/therapist' : '/reports'}>
            {isTherapistReport ? 'Back to patients' : 'Back to sessions'}
          </BackLink>
          <Button type="button" onClick={() => window.print()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download / Print PDF
          </Button>
        </div>

        <article className="report-print-content space-y-6">
          <Card className="report-card p-6">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">NeuroMotion AI · Session Report</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {formatReportText(report.exercise_name)}
            </h1>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="report-metric">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Session date</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{formatReportText(report.date)}</p>
              </div>
              <div className="report-metric">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{SESSION_REPORT_LABELS.exerciseLevel}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{formatReportText(report.exercise_level)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Level from the current exercise template; historical level played is not provided by this report.</p>
              </div>
              <div className="report-metric">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Duration</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{formatReportText(report.duration)}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Report generated: {generatedAt.toLocaleString()}
            </p>
          </Card>

          <section aria-label="Session metrics" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="report-card report-metric p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{SESSION_REPORT_LABELS.accuracy}</p>
              <p className="mt-1 text-2xl font-extrabold text-primary-700 dark:text-primary-300 tabular-nums">
                {formatReportMetric(metrics.accuracy_score, 1, '%')}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                Average of frame-by-frame tracked hand-to-target scores while a target was active; scores decrease as distance increases. This is an app-specific screen-space measure, not a medical diagnosis or proof of clinical recovery.
              </p>
            </Card>
            <Card className="report-card report-metric p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{SESSION_REPORT_LABELS.movementRange}</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                {formatReportMetric(metrics.max_rom_achieved, 2, '°')}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                Highest app-specific screen-space movement estimate in this session. Degree-scaled values are not calibrated anatomical range of motion.
              </p>
            </Card>
            <Card className="report-card report-metric p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{SESSION_REPORT_LABELS.targetsHit}</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                {formatTargetHitRatio(metrics.targets_hit_ratio)}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                A hit counts when the tracked hand stays within the target's on-screen range for its required hold. The denominator counts presented opportunities, including repeated presentations; it is not necessarily the number of unique configured target positions.
              </p>
            </Card>
            <Card className="report-card report-metric p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{SESSION_REPORT_LABELS.averageVelocity}</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                {formatReportMetric(metrics.avg_velocity, 2)}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                Scaled estimate units/s. This app-specific estimate is derived from screen-space pose data, not a calibrated physical speed.
              </p>
            </Card>
            <Card className="report-card report-metric p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{SESSION_REPORT_LABELS.smoothness}</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                {formatReportMetric(metrics.smoothness_score, 1, ' / 100')}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                App-specific score from a model trajectory generated with screen-space estimates; it is not a direct measurement of the observed hand path. {LEGACY_SMOOTHNESS_NOTE}
              </p>
            </Card>
          </section>

          <Card className="report-card p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary-700 dark:text-primary-300" aria-hidden="true" />
              Rule-based training suggestions
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              The app selects these suggestions from this session's recorded metrics and exercise level. They provide training context only; they are not a diagnosis or clinical decision.
            </p>
            <ul className="space-y-2.5">
              {report.recommendations?.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle className="h-4.5 w-4.5 text-primary-700 dark:text-primary-300 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{rec}</span>
                </li>
              ))}
              {(!report.recommendations || report.recommendations.length === 0) && (
                <li className="text-sm text-slate-500 dark:text-slate-400">No specific warnings. Great effort! Keep executing exercises.</li>
              )}
            </ul>
          </Card>
        </article>
      </div>
    </div>
  );
};

export default ReportDetailPage;
