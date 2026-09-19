"""
Patient Management Routes for Therapists/Clinicians
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from backend.models import db, User, ExerciseSession

patients_bp = Blueprint("patients", __name__)

@patients_bp.route("", methods=["GET"])
@login_required
def get_patients():
    """Returns patients assigned to the logged-in therapist."""
    if current_user.role != "therapist":
        return jsonify({"error": "Unauthorized"}), 403

    patients = User.query.filter_by(role="patient", assigned_therapist_id=current_user.id).all()
    return jsonify([p.to_dict(include_medical=True) for p in patients])

@patients_bp.route("/<int:patient_id>/sessions", methods=["GET"])
@login_required
def get_patient_sessions(patient_id):
    """Allows therapists to inspect a patient's session logs."""
    if current_user.role != "therapist":
        return jsonify({"error": "Unauthorized"}), 403

    # Verify patient assignment
    patient = User.query.filter_by(id=patient_id, assigned_therapist_id=current_user.id).first_or_404()
    sessions = ExerciseSession.query.filter_by(patient_id=patient.id).order_by(ExerciseSession.started_at.desc()).all()
    return jsonify([s.to_dict() for s in sessions])

@patients_bp.route("/<int:patient_id>/severity", methods=["PUT"])
@login_required
def update_patient_severity(patient_id):
    """Allows therapists to adjust patient recovery severity levels."""
    if current_user.role != "therapist":
        return jsonify({"error": "Unauthorized"}), 403

    patient = User.query.filter_by(id=patient_id, assigned_therapist_id=current_user.id).first_or_404()
    data = request.get_json() or {}
    
    new_severity = data.get("severity_level")
    if new_severity is not None:
        patient.severity_level = max(1, min(5, int(new_severity)))
        db.session.commit()
        return jsonify({"message": "Severity adjusted successfully", "patient": patient.to_dict(include_medical=True)})
        
    return jsonify({"error": "Invalid severity_level"}), 400
