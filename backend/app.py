"""
NeuroMotion AI - Backend Server Entrypoint
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_login import LoginManager
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from backend.config import Config
from backend.models import db, User, Exercise
from backend.services.exercise_programs import seed_exercises

# Blueprints
from backend.routes.auth import auth_bp
from backend.routes.exercises import exercises_bp
from backend.routes.sessions import sessions_bp
from backend.routes.patients import patients_bp


PROJECTED_ELBOW_ANGLE_COLUMN = "projected_elbow_angle_data_json"


class _RequiredSchemaMigrationError(RuntimeError):
    """A required schema upgrade failed while the database was reachable."""


def _database_is_available(engine):
    try:
        with engine.connect() as connection:
            connection.execute(db.text("SELECT 1"))
        return True
    except SQLAlchemyError:
        return False


def _ensure_projected_elbow_angle_column(engine):
    """Idempotently add the optional session column to existing databases."""
    try:
        with engine.begin() as connection:
            columns = {
                column["name"]
                for column in inspect(connection).get_columns("exercise_sessions")
            }
            if PROJECTED_ELBOW_ANGLE_COLUMN in columns:
                return False
            connection.execute(
                db.text(
                    "ALTER TABLE exercise_sessions "
                    f"ADD COLUMN {PROJECTED_ELBOW_ANGLE_COLUMN} TEXT NULL"
                )
            )
            return True
    except SQLAlchemyError:
        # Multiple application workers may race on first startup. Suppress an
        # ALTER error only when another worker successfully added this column.
        columns = {
            column["name"]
            for column in inspect(engine).get_columns("exercise_sessions")
        }
        if PROJECTED_ELBOW_ANGLE_COLUMN in columns:
            return False
        raise


def _ensure_projected_elbow_angle_column_or_defer(engine):
    try:
        return _ensure_projected_elbow_angle_column(engine)
    except SQLAlchemyError as exc:
        if _database_is_available(engine):
            raise _RequiredSchemaMigrationError(
                "Required projected elbow-angle database migration failed"
            ) from exc
        raise


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Allow cross-origin requests with credentials for local dev and production.
    # NOTE: Browsers REQUIRE an exact origin echo + `Access-Control-Allow-Credentials: true`
    # for credentialed requests — wildcard ("*") origins can never work here. If
    # FRONTEND_URL is unset or misconfigured to "*", we fall back to known origins
    # instead of silently disabling credential support.
    frontend_url = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
    if not frontend_url or frontend_url == "*":
        frontend_url = None
    origins = [
        frontend_url,
        "https://neuromotion-frontend.onrender.com",  # deployed frontend fallback
        "http://localhost:5173",                       # Vite dev server
        "http://localhost:3000",
    ]
    CORS(app, supports_credentials=True, origins=[o for o in origins if o])

    # Initialize Database
    db.init_app(app)

    # Initialize Login Manager
    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Unauthorized session, login required"}), 401

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(exercises_bp, url_prefix="/api/exercises")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(patients_bp, url_prefix="/api/patients")

    # Global status route — also reports database connectivity so a bad
    # DATABASE_URL is visible from outside without digging through logs.
    # The error detail is credential-redacted before exposure.
    @app.route("/api/health")
    def health():
        db_status = "connected"
        db_error = None
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception as exc:
            db_status = "unavailable"
            import re
            msg = str(exc)
            # Redact anything credential-shaped: URI userinfo and key=value pairs
            msg = re.sub(r"[a-z+]+://[^@/\s]+@", "***@", msg)
            msg = re.sub(r"(password|user)[=:]\S+", r"\1=***", msg, flags=re.IGNORECASE)
            db_error = f"{type(exc).__name__}: {msg[:1200]}"
        payload = {"status": "healthy", "service": "NeuroMotion AI API", "database": db_status}
        if db_error:
            payload["database_error"] = db_error
        return jsonify(payload)

    # Setup database and seed exercises.
    # A bad/unreachable DATABASE_URL must NOT crash-loop the whole service:
    # log the real cause loudly (visible in Render logs) and keep serving so
    # /api/health can report `database: unavailable` for easy diagnosis.
    with app.app_context():
        try:
            db.create_all()
            _ensure_projected_elbow_angle_column_or_defer(db.engine)
            seed_exercises(db, Exercise)
        except _RequiredSchemaMigrationError:
            raise
        except Exception as exc:
            import sys
            print(f"[STARTUP WARNING] Database setup failed — check DATABASE_URL!", file=sys.stderr, flush=True)
            print(f"[STARTUP WARNING] {exc!r}", file=sys.stderr, flush=True)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
