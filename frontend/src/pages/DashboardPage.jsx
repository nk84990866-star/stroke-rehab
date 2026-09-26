import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStats, getRecommendedProgram } from '../services/api';
import { Award, BarChart2, CalendarDays, Clock, Flame, Play, Star } from 'lucide-react';
import { Button, Card, EmptyState, LoadingState, StatCard, SectionHeader, ExerciseCard } from '../components/ui';
import { STROKE_TYPE_LABELS, AFFECTED_SIDE_LABELS } from '../config/labels';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const statsData = await getStats();
        setStats(statsData);
        const progData = await getRecommendedProgram();
        setProgram(progData);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState fullPage message="Loading your dashboard…" />;
  }

  const firstName = (user.full_name || '').split(' ')[0];

  return (
    <div className="bg-surface min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome */}
        <Card className="p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-1">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Welcome back, {firstName}!
              </h1>
              <p className="text-slate-500 mt-1.5">
                Therapy Profile: <span className="font-semibold text-slate-700">{STROKE_TYPE_LABELS[user.stroke_type] || user.stroke_type}</span>
                {' · '}
                Affected Side: <span className="font-semibold text-slate-700">{AFFECTED_SIDE_LABELS[user.affected_side] || user.affected_side}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Button asChild>
                <Link to="/exercises">
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" /> Start Exercise
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/progress">
                  <BarChart2 className="h-4 w-4" aria-hidden="true" /> View Analytics
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            icon={Flame}
            color="warning"
            label="Exercise Streak"
            value={stats?.streak || 0}
            sub={stats?.streak === 1 ? 'day' : 'days'}
            footer="Exercised on consecutive days"
          />
          <StatCard
            icon={Clock}
            color="primary"
            label="Total Completed"
            value={stats?.total_sessions || 0}
            sub={stats?.total_sessions === 1 ? 'session' : 'sessions'}
            footer="All-time completed sessions"
          />
          <StatCard
            icon={Star}
            color="purple"
            label="Average Score"
            value={stats?.avg_score || 0}
            sub="%"
            footer="Mean accuracy across sessions"
          />
          <StatCard
            icon={Award}
            color="success"
            label="Trophy Points"
            value={stats?.points || 0}
            sub="XP"
            footer="Earned across all exercises"
          />
        </div>

        {/* Prescribed program */}
        <section className="space-y-4">
          <SectionHeader
            icon={CalendarDays}
            eyebrow="Today's plan"
            title="Prescribed Exercises"
            description={program?.program_description}
          />
          {program?.exercises?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {program.exercises.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} cta="Start Exercise" />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No program available"
              description="We couldn't load your prescribed exercises right now. Check your profile severity level or try again later."
              action={
                <Button asChild>
                  <Link to="/exercises">Browse all exercises</Link>
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
