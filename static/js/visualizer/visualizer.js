/**
 * Resonance — Real-Time Web Audio AnalyserNode Visualizer (4 Styles)
 * Section 12 Specification:
 * - Styles: Spectrum Bars ('bars'), Smooth Waveform ('wave'), Circular Spectrum ('circular'), Ambient Glow ('glow')
 * - DPR-aware canvas, throttled to ~30 fps on mobile (<640px), paused when tab hidden or expanded player closed
 */
import { PlayerStore } from '../core/store.js';
import { AudioEngine } from '../player/audio-engine.js';

class VisualizerController {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.rafId = null;
    this.lastFrameTime = 0;
    this.freqData = new Uint8Array(128);
    this.timeData = new Uint8Array(128);
    this.resizeObserver = null;
  }

  init() {
    this.canvas = document.getElementById('audio-visualizer-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    PlayerStore.subscribe((state, topic) => {
      if (topic === 'playback' || topic === 'expanded' || topic === 'settings') {
        this.syncLoopState();
      }
    });

    document.addEventListener('visibilitychange', () => this.syncLoopState());
    this.drawStaticIdle();
  }

  resizeCanvas() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(260, Math.floor(rect.width || 420));
    const h = Math.max(64, Math.floor(rect.height || 110));
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
    this.drawFrame(performance.now());
  }

  syncLoopState() {
    const state = PlayerStore.state;
    const shouldAnimate = state.expandedOpen && state.isPlaying && !document.hidden;
    if (shouldAnimate && !this.rafId) {
      this.rafId = requestAnimationFrame((ts) => this.loop(ts));
    } else if (!shouldAnimate && this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.drawFrame(performance.now());
    } else if (state.expandedOpen && !state.isPlaying) {
      this.drawFrame(performance.now());
    }
  }

  loop(timestamp) {
    this.rafId = null;
    if (!PlayerStore.state.expandedOpen || !PlayerStore.state.isPlaying || document.hidden) {
      return;
    }

    // Throttle to ~30 fps on mobile (<640px) per Section 12
    const isMobile = window.innerWidth < 640;
    const minDelta = isMobile ? 32 : 15;
    if (timestamp - this.lastFrameTime >= minDelta) {
      this.lastFrameTime = timestamp;
      this.drawFrame(timestamp);
    }

    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }

  getPaletteColors() {
    const cs = getComputedStyle(document.documentElement);
    const c1 = cs.getPropertyValue('--o1').trim() || '#6aa8ff';
    const c2 = cs.getPropertyValue('--acc').trim() || '#2855c7';
    const c3 = cs.getPropertyValue('--o2').trim() || '#ffb3e0';
    return { c1, c2, c3 };
  }

  drawStaticIdle() {
    this.drawFrame(0);
  }

  drawFrame(_ts) {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const analyser = AudioEngine.analyserNode;
    const isPlaying = PlayerStore.state.isPlaying && analyser;
    if (isPlaying) {
      analyser.getByteFrequencyData(this.freqData);
      analyser.getByteTimeDomainData(this.timeData);
    } else {
      this.freqData.fill(10);
      this.timeData.fill(128);
    }

    const style = PlayerStore.state.settings.visualizer_style || 'bars';
    const { c1, c2, c3 } = this.getPaletteColors();

    const grad = ctx.createLinearGradient(0, h, w, 0);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.5, c2);
    grad.addColorStop(1, c3);

    if (style === 'wave') {
      ctx.beginPath();
      ctx.lineWidth = Math.max(2.5, w * 0.005);
      ctx.strokeStyle = grad;
      const slice = w / (this.timeData.length - 1);
      for (let i = 0; i < this.timeData.length; i++) {
        const v = (this.timeData[i] - 128) / 128.0;
        const y = h / 2 + v * (h * 0.38);
        const x = i * slice;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (style === 'circular') {
      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.24;
      const bars = 40;
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(2, w * 0.004);
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        const amp = (this.freqData[i] / 255) * (Math.min(w, h) * 0.22);
        const r1 = baseR;
        const r2 = baseR + Math.max(4, amp);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
        ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
        ctx.stroke();
      }
    } else if (style === 'glow') {
      let sum = 0;
      for (let i = 0; i < 32; i++) sum += this.freqData[i];
      const avg = sum / (32 * 255);
      const rad = Math.max(24, Math.min(w, h) * (0.28 + avg * 0.45));
      const radial = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, rad);
      radial.addColorStop(0, c2);
      radial.addColorStop(0.55, c1);
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Default: Silk Spectrum Bars ('bars')
      const barCount = 36;
      const gap = Math.max(3, Math.floor(w * 0.008));
      const totalGap = gap * (barCount + 1);
      const barW = Math.max(3, (w - totalGap) / barCount);
      ctx.fillStyle = grad;

      for (let i = 0; i < barCount; i++) {
        const val = this.freqData[i] || 8;
        const bh = Math.max(6, (val / 255) * (h * 0.78));
        const x = gap + i * (barW + gap);
        const y = h - bh - 6;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barW, bh, 99);
        } else {
          ctx.rect(x, y, barW, bh);
        }
        ctx.fill();
      }
    }
  }
}

export const Visualizer = new VisualizerController();
