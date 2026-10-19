/**
 * Resonance — Sleep Timer with Smooth 10-Second Volume Fade-Out
 */
import { PlayerStore } from '../core/store.js';
import { showToast } from '../ui/toast.js';
import { AudioEngine } from './audio-engine.js';

class SleepTimerController {
  constructor() {
    this.intervalId = null;
    this.remainingSec = 0;
    this.endOfTrack = false;
  }

  setTimer(modeOrMinutes) {
    this.clear(false);

    if (modeOrMinutes === '0' || modeOrMinutes === 0 || !modeOrMinutes) {
      showToast('Sleep timer cancelled', 'info');
      this.updateStatusUI();
      return;
    }

    if (modeOrMinutes === 'eot') {
      this.endOfTrack = true;
      PlayerStore.state.sleepTimerMode = 'eot';
      PlayerStore.state.sleepTimerRemaining = null;
      showToast('Playback will stop at the end of this track', 'success');
      this.updateStatusUI();
      return;
    }

    const mins = parseInt(modeOrMinutes, 10);
    if (!Number.isFinite(mins) || mins <= 0) return;

    this.remainingSec = mins * 60;
    PlayerStore.state.sleepTimerMode = `${mins}m`;
    PlayerStore.state.sleepTimerRemaining = this.remainingSec;

    this.intervalId = setInterval(() => this.tick(), 1000);
    showToast(`Sleep timer set for ${mins} minutes`, 'success');
    this.updateStatusUI();
  }

  tick() {
    this.remainingSec--;
    PlayerStore.state.sleepTimerRemaining = this.remainingSec;

    // Smooth fade out over the final 10 seconds
    if (this.remainingSec <= 10 && this.remainingSec > 0) {
      AudioEngine.setFadeMultiplier(this.remainingSec / 10);
    }

    if (this.remainingSec <= 0) {
      AudioEngine.pause();
      AudioEngine.setFadeMultiplier(1.0);
      this.clear(false);
      showToast('Sleep timer finished — Goodnight', 'info');
    }

    this.updateStatusUI();
  }

  checkEndOfTrackStop() {
    if (this.endOfTrack) {
      this.clear(false);
      showToast('Sleep timer stopped playback at end of track', 'info');
      this.updateStatusUI();
      return true;
    }
    return false;
  }

  clear(notify = false) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.remainingSec = 0;
    this.endOfTrack = false;
    AudioEngine.setFadeMultiplier(1.0);
    PlayerStore.state.sleepTimerMode = null;
    PlayerStore.state.sleepTimerRemaining = null;
    if (notify) showToast('Sleep timer cleared', 'info');
    this.updateStatusUI();
  }

  updateStatusUI() {
    const statusEl = document.getElementById('sleep-timer-status');
    const topBtn = document.getElementById('btn-topbar-sleep');
    if (topBtn) {
      topBtn.classList.toggle('is-active', Boolean(this.intervalId || this.endOfTrack));
    }
    if (!statusEl) return;
    if (this.endOfTrack) {
      statusEl.textContent = 'Active: Stopping at the end of the current track.';
    } else if (this.remainingSec > 0) {
      const m = Math.floor(this.remainingSec / 60);
      const s = String(this.remainingSec % 60).padStart(2, '0');
      statusEl.textContent = `Active countdown: ${m}:${s} remaining.`;
    } else {
      statusEl.textContent = 'Fades audio out smoothly over the final 10 seconds.';
    }
  }
}

export const SleepTimer = new SleepTimerController();
