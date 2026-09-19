import React, { useState, useEffect } from 'react';
import { getProgress } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2, Activity } from 'lucide-react';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Recovery Progress</h1>
          <p className="text-gray-600 mt-1">Visualize historical trends of joint range of motion (ROM) and training accuracy scores.</p>
        </div>

        {data.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <BarChart2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No session details recorded</h3>
            <p className="text-gray-500 mt-1">Your rehabilitation tracking analytics will render here over time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {/* Score & Smoothness Over Time */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" /> Score & Smoothness Over Time
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#2563eb" name="Accuracy Score (%)" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="smoothness" stroke="#8b5cf6" name="Smoothness Index" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Range of Motion Over Time */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-purple-600" /> Range of Motion (Max Extension)
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 180]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="rom" stroke="#10b981" name="Max ROM achieved (degrees)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
