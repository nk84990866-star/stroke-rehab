import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ArrowLeft } from 'lucide-react';
import { Button, Card, FORM_CONTROL_CLASS, FORM_LABEL_CLASS, InlineError } from '../components/ui';

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
            <InlineError id="register-error">
              {error}
            </InlineError>
          )}

          {step === 1 ? (
            <form className="space-y-5" onSubmit={handleNext}>
              <div>
                <label htmlFor="fullName" className={FORM_LABEL_CLASS}>Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={FORM_CONTROL_CLASS}
                />
              </div>

              <div>
                <label htmlFor="regEmail" className={FORM_LABEL_CLASS}>Email Address</label>
                <input
                  id="regEmail"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? 'register-error' : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={FORM_CONTROL_CLASS}
                />
              </div>

              <div>
                <label htmlFor="regPassword" className={FORM_LABEL_CLASS}>Password</label>
                <input
                  id="regPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={FORM_CONTROL_CLASS}
                />
              </div>

              <div>
                <label htmlFor="role" className={FORM_LABEL_CLASS}>Account Type</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={FORM_CONTROL_CLASS}
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
                    <label htmlFor="strokeType" className={FORM_LABEL_CLASS}>Stroke Classification</label>
                    <select
                      id="strokeType"
                      value={strokeType}
                      onChange={(e) => setStrokeType(e.target.value)}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="ischemic">Ischemic Stroke (Blood Clot)</option>
                      <option value="hemorrhagic">Hemorrhagic Stroke (Brain Bleed)</option>
                      <option value="tia">Transient Ischemic Attack (TIA)</option>
                      <option value="brainstem">Brainstem Stroke (Balance/Bilateral Affected)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="affectedSide" className={FORM_LABEL_CLASS}>Affected Side</label>
                    <select
                      id="affectedSide"
                      value={affectedSide}
                      onChange={(e) => setAffectedSide(e.target.value)}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value="left">Left Side Affected (Right Brain Stroke)</option>
                      <option value="right">Right Side Affected (Left Brain Stroke)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="severityLevel" className={FORM_LABEL_CLASS}>Severity Level (1-5)</label>
                    <select
                      id="severityLevel"
                      value={severityLevel}
                      onChange={(e) => setSeverityLevel(Number(e.target.value))}
                      className={FORM_CONTROL_CLASS}
                    >
                      <option value={1}>1 - Severe Paralysis (Passive Exercise Support)</option>
                      <option value={2}>2 - Moderate-Severe Impairment</option>
                      <option value={3}>3 - Moderate Impairment</option>
                      <option value={4}>4 - Mild Impairment</option>
                      <option value={5}>5 - Recovery Phase (High / Fast Exercises Unlocked)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dateOfStroke" className={FORM_LABEL_CLASS}>Date of Stroke Incident</label>
                    <input
                      id="dateOfStroke"
                      type="date"
                      required
                      value={dateOfStroke}
                      onChange={(e) => setDateOfStroke(e.target.value)}
                      className={FORM_CONTROL_CLASS}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="specialization" className={FORM_LABEL_CLASS}>Specialization</label>
                    <input
                      id="specialization"
                      type="text"
                      required
                      value={specialization}
                      placeholder="e.g., Physical Therapist, Occupational Therapist"
                      onChange={(e) => setSpecialization(e.target.value)}
                      className={FORM_CONTROL_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="licenseNumber" className={FORM_LABEL_CLASS}>Medical License Number</label>
                    <input
                      id="licenseNumber"
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className={FORM_CONTROL_CLASS}
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
