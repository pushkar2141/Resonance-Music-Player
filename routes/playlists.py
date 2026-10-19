"""Playlists REST API: CRUD, add/remove tracks, reorder tracks, and 2x2 mosaic covers."""
from typing import Any, Dict, List
from flask import Blueprint, jsonify, request
from database.db import execute_sql, get_db, query_all, query_one
from routes.songs import _serialize_song

playlists_bp = Blueprint("playlists", __name__)


def _serialize_playlist_summary(pl_row: Dict[str, Any]) -> Dict[str, Any]:
    """Attach track count and first 4 cover URLs for 2x2 mosaic artwork."""
    pid = pl_row["id"]
    song_rows = query_all(
        """
        SELECT s.id
        FROM playlist_songs ps
        JOIN songs s ON s.id = ps.song_id
        WHERE ps.playlist_id = ?
        ORDER BY ps.position ASC, ps.id ASC
        """,
        (pid,),
    )
    covers = [f"/api/songs/{r['id']}/cover" for r in song_rows[:4]]
    return {
        "id": pid,
        "name": pl_row["name"],
        "description": pl_row["description"] or "",
        "song_count": len(song_rows),
        "mosaic_covers": covers,
        "created_at": pl_row["created_at"],
        "updated_at": pl_row["updated_at"],
    }


@playlists_bp.route("/api/playlists", methods=["GET"])
def list_playlists():
    """Return all playlists with track counts and mosaic cover URLs."""
    rows = query_all("SELECT * FROM playlists ORDER BY updated_at DESC, id DESC")
    return jsonify({"playlists": [_serialize_playlist_summary(r) for r in rows]})


@playlists_bp.route("/api/playlists", methods=["POST"])
def create_playlist():
    """Create a new playlist."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    if not name:
        return jsonify({"error": "Playlist name is required.", "code": "INVALID_NAME"}), 400

    pid = execute_sql(
        "INSERT INTO playlists (name, description) VALUES (?, ?)",
        (name[:80], description[:240]),
    )
    row = query_one("SELECT * FROM playlists WHERE id = ?", (pid,))
    return jsonify({"playlist": _serialize_playlist_summary(row)}), 201


@playlists_bp.route("/api/playlists/<int:playlist_id>", methods=["GET"])
def get_playlist_detail(playlist_id: int):
    """Return a playlist along with its ordered songs."""
    row = query_one("SELECT * FROM playlists WHERE id = ?", (playlist_id,))
    if not row:
        return jsonify({"error": "Playlist not found.", "code": "NOT_FOUND"}), 404

    summary = _serialize_playlist_summary(row)
    song_rows = query_all(
        """
        SELECT
          s.*,
          ps.position,
          CASE WHEN f.song_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
          p.art_1, p.art_2, p.art_3, p.is_procedural
        FROM playlist_songs ps
        JOIN songs s ON s.id = ps.song_id
        LEFT JOIN favorites f ON f.song_id = s.id
        LEFT JOIN palettes p ON p.song_id = s.id
        WHERE ps.playlist_id = ?
        ORDER BY ps.position ASC, ps.id ASC
        """,
        (playlist_id,),
    )
    summary["songs"] = [_serialize_song(r) for r in song_rows]
    return jsonify({"playlist": summary})


@playlists_bp.route("/api/playlists/<int:playlist_id>", methods=["PATCH", "PUT"])
def update_playlist(playlist_id: int):
    """Rename or update description of a playlist."""
    row = query_one("SELECT * FROM playlists WHERE id = ?", (playlist_id,))
    if not row:
        return jsonify({"error": "Playlist not found.", "code": "NOT_FOUND"}), 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or row["name"]).strip()
    description = (data.get("description") if "description" in data else row["description"] or "").strip()

    execute_sql(
        """
        UPDATE playlists
        SET name = ?, description = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = ?
        """,
        (name[:80], description[:240], playlist_id),
    )
    updated = query_one("SELECT * FROM playlists WHERE id = ?", (playlist_id,))
    return jsonify({"playlist": _serialize_playlist_summary(updated)})


@playlists_bp.route("/api/playlists/<int:playlist_id>", methods=["DELETE"])
def delete_playlist(playlist_id: int):
    """Delete a playlist."""
    row = query_one("SELECT id FROM playlists WHERE id = ?", (playlist_id,))
    if not row:
        return jsonify({"error": "Playlist not found.", "code": "NOT_FOUND"}), 404

    execute_sql("DELETE FROM playlists WHERE id = ?", (playlist_id,))
    return jsonify({"deleted": True, "id": playlist_id})


@playlists_bp.route("/api/playlists/<int:playlist_id>/tracks", methods=["POST"])
@playlists_bp.route("/api/playlists/<int:playlist_id>/songs", methods=["POST"])
def add_track_to_playlist(playlist_id: int):
    """Add one or more songs to a playlist."""
    pl = query_one("SELECT id FROM playlists WHERE id = ?", (playlist_id,))
    if not pl:
        return jsonify({"error": "Playlist not found.", "code": "NOT_FOUND"}), 404

    data = request.get_json(silent=True) or {}
    song_ids: List[int] = []
    if "song_id" in data:
        song_ids.append(int(data["song_id"]))
    if "song_ids" in data and isinstance(data["song_ids"], list):
        song_ids.extend(int(x) for x in data["song_ids"])

    if not song_ids:
        return jsonify({"error": "No song_id provided.", "code": "MISSING_SONG_ID"}), 400

    max_pos_row = query_one(
        "SELECT COALESCE(MAX(position), -1) AS max_pos FROM playlist_songs WHERE playlist_id = ?",
        (playlist_id,),
    )
    next_pos = (max_pos_row["max_pos"] if max_pos_row else -1) + 1

    added = 0
    for sid in song_ids:
        existing = query_one(
            "SELECT id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?",
            (playlist_id, sid),
        )
        if not existing:
            execute_sql(
                "INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)",
                (playlist_id, sid, next_pos),
            )
            next_pos += 1
            added += 1

    execute_sql(
        "UPDATE playlists SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
        (playlist_id,),
    )
    return jsonify({"added": added, "playlist_id": playlist_id})


@playlists_bp.route("/api/playlists/<int:playlist_id>/tracks/<int:song_id>", methods=["DELETE"])
@playlists_bp.route("/api/playlists/<int:playlist_id>/songs/<int:song_id>", methods=["DELETE"])
def remove_track_from_playlist(playlist_id: int, song_id: int):
    """Remove a song from a playlist."""
    execute_sql(
        "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?",
        (playlist_id, song_id),
    )
    execute_sql(
        "UPDATE playlists SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
        (playlist_id,),
    )
    return jsonify({"removed": True, "playlist_id": playlist_id, "song_id": song_id})


@playlists_bp.route("/api/playlists/<int:playlist_id>/reorder", methods=["PUT", "POST"])
def reorder_playlist_tracks(playlist_id: int):
    """Update the ordered list of song_ids in a playlist."""
    data = request.get_json(silent=True) or {}
    song_ids = data.get("song_ids") or []
    if not isinstance(song_ids, list):
        return jsonify({"error": "song_ids must be an array.", "code": "INVALID_ORDER"}), 400

    db = get_db()
    for idx, sid in enumerate(song_ids):
        db.execute(
            "UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?",
            (idx, playlist_id, int(sid)),
        )
    db.execute(
        "UPDATE playlists SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
        (playlist_id,),
    )
    db.commit()
    return jsonify({"reordered": True, "playlist_id": playlist_id})
