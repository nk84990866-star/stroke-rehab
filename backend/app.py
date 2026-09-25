"""
NeuroMotion AI - Backend Server Entrypoint
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_login import LoginManager

from backend.config import Config
from backend.models import db, User, Exercise
from backend.services.exercise_programs import seed_exercises

# Blueprints
from backend.routes.auth import auth_bp
from backend.routes.exercises import exercises_bp
from backend.routes.sessions import sessions_bp
from backend.routes.patients import patients_bp

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
    @app.route("/api/health")
    def health():
        db_status = "connected"
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            db_status = "unavailable"
        return jsonify({"status": "healthy", "service": "NeuroMotion AI API", "database": db_status})

    # Setup database and seed exercises.
    # A bad/unreachable DATABASE_URL must NOT crash-loop the whole service:
    # log the real cause loudly (visible in Render logs) and keep serving so
    # /api/health can report `database: unavailable` for easy diagnosis.
    with app.app_context():
        try:
            db.create_all()
            seed_exercises(db, Exercise)
        except Exception as exc:
            import sys
            print(f"[STARTUP WARNING] Database setup failed — check DATABASE_URL!", file=sys.stderr, flush=True)
            print(f"[STARTUP WARNING] {exc!r}", file=sys.stderr, flush=True)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
