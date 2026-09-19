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

    # Allow cross-origin requests with credentials for local dev and production
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    CORS(app, supports_credentials=True, origins=[frontend_url, "http://localhost:3000"])

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

    # Global status route
    @app.route("/api/health")
    def health():
        return jsonify({"status": "healthy", "service": "NeuroMotion AI API"})

    # Setup database and seed exercises
    with app.app_context():
        db.create_all()
        seed_exercises(db, Exercise)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
