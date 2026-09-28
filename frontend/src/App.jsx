import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
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

/**
 * PublicShell — layout for the unauthenticated routes.
 * Renders the top bar only (no sidebar), exactly as before the shell existed.
 * Navbar self-hides when there is no signed-in user.
 */
const PublicShell = () => (
  <>
    <Navbar />
    <main id="main-content" className="flex-grow">
      <Outlet />
    </main>
  </>
);

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
        <Routes>
          {/* Public routes — top bar, no sidebar */}
          <Route element={<PublicShell />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Patient routes — AppShell (sidebar + top bar) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/exercise/:id" element={<ExerciseRunnerPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/:id" element={<ReportDetailPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Therapist routes — AppShell (sidebar + top bar) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['therapist']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/therapist" element={<TherapistDashboardPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
