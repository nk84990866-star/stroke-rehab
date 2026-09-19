import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../services/api';
import { Calendar, ChevronRight, FileText, CheckCircle } from 'lucide-react';

const ReportsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Session Reports</h1>
          <p className="text-gray-600 mt-1">Review performance tracking metrics, ROM, and AI analysis for each finished session.</p>
        </div>

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
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 divide-y divide-gray-200">
            {sessions.map((session) => (
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
