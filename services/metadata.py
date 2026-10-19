"""Audio metadata extraction via Mutagen with filename fallback and mood tag inference."""
import json
import re
import struct
import wave
from pathlib import Path
from typing import Any, Dict, List, Tuple
import mutagen

MOOD_CATEGORIES = ["Atmospheric", "Late Night", "Energy", "Focus", "Warm"]


def parse_filename_fallback(original_filename: str) -> Tuple[str, str]:
    """Parse 'Artist - Title' or clean title from a raw filename."""
    stem = Path(original_filename).stem
    cleaned = re.sub(r"[_]+", " ", stem).strip()
    cleaned = re.sub(r"^\d+[\s.\-]+", "", cleaned).strip()
    if " - " in cleaned:
        parts = cleaned.split(" - ", 1)
        artist = parts[0].strip() or "Unknown Artist"
        title = parts[1].strip() or cleaned
        return title, artist
    return (cleaned or "Untitled Track"), "Unknown Artist"


def _get_first_text(tags: Any, keys: List[str]) -> str:
    """Extract the first non-empty string value from a list of tag keys."""
    if not tags:
        return ""
    for k in keys:
        if k in tags:
            val = tags[k]
            if isinstance(val, list) and val:
                text = str(val[0]).strip()
                if text:
                    return text
            elif val:
                text = str(val).strip()
                if text:
                    return text
    return ""


def infer_mood_tags(title: str, artist: str, album: str, duration: float, genre: str = "") -> List[str]:
    """Automatically infer 1–2 mood tags from track characteristics and keywords."""
    combined = f"{title} {artist} {album} {genre}".lower()
    moods: List[str] = []

    if any(k in combined for k in ("night", "moon", "dark", "midnight", "dream", "nocturne", "echo")):
        moods.append("Late Night")
    if any(k in combined for k in ("ambient", "space", "echo", "horizon", "nebula", "crystal", "drift", "submerged")):
        moods.append("Atmospheric")
    if any(k in combined for k in ("bass", "club", "dance", "energy", "run", "pulse", "electro", "rock", "fast", "crimson")):
        moods.append("Energy")
    if any(k in combined for k in ("study", "piano", "focus", "minimal", "classical", "instrumental", "code", "emerald")):
        moods.append("Focus")
    if any(k in combined for k in ("acoustic", "warm", "soul", "jazz", "sun", "gold", "lofi", "folk", "velvet")):
        moods.append("Warm")

    if not moods:
        if duration >= 240:
            moods.append("Atmospheric")
        elif duration > 0 and duration <= 140:
            moods.append("Energy")
        else:
            idx = sum(ord(c) for c in (title or "Resonance")) % len(MOOD_CATEGORIES)
            moods.append(MOOD_CATEGORIES[idx])

    return moods[:2]


def _estimate_wav_duration(audio_path: Path) -> float:
    """Fallback duration calculation for WAV files."""
    try:
        with wave.open(str(audio_path), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate > 0:
                return round(float(frames) / float(rate), 2)
    except Exception:
        pass
    try:
        raw = audio_path.read_bytes()
        if raw[:4] == b"RIFF" and raw[8:12] == b"WAVE":
            byte_rate = struct.unpack("<I", raw[28:32])[0]
            if byte_rate > 0:
                return round(max(0.0, len(raw) - 44) / float(byte_rate), 2)
    except Exception:
        pass
    return 0.0


def extract_audio_metadata(audio_path: Path, original_filename: str) -> Dict[str, Any]:
    """
    Extract title, artist, album, duration, and mood tags from an audio file.
    Never raises on malformed tags; gracefully falls back to filename parsing.
    """
    fallback_title, fallback_artist = parse_filename_fallback(original_filename)
    title = ""
    artist = ""
    album = ""
    genre = ""
    duration = 0.0

    try:
        audio = mutagen.File(str(audio_path), easy=True)
        if audio is not None:
            if getattr(audio, "info", None) and getattr(audio.info, "length", None):
                duration = round(float(audio.info.length), 2)
            tags = getattr(audio, "tags", None)
            if tags:
                title = _get_first_text(tags, ["title", "TIT2", "\xa9nam"])
                artist = _get_first_text(tags, ["artist", "TPE1", "\xa9ART", "albumartist"])
                album = _get_first_text(tags, ["album", "TALB", "\xa9alb"])
                genre = _get_first_text(tags, ["genre", "TCON", "\xa9gen"])
    except Exception:
        pass

    if not title or not artist:
        try:
            raw_id3 = mutagen.id3.ID3(str(audio_path))
            if not title and "TIT2" in raw_id3:
                title = str(raw_id3["TIT2"].text[0]).strip()
            if not artist and "TPE1" in raw_id3:
                artist = str(raw_id3["TPE1"].text[0]).strip()
            if not album and "TALB" in raw_id3:
                album = str(raw_id3["TALB"].text[0]).strip()
        except Exception:
            pass

    if duration <= 0.0 and audio_path.suffix.lower() == ".wav":
        duration = _estimate_wav_duration(audio_path)

    final_title = title or fallback_title
    final_artist = artist or fallback_artist
    final_album = album or "Single"
    moods = infer_mood_tags(final_title, final_artist, final_album, duration, genre)

    return {
        "title": final_title,
        "artist": final_artist,
        "album": final_album,
        "duration": max(0.0, duration),
        "mood": json.dumps(moods),
    }
