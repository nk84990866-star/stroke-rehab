import axios from 'axios';

// The Vite development server proxy forwards /api requests to http://localhost:5000/api
// For production, use VITE_API_URL env variable
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Allow cookies for session auth
  headers: {
    'Content-Type': 'application/json',
  }
});

// Auth endpoints
export const login = (email, password) => api.post('/auth/login', { email, password }).then(res => res.data);
export const register = (data) => api.post('/auth/register', data).then(res => res.data);
export const logout = () => api.post('/auth/logout').then(res => res.data);
export const getMe = () => api.get('/auth/me').then(res => res.data);
export const updateProfile = (data) => api.put('/auth/profile', data).then(res => res.data);

// Exercise endpoints
export const getExercises = (level) => api.get('/exercises', { params: { level } }).then(res => res.data);
export const getExerciseDetail = (id) => api.get(`/exercises/${id}`).then(res => res.data);
export const getRecommendedProgram = () => api.get('/exercises/program').then(res => res.data);

// Session endpoints
export const saveSession = (data) => api.post('/sessions', data).then(res => res.data);
export const getSessions = (patientId) => api.get('/sessions', { params: { patient_id: patientId } }).then(res => res.data);
export const getSessionReport = (id) => api.get(`/sessions/${id}/report`).then(res => res.data);
export const getProgress = (patientId) => api.get('/sessions/progress', { params: { patient_id: patientId } }).then(res => res.data);
export const getStats = (patientId) => api.get('/sessions/stats', { params: { patient_id: patientId } }).then(res => res.data);

// Therapist endpoints
export const getAssignedPatients = () => api.get('/patients').then(res => res.data);
export const getPatientSessions = (patientId) => api.get(`/patients/${patientId}/sessions`).then(res => res.data);
export const updatePatientSeverity = (patientId, severityLevel) => api.put(`/patients/${patientId}/severity`, { severity_level: severityLevel }).then(res => res.data);

export default api;
