"""
Authentication Blueprints for NeuroMotion AI
"""
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from datetime import datetime
from backend.models import db, User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")
    role = data.get("role", "patient")

    if not email or not password or not full_name:
        return jsonify({"error": "Missing required fields"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User already exists with this email"}), 400

    user = User(
        email=email,
        full_name=full_name,
        role=role
    )
    user.set_password(password)

    if role == "patient":
        user.stroke_type = data.get("stroke_type")
        user.affected_side = data.get("affected_side")
        user.severity_level = int(data.get("severity_level", 3))
        
        date_str = data.get("date_of_stroke")
        if date_str:
            try:
                user.date_of_stroke = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                pass
    elif role == "therapist":
        user.specialization = data.get("specialization")
        user.license_number = data.get("license_number")

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully", "user": user.to_dict(include_medical=True)}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    login_user(user)
    user.last_login = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Logged in successfully", "user": user.to_dict(include_medical=True)})

@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"})

@auth_bp.route("/me", methods=["GET"])
def me():
    if not current_user.is_authenticated:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "user": current_user.to_dict(include_medical=True)})

@auth_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    data = request.get_json() or {}
    user = current_user

    user.full_name = data.get("full_name", user.full_name)

    if user.role == "patient":
        user.stroke_type = data.get("stroke_type", user.stroke_type)
        user.affected_side = data.get("affected_side", user.affected_side)
        user.severity_level = int(data.get("severity_level", user.severity_level))
        
        date_str = data.get("date_of_stroke")
        if date_str:
            try:
                user.date_of_stroke = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                pass
    elif user.role == "therapist":
        user.specialization = data.get("specialization", user.specialization)
        user.license_number = data.get("license_number", user.license_number)

    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "user": user.to_dict(include_medical=True)})
