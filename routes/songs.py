"""Songs REST API: list, search, sort, upload, HTTP Range stream, cover art, metadata edit, delete."""
import json
from typing import Any, Dict, List
from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from config import Config
from database.db import execute_sql, query_all, query_one
from services.covers import extract_embedded_cover, generate_procedural_cover
from services.library import clear_entire_library, rescan_library_on_disk
from services.metadata import extract_audio_metadata
from services.validation import MIME_BY_EXT, validate_and_hash_upload

songs_bp = Blueprint("songs", __name__)


def _serialize_song(row: Dict[str, Any]) -> Dict[str, Any]:
    """Attach computed URLs and cached palette info to a song row dict."""
    song_id = row["id"]
    palette = None
    if row.get("art_1"):
        palette = {
            "art_1": row["art_1"],
            "art_2": row["art_2"],
            "art_3": row["art_3"],
            "is_procedural": bool(row.get("is_procedural")),
        }
    return {
        "id": song_id,
        "title": row["title"],
        "artist": row["artist"],
        "album": row["album"],
        "duration": float(row["duration"] or 0.0),
        "filename": row["filename"],
        "cover_filename": row["cover_filename"],
        "has_embedded_cover": bool(row["cover_filename"] and not str(row["cover_filename"]).endswith(".svg")),
        "cover_url": f"/api/songs/{song_id}/cover",
        "stream_url": f"/api/songs/{song_id}/stream",
        "file_hash": row["file_hash"],
        "file_size": int(row["file_size"] or 0),
        "mime_type": row["mime_type"],
        "mood": row["mood"] or "[]",
        "play_count": int(row["play_count"] or 0),
        "last_played_at": row["last_played_at"],
        "created_at": row["created_at"],
        "is_favorite": bool(row.get("is_favorite")),
        "palette": palette,
    }


def get_song_by_id(song_id: int):
    """Fetch a single serialized song with favorite and palette joins."""
    row = query_one(
        """
        SELECT
          s.*,
          CASE WHEN f.song_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
          p.art_1, p.art_2, p.art_3, p.is_procedural
        FROM songs s
        LEFT JOIN favorites f ON f.song_id = s.id
        LEFT JOIN palettes p ON p.song_id = s.id
        WHERE s.id = ?
        """,
        (song_id,),
    )
    return _serialize_song(row) if row else None


@songs_bp.route("/api/songs", methods=["GET"])
def list_songs():
    """List songs with optional search query, mood filter, and sort order."""
    q = (request.args.get("q") or "").strip()
    sort_by = request.args.get("sort", "created_at")
    sort_dir = "ASC" if request.args.get("dir", "desc").lower() == "asc" else "DESC"
    mood = (request.args.get("mood") or "").strip()

    sort_col_map = {
        "title": "s.title COLLATE NOCASE",
        "artist": "s.artist COLLATE NOCASE",
        "duration": "s.duration",
        "play_count": "s.play_count",
        "created_at": "s.created_at",
    }
    order_clause = f"{sort_col_map.get(sort_by, 's.created_at')} {sort_dir}, s.id DESC"

    where_clauses: List[str] = []
    params: List[Any] = []

    if q:
        like_q = f"%{q}%"
        where_clauses.append("(s.title LIKE ? OR s.artist LIKE ? OR s.album LIKE ?)")
        params.extend([like_q, like_q, like_q])

    if mood:
        where_clauses.append("s.mood LIKE ?")
        params.append(f"%{mood}%")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    rows = query_all(
        f"""
        SELECT
          s.*,
          CASE WHEN f.song_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
          p.art_1, p.art_2, p.art_3, p.is_procedural
        FROM songs s
        LEFT JOIN favorites f ON f.song_id = s.id
        LEFT JOIN palettes p ON p.song_id = s.id
        {where_sql}
        ORDER BY {order_clause}
        """,
        params,
    )
    return jsonify({"songs": [_serialize_song(r) for r in rows]})


@songs_bp.route("/api/songs/upload", methods=["POST"])
def upload_songs():
    """Validate, hash, extract metadata & cover, and store uploaded audio files."""
    files = request.files.getlist("files")
    if not files:
        single = request.files.get("file")
        if single:
            files = [single]

    if not files:
        return jsonify({"error": "No audio files provided in upload request.", "code": "NO_FILES"}), 400

    uploaded = []
    errors = []
    duplicates = []

    for f in files:
        orig_name = f.filename or "track"
        try:
            ext, sha256_hex, size_bytes, raw_bytes = validate_and_hash_upload(f)
        except ValueError as verr:
            errors.append({"filename": orig_name, "error": str(verr)})
            continue

        existing = query_one("SELECT id, title, artist FROM songs WHERE file_hash = ?", (sha256_hex,))
        if existing:
            duplicates.append(
                {
                    "filename": orig_name,
                    "existing_song_id": existing["id"],
                    "error": f"Duplicate of '{existing['title']}' by {existing['artist']}",
                }
            )
            continue

        safe_stem = secure_filename(orig_name.rsplit(".", 1)[0])[:48] or "track"
        stored_filename = f"{safe_stem}_{sha256_hex[:12]}.{ext}"
        audio_path = Config.UPLOADS_DIR / stored_filename
        audio_path.write_bytes(raw_bytes)

        meta = extract_audio_metadata(audio_path, orig_name)
        cover_filename = extract_embedded_cover(audio_path, Config.COVERS_DIR, sha256_hex)
        is_proc = 0
        proc_colors = None
        if not cover_filename:
            cover_filename, proc_colors = generate_procedural_cover(
                meta["title"], meta["artist"], Config.COVERS_DIR, sha256_hex
            )
            is_proc = 1

        mime_type = MIME_BY_EXT.get(ext, "audio/mpeg")
        song_id = execute_sql(
            """
            INSERT INTO songs
              (title, artist, album, duration, filename, cover_filename, file_hash, file_size, mime_type, mood)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                meta["title"],
                meta["artist"],
                meta["album"],
                meta["duration"],
                stored_filename,
                cover_filename,
                sha256_hex,
                size_bytes,
                mime_type,
                meta["mood"],
            ),
        )

        if is_proc and proc_colors:
            execute_sql(
                """
                INSERT OR REPLACE INTO palettes (song_id, art_1, art_2, art_3, is_procedural)
                VALUES (?, ?, ?, ?, 1)
                """,
                (song_id, proc_colors[0], proc_colors[1], proc_colors[2]),
            )

        uploaded.append(get_song_by_id(song_id))

    if not uploaded and duplicates and not errors:
        return (
            jsonify(
                {
                    "error": duplicates[0]["error"],
                    "code": "DUPLICATE_FILE",
                    "duplicates": duplicates,
                }
            ),
            409,
        )

    if not uploaded and errors:
        return (
            jsonify(
                {
                    "error": errors[0]["error"],
                    "code": "INVALID_AUDIO_FILE",
                    "errors": errors,
                }
            ),
            400,
        )

    return (
        jsonify(
            {
                "song": uploaded[0] if uploaded else None,
                "uploaded": uploaded,
                "duplicates": duplicates,
                "errors": errors,
            }
        ),
        201,
    )


@songs_bp.route("/api/songs/<int:song_id>/stream", methods=["GET"])
def stream_song(song_id: int):
    """Stream audio with full HTTP 206 Partial Content Range support for desktop and mobile."""
    row = query_one("SELECT filename, mime_type FROM songs WHERE id = ?", (song_id,))
    if not row:
        return jsonify({"error": "Song not found.", "code": "NOT_FOUND"}), 404

    target_dir = Config.UPLOADS_DIR
    if not (target_dir / row["filename"]).exists():
        fallback_dir = Config.BASE_DIR / "uploads"
        if (fallback_dir / row["filename"]).exists():
            target_dir = fallback_dir
        else:
            return jsonify({"error": "Audio file is missing from disk.", "code": "FILE_MISSING"}), 404

    response = send_from_directory(
        target_dir,
        row["filename"],
        mimetype=row["mime_type"] or "audio/mpeg",
        conditional=True,
    )
    response.headers["Accept-Ranges"] = "bytes"
    return response


@songs_bp.route("/api/songs/<int:song_id>/cover", methods=["GET"])
def serve_cover(song_id: int):
    """Serve extracted or procedural cover artwork for a song."""
    row = query_one("SELECT title, artist, file_hash, cover_filename FROM songs WHERE id = ?", (song_id,))
    if not row:
        return jsonify({"error": "Song not found.", "code": "NOT_FOUND"}), 404

    cover_filename = row["cover_filename"]
    target_dir = Config.COVERS_DIR
    if not cover_filename or not (target_dir / cover_filename).exists():
        fallback_dir = Config.BASE_DIR / "covers"
        if cover_filename and (fallback_dir / cover_filename).exists():
            target_dir = fallback_dir
        else:
            cover_filename, _ = generate_procedural_cover(
                row["title"], row["artist"], Config.COVERS_DIR, row["file_hash"]
            )
            execute_sql("UPDATE songs SET cover_filename = ? WHERE id = ?", (cover_filename, song_id))
            target_dir = Config.COVERS_DIR

    ext = cover_filename.rsplit(".", 1)[-1].lower()
    mime_map = {
        "svg": "image/svg+xml",
        "png": "image/png",
        "webp": "image/webp",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
    }
    response = send_from_directory(
        target_dir,
        cover_filename,
        mimetype=mime_map.get(ext, "image/jpeg"),
        conditional=True,
    )
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response


@songs_bp.route("/api/songs/<int:song_id>", methods=["PATCH"])
def update_song_metadata(song_id: int):
    """Update a song's title, artist, album, or mood tags."""
    existing = query_one("SELECT id FROM songs WHERE id = ?", (song_id,))
    if not existing:
        return jsonify({"error": "Song not found.", "code": "NOT_FOUND"}), 404

    data = request.get_json(silent=True) or {}
    updates = []
    params = []

    for field in ("title", "artist", "album"):
        if field in data and str(data[field]).strip():
            updates.append(f"{field} = ?")
            params.append(str(data[field]).strip())

    if "mood" in data:
        mood_val = data["mood"]
        if isinstance(mood_val, list):
            mood_str = json.dumps([str(x) for x in mood_val])
        else:
            mood_str = str(mood_val)
        updates.append("mood = ?")
        params.append(mood_str)

    if updates:
        params.append(song_id)
        execute_sql(f"UPDATE songs SET {', '.join(updates)} WHERE id = ?", params)

    return jsonify({"song": get_song_by_id(song_id)})


@songs_bp.route("/api/songs/<int:song_id>", methods=["DELETE"])
def delete_song(song_id: int):
    """Delete a song, its database associations, its audio file, and its cover file."""
    row = query_one("SELECT id, filename, cover_filename FROM songs WHERE id = ?", (song_id,))
    if not row:
        return jsonify({"error": "Song not found.", "code": "NOT_FOUND"}), 404

    execute_sql("DELETE FROM songs WHERE id = ?", (song_id,))

    audio_path = Config.UPLOADS_DIR / row["filename"]
    if audio_path.exists():
        try:
            audio_path.unlink()
        except OSError:
            pass

    if row["cover_filename"]:
        cover_path = Config.COVERS_DIR / row["cover_filename"]
        if cover_path.exists():
            try:
                cover_path.unlink()
            except OSError:
                pass

    return jsonify({"deleted": True, "id": song_id})


@songs_bp.route("/api/songs/rescan", methods=["POST"])
def rescan_library():
    """Rescan uploads directory for unindexed audio files."""
    stats = rescan_library_on_disk(Config.UPLOADS_DIR, Config.COVERS_DIR)
    return jsonify({"status": "ok", **stats})


@songs_bp.route("/api/songs/clear", methods=["POST"])
def clear_library_route():
    """Clear all songs, covers, playlists, favorites, and history."""
    clear_entire_library(Config.UPLOADS_DIR, Config.COVERS_DIR)
    return jsonify({"status": "ok", "cleared": True})
