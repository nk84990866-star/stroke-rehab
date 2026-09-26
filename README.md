# NeuroMotion AI — AI-Assisted Stroke Rehabilitation

A web-based rehabilitation platform for stroke patients: real-time webcam pose
tracking (MediaPipe), a deterministic daily exercise plan, clinical session
reports (ROM, smoothness, accuracy), gamified milestones, and a clinician
portal — built with **Flask + React (Vite, Tailwind v4)** on **Neon PostgreSQL**,
deployed on **Render**.

## Architecture

| Layer | Tech | Where |
|---|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, Recharts, MediaPipe Tasks Vision | `frontend/` |
| Backend | Flask 3, Flask-Login/Bcrypt, SQLAlchemy, gunicorn | `backend/` |
| Database | Neon PostgreSQL (psycopg 3) via `DATABASE_URL` | `backend/config.py` |
| Kinematics engine | D-H parameters, FK/IK, velocity/smoothness analysis | `backend/services/kinematics_engine.py` |

## Running locally

### Backend
```bash
cd AI_HealthCare_Stroke_Rehab
# Set DATABASE_URL (Neon) or leave unset to use the local SQLite fallback
PYTHONPATH=. .venv/Scripts/python -m flask --app backend.app run   # Windows/Git Bash
```

### Frontend
```bash
cd AI_HealthCare_Stroke_Rehab/frontend
npm install
npm run dev     # dev server proxies /api to localhost:5000
npm run build   # production build (served by Render from frontend/dist)
```

## Deployment (Render)

`render.yaml` defines both services:

- **Backend** — `PYTHONPATH=. gunicorn backend.app:app --bind 0.0.0.0:$PORT`,
  env vars `DATABASE_URL` (Neon), `FRONTEND_URL`, `SECRET_KEY`.
- **Frontend** — static site built from `frontend/` (`npm install && npm run build`,
  publish `frontend/dist`), with `VITE_API_URL` injected from the backend URL.

## Key features

- Webcam pose tracking with a digital-twin target game (no video leaves the device)
- Deterministic daily rehabilitation plan derived from each patient's prescribed program
- Session scoring: accuracy, target efficiency, movement smoothness (jerk-based)
- Progress analytics with score/ROM/smoothness trends and weekly activity
- Achievements, streaks, and optional voice assistance (opt-in, visual alternatives always present)
- Clinician portal with per-patient activity drill-down and severity adjustment
