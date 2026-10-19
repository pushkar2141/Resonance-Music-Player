"""Resonance — Feel Every Frequency (Liquid Crystal Edition) Flask Application Factory."""
import socket
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
from config import Config
from database.db import close_db, init_db
from routes.pages import pages_bp


def get_lan_ip() -> str:
    """Detect the primary LAN IPv4 address for mobile Wi-Fi testing."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
    except OSError:
        ip = "127.0.0.1"
    finally:
        sock.close()
    return ip


def create_app() -> Flask:
    """Create and configure the Resonance Flask application."""
    Config.ensure_directories()
    init_db()

    # Seed initial demo library if empty (Phase 4+ seed_demo service)
    try:
        from services.seed_demo import ensure_demo_tracks
        ensure_demo_tracks()
    except Exception as e:
        app.logger.warning("Demo tracks seeding skipped: %s", e)

    app = Flask(
        __name__,
        static_folder=str(Config.STATIC_DIR),
        template_folder=str(Config.TEMPLATES_DIR),
    )
    app.config.from_object(Config)

    # Register teardown handler
    app.teardown_appcontext(close_db)

    # Security and Range-friendly headers
    @app.after_request
    def apply_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return response

    # Consistent JSON error responses for /api/* routes
    @app.errorhandler(413)
    def request_entity_too_large(_err):
        max_mb = Config.MAX_CONTENT_LENGTH // (1024 * 1024)
        return (
            jsonify(
                {
                    "error": f"File exceeds the {max_mb} MB upload size limit.",
                    "code": "FILE_TOO_LARGE",
                }
            ),
            413,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        return (
            jsonify(
                {
                    "error": err.description or err.name,
                    "code": err.name.upper().replace(" ", "_"),
                }
            ),
            err.code or 500,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_exception(err: Exception):
        app.logger.exception("Unhandled server exception: %s", err)
        return (
            jsonify(
                {
                    "error": "An unexpected server error occurred.",
                    "detail": str(err),
                    "code": "INTERNAL_SERVER_ERROR",
                }
            ),
            500,
        )

    # Register core pages blueprint
    app.register_blueprint(pages_bp)

    # Dynamically register API blueprints as phases are built
    for mod_name, bp_name in [
        ("routes.songs", "songs_bp"),
        ("routes.favorites", "favorites_bp"),
        ("routes.playlists", "playlists_bp"),
        ("routes.history", "history_bp"),
        ("routes.settings", "settings_bp"),
        ("routes.palettes", "palettes_bp"),
    ]:
        try:
            mod = __import__(mod_name, fromlist=[bp_name])
            app.register_blueprint(getattr(mod, bp_name))
        except ImportError:
            pass

    return app


app = create_app()

if __name__ == "__main__":
    lan_ip = get_lan_ip()
    port = Config.PORT
    print("\n" + "=" * 66)
    print(f"  {Config.APP_NAME.upper()} :: {Config.TAGLINE} (Liquid Crystal Edition)")
    print("=" * 66)
    print(f"  Local Desktop URL : http://127.0.0.1:{port}")
    print(f"  Mobile / LAN URL  : http://{lan_ip}:{port}")
    print(f"  Styleguide URL    : http://127.0.0.1:{port}/styleguide")
    print("=" * 66 + "\n")
    app.run(host=Config.HOST, port=port, debug=Config.DEBUG, threaded=True)
