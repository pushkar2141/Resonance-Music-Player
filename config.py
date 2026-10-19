"""Application configuration for Resonance — Feel Every Frequency (Liquid Crystal Edition)."""
import os
import shutil
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
IS_VERCEL = bool(os.environ.get("VERCEL"))


class Config:
    """Centralized configuration for Flask, SQLite, and file storage."""

    APP_NAME = "Resonance"
    TAGLINE = "Feel Every Frequency."
    SECRET_KEY = os.environ.get("RESONANCE_SECRET_KEY", "resonance-liquid-crystal-key-2026")

    # Base directories
    BASE_DIR = BASE_DIR
    STATIC_DIR = BASE_DIR / "static"
    TEMPLATES_DIR = BASE_DIR / "templates"
    SCHEMA_PATH = BASE_DIR / "database" / "schema.sql"

    IS_VERCEL = IS_VERCEL

    if IS_VERCEL:
        # Vercel serverless has a read-only filesystem; writable state must live in /tmp
        RUNTIME_DIR = Path(tempfile.gettempdir()) / "resonance"
        DATABASE_DIR = RUNTIME_DIR / "database"
        DATABASE_PATH = DATABASE_DIR / "resonance.db"
        UPLOADS_DIR = RUNTIME_DIR / "uploads"
        COVERS_DIR = RUNTIME_DIR / "covers"
    else:
        RUNTIME_DIR = BASE_DIR
        DATABASE_DIR = BASE_DIR / "database"
        DATABASE_PATH = DATABASE_DIR / "resonance.db"
        UPLOADS_DIR = BASE_DIR / "uploads"
        COVERS_DIR = BASE_DIR / "covers"

    # Upload limits & allowed audio formats (150 MB max per request)
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_UPLOAD_MB", "150")) * 1024 * 1024
    ALLOWED_AUDIO_EXTENSIONS = {"mp3", "flac", "wav", "ogg", "m4a", "aac", "opus"}

    # Server network binding
    HOST = os.environ.get("HOST", "0.0.0.0")
    PORT = int(os.environ.get("PORT", "5000"))
    DEBUG = os.environ.get("FLASK_DEBUG", "0") == "1"

    @classmethod
    def ensure_directories(cls) -> None:
        """Create required runtime directories if they do not exist."""
        for folder in (cls.DATABASE_DIR, cls.UPLOADS_DIR, cls.COVERS_DIR):
            folder.mkdir(parents=True, exist_ok=True)

        if cls.IS_VERCEL:
            # Seed /tmp database from repository database if present
            bundled_db = cls.BASE_DIR / "database" / "resonance.db"
            if bundled_db.exists() and not cls.DATABASE_PATH.exists():
                shutil.copy2(bundled_db, cls.DATABASE_PATH)

            # Copy bundled uploads to /tmp so they can be read and written
            bundled_uploads = cls.BASE_DIR / "uploads"
            if bundled_uploads.exists():
                for item in bundled_uploads.glob("*"):
                    dest = cls.UPLOADS_DIR / item.name
                    if not dest.exists() and item.is_file():
                        shutil.copy2(item, dest)

            # Copy bundled covers to /tmp
            bundled_covers = cls.BASE_DIR / "covers"
            if bundled_covers.exists():
                for item in bundled_covers.glob("*"):
                    dest = cls.COVERS_DIR / item.name
                    if not dest.exists() and item.is_file():
                        shutil.copy2(item, dest)
