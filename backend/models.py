"""
Database Models for NeuroMotion AI Stroke Rehabilitation System
Includes: User (Patient/Therapist), Exercise, ExerciseSession, Achievement
"""
import json
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()


class User(db.Model, UserMixin):
    """
    Unified User model supporting both Patient and Therapist roles.
    Patients have stroke-specific medical fields; Therapists have credentials.
    """
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="patient")  # 'patient' or 'therapist'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime)

    # --- Patient-specific fields ---
    stroke_type = db.Column(db.String(30))       # ischemic, hemorrhagic, tia, brainstem
    affected_side = db.Column(db.String(10))      # left, right
    severity_level = db.Column(db.Integer, default=3)  # 1=severe ... 5=recovered
    date_of_stroke = db.Column(db.Date)
    assigned_therapist_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # --- Therapist-specific fields ---
    specialization = db.Column(db.String(100))
    license_number = db.Column(db.String(50))

    # --- Gamification ---
    points = db.Column(db.Integer, default=0)
    streak_count = db.Column(db.Integer, default=0)
    last_session_date = db.Column(db.Date)
    badges_json = db.Column(db.Text, default="[]")

    # --- Relationships ---
    sessions = db.relationship("ExerciseSession", backref="patient", lazy="dynamic",
                               foreign_keys="ExerciseSession.patient_id")
    achievements = db.relationship("Achievement", backref="patient", lazy="dynamic")
    assigned_patients = db.relationship("User", backref=db.backref("therapist", remote_side="User.id"),
                                        foreign_keys=[assigned_therapist_id])

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    @property
    def badges(self):
        try:
            return json.loads(self.badges_json or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    @badges.setter
    def badges(self, value):
        self.badges_json = json.dumps(value)

    def to_dict(self, include_medical=False):
        data = {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "points": self.points,
            "streak_count": self.streak_count,
            "badges": self.badges,
        }
        if include_medical and self.role == "patient":
            data.update({
                "stroke_type": self.stroke_type,
                "affected_side": self.affected_side,
                "severity_level": self.severity_level,
                "date_of_stroke": self.date_of_stroke.isoformat() if self.date_of_stroke else None,
                "assigned_therapist_id": self.assigned_therapist_id,
            })
        if self.role == "therapist":
            data.update({
                "specialization": self.specialization,
                "license_number": self.license_number,
            })
        return data


class Exercise(db.Model):
    """Pre-defined exercise templates organized by level."""
    __tablename__ = "exercises"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50))           # rom, coordination, speed, precision
    level = db.Column(db.Integer, nullable=False)  # 1=Basic, 2=Moderate, 3=High
    level_name = db.Column(db.String(20))          # Basic, Moderate, High
    target_positions_json = db.Column(db.Text, default="[]")
    duration_seconds = db.Column(db.Integer, default=60)
    instructions = db.Column(db.Text)
    suitable_stroke_types_json = db.Column(db.Text, default='["ischemic","hemorrhagic","tia","brainstem"]')
    min_severity = db.Column(db.Integer, default=1)
    max_severity = db.Column(db.Integer, default=5)
    icon_name = db.Column(db.String(30), default="activity")
    target_radius = db.Column(db.Float, default=5.0)
    speed_requirement = db.Column(db.String(20), default="normal")  # slow, normal, fast

    @property
    def target_positions(self):
        try:
            return json.loads(self.target_positions_json or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def suitable_stroke_types(self):
        try:
            return json.loads(self.suitable_stroke_types_json or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "level": self.level,
            "level_name": self.level_name,
            "target_positions": self.target_positions,
            "duration_seconds": self.duration_seconds,
            "instructions": self.instructions,
            "suitable_stroke_types": self.suitable_stroke_types,
            "min_severity": self.min_severity,
            "max_severity": self.max_severity,
            "icon_name": self.icon_name,
            "target_radius": self.target_radius,
            "speed_requirement": self.speed_requirement,
        }


class ExerciseSession(db.Model):
    """Records a completed exercise session for a patient."""
    __tablename__ = "exercise_sessions"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercises.id"), nullable=False)
    started_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer, default=0)

    # --- Performance Metrics ---
    avg_accuracy_score = db.Column(db.Float, default=0.0)
    max_rom_achieved = db.Column(db.Float, default=0.0)     # degrees
    targets_hit = db.Column(db.Integer, default=0)
    total_targets = db.Column(db.Integer, default=0)
    avg_joint_velocity = db.Column(db.Float, default=0.0)
    movement_smoothness_score = db.Column(db.Float, default=0.0)  # 0-100
    overall_score = db.Column(db.Float, default=0.0)
    level_played = db.Column(db.Integer, default=1)

    # --- Time-series data ---
    joint_angle_data_json = db.Column(db.Text, default="[]")
    notes = db.Column(db.Text)

    # --- Relationship ---
    exercise = db.relationship("Exercise", backref="sessions")

    @property
    def joint_angle_data(self):
        try:
            return json.loads(self.joint_angle_data_json or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "exercise_id": self.exercise_id,
            "exercise_name": self.exercise.name if self.exercise else None,
            "exercise_level": self.exercise.level if self.exercise else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_seconds": self.duration_seconds,
            "avg_accuracy_score": self.avg_accuracy_score,
            "max_rom_achieved": self.max_rom_achieved,
            "targets_hit": self.targets_hit,
            "total_targets": self.total_targets,
            "avg_joint_velocity": self.avg_joint_velocity,
            "movement_smoothness_score": self.movement_smoothness_score,
            "overall_score": self.overall_score,
            "level_played": self.level_played,
            "joint_angle_data": self.joint_angle_data,
            "notes": self.notes,
        }


class Achievement(db.Model):
    """Earned badges / achievements for gamification."""
    __tablename__ = "achievements"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    badge_name = db.Column(db.String(50), nullable=False)
    badge_description = db.Column(db.String(200))
    earned_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "badge_name": self.badge_name,
            "badge_description": self.badge_description,
            "earned_at": self.earned_at.isoformat() if self.earned_at else None,
        }
