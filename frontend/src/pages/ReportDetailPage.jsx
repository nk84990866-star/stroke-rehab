import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSessionReport } from '../services/api';
import { ArrowLeft, CheckCircle, BrainCircuit, Crosshair, Gauge, Waves } from 'lucide-react';
import { Badge, Card, LoadingState, StatCard } from '../components/ui';

const ReportDetailPage = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const data = await getSessionReport(id);
        setReport(data);
      } catch (err) {
        console.error('Error loading report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [id]);

  if (loading) {
    return <LoadingState fullPage message="Loading report…" />;
  }

  if (!report) return null;

  // Format metric numbers to a fixed number of decimals (older sessions were
  // stored with full float precision, e.g. 178.1310772640824).
  const fmt = (v, decimals = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(decimals) : "0";
  };

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back Link */}
        <Link to="/reports" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 gap-1.5 cursor-pointer">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Sessions
        </Link>

        {/* Header Block */}
        <Card className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900 truncate">{report.exercise_name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-500">
              <Badge variant="primary">Level {report.exercise_level}</Badge>
              <span>{report.date}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Session Score</span>
            <span className="text-4xl font-black text-primary-600 tabular-nums">{report.metrics?.accuracy_score}%</span>
          </div>
        </Card>

        {/* Main Metrics Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            icon={Waves}
            label="Max ROM Achieved"
            value={`${fmt(report.metrics?.max_rom_achieved)}°`}
            footer="Maximum extension reached during reaching sequences"
          />
          <StatCard
            icon={Gauge}
            color="purple"
            label="Movement Smoothness"
            value={`${fmt(report.metrics?.smoothness_score, 1)}/100`}
            footer="Clinical jerk index (higher is smoother)"
          />
          <StatCard
            icon={Crosshair}
            color="success"
            label="Reaching Accuracy"
            value={report.metrics?.targets_hit_ratio}
            footer={
              report.metrics?.accuracy_score != null
                ? `Precision score: ${fmt(report.metrics.accuracy_score, 1)}% · Targets reached / presented`
                : 'Targets successfully reached / overall targets presented'
            }
          />
        </div>

        {/* AI Recommendations Panel */}
        <Card className="bg-primary-50/60 border-primary-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary-600" aria-hidden="true" /> Clinic AI Rehabilitation Recommendations
          </h2>
          <ul className="space-y-2.5">
            {report.recommendations?.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle className="h-4.5 w-4.5 text-primary-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{rec}</span>
              </li>
            ))}
            {(!report.recommendations || report.recommendations.length === 0) && (
              <li className="text-sm text-slate-500">No specific warnings. Great effort! Keep executing exercises.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ReportDetailPage;
