"""
Generates 3 royalty-free synthesized stereo demo tracks on first startup (User Decision A5)
so the adaptive artwork palette, vinyl disc, 10-band EQ, and 4-mode visualizer work immediately.
"""
import hashlib
import json
import math
import os
import sqlite3
import struct
import wave
from pathlib import Path
from typing import List, Tuple
from config import Config
from services.covers import generate_procedural_cover

DEMO_TRACKS = [
    {
        "slug": "crystal_horizons",
        "title": "Crystal Horizons",
        "artist": "Aether & Glass",
        "album": "Liquid Crystal Vol. I",
        "freqs": (261.63, 329.63, 392.00, 493.88),  # Cmaj7
        "duration": 6.0,
        "moods": ["Atmospheric", "Focus"],
        "palette": ("#3b6fe0", "#6aa8ff", "#ffb3e0"),
    },
    {
        "slug": "velvet_nocturne",
        "title": "Velvet Nocturne",
        "artist": "Lumina Ensemble",
        "album": "Midnight Refractions",
        "freqs": (220.00, 261.63, 329.63, 392.00),  # Am7
        "duration": 6.0,
        "moods": ["Late Night", "Warm"],
        "palette": ("#c2255c", "#ff8fb1", "#c4a1ff"),
    },
    {
        "slug": "glacial_pulse",
        "title": "Glacial Pulse",
        "artist": "Kinetix Studio",
        "album": "Mint Mist Sessions",
        "freqs": (293.66, 369.99, 440.00, 554.37),  # Dmaj7
        "duration": 6.0,
        "moods": ["Energy", "Atmospheric"],
        "palette": ("#0b8a5c", "#3ddc97", "#7cc7ff"),
    },
]


def _synthesize_stereo_wav(path: Path, freqs: Tuple[float, ...], duration_sec: float = 6.0) -> bytes:
    """Synthesize a rich, gentle stereo harmonic chord progression as a 16-bit 22050Hz WAV."""
    sample_rate = 22050
    num_samples = int(sample_rate * duration_sec)
    frames: List[bytes] = []

    for i in range(num_samples):
        t = i / float(sample_rate)
        # Smooth attack and release envelope
        env = min(1.0, t / 0.4) * min(1.0, (duration_sec - t) / 0.6)
        # Gentle LFO shimmer
        shimmer = 0.85 + 0.15 * math.sin(2.0 * math.pi * 1.5 * t)

        val_l = (
            0.32 * math.sin(2.0 * math.pi * freqs[0] * t)
            + 0.24 * math.sin(2.0 * math.pi * freqs[1] * t + 0.2)
            + 0.20 * math.sin(2.0 * math.pi * freqs[2] * t)
            + 0.14 * math.sin(2.0 * math.pi * freqs[3] * t)
        )
        val_r = (
            0.32 * math.sin(2.0 * math.pi * freqs[0] * t)
            + 0.24 * math.sin(2.0 * math.pi * freqs[1] * t)
            + 0.20 * math.sin(2.0 * math.pi * freqs[2] * t + 0.35)
            + 0.14 * math.sin(2.0 * math.pi * (freqs[3] * 1.002) * t)
        )

        pcm_l = int(max(-32767, min(32767, val_l * env * shimmer * 24000)))
        pcm_r = int(max(-32767, min(32767, val_r * env * shimmer * 24000)))
        frames.append(struct.pack("<hh", pcm_l, pcm_r))

    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"".join(frames))

    return path.read_bytes()


def ensure_demo_tracks(force: bool = False) -> None:
    """Populate the 3 royalty-free synthesized demo tracks if the database has 0 songs."""
    if os.environ.get("RESONANCE_SKIP_DEMO") == "1" and not force:
        return

    Config.ensure_directories()
    conn = sqlite3.connect(str(Config.DATABASE_PATH))
    try:
        cur = conn.execute("SELECT COUNT(*) FROM songs")
        count = cur.fetchone()[0]
        if count > 0 and not force:
            return

        for item in DEMO_TRACKS:
            temp_path = Config.UPLOADS_DIR / f"{item['slug']}.wav"
            raw_bytes = _synthesize_stereo_wav(temp_path, item["freqs"], item["duration"])
            sha256_hex = hashlib.sha256(raw_bytes).hexdigest()
            final_filename = f"{item['slug']}_{sha256_hex[:10]}.wav"
            final_path = Config.UPLOADS_DIR / final_filename
            if temp_path != final_path:
                temp_path.replace(final_path)

            cover_file, _ = generate_procedural_cover(
                item["title"], item["artist"], Config.COVERS_DIR, sha256_hex
            )

            cur = conn.execute(
                """
                INSERT OR IGNORE INTO songs
                  (title, artist, album, duration, filename, cover_filename, file_hash, file_size, mime_type, mood)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'audio/wav', ?)
                """,
                (
                    item["title"],
                    item["artist"],
                    item["album"],
                    item["duration"],
                    final_filename,
                    cover_file,
                    sha256_hex,
                    len(raw_bytes),
                    json.dumps(item["moods"]),
                ),
            )
            song_id = cur.lastrowid
            if song_id:
                c1, c2, c3 = item["palette"]
                conn.execute(
                    """
                    INSERT OR REPLACE INTO palettes (song_id, art_1, art_2, art_3, is_procedural)
                    VALUES (?, ?, ?, ?, 1)
                    """,
                    (song_id, c1, c2, c3),
                )
        conn.commit()
    finally:
        conn.close()
