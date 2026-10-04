"""Authorization helpers for patient-owned rehabilitation data."""
from flask import jsonify, request
from flask_login import current_user

from backend.models import User


def requested_patient_id():
    """Use the logged-in patient's identity when no patient ID is requested."""
    patient_id = request.args.get("patient_id")
    if patient_id is None:
        return current_user.id if current_user.is_authenticated and current_user.role == "patient" else None
    try:
        return int(patient_id)
    except (TypeError, ValueError):
        return None


def get_authorized_patient(patient_id):
    """Resolve self-access or a therapist's assigned patient; otherwise deny."""
    if patient_id is None or not current_user.is_authenticated:
        return None

    if current_user.role == "patient":
        return current_user if current_user.id == patient_id else None

    if current_user.role == "therapist":
        return User.query.filter_by(
            id=patient_id,
            role="patient",
            assigned_therapist_id=current_user.id,
        ).first()

    return None


def patient_not_found():
    """Hide whether an inaccessible patient or session identifier exists."""
    return jsonify({"error": "Not found"}), 404
