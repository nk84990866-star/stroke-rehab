"""
Exercise Routes for NeuroMotion AI
Handles fetching exercises and disease-specific programs.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from backend.models import Exercise
from backend.services.exercise_programs import get_exercise_program
from backend.services.daily_plan import get_daily_plan

exercises_bp = Blueprint("exercises", __name__)

@exercises_bp.route("", methods=["GET"])
@login_required
def get_exercises():
    """Returns all exercises, optionally filtered by level."""
    level = request.args.get("level", type=int)
    query = Exercise.query
    if level is not None:
        query = query.filter_by(level=level)
    exercises = query.all()
    return jsonify([ex.to_dict() for ex in exercises])

@exercises_bp.route("/<int:exercise_id>", methods=["GET"])
@login_required
def get_exercise_detail(exercise_id):
    """Returns detail of a single exercise."""
    exercise = Exercise.query.get_or_404(exercise_id)
    return jsonify(exercise.to_dict())

@exercises_bp.route("/daily-plan", methods=["GET"])
@login_required
def get_today_daily_plan():
    """
    Returns today's deterministic rehabilitation plan for the LOGGED-IN
    patient. Repeated requests on the same day return the same plan.
    The patient id always comes from the session (never the query string),
    so a patient can only ever access their own plan.
    """
    if current_user.role != "patient":
        return jsonify({"error": "Only patients have a daily plan"}), 400

    if not current_user.stroke_type or not current_user.severity_level:
        return jsonify({
            "error": "Patient profile is incomplete — no plan can be generated",
            "plan": None,
        }), 409

    plan = get_daily_plan(current_user, Exercise, get_exercise_program)
    return jsonify(plan)


@exercises_bp.route("/program", methods=["GET"])
@login_required
def get_recommended_program():
    """Returns recommended exercise program for the logged-in patient."""
    if current_user.role != "patient":
        return jsonify({"error": "Only patients have recommended programs"}), 400

    program = get_exercise_program(
        stroke_type=current_user.stroke_type,
        severity_level=current_user.severity_level
    )
    
    # Inject database IDs by matching exercise names
    all_exercises = Exercise.query.all()
    name_to_id = {ex.name: ex.id for ex in all_exercises}
    for ex in program.get("exercises", []):
        ex["id"] = name_to_id.get(ex.get("name"))
        
    return jsonify(program)
