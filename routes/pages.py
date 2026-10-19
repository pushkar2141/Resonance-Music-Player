"""Page routes, health check, styleguide, and PWA root asset serving."""
from flask import Blueprint, jsonify, render_template, send_from_directory
from config import Config
from database.db import query_one

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
def index():
    """Render the single-page application shell."""
    return render_template("index.html")


@pages_bp.route("/styleguide")
@pages_bp.route("/dev/styleguide")
def styleguide():
    """Render the interactive Liquid Crystal Design System & 6-Palette Styleguide."""
    return render_template("styleguide.html")


@pages_bp.route("/api/health")
def health():
    """Return server and database health status."""
    row = query_one("SELECT COUNT(*) AS count FROM songs")
    palette_row = query_one("SELECT value FROM settings WHERE key = ?", ("palette",))
    mode_row = query_one("SELECT value FROM settings WHERE key = ?", ("theme_mode",))
    return jsonify(
        {
            "status": "ok",
            "app": Config.APP_NAME,
            "tagline": Config.TAGLINE,
            "edition": "Liquid Crystal",
            "songs_count": row["count"] if row else 0,
            "default_palette": palette_row["value"] if palette_row else "ice",
            "default_mode": mode_row["value"] if mode_row else "light",
        }
    )


@pages_bp.route("/manifest.webmanifest")
def manifest():
    """Serve the PWA Web App Manifest from root scope."""
    return send_from_directory(
        Config.STATIC_DIR,
        "manifest.webmanifest",
        mimetype="application/manifest+json",
    )


@pages_bp.route("/sw.js")
def service_worker():
    """Serve the Service Worker script from root scope."""
    response = send_from_directory(
        Config.STATIC_DIR,
        "sw.js",
        mimetype="application/javascript",
    )
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response


@pages_bp.route("/favicon.ico")
def favicon():
    """Serve SVG favicon cleanly for browsers requesting /favicon.ico."""
    return send_from_directory(
        Config.STATIC_DIR / "images",
        "favicon.svg",
        mimetype="image/svg+xml",
    )
