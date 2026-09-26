import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Flame,
  HeartPulse,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserCircle2,
} from 'lucide-react';
import { Card, Badge, SectionHeader, StatCard } from '../components/ui';
import {
  STROKE_TYPE_LABELS,
  AFFECTED_SIDE_LABELS,
  SEVERITY_LABELS,
} from '../config/labels';

/**
 * ProfilePage — display-only profile using the user object already
 * fetched by AuthContext (GET /api/auth/me returns medical fields).
 * No editing and no new backend calls in this step.
 */
const ProfilePage = () => {
  const { user } = useAuth();
  if (!user) return null;

  const isPatient = user.role === 'patient';

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <SectionHeader
          icon={UserCircle2}
          eyebrow="Account"
          title="My Profile"
          description="Your account details and rehabilitation profile."
          actions={
            <Link
              to="/dashboard"
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
            >
              ← Back to Dashboard
            </Link>
          }
        />

        {/* Identity header */}
        <Card className="overflow-hidden">
          <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <span className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-600 text-white text-2xl font-extrabold uppercase shadow-sm shrink-0">
              {(user.full_name || '?').trim().charAt(0)}
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold text-slate-900 truncate">{user.full_name}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {user.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <Badge variant="primary">
                  {isPatient ? <HeartPulse className="h-3 w-3" aria-hidden="true" /> : <Stethoscope className="h-3 w-3" aria-hidden="true" />}
                  {isPatient ? 'Patient' : 'Therapist'}
                </Badge>
                <span className="text-xs text-slate-400">
                  Member since {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {isPatient ? (
          <>
            {/* Gamification snapshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard icon={Flame} color="warning" label="Current streak" value={user.streak_count || 0} sub="days" />
              <StatCard icon={Award} color="purple" label="Trophy points" value={user.points || 0} sub="XP" />
            </div>

            {/* Rehabilitation profile */}
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-primary-600" aria-hidden="true" /> Rehabilitation Profile
                </Card.Title>
              </Card.Header>
              <Card.Content className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stroke classification</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {STROKE_TYPE_LABELS[user.stroke_type] || user.stroke_type || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Affected side</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {AFFECTED_SIDE_LABELS[user.affected_side] || user.affected_side || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Severity level</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    Level {user.severity_level ?? '—'}
                    {user.severity_level ? ` · ${SEVERITY_LABELS[user.severity_level]}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date of stroke</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {user.date_of_stroke
                      ? new Date(user.date_of_stroke).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Exercise difficulty range</p>
                  <p className="text-sm text-slate-600">
                    Your severity level (<strong>Level {user.severity_level ?? '—'}</strong>) maps to the Basic / Moderate / High
                    exercise levels recommended on your dashboard.
                  </p>
                </div>
              </Card.Content>
            </Card>
          </>
        ) : (
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary-600" aria-hidden="true" /> Clinical Details
              </Card.Title>
            </Card.Header>
            <Card.Content className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Specialization</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{user.specialization || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">License number</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{user.license_number || '—'}</p>
              </div>
            </Card.Content>
          </Card>
        )}

        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Profile editing will arrive with a future update — this page is read-only.
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
