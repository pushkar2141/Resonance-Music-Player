/**
 * Resonance — Desktop Keyboard Shortcuts Controller (Section 13.1)
 */
import { PlayerStore } from '../core/store.js';
import { AudioEngine } from '../player/audio-engine.js';
import { QueueController } from '../player/queue.js';
import { closeAllModals, openModal, setExpandedPlayerOpen } from './sheets.js';

export function initKeyboardShortcuts(onToggleCurrentLike) {
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName ? e.target.tagName : '').toLowerCase();
    const isTyping =
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      (e.target && e.target.isContentEditable);

    if (e.key === 'Escape') {
      closeAllModals();
      if (PlayerStore.state.expandedOpen) {
        setExpandedPlayerOpen(false);
      }
      if (isTyping && e.target) e.target.blur();
      return;
    }

    if (isTyping) return;

    if (e.code === 'Space') {
      e.preventDefault();
      AudioEngine.togglePlay();
    } else if (e.key === 'ArrowRight' && e.shiftKey) {
      e.preventDefault();
      QueueController.nextTrack(false);
    } else if (e.key === 'ArrowLeft' && e.shiftKey) {
      e.preventDefault();
      QueueController.prevTrack();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      AudioEngine.seekRelative(5);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      AudioEngine.seekRelative(-5);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      AudioEngine.setVolume((PlayerStore.state.volume || 0) + 0.05);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      AudioEngine.setVolume((PlayerStore.state.volume || 0) - 0.05);
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      AudioEngine.toggleMute();
    } else if (e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (typeof onToggleCurrentLike === 'function') onToggleCurrentLike();
    } else if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      QueueController.toggleShuffle();
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      QueueController.cycleRepeat();
    } else if (e.key === '/') {
      e.preventDefault();
      const searchInput = document.getElementById('global-search-input');
      if (searchInput) searchInput.focus();
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setExpandedPlayerOpen(!PlayerStore.state.expandedOpen);
    } else if (e.key.toLowerCase() === 'q') {
      e.preventDefault();
      PlayerStore.state.expandedTab = 'queue';
      setExpandedPlayerOpen(!PlayerStore.state.expandedOpen);
    } else if (e.key === '?') {
      e.preventDefault();
      openModal('modal-shortcuts');
    }
  });
}
