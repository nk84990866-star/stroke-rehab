import React, { useState, useEffect } from 'react';
import { getAssignedPatients, updatePatientSeverity } from '../services/api';
import { User, Flame, Stethoscope } from 'lucide-react';
import { Card, EmptyState, LoadingState, SectionHeader, StatCard } from '../components/ui';
import { STROKE_TYPE_LABELS, AFFECTED_SIDE_LABELS, SEVERITY_LABELS } from '../config/labels';

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
    return <LoadingState fullPage message="Loading your patients…" />;
  }

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <SectionHeader
          icon={Stethoscope}
          eyebrow="Clinician"
          title="Clinician Portal"
          description="Review assigned patient profiles, recovery metrics, and adjust training program levels."
        />

        {patients.length === 0 ? (
          <EmptyState
            icon={User}
            title="No patients assigned"
            description="Connect patient profiles using your clinician license identifier."
          />
        ) : (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <StatCard icon={User} label="Assigned patients" value={patients.length} />
              <StatCard
                icon={Flame}
                color="warning"
                label="Best current streak"
                value={Math.max(...patients.map((p) => p.streak_count || 0))}
                sub="days"
              />
              <StatCard
                icon={Stethoscope}
                color="purple"
                label="Severity range"
                value={`${Math.min(...patients.map((p) => p.severity_level ?? 3))}–${Math.max(...patients.map((p) => p.severity_level ?? 3))}`}
                footer="Across assigned patients (1 = severe, 5 = recovery)"
              />
            </div>

            {/* Patient list */}
            <Card className="divide-y divide-slate-100 overflow-hidden">
              {patients.map((patient) => (
                <div key={patient.id} className="p-5 sm:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
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
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-stretch lg:self-auto justify-between border-t lg:border-t-0 pt-4 lg:pt-0">
                    <label
                      htmlFor={`severity-${patient.id}`}
                      className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Severity Level
                    </label>
                    <select
                      id={`severity-${patient.id}`}
                      value={patient.severity_level}
                      onChange={(e) => handleSeverityChange(patient.id, Number(e.target.value))}
                      className="py-2 px-3 border border-slate-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-semibold cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl} - {SEVERITY_LABELS[lvl]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default TherapistDashboardPage;
