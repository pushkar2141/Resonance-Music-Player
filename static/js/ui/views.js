/**
 * Resonance — View Renderers for All 8 Navigation Routes + Settings -> Appearance Studio
 * Section 7.4, Section 10 & Section 16 Specification
 */
import { PlayerStore } from '../core/store.js';
import {
  escapeHtml,
  formatBytes,
  formatDuration,
  getCoverUrl,
  getTimeGreeting,
} from '../utils/format.js';
import { PALETTE_REGISTRY, resolveEffectiveMode } from '../utils/palette.js';

export const AVAILABLE_MOODS = ['Atmospheric', 'Late Night', 'Energy', 'Focus', 'Warm'];

function parseMoods(moodStr) {
  if (Array.isArray(moodStr)) return moodStr;
  try {
    const arr = JSON.parse(moodStr || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_e) {
    return [];
  }
}

export function renderEmptyLibraryState(
  title = 'Your Liquid Crystal Sanctuary Awaits',
  subtitle = 'Upload your personal audio files (MP3, FLAC, WAV, OGG, M4A, AAC, OPUS) to experience six Liquid Crystal color palettes, adaptive artwork lighting, 10-band studio equalization, and real-time spectrum visualization.'
) {
  return `
    <div class="glass-g2 hairline-gradient-border empty-state-card">
      <div class="empty-state-icon">
        <svg><use href="#i-music"/></svg>
      </div>
      <h2 class="text-title-md">${escapeHtml(title)}</h2>
      <p class="text-body text-secondary">${escapeHtml(subtitle)}</p>
      <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:12px; margin-top:8px;">
        <button type="button" class="btn btn-primary btn-lg" data-action="open-upload">
          <svg><use href="#i-upload"/></svg>
          <span>Upload Audio Files</span>
        </button>
      </div>
    </div>
  `;
}

export function renderSongCard(song, contextIds = null) {
  const state = PlayerStore.state;
  const isPlayingThis = state.currentSong && state.currentSong.id === song.id;
  const isFav = PlayerStore.isFavorite(song.id);
  const ctxAttr = contextIds ? `data-context-ids="${escapeHtml(contextIds.join(','))}"` : '';

  return `
    <article
      class="glass-g1 interactive media-card ${isPlayingThis ? 'is-playing-surface' : ''}"
      data-song-id="${song.id}"
      data-action="play-song"
      ${ctxAttr}
    >
      <div class="media-card-art-wrap">
        <img src="${escapeHtml(getCoverUrl(song))}" alt="${escapeHtml(song.title)}" loading="lazy">
        <button
          type="button"
          class="media-card-play-fab"
          data-action="play-song"
          data-song-id="${song.id}"
          ${ctxAttr}
          aria-label="Play ${escapeHtml(song.title)}"
        >
          <svg style="width:20px; height:20px;">
            <use href="${isPlayingThis && state.isPlaying ? '#i-pause' : '#i-play'}"/>
          </svg>
        </button>
      </div>
      <div class="media-card-body">
        <div class="media-card-title truncate">${escapeHtml(song.title)}</div>
        <div class="media-card-sub truncate">${escapeHtml(song.artist)}</div>
      </div>
      <div class="media-card-footer">
        <span class="text-caption tabular-nums">${formatDuration(song.duration)}</span>
        <div style="display:flex; align-items:center; gap:4px;">
          <button
            type="button"
            class="btn-icon btn-like ${isFav ? 'is-liked' : ''}"
            style="width:34px; height:34px;"
            data-action="toggle-song-like"
            data-song-id="${song.id}"
            aria-label="Favorite ${escapeHtml(song.title)}"
          >
            <svg style="width:16px; height:16px;"><use href="${isFav ? '#i-heart-fill' : '#i-heart'}"/></svg>
          </button>
          <button
            type="button"
            class="btn-icon"
            style="width:34px; height:34px;"
            data-action="open-song-actions"
            data-song-id="${song.id}"
            aria-label="More options for ${escapeHtml(song.title)}"
          >
            <svg style="width:16px; height:16px;"><use href="#i-more"/></svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

export function renderSongRow(song, idx = 0, contextIds = null, extraRightHtml = '') {
  const state = PlayerStore.state;
  const isPlayingThis = state.currentSong && state.currentSong.id === song.id;
  const isFav = PlayerStore.isFavorite(song.id);
  const isSelected = state.selectedSongIds.has(song.id);
  const ctxAttr = contextIds ? `data-context-ids="${escapeHtml(contextIds.join(','))}"` : '';

  return `
    <div
      class="glass-g1 interactive song-row ${isPlayingThis ? 'is-playing-surface' : ''} ${isSelected ? 'is-selected-surface' : ''}"
      data-song-id="${song.id}"
      data-action="play-song"
      ${ctxAttr}
    >
      <div class="song-col-idx text-caption tabular-nums" style="text-align:center;">
        ${
          isPlayingThis && state.isPlaying
            ? '<span class="eq-bars" aria-label="Playing"><span></span><span></span><span></span></span>'
            : idx + 1
        }
      </div>
      <img class="song-row-art" src="${escapeHtml(getCoverUrl(song))}" alt="${escapeHtml(song.title)}" loading="lazy">
      <div style="min-width:0;">
        <div class="text-ui truncate" style="font-weight:600;">${escapeHtml(song.title)}</div>
        <div class="text-caption truncate">${escapeHtml(song.artist)}</div>
      </div>
      <div class="song-col-album text-caption truncate">${escapeHtml(song.album || 'Single')}</div>
      <div class="song-col-dur text-caption tabular-nums" style="text-align:right;">${formatDuration(song.duration)}</div>
      <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
        <button
          type="button"
          class="btn-icon btn-like ${isFav ? 'is-liked' : ''}"
          data-action="toggle-song-like"
          data-song-id="${song.id}"
          aria-label="Favorite"
        >
          <svg style="width:17px; height:17px;"><use href="${isFav ? '#i-heart-fill' : '#i-heart'}"/></svg>
        </button>
        ${extraRightHtml}
        <button
          type="button"
          class="btn-icon"
          data-action="open-song-actions"
          data-song-id="${song.id}"
          aria-label="Track options"
        >
          <svg style="width:17px; height:17px;"><use href="#i-more"/></svg>
        </button>
      </div>
    </div>
  `;
}

export function renderPlaylistCoverHtml(playlist) {
  const covers = playlist.mosaic_covers || [];
  if (covers.length >= 4) {
    return `
      <div class="playlist-mosaic">
        ${covers
          .slice(0, 4)
          .map((u) => `<img src="${escapeHtml(u)}" alt="" loading="lazy">`)
          .join('')}
      </div>
    `;
  }
  const single = covers[0] || '/static/images/logo.svg';
  return `<img src="${escapeHtml(single)}" alt="${escapeHtml(playlist.name)}" loading="lazy">`;
}

/* ==========================================================================
   1. HOME VIEW
   ========================================================================== */
export function renderHomeView() {
  const state = PlayerStore.state;
  const songs = state.songs;
  if (!songs.length) {
    return renderEmptyLibraryState();
  }

  const featured = state.currentSong || songs[0];
  const moods = parseMoods(featured.mood);
  const favSongs = songs.filter((s) => PlayerStore.isFavorite(s.id)).slice(0, 6);
  const recentItems = (state.history || []).slice(0, 6);
  const newAdditions = songs.slice(0, 8);
  const allIds = songs.map((s) => s.id);

  return `
    <!-- Personalized Hero Track Banner -->
    <section class="glass-g2 hairline-gradient-border hero-banner">
      <div class="hero-art-wrap">
        <img src="${escapeHtml(getCoverUrl(featured))}" alt="${escapeHtml(featured.title)}">
      </div>
      <div style="display:flex; flex-direction:column; gap:10px; min-width:0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="badge">${escapeHtml(getTimeGreeting())}</span>
          ${moods.map((m) => `<span class="badge" style="opacity:0.85;">${escapeHtml(m)}</span>`).join('')}
        </div>
        <h2 class="text-display-lg truncate">${escapeHtml(featured.title)}</h2>
        <p class="text-title-md text-secondary truncate">${escapeHtml(featured.artist)} · ${escapeHtml(featured.album)}</p>
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-top:6px;">
          <button
            type="button"
            class="btn btn-primary btn-lg"
            data-action="play-song"
            data-song-id="${featured.id}"
            data-context-ids="${allIds.join(',')}"
          >
            <svg><use href="${state.currentSong && state.currentSong.id === featured.id && state.isPlaying ? '#i-pause' : '#i-play'}"/></svg>
            <span>${state.currentSong && state.currentSong.id === featured.id && state.isPlaying ? 'Pause Track' : 'Listen Now'}</span>
          </button>
          <button type="button" class="btn btn-glass" data-action="shuffle-all">
            <svg><use href="#i-shuffle"/></svg>
            <span>Shuffle Library</span>
          </button>
          <button type="button" class="btn btn-glass" data-action="go-settings">
            <svg><use href="#i-palette"/></svg>
            <span>Liquid Crystal Palettes</span>
          </button>
        </div>
      </div>
    </section>

    <!-- New Additions -->
    <section style="display:flex; flex-direction:column; gap:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <h3 class="text-title-md">New Additions</h3>
        <a href="#/songs" class="btn btn-ghost btn-sm">See All (${songs.length})</a>
      </div>
      <div class="cards-grid">
        ${newAdditions.map((s) => renderSongCard(s, allIds)).join('')}
      </div>
    </section>

    <!-- Favorites Quick Section -->
    ${
      favSongs.length
        ? `
      <section style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h3 class="text-title-md">Loved Frequencies</h3>
          <a href="#/favorites" class="btn btn-ghost btn-sm">View Favorites</a>
        </div>
        <div class="cards-grid">
          ${favSongs.map((s) => renderSongCard(s, favSongs.map((f) => f.id))).join('')}
        </div>
      </section>
    `
        : ''
    }

    <!-- Playlists Quick Section -->
    ${
      state.playlists.length
        ? `
      <section style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h3 class="text-title-md">Your Playlists</h3>
          <a href="#/playlists" class="btn btn-ghost btn-sm">All Playlists</a>
        </div>
        <div class="cards-grid">
          ${state.playlists
            .slice(0, 4)
            .map(
              (pl) => `
            <article class="glass-g1 interactive media-card" data-action="open-playlist" data-playlist-id="${pl.id}">
              <div class="media-card-art-wrap">${renderPlaylistCoverHtml(pl)}</div>
              <div class="media-card-body">
                <div class="media-card-title truncate">${escapeHtml(pl.name)}</div>
                <div class="media-card-sub">${pl.song_count || 0} tracks</div>
              </div>
            </article>
          `
            )
            .join('')}
        </div>
      </section>
    `
        : ''
    }

    <!-- Recently Played -->
    ${
      recentItems.length
        ? `
      <section style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h3 class="text-title-md">Recently Played</h3>
          <a href="#/recent" class="btn btn-ghost btn-sm">Full History</a>
        </div>
        <div class="song-list">
          ${recentItems.map((s, idx) => renderSongRow(s, idx, recentItems.map((r) => r.id))).join('')}
        </div>
      </section>
    `
        : ''
    }
  `;
}

/* ==========================================================================
   2. DISCOVER VIEW (100% Built From User's Own Library)
   ========================================================================== */
export function renderDiscoverView() {
  const state = PlayerStore.state;
  const songs = state.songs;
  if (!songs.length) {
    return renderEmptyLibraryState(
      'Discover Your Own Collection',
      'Upload tracks to unlock smart sections: Most Played, Forgotten Gems, By Artist, Mood Filters, and instant Shuffle Mixes.'
    );
  }

  const disc = state.discover || {};
  const mostPlayed = disc.most_played || [...songs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 6);
  const forgottenGems = disc.forgotten_gems || [...songs].sort((a, b) => (a.play_count || 0) - (b.play_count || 0)).slice(0, 6);
  const artists = disc.artists || [];
  const activeMood = state.activeMoodFilter;
  const moodFiltered = activeMood
    ? songs.filter((s) => parseMoods(s.mood).includes(activeMood))
    : songs;

  return `
    <section class="glass-g2 hairline-gradient-border" style="padding:24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px;">
      <div>
        <span class="badge">Personal Sonic Discovery</span>
        <h2 class="text-title-lg" style="margin-top:6px;">Rediscover Your Library</h2>
        <p class="text-ui text-secondary">Curated strictly from your own uploaded tracks — zero external clutter.</p>
      </div>
      <button type="button" class="btn btn-primary btn-lg" data-action="generate-shuffle-mix">
        <svg><use href="#i-sparkles"/></svg>
        <span>Generate Shuffle Mix</span>
      </button>
    </section>

    <!-- By Mood Tags -->
    <section style="display:flex; flex-direction:column; gap:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <h3 class="text-title-md">Explore by Mood</h3>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <button type="button" class="chip ${!activeMood ? 'is-active' : ''}" data-action="filter-mood" data-mood="">All Moods</button>
          ${AVAILABLE_MOODS.map(
            (m) => `
            <button type="button" class="chip ${activeMood === m ? 'is-active' : ''}" data-action="filter-mood" data-mood="${escapeHtml(m)}">
              ${escapeHtml(m)}
            </button>
          `
          ).join('')}
        </div>
      </div>
      <div class="cards-grid">
        ${
          moodFiltered.length
            ? moodFiltered.slice(0, 6).map((s) => renderSongCard(s, moodFiltered.map((x) => x.id))).join('')
            : `<div class="glass-g1" style="grid-column:1/-1; padding:24px; text-align:center;">No tracks tagged with "${escapeHtml(activeMood)}" yet.</div>`
        }
      </div>
    </section>

    <!-- Most Played -->
    <section style="display:flex; flex-direction:column; gap:14px;">
      <h3 class="text-title-md">Most Played</h3>
      <div class="cards-grid">
        ${mostPlayed.map((s) => renderSongCard(s, mostPlayed.map((x) => x.id))).join('')}
      </div>
    </section>

    <!-- Forgotten Gems -->
    <section style="display:flex; flex-direction:column; gap:14px;">
      <h3 class="text-title-md">Forgotten Gems</h3>
      <div class="song-list">
        ${forgottenGems.map((s, idx) => renderSongRow(s, idx, forgottenGems.map((x) => x.id))).join('')}
      </div>
    </section>

    <!-- By Artist -->
    ${
      artists.length
        ? `
      <section style="display:flex; flex-direction:column; gap:14px;">
        <h3 class="text-title-md">By Artist</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:12px;">
          ${artists
            .map(
              (a) => `
            <div class="glass-g1 interactive" style="padding:14px 18px; display:flex; align-items:center; justify-content:space-between;" data-action="search-artist" data-artist="${escapeHtml(a.artist)}">
              <div style="min-width:0;">
                <div class="text-ui truncate" style="font-weight:600;">${escapeHtml(a.artist)}</div>
                <div class="text-caption">${a.track_count} track${a.track_count === 1 ? '' : 's'}</div>
              </div>
              <svg style="width:18px; height:18px; color:var(--acc);"><use href="#i-play"/></svg>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    `
        : ''
    }
  `;
}

/* ==========================================================================
   3 & 4. MY LIBRARY / ALL SONGS COLLECTION VIEW
   ========================================================================== */
export function renderSongsCollectionView(isLibraryOverview = false) {
  const state = PlayerStore.state;
  const songs = [...state.songs];

  if (!songs.length) {
    return renderEmptyLibraryState();
  }

  // Apply sorting
  const dir = state.sortDir === 'asc' ? 1 : -1;
  songs.sort((a, b) => {
    const field = state.sortBy;
    if (field === 'title' || field === 'artist') {
      return String(a[field] || '').localeCompare(String(b[field] || '')) * dir;
    }
    if (field === 'duration' || field === 'play_count') {
      return ((Number(a[field]) || 0) - (Number(b[field]) || 0)) * dir;
    }
    return String(a.created_at || '').localeCompare(String(b.created_at || '')) * dir;
  });

  const ids = songs.map((s) => s.id);
  const totalSec = songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);

  return `
    <!-- Library Toolbar -->
    <section class="glass-g2" style="padding:18px 24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px;">
      <div>
        <h2 class="text-title-md">${isLibraryOverview ? 'My Audio Library' : 'All Songs'}</h2>
        <p class="text-caption">${songs.length} track${songs.length === 1 ? '' : 's'} · Total runtime ${formatDuration(totalSec)}</p>
      </div>

      <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
        <button type="button" class="btn btn-primary btn-sm" data-action="play-all">
          <svg><use href="#i-play"/></svg><span>Play All</span>
        </button>
        <button type="button" class="btn btn-glass btn-sm" data-action="shuffle-all">
          <svg><use href="#i-shuffle"/></svg><span>Shuffle</span>
        </button>

        <select class="select-glass" id="library-sort-select" style="width:auto; min-height:36px; padding:0 14px;" aria-label="Sort songs by">
          <option value="created_at" ${state.sortBy === 'created_at' ? 'selected' : ''}>Sort: Date Added</option>
          <option value="title" ${state.sortBy === 'title' ? 'selected' : ''}>Sort: Title</option>
          <option value="artist" ${state.sortBy === 'artist' ? 'selected' : ''}>Sort: Artist</option>
          <option value="duration" ${state.sortBy === 'duration' ? 'selected' : ''}>Sort: Duration</option>
          <option value="play_count" ${state.sortBy === 'play_count' ? 'selected' : ''}>Sort: Play Count</option>
        </select>

        <button type="button" class="btn-icon" data-action="toggle-sort-dir" title="Toggle ascending/descending" aria-label="Toggle sort direction">
          <svg><use href="${state.sortDir === 'asc' ? '#i-chevron-up' : '#i-chevron-down'}"/></svg>
        </button>

        <div style="display:flex; gap:4px;" role="group" aria-label="View layout">
          <button type="button" class="btn-icon ${state.viewMode === 'grid' ? 'is-active' : ''}" data-action="set-view-mode" data-mode="grid" aria-label="Grid view">
            <svg><use href="#i-grid"/></svg>
          </button>
          <button type="button" class="btn-icon ${state.viewMode === 'list' ? 'is-active' : ''}" data-action="set-view-mode" data-mode="list" aria-label="List view">
            <svg><use href="#i-list"/></svg>
          </button>
        </div>
      </div>
    </section>

    ${
      state.viewMode === 'grid'
        ? `<div class="cards-grid">${songs.map((s) => renderSongCard(s, ids)).join('')}</div>`
        : `<div class="song-list">${songs.map((s, idx) => renderSongRow(s, idx, ids)).join('')}</div>`
    }
  `;
}

/* ==========================================================================
   5. FAVORITES VIEW
   ========================================================================== */
export function renderFavoritesView() {
  const state = PlayerStore.state;
  const favSongs = state.songs.filter((s) => PlayerStore.isFavorite(s.id));

  if (!favSongs.length) {
    return `
      <div class="glass-g2 hairline-gradient-border empty-state-card">
        <div class="empty-state-icon">
          <svg><use href="#i-heart"/></svg>
        </div>
        <h2 class="text-title-md">No Favorites Yet</h2>
        <p class="text-body text-secondary">Tap the heart icon on any track or press <kbd class="badge">L</kbd> while listening to save your favorite frequencies here.</p>
        <a href="#/songs" class="btn btn-primary">Browse All Songs</a>
      </div>
    `;
  }

  const ids = favSongs.map((s) => s.id);
  return `
    <section class="glass-g2" style="padding:20px 24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px;">
      <div>
        <h2 class="text-title-md">Favorite Tracks</h2>
        <p class="text-caption">${favSongs.length} loved track${favSongs.length === 1 ? '' : 's'}</p>
      </div>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-primary btn-sm" data-action="play-context" data-context-ids="${ids.join(',')}">
          <svg><use href="#i-play"/></svg><span>Play Favorites</span>
        </button>
      </div>
    </section>
    <div class="song-list">
      ${favSongs.map((s, idx) => renderSongRow(s, idx, ids)).join('')}
    </div>
  `;
}

/* ==========================================================================
   6. PLAYLISTS VIEW (Grid + Detail View with Track Reordering)
   ========================================================================== */
export function renderPlaylistsView(activePlaylistDetail = null) {
  const state = PlayerStore.state;

  if (activePlaylistDetail) {
    const pl = activePlaylistDetail;
    const tracks = pl.songs || [];
    const ids = tracks.map((t) => t.id);

    return `
      <section class="glass-g2 hairline-gradient-border hero-banner">
        <div class="hero-art-wrap">
          ${renderPlaylistCoverHtml(pl)}
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <a href="#/playlists" class="chip">← All Playlists</a>
            <span class="badge">${tracks.length} tracks</span>
          </div>
          <h2 class="text-display-lg truncate">${escapeHtml(pl.name)}</h2>
          <p class="text-body text-secondary">${escapeHtml(pl.description || 'Custom Liquid Crystal playlist')}</p>
          <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:4px;">
            <button
              type="button"
              class="btn btn-primary"
              data-action="play-context"
              data-context-ids="${ids.join(',')}"
              ${!tracks.length ? 'disabled' : ''}
            >
              <svg><use href="#i-play"/></svg><span>Play Playlist</span>
            </button>
            <button
              type="button"
              class="btn btn-glass"
              data-action="edit-playlist"
              data-playlist-id="${pl.id}"
              data-playlist-name="${escapeHtml(pl.name)}"
              data-playlist-desc="${escapeHtml(pl.description || '')}"
            >
              <svg><use href="#i-edit"/></svg><span>Rename</span>
            </button>
            <button type="button" class="btn btn-danger" data-action="delete-playlist" data-playlist-id="${pl.id}">
              <svg><use href="#i-trash"/></svg><span>Delete</span>
            </button>
          </div>
        </div>
      </section>

      ${
        tracks.length
          ? `
        <div class="song-list">
          ${tracks
            .map((s, idx) => {
              const reorderBtns = `
                <button type="button" class="btn-icon" data-action="move-pl-track" data-playlist-id="${pl.id}" data-song-id="${s.id}" data-dir="-1" title="Move Up" aria-label="Move track up" ${idx === 0 ? 'disabled' : ''}>
                  <svg style="width:15px; height:15px;"><use href="#i-chevron-up"/></svg>
                </button>
                <button type="button" class="btn-icon" data-action="move-pl-track" data-playlist-id="${pl.id}" data-song-id="${s.id}" data-dir="1" title="Move Down" aria-label="Move track down" ${idx === tracks.length - 1 ? 'disabled' : ''}>
                  <svg style="width:15px; height:15px;"><use href="#i-chevron-down"/></svg>
                </button>
                <button type="button" class="btn-icon" data-action="remove-from-playlist" data-playlist-id="${pl.id}" data-song-id="${s.id}" title="Remove from playlist" aria-label="Remove from playlist">
                  <svg style="width:15px; height:15px;"><use href="#i-x"/></svg>
                </button>
              `;
              return renderSongRow(s, idx, ids, reorderBtns);
            })
            .join('')}
        </div>
      `
          : `
        <div class="glass-g1 empty-state-card">
          <h3 class="text-title-md">This Playlist is Empty</h3>
          <p class="text-caption">Open any song's menu (⋯) in your library to add tracks to this playlist.</p>
          <a href="#/songs" class="btn btn-primary btn-sm">Add Tracks from Library</a>
        </div>
      `
      }
    `;
  }

  return `
    <section class="glass-g2" style="padding:20px 24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px;">
      <div>
        <h2 class="text-title-md">Playlists</h2>
        <p class="text-caption">${state.playlists.length} curated collection${state.playlists.length === 1 ? '' : 's'}</p>
      </div>
      <button type="button" class="btn btn-primary btn-sm" data-action="open-create-playlist">
        <svg><use href="#i-plus"/></svg><span>New Playlist</span>
      </button>
    </section>

    ${
      state.playlists.length
        ? `
      <div class="cards-grid">
        ${state.playlists
          .map(
            (pl) => `
          <article class="glass-g1 interactive media-card" data-action="open-playlist" data-playlist-id="${pl.id}">
            <div class="media-card-art-wrap">${renderPlaylistCoverHtml(pl)}</div>
            <div class="media-card-body">
              <div class="media-card-title truncate">${escapeHtml(pl.name)}</div>
              <div class="media-card-sub truncate">${escapeHtml(pl.description || `${pl.song_count || 0} tracks`)}</div>
            </div>
            <div class="media-card-footer">
              <span class="badge">${pl.song_count || 0} tracks</span>
            </div>
          </article>
        `
          )
          .join('')}
      </div>
    `
        : `
      <div class="glass-g2 hairline-gradient-border empty-state-card">
        <div class="empty-state-icon">
          <svg><use href="#i-list-music"/></svg>
        </div>
        <h3 class="text-title-md">Create Your First Playlist</h3>
        <p class="text-body text-secondary">Organize your tracks with automatic 2×2 mosaic artwork and drag/button reordering.</p>
        <button type="button" class="btn btn-primary" data-action="open-create-playlist">
          <svg><use href="#i-plus"/></svg><span>Create Playlist</span>
        </button>
      </div>
    `
    }
  `;
}

/* ==========================================================================
   7. RECENTLY PLAYED VIEW
   ========================================================================== */
export function renderRecentView() {
  const history = PlayerStore.state.history || [];
  if (!history.length) {
    return `
      <div class="glass-g2 hairline-gradient-border empty-state-card">
        <div class="empty-state-icon">
          <svg><use href="#i-clock"/></svg>
        </div>
        <h2 class="text-title-md">No Listening History Yet</h2>
        <p class="text-body text-secondary">Tracks you listen to are recorded automatically in chronological order.</p>
      </div>
    `;
  }

  const ids = history.map((h) => h.id);
  return `
    <section class="glass-g2" style="padding:20px 24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px;">
      <div>
        <h2 class="text-title-md">Recently Played</h2>
        <p class="text-caption">${history.length} recent playback event${history.length === 1 ? '' : 's'}</p>
      </div>
      <button type="button" class="btn btn-danger btn-sm" data-action="clear-history">
        <svg><use href="#i-trash"/></svg><span>Clear History</span>
      </button>
    </section>

    <div class="song-list">
      ${history.map((s, idx) => renderSongRow(s, idx, ids)).join('')}
    </div>
  `;
}

/* ==========================================================================
   8. SETTINGS VIEW — FEATURING "APPEARANCE STUDIO" (Section 16.1 & 16.2)
   ========================================================================== */
export function renderSettingsView() {
  const state = PlayerStore.state;
  const s = state.settings;
  const activePalette = s.palette || 'ice';
  const modePref = s.theme_mode || s.theme || 'light';
  const resolvedMode = resolveEffectiveMode(modePref);
  const glassPreset = s.glass_preset || 'rich';
  const blurVal = Number(s.glass_blur ?? 34);
  const opacityPct = Math.round(Number(s.glass_opacity ?? 0.52) * 100);
  const reducedEffects = String(s.reduced_effects) === 'true';

  const activeEntry = PALETTE_REGISTRY.find((p) => p.id === activePalette) || PALETTE_REGISTRY[0];
  const activeVariant = resolvedMode === 'dark' ? activeEntry.dark : activeEntry.light;

  const totalBytes = state.songs.reduce((acc, x) => acc + (Number(x.file_size) || 0), 0);

  return `
    <!-- ======================================================================
         16.1 APPEARANCE STUDIO (Top of Settings — Required by Section 16.1)
         ====================================================================== -->
    <section class="glass-g2 hairline-gradient-border" style="padding:24px; display:flex; flex-direction:column; gap:24px;" aria-labelledby="settings-appearance-heading">
      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <span class="badge">Section 16.1 · Liquid Crystal Studio</span>
          <h2 class="text-title-lg" id="settings-appearance-heading" style="margin-top:6px;">Appearance &amp; Color Palettes</h2>
          <p class="text-caption">Select a Liquid Crystal palette, hover to preview live, and fine-tune optical blur &amp; crystal opacity.</p>
        </div>
        <button type="button" class="btn btn-glass btn-sm" data-action="reset-appearance">
          <span>Reset Appearance</span>
        </button>
      </div>

      <div class="appearance-studio">
        <!-- Left: 6-Palette Picker Grid + Theme Mode + Adaptive Intensity -->
        <div style="display:flex; flex-direction:column; gap:20px; min-width:0;">
          <div>
            <div class="text-ui" style="font-weight:600; margin-bottom:10px;">Color Palette (700ms Smooth Cross-Fade)</div>
            <div class="palette-picker-grid" role="radiogroup" aria-label="Color Palette Picker" id="palette-picker-grid">
              ${PALETTE_REGISTRY.map((p) => {
                const isSelected = p.id === activePalette;
                const v = resolvedMode === 'dark' ? p.dark : p.light;
                return `
                  <button
                    type="button"
                    class="glass-g1 interactive palette-card"
                    role="radio"
                    aria-checked="${isSelected ? 'true' : 'false'}"
                    aria-pressed="${isSelected ? 'true' : 'false'}"
                    data-action="select-palette"
                    data-palette-id="${p.id}"
                    data-preview-palette="${p.id}"
                  >
                    <div class="palette-swatches" aria-hidden="true">
                      <span style="background:${v.bgA};"></span>
                      <span style="background:${v.bgB};"></span>
                      <span style="background:${v.o1};"></span>
                      <span style="background:${v.o2};"></span>
                      <span style="background:${v.acc};"></span>
                    </div>
                    <div class="palette-card-header">
                      <div>
                        <div class="palette-card-name">${escapeHtml(p.name)}</div>
                        <div class="text-caption" style="font-size:11px;">${escapeHtml(p.subtitle)}</div>
                      </div>
                      <div class="palette-check-dot">
                        ${isSelected ? '<svg style="width:12px; height:12px;"><use href="#i-check"/></svg>' : ''}
                      </div>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Mode Selector (Light / Dark / System) & Adaptive Artwork Intensity -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
            <div class="glass-g1" style="padding:16px; display:flex; flex-direction:column; gap:10px;">
              <div class="text-ui" style="font-weight:600;">Theme Mode</div>
              <div style="display:flex; gap:8px;" role="group" aria-label="Theme Mode">
                <button type="button" class="chip ${modePref === 'light' ? 'is-active' : ''}" data-action="set-theme-mode" data-mode="light">
                  <svg><use href="#i-sun"/></svg><span>Light</span>
                </button>
                <button type="button" class="chip ${modePref === 'dark' ? 'is-active' : ''}" data-action="set-theme-mode" data-mode="dark">
                  <svg><use href="#i-moon"/></svg><span>Dark</span>
                </button>
                <button type="button" class="chip ${modePref === 'system' ? 'is-active' : ''}" data-action="set-theme-mode" data-mode="system">
                  <span>System</span>
                </button>
              </div>
            </div>

            <div class="glass-g1" style="padding:16px; display:flex; flex-direction:column; gap:10px;">
              <div class="text-ui" style="font-weight:600;">Adaptive Artwork Intensity</div>
              <div style="display:flex; gap:8px;" role="group" aria-label="Adaptive Artwork Intensity">
                <button type="button" class="chip ${s.adaptive_color_intensity === 'full' ? 'is-active' : ''}" data-action="set-setting" data-key="adaptive_color_intensity" data-val="full">Full</button>
                <button type="button" class="chip ${s.adaptive_color_intensity === 'subtle' ? 'is-active' : ''}" data-action="set-setting" data-key="adaptive_color_intensity" data-val="subtle">Subtle</button>
                <button type="button" class="chip ${s.adaptive_color_intensity === 'off' ? 'is-active' : ''}" data-action="set-setting" data-key="adaptive_color_intensity" data-val="off">Off</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Live Miniature App Preview + Glass Intensity Presets & Sliders -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div
            class="mini-preview-shell"
            id="appearance-mini-preview"
            data-preview-mode="${resolvedMode}"
            style="--preview-bgA:${activeVariant.bgA}; --preview-bgB:${activeVariant.bgB}; --preview-o1:${activeVariant.o1}; --preview-o2:${activeVariant.o2}; --preview-acc:${activeVariant.acc}; --preview-on-acc:${activeVariant.onAcc}; --preview-txt:${activeVariant.txt};"
          >
            <div class="mini-preview-orb-1"></div>
            <div class="mini-preview-orb-2"></div>
            <div style="position:relative; z-index:2; display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
              <span class="text-caption" style="color:inherit; opacity:0.85; font-weight:600;">LIVE PREVIEW</span>
              <span class="badge" id="mini-preview-palette-label" style="background:var(--preview-acc); color:var(--preview-on-acc); border:none;">
                ${escapeHtml(activeEntry.name)} (${resolvedMode === 'dark' ? 'Dark' : 'Light'})
              </span>
            </div>
            <div class="mini-preview-grid">
              <div class="mini-preview-sidebar">
                <div class="mini-nav-pill is-active"></div>
                <div class="mini-nav-pill"></div>
                <div class="mini-nav-pill"></div>
                <div class="mini-nav-pill"></div>
              </div>
              <div class="mini-preview-main">
                <div class="mini-preview-card">
                  <div class="mini-preview-art"></div>
                  <div style="min-width:0; flex:1;">
                    <div style="font-size:13px; font-weight:700;" class="truncate">Crystal Horizons</div>
                    <div style="font-size:11px; opacity:0.75;" class="truncate">Resonance Studio</div>
                  </div>
                </div>
                <div class="mini-preview-player">
                  <div style="display:flex; align-items:center; gap:8px; flex:1;">
                    <div class="mini-preview-play-btn">
                      <svg style="width:12px; height:12px;"><use href="#i-play"/></svg>
                    </div>
                    <div style="height:5px; flex:1; border-radius:99px; background:rgba(128,128,128,0.28); overflow:hidden;">
                      <div style="width:64%; height:100%; background:var(--preview-acc);"></div>
                    </div>
                  </div>
                  <span style="font-size:10px; font-weight:600;" class="tabular-nums">02:48</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Glass Intensity Presets & Advanced Blur / Transparency Sliders (Decision A4) -->
          <div class="glass-g1" style="padding:18px; display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
              <div class="text-ui" style="font-weight:600;">Liquid Crystal Glass Intensity</div>
              <div style="display:flex; gap:6px;" role="group" aria-label="Glass Intensity Presets">
                <button type="button" class="chip ${glassPreset === 'subtle' ? 'is-active' : ''}" data-action="set-glass-preset" data-preset="subtle">Subtle</button>
                <button type="button" class="chip ${glassPreset === 'balanced' ? 'is-active' : ''}" data-action="set-glass-preset" data-preset="balanced">Balanced</button>
                <button type="button" class="chip ${glassPreset === 'rich' ? 'is-active' : ''}" data-action="set-glass-preset" data-preset="rich">Rich</button>
                ${glassPreset === 'custom' ? '<span class="chip is-active">Custom</span>' : ''}
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <label class="text-caption" for="slider-glass-blur">Crystal Optical Blur</label>
                <span class="text-caption tabular-nums" id="label-glass-blur">${blurVal} px</span>
              </div>
              <input
                type="range"
                id="slider-glass-blur"
                class="crystal-slider"
                min="8"
                max="52"
                step="1"
                value="${blurVal}"
              >
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <label class="text-caption" for="slider-glass-opacity">Crystal Surface Opacity</label>
                <span class="text-caption tabular-nums" id="label-glass-opacity">${opacityPct}%</span>
              </div>
              <input
                type="range"
                id="slider-glass-opacity"
                class="crystal-slider"
                min="25"
                max="80"
                step="1"
                value="${opacityPct}"
              >
            </div>

            <div style="display:flex; align-items:center; justify-content:space-between; padding-top:6px; border-top:1px solid var(--edge);">
              <div>
                <div class="text-ui" style="font-weight:600;">Reduced-Effects Mode</div>
                <div class="text-caption">Lowers blur &amp; orb count for low-power or mobile devices</div>
              </div>
              <button
                type="button"
                class="chip ${reducedEffects ? 'is-active' : ''}"
                data-action="toggle-reduced-effects"
                aria-pressed="${reducedEffects ? 'true' : 'false'}"
              >
                ${reducedEffects ? 'Enabled' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         16.2 PLAYBACK, AUDIO DSP, MOTION & LIBRARY MANAGEMENT
         ====================================================================== -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(310px, 1fr)); gap:20px;">
      <!-- Playback & Audio Preferences -->
      <section class="glass-g2" style="padding:22px; display:flex; flex-direction:column; gap:16px;">
        <h3 class="text-title-md">Playback &amp; Visualizer</h3>

        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div class="text-ui">Visualizer Style</div>
            <div class="text-caption">Real-time Web Audio AnalyserNode mode</div>
          </div>
          <select class="select-glass" id="setting-viz-select" style="width:165px; min-height:38px;">
            <option value="bars" ${s.visualizer_style === 'bars' ? 'selected' : ''}>Spectrum Bars</option>
            <option value="wave" ${s.visualizer_style === 'wave' ? 'selected' : ''}>Smooth Waveform</option>
            <option value="circular" ${s.visualizer_style === 'circular' ? 'selected' : ''}>Circular Spectrum</option>
            <option value="glow" ${s.visualizer_style === 'glow' ? 'selected' : ''}>Ambient Glow</option>
          </select>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div class="text-ui">Resume Last Track &amp; Queue</div>
            <div class="text-caption">Restore active queue on startup</div>
          </div>
          <button
            type="button"
            class="chip ${s.resume_last_track === 'true' ? 'is-active' : ''}"
            data-action="set-setting"
            data-key="resume_last_track"
            data-val="${s.resume_last_track === 'true' ? 'false' : 'true'}"
          >
            ${s.resume_last_track === 'true' ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div class="text-ui">Motion &amp; Microinteractions</div>
            <div class="text-caption">Ambient orb drift &amp; vinyl spin</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="chip ${s.motion_mode !== 'reduced' ? 'is-active' : ''}" data-action="set-motion" data-motion="full">Full</button>
            <button type="button" class="chip ${s.motion_mode === 'reduced' ? 'is-active' : ''}" data-action="set-motion" data-motion="reduced">Reduced</button>
          </div>
        </div>

        <div style="display:flex; gap:10px; padding-top:6px;">
          <button type="button" class="btn btn-primary btn-sm" data-action="open-eq">
            <svg><use href="#i-sliders"/></svg><span>10-Band Equalizer</span>
          </button>
          <button type="button" class="btn btn-glass btn-sm" data-action="open-shortcuts">
            <svg><use href="#i-keyboard"/></svg><span>Shortcuts</span>
          </button>
        </div>
      </section>

      <!-- Library Management & Maintenance -->
      <section class="glass-g2" style="padding:22px; display:flex; flex-direction:column; gap:16px;">
        <h3 class="text-title-md">Library &amp; Storage</h3>

        <div class="glass-g1" style="padding:14px; display:grid; grid-template-columns:1fr 1fr 1fr; text-align:center; gap:8px;">
          <div>
            <div class="text-title-md tabular-nums">${state.songs.length}</div>
            <div class="text-caption">Tracks</div>
          </div>
          <div>
            <div class="text-title-md tabular-nums">${state.playlists.length}</div>
            <div class="text-caption">Playlists</div>
          </div>
          <div>
            <div class="text-title-md tabular-nums">${formatBytes(totalBytes)}</div>
            <div class="text-caption">Storage</div>
          </div>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:10px;">
          <button type="button" class="btn btn-glass btn-sm" data-action="rescan-library">
            <span>Rescan Disk Library</span>
          </button>
          <button type="button" class="btn btn-glass btn-sm" data-action="clear-history">
            <span>Clear Play History</span>
          </button>
          <button type="button" class="btn btn-danger btn-sm" data-action="clear-library">
            <svg><use href="#i-trash"/></svg><span>Clear Entire Library</span>
          </button>
        </div>

        <div style="padding-top:4px;">
          <a href="/styleguide" class="btn btn-ghost btn-sm">Open Liquid Crystal Design System Styleguide →</a>
        </div>
      </section>
    </div>
  `;
}

/* ==========================================================================
   9. SEARCH VIEW
   ========================================================================== */
export function renderSearchView() {
  const state = PlayerStore.state;
  const q = (state.searchQuery || '').trim().toLowerCase();
  const songs = state.songs.filter(
    (s) =>
      !q ||
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q) ||
      (s.album || '').toLowerCase().includes(q)
  );
  const ids = songs.map((s) => s.id);

  return `
    <section class="glass-g2" style="padding:20px 24px; display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 class="text-title-md">${q ? `Search Results for "${escapeHtml(state.searchQuery)}"` : 'Search Your Library'}</h2>
          <p class="text-caption">${songs.length} matching track${songs.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      ${
        state.recentSearches.length
          ? `
        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
          <span class="text-caption">Recent:</span>
          ${state.recentSearches
            .map(
              (term) =>
                `<button type="button" class="chip" data-action="apply-search-term" data-term="${escapeHtml(term)}">${escapeHtml(term)}</button>`
            )
            .join('')}
        </div>
      `
          : ''
      }
    </section>

    ${
      songs.length
        ? `<div class="song-list">${songs.map((s, idx) => renderSongRow(s, idx, ids)).join('')}</div>`
        : `
      <div class="glass-g2 empty-state-card">
        <div class="empty-state-icon"><svg><use href="#i-search"/></svg></div>
        <h3 class="text-title-md">No Matching Frequencies</h3>
        <p class="text-caption">No tracks matched "${escapeHtml(state.searchQuery)}". Try searching by artist or album.</p>
      </div>
    `
    }
  `;
}
