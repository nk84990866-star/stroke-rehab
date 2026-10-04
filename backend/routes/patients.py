"""
Patient Management Routes for Therapists/Clinicians
"""
import re

from flask import Blueprint, current_app, jsonify, request
from flask_login import login_required, current_user
from sqlalchemy.exc import SQLAlchemyError
from backend.models import db, User, ExerciseSession
from backend.services.authorization import get_authorized_patient, patient_not_found

patients_bp = Blueprint("patients", __name__)
EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)
UNASSIGNABLE_PATIENT_MESSAGE = (
    "Unable to assign this email. Verify the registered patient email; "
    "transfers from another therapist are not supported."
)


@patients_bp.route("/assign", methods=["POST"])
@login_required
def assign_patient():
    """Assign an existing patient by exact registered email without transfers."""
    if current_user.role != "therapist":
        return jsonify({"error": "Unauthorized"}), 403

    if not request.is_json:
        return jsonify({"error": "Expected a JSON object containing only email"}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON request"}), 400
    if set(data) != {"email"}:
        return jsonify({"error": "Request must contain only email"}), 400

    email = data["email"]
    if (
        not isinstance(email, str)
        or len(email) > 254
        or not EMAIL_PATTERN.fullmatch(email)
    ):
        return jsonify({"error": "Enter a valid patient email address"}), 400

    patient = User.query.filter_by(email=email, role="patient").first()
    if patient is None or (
        patient.assigned_therapist_id is not None
        and patient.assigned_therapist_id != current_user.id
    ):
        return jsonify({"error": UNASSIGNABLE_PATIENT_MESSAGE}), 404

    if patient.assigned_therapist_id == current_user.id:
        return jsonify({"assigned": True, "already_assigned": True}), 200

    try:
        # The conditional update prevents concurrent requests from transferring
        # a patient after both therapists initially observe an unassigned row.
        updated = User.query.filter_by(
            id=patient.id,
            role="patient",
            assigned_therapist_id=None,
        ).update(
            {"assigned_therapist_id": current_user.id},
            synchronize_session=False,
        )
        if not updated:
            db.session.rollback()
            patient = User.query.filter_by(id=patient.id, role="patient").first()
            if patient and patient.assigned_therapist_id == current_user.id:
                return jsonify({"assigned": True, "already_assigned": True}), 200
            return jsonify({"error": UNASSIGNABLE_PATIENT_MESSAGE}), 404

        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("Failed to assign patient to therapist")
        return jsonify({"error": "Unable to assign patient right now"}), 500

    return jsonify({"assigned": True, "already_assigned": False}), 201

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

    patient = get_authorized_patient(patient_id)
    if patient is None:
        return patient_not_found()

    sessions = ExerciseSession.query.filter_by(patient_id=patient.id).order_by(ExerciseSession.started_at.desc()).all()
    return jsonify([s.to_dict() for s in sessions])

@patients_bp.route("/<int:patient_id>/severity", methods=["PUT"])
@login_required
def update_patient_severity(patient_id):
    """Allows therapists to adjust patient recovery severity levels."""
    if current_user.role != "therapist":
        return jsonify({"error": "Unauthorized"}), 403

    patient = get_authorized_patient(patient_id)
    if patient is None:
        return patient_not_found()

    data = request.get_json() or {}
    
    new_severity = data.get("severity_level")
    if new_severity is not None:
        patient.severity_level = max(1, min(5, int(new_severity)))
        db.session.commit()
        return jsonify({"message": "Severity adjusted successfully", "patient": patient.to_dict(include_medical=True)})
        
    return jsonify({"error": "Invalid severity_level"}), 400
