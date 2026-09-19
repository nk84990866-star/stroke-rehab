import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Shield, Award, LineChart, ChevronRight } from 'lucide-react';

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
          AI-Powered{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Stroke Rehabilitation
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-10">
          Transform stroke recovery with real-time pose estimation, personalized exercise regimens based on clinical research, and detailed joint kinematics.
        </p>
        <div className="flex justify-center gap-4">
          {user ? (
            <Link
              to={user.role === 'therapist' ? '/therapist' : '/dashboard'}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 gap-2"
            >
              Go to Dashboard <ChevronRight className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 gap-2"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <Activity className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Real-Time Pose Tracking</h3>
            <p className="text-gray-600">Track motor trajectories directly in your browser using standard webcam devices without auxiliary gear.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <Shield className="h-10 w-10 text-purple-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Disease-Specific</h3>
            <p className="text-gray-600">Rehabilitation exercises specialized for Ischemic, Hemorrhagic, TIA, and Brainstem stroke pathologies.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <LineChart className="h-10 w-10 text-green-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Analytical Insights</h3>
            <p className="text-gray-600">Assess recovery quality through joint velocity tracking, range-of-motion metrics, and movement smoothness.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <Award className="h-10 w-10 text-amber-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Gamification System</h3>
            <p className="text-gray-600">Keep motivation levels high with daily execution streaks, earned trophies, and point tracking rewards.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
