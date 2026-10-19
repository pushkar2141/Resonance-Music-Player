/**
 * Resonance — Web Audio API DSP Engine + HTML5 Audio Controller
 * Single AudioContext and Single MediaElementAudioSourceNode (never duplicated)
 * Graph: <audio> -> Preamp GainNode -> 10 BiquadFilterNode bands -> AnalyserNode -> Master GainNode -> destination
 */
import { PlayerStore } from '../core/store.js';

export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

class AudioEngineController {
  constructor() {
    this.audio = null;
    this.ctx = null;
    this.sourceNode = null;
    this.preampNode = null;
    this.eqNodes = [];
    this.analyserNode = null;
    this.masterGainNode = null;
    this.graphInitialized = false;
    this.fadeMultiplier = 1.0;
  }

  init(onTrackEnded, onTimeProgress, onAudioError) {
    this.audio = document.getElementById('resonance-audio');
    if (!this.audio) return;

    const savedVol = parseFloat(localStorage.getItem('resonance_volume') ?? '0.8');
    const clampedVol = Number.isFinite(savedVol) ? Math.max(0, Math.min(1, savedVol)) : 0.8;
    PlayerStore.state.volume = clampedVol;
    this.audio.volume = clampedVol;

    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio) return;
      PlayerStore.state.currentTime = this.audio.currentTime || 0;
      if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
        PlayerStore.state.duration = this.audio.duration;
      }
      PlayerStore.emit('time');
      if (typeof onTimeProgress === 'function') {
        onTimeProgress(PlayerStore.state.currentTime, PlayerStore.state.duration);
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (!this.audio) return;
      if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
        PlayerStore.state.duration = this.audio.duration;
        PlayerStore.emit('time');
      }
    });

    this.audio.addEventListener('play', () => {
      PlayerStore.state.isPlaying = true;
      PlayerStore.emit('playback');
    });

    this.audio.addEventListener('pause', () => {
      PlayerStore.state.isPlaying = false;
      PlayerStore.emit('playback');
    });

    this.audio.addEventListener('ended', () => {
      if (typeof onTrackEnded === 'function') onTrackEnded();
    });

    this.audio.addEventListener('error', () => {
      PlayerStore.state.isPlaying = false;
      PlayerStore.emit('playback');
      if (typeof onAudioError === 'function') onAudioError();
    });
  }

  ensureWebAudioGraph() {
    if (this.graphInitialized || !this.audio) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.sourceNode = this.ctx.createMediaElementSource(this.audio);
      this.preampNode = this.ctx.createGain();

      this.eqNodes = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx.createBiquadFilter();
        if (idx === 0) filter.type = 'lowshelf';
        else if (idx === EQ_FREQUENCIES.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.1;
        filter.gain.value = 0;
        return filter;
      });

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.82;

      this.masterGainNode = this.ctx.createGain();

      // Connect chain: source -> preamp -> eq[0..9] -> analyser -> masterGain -> destination
      this.sourceNode.connect(this.preampNode);
      let prev = this.preampNode;
      for (const node of this.eqNodes) {
        prev.connect(node);
        prev = node;
      }
      prev.connect(this.analyserNode);
      this.analyserNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.ctx.destination);

      this.graphInitialized = true;
      this.applyEqualizerFromStore();
      this.syncGain();
    } catch (err) {
      console.warn('Web Audio API graph fallback:', err);
    }
  }

  applyEqualizerFromStore() {
    if (!this.graphInitialized) return;
    const s = PlayerStore.state.settings;
    const enabled = String(s.eq_enabled) !== 'false';
    const preampDb = enabled ? parseFloat(s.eq_preamp || '0') || 0 : 0;
    let bands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    try {
      const parsed = JSON.parse(s.eq_bands || '[]');
      if (Array.isArray(parsed) && parsed.length === 10) {
        bands = parsed.map((v) => Number(v) || 0);
      }
    } catch (_e) {}

    if (this.preampNode) {
      this.preampNode.gain.value = Math.pow(10, preampDb / 20);
    }
    this.eqNodes.forEach((node, idx) => {
      node.gain.value = enabled ? Math.max(-12, Math.min(12, bands[idx] || 0)) : 0;
    });
  }

  async loadAndPlay(song, autoPlay = true) {
    if (!this.audio || !song) return;
    const streamUrl = song.stream_url || `/api/songs/${song.id}/stream`;

    if (this.audio.getAttribute('data-loaded-id') !== String(song.id)) {
      this.audio.src = streamUrl;
      this.audio.setAttribute('data-loaded-id', String(song.id));
      this.audio.playbackRate = PlayerStore.state.playbackRate || 1.0;
      PlayerStore.state.currentTime = 0;
      PlayerStore.state.duration = Number(song.duration) || 0;
    }

    if (autoPlay) {
      this.ensureWebAudioGraph();
      try {
        await this.audio.play();
      } catch (_err) {
        PlayerStore.state.isPlaying = false;
        PlayerStore.emit('playback');
      }
    }
  }

  async togglePlay() {
    if (!this.audio || !PlayerStore.state.currentSong) return;
    this.ensureWebAudioGraph();
    if (this.audio.paused) {
      try {
        await this.audio.play();
      } catch (_e) {}
    } else {
      this.audio.pause();
    }
  }

  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  seekToFraction(fraction) {
    if (!this.audio) return;
    const dur = Number.isFinite(this.audio.duration) && this.audio.duration > 0
      ? this.audio.duration
      : PlayerStore.state.duration || 0;
    if (dur <= 0) return;
    const target = Math.max(0, Math.min(dur, dur * fraction));
    this.audio.currentTime = target;
    PlayerStore.state.currentTime = target;
    PlayerStore.emit('time');
  }

  seekRelative(deltaSeconds) {
    if (!this.audio) return;
    const dur = Number.isFinite(this.audio.duration) && this.audio.duration > 0
      ? this.audio.duration
      : PlayerStore.state.duration || 0;
    if (dur <= 0) return;
    const next = Math.max(0, Math.min(dur, (this.audio.currentTime || 0) + deltaSeconds));
    this.audio.currentTime = next;
    PlayerStore.state.currentTime = next;
    PlayerStore.emit('time');
  }

  setVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol)));
    PlayerStore.state.volume = v;
    if (v > 0) PlayerStore.state.isMuted = false;
    localStorage.setItem('resonance_volume', String(v));
    this.syncGain();
    PlayerStore.emit('volume');
  }

  toggleMute() {
    PlayerStore.state.isMuted = !PlayerStore.state.isMuted;
    this.syncGain();
    PlayerStore.emit('volume');
  }

  setFadeMultiplier(mult) {
    this.fadeMultiplier = Math.max(0, Math.min(1, mult));
    this.syncGain();
  }

  syncGain() {
    if (!this.audio) return;
    const effective = PlayerStore.state.isMuted ? 0 : PlayerStore.state.volume * this.fadeMultiplier;
    this.audio.volume = effective;
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = 1.0;
    }
  }

  cyclePlaybackSpeed() {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const curr = PlayerStore.state.playbackRate || 1.0;
    const idx = speeds.indexOf(curr);
    const next = speeds[(idx + 1) % speeds.length];
    PlayerStore.state.playbackRate = next;
    if (this.audio) this.audio.playbackRate = next;
    PlayerStore.emit('playback');
    return next;
  }
}

export const AudioEngine = new AudioEngineController();
