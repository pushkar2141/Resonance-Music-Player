/**
 * Resonance — 10-Band Studio Equalizer & Live SVG Frequency Curve
 * Section 13.2 Specification:
 * Presets include Flat, Bass Boost, Vocal, Treble, Night, Electronic, Acoustic, Rock, Custom
 */
import { apiRequest } from '../core/api.js';
import { PlayerStore } from '../core/store.js';
import { AudioEngine, EQ_FREQUENCIES } from '../player/audio-engine.js';
import { escapeHtml } from '../utils/format.js';

export const EQ_PRESETS = {
  flat: { name: 'Flat', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  bass: { name: 'Bass Boost', bands: [6, 5, 4, 2, 0, 0, 0, 0, 1, 1] },
  vocal: { name: 'Vocal', bands: [-2, -1, 0, 2, 4, 5, 4, 2, 0, -1] },
  treble: { name: 'Treble', bands: [0, 0, 0, 0, 1, 2, 4, 5, 6, 6] },
  night: { name: 'Night', bands: [-4, -3, -1, 1, 2, 2, 1, -1, -2, -3] },
  electronic: { name: 'Electronic', bands: [5, 4, 1, 0, -2, 1, 1, 3, 5, 6] },
  acoustic: { name: 'Acoustic', bands: [3, 3, 2, 1, 2, 2, 3, 4, 3, 2] },
  rock: { name: 'Rock', bands: [4, 3, 2, -1, -2, 0, 2, 4, 5, 5] },
};

function formatFreqLabel(hz) {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

function buildEqCurveSvg(bands) {
  const width = 600;
  const height = 96;
  const points = bands.map((db, idx) => {
    const x = 24 + (idx / (bands.length - 1)) * (width - 48);
    const y = height / 2 - (Math.max(-12, Math.min(12, db)) / 12) * (height * 0.38);
    return { x, y };
  });

  const pathD = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const fillD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="overflow:visible;">
      <defs>
        <linearGradient id="eqFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--acc)" stop-opacity="0.34"/>
          <stop offset="100%" stop-color="var(--acc)" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="24" y1="${height / 2}" x2="${width - 24}" y2="${height / 2}" stroke="var(--edge)" stroke-dasharray="4 4"/>
      <path d="${fillD}" fill="url(#eqFillGrad)"/>
      <path d="${pathD}" fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map((pt) => `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4" fill="var(--acc)" stroke="#fff" stroke-width="1.5"/>`).join('')}
    </svg>
  `;
}

export function renderEqualizerModal() {
  const mount = document.getElementById('eq-modal-mount');
  if (!mount) return;

  const s = PlayerStore.state.settings;
  const enabled = String(s.eq_enabled) !== 'false';
  const activePreset = s.eq_preset || 'flat';
  const preamp = parseFloat(s.eq_preamp || '0') || 0;
  let bands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  try {
    const parsed = JSON.parse(s.eq_bands || '[]');
    if (Array.isArray(parsed) && parsed.length === 10) {
      bands = parsed.map((v) => Number(v) || 0);
    }
  } catch (_e) {}

  mount.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <!-- Top Controls: Enable Toggle + Presets -->
      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px;">
        <button
          type="button"
          class="chip ${enabled ? 'is-active' : ''}"
          id="btn-eq-toggle"
          aria-pressed="${enabled ? 'true' : 'false'}"
        >
          ${enabled ? 'EQ Active' : 'EQ Bypassed'}
        </button>

        <div style="display:flex; flex-wrap:wrap; gap:6px;" role="group" aria-label="EQ Presets">
          ${Object.entries(EQ_PRESETS)
            .map(
              ([key, p]) => `
            <button
              type="button"
              class="chip ${activePreset === key ? 'is-active' : ''}"
              data-eq-preset="${escapeHtml(key)}"
            >
              ${escapeHtml(p.name)}
            </button>
          `
            )
            .join('')}
          ${activePreset === 'custom' ? '<span class="chip is-active">Custom</span>' : ''}
        </div>
      </div>

      <!-- Live SVG Frequency Curve -->
      <div class="glass-g1" id="eq-curve-box" style="padding:12px;">
        ${buildEqCurveSvg(bands)}
      </div>

      <!-- Preamp Slider -->
      <div class="glass-g1" style="padding:12px 16px; display:flex; align-items:center; gap:14px;">
        <label class="text-caption" for="eq-preamp-slider" style="min-width:90px;">Preamp Gain</label>
        <input
          type="range"
          id="eq-preamp-slider"
          class="crystal-slider"
          min="-12"
          max="12"
          step="0.5"
          value="${preamp}"
        >
        <span class="text-caption tabular-nums" id="eq-preamp-val" style="min-width:52px; text-align:right;">
          ${preamp > 0 ? `+${preamp}` : preamp} dB
        </span>
      </div>

      <!-- 10 Frequency Band Sliders -->
      <div class="glass-g1 eq-sliders-grid">
        ${EQ_FREQUENCIES.map(
          (freq, idx) => `
          <div class="eq-band-col">
            <span class="text-caption tabular-nums" data-eq-db-label="${idx}">
              ${bands[idx] > 0 ? `+${bands[idx]}` : bands[idx]}dB
            </span>
            <div class="eq-vertical-wrap">
              <input
                type="range"
                class="eq-band-slider"
                data-band-index="${idx}"
                min="-12"
                max="12"
                step="0.5"
                value="${bands[idx]}"
                aria-label="${freq} Hz Band"
              >
            </div>
            <span class="text-caption">${formatFreqLabel(freq)}</span>
          </div>
        `
        ).join('')}
      </div>
    </div>
  `;

  // Bind live events inside EQ modal
  const toggleBtn = mount.querySelector('#btn-eq-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const next = String(PlayerStore.state.settings.eq_enabled) === 'false' ? 'true' : 'false';
      saveAndApplyEq({ eq_enabled: next });
      renderEqualizerModal();
    });
  }

  mount.querySelectorAll('[data-eq-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-eq-preset');
      const preset = EQ_PRESETS[key];
      if (!preset) return;
      saveAndApplyEq({
        eq_preset: key,
        eq_bands: JSON.stringify(preset.bands),
      });
      renderEqualizerModal();
    });
  });

  const preampSlider = mount.querySelector('#eq-preamp-slider');
  const preampVal = mount.querySelector('#eq-preamp-val');
  if (preampSlider) {
    preampSlider.addEventListener('input', () => {
      const v = parseFloat(preampSlider.value) || 0;
      if (preampVal) preampVal.textContent = `${v > 0 ? `+${v}` : v} dB`;
      saveAndApplyEq({ eq_preamp: String(v) });
    });
  }

  mount.querySelectorAll('.eq-band-slider').forEach((slider) => {
    slider.addEventListener('input', () => {
      const currentBands = Array.from(mount.querySelectorAll('.eq-band-slider')).map(
        (el) => parseFloat(el.value) || 0
      );
      currentBands.forEach((v, i) => {
        const lbl = mount.querySelector(`[data-eq-db-label="${i}"]`);
        if (lbl) lbl.textContent = `${v > 0 ? `+${v}` : v}dB`;
      });
      const curveBox = mount.querySelector('#eq-curve-box');
      if (curveBox) curveBox.innerHTML = buildEqCurveSvg(currentBands);

      saveAndApplyEq({
        eq_preset: 'custom',
        eq_bands: JSON.stringify(currentBands),
      });
    });
  });
}

function saveAndApplyEq(partial) {
  PlayerStore.updateSettings(partial);
  AudioEngine.applyEqualizerFromStore();
  apiRequest('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(partial),
  }).catch(() => {});
}
