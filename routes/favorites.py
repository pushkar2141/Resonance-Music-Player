"""Favorites REST API: list and toggle song favorites."""
from flask import Blueprint, jsonify, request
from database.db import execute_sql, query_all, query_one
from routes.songs import _serialize_song

favorites_bp = Blueprint("favorites", __name__)


@favorites_bp.route("/api/favorites", methods=["GET"])
def list_favorites():
    """Return all favorited songs ordered by when they were liked."""
    rows = query_all(
        """
        SELECT
          s.*,
          1 AS is_favorite,
          p.art_1, p.art_2, p.art_3, p.is_procedural
        FROM favorites f
        JOIN songs s ON s.id = f.song_id
        LEFT JOIN palettes p ON p.song_id = s.id
        ORDER BY f.created_at DESC
        """
    )
    return jsonify({"favorites": [_serialize_song(r) for r in rows]})


@favorites_bp.route("/api/favorites/<int:song_id>", methods=["POST", "DELETE"])
def toggle_favorite(song_id: int):
    """Toggle or explicitly set favorite state for a song."""
    song = query_one("SELECT id FROM songs WHERE id = ?", (song_id,))
    if not song:
        return jsonify({"error": "Song not found.", "code": "NOT_FOUND"}), 404

    existing = query_one("SELECT song_id FROM favorites WHERE song_id = ?", (song_id,))
    if request.method == "DELETE" or existing:
        execute_sql("DELETE FROM favorites WHERE song_id = ?", (song_id,))
        is_fav = False
    else:
        execute_sql("INSERT OR IGNORE INTO favorites (song_id) VALUES (?)", (song_id,))
        is_fav = True

    return jsonify({"song_id": song_id, "is_favorite": is_fav})
