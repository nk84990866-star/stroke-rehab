import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ArrowLeft } from 'lucide-react';
import { Button, Card } from '../components/ui';

const inputClass =
  'mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm';

const RegisterPage = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');

  // Patient Fields
  const [strokeType, setStrokeType] = useState('ischemic');
  const [affectedSide, setAffectedSide] = useState('right');
  const [severityLevel, setSeverityLevel] = useState(3);
  const [dateOfStroke, setDateOfStroke] = useState('');

  // Therapist Fields
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const handleNext = (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all basic fields');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      email,
      password,
      full_name: fullName,
      role,
      ...(role === 'patient'
        ? { stroke_type: strokeType, affected_side: affectedSide, severity_level: severityLevel, date_of_stroke: dateOfStroke }
        : { specialization, license_number: licenseNumber }),
    };

    try {
      await register(payload);
      // Automatically log in after registration
      await login(email, password);
      navigate(role === 'therapist' ? '/therapist' : '/dashboard');
    } catch (err) {
      setError(err);
      setStep(1); // Go back to fix basic details if registering failed
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
        <h1 className="mt-4 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-50">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {step === 1 ? 'Step 1 of 2 — account details.' : 'Step 2 of 2 — profile details.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-6 sm:p-8">
          {error && (
            <div id="register-error" role="alert" className="mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-5" onSubmit={handleNext}>
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="regEmail" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Email Address</label>
                <input
                  id="regEmail"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? 'register-error' : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="regPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                <input
                  id="regPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Account Type</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={inputClass}
                >
                  <option value="patient">Patient (Stroke Rehab Candidate)</option>
                  <option value="therapist">Clinician / Therapist</option>
                </select>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Next Step
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {role === 'patient' ? (
                <>
                  <div>
                    <label htmlFor="strokeType" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Stroke Classification</label>
                    <select
                      id="strokeType"
                      value={strokeType}
                      onChange={(e) => setStrokeType(e.target.value)}
                      className={inputClass}
                    >
                      <option value="ischemic">Ischemic Stroke (Blood Clot)</option>
                      <option value="hemorrhagic">Hemorrhagic Stroke (Brain Bleed)</option>
                      <option value="tia">Transient Ischemic Attack (TIA)</option>
                      <option value="brainstem">Brainstem Stroke (Balance/Bilateral Affected)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="affectedSide" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Affected Side</label>
                    <select
                      id="affectedSide"
                      value={affectedSide}
                      onChange={(e) => setAffectedSide(e.target.value)}
                      className={inputClass}
                    >
                      <option value="left">Left Side Affected (Right Brain Stroke)</option>
                      <option value="right">Right Side Affected (Left Brain Stroke)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="severityLevel" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Severity Level (1-5)</label>
                    <select
                      id="severityLevel"
                      value={severityLevel}
                      onChange={(e) => setSeverityLevel(Number(e.target.value))}
                      className={inputClass}
                    >
                      <option value={1}>1 - Severe Paralysis (Passive Exercise Support)</option>
                      <option value={2}>2 - Moderate-Severe Impairment</option>
                      <option value={3}>3 - Moderate Impairment</option>
                      <option value={4}>4 - Mild Impairment</option>
                      <option value={5}>5 - Recovery Phase (High / Fast Exercises Unlocked)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dateOfStroke" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Date of Stroke Incident</label>
                    <input
                      id="dateOfStroke"
                      type="date"
                      required
                      value={dateOfStroke}
                      onChange={(e) => setDateOfStroke(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="specialization" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Specialization</label>
                    <input
                      id="specialization"
                      type="text"
                      required
                      value={specialization}
                      placeholder="e.g., Physical Therapist, Occupational Therapist"
                      onChange={(e) => setSpecialization(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Medical License Number</label>
                    <input
                      id="licenseNumber"
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" size="lg" className="w-1/2" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                </Button>
                <Button type="submit" size="lg" loading={loading} className="w-1/2">
                  {loading ? 'Creating…' : 'Register'}
                </Button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
