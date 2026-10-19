"""Settings REST API: persist Appearance, Playback, Visualizer, Equalizer, and Motion settings."""
from flask import Blueprint, jsonify, request
from database.db import get_db, query_all

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/api/settings", methods=["GET"])
def get_settings():
    """Return all key-value settings from SQLite."""
    rows = query_all("SELECT key, value FROM settings")
    settings_dict = {r["key"]: r["value"] for r in rows}
    return jsonify({"settings": settings_dict})


@settings_bp.route("/api/settings", methods=["PUT", "POST", "PATCH"])
def update_settings():
    """Update one or more settings in SQLite."""
    data = request.get_json(silent=True) or {}
    if "settings" in data and isinstance(data["settings"], dict):
        payload = data["settings"]
    else:
        payload = data

    db = get_db()
    for k, v in payload.items():
        if not isinstance(k, str):
            continue
        val_str = v if isinstance(v, str) else str(v)
        db.execute(
            """
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
            """,
            (k, val_str),
        )
    db.commit()

    rows = query_all("SELECT key, value FROM settings")
    return jsonify({"settings": {r["key"]: r["value"] for r in rows}})
