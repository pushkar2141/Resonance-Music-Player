/**
 * Resonance — Bottom Player, Mobile Mini-Player & Expanded Player UI Controller
 */
import { PlayerStore } from '../core/store.js';
import { AudioEngine } from '../player/audio-engine.js';
import {
  escapeHtml,
  formatBytes,
  formatDuration,
  getCoverUrl,
} from '../utils/format.js';
import { AVAILABLE_MOODS } from './views.js';

export function initPlayerUI() {
  // Bind interactive seek & volume drag bars
  bindProgressBarDrag('bp-seek-track', (frac) => AudioEngine.seekToFraction(frac));
  bindProgressBarDrag('ep-seek-track', (frac) => AudioEngine.seekToFraction(frac));
  bindProgressBarDrag('bp-volume-track', (frac) => AudioEngine.setVolume(frac));

  PlayerStore.subscribe((_state, topic) => {
    if (topic === 'time') {
      syncTimeBars();
    } else if (topic === 'volume') {
      syncVolumeBar();
    } else if (topic === 'playback' || topic === 'favorites' || topic === 'expanded' || topic === 'settings') {
      syncPlayerChrome();
    }
  });

  syncPlayerChrome();
  syncVolumeBar();
  syncTimeBars();
}

function bindProgressBarDrag(trackId, onChangeFraction) {
  const el = document.getElementById(trackId);
  if (!el) return;

  let dragging = false;

  const computeAndApply = (clientX) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChangeFraction(frac);
  };

  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.classList.add('is-dragging');
    try {
      el.setPointerCapture(e.pointerId);
    } catch (_e) {}
    computeAndApply(e.clientX);
  });

  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    computeAndApply(e.clientX);
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('is-dragging');
  };

  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);
}

function syncTimeBars() {
  const state = PlayerStore.state;
  const curr = state.currentTime || 0;
  const dur = state.duration || (state.currentSong ? state.currentSong.duration : 0) || 0;
  const pct = dur > 0 ? Math.min(100, Math.max(0, (curr / dur) * 100)) : 0;

  const bpCurr = document.getElementById('bp-current-time');
  const bpDur = document.getElementById('bp-duration');
  const bpFill = document.getElementById('bp-seek-fill');
  if (bpCurr) bpCurr.textContent = formatDuration(curr);
  if (bpDur) bpDur.textContent = formatDuration(dur);
  if (bpFill) bpFill.style.width = `${pct}%`;

  const epCurr = document.getElementById('ep-current-time');
  const epDur = document.getElementById('ep-duration');
  const epFill = document.getElementById('ep-seek-fill');
  if (epCurr) epCurr.textContent = formatDuration(curr);
  if (epDur) epDur.textContent = formatDuration(dur);
  if (epFill) epFill.style.width = `${pct}%`;
}

function syncVolumeBar() {
  const state = PlayerStore.state;
  const effVol = state.isMuted ? 0 : state.volume;
  const pct = Math.round(effVol * 100);

  const volFill = document.getElementById('bp-volume-fill');
  if (volFill) volFill.style.width = `${pct}%`;

  const volIcon = document.querySelector('#bp-volume-icon use');
  if (volIcon) {
    volIcon.setAttribute('href', effVol === 0 ? '#i-volume-x' : '#i-volume-2');
  }
}

export function syncPlayerChrome() {
  const state = PlayerStore.state;
  const song = state.currentSong;
  const coverUrl = song ? getCoverUrl(song) : '/static/images/logo.svg';
  const title = song ? song.title : 'Ready to Resonate';
  const artist = song ? song.artist : 'Select or upload a track';
  const isFav = song ? PlayerStore.isFavorite(song.id) : false;

  // Artwork & Metadata across Bottom, Mini, and Expanded Players
  ['bp-cover-img', 'mp-cover-img', 'ep-cover-img'].forEach((id) => {
    const img = document.getElementById(id);
    if (img && img.getAttribute('src') !== coverUrl) {
      img.setAttribute('src', coverUrl);
    }
  });

  ['bp-title', 'mp-title', 'ep-title'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = title;
  });

  ['bp-artist', 'mp-artist', 'ep-artist'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = artist;
  });

  const epAlbum = document.getElementById('ep-album-label');
  if (epAlbum) epAlbum.textContent = song ? song.album || 'Single' : 'Liquid Crystal Studio';

  // Play / Pause icons
  const playHref = state.isPlaying ? '#i-pause' : '#i-play';
  ['bp-play-icon', 'mp-play-icon', 'ep-play-icon'].forEach((id) => {
    const useEl = document.querySelector(`#${id} use`);
    if (useEl) useEl.setAttribute('href', playHref);
  });

  // Like buttons
  ['bp-like-btn', 'ep-like-btn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('is-liked', isFav);
    const useEl = btn.querySelector('use');
    if (useEl) useEl.setAttribute('href', isFav ? '#i-heart-fill' : '#i-heart');
  });

  // Shuffle & Repeat buttons
  ['bp-shuffle-btn', 'ep-shuffle-btn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('is-active', state.shuffle);
  });

  ['bp-repeat-btn', 'ep-repeat-btn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('is-active', state.repeat !== 'off');
  });

  ['bp-repeat-icon', 'ep-repeat-icon'].forEach((id) => {
    const useEl = document.querySelector(`#${id} use`);
    if (useEl) {
      useEl.setAttribute('href', state.repeat === 'one' ? '#i-repeat-1' : '#i-repeat');
    }
  });

  const speedBtn = document.getElementById('bp-speed-btn');
  if (speedBtn) speedBtn.textContent = `${state.playbackRate || 1}x`;

  // Vinyl Disc Spin & Clean Artwork Mode
  const vinylDisc = document.getElementById('ep-vinyl-disc');
  const artMode = state.settings.player_art_mode || 'vinyl';
  if (vinylDisc) {
    vinylDisc.classList.toggle('is-clean-art', artMode === 'clean');
    vinylDisc.classList.toggle('is-spinning', artMode === 'vinyl' && state.isPlaying);
  }
  const btnVinyl = document.getElementById('ep-mode-vinyl');
  const btnClean = document.getElementById('ep-mode-clean');
  if (btnVinyl) btnVinyl.classList.toggle('is-active', artMode === 'vinyl');
  if (btnClean) btnClean.classList.toggle('is-active', artMode === 'clean');

  // Visualizer style pills inside Expanded Player
  const vizStyle = state.settings.visualizer_style || 'bars';
  document.querySelectorAll('[data-action="set-viz-style"]').forEach((b) => {
    b.classList.toggle('is-active', b.getAttribute('data-style') === vizStyle);
  });

  // Expanded Player Queue / Info Tab Content
  renderExpandedTabContent();
}

export function renderExpandedTabContent() {
  const mount = document.getElementById('ep-tab-content');
  if (!mount) return;

  const state = PlayerStore.state;
  const tab = state.expandedTab || 'queue';

  const qBtn = document.getElementById('ep-tab-btn-queue');
  const iBtn = document.getElementById('ep-tab-btn-info');
  if (qBtn) qBtn.classList.toggle('is-active', tab === 'queue');
  if (iBtn) iBtn.classList.toggle('is-active', tab === 'info');

  if (tab === 'info') {
    const song = state.currentSong;
    if (!song) {
      mount.innerHTML = `<div class="text-caption" style="padding:16px;">No active track selected.</div>`;
      return;
    }
    let moods = [];
    try {
      moods = JSON.parse(song.mood || '[]');
    } catch (_e) {}

    mount.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
        <div class="glass-g1" style="padding:14px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <div class="text-caption">Format &amp; Size</div>
            <div class="text-ui" style="font-weight:600;">${escapeHtml(song.mime_type)} · ${formatBytes(song.file_size)}</div>
          </div>
          <div>
            <div class="text-caption">Play Count</div>
            <div class="text-ui tabular-nums" style="font-weight:600;">${song.play_count || 0} plays</div>
          </div>
        </div>

        <div class="glass-g1" style="padding:14px; display:flex; flex-direction:column; gap:8px;">
          <div class="text-caption">Mood Tags (Tap to toggle)</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${AVAILABLE_MOODS.map((m) => {
              const active = moods.includes(m);
              return `
                <button
                  type="button"
                  class="chip ${active ? 'is-active' : ''}"
                  data-action="toggle-song-mood"
                  data-song-id="${song.id}"
                  data-mood="${escapeHtml(m)}"
                >
                  ${escapeHtml(m)}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Default: Up Next Queue Tab
  const queue = state.queue || [];
  if (!queue.length) {
    mount.innerHTML = `<div class="text-caption" style="padding:16px;">Queue is empty. Play any track to populate your queue.</div>`;
    return;
  }

  mount.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${queue
        .map((s, idx) => {
          const isCurrent = idx === state.queueIndex;
          return `
            <div
              class="glass-g1 interactive ${isCurrent ? 'is-playing-surface' : ''}"
              style="padding:8px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; border-radius:16px; cursor:pointer;"
              data-action="play-queue-index"
              data-queue-index="${idx}"
            >
              <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                <img src="${escapeHtml(getCoverUrl(s))}" alt="" style="width:38px; height:38px; border-radius:10px; object-fit:cover; flex-shrink:0;">
                <div style="min-width:0;">
                  <div class="text-ui truncate" style="font-weight:600;">${escapeHtml(s.title)}</div>
                  <div class="text-caption truncate">${escapeHtml(s.artist)}</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="text-caption tabular-nums">${formatDuration(s.duration)}</span>
                <button
                  type="button"
                  class="btn-icon"
                  style="width:30px; height:30px;"
                  data-action="remove-queue-index"
                  data-queue-index="${idx}"
                  aria-label="Remove from queue"
                >
                  <svg style="width:14px; height:14px;"><use href="#i-x"/></svg>
                </button>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}
