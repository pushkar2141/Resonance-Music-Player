/**
 * Resonance — Formatting, Escaping & Greeting Utilities
 */

export function formatDuration(seconds) {
  const num = Number(seconds);
  if (!Number.isFinite(num) || num < 0) return '0:00';
  const totalSec = Math.floor(num);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getTimeGreeting() {
  const hr = new Date().getHours();
  if (hr < 5) return 'Late Night Frequencies';
  if (hr < 12) return 'Good Morning';
  if (hr < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function getCoverUrl(song) {
  if (!song) return '/static/images/logo.svg';
  if (song.cover_url) return song.cover_url;
  return `/api/songs/${song.id}/cover`;
}
