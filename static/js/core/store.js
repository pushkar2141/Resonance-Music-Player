/**
 * Resonance — Reactive Single Source of Truth (PlayerStore)
 */

class Store {
  constructor() {
    this.state = {
      // Library Data
      songs: [],
      favorites: new Set(),
      playlists: [],
      history: [],
      discover: null,

      // Playback State
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      playbackRate: 1.0,
      shuffle: false,
      repeat: 'off', // 'off' | 'all' | 'one'
      queue: [],
      originalQueue: [],
      queueIndex: -1,

      // View & Filter State
      searchQuery: '',
      recentSearches: this.loadJson('resonance_recent_searches', []),
      viewMode: localStorage.getItem('resonance_view_mode') || 'grid',
      sortBy: 'created_at',
      sortDir: 'desc',
      activeMoodFilter: null,
      selectedSongIds: new Set(),

      // Chrome & Settings State (Liquid Crystal Appearance + Audio)
      expandedOpen: false,
      expandedTab: 'queue',
      sleepTimerRemaining: null,
      sleepTimerMode: null,
      settings: {
        palette: localStorage.getItem('resonance_palette') || 'ice',
        theme_mode: localStorage.getItem('resonance_mode') || 'light',
        theme: localStorage.getItem('resonance_mode') || 'light',
        glass_preset: localStorage.getItem('resonance_glass_preset') || 'rich',
        glass_blur: localStorage.getItem('resonance_glass_blur') || '34',
        glass_opacity: localStorage.getItem('resonance_glass_opacity') || '0.52',
        reduced_effects: localStorage.getItem('resonance_reduced_effects') || 'false',
        adaptive_color_intensity: 'full',
        default_volume: '0.8',
        resume_last_track: 'true',
        remember_queue: 'true',
        visualizer_style: 'bars',
        eq_enabled: 'true',
        eq_preset: 'flat',
        eq_preamp: '0',
        eq_bands: '[0,0,0,0,0,0,0,0,0,0]',
        motion_mode: localStorage.getItem('resonance_motion') || 'full',
        player_art_mode: 'vinyl',
      },
    };

    this.listeners = new Set();
  }

  loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  saveJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (_e) {}
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(topic = 'state') {
    for (const fn of this.listeners) {
      try {
        fn(this.state, topic);
      } catch (err) {
        console.error('Store subscriber error:', err);
      }
    }
  }

  setSongs(songs) {
    this.state.songs = Array.isArray(songs) ? songs : [];
    const favIds = new Set();
    for (const s of this.state.songs) {
      if (s.is_favorite) favIds.add(s.id);
    }
    this.state.favorites = favIds;
    if (this.state.currentSong) {
      const updated = this.state.songs.find((s) => s.id === this.state.currentSong.id);
      if (updated) this.state.currentSong = updated;
    }
    this.emit('songs');
  }

  setPlaylists(playlists) {
    this.state.playlists = Array.isArray(playlists) ? playlists : [];
    this.emit('playlists');
  }

  setHistory(history) {
    this.state.history = Array.isArray(history) ? history : [];
    this.emit('history');
  }

  setDiscover(discover) {
    this.state.discover = discover;
    this.emit('discover');
  }

  updateSettings(partial) {
    this.state.settings = { ...this.state.settings, ...partial };
    this.emit('settings');
  }

  isFavorite(songId) {
    return this.state.favorites.has(Number(songId));
  }

  setFavoriteState(songId, isFav) {
    const id = Number(songId);
    if (isFav) this.state.favorites.add(id);
    else this.state.favorites.delete(id);
    const s = this.state.songs.find((item) => item.id === id);
    if (s) s.is_favorite = Boolean(isFav);
    this.emit('favorites');
  }

  setExpandedOpen(open) {
    this.state.expandedOpen = Boolean(open);
    this.emit('expanded');
  }

  addRecentSearch(query) {
    const q = (query || '').trim();
    if (!q) return;
    const next = [q, ...this.state.recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    this.state.recentSearches = next;
    this.saveJson('resonance_recent_searches', next);
  }
}

export const PlayerStore = new Store();
