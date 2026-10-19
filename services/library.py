"""Library management service: disk rescan and full library reset."""
import hashlib
from pathlib import Path
from typing import Dict
from config import Config
from database.db import execute_sql, get_db, query_one
from services.covers import extract_embedded_cover, generate_procedural_cover
from services.metadata import extract_audio_metadata
from services.validation import MIME_BY_EXT, get_extension, verify_audio_magic_bytes


def rescan_library_on_disk(uploads_dir: Path, covers_dir: Path) -> Dict[str, int]:
    """
    Scan uploads_dir for valid audio files not yet indexed in SQLite,
    and remove SQLite rows whose physical audio file is missing.
    """
    added = 0
    removed = 0
    db = get_db()

    rows = db.execute("SELECT id, filename FROM songs").fetchall()
    for r in rows:
        fpath = uploads_dir / r["filename"]
        if not fpath.exists():
            db.execute("DELETE FROM songs WHERE id = ?", (r["id"],))
            removed += 1
    db.commit()

    for fpath in sorted(uploads_dir.iterdir()):
        if not fpath.is_file() or fpath.name.startswith("."):
            continue
        ext = get_extension(fpath.name)
        if ext not in Config.ALLOWED_AUDIO_EXTENSIONS:
            continue

        existing = query_one("SELECT id FROM songs WHERE filename = ?", (fpath.name,))
        if existing:
            continue

        raw_bytes = fpath.read_bytes()
        if not verify_audio_magic_bytes(raw_bytes[:64], ext):
            continue

        sha256_hex = hashlib.sha256(raw_bytes).hexdigest()
        dup = query_one("SELECT id FROM songs WHERE file_hash = ?", (sha256_hex,))
        if dup:
            continue

        meta = extract_audio_metadata(fpath, fpath.name)
        cover_file = extract_embedded_cover(fpath, covers_dir, sha256_hex)
        is_proc = 0
        proc_colors = None
        if not cover_file:
            cover_file, proc_colors = generate_procedural_cover(
                meta["title"], meta["artist"], covers_dir, sha256_hex
            )
            is_proc = 1

        song_id = execute_sql(
            """
            INSERT INTO songs (title, artist, album, duration, filename, cover_filename, file_hash, file_size, mime_type, mood)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                meta["title"],
                meta["artist"],
                meta["album"],
                meta["duration"],
                fpath.name,
                cover_file,
                sha256_hex,
                len(raw_bytes),
                MIME_BY_EXT.get(ext, "audio/mpeg"),
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
        added += 1

    return {"added": added, "removed": removed}


def clear_entire_library(uploads_dir: Path, covers_dir: Path) -> None:
    """Remove all songs, playlists, favorites, history, palettes, and media files."""
    db = get_db()
    db.execute("DELETE FROM playlist_songs")
    db.execute("DELETE FROM playlists")
    db.execute("DELETE FROM favorites")
    db.execute("DELETE FROM history")
    db.execute("DELETE FROM palettes")
    db.execute("DELETE FROM songs")
    db.commit()

    for folder in (uploads_dir, covers_dir):
        if folder.exists():
            for item in folder.iterdir():
                if item.is_file() and item.name != ".gitkeep":
                    try:
                        item.unlink()
                    except OSError:
                        pass
