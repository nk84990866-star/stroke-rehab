import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExercisesPage from './pages/ExercisesPage';
import ExerciseRunnerPage from './pages/ExerciseRunnerPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import ProgressPage from './pages/ProgressPage';
import AchievementsPage from './pages/AchievementsPage';
import TherapistDashboardPage from './pages/TherapistDashboardPage';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-surface dark:bg-slate-950 flex flex-col">
        {/* Skip link: first focusable element, visible on keyboard focus only */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2.5 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Navbar />
        <main id="main-content" className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Patient routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <ExercisesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercise/:id"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <ExerciseRunnerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/:id"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <ReportDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <ProgressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <AchievementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Therapist routes */}
            <Route
              path="/therapist"
              element={
                <ProtectedRoute allowedRoles={['therapist']}>
                  <TherapistDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
