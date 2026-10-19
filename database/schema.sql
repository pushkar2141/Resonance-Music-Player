-- Resonance — Feel Every Frequency (Liquid Crystal Edition)
-- SQLite Database Schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT 'Unknown Artist',
    album TEXT NOT NULL DEFAULT 'Unknown Album',
    duration REAL NOT NULL DEFAULT 0.0,
    filename TEXT NOT NULL UNIQUE,
    cover_filename TEXT,
    file_hash TEXT NOT NULL UNIQUE,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
    mood TEXT NOT NULL DEFAULT '[]',
    play_count INTEGER NOT NULL DEFAULT 0,
    last_played_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_play_count ON songs(play_count DESC);

CREATE TABLE IF NOT EXISTS favorites (
    song_id INTEGER PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cover_filename TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_songs_order ON playlist_songs(playlist_id, position ASC);

CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    played_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_played_at ON history(played_at DESC);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS palettes (
    song_id INTEGER PRIMARY KEY,
    art_1 TEXT NOT NULL,
    art_2 TEXT NOT NULL,
    art_3 TEXT NOT NULL,
    is_procedural INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

-- Default Liquid Crystal Appearance & Audio Settings (Decisions A2 & A4)
INSERT OR IGNORE INTO settings (key, value) VALUES
    ('palette', 'ice'),
    ('theme_mode', 'light'),
    ('theme', 'light'),
    ('glass_preset', 'rich'),
    ('glass_blur', '34'),
    ('glass_opacity', '0.52'),
    ('reduced_effects', 'false'),
    ('adaptive_color_intensity', 'full'),
    ('default_volume', '0.8'),
    ('resume_last_track', 'true'),
    ('remember_queue', 'true'),
    ('visualizer_style', 'bars'),
    ('eq_enabled', 'true'),
    ('eq_preset', 'flat'),
    ('eq_preamp', '0'),
    ('eq_bands', '[0,0,0,0,0,0,0,0,0,0]'),
    ('motion_mode', 'full'),
    ('player_art_mode', 'vinyl');
