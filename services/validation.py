"""Audio file validation: extension whitelist, magic-byte inspection, and SHA-256 hashing."""
import hashlib
from typing import Tuple
from werkzeug.datastructures import FileStorage
from config import Config

MIME_BY_EXT = {
    "mp3": "audio/mpeg",
    "flac": "audio/flac",
    "wav": "audio/wav",
    "ogg": "audio/ogg",
    "opus": "audio/ogg",
    "m4a": "audio/mp4",
    "aac": "audio/aac",
}


def get_extension(filename: str) -> str:
    """Return lowercase file extension without leading dot."""
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower().strip()


def verify_audio_magic_bytes(header: bytes, ext: str) -> bool:
    """Verify that the binary header matches known audio container signatures."""
    if len(header) < 12:
        return False

    # 1. WAV: 'RIFF' .... 'WAVE'
    if header[:4] == b"RIFF" and header[8:12] == b"WAVE":
        return True

    # 2. FLAC: 'fLaC'
    if header[:4] == b"fLaC":
        return True

    # 3. OGG / OPUS: 'OggS'
    if header[:4] == b"OggS":
        return True

    # 4. MP4 / M4A / AAC container: 'ftyp' at bytes 4..8
    if header[4:8] == b"ftyp":
        return True

    # 5. ID3v2 tag header ('ID3') used by MP3, AAC, FLAC
    if header[:3] == b"ID3":
        return True

    # 6. Raw MPEG Audio / ADTS frame sync (0xFF followed by 0xE0..0xFF)
    if ext in ("mp3", "aac"):
        stripped = header.lstrip(b"\x00")
        if len(stripped) >= 2 and stripped[0] == 0xFF and (stripped[1] & 0xE0) == 0xE0:
            return True

    return False


def validate_and_hash_upload(file_storage: FileStorage) -> Tuple[str, str, int, bytes]:
    """
    Validate uploaded FileStorage and return (ext, sha256_hex, size_bytes, raw_bytes).
    Raises ValueError with a user-friendly message on invalid extension, size, or magic bytes.
    """
    original_name = file_storage.filename or ""
    ext = get_extension(original_name)
    if ext not in Config.ALLOWED_AUDIO_EXTENSIONS:
        allowed_str = ", ".join(sorted(f".{e}" for e in Config.ALLOWED_AUDIO_EXTENSIONS))
        raise ValueError(f"Unsupported file format '.{ext}'. Allowed formats: {allowed_str}")

    raw_bytes = file_storage.read()
    size_bytes = len(raw_bytes)
    if size_bytes == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")
    if size_bytes > Config.MAX_CONTENT_LENGTH:
        max_mb = Config.MAX_CONTENT_LENGTH // (1024 * 1024)
        raise ValueError(f"File exceeds the {max_mb} MB size limit.")

    if not verify_audio_magic_bytes(raw_bytes[:64], ext):
        raise ValueError(
            f"File '{original_name}' failed binary audio signature verification (corrupt or spoofed '{ext}' file)."
        )

    sha256_hex = hashlib.sha256(raw_bytes).hexdigest()
    return ext, sha256_hex, size_bytes, raw_bytes
