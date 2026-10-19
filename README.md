# Resonance — Feel Every Frequency ("Liquid Crystal" Edition)

**Resonance** is an infinite-premium **Liquid Crystal** glassmorphism music player engineered for desktop, tablet, and mobile browsers. Built from scratch with **Python + Flask**, **SQLite**, **Mutagen**, **HTML5 / CSS3**, **Vanilla ES Modules**, **Web Audio API**, and **Media Session API**—zero frontend frameworks or runtime CDN dependencies.

---

## ✨ Key Highlights

- **5-Layer "Liquid Crystal" Glass System (`G0`–`G4`):** High-saturation (`200%–240%`) backdrop blur (`10px–48px`), bright `2px` specular top edge highlights, palette-tinted inner bottom underglow, diagonal reflection overlays, and subtle procedural film grain (`0.025` opacity).
- **6 Interactive Color Palettes (Light & Dark Modes):**
  1. **Ice Blue (`ice`)** — Crisp glacial cyan & sapphire crystal *(default)*
  2. **Rose Quartz (`rose`)** — Warm blush quartz & magenta-rose refraction
  3. **Mint Mist (`mint`)** — Cool seafoam emerald & jade mineral glass
  4. **Peach Glow (`peach`)** — Sunlit amber-coral & warm golden crystal
  5. **Lavender Haze (`lavender`)** — Atmospheric violet-iris & amethyst glass
  6. **Dynamic From Artwork (`artwork`)** — Real-time dominant color extraction from the active track's cover art, with automatic luminance & saturation clamping for guaranteed WCAG AA legibility
- **Live Appearance Studio (`Settings → Appearance`):**
  - **6-Palette Visual Picker** with a live miniature App Preview card that responds to hover before committing
  - **Light / Dark / Auto** mode selector with smooth `700ms` CSS `@property` ambient cross-fades
  - **Glass Intensity Presets (`Subtle` / `Balanced` / `Rich`)** plus fine-grained **Glass Blur (`px`)** and **Surface Opacity (`%`)** sliders
- **Studio-Grade Web Audio Engine:**
  - **10-Band Parametric Equalizer** (`32Hz`, `64Hz`, `125Hz`, `250Hz`, `500Hz`, `1kHz`, `2kHz`, `4kHz`, `8kHz`, `16kHz`) + **Preamp (`-12dB` to `+12dB`)** with interactive SVG frequency-response curve and 11 built-in presets (*Flat, Bass Boost, Treble Boost, Vocal, Electronic, Rock, Pop, Classical, Jazz, Night Mode, Lo-Fi*) + custom user presets
  - **Real-Time 60fps Audio Visualizer** with 4 modes (*Spectrum Bars, Liquid Wave, Radial Halo, Ambient Particles*)
  - **Spinning Vinyl / Full-Bleed Artwork Expanded Player**, **Gapless/Crossfade (`0–12s`)**, **Playback Speed (`0.5×–2.0×`)**, **Sleep Timer**, and **HTTP `206 Partial Content` Range Streaming**
- **First-Class Mobile & PWA Experience:**
  - Floating bottom navigation pill + swipeable mini-player and expanded player sheet
  - Lock-screen and Bluetooth/headset controls via **Media Session API**
  - Installable **Progressive Web App** (`manifest.webmanifest` + `sw.js` app-shell caching)

---

## 🚀 Quick Start (Desktop & Local Wi-Fi Mobile)

### 1. Prerequisites
- **Python 3.10+**

### 2. Install Dependencies
```bash
cd Resonance-Music-Player
pip install -r requirements.txt
```
*(Only `Flask` and `mutagen` are required.)*

### 3. Run the Server
```bash
python app.py
```
- **Desktop Browser:** Open [http://127.0.0.1:5000](http://127.0.0.1:5000)
- **Live Design System & Contrast Sheet:** Open [http://127.0.0.1:5000/styleguide](http://127.0.0.1:5000/styleguide)

### 4. Testing on a Phone or Tablet over Local Wi-Fi
`app.py` binds to `0.0.0.0:5000` by default:
1. Find your computer's local LAN IP address (`ipconfig` on Windows or `ifconfig` / `ip addr` on macOS/Linux, e.g., `192.168.1.42`).
2. Ensure your phone and computer are on the same Wi-Fi network.
3. Open `http://<YOUR-LAN-IP>:5000` in Safari (iOS) or Chrome (Android).
4. **HTTPS Note for PWA Service Worker & Lock-Screen Media Session on Mobile:** Browsers treat `http://127.0.0.1` and `http://localhost` as secure contexts automatically. When accessing over LAN IP (`http://192.168.x.x:5000`), Service Worker registration and certain PWA install prompts require HTTPS (use `mkcert`, `ngrok`, or Cloudflare Tunnel if testing full offline PWA installation on a physical phone).

---

## ☁️ Deploying to Vercel

Resonance is pre-configured for **Vercel Serverless Functions** (`api/index.py` + `vercel.json`):

### Option 1: Deploy via GitHub (Recommended)
1. Push this project folder to a repository on **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **"Add New..." → "Project"**, then import your repository.
4. Leave the Framework Preset as **"Other"** (Vercel automatically detects `vercel.json` and `api/index.py`).
5. Click **"Deploy"**. Vercel will install dependencies from `requirements.txt` and launch your serverless app!

### Option 2: Deploy via Vercel CLI
From this directory (`Resonance-Music-Player`):
```bash
npx vercel
```
Follow the interactive prompts to link and deploy to your Vercel account.

> [!NOTE]
> **Serverless & Storage on Vercel:**
> - Vercel Serverless runs on a read-only filesystem with an ephemeral `/tmp` directory.
> - Resonance automatically copies the bundled SQLite database (`database/resonance.db`), preloaded demo tracks, and cover art to `/tmp/resonance/` on cold start.
> - All bundled tracks, the Liquid Crystal UI, 6 color palettes, 10-band equalizer, visualizers, and themes will work immediately in production.
> - Any *new* audio files uploaded through the web UI on a live Vercel deployment are stored in `/tmp` and reset when the serverless function cold-starts. For permanent live cloud storage of user uploads, connect a cloud bucket (e.g. AWS S3, Cloudflare R2, or Vercel Blob) or deploy to a persistent container host like **Render**, **Railway**, or **Fly.io** with persistent disk.

---

## ⌨️ Keyboard Shortcuts (Desktop)

| Key | Action |
|---|---|
| `Space` / `K` | Play / Pause |
| `←` / `→` | Seek `-5s` / `+5s` |
| `J` / `L` | Seek `-10s` / `+10s` |
| `Shift + ←` / `Shift + →` | Previous / Next track |
| `↑` / `↓` | Volume `+5%` / `-5%` |
| `M` | Mute / Unmute |
| `S` | Cycle Shuffle |
| `R` | Cycle Repeat (`Off` → `All` → `One`) |
| `F` | Open / Close Expanded Player |
| `Q` | Toggle Up Next Queue Drawer |
| `E` | Open / Close 10-Band Equalizer Modal |
| `/` | Focus Instant Search |
| `?` | Open Keyboard Shortcuts Cheat Sheet |
| `Esc` | Close active modal, sheet, or expanded player |

---

## 🗂️ Project Structure

```text
Resonance-Music-Player/
├── api/
│   └── index.py               # Vercel serverless function entry point (WSGI)
├── vercel.json                # Vercel serverless rewrite & routing rules
├── .vercelignore              # Files excluded from Vercel deployment bundles
├── app.py                     # Flask application factory, security headers, startup seeding
├── config.py                  # Paths, upload limits, allowed audio extensions & MIME signatures
├── requirements.txt           # Flask + mutagen
├── database/
│   ├── schema.sql             # SQLite schema (songs, playlists, favorites, history, settings)
│   └── db.py                  # Connection helpers & atomic transactions
├── routes/
│   ├── pages.py               # Main SPA shell (/), /styleguide, /manifest.webmanifest, /sw.js
│   ├── songs.py               # Upload, library CRUD, HTTP 206 Range streaming, cover art serving
│   ├── playlists.py           # Playlist CRUD, custom cover upload, track ordering
│   ├── favorites.py           # Favorites toggle & list API
│   ├── history.py             # Recently played & play-count recording
│   ├── settings.py            # Persistent user settings API
│   └── palettes.py            # Built-in 6-palette metadata API (/api/palettes)
├── services/
│   ├── metadata.py            # Mutagen ID3/MP4/FLAC/Vorbis tag & embedded artwork extraction
│   ├── covers.py              # Procedural SVG crystal cover generator & custom cover storage
│   ├── validation.py          # Magic-byte header verification & safe UUID filenames
│   ├── library.py             # Deduplication (SHA-256) & search/sort query helpers
│   └── seed_demo.py           # Synthesizes 3 harmonic stereo demo tracks on first startup
├── static/
│   ├── css/
│   │   ├── tokens.css         # Typography, spacing, radii, shadows, motion curves
│   │   ├── palettes.css       # @property declarations & 6 palettes × Light/Dark modes
│   │   ├── glass.css          # G0–G4 Liquid Crystal surfaces, specular edges, underglow
│   │   ├── themes.css         # Semantic theme aliases & glass intensity overrides
│   │   ├── base.css           # Reset, scrollbars, focus rings, reduced-motion fallbacks
│   │   ├── layout.css         # 3-zone desktop grid, ambient stage, responsive breakpoints
│   │   ├── components.css     # Cards, buttons, sliders, Settings Appearance studio, modals
│   │   └── mobile.css         # Mobile floating nav pill, mini-player, bottom sheets
│   └── js/
│       ├── main.js            # App bootstrap, theme/palette initialization, global bindings
│       ├── core/              # store.js, api.js, router.js
│       ├── player/            # audio-engine.js (Web Audio + Media Session), queue.js, sleep-timer.js
│       ├── visualizer/        # visualizer.js (4-mode 60fps canvas renderer)
│       ├── eq/                # equalizer.js (10-band BiquadFilter UI + SVG curve)
│       ├── ui/                # views.js, player-ui.js, upload-ui.js, sheets.js, shortcuts.js, toast.js
│       └── utils/             # palette.js (canvas artwork color extraction + WCAG clamp), format.js
└── templates/
    ├── base.html              # Ambient stage, SVG icon sprite, noise filter, app shell
    ├── index.html             # SPA views, sidebar, topbar, bottom player, modals & sheets
    └── styleguide.html        # Live Liquid Crystal design system & 12-combination WCAG verifier
```
