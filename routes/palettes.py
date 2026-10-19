"""Palettes REST API: get and cache extracted artwork palettes in SQLite."""
from flask import Blueprint, jsonify, request
from database.db import execute_sql, query_one

palettes_bp = Blueprint("palettes", __name__)


@palettes_bp.route("/api/palettes/<int:song_id>", methods=["GET"])
def get_cached_palette(song_id: int):
    """Return the cached 3-color artwork palette for a song if present."""
    row = query_one("SELECT * FROM palettes WHERE song_id = ?", (song_id,))
    if not row:
        return jsonify({"palette": None}), 404
    return jsonify(
        {
            "palette": {
                "song_id": row["song_id"],
                "art_1": row["art_1"],
                "art_2": row["art_2"],
                "art_3": row["art_3"],
                "is_procedural": bool(row["is_procedural"]),
            }
        }
    )


@palettes_bp.route("/api/palettes/<int:song_id>", methods=["POST", "PUT"])
def save_cached_palette(song_id: int):
    """Store client-extracted dominant artwork colors in SQLite."""
    song = query_one("SELECT id FROM songs WHERE id = ?", (song_id,))
    if not song:
        return jsonify({"error": "Song not found.", "code": "NOT_FOUND"}), 404

    data = request.get_json(silent=True) or {}
    art_1 = str(data.get("art_1") or "#6aa8ff").strip()
    art_2 = str(data.get("art_2") or "#c4a1ff").strip()
    art_3 = str(data.get("art_3") or "#3b6fe0").strip()

    execute_sql(
        """
        INSERT INTO palettes (song_id, art_1, art_2, art_3, is_procedural, updated_at)
        VALUES (?, ?, ?, ?, 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        ON CONFLICT(song_id) DO UPDATE SET
          art_1 = excluded.art_1,
          art_2 = excluded.art_2,
          art_3 = excluded.art_3,
          is_procedural = 0,
          updated_at = excluded.updated_at
        """,
        (song_id, art_1, art_2, art_3),
    )
    return jsonify({"saved": True, "song_id": song_id, "art_1": art_1, "art_2": art_2, "art_3": art_3})
