"""
Configuration for NeuroMotion AI - Stroke Rehabilitation System
"""
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# In production (Render) the frontend and backend run on different
# *.onrender.com subdomains. Browsers treat those as CROSS-SITE origins
# (onrender.com is on the Public Suffix List), so the session cookie must be
# marked `SameSite=None; Secure` to be stored and sent — otherwise every
# authenticated API request returns 401 and the Exercise Library renders empty.
_is_https_frontend = os.environ.get("FRONTEND_URL", "").startswith("https://")
_on_render = os.environ.get("RENDER", "").lower() == "true"
IS_PRODUCTION = _is_https_frontend or _on_render


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "neuromotion-ai-dev-secret-key-2026")
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'rehab_system.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # NOTE: "None" here is the SameSite *string*, not Python None.
    SESSION_COOKIE_SAMESITE = "None" if IS_PRODUCTION else "Lax"
    SESSION_COOKIE_SECURE = IS_PRODUCTION  # Secure requires HTTPS — Render serves HTTPS
    SESSION_COOKIE_HTTPONLY = True
    CORS_SUPPORTS_CREDENTIALS = True
