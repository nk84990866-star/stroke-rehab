"""
Session Routes for NeuroMotion AI
Handles saving completed exercises, retrieving logs, progress charts, and clinical analysis.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from datetime import datetime, timezone
import json
import math
from backend.models import db, ExerciseSession, Exercise, Achievement
from backend.services.authorization import (
    get_authorized_patient,
    patient_not_found,
    requested_patient_id,
)
from backend.services.kinematics_engine import UpperLimbKinematics
from backend.services.gamification import (
    calculate_session_points,
    check_and_update_streak,
    check_achievements
)
from backend.services.report_generator import generate_session_report

sessions_bp = Blueprint("sessions", __name__)
kinematics = UpperLimbKinematics()

SESSION_PAYLOAD_MAX_BYTES = 256 * 1024
MAX_JOINT_ANGLE_SAMPLES = 60 * 60  # 60 seconds at up to 60 camera frames per second
SESSION_PAYLOAD_FIELDS = {
    "exercise_id",
    "duration_seconds",
    "avg_accuracy_score",
    "targets_hit",
    "total_targets",
    "joint_angle_data",
}
PROJECTED_ELBOW_ANGLE_FIELD = "projected_elbow_angle_data"
PROJECTED_ELBOW_ANGLE_FIELDS = {
    "version",
    "coordinate_system",
    "samples",
}
PROJECTED_ELBOW_ANGLE_SAMPLE_FIELDS = {
    "angle_deg",
    "elapsed_ms",
    "side",
}
PROJECTED_ELBOW_ANGLE_COORDINATE_SYSTEM = "mediapipe_normalized_image_xy"


def _session_payload_error(message, status=400):
    return jsonify({"error": message}), status


def _read_session_payload():
    if not request.is_json:
        return None, _session_payload_error("Expected a JSON session payload")

    if request.content_length is not None and request.content_length > SESSION_PAYLOAD_MAX_BYTES:
        return None, _session_payload_error("Session payload is too large", 413)

    raw_payload = request.stream.read(SESSION_PAYLOAD_MAX_BYTES + 1)
    if len(raw_payload) > SESSION_PAYLOAD_MAX_BYTES:
        return None, _session_payload_error("Session payload is too large", 413)

    try:
        payload = json.loads(raw_payload)
    except (ValueError, UnicodeDecodeError, RecursionError):
        return None, _session_payload_error("Invalid JSON session payload")

    if not isinstance(payload, dict):
        return None, _session_payload_error("Session payload must be a JSON object")
    return payload, None


def _is_json_integer(value):
    return type(value) is int


def _is_finite_json_number(value):
    return type(value) is int or (type(value) is float and math.isfinite(value))


def _validate_session_payload(data):
    missing_fields = SESSION_PAYLOAD_FIELDS - data.keys()
    if missing_fields:
        return f"Missing required session field: {sorted(missing_fields)[0]}"

    allowed_fields = SESSION_PAYLOAD_FIELDS | {PROJECTED_ELBOW_ANGLE_FIELD}
    if data.keys() - allowed_fields:
        return "Session payload contains unsupported fields"

    exercise_id = data["exercise_id"]
    if not _is_json_integer(exercise_id) or not 1 <= exercise_id <= 2_147_483_647:
        return "exercise_id must be a positive integer"

    duration = data["duration_seconds"]
    if not _is_json_integer(duration) or duration < 1:
        return "duration_seconds must be a positive integer"

    accuracy = data["avg_accuracy_score"]
    if not _is_finite_json_number(accuracy) or not 0 <= accuracy <= 100:
        return "avg_accuracy_score must be a finite number from 0 to 100"

    targets_hit = data["targets_hit"]
    if not _is_json_integer(targets_hit) or not 0 <= targets_hit <= 2_147_483_647:
        return "targets_hit must be a non-negative integer"

    total_targets = data["total_targets"]
    if not _is_json_integer(total_targets) or not 1 <= total_targets <= 2_147_483_647:
        return "total_targets must be a positive integer"

    joint_angles = data["joint_angle_data"]
    if not isinstance(joint_angles, list):
        return "joint_angle_data must be an array"
    if len(joint_angles) > MAX_JOINT_ANGLE_SAMPLES:
        return "joint_angle_data contains too many samples"

    for sample in joint_angles:
        if not isinstance(sample, list) or len(sample) != 2:
            return "Each joint_angle_data sample must contain two angle values"
        if any(
            not _is_finite_json_number(angle) or not 0 <= angle <= 180
            for angle in sample
        ):
            return "Joint angle values must be finite numbers from 0 to 180"

    if targets_hit > len(joint_angles):
        return "targets_hit exceeds the recorded movement samples"

    projected_data = data.get(PROJECTED_ELBOW_ANGLE_FIELD)
    if projected_data is not None:
        projected_error = _validate_projected_elbow_angle_data(projected_data)
        if projected_error:
            return projected_error

    return None


def _validate_projected_elbow_angle_data(data):
    if not isinstance(data, dict) or set(data) != PROJECTED_ELBOW_ANGLE_FIELDS:
        return "projected_elbow_angle_data must contain version, coordinate_system, and samples"
    if type(data["version"]) is not int or data["version"] != 1:
        return "projected_elbow_angle_data version must be 1"
    if data["coordinate_system"] != PROJECTED_ELBOW_ANGLE_COORDINATE_SYSTEM:
        return "Unsupported projected_elbow_angle_data coordinate_system"

    samples = data["samples"]
    if not isinstance(samples, list):
        return "projected_elbow_angle_data samples must be an array"
    if len(samples) > MAX_JOINT_ANGLE_SAMPLES:
        return "projected_elbow_angle_data contains too many samples"

    previous_elapsed_ms = None
    for sample in samples:
        if not isinstance(sample, dict) or set(sample) != PROJECTED_ELBOW_ANGLE_SAMPLE_FIELDS:
            return "Each projected elbow-angle sample must contain angle_deg, elapsed_ms, and side"

        angle = sample["angle_deg"]
        if not _is_finite_json_number(angle) or not 0 <= angle <= 180:
            return "Projected elbow angle must be a finite number from 0 to 180"

        elapsed_ms = sample["elapsed_ms"]
        if not _is_finite_json_number(elapsed_ms) or elapsed_ms < 0:
            return "Projected elbow-angle elapsed_ms must be a finite non-negative number"
        if previous_elapsed_ms is not None and elapsed_ms < previous_elapsed_ms:
            return "Projected elbow-angle samples must be ordered by elapsed_ms"
        previous_elapsed_ms = elapsed_ms

        if sample["side"] not in ("left", "right"):
            return "Projected elbow-angle side must be left or right"

    return None


@sessions_bp.route("", methods=["POST"])
@login_required
def save_session():
    """
    Saves a completed session, recalculates points, updates patient streak,
    runs Unit 3 velocity/smoothness computations, and checks achievements.
    """
    data, error_response = _read_session_payload()
    if error_response:
        return error_response

    validation_error = _validate_session_payload(data)
    if validation_error:
        return _session_payload_error(validation_error)

    exercise_id = data["exercise_id"]
    exercise = Exercise.query.get_or_404(exercise_id)

    duration = data["duration_seconds"]
    if duration > exercise.duration_seconds:
        return _session_payload_error("duration_seconds exceeds the exercise duration")

    target_positions = exercise.target_positions
    expected_total_targets = len(target_positions) if target_positions else data["targets_hit"] + 1
    if data["total_targets"] != expected_total_targets:
        return _session_payload_error("total_targets does not match the exercise targets")

    accuracy = data["avg_accuracy_score"]
    targets_hit = data["targets_hit"]
    total_targets = data["total_targets"]
    joint_angles = data["joint_angle_data"]  # list of [theta1, theta2]

    # 1. Run Unit 3 kinematics quality metrics
    smoothness_results = kinematics.compute_movement_smoothness(joint_angles)
    smoothness_score = smoothness_results.get("smoothness_score", 50.0)

    # Compute average angular joint velocity
    velocities = []
    for i in range(1, len(joint_angles)):
        t1_diff = abs(joint_angles[i][0] - joint_angles[i-1][0])
        t2_diff = abs(joint_angles[i][1] - joint_angles[i-1][1])
        # simple speed approximation at 30 fps
        velocities.append((t1_diff + t2_diff) * 30.0)
    avg_velocity = round(sum(velocities) / len(velocities), 2) if velocities else 0.0

    # Compute maximum Joint ROM reached (shoulder and elbow)
    max_rom = 0.0
    if joint_angles:
        max_rom = max(max(pair[0] for pair in joint_angles), max(pair[1] for pair in joint_angles))
    max_rom = round(float(max_rom), 2)

    # Overall session score combining accuracy, target efficiency, and movement smoothness
    hit_ratio = (targets_hit / total_targets) if total_targets > 0 else 0.0
    overall_score = round((accuracy * 0.4) + (hit_ratio * 30.0) + (smoothness_score * 0.3), 1)

    session = ExerciseSession(
        patient_id=current_user.id,
        exercise_id=exercise_id,
        duration_seconds=duration,
        avg_accuracy_score=accuracy,
        max_rom_achieved=max_rom,
        targets_hit=targets_hit,
        total_targets=total_targets,
        avg_joint_velocity=avg_velocity,
        movement_smoothness_score=smoothness_score,
        overall_score=overall_score,
        level_played=exercise.level,
        joint_angle_data_json=json.dumps(joint_angles),
        projected_elbow_angle_data_json=(
            json.dumps(data[PROJECTED_ELBOW_ANGLE_FIELD])
            if data.get(PROJECTED_ELBOW_ANGLE_FIELD) is not None
            else None
        ),
        ended_at=datetime.utcnow()
    )

    db.session.add(session)

    # 2. Gamification logic
    check_and_update_streak(current_user)
    pts = calculate_session_points(session)
    current_user.points += pts

    db.session.commit()

    # 3. Check for achievements
    unlocked_badges = check_achievements(current_user, session, db, Achievement)

    return jsonify({
        "message": "Session saved successfully",
        "session": session.to_dict(),
        "points_earned": pts,
        "new_streak": current_user.streak_count,
        "unlocked_badges": unlocked_badges
    }), 201

@sessions_bp.route("", methods=["GET"])
@login_required
def get_sessions():
    """Returns authorized patient session logs, sorted newest first."""
    patient = get_authorized_patient(requested_patient_id())
    if patient is None:
        return patient_not_found()

    sessions = ExerciseSession.query.filter_by(patient_id=patient.id).order_by(ExerciseSession.started_at.desc()).all()
    return jsonify([s.to_dict() for s in sessions])

@sessions_bp.route("/<int:session_id>/report", methods=["GET"])
@login_required
def get_report(session_id):
    """Generates a report only after authorizing access to its patient."""
    session = ExerciseSession.query.filter_by(id=session_id).first()
    if session is None:
        return patient_not_found()

    patient = get_authorized_patient(session.patient_id)
    if patient is None:
        return patient_not_found()

    exercise = Exercise.query.get(session.exercise_id)
    
    report = generate_session_report(session, patient, exercise)
    return jsonify(report)

@sessions_bp.route("/progress", methods=["GET"])
@login_required
def get_progress():
    """Returns aggregated time series of scores and ROM for progress graphs."""
    patient = get_authorized_patient(requested_patient_id())
    if patient is None:
        return patient_not_found()

    sessions = ExerciseSession.query.filter_by(patient_id=patient.id).order_by(ExerciseSession.started_at.asc()).all()
    
    progress_data = []
    for s in sessions:
        progress_data.append({
            "date": s.started_at.strftime("%Y-%m-%d"),
            "score": s.overall_score,
            "rom": s.max_rom_achieved,
            "accuracy": s.avg_accuracy_score,
            "smoothness": s.movement_smoothness_score
        })
    return jsonify(progress_data)

@sessions_bp.route("/achievements", methods=["GET"])
@login_required
def get_achievements():
    """
    Returns the logged-in patient's earned achievements with earned dates.
    Identity comes from the session only; no patient_id is accepted.
    """
    rows = (
        Achievement.query.filter_by(patient_id=current_user.id)
        .order_by(Achievement.earned_at.asc())
        .all()
    )
    return jsonify([
        {
            "badge_name": a.badge_name,
            "earned_at": a.earned_at.isoformat() if a.earned_at else None,
        }
        for a in rows
    ])

@sessions_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    """Returns patient summary statistics."""
    patient = get_authorized_patient(requested_patient_id())
    if patient is None:
        return patient_not_found()

    sessions = ExerciseSession.query.filter_by(patient_id=patient.id).all()

    total = len(sessions)
    if total == 0:
        return jsonify({
            "total_sessions": 0,
            "avg_score": 0.0,
            "best_score": 0.0,
            "best_session": None,
            "streak": patient.streak_count,
            "points": patient.points,
            "badges": patient.badges
        })

    scores = [s.overall_score for s in sessions]
    avg_score = round(sum(scores) / total, 1)
    best_score = max(scores)

    # Highest real session score with its exercise, for the Personal Best card.
    best_session = (
        ExerciseSession.query.filter_by(patient_id=patient.id)
        .order_by(ExerciseSession.overall_score.desc())
        .first()
    )
    best_exercise_name = (
        best_session.exercise.name if best_session and best_session.exercise else None
    )

    return jsonify({
        "total_sessions": total,
        "avg_score": avg_score,
        "best_score": best_score,
        "best_session": {
            "id": best_session.id,
            "exercise_name": best_exercise_name,
            "overall_score": best_session.overall_score,
            "started_at": best_session.started_at.isoformat() if best_session.started_at else None,
        } if best_session else None,
        "streak": patient.streak_count,
        "points": patient.points,
        # Badges are already persisted per patient at session-save time
        # (gamification.check_achievements); expose them here so the
        # achievements page uses one consistent source.
        "badges": patient.badges
    })
