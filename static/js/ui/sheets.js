/**
 * Resonance — Modal Focus Management & Mobile Touch Gestures (Swipe Up / Swipe Down)
 */
import { PlayerStore } from '../core/store.js';

export function openModal(modalId) {
  closeAllModals();
  const el = document.getElementById(modalId);
  if (!el) return;
  el.classList.add('is-open');
  const firstFocusable = el.querySelector('input, button:not([data-action="close-modals"]), select, [tabindex="0"]');
  if (firstFocusable) {
    setTimeout(() => firstFocusable.focus(), 60);
  }
}

export function closeAllModals() {
  document.querySelectorAll('.modal-backdrop.is-open').forEach((m) => {
    m.classList.remove('is-open');
  });
}

export function setExpandedPlayerOpen(open) {
  const sheet = document.getElementById('expanded-player');
  if (!sheet) return;
  PlayerStore.setExpandedOpen(open);
  sheet.classList.toggle('is-open', open);
  sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
}

export function initOverlaysAndGestures() {
  // Backdrop click closes modal
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeAllModals();
      }
    });
  });

  // Mobile Mini-Player Swipe Up to Expand
  const miniPlayer = document.getElementById('mobile-mini-player');
  if (miniPlayer) {
    let startY = null;
    miniPlayer.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) startY = e.touches[0].clientY;
      },
      { passive: true }
    );
    miniPlayer.addEventListener(
      'touchend',
      (e) => {
        if (startY === null || !e.changedTouches.length) return;
        const dy = e.changedTouches[0].clientY - startY;
        if (dy < -32) {
          setExpandedPlayerOpen(true);
        }
        startY = null;
      },
      { passive: true }
    );
  }

  // Expanded Player Swipe Down to Dismiss
  const expanded = document.getElementById('expanded-player');
  if (expanded) {
    let startY = null;
    expanded.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1 && e.touches[0].clientY < 160) {
          startY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );
    expanded.addEventListener(
      'touchend',
      (e) => {
        if (startY === null || !e.changedTouches.length) return;
        const dy = e.changedTouches[0].clientY - startY;
        if (dy > 48) {
          setExpandedPlayerOpen(false);
        }
        startY = null;
      },
      { passive: true }
    );
  }
}
