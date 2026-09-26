"""
Daily Rehabilitation Plan service for NeuroMotion AI.

DETERMINISTIC PLAN RULE (no randomness, no medical decisions):
  1. Start from the patient's existing prescribed program
     (exercise_programs.get_exercise_program, which already encodes the
     clinical level/stroke-type/severity mapping).
  2. Select a subset for today by rotating through that program based on the
     day of the year (UTC): start index = (day_of_year - 1) % program_size,
     taking up to DAILY_PLAN_SIZE exercises in program order (wrapping).
  3. The result is a pure function of (patient profile, calendar date):
     the same patient always gets the same plan for the same day, and the
     plan rotates day to day. Difficulty is never escalated here — the
     subset is always drawn from what was already prescribed.

COMPLETION RULE (deterministic, from existing session data):
  A planned exercise counts as completed for the day if at least one
  ExerciseSession for that exercise exists whose started_at falls on the
  same UTC calendar date as the plan. No separate completion record is kept.

NO DATABASE STORAGE: the plan is derived on demand from existing tables
(Exercise, ExerciseSession, User profile). Storing it would be redundant
data that could drift out of sync with the prescribed program.
"""

from datetime import datetime, timedelta, timezone

from backend.models import ExerciseSession

# Keep daily plans light: patients do at most a handful of exercises per day.
DAILY_PLAN_SIZE = 4


def _utc_today():
    """Server (UTC) calendar date used consistently for all plans."""
    return datetime.now(timezone.utc).date()


def get_daily_plan(patient, Exercise, get_exercise_program):
    """
    Build today's deterministic plan for the given patient.

    Parameters:
        patient: User model instance (role=patient)
        Exercise: Exercise model class (for DB id/name lookup)
        get_exercise_program: the existing prescribed-program function

    Returns:
        dict payload ready for JSON serialization.
    """
    today = _utc_today()

    program = get_exercise_program(
        stroke_type=patient.stroke_type,
        severity_level=patient.severity_level,
    )
    recommended = program.get("exercises", [])

    payload = {
        "date": today.isoformat(),
        "program_name": program.get("program_name"),
        "program_description": program.get("program_description"),
        "exercises": [],
        "total_exercises": 0,
        "completed_exercises": 0,
        "remaining_exercises": 0,
        "completion_percentage": 0,
    }

    if not recommended:
        # Not enough information to safely generate a plan — return an
        # explicit empty plan rather than inventing exercises.
        payload["message"] = "No rehabilitation plan is available for today."
        return payload

    # Deterministic day-based rotation through the prescribed program.
    day_index = today.timetuple().tm_yday - 1
    start = day_index % len(recommended)
    size = min(DAILY_PLAN_SIZE, len(recommended))
    selected = [recommended[(start + i) % len(recommended)] for i in range(size)]

    # Map program entries (keyed by name) to database exercises for stable ids.
    db_exercises = Exercise.query.all()
    name_to_exercise = {ex.name: ex for ex in db_exercises}

    # Completion: any saved session for that exercise today (UTC date).
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    tomorrow_start = today_start + timedelta(days=1)

    sessions_today = (
        ExerciseSession.query.filter(
            ExerciseSession.patient_id == patient.id,
            ExerciseSession.started_at >= today_start,
            ExerciseSession.started_at < tomorrow_start,
        ).all()
    )
    completed_ids = {s.exercise_id for s in sessions_today}

    plan_exercises = []
    for item in selected:
        db_ex = name_to_exercise.get(item.get("name"))
        if not db_ex:
            continue  # skip program entries that are not in the DB (shouldn't happen)

        targets = db_ex.target_positions or []
        hold_secs = [float(t.get("hold_sec") or 0) for t in targets]
        max_hold = max(hold_secs) if hold_secs else None
        completed = db_ex.id in completed_ids

        plan_exercises.append({
            "id": db_ex.id,
            "name": db_ex.name,
            "description": db_ex.description,
            "category": db_ex.category,
            "level": db_ex.level,
            "level_name": db_ex.level_name,
            "duration_seconds": db_ex.duration_seconds,
            "icon_name": db_ex.icon_name,
            "speed_requirement": db_ex.speed_requirement,
            "hold_time_seconds": max_hold,
            "completed": completed,
        })

    completed_count = sum(1 for ex in plan_exercises if ex["completed"])
    total = len(plan_exercises)
    payload["exercises"] = plan_exercises
    payload["total_exercises"] = total
    payload["completed_exercises"] = completed_count
    payload["remaining_exercises"] = total - completed_count
    payload["completion_percentage"] = round((completed_count / total) * 100) if total else 0
    return payload
