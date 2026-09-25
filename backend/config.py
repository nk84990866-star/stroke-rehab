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

    # --- Database ---
    # Production (Render/Neon): DATABASE_URL points at managed Postgres so data
    # survives deploys and free-tier restarts. Local dev (no DATABASE_URL):
    # falls back to the SQLite file so the app runs with zero setup.
    _database_url = os.environ.get("DATABASE_URL", "").strip().strip('"').strip("'")
    # Some providers (older Heroku-style URLs) emit `postgres://` — SQLAlchemy
    # requires the `postgresql://` scheme, so normalize it here.
    if _database_url.startswith("postgres://"):
        _database_url = _database_url.replace("postgres://", "postgresql://", 1)
    # Drop `channel_binding=require`: it is optional hardening that can break
    # connections depending on the libpq bundled with psycopg2, and a failed
    # startup is far worse than skipping this extra TLS check.
    _database_url = _database_url.replace("&channel_binding=require", "").replace("?channel_binding=require", "")
    SQLALCHEMY_DATABASE_URI = _database_url or f"sqlite:///{os.path.join(BASE_DIR, 'rehab_system.db')}"

    # pool_pre_ping drops dead connections before use — needed for serverless
    # Postgres (Neon) which closes idle connections while a free-tier web
    # service is waking up.
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # NOTE: "None" here is the SameSite *string*, not Python None.
    SESSION_COOKIE_SAMESITE = "None" if IS_PRODUCTION else "Lax"
    SESSION_COOKIE_SECURE = IS_PRODUCTION  # Secure requires HTTPS — Render serves HTTPS
    SESSION_COOKIE_HTTPONLY = True
    CORS_SUPPORTS_CREDENTIALS = True
