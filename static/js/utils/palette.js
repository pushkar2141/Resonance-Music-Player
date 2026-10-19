/**
 * Resonance — Palette Registry, Appearance Engine & 32×32 Canvas Artwork Extractor
 * Section 5.3, Section 5.8 & Section 16.1 Specification
 */
import { apiRequest } from '../core/api.js';
import { PlayerStore } from '../core/store.js';
import { getCoverUrl } from './format.js';

/**
 * Single Registry for Built-in Palettes (Section 5.8: Adding a palette requires
 * only one CSS block in palettes.css and one entry here).
 */
export const PALETTE_REGISTRY = [
  {
    id: 'ice',
    name: 'Ice Blue',
    subtitle: 'Liquid Crystal Default · Liquid Midnight Dark',
    light: { bgA: '#cfe3ff', bgB: '#e9defa', o1: '#6aa8ff', o2: '#ffb3e0', acc: '#2855c7', onAcc: '#ffffff', txt: '#14203a' },
    dark: { bgA: '#0b1230', bgB: '#1b0f3a', o1: '#4f7dff', o2: '#c26bff', acc: '#8fb2ff', onAcc: '#0b1230', txt: '#eef2ff' },
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    subtitle: 'Blush Crystal & Orchid Glow',
    light: { bgA: '#ffe1ea', bgB: '#f3dcff', o1: '#ff8fb1', o2: '#c4a1ff', acc: '#b81d52', onAcc: '#ffffff', txt: '#3a1424' },
    dark: { bgA: '#210b16', bgB: '#260e36', o1: '#ff6b9d', o2: '#b57cff', acc: '#ff9ebb', onAcc: '#210b16', txt: '#fff0f5' },
  },
  {
    id: 'mint',
    name: 'Mint Mist',
    subtitle: 'Glacial Jade & Sky Refraction',
    light: { bgA: '#d9f7ec', bgB: '#dff0ff', o1: '#3ddc97', o2: '#7cc7ff', acc: '#08734b', onAcc: '#ffffff', txt: '#0f2a24' },
    dark: { bgA: '#071f1a', bgB: '#0a1c30', o1: '#2ce095', o2: '#5cb8ff', acc: '#5ce6ae', onAcc: '#071f1a', txt: '#ecfdf5' },
  },
  {
    id: 'peach',
    name: 'Peach Sunrise',
    subtitle: 'Warm Amber & Coral Rose',
    light: { bgA: '#ffe6d2', bgB: '#ffd9e6', o1: '#ff9a62', o2: '#ffc857', acc: '#bf3b08', onAcc: '#ffffff', txt: '#3a1c10' },
    dark: { bgA: '#241109', bgB: '#290e1b', o1: '#ff8347', o2: '#ffb642', acc: '#ffb085', onAcc: '#241109', txt: '#fff5f0' },
  },
  {
    id: 'lavender',
    name: 'Lavender Haze',
    subtitle: 'Amethyst Prism & Celestial Cyan',
    light: { bgA: '#e6dcff', bgB: '#dbe6ff', o1: '#9d7bff', o2: '#7ad7ff', acc: '#5c38cf', onAcc: '#ffffff', txt: '#1f1740' },
    dark: { bgA: '#140d2e', bgB: '#0d1836', o1: '#8d66ff', o2: '#5cc8ff', acc: '#b69eff', onAcc: '#140d2e', txt: '#f3f0ff' },
  },
  {
    id: 'artwork',
    name: 'Adaptive (Artwork)',
    subtitle: 'Live Lighting Extracted from Playing Track',
    light: { bgA: '#d4e4ff', bgB: '#eeddff', o1: '#6aa8ff', o2: '#c4a1ff', acc: '#2855c7', onAcc: '#ffffff', txt: '#141b2d' },
    dark: { bgA: '#0c132b', bgB: '#190e30', o1: '#4f7dff', o2: '#c26bff', acc: '#9ec0ff', onAcc: '#0b1024', txt: '#f2f5ff' },
  },
];

export const GLASS_PRESETS = {
  subtle: { blur: 18, opacity: 0.36, label: 'Subtle' },
  balanced: { blur: 26, opacity: 0.46, label: 'Balanced' },
  rich: { blur: 34, opacity: 0.52, label: 'Rich' },
};

const memoryPaletteCache = new Map();

export function resolveEffectiveMode(modePref) {
  const pref = modePref || localStorage.getItem('resonance_mode') || 'light';
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref === 'dark' ? 'dark' : 'light';
}

export function applyAppearanceSettings(settings = {}) {
  const root = document.documentElement;
  const s = { ...PlayerStore.state.settings, ...settings };

  const palette = s.palette || 'ice';
  const modePref = s.theme_mode || s.theme || 'light';
  const resolvedMode = resolveEffectiveMode(modePref);

  root.setAttribute('data-palette', palette);
  root.setAttribute('data-mode', resolvedMode);
  root.setAttribute('data-mode-pref', modePref);

  localStorage.setItem('resonance_palette', palette);
  localStorage.setItem('resonance_mode', modePref);

  // Glass Intensity Presets & Custom Sliders (Decision A4)
  const preset = s.glass_preset || 'rich';
  root.setAttribute('data-glass-preset', preset);
  localStorage.setItem('resonance_glass_preset', preset);

  const blurVal = Number(s.glass_blur ?? 34);
  const opacityVal = Number(s.glass_opacity ?? 0.52);
  if (Number.isFinite(blurVal)) {
    root.style.setProperty('--glass-blur-px', `${blurVal}px`);
    localStorage.setItem('resonance_glass_blur', String(blurVal));
  }
  if (Number.isFinite(opacityVal)) {
    root.style.setProperty('--glass-opacity', String(opacityVal));
    localStorage.setItem('resonance_glass_opacity', String(opacityVal));
  }

  // Reduced effects & motion
  const reducedEffects = String(s.reduced_effects) === 'true';
  root.setAttribute('data-reduced-effects', reducedEffects ? 'true' : 'false');
  localStorage.setItem('resonance_reduced_effects', reducedEffects ? 'true' : 'false');

  const motionMode = s.motion_mode || 'full';
  root.setAttribute('data-motion', motionMode);
  localStorage.setItem('resonance_motion', motionMode);

  // Update Topbar Mode Toggle Icon
  const iconUse = document.querySelector('#theme-toggle-icon use');
  if (iconUse) {
    iconUse.setAttribute('href', resolvedMode === 'dark' ? '#i-sun' : '#i-moon');
  }

  // Update <meta name="theme-color">
  const entry = PALETTE_REGISTRY.find((p) => p.id === palette) || PALETTE_REGISTRY[0];
  const variant = resolvedMode === 'dark' ? entry.dark : entry.light;
  const meta = document.getElementById('meta-theme-color');
  if (meta && variant) {
    meta.setAttribute('content', variant.bgA);
  }
}

/**
 * Updates the miniature Live App Preview in Settings -> Appearance (Decision A3)
 */
export function previewPaletteInMiniature(paletteId, modeOverride = null) {
  const shell = document.getElementById('appearance-mini-preview');
  if (!shell) return;

  const resolvedMode = modeOverride || document.documentElement.getAttribute('data-mode') || 'light';
  const entry = PALETTE_REGISTRY.find((p) => p.id === paletteId) || PALETTE_REGISTRY[0];
  const v = resolvedMode === 'dark' ? entry.dark : entry.light;

  shell.setAttribute('data-preview-mode', resolvedMode);
  shell.style.setProperty('--preview-bgA', v.bgA);
  shell.style.setProperty('--preview-bgB', v.bgB);
  shell.style.setProperty('--preview-o1', v.o1);
  shell.style.setProperty('--preview-o2', v.o2);
  shell.style.setProperty('--preview-acc', v.acc);
  shell.style.setProperty('--preview-on-acc', v.onAcc);
  shell.style.setProperty('--preview-txt', v.txt);

  const labelEl = document.getElementById('mini-preview-palette-label');
  if (labelEl) {
    labelEl.textContent = `${entry.name} (${resolvedMode === 'dark' ? 'Dark' : 'Light'})`;
  }
}

/* --------------------------------------------------------------------------
   Color Conversion & WCAG Contrast Guard Helpers
   -------------------------------------------------------------------------- */
function hexToRgb(hex) {
  const clean = (hex || '#6aa8ff').replace('#', '').trim();
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16) || 0x6aa8ff;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Applies extracted song colors to CSS custom properties with WCAG AA Contrast Guard
 */
export function applyArtworkColorsToRoot(art1, art2, art3) {
  const root = document.documentElement;
  const intensity = PlayerStore.state.settings.adaptive_color_intensity || 'full';
  const activePalette = PlayerStore.state.settings.palette || 'ice';

  if (intensity === 'off' && activePalette !== 'artwork') {
    return;
  }

  const c1 = hexToRgb(art1);
  const c2 = hexToRgb(art2);
  const hsl1 = rgbToHsl(c1.r, c1.g, c1.b);
  const hsl2 = rgbToHsl(c2.r, c2.g, c2.b);

  // Contrast-guarded accent for Light mode (needs >= 4.5:1 against #ffffff label -> L <= 0.38)
  const accLightRgb = hslToRgb(hsl1.h, Math.max(0.68, hsl1.s), Math.min(0.36, Math.max(0.24, hsl1.l)));
  // Contrast-guarded accent for Dark mode (needs >= 4.5:1 against #0b1024 label -> L >= 0.72)
  const accDarkRgb = hslToRgb(hsl1.h, Math.max(0.72, hsl1.s), Math.max(0.74, Math.min(0.84, hsl1.l)));

  // Soft pastel background pair for Light mode (L ~ 0.90)
  const bgALight = hslToRgb(hsl1.h, Math.min(0.65, Math.max(0.35, hsl1.s)), 0.90);
  const bgBLight = hslToRgb(hsl2.h, Math.min(0.65, Math.max(0.35, hsl2.s)), 0.91);

  // Deep midnight background pair for Dark mode (L ~ 0.09)
  const bgADark = hslToRgb(hsl1.h, Math.min(0.60, Math.max(0.35, hsl1.s)), 0.09);
  const bgBDark = hslToRgb(hsl2.h, Math.min(0.60, Math.max(0.35, hsl2.s)), 0.11);

  root.style.setProperty('--art-1', art1);
  root.style.setProperty('--art-2', art2);
  root.style.setProperty('--art-3', art3);
  root.style.setProperty('--art-acc-light', rgbToHex(accLightRgb.r, accLightRgb.g, accLightRgb.b));
  root.style.setProperty('--art-acc-dark', rgbToHex(accDarkRgb.r, accDarkRgb.g, accDarkRgb.b));
  root.style.setProperty('--art-bgA-light', rgbToHex(bgALight.r, bgALight.g, bgALight.b));
  root.style.setProperty('--art-bgB-light', rgbToHex(bgBLight.r, bgBLight.g, bgBLight.b));
  root.style.setProperty('--art-bgA-dark', rgbToHex(bgADark.r, bgADark.g, bgADark.b));
  root.style.setProperty('--art-bgB-dark', rgbToHex(bgBDark.r, bgBDark.g, bgBDark.b));

  // Update the 'artwork' registry entry so Settings -> Appearance preview matches current song!
  const artEntry = PALETTE_REGISTRY.find((p) => p.id === 'artwork');
  if (artEntry) {
    artEntry.light.bgA = rgbToHex(bgALight.r, bgALight.g, bgALight.b);
    artEntry.light.bgB = rgbToHex(bgBLight.r, bgBLight.g, bgBLight.b);
    artEntry.light.o1 = art1;
    artEntry.light.o2 = art2;
    artEntry.light.acc = rgbToHex(accLightRgb.r, accLightRgb.g, accLightRgb.b);

    artEntry.dark.bgA = rgbToHex(bgADark.r, bgADark.g, bgADark.b);
    artEntry.dark.bgB = rgbToHex(bgBDark.r, bgBDark.g, bgBDark.b);
    artEntry.dark.o1 = art1;
    artEntry.dark.o2 = art2;
    artEntry.dark.acc = rgbToHex(accDarkRgb.r, accDarkRgb.g, accDarkRgb.b);
  }
}

/**
 * Extract 3 dominant vibrant colors from a song's artwork via a 32×32 offscreen canvas
 */
export async function extractAndApplySongPalette(song) {
  if (!song || !song.id) return;

  // 1. Check in-memory or server-provided palette cache
  if (memoryPaletteCache.has(song.id)) {
    const cached = memoryPaletteCache.get(song.id);
    applyArtworkColorsToRoot(cached.art_1, cached.art_2, cached.art_3);
    return;
  }
  if (song.palette && song.palette.art_1) {
    memoryPaletteCache.set(song.id, song.palette);
    applyArtworkColorsToRoot(song.palette.art_1, song.palette.art_2, song.palette.art_3);
    return;
  }

  // 2. Load artwork into a 32×32 offscreen canvas
  const coverUrl = getCoverUrl(song);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = coverUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 32, 32);
    const { data } = ctx.getImageData(0, 0, 32, 32);

    // Bucket pixels into 12 hue bins weighted by saturation
    const bins = Array.from({ length: 12 }, () => ({ count: 0, r: 0, g: 0, b: 0, satSum: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const { h, s, l } = rgbToHsl(r, g, b);
      if (s < 0.15 || l < 0.10 || l > 0.92) continue;
      const idx = Math.floor(h / 30) % 12;
      const weight = s * (1 - Math.abs(l - 0.5));
      bins[idx].count += weight;
      bins[idx].r += r * weight;
      bins[idx].g += g * weight;
      bins[idx].b += b * weight;
      bins[idx].satSum += s;
    }

    const sorted = bins
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((b) => {
        const avgR = b.r / b.count;
        const avgG = b.g / b.count;
        const avgB = b.b / b.count;
        const hsl = rgbToHsl(avgR, avgG, avgB);
        const boosted = hslToRgb(hsl.h, Math.max(0.68, hsl.s), Math.min(0.68, Math.max(0.45, hsl.l)));
        return rgbToHex(boosted.r, boosted.g, boosted.b);
      });

    const art1 = sorted[0] || '#6aa8ff';
    const art2 = sorted[1] || sorted[0] || '#c4a1ff';
    const art3 = sorted[2] || sorted[1] || '#3ddc97';

    const result = { art_1: art1, art_2: art2, art_3: art3 };
    memoryPaletteCache.set(song.id, result);
    applyArtworkColorsToRoot(art1, art2, art3);

    // Persist to SQLite palette cache asynchronously
    apiRequest(`/api/palettes/${song.id}`, {
      method: 'POST',
      body: JSON.stringify(result),
    }).catch(() => {});
  } catch (_err) {
    applyArtworkColorsToRoot('#6aa8ff', '#c4a1ff', '#3b6fe0');
  }
}
