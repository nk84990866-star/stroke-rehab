import React, { useState, useEffect } from 'react';
import { getAssignedPatients, updatePatientSeverity } from '../services/api';
import { User, Activity, Flame, ShieldAlert, Award } from 'lucide-react';

const TherapistDashboardPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = async () => {
    try {
      const data = await getAssignedPatients();
      setPatients(data);
    } catch (err) {
      console.error('Error loading patient list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleSeverityChange = async (patientId, newLevel) => {
    try {
      await updatePatientSeverity(patientId, newLevel);
      loadPatients(); // refresh data
    } catch (err) {
      console.error('Error adjusting severity:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const strokeTypeLabels = {
    ischemic: 'Ischemic Stroke',
    hemorrhagic: 'Hemorrhagic Stroke',
    tia: 'TIA (Mini Stroke)',
    brainstem: 'Brainstem Stroke',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Clinician Portal</h1>
          <p className="text-gray-600 mt-1">Review assigned patient profiles, recovery metrics, and adjust training program levels.</p>
        </div>

        {patients.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No patients assigned</h3>
            <p className="text-gray-500 mt-1">Connect patient profiles using your clinician license identifier.</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 divide-y divide-gray-200">
            {patients.map((patient) => (
              <div key={patient.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-xl">{patient.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                    <span>Pathology: <span className="text-blue-600">{strokeTypeLabels[patient.stroke_type] || patient.stroke_type}</span></span>
                    <span>•</span>
                    <span>Affected Side: <span className="text-blue-600">{patient.affected_side}</span></span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Flame className="h-4.5 w-4.5 fill-current text-amber-500" /> {patient.streak_count || 0} Streak</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 self-stretch md:self-auto justify-between border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity Level</label>
                    <select
                      value={patient.severity_level}
                      onChange={(e) => handleSeverityChange(patient.id, Number(e.target.value))}
                      className="py-1.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
                    >
                      <option value={1}>1 - Severe Paralysis</option>
                      <option value={2}>2 - Moderate-Severe</option>
                      <option value={3}>3 - Moderate</option>
                      <option value={4}>4 - Mild</option>
                      <option value={5}>5 - Recovery Phase</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapistDashboardPage;
