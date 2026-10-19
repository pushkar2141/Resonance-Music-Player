/**
 * Resonance — Queue, Shuffle (Fisher-Yates), Repeat, Media Session & History Controller
 */
import { apiRequest } from '../core/api.js';
import { PlayerStore } from '../core/store.js';
import { getCoverUrl } from '../utils/format.js';
import { extractAndApplySongPalette } from '../utils/palette.js';
import { showToast } from '../ui/toast.js';
import { AudioEngine } from './audio-engine.js';
import { SleepTimer } from './sleep-timer.js';

class QueueManager {
  constructor() {
    this.historyRecordedForSongId = null;
  }

  init() {
    AudioEngine.init(
      () => this.handleTrackEnded(),
      (curr, dur) => this.checkHistoryThreshold(curr, dur),
      () => this.handlePlaybackError()
    );
    this.setupMediaSessionHandlers();
  }

  restoreSavedQueueIfEnabled() {
    const state = PlayerStore.state;
    if (!state.songs.length) return;

    const savedId = Number(localStorage.getItem('resonance_last_song_id'));
    const savedQueueIds = PlayerStore.loadJson('resonance_saved_queue_ids', []);

    let queueSongs = savedQueueIds
      .map((id) => state.songs.find((s) => s.id === Number(id)))
      .filter(Boolean);

    if (!queueSongs.length) {
      queueSongs = [...state.songs];
    }

    state.originalQueue = [...queueSongs];
    state.queue = [...queueSongs];

    const targetSong = queueSongs.find((s) => s.id === savedId) || queueSongs[0];
    if (targetSong) {
      state.currentSong = targetSong;
      state.queueIndex = state.queue.findIndex((s) => s.id === targetSong.id);
      AudioEngine.loadAndPlay(targetSong, false);
      extractAndApplySongPalette(targetSong);
      this.updateMediaSessionMetadata(targetSong);
      PlayerStore.emit('playback');
    }
  }

  persistQueueState() {
    const state = PlayerStore.state;
    if (state.currentSong) {
      localStorage.setItem('resonance_last_song_id', String(state.currentSong.id));
    }
    PlayerStore.saveJson(
      'resonance_saved_queue_ids',
      state.queue.map((s) => s.id)
    );
  }

  async playSongFromContext(songId, contextIds = null, autoPlay = true) {
    const state = PlayerStore.state;
    const id = Number(songId);
    const song = state.songs.find((s) => s.id === id);
    if (!song) return;

    if (state.currentSong && state.currentSong.id === id && autoPlay) {
      await AudioEngine.togglePlay();
      return;
    }

    let list = state.songs;
    if (Array.isArray(contextIds) && contextIds.length > 0) {
      const mapped = contextIds
        .map((cid) => state.songs.find((s) => s.id === Number(cid)))
        .filter(Boolean);
      if (mapped.length) list = mapped;
    }

    state.originalQueue = [...list];
    if (state.shuffle) {
      state.queue = this.buildShuffledOrder(list, song);
      state.queueIndex = 0;
    } else {
      state.queue = [...list];
      state.queueIndex = Math.max(0, state.queue.findIndex((s) => s.id === id));
    }

    await this.activateCurrentQueueTrack(autoPlay);
  }

  buildShuffledOrder(songs, pinnedFirstSong = null) {
    const rest = songs.filter((s) => !pinnedFirstSong || s.id !== pinnedFirstSong.id);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return pinnedFirstSong ? [pinnedFirstSong, ...rest] : rest;
  }

  async activateCurrentQueueTrack(autoPlay = true) {
    const state = PlayerStore.state;
    const song = state.queue[state.queueIndex];
    if (!song) return;

    state.currentSong = song;
    this.historyRecordedForSongId = null;
    this.persistQueueState();

    extractAndApplySongPalette(song);
    this.updateMediaSessionMetadata(song);
    PlayerStore.emit('playback');

    await AudioEngine.loadAndPlay(song, autoPlay);
  }

  async nextTrack(isAutoAdvance = false) {
    const state = PlayerStore.state;
    if (!state.queue.length) return;

    if (isAutoAdvance && SleepTimer.checkEndOfTrackStop()) {
      AudioEngine.pause();
      return;
    }

    if (isAutoAdvance && state.repeat === 'one') {
      AudioEngine.seekToFraction(0);
      await AudioEngine.loadAndPlay(state.currentSong, true);
      return;
    }

    let nextIdx = state.queueIndex + 1;
    if (nextIdx >= state.queue.length) {
      if (state.repeat === 'all' || !isAutoAdvance) {
        nextIdx = 0;
      } else {
        AudioEngine.pause();
        return;
      }
    }

    state.queueIndex = nextIdx;
    await this.activateCurrentQueueTrack(true);
  }

  async prevTrack() {
    const state = PlayerStore.state;
    if (!state.queue.length) return;

    if (state.currentTime > 3.5) {
      AudioEngine.seekToFraction(0);
      return;
    }

    let prevIdx = state.queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = state.queue.length - 1;
    }
    state.queueIndex = prevIdx;
    await this.activateCurrentQueueTrack(true);
  }

  toggleShuffle() {
    const state = PlayerStore.state;
    state.shuffle = !state.shuffle;
    if (state.shuffle) {
      state.queue = this.buildShuffledOrder(
        state.originalQueue.length ? state.originalQueue : state.songs,
        state.currentSong
      );
      state.queueIndex = 0;
    } else if (state.originalQueue.length) {
      state.queue = [...state.originalQueue];
      state.queueIndex = state.currentSong
        ? Math.max(0, state.queue.findIndex((s) => s.id === state.currentSong.id))
        : 0;
    }
    this.persistQueueState();
    PlayerStore.emit('playback');
  }

  cycleRepeat() {
    const state = PlayerStore.state;
    const order = ['off', 'all', 'one'];
    state.repeat = order[(order.indexOf(state.repeat) + 1) % order.length];
    PlayerStore.emit('playback');
  }

  playNextInQueue(songId) {
    const state = PlayerStore.state;
    const song = state.songs.find((s) => s.id === Number(songId));
    if (!song) return;
    if (!state.queue.length) {
      this.playSongFromContext(song.id, [song.id], true);
      return;
    }
    const insertAt = Math.min(state.queue.length, state.queueIndex + 1);
    state.queue.splice(insertAt, 0, song);
    this.persistQueueState();
    PlayerStore.emit('playback');
    showToast(`Playing "${song.title}" next`, 'info');
  }

  addToEndOfQueue(songId) {
    const state = PlayerStore.state;
    const song = state.songs.find((s) => s.id === Number(songId));
    if (!song) return;
    state.queue.push(song);
    this.persistQueueState();
    PlayerStore.emit('playback');
    showToast(`Added "${song.title}" to queue`, 'info');
  }

  removeFromQueueIndex(idx) {
    const state = PlayerStore.state;
    if (idx < 0 || idx >= state.queue.length) return;
    state.queue.splice(idx, 1);
    if (idx < state.queueIndex) {
      state.queueIndex--;
    } else if (idx === state.queueIndex && state.queue.length) {
      state.queueIndex = Math.min(state.queueIndex, state.queue.length - 1);
      this.activateCurrentQueueTrack(state.isPlaying);
    }
    this.persistQueueState();
    PlayerStore.emit('playback');
  }

  clearUpcomingQueue() {
    const state = PlayerStore.state;
    if (!state.currentSong) {
      state.queue = [];
      state.queueIndex = -1;
    } else {
      state.queue = [state.currentSong];
      state.queueIndex = 0;
    }
    this.persistQueueState();
    PlayerStore.emit('playback');
    showToast('Cleared upcoming queue', 'info');
  }

  handleTrackEnded() {
    this.nextTrack(true);
  }

  handlePlaybackError() {
    const curr = PlayerStore.state.currentSong;
    showToast(`Unable to play "${curr ? curr.title : 'track'}". Skipping...`, 'error');
    if (PlayerStore.state.queue.length > 1) {
      setTimeout(() => this.nextTrack(true), 800);
    }
  }

  checkHistoryThreshold(currentTime, duration) {
    const song = PlayerStore.state.currentSong;
    if (!song || this.historyRecordedForSongId === song.id) return;

    // Record after meaningful listening threshold (1.5s for short tracks or >= 25% of duration)
    const threshold = duration > 0 ? Math.min(5.0, duration * 0.25) : 2.0;
    if (currentTime >= threshold) {
      this.historyRecordedForSongId = song.id;
      apiRequest('/api/history', {
        method: 'POST',
        body: JSON.stringify({ song_id: song.id }),
      })
        .then((res) => {
          if (res && res.play_count) {
            song.play_count = res.play_count;
          }
          return apiRequest('/api/history');
        })
        .then((hData) => {
          if (hData && hData.history) {
            PlayerStore.setHistory(hData.history);
          }
        })
        .catch(() => {});
    }
  }

  updateMediaSessionMetadata(song) {
    if (!('mediaSession' in navigator) || !song) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || 'Resonance',
        artist: song.artist || 'Unknown Artist',
        album: song.album || 'Resonance',
        artwork: [
          {
            src: new URL(getCoverUrl(song), window.location.origin).href,
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    } catch (_e) {}
  }

  setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    const actions = [
      ['play', () => AudioEngine.togglePlay()],
      ['pause', () => AudioEngine.togglePlay()],
      ['previoustrack', () => this.prevTrack()],
      ['nexttrack', () => this.nextTrack(false)],
      [
        'seekto',
        (details) => {
          if (details.seekTime !== undefined && AudioEngine.audio) {
            AudioEngine.audio.currentTime = details.seekTime;
          }
        },
      ],
    ];
    for (const [name, fn] of actions) {
      try {
        navigator.mediaSession.setActionHandler(name, fn);
      } catch (_e) {}
    }
  }
}

export const QueueController = new QueueManager();
