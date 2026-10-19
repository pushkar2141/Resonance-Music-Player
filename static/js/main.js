/**
 * Resonance — Complete Main Application Controller ("Liquid Crystal" Edition)
 */
import { apiRequest } from './core/api.js';
import { Router } from './core/router.js';
import { PlayerStore } from './core/store.js';
import { renderEqualizerModal } from './eq/equalizer.js';
import { AudioEngine } from './player/audio-engine.js';
import { QueueController } from './player/queue.js';
import { SleepTimer } from './player/sleep-timer.js';
import { initPlayerUI, renderExpandedTabContent } from './ui/player-ui.js';
import {
  closeAllModals,
  initOverlaysAndGestures,
  openModal,
  setExpandedPlayerOpen,
} from './ui/sheets.js';
import { initKeyboardShortcuts } from './ui/shortcuts.js';
import { showToast } from './ui/toast.js';
import { initUploadUI } from './ui/upload-ui.js';
import {
  AVAILABLE_MOODS,
  renderDiscoverView,
  renderEmptyLibraryState,
  renderFavoritesView,
  renderHomeView,
  renderPlaylistsView,
  renderRecentView,
  renderSearchView,
  renderSettingsView,
  renderSongsCollectionView,
} from './ui/views.js';
import { escapeHtml } from './utils/format.js';
import {
  GLASS_PRESETS,
  applyAppearanceSettings,
  previewPaletteInMiniature,
} from './utils/palette.js';
import { Visualizer } from './visualizer/visualizer.js';

let router = null;
let activePlaylistDetail = null;
let searchDebounceTimer = null;

async function persistSettings(partial) {
  PlayerStore.updateSettings(partial);
  applyAppearanceSettings(PlayerStore.state.settings);
  try {
    await apiRequest('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(partial),
    });
  } catch (_e) {}
}

async function refreshLibraryData() {
  try {
    const [songsRes, plRes, histRes, discRes] = await Promise.all([
      apiRequest('/api/songs'),
      apiRequest('/api/playlists'),
      apiRequest('/api/history'),
      apiRequest('/api/discover'),
    ]);
    PlayerStore.setSongs(songsRes.songs || []);
    PlayerStore.setPlaylists(plRes.playlists || []);
    PlayerStore.setHistory(histRes.history || []);
    PlayerStore.setDiscover(discRes || null);
  } catch (err) {
    console.error('Failed to load library data:', err);
  }
}

async function renderCurrentRoute() {
  const mount = document.getElementById('view-mount');
  if (!mount || !router) return;

  const route = router.currentRoute;
  const param = router.currentParam;

  if (route === 'home') {
    mount.innerHTML = renderHomeView();
  } else if (route === 'discover') {
    mount.innerHTML = renderDiscoverView();
  } else if (route === 'library') {
    mount.innerHTML = renderSongsCollectionView(true);
  } else if (route === 'songs') {
    mount.innerHTML = renderSongsCollectionView(false);
  } else if (route === 'favorites') {
    mount.innerHTML = renderFavoritesView();
  } else if (route === 'playlists') {
    if (param) {
      try {
        const res = await apiRequest(`/api/playlists/${encodeURIComponent(param)}`);
        activePlaylistDetail = res.playlist;
      } catch (_e) {
        activePlaylistDetail = null;
      }
      mount.innerHTML = renderPlaylistsView(activePlaylistDetail);
    } else {
      activePlaylistDetail = null;
      mount.innerHTML = renderPlaylistsView(null);
    }
  } else if (route === 'recent') {
    mount.innerHTML = renderRecentView();
  } else if (route === 'settings') {
    mount.innerHTML = renderSettingsView();
    bindSettingsControls();
  } else if (route === 'search') {
    mount.innerHTML = renderSearchView();
  } else {
    mount.innerHTML = renderEmptyLibraryState();
  }

  bindDynamicViewControls();
}

function bindDynamicViewControls() {
  const sortSelect = document.getElementById('library-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      PlayerStore.state.sortBy = sortSelect.value;
      renderCurrentRoute();
    });
  }
}

function bindSettingsControls() {
  // 1. Live Glass Blur & Opacity Sliders (Decision A4)
  const blurSlider = document.getElementById('slider-glass-blur');
  const blurLabel = document.getElementById('label-glass-blur');
  if (blurSlider) {
    blurSlider.addEventListener('input', () => {
      const val = Number(blurSlider.value);
      if (blurLabel) blurLabel.textContent = `${val} px`;
      document.documentElement.style.setProperty('--glass-blur-px', `${val}px`);
      document.documentElement.setAttribute('data-glass-preset', 'custom');
    });
    blurSlider.addEventListener('change', () => {
      persistSettings({
        glass_preset: 'custom',
        glass_blur: String(blurSlider.value),
      }).then(() => renderCurrentRoute());
    });
  }

  const opSlider = document.getElementById('slider-glass-opacity');
  const opLabel = document.getElementById('label-glass-opacity');
  if (opSlider) {
    opSlider.addEventListener('input', () => {
      const pct = Number(opSlider.value);
      const frac = (pct / 100).toFixed(2);
      if (opLabel) opLabel.textContent = `${pct}%`;
      document.documentElement.style.setProperty('--glass-opacity', frac);
      document.documentElement.setAttribute('data-glass-preset', 'custom');
    });
    opSlider.addEventListener('change', () => {
      const frac = (Number(opSlider.value) / 100).toFixed(2);
      persistSettings({
        glass_preset: 'custom',
        glass_opacity: frac,
      }).then(() => renderCurrentRoute());
    });
  }

  // 2. Visualizer Style Select in Settings
  const vizSelect = document.getElementById('setting-viz-select');
  if (vizSelect) {
    vizSelect.addEventListener('change', () => {
      persistSettings({ visualizer_style: vizSelect.value });
      showToast(`Visualizer set to ${vizSelect.options[vizSelect.selectedIndex].text}`, 'info');
    });
  }

  // 3. Keyboard arrow navigation on Palette Picker Grid (Section 16.1)
  const grid = document.getElementById('palette-picker-grid');
  if (grid) {
    grid.addEventListener('mouseleave', () => {
      previewPaletteInMiniature(PlayerStore.state.settings.palette || 'ice');
    });

    grid.addEventListener('keydown', (e) => {
      const cards = Array.from(grid.querySelectorAll('.palette-card'));
      const idx = cards.indexOf(document.activeElement);
      if (idx === -1) return;
      let nextIdx = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIdx = (idx + 1) % cards.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIdx = (idx - 1 + cards.length) % cards.length;
      }
      if (nextIdx !== -1 && cards[nextIdx]) {
        cards[nextIdx].focus();
        previewPaletteInMiniature(cards[nextIdx].getAttribute('data-palette-id'));
      }
    });
  }
}

async function handleToggleLike(songId) {
  const id = Number(songId);
  if (!id) return;
  try {
    const res = await apiRequest(`/api/favorites/${id}`, { method: 'POST' });
    PlayerStore.setFavoriteState(id, res.is_favorite);
    showToast(res.is_favorite ? 'Saved to Favorites' : 'Removed from Favorites', 'info');
    renderCurrentRoute();
  } catch (err) {
    showToast(err.message || 'Could not update favorite', 'error');
  }
}

function openSongActionsModal(songId) {
  const song = PlayerStore.state.songs.find((s) => s.id === Number(songId));
  if (!song) return;

  const titleEl = document.getElementById('modal-song-actions-title');
  const mount = document.getElementById('song-actions-mount');
  if (!mount) return;
  if (titleEl) titleEl.textContent = song.title;

  let moods = [];
  try {
    moods = JSON.parse(song.mood || '[]');
  } catch (_e) {}

  const playlists = PlayerStore.state.playlists || [];

  mount.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <!-- Quick Queue Actions -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <button type="button" class="btn btn-glass btn-sm" data-action="queue-next" data-song-id="${song.id}">
          <svg><use href="#i-play"/></svg><span>Play Next</span>
        </button>
        <button type="button" class="btn btn-glass btn-sm" data-action="queue-end" data-song-id="${song.id}">
          <svg><use href="#i-list-music"/></svg><span>Add to Queue</span>
        </button>
      </div>

      <!-- Add to Playlist -->
      <div class="glass-g1" style="padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
        <div class="text-caption">Add to Playlist</div>
        ${
          playlists.length
            ? `<div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${playlists
                  .map(
                    (pl) => `
                  <button
                    type="button"
                    class="chip"
                    data-action="add-song-to-playlist"
                    data-playlist-id="${pl.id}"
                    data-song-id="${song.id}"
                  >
                    + ${escapeHtml(pl.name)}
                  </button>
                `
                  )
                  .join('')}
              </div>`
            : `<button type="button" class="btn btn-glass btn-sm" data-action="open-create-playlist">Create New Playlist</button>`
        }
      </div>

      <!-- Edit Track Metadata & Mood Tags -->
      <form id="form-edit-song" data-song-id="${song.id}" class="glass-g1" style="padding:14px; display:flex; flex-direction:column; gap:10px;">
        <div class="text-caption">Edit Metadata &amp; Moods</div>
        <input type="text" name="title" class="input-glass" value="${escapeHtml(song.title)}" placeholder="Title" required style="min-height:38px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <input type="text" name="artist" class="input-glass" value="${escapeHtml(song.artist)}" placeholder="Artist" style="min-height:38px;">
          <input type="text" name="album" class="input-glass" value="${escapeHtml(song.album)}" placeholder="Album" style="min-height:38px;">
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">
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
        <button type="submit" class="btn btn-primary btn-sm" style="margin-top:4px;">Save Metadata</button>
      </form>

      <!-- Delete Track -->
      <button type="button" class="btn btn-danger btn-sm" data-action="confirm-delete-song" data-song-id="${song.id}">
        <svg><use href="#i-trash"/></svg><span>Delete Track from Library</span>
      </button>
    </div>
  `;

  const editForm = mount.querySelector('#form-edit-song');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(editForm);
      try {
        await apiRequest(`/api/songs/${song.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: fd.get('title'),
            artist: fd.get('artist'),
            album: fd.get('album'),
          }),
        });
        await refreshLibraryData();
        closeAllModals();
        renderCurrentRoute();
        showToast('Track metadata updated', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to update metadata', 'error');
      }
    });
  }

  openModal('modal-song-actions');
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Apply localStorage Appearance immediately, then sync with SQLite
  applyAppearanceSettings(PlayerStore.state.settings);
  initOverlaysAndGestures();
  QueueController.init();
  initPlayerUI();
  Visualizer.init();
  initUploadUI(async () => {
    await refreshLibraryData();
    renderCurrentRoute();
  });
  initKeyboardShortcuts(() => {
    if (PlayerStore.state.currentSong) {
      handleToggleLike(PlayerStore.state.currentSong.id);
    }
  });

  // Pause ambient animations when tab is hidden
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('tab-hidden', document.hidden);
  });

  // Listen to OS dark/light changes when theme_mode === 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((PlayerStore.state.settings.theme_mode || 'light') === 'system') {
      applyAppearanceSettings(PlayerStore.state.settings);
    }
  });

  // 2. Fetch SQLite settings & library data
  try {
    const sRes = await apiRequest('/api/settings');
    if (sRes && sRes.settings) {
      // Only override localStorage if user hasn't explicitly set a pre-paint preference in this session
      const merged = {
        ...sRes.settings,
        palette: localStorage.getItem('resonance_palette') || sRes.settings.palette || 'ice',
        theme_mode: localStorage.getItem('resonance_mode') || sRes.settings.theme_mode || 'light',
      };
      PlayerStore.updateSettings(merged);
      applyAppearanceSettings(merged);
      AudioEngine.applyEqualizerFromStore();
    }
  } catch (_e) {}

  await refreshLibraryData();
  QueueController.restoreSavedQueueIfEnabled();

  // 3. Initialize SPA Router
  router = new Router(() => {
    renderCurrentRoute();
  });
  router.resolve();

  // Re-render current view when playback changes playing card indicator
  PlayerStore.subscribe((_state, topic) => {
    if (topic === 'playback' && router && router.currentRoute !== 'settings') {
      renderCurrentRoute();
    }
  });

  // 4. Global Search Input (Debounced, Instant)
  const searchInput = document.getElementById('global-search-input');
  const searchClear = document.getElementById('btn-search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const val = searchInput.value;
      if (searchClear) searchClear.style.display = val ? 'inline-flex' : 'none';
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        PlayerStore.state.searchQuery = val;
        if (val.trim()) {
          PlayerStore.addRecentSearch(val.trim());
          if (router.currentRoute !== 'search') {
            router.navigate('search');
          } else {
            renderCurrentRoute();
          }
        } else if (router.currentRoute === 'search') {
          renderCurrentRoute();
        }
      }, 140);
    });
  }
  if (searchClear && searchInput) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      PlayerStore.state.searchQuery = '';
      if (router.currentRoute === 'search') {
        router.navigate('home');
      }
    });
  }

  // 5. Playlist Create / Edit Form
  const plForm = document.getElementById('form-playlist');
  if (plForm) {
    plForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('playlist-edit-id').value;
      const name = document.getElementById('playlist-name-input').value.trim();
      const description = document.getElementById('playlist-desc-input').value.trim();
      if (!name) return;

      try {
        if (editId) {
          await apiRequest(`/api/playlists/${editId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, description }),
          });
          showToast(`Renamed playlist to "${name}"`, 'success');
        } else {
          await apiRequest('/api/playlists', {
            method: 'POST',
            body: JSON.stringify({ name, description }),
          });
          showToast(`Created playlist "${name}"`, 'success');
        }
        closeAllModals();
        await refreshLibraryData();
        renderCurrentRoute();
      } catch (err) {
        showToast(err.message || 'Could not save playlist', 'error');
      }
    });
  }

  // 6. Hover Live Preview in Settings -> Appearance (Decision A3)
  document.addEventListener('mouseover', (e) => {
    const card = e.target.closest('[data-preview-palette]');
    if (card) {
      previewPaletteInMiniature(card.getAttribute('data-preview-palette'));
    }
  });

  // 7. Global Delegated Click Actions
  document.addEventListener('click', async (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.getAttribute('data-action');

    // Stop propagation if clicking a nested button inside a song card/row
    if (
      [
        'toggle-song-like',
        'open-song-actions',
        'move-pl-track',
        'remove-from-playlist',
        'remove-queue-index',
      ].includes(action)
    ) {
      e.stopPropagation();
    }

    switch (action) {
      case 'play-song': {
        const sid = actionEl.getAttribute('data-song-id');
        const ctxRaw = actionEl.getAttribute('data-context-ids');
        const ctxIds = ctxRaw ? ctxRaw.split(',').map(Number) : null;
        await QueueController.playSongFromContext(sid, ctxIds, true);
        break;
      }

      case 'play-all': {
        const allIds = PlayerStore.state.songs.map((s) => s.id);
        if (allIds.length) {
          PlayerStore.state.shuffle = false;
          await QueueController.playSongFromContext(allIds[0], allIds, true);
        }
        break;
      }

      case 'shuffle-all':
      case 'generate-shuffle-mix': {
        const songs = PlayerStore.state.songs;
        if (songs.length) {
          PlayerStore.state.shuffle = true;
          const rand = songs[Math.floor(Math.random() * songs.length)];
          await QueueController.playSongFromContext(
            rand.id,
            songs.map((s) => s.id),
            true
          );
          showToast('Playing personal Shuffle Mix', 'success');
        }
        break;
      }

      case 'play-context': {
        const ctxRaw = actionEl.getAttribute('data-context-ids') || '';
        const ids = ctxRaw.split(',').map(Number).filter(Boolean);
        if (ids.length) {
          await QueueController.playSongFromContext(ids[0], ids, true);
        }
        break;
      }

      case 'toggle-play':
        await AudioEngine.togglePlay();
        break;

      case 'next-track':
        await QueueController.nextTrack(false);
        break;

      case 'prev-track':
        await QueueController.prevTrack();
        break;

      case 'toggle-shuffle':
        QueueController.toggleShuffle();
        break;

      case 'cycle-repeat':
        QueueController.cycleRepeat();
        break;

      case 'toggle-mute':
        AudioEngine.toggleMute();
        break;

      case 'cycle-speed': {
        const nextSpeed = AudioEngine.cyclePlaybackSpeed();
        showToast(`Playback speed: ${nextSpeed}x`, 'info');
        break;
      }

      case 'toggle-current-like':
        if (PlayerStore.state.currentSong) {
          await handleToggleLike(PlayerStore.state.currentSong.id);
        }
        break;

      case 'toggle-song-like':
        await handleToggleLike(actionEl.getAttribute('data-song-id'));
        break;

      case 'toggle-expanded':
        setExpandedPlayerOpen(!PlayerStore.state.expandedOpen);
        break;

      case 'close-expanded':
        setExpandedPlayerOpen(false);
        break;

      case 'open-queue-tab':
        PlayerStore.state.expandedTab = 'queue';
        renderExpandedTabContent();
        setExpandedPlayerOpen(true);
        break;

      case 'switch-ep-tab':
        PlayerStore.state.expandedTab = actionEl.getAttribute('data-tab') || 'queue';
        renderExpandedTabContent();
        break;

      case 'set-art-mode': {
        const mode = actionEl.getAttribute('data-mode') || 'vinyl';
        await persistSettings({ player_art_mode: mode });
        break;
      }

      case 'set-viz-style': {
        const style = actionEl.getAttribute('data-style') || 'bars';
        await persistSettings({ visualizer_style: style });
        break;
      }

      case 'play-queue-index': {
        const idx = parseInt(actionEl.getAttribute('data-queue-index'), 10);
        if (Number.isFinite(idx) && PlayerStore.state.queue[idx]) {
          PlayerStore.state.queueIndex = idx;
          await QueueController.activateCurrentQueueTrack(true);
        }
        break;
      }

      case 'remove-queue-index': {
        const idx = parseInt(actionEl.getAttribute('data-queue-index'), 10);
        QueueController.removeFromQueueIndex(idx);
        break;
      }

      case 'clear-queue':
        QueueController.clearUpcomingQueue();
        break;

      // Appearance Studio Actions (Section 16.1)
      case 'select-palette': {
        const pid = actionEl.getAttribute('data-palette-id') || 'ice';
        await persistSettings({ palette: pid });
        previewPaletteInMiniature(pid);
        renderCurrentRoute();
        showToast(`Palette switched to ${actionEl.querySelector('.palette-card-name')?.textContent || pid}`, 'info');
        break;
      }

      case 'toggle-mode': {
        const current = document.documentElement.getAttribute('data-mode') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        await persistSettings({ theme_mode: next, theme: next });
        if (router.currentRoute === 'settings') renderCurrentRoute();
        break;
      }

      case 'set-theme-mode': {
        const mode = actionEl.getAttribute('data-mode') || 'light';
        await persistSettings({ theme_mode: mode, theme: mode });
        renderCurrentRoute();
        break;
      }

      case 'set-glass-preset': {
        const presetKey = actionEl.getAttribute('data-preset') || 'rich';
        const presetVals = GLASS_PRESETS[presetKey] || GLASS_PRESETS.rich;
        await persistSettings({
          glass_preset: presetKey,
          glass_blur: String(presetVals.blur),
          glass_opacity: String(presetVals.opacity),
        });
        renderCurrentRoute();
        showToast(`Glass intensity set to ${presetVals.label}`, 'info');
        break;
      }

      case 'toggle-reduced-effects': {
        const curr = String(PlayerStore.state.settings.reduced_effects) === 'true';
        await persistSettings({ reduced_effects: curr ? 'false' : 'true' });
        renderCurrentRoute();
        showToast(curr ? 'Full Liquid Crystal effects restored' : 'Reduced-effects mode enabled', 'info');
        break;
      }

      case 'reset-appearance': {
        await persistSettings({
          palette: 'ice',
          theme_mode: 'light',
          theme: 'light',
          glass_preset: 'rich',
          glass_blur: '34',
          glass_opacity: '0.52',
          reduced_effects: 'false',
          adaptive_color_intensity: 'full',
        });
        renderCurrentRoute();
        showToast('Appearance reset to Ice Blue Liquid Crystal defaults', 'success');
        break;
      }

      case 'set-setting': {
        const key = actionEl.getAttribute('data-key');
        const val = actionEl.getAttribute('data-val');
        if (key) {
          await persistSettings({ [key]: val });
          renderCurrentRoute();
        }
        break;
      }

      case 'set-motion': {
        const m = actionEl.getAttribute('data-motion') || 'full';
        await persistSettings({ motion_mode: m });
        renderCurrentRoute();
        break;
      }

      // View & Library Actions
      case 'set-view-mode': {
        const vm = actionEl.getAttribute('data-mode') || 'grid';
        PlayerStore.state.viewMode = vm;
        localStorage.setItem('resonance_view_mode', vm);
        renderCurrentRoute();
        break;
      }

      case 'toggle-sort-dir':
        PlayerStore.state.sortDir = PlayerStore.state.sortDir === 'asc' ? 'desc' : 'asc';
        renderCurrentRoute();
        break;

      case 'filter-mood': {
        const mood = actionEl.getAttribute('data-mood') || null;
        PlayerStore.state.activeMoodFilter = mood;
        renderCurrentRoute();
        break;
      }

      case 'search-artist': {
        const artist = actionEl.getAttribute('data-artist') || '';
        PlayerStore.state.searchQuery = artist;
        if (searchInput) searchInput.value = artist;
        router.navigate('search');
        break;
      }

      case 'apply-search-term': {
        const term = actionEl.getAttribute('data-term') || '';
        PlayerStore.state.searchQuery = term;
        if (searchInput) searchInput.value = term;
        renderCurrentRoute();
        break;
      }

      // Modals & Overlays
      case 'open-upload':
        openModal('modal-upload');
        break;

      case 'open-eq':
        renderEqualizerModal();
        openModal('modal-eq');
        break;

      case 'open-sleep-timer':
        SleepTimer.updateStatusUI();
        openModal('modal-sleep');
        break;

      case 'set-sleep':
        SleepTimer.setTimer(actionEl.getAttribute('data-minutes'));
        closeAllModals();
        break;

      case 'open-shortcuts':
        openModal('modal-shortcuts');
        break;

      case 'close-modals':
        closeAllModals();
        break;

      case 'go-settings':
        router.navigate('settings');
        break;

      // Playlists & Song Actions
      case 'open-create-playlist': {
        document.getElementById('modal-playlist-title').textContent = 'Create Playlist';
        document.getElementById('playlist-edit-id').value = '';
        document.getElementById('playlist-name-input').value = '';
        document.getElementById('playlist-desc-input').value = '';
        openModal('modal-playlist');
        break;
      }

      case 'edit-playlist': {
        document.getElementById('modal-playlist-title').textContent = 'Rename Playlist';
        document.getElementById('playlist-edit-id').value = actionEl.getAttribute('data-playlist-id');
        document.getElementById('playlist-name-input').value = actionEl.getAttribute('data-playlist-name') || '';
        document.getElementById('playlist-desc-input').value = actionEl.getAttribute('data-playlist-desc') || '';
        openModal('modal-playlist');
        break;
      }

      case 'open-playlist': {
        const pid = actionEl.getAttribute('data-playlist-id');
        router.navigate('playlists', pid);
        break;
      }

      case 'delete-playlist': {
        const pid = actionEl.getAttribute('data-playlist-id');
        await apiRequest(`/api/playlists/${pid}`, { method: 'DELETE' });
        await refreshLibraryData();
        router.navigate('playlists');
        showToast('Playlist deleted', 'info');
        break;
      }

      case 'open-song-actions':
        openSongActionsModal(actionEl.getAttribute('data-song-id'));
        break;

      case 'queue-next':
        QueueController.playNextInQueue(actionEl.getAttribute('data-song-id'));
        closeAllModals();
        break;

      case 'queue-end':
        QueueController.addToEndOfQueue(actionEl.getAttribute('data-song-id'));
        closeAllModals();
        break;

      case 'add-song-to-playlist': {
        const pid = actionEl.getAttribute('data-playlist-id');
        const sid = actionEl.getAttribute('data-song-id');
        await apiRequest(`/api/playlists/${pid}/tracks`, {
          method: 'POST',
          body: JSON.stringify({ song_id: Number(sid) }),
        });
        await refreshLibraryData();
        closeAllModals();
        showToast('Added track to playlist', 'success');
        break;
      }

      case 'remove-from-playlist': {
        const pid = actionEl.getAttribute('data-playlist-id');
        const sid = actionEl.getAttribute('data-song-id');
        await apiRequest(`/api/playlists/${pid}/tracks/${sid}`, { method: 'DELETE' });
        await refreshLibraryData();
        renderCurrentRoute();
        showToast('Removed track from playlist', 'info');
        break;
      }

      case 'move-pl-track': {
        const pid = actionEl.getAttribute('data-playlist-id');
        const sid = Number(actionEl.getAttribute('data-song-id'));
        const dir = Number(actionEl.getAttribute('data-dir'));
        if (activePlaylistDetail && activePlaylistDetail.songs) {
          const ids = activePlaylistDetail.songs.map((x) => x.id);
          const idx = ids.indexOf(sid);
          const targetIdx = idx + dir;
          if (idx !== -1 && targetIdx >= 0 && targetIdx < ids.length) {
            [ids[idx], ids[targetIdx]] = [ids[targetIdx], ids[idx]];
            await apiRequest(`/api/playlists/${pid}/reorder`, {
              method: 'PUT',
              body: JSON.stringify({ song_ids: ids }),
            });
            await renderCurrentRoute();
          }
        }
        break;
      }

      case 'toggle-song-mood': {
        const sid = Number(actionEl.getAttribute('data-song-id'));
        const mood = actionEl.getAttribute('data-mood');
        const song = PlayerStore.state.songs.find((s) => s.id === sid);
        if (song && mood) {
          let moods = [];
          try {
            moods = JSON.parse(song.mood || '[]');
          } catch (_e) {}
          if (moods.includes(mood)) moods = moods.filter((m) => m !== mood);
          else moods.push(mood);
          await apiRequest(`/api/songs/${sid}`, {
            method: 'PATCH',
            body: JSON.stringify({ mood: moods }),
          });
          await refreshLibraryData();
          actionEl.classList.toggle('is-active', moods.includes(mood));
          renderExpandedTabContent();
        }
        break;
      }

      case 'confirm-delete-song': {
        const sid = Number(actionEl.getAttribute('data-song-id'));
        await apiRequest(`/api/songs/${sid}`, { method: 'DELETE' });
        closeAllModals();
        await refreshLibraryData();
        renderCurrentRoute();
        showToast('Track deleted from library', 'info');
        break;
      }

      case 'rescan-library': {
        const res = await apiRequest('/api/songs/rescan', { method: 'POST' });
        await refreshLibraryData();
        renderCurrentRoute();
        showToast(`Rescan complete (+${res.added || 0} added, -${res.removed || 0} missing)`, 'success');
        break;
      }

      case 'clear-history': {
        await apiRequest('/api/history', { method: 'DELETE' });
        await refreshLibraryData();
        renderCurrentRoute();
        showToast('Listening history cleared', 'info');
        break;
      }

      case 'clear-library': {
        await apiRequest('/api/songs/clear', { method: 'POST' });
        AudioEngine.pause();
        PlayerStore.state.currentSong = null;
        PlayerStore.state.queue = [];
        await refreshLibraryData();
        renderCurrentRoute();
        showToast('Library cleared', 'info');
        break;
      }
    }
  });

  // 8. Register Service Worker for PWA installability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
