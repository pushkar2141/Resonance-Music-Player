"""Embedded cover art extraction and procedural gradient-mesh SVG cover generation."""
import hashlib
from pathlib import Path
from typing import Optional, Tuple
import mutagen
from mutagen.flac import FLAC
from mutagen.id3 import ID3
from mutagen.mp4 import MP4

# Curated Liquid Crystal harmonic palettes for procedural fallback covers
PROCEDURAL_PALETTES = [
    ("#3b6fe0", "#6aa8ff", "#ffb3e0"),  # Ice Blue & Orchid Crystal
    ("#c2255c", "#ff8fb1", "#c4a1ff"),  # Rose Quartz & Amethyst
    ("#0b8a5c", "#3ddc97", "#7cc7ff"),  # Mint Mist & Glacial Sky
    ("#d9480f", "#ff9a62", "#ffc857"),  # Peach Sunrise & Solar Amber
    ("#6d4ae0", "#9d7bff", "#7ad7ff"),  # Lavender Haze & Cyan
    ("#2563eb", "#38bdf8", "#818cf8"),  # Sapphire Refraction
    ("#0d9488", "#2dd4bf", "#60a5fa"),  # Bioluminescent Teal
    ("#be185d", "#f472b6", "#a78bfa"),  # Velvet Magenta
]


def _detect_image_ext(image_bytes: bytes) -> str:
    """Detect image extension from binary header."""
    if image_bytes.startswith(b"\x89PNG"):
        return "png"
    if image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
        return "webp"
    return "jpg"


def extract_embedded_cover(audio_path: Path, covers_dir: Path, file_hash: str) -> Optional[str]:
    """
    Attempt to extract embedded cover artwork from an audio file using Mutagen.
    Returns the saved cover filename (e.g., '<hash>.png') if found, else None.
    """
    image_bytes: Optional[bytes] = None
    try:
        audio = mutagen.File(str(audio_path))
        if audio is not None:
            if hasattr(audio, "tags") and audio.tags:
                for key in list(audio.tags.keys()):
                    if str(key).startswith("APIC"):
                        frame = audio.tags[key]
                        if hasattr(frame, "data") and frame.data:
                            image_bytes = bytes(frame.data)
                            break

            if image_bytes is None and isinstance(audio, FLAC) and audio.pictures:
                image_bytes = bytes(audio.pictures[0].data)

            if image_bytes is None and hasattr(audio, "pictures") and audio.pictures:
                image_bytes = bytes(audio.pictures[0].data)

            if image_bytes is None and isinstance(audio, MP4) and audio.tags:
                covr = audio.tags.get("covr")
                if covr and len(covr) > 0:
                    image_bytes = bytes(covr[0])
    except Exception:
        pass

    # Explicit ID3 fallback for MP3 streams where mutagen.File frame sync fails
    if image_bytes is None:
        try:
            id3 = ID3(str(audio_path))
            for key in id3.keys():
                if key.startswith("APIC"):
                    image_bytes = bytes(id3[key].data)
                    break
        except Exception:
            pass

    if image_bytes and len(image_bytes) > 32:
        ext = _detect_image_ext(image_bytes)
        cover_filename = f"{file_hash}.{ext}"
        cover_path = covers_dir / cover_filename
        cover_path.write_bytes(image_bytes)
        return cover_filename

    return None


def get_procedural_palette(title: str, artist: str) -> Tuple[str, str, str]:
    """Deterministically select a 3-color palette from title + artist hash."""
    seed_str = f"{(title or 'Untitled').strip().lower()}::{(artist or 'Unknown').strip().lower()}"
    digest = hashlib.sha256(seed_str.encode("utf-8")).digest()
    idx = digest[0] % len(PROCEDURAL_PALETTES)
    return PROCEDURAL_PALETTES[idx]


def generate_procedural_cover(
    title: str,
    artist: str,
    covers_dir: Path,
    file_hash: str,
) -> Tuple[str, Tuple[str, str, str]]:
    """
    Generate a deterministic Liquid Crystal gradient-mesh SVG cover seeded from title/artist.
    Returns (cover_filename, (c1, c2, c3)).
    """
    c1, c2, c3 = get_procedural_palette(title, artist)
    seed_bytes = hashlib.md5(f"{title}:{artist}".encode("utf-8")).digest()

    cx1 = 20 + (seed_bytes[0] % 35)
    cy1 = 18 + (seed_bytes[1] % 35)
    cx2 = 55 + (seed_bytes[2] % 35)
    cy2 = 52 + (seed_bytes[3] % 35)
    cx3 = 28 + (seed_bytes[4] % 44)
    cy3 = 60 + (seed_bytes[5] % 30)

    clean_title = (title or "Resonance").strip()
    initial = clean_title[0].upper() if clean_title else "R"

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="52%" stop-color="{c2}"/>
      <stop offset="100%" stop-color="{c3}"/>
    </linearGradient>
    <radialGradient id="orb1" cx="{cx1}%" cy="{cy1}%" r="62%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.52"/>
      <stop offset="45%" stop-color="{c2}" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="{c1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb2" cx="{cx2}%" cy="{cy2}%" r="58%">
      <stop offset="0%" stop-color="{c3}" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="{c2}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb3" cx="{cx3}%" cy="{cy3}%" r="50%">
      <stop offset="0%" stop-color="{c1}" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#090d1e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <rect width="600" height="600" fill="url(#orb1)"/>
  <rect width="600" height="600" fill="url(#orb2)"/>
  <rect width="600" height="600" fill="url(#orb3)"/>
  <g stroke="rgba(255,255,255,0.28)" fill="none">
    <circle cx="300" cy="300" r="215" stroke-width="1.5" stroke-dasharray="10 8"/>
    <circle cx="300" cy="300" r="160" stroke-width="2"/>
    <circle cx="300" cy="300" r="108" stroke-width="2.5" fill="rgba(255,255,255,0.14)"/>
  </g>
  <text x="300" y="328" text-anchor="middle" fill="rgba(255,255,255,0.95)" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="84" letter-spacing="-0.03em">{initial}</text>
</svg>"""

    cover_filename = f"{file_hash}.svg"
    cover_path = covers_dir / cover_filename
    cover_path.write_text(svg_content, encoding="utf-8")
    return cover_filename, (c1, c2, c3)
