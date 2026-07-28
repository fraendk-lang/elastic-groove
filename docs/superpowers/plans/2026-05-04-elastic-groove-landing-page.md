# Elastic Groove Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a static landing page at `elasticgroove.app` that showcases Elastic Groove and sends visitors to `app.elasticgroove.app`.

**Architecture:** Single `index.html` with all CSS inline — no build step, no framework, no JS dependencies. Screenshot served as a real PNG file (not base64). Deployed as a Vercel static site. App stays on its own Vercel project and gets the subdomain `app.elasticgroove.app`.

**Tech Stack:** HTML5, CSS (inline), Vercel static hosting, Cloudflare DNS, `sips` (macOS) for image resizing.

**Project root:** `/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing/`

---

### Task 1: Project scaffold + vercel.json + favicon

**Files:**
- Create: `elastic-groove-landing/vercel.json`
- Create: `elastic-groove-landing/favicon.svg`
- Create: `elastic-groove-landing/.gitignore`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "headers": [
    {
      "source": "/og-image.png",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=604800, stale-while-revalidate=86400" }]
    },
    {
      "source": "/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }]
    }
  ]
}
```

Save to: `elastic-groove-landing/vercel.json`

- [ ] **Step 2: Create `favicon.svg`**

An amber "EG" monogram on a dark background:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0c0c16"/>
  <text x="16" y="22" font-family="system-ui,sans-serif" font-weight="900"
        font-size="14" fill="#f59e0b" text-anchor="middle" letter-spacing="-0.5">EG</text>
</svg>
```

Save to: `elastic-groove-landing/favicon.svg`

- [ ] **Step 3: Create `.gitignore`**

```
.DS_Store
```

Save to: `elastic-groove-landing/.gitignore`

- [ ] **Step 4: Verify files exist**

```bash
ls -la "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing/"
```

Expected output: `vercel.json`, `favicon.svg`, `.gitignore` all listed.

- [ ] **Step 5: Commit**

```bash
cd "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing"
git init
git add vercel.json favicon.svg .gitignore
git commit -m "feat: project scaffold — vercel config and favicon"
```

---

### Task 2: Prepare og-image.png

**Files:**
- Create: `elastic-groove-landing/og-image.png` (cropped from existing screenshot)

The existing screenshot is at:
`/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-loading.png`
Size: 1200×671. OG standard is 1200×630 — crop 41px from the bottom.

- [ ] **Step 1: Crop and copy screenshot**

```bash
sips --cropOffset 0 0 \
     --cropToHeightWidth 630 1200 \
     "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-loading.png" \
     --out "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing/og-image.png"
```

- [ ] **Step 2: Verify dimensions**

```bash
sips -g pixelWidth -g pixelHeight \
     "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing/og-image.png"
```

Expected:
```
  pixelWidth: 1200
  pixelHeight: 630
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing"
git add og-image.png
git commit -m "feat: add OG image (1200x630 app screenshot)"
```

---

### Task 3: Build index.html

**Files:**
- Create: `elastic-groove-landing/index.html`

This is the full landing page. All CSS is inline in a `<style>` block.

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Elastic Groove — Browser Drum Machine</title>

  <!-- SEO -->
  <meta name="description" content="Professional drum machine and sequencer in your browser. VA synthesis, real samples, 303 bass synth. Free. No install." />

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="https://elasticgroove.app/" />
  <meta property="og:title"       content="Elastic Groove — Browser Drum Machine" />
  <meta property="og:description" content="Professional drum machine and sequencer in your browser. VA synthesis, real samples, 303 bass synth. Free. No install." />
  <meta property="og:image"       content="https://elasticgroove.app/og-image.png" />

  <!-- Twitter -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:url"         content="https://elasticgroove.app/" />
  <meta name="twitter:title"       content="Elastic Groove — Browser Drum Machine" />
  <meta name="twitter:description" content="Professional drum machine and sequencer in your browser. VA synthesis, real samples, 303 bass synth. Free. No install." />
  <meta name="twitter:image"       content="https://elasticgroove.app/og-image.png" />

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="canonical" href="https://elasticgroove.app/" />

  <style>
    /* ── Reset & Variables ─────────────────────────────── */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --orange:      #f59e0b;
      --orange-lt:   #fbbf24;
      --orange-glow: rgba(245,158,11,0.16);
      --orange-dim:  rgba(245,158,11,0.06);
      --bg:          #080810;
      --bg2:         #0c0c16;
      --border:      rgba(255,255,255,0.06);
      --text:        rgba(255,255,255,0.88);
      --muted:       rgba(255,255,255,0.38);
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* ── NAV ──────────────────────────────────────────── */
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 48px;
      background: rgba(8,8,16,0.88);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border);
    }
    .nav-logo {
      font-size: 13px; font-weight: 900; letter-spacing: 0.22em;
      color: var(--orange); text-transform: uppercase;
      text-decoration: none;
    }
    .nav-logo em { color: rgba(255,255,255,0.22); font-style: normal; font-weight: 300; margin: 0 3px; }
    .nav-links { display: flex; align-items: center; gap: 28px; }
    .nav-links a {
      font-size: 11px; color: var(--muted); text-decoration: none;
      letter-spacing: 0.07em; text-transform: uppercase; transition: color 0.2s;
    }
    .nav-links a:hover { color: var(--text); }
    .nav-cta {
      padding: 7px 18px !important;
      background: var(--orange) !important;
      color: #000 !important;
      font-weight: 800 !important;
      border-radius: 5px;
      letter-spacing: 0.10em !important;
      font-size: 10px !important;
    }
    .nav-cta:hover { background: var(--orange-lt) !important; }

    @media (max-width: 640px) {
      nav { padding: 14px 20px; }
      .nav-links a:not(.nav-cta) { display: none; }
    }

    /* ── HERO ─────────────────────────────────────────── */
    .hero {
      min-height: 100vh;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 130px 24px 80px;
      position: relative; overflow: hidden; text-align: center;
    }
    .hero-glow-top {
      position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
      width: 800px; height: 450px;
      background: radial-gradient(ellipse, var(--orange-glow) 0%, transparent 68%);
      pointer-events: none;
    }

    .hero-eyebrow {
      font-size: 10px; letter-spacing: 0.45em; color: var(--muted);
      text-transform: uppercase; margin-bottom: 22px; position: relative;
    }

    h1 {
      font-size: clamp(48px, 7vw, 86px);
      font-weight: 900; letter-spacing: -0.03em; line-height: 1.0;
      margin-bottom: 12px; position: relative;
    }
    h1 .line1 { display: block; color: #fff; }
    h1 .line2 {
      display: block;
      background: linear-gradient(90deg, var(--orange) 0%, var(--orange-lt) 55%, #fde68a 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-sub {
      font-size: 15px; color: var(--muted); line-height: 1.7;
      margin: 22px 0 34px; max-width: 500px; position: relative;
    }

    .pills {
      display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
      margin-bottom: 40px; position: relative;
    }
    .pill {
      padding: 4px 13px;
      border: 1px solid rgba(245,158,11,0.22);
      background: rgba(245,158,11,0.05);
      border-radius: 20px;
      font-size: 9px; color: rgba(245,158,11,0.75);
      letter-spacing: 0.10em; text-transform: uppercase;
    }

    .hero-btns {
      display: flex; gap: 12px; justify-content: center;
      margin-bottom: 60px; position: relative;
    }
    .btn-primary {
      padding: 13px 34px;
      background: var(--orange); color: #000;
      font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
      border-radius: 7px; border: none; cursor: pointer;
      box-shadow: 0 0 32px rgba(245,158,11,0.3);
      transition: all 0.2s; text-decoration: none; display: inline-block;
    }
    .btn-primary:hover { background: var(--orange-lt); box-shadow: 0 0 44px rgba(245,158,11,0.48); }
    .btn-ghost {
      padding: 13px 34px;
      background: transparent; color: var(--muted);
      font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      border-radius: 7px; border: 1px solid rgba(255,255,255,0.12); cursor: pointer;
      transition: all 0.2s; text-decoration: none; display: inline-block;
    }
    .btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

    /* ── APP WINDOW ───────────────────────────────────── */
    .app-showcase {
      position: relative; width: 100%; max-width: 1080px; z-index: 1;
    }
    .app-window {
      border-radius: 10px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.04),
        0 40px 80px rgba(0,0,0,0.65),
        0 0 80px rgba(245,158,11,0.07);
    }
    .app-bar {
      background: #111118; padding: 9px 14px;
      display: flex; align-items: center; gap: 6px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .dot-r { background: #ff5f57; }
    .dot-y { background: #febc2e; }
    .dot-g { background: #28c840; }
    .app-bar-url {
      margin-left: auto; font-size: 9px; color: rgba(255,255,255,0.18);
      letter-spacing: 0.06em;
    }
    .app-window img { width: 100%; display: block; }
    .app-glow {
      position: absolute; bottom: -50px; left: 50%; transform: translateX(-50%);
      width: 75%; height: 80px;
      background: radial-gradient(ellipse, rgba(245,158,11,0.18) 0%, transparent 70%);
      filter: blur(18px); pointer-events: none;
    }

    /* ── STATS ────────────────────────────────────────── */
    .stats {
      background: rgba(255,255,255,0.018);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding: 36px 24px;
    }
    .stats-inner {
      max-width: 860px; margin: 0 auto;
      display: grid; grid-template-columns: repeat(4, 1fr);
    }
    .stat {
      text-align: center; padding: 0 16px;
      border-right: 1px solid var(--border);
    }
    .stat:last-child { border-right: none; }
    .stat-num {
      font-size: 28px; font-weight: 900; color: var(--orange);
      letter-spacing: -0.02em;
    }
    .stat-label {
      font-size: 9px; color: var(--muted); margin-top: 4px;
      letter-spacing: 0.10em; text-transform: uppercase;
    }
    @media (max-width: 540px) {
      .stats-inner { grid-template-columns: repeat(2, 1fr); }
      .stat { border-right: none; border-bottom: 1px solid var(--border); padding: 16px; }
      .stat:nth-child(odd) { border-right: 1px solid var(--border); }
      .stat:last-child, .stat:nth-last-child(2) { border-bottom: none; }
    }

    /* ── FEATURES ─────────────────────────────────────── */
    .features {
      padding: 96px 24px;
      max-width: 1080px; margin: 0 auto;
    }
    .section-label {
      font-size: 10px; letter-spacing: 0.4em;
      color: rgba(245,158,11,0.5); text-transform: uppercase;
      text-align: center; margin-bottom: 10px;
    }
    .section-title {
      font-size: clamp(24px, 3vw, 32px); font-weight: 800;
      text-align: center; letter-spacing: -0.02em;
      margin-bottom: 52px; color: #fff;
    }
    .features-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    }
    @media (max-width: 768px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .features-grid { grid-template-columns: 1fr; } }

    .feat {
      padding: 24px 20px;
      background: rgba(255,255,255,0.022);
      border: 1px solid var(--border); border-radius: 10px;
      transition: border-color 0.2s, background 0.2s;
    }
    .feat:hover {
      border-color: rgba(245,158,11,0.22);
      background: rgba(245,158,11,0.04);
    }
    .feat-icon { font-size: 20px; margin-bottom: 12px; line-height: 1; }
    .feat-title {
      font-size: 11px; font-weight: 700; color: #fff;
      margin-bottom: 8px; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .feat-desc { font-size: 11px; color: var(--muted); line-height: 1.75; }

    /* ── CTA ──────────────────────────────────────────── */
    .cta-section {
      padding: 96px 24px; text-align: center; position: relative; overflow: hidden;
    }
    .cta-section::before {
      content: '';
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      width: 700px; height: 350px;
      background: radial-gradient(ellipse, var(--orange-glow) 0%, transparent 65%);
      pointer-events: none;
    }
    .cta-section h2 {
      font-size: clamp(28px, 4vw, 48px); font-weight: 900;
      letter-spacing: -0.02em; margin-bottom: 12px; position: relative;
    }
    .cta-section p {
      font-size: 14px; color: var(--muted); margin-bottom: 32px; position: relative;
    }

    /* ── FOOTER ───────────────────────────────────────── */
    footer {
      padding: 26px 48px;
      border-top: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    @media (max-width: 480px) {
      footer { flex-direction: column; gap: 8px; padding: 24px; text-align: center; }
    }
    .footer-logo { font-size: 11px; font-weight: 900; color: var(--orange); letter-spacing: 0.22em; }
    .footer-note { font-size: 10px; color: rgba(255,255,255,0.18); }
  </style>
</head>
<body>

<!-- NAV -->
<nav>
  <a href="/" class="nav-logo">Elastic <em>·</em> Groove</a>
  <div class="nav-links">
    <a href="#features">Features</a>
    <a href="#features">Sound Library</a>
    <a href="https://app.elasticgroove.app" class="nav-cta">Open App →</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-glow-top"></div>
  <p class="hero-eyebrow">Browser Groovebox &middot; No Install Required</p>
  <h1>
    <span class="line1">Make Beats.</span>
    <span class="line2">Shape Sound.</span>
  </h1>
  <p class="hero-sub">
    A professional drum machine and sequencer that runs entirely in your browser —
    VA synthesis, real samples, 303-style bass synth and a full arrangement view.
  </p>
  <div class="pills">
    <span class="pill">VA Synthesis</span>
    <span class="pill">Sample Engine</span>
    <span class="pill">Step Sequencer</span>
    <span class="pill">303 Bass Synth</span>
    <span class="pill">Arrangement</span>
    <span class="pill">Free</span>
  </div>
  <div class="hero-btns">
    <a href="https://app.elasticgroove.app" class="btn-primary">Open Elastic Groove</a>
    <a href="#features" class="btn-ghost">See Features ↓</a>
  </div>

  <!-- App screenshot -->
  <div class="app-showcase">
    <div class="app-window">
      <div class="app-bar">
        <div class="dot dot-r"></div>
        <div class="dot dot-y"></div>
        <div class="dot dot-g"></div>
        <span class="app-bar-url">app.elasticgroove.app</span>
      </div>
      <img src="/og-image.png" alt="Elastic Groove — browser drum machine interface" width="1200" height="630" loading="eager" />
    </div>
    <div class="app-glow"></div>
  </div>
</section>

<!-- STATS -->
<section class="stats">
  <div class="stats-inner">
    <div class="stat"><div class="stat-num">24</div><div class="stat-label">Factory Kits</div></div>
    <div class="stat"><div class="stat-num">2308</div><div class="stat-label">Drum Samples</div></div>
    <div class="stat"><div class="stat-num">64</div><div class="stat-label">Step Sequencer</div></div>
    <div class="stat"><div class="stat-num">12</div><div class="stat-label">FX &amp; Sends</div></div>
  </div>
</section>

<!-- FEATURES -->
<section class="features" id="features">
  <p class="section-label">What's inside</p>
  <h2 class="section-title">Everything to build a full track</h2>
  <div class="features-grid">
    <div class="feat">
      <div class="feat-icon">🥁</div>
      <div class="feat-title">808 / 909 Sound Engine</div>
      <div class="feat-desc">12-voice VA drum synthesis with per-voice TUNE, DECAY, DRIVE, SUB and FM. Load your own samples on any pad.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎛️</div>
      <div class="feat-title">Pro Step Sequencer</div>
      <div class="feat-desc">64 steps, Parameter Locks, 16 Conditional Triggers, Ratchet, Swing, Euclidean rhythm generator and per-track lengths.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎹</div>
      <div class="feat-title">303-Style Bass Synth</div>
      <div class="feat-desc">Authentic acid bass with VCO (saw/square), self-oscillating filter, accent, slide and portamento. Piano-roll sequencer built in.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎚️</div>
      <div class="feat-title">Full Mixer &amp; FX</div>
      <div class="feat-desc">12-channel mixer with FFT metering, per-channel 3-band EQ, reverb, delay, chorus, phaser and a brick-wall master limiter.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎵</div>
      <div class="feat-title">Arrangement View</div>
      <div class="feat-desc">Clip-based timeline with automation lanes, loop regions and drag &amp; drop editing. Build full songs, not just loops.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">💾</div>
      <div class="feat-title">Export &amp; Share</div>
      <div class="feat-desc">Export to WAV or MIDI. Share any pattern as a URL. Works offline as a PWA — on desktop, tablet, anywhere.</div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <h2>Ready to groove?</h2>
  <p>Free forever. No signup. Open and make music.</p>
  <a href="https://app.elasticgroove.app" class="btn-primary" style="font-size:13px;padding:15px 44px;">Open Elastic Groove →</a>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-logo">ELASTIC GROOVE</div>
  <div class="footer-note">by Elastic Field &middot; elasticgroove.app</div>
</footer>

</body>
</html>
```

Save to: `elastic-groove-landing/index.html`

- [ ] **Step 2: Open in browser and verify**

```bash
open "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing/index.html"
```

Check:
- Nav is fixed at top with amber logo and "Open App →" button
- Hero headline renders in two lines, second line has amber gradient
- Orange pills row visible
- App screenshot shows below buttons in browser-chrome window
- Stats strip: 24 / 2308 / 64 / 12
- 6 feature cards in 3×2 grid
- CTA section and footer at bottom

- [ ] **Step 3: Commit**

```bash
cd "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing"
git add index.html
git commit -m "feat: complete landing page HTML with all sections"
```

---

### Task 4: Create GitHub repo + push

- [ ] **Step 1: Create repo on GitHub**

Go to https://github.com/new and create a repo named `elastic-groove-landing`:
- Owner: `fraendk-lang`
- Visibility: Public
- No README, no .gitignore (already have one)

- [ ] **Step 2: Add remote and push**

```bash
cd "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing"
git remote add origin https://github.com/fraendk-lang/elastic-groove-landing.git
git branch -M main
git push -u origin main
```

Expected: all 3 commits pushed, repo visible on GitHub with `index.html`, `og-image.png`, `favicon.svg`, `vercel.json`.

---

### Task 5: Deploy to Vercel + configure domain

- [ ] **Step 1: Import repo on Vercel**

Go to https://vercel.com/new → Import Git Repository → select `elastic-groove-landing`.

Framework Preset: **Other** (plain static)
Build Command: *(leave empty)*
Output Directory: *(leave empty — serves from root)*
Install Command: *(leave empty)*

Click **Deploy**.

- [ ] **Step 2: Verify default Vercel URL loads**

After deploy, Vercel provides a URL like `elastic-groove-landing-xxx.vercel.app`.
Open it — confirm the landing page loads with the app screenshot visible.

- [ ] **Step 3: Add domain `elasticgroove.app` in Vercel**

In Vercel project → Settings → Domains → Add `elasticgroove.app`.
Vercel shows the required DNS values (CNAME or A record).

- [ ] **Step 4: Update Cloudflare DNS for landing page**

In Cloudflare dashboard for `elasticgroove.app`:
- If Vercel gives a CNAME value (e.g. `cname.vercel-dns.com`): add CNAME record `@` → that value, **Proxy: OFF (DNS only)**
- If Vercel gives A records: add them as A records, **Proxy: OFF (DNS only)**

- [ ] **Step 5: Add `app.elasticgroove.app` to existing Elastic Groove Vercel project**

In the existing Elastic Groove Vercel project → Settings → Domains → Add `app.elasticgroove.app`.

In Cloudflare: add CNAME record `app` → `cname.vercel-dns.com` (Vercel's default CNAME), **Proxy: OFF**.

- [ ] **Step 6: Verify both URLs**

- `https://elasticgroove.app` → Landing page loads, screenshot visible, "Open Elastic Groove" button links to `app.elasticgroove.app`
- `https://app.elasticgroove.app` → Elastic Groove app loads with the drum machine interface

---

## Self-review checklist

- [x] **Nav** — fixed, amber logo, "Open App" link → app.elasticgroove.app ✅
- [x] **Hero** — eyebrow, H1 two-line gradient, subtext, pills, two buttons, app screenshot ✅
- [x] **Stats strip** — 4 numbers with amber accent ✅
- [x] **6 feature cards** — no competitor brand names ✅
- [x] **CTA + footer** ✅
- [x] **OG meta tags** — title, description, image, twitter card ✅
- [x] **Favicon** — SVG amber EG monogram ✅
- [x] **vercel.json** — cache headers ✅
- [x] **Mobile responsive** — nav collapses, stats go 2×2, features go 1-col ✅
- [x] **No TBD / placeholders** ✅
- [x] **No brand name references** (Ableton, Elektron) ✅
