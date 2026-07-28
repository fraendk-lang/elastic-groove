# Landing Page Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `elastic-groove-landing/index.html` with new positioning, copy, pills, stats and feature cards — reflecting the current Elastic Groove feature set.

**Architecture:** Single static HTML file. All changes are in-place string replacements — no build step, no dependencies. The screenshot (`og-image.png`) is replaced separately by the user.

**Tech Stack:** Plain HTML/CSS, Vercel static hosting.

---

## Files

| File | Change |
|---|---|
| `elastic-groove-landing/index.html` | Modify — 5 targeted edits |

---

## Task 1: Update hero eyebrow + subheadline + img alt

**File:** `elastic-groove-landing/index.html`

Note: The nav already has an "Open App →" CTA button — no nav changes needed.

- [ ] **Step 1: Update `hero-eyebrow` CSS to pill-badge style (line 107–110)**

Replace:
```css
    .hero-eyebrow {
      font-size: 10px; letter-spacing: 0.45em; color: var(--muted);
      text-transform: uppercase; margin-bottom: 22px; position: relative;
    }
```

With:
```css
    .hero-eyebrow {
      display: inline-block;
      font-size: 9px; font-weight: 700; letter-spacing: 0.16em; color: var(--orange);
      text-transform: uppercase; margin-bottom: 22px; position: relative;
      border: 1px solid rgba(245,158,11,0.28); border-radius: 20px; padding: 4px 14px;
    }
```

- [ ] **Step 2: Update eyebrow text (line 314)**

Replace:
```html
  <p class="hero-eyebrow">Browser Groovebox &middot; No Install Required</p>
```

With:
```html
  <p class="hero-eyebrow">Professional Browser Groove Machine</p>
```

- [ ] **Step 3: Update hero subheadline (lines 319–322)**

Replace:
```html
  <p class="hero-sub">
    A professional drum machine and sequencer that runs entirely in your browser —
    VA synthesis, real samples, 303-style bass synth and a full arrangement view.
  </p>
```

With:
```html
  <p class="hero-sub">
    VA drum synthesis, 303 acid bass, piano roll, chord pads and a full arrangement
    timeline — professional music production that runs entirely in your browser.
  </p>
```

- [ ] **Step 4: Update img alt text (line 345)**

Replace:
```html
      <img src="/og-image.png" alt="Elastic Groove — browser drum machine interface" width="1200" height="630" loading="eager" />
```

With:
```html
      <img src="/og-image.png" alt="Elastic Groove — browser groove machine interface" width="1200" height="630" loading="eager" />
```

- [ ] **Step 5: Verify in browser**

Open `elastic-groove-landing/index.html` locally (double-click or `open index.html`). Confirm:
- Eyebrow shows as amber pill badge reading "PROFESSIONAL BROWSER GROOVE MACHINE"
- Subheadline mentions "piano roll, chord pads and a full arrangement timeline"
- No other visual regressions in hero section

- [ ] **Step 6: Commit**

```bash
cd "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/elastic-groove-landing"
git add index.html
git commit -m "feat: groove machine positioning — eyebrow badge, updated subline"
```

---

## Task 2: Update pills

**File:** `elastic-groove-landing/index.html`

- [ ] **Step 1: Add `pill-gold` CSS variant (after `.pill { ... }` block, line ~141)**

After the closing `}` of the `.pill` rule, add:
```css
    .pill-gold {
      background: rgba(245,158,11,0.12);
      color: var(--orange);
      border-color: rgba(245,158,11,0.35);
    }
```

- [ ] **Step 2: Replace all pills (lines 323–330)**

Replace:
```html
  <div class="pills">
    <span class="pill">VA Synthesis</span>
    <span class="pill">Sample Engine</span>
    <span class="pill">Step Sequencer</span>
    <span class="pill">303 Bass Synth</span>
    <span class="pill">Arrangement</span>
    <span class="pill">Free</span>
  </div>
```

With:
```html
  <div class="pills">
    <span class="pill">Drum Engine</span>
    <span class="pill">303 Bass</span>
    <span class="pill">Piano Roll</span>
    <span class="pill">Chord Pads</span>
    <span class="pill">Arrangement</span>
    <span class="pill">Mixer &amp; FX</span>
    <span class="pill pill-gold">Free · No Install</span>
  </div>
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. Confirm:
- 7 pills visible: Drum Engine, 303 Bass, Piano Roll, Chord Pads, Arrangement, Mixer & FX, Free · No Install
- "Free · No Install" pill has amber background tint (gold variant)
- All pills wrap correctly on narrow viewport

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: updated pills — Piano Roll, Chord Pads, Mixer & FX, gold Free badge"
```

---

## Task 3: Update stats row

**File:** `elastic-groove-landing/index.html`

- [ ] **Step 1: Replace stats (lines 354–357)**

Replace:
```html
    <div class="stat"><div class="stat-num">24</div><div class="stat-label">Factory Kits</div></div>
    <div class="stat"><div class="stat-num">2308</div><div class="stat-label">Drum Samples</div></div>
    <div class="stat"><div class="stat-num">64</div><div class="stat-label">Step Sequencer</div></div>
    <div class="stat"><div class="stat-num">12</div><div class="stat-label">FX &amp; Sends</div></div>
```

With:
```html
    <div class="stat"><div class="stat-num">24</div><div class="stat-label">Factory Kits</div></div>
    <div class="stat"><div class="stat-num">1700+</div><div class="stat-label">Drum Samples</div></div>
    <div class="stat"><div class="stat-num">64</div><div class="stat-label">Step Sequencer</div></div>
    <div class="stat"><div class="stat-num">Free</div><div class="stat-label">Forever</div></div>
```

- [ ] **Step 2: Verify in browser**

Open `index.html`. Confirm stats row shows: 24 / 1700+ / 64 / Free.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: updated stats — 1700+ samples, Free Forever"
```

---

## Task 4: Update feature cards

**File:** `elastic-groove-landing/index.html`

- [ ] **Step 1: Replace all 6 feature cards (lines 366–396)**

Replace the entire `<div class="features-grid"> ... </div>` block:
```html
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
```

With:
```html
  <div class="features-grid">
    <div class="feat">
      <div class="feat-icon">🥁</div>
      <div class="feat-title">808 / 909 Drum Engine</div>
      <div class="feat-desc">12-voice VA drum synthesis with per-voice tune, decay, drive, sub and FM. Load your own samples on any pad.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎛️</div>
      <div class="feat-title">Pro Step Sequencer</div>
      <div class="feat-desc">64 steps, Parameter Locks, 16 Conditional Triggers, Ratchet, Swing and Euclidean rhythm generator.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎹</div>
      <div class="feat-title">303-Style Acid Bass</div>
      <div class="feat-desc">Self-oscillating filter, accent, slide and portamento. Full piano-roll sequencer built in.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎵</div>
      <div class="feat-title">Piano Roll &amp; Chord Pads</div>
      <div class="feat-desc">72-note melody piano roll and performance chord pads with editable chord intervals.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎚️</div>
      <div class="feat-title">Mixer &amp; FX</div>
      <div class="feat-desc">12-channel mixer with FFT metering, per-channel 3-band EQ, reverb, delay, chorus, phaser and brick-wall master limiter.</div>
    </div>
    <div class="feat">
      <div class="feat-icon">🎼</div>
      <div class="feat-title">Arrangement View</div>
      <div class="feat-desc">Clip-based timeline with automation lanes, loop regions and drag &amp; drop editing. Build full songs, not just loops.</div>
    </div>
  </div>
```

- [ ] **Step 2: Verify in browser**

Open `index.html`. Confirm:
- Feature 4 is now "Piano Roll & Chord Pads" (was "Full Mixer & FX")
- Feature 5 is "Mixer & FX"
- Feature 6 is "Arrangement View" (icon changed to 🎼)
- No duplicate icons, no broken HTML

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: updated feature cards — Piano Roll & Chord Pads added, Arrangement updated"
```

---

## Task 5: Replace screenshot + deploy

**File:** `elastic-groove-landing/og-image.png`

- [ ] **Step 1: Replace screenshot**

Copy the new screenshot file provided by the user to `elastic-groove-landing/og-image.png`, overwriting the existing file. The image must be 1200×630px for correct OG preview.

- [ ] **Step 2: Verify screenshot locally**

Open `index.html` in browser. Confirm new screenshot appears in the browser frame in the hero section. No broken image icon.

- [ ] **Step 3: Commit**

```bash
git add og-image.png
git commit -m "feat: updated app screenshot — current UI"
```

- [ ] **Step 4: Push and deploy**

```bash
git push
```

Vercel auto-deploys on push. Confirm deployment at `https://elasticgroove.app` within ~60 seconds.

- [ ] **Step 5: Final smoke test**

Open `https://elasticgroove.app` in browser. Confirm:
- Eyebrow badge reads "PROFESSIONAL BROWSER GROOVE MACHINE"
- Subline mentions piano roll, chord pads, arrangement timeline
- Pills: Drum Engine / 303 Bass / Piano Roll / Chord Pads / Arrangement / Mixer & FX / Free · No Install
- Stats: 24 / 1700+ / 64 / Free
- Feature 4: "Piano Roll & Chord Pads"
- New screenshot visible in hero
- OG preview image updated (check via `https://opengraph.xyz` or Twitter Card Validator)
