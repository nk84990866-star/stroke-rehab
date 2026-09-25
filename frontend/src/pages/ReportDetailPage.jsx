import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSessionReport } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, CheckCircle, BrainCircuit, Heart, BarChart2, Award } from 'lucide-react';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back Link */}
        <Link to="/reports" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Sessions
        </Link>

        {/* Header Block */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{report.exercise_name}</h1>
            <p className="text-sm text-gray-500 mt-1">Level: <span className="font-semibold">{report.exercise_level}</span> | Date: {report.date}</p>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500 block font-semibold">Session Score</span>
            <span className="text-4xl font-black text-blue-600">{report.metrics?.accuracy_score}%</span>
          </div>
        </div>

        {/* Main Metrics Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Max ROM Achieved</h3>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{fmt(report.metrics?.max_rom_achieved)}°</p>
            <p className="text-xs text-gray-500 mt-1">Maximum extension reached during reaching sequences</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Movement Smoothness</h3>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{fmt(report.metrics?.smoothness_score, 1)}/100</p>
            <p className="text-xs text-gray-500 mt-1">Clinical jerk index calculation (Higher is smoother)</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Reaching Accuracy</h3>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{report.metrics?.targets_hit_ratio}</p>
            {report.metrics?.accuracy_score != null && (
              <p className="text-xs text-gray-500 mt-1">Precision score: {fmt(report.metrics.accuracy_score, 1)}%</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Targets successfully reached / overall targets presented</p>
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-100 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-blue-600" /> Clinic AI Rehabilitation Recommendations
          </h2>
          <ul className="space-y-2">
            {report.recommendations?.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4.5 w-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
            {(!report.recommendations || report.recommendations.length === 0) && (
              <li className="text-sm text-gray-500">No specific warnings. Great effort! Keep executing exercises.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailPage;
