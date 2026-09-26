import React, { useState, useEffect } from 'react';
import { getProgress } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2, Activity } from 'lucide-react';
import { Card, EmptyState, LoadingState, SectionHeader } from '../components/ui';

const ProgressPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const pData = await getProgress();
        setData(pData);
      } catch (err) {
        console.error('Error loading progress details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProgress();
  }, []);

  if (loading) {
    return <LoadingState fullPage message="Loading your progress…" />;
  }

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <SectionHeader
          icon={BarChart2}
          eyebrow="Analytics"
          title="Recovery Progress"
          description="Visualize historical trends of joint range of motion (ROM) and training accuracy scores."
        />

        {data.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title="No session details recorded"
            description="Your rehabilitation tracking analytics will render here over time."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Score & Smoothness Over Time */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-600" aria-hidden="true" /> Score &amp; Smoothness Over Time
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#0f83fd" name="Accuracy Score (%)" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="smoothness" stroke="#8b5cf6" name="Smoothness Index" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Range of Motion Over Time */}
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-purple-600" aria-hidden="true" /> Range of Motion (Max Extension)
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis domain={[0, 180]} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="rom" stroke="#10b981" name="Max ROM achieved (degrees)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
