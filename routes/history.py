"""Play history & Personal Discover smart aggregation REST API."""
from flask import Blueprint, jsonify, request
from database.db import execute_sql, query_all, query_one
from routes.songs import _serialize_song

history_bp = Blueprint("history", __name__)


@history_bp.route("/api/history", methods=["GET"])
def get_history():
    """Return chronological list of recently played songs (deduplicated by most recent play)."""
    rows = query_all(
        """
        SELECT
          s.*,
          MAX(h.played_at) AS played_at,
          CASE WHEN f.song_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
          p.art_1, p.art_2, p.art_3, p.is_procedural
        FROM history h
        JOIN songs s ON s.id = h.song_id
        LEFT JOIN favorites f ON f.song_id = s.id
        LEFT JOIN palettes p ON p.song_id = s.id
        GROUP BY s.id
        ORDER BY played_at DESC
        LIMIT 50
        """
    )
    return jsonify({"history": [_serialize_song(r) for r in rows]})


@history_bp.route("/api/history", methods=["POST"])
def record_play():
    """Record a track play event and increment play_count."""
    data = request.get_json(silent=True) or {}
    song_id = data.get("song_id")
    if not song_id:
        return jsonify({"error": "song_id is required.", "code": "MISSING_SONG_ID"}), 400

    song = query_one("SELECT id FROM songs WHERE id = ?", (int(song_id),))
    if not song:
        return jsonify({"error": "Song not found.", "code": "NOT_FOUND"}), 404

    execute_sql("INSERT INTO history (song_id) VALUES (?)", (int(song_id),))
    execute_sql(
        """
        UPDATE songs
        SET play_count = play_count + 1,
            last_played_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = ?
        """,
        (int(song_id),),
    )
    updated = query_one("SELECT play_count, last_played_at FROM songs WHERE id = ?", (int(song_id),))
    return jsonify(
        {
            "recorded": True,
            "song_id": int(song_id),
            "play_count": updated["play_count"] if updated else 1,
        }
    )


@history_bp.route("/api/history", methods=["DELETE"])
def clear_history():
    """Clear listening history."""
    execute_sql("DELETE FROM history")
    return jsonify({"cleared": True})


@history_bp.route("/api/discover", methods=["GET"])
def get_discover_data():
    """Build Discover smart sections strictly from the user's own uploaded library."""
    most_played_rows = query_all(
        """
        SELECT
          s.*,
          CASE WHEN f.song_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
          p.art_1, p.art_2, p.art_3, p.is_procedural
        FROM songs s
        LEFT JOIN favorites f ON f.song_id = s.id
        LEFT JOIN palettes p ON p.song_id = s.id
        ORDER BY s.play_count DESC, s.created_at DESC
        LIMIT 8
        """
    )

    forgotten_rows = query_all(
        """
        SELECT
          s.*,
          CASE WHEN f.song_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
          p.art_1, p.art_2, p.art_3, p.is_procedural
        FROM songs s
        LEFT JOIN favorites f ON f.song_id = s.id
        LEFT JOIN palettes p ON p.song_id = s.id
        ORDER BY s.play_count ASC, COALESCE(s.last_played_at, '') ASC, s.created_at ASC
        LIMIT 8
        """
    )

    artist_rows = query_all(
        """
        SELECT artist, COUNT(*) AS track_count
        FROM songs
        GROUP BY artist COLLATE NOCASE
        ORDER BY track_count DESC, artist COLLATE NOCASE ASC
        LIMIT 12
        """
    )

    return jsonify(
        {
            "most_played": [_serialize_song(r) for r in most_played_rows],
            "forgotten_gems": [_serialize_song(r) for r in forgotten_rows],
            "artists": artist_rows,
        }
    )
