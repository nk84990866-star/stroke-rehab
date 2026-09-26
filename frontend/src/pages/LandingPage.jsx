import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ChevronRight, LineChart, Shield, Sparkles } from 'lucide-react';
import { Button, Card } from '../components/ui';

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="bg-surface dark:bg-slate-950 min-h-screen">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-200 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI-Assisted Rehabilitation
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-5 text-balance">
          AI-Powered{' '}
          <span className="text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200">Stroke Rehabilitation</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-300 mb-9 text-pretty">
          Transform stroke recovery with real-time pose estimation, personalized exercise regimens based on clinical research, and detailed joint kinematics.
        </p>
        <div className="flex justify-center gap-3">
          {user ? (
            <Button asChild size="lg">
              <Link to={user.role === 'therapist' ? '/therapist' : '/dashboard'}>
                Go to Dashboard <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/register">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Sign In</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Feature grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card hoverable className="p-6">
            <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 border border-primary-100 dark:border-primary-900 mb-4">
              <Activity className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1.5">Real-Time Pose Tracking</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Track motor trajectories directly in your browser using standard webcam devices without auxiliary gear.
            </p>
          </Card>
          <Card hoverable className="p-6">
            <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 mb-4">
              <Shield className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1.5">Disease-Specific</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Rehabilitation exercises specialized for Ischemic, Hemorrhagic, TIA, and Brainstem stroke pathologies.
            </p>
          </Card>
          <Card hoverable className="p-6">
            <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 mb-4">
              <LineChart className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1.5">Analytical Insights</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Assess recovery quality through joint velocity tracking, range-of-motion metrics, and movement smoothness.
            </p>
          </Card>
          <Card hoverable className="p-6">
            <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 mb-4">
              <Sparkles className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1.5">Gamification System</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Keep motivation levels high with daily execution streaks, earned trophies, and point tracking rewards.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
