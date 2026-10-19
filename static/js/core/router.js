/**
 * Resonance — Single-Page Application Router (Zero Reload / Persistent Audio)
 */

const ROUTE_TITLES = {
  home: 'Home',
  discover: 'Discover',
  library: 'My Library',
  songs: 'All Songs',
  favorites: 'Favorites',
  playlists: 'Playlists',
  recent: 'Recently Played',
  settings: 'Settings',
  search: 'Search Results',
};

export class Router {
  constructor(onRouteChange) {
    this.onRouteChange = onRouteChange;
    this.currentRoute = 'home';
    this.currentParam = null;

    window.addEventListener('hashchange', () => this.resolve());
  }

  navigate(route, param = null) {
    const target = param ? `#/${route}/${encodeURIComponent(param)}` : `#/${route}`;
    if (window.location.hash === target) {
      this.resolve();
    } else {
      window.location.hash = target;
    }
  }

  resolve() {
    const raw = (window.location.hash || '#/home').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    const route = ROUTE_TITLES[parts[0]] ? parts[0] : 'home';
    const param = parts[1] ? decodeURIComponent(parts[1]) : null;

    this.currentRoute = route;
    this.currentParam = param;

    document.querySelectorAll('[data-route]').forEach((el) => {
      const r = el.getAttribute('data-route');
      el.classList.toggle('is-active', r === route);
    });

    const titleEl = document.getElementById('topbar-view-title');
    if (titleEl) {
      titleEl.textContent = ROUTE_TITLES[route] || 'Resonance';
    }

    if (typeof this.onRouteChange === 'function') {
      this.onRouteChange(route, param);
    }
  }
}
