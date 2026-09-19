"""
Session Routes for NeuroMotion AI
Handles saving completed exercises, retrieving logs, progress charts, and clinical analysis.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from datetime import datetime, timezone
import json
from backend.models import db, ExerciseSession, Exercise, User, Achievement
from backend.services.kinematics_engine import UpperLimbKinematics
from backend.services.gamification import (
    calculate_session_points,
    check_and_update_streak,
    check_achievements
)
from backend.services.report_generator import generate_session_report

sessions_bp = Blueprint("sessions", __name__)
kinematics = UpperLimbKinematics()

@sessions_bp.route("", methods=["POST"])
@login_required
def save_session():
    """
    Saves a completed session, recalculates points, updates patient streak,
    runs Unit 3 velocity/smoothness computations, and checks achievements.
    """
    data = request.get_json() or {}
    exercise_id = data.get("exercise_id")
    duration = data.get("duration_seconds", 0)
    accuracy = data.get("avg_accuracy_score", 0.0)
    targets_hit = data.get("targets_hit", 0)
    total_targets = data.get("total_targets", 0)
    joint_angles = data.get("joint_angle_data", []) # list of [theta1, theta2]

    if not exercise_id:
        return jsonify({"error": "Missing exercise_id"}), 400

    exercise = Exercise.query.get_or_404(exercise_id)

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
    avg_velocity = sum(velocities) / len(velocities) if velocities else 0.0

    # Compute maximum Joint ROM reached (shoulder and elbow)
    max_rom = 0.0
    if joint_angles:
        max_rom = max(max(pair[0] for pair in joint_angles), max(pair[1] for pair in joint_angles))

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
    """Returns patient's session logs, sorted newest first."""
    patient_id = request.args.get("patient_id", type=int) or current_user.id
    sessions = ExerciseSession.query.filter_by(patient_id=patient_id).order_by(ExerciseSession.started_at.desc()).all()
    return jsonify([s.to_dict() for s in sessions])

@sessions_bp.route("/<int:session_id>/report", methods=["GET"])
@login_required
def get_report(session_id):
    """Generates detailed AI analysis report for the session."""
    session = ExerciseSession.query.get_or_404(session_id)
    patient = User.query.get(session.patient_id)
    exercise = Exercise.query.get(session.exercise_id)
    
    report = generate_session_report(session, patient, exercise)
    return jsonify(report)

@sessions_bp.route("/progress", methods=["GET"])
@login_required
def get_progress():
    """Returns aggregated time series of scores and ROM for progress graphs."""
    patient_id = request.args.get("patient_id", type=int) or current_user.id
    sessions = ExerciseSession.query.filter_by(patient_id=patient_id).order_by(ExerciseSession.started_at.asc()).all()
    
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

@sessions_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    """Returns patient summary statistics."""
    patient_id = request.args.get("patient_id", type=int) or current_user.id
    sessions = ExerciseSession.query.filter_by(patient_id=patient_id).all()
    user = User.query.get(patient_id)

    total = len(sessions)
    if total == 0:
        return jsonify({
            "total_sessions": 0,
            "avg_score": 0.0,
            "best_score": 0.0,
            "streak": user.streak_count,
            "points": user.points
        })

    scores = [s.overall_score for s in sessions]
    avg_score = round(sum(scores) / total, 1)
    best_score = max(scores)

    return jsonify({
        "total_sessions": total,
        "avg_score": avg_score,
        "best_score": best_score,
        "streak": user.streak_count,
        "points": user.points
    })
