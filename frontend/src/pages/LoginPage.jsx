import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';
import { Button, Card } from '../components/ui';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'therapist' ? '/therapist' : '/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface dark:bg-slate-950 min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <span className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary-600 text-white shadow-sm">
          <Activity className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-50">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to continue your rehabilitation journey.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-6 sm:p-8">
          {error && (
            <div id="login-error" role="alert" className="mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={!!error || undefined}
                aria-describedby={error ? 'login-error' : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              Register here
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
