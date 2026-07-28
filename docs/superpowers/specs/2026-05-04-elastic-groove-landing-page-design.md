# Elastic Groove — Landing Page Design Spec

## Goal

A fast, beautiful static landing page at `elasticgroove.app` that converts visitors into app users. The app itself moves to `app.elasticgroove.app`.

## Architecture

- **Landing:** Own repo `elastic-groove-landing`, pure HTML/CSS/JS (no framework), deployed to Vercel
- **App:** Existing Vite repo, deployed to `app.elasticgroove.app` via Vercel
- **DNS:** Cloudflare — `elasticgroove.app` → landing Vercel deployment, `app.elasticgroove.app` → app Vercel deployment

## Visual Design

- **Colors:** `#f59e0b` (amber/orange) as primary accent — matches the app exactly. Dark background `#080810`. White text with opacity scale.
- **Mood:** Dark, premium, hardware-inspired but with atmosphere. Not a lifestyle page, not a pure product page — both.
- **Typography:** System font stack (`-apple-system, Inter`), heavy weights (900), tight letter-spacing on headings.
- **Glow effects:** Radial amber glow behind hero headline + below app screenshot. Subtle, not overdone.

## Sections (top to bottom)

### 1. Navigation (fixed)
- Logo: `ELASTIC · GROOVE` in amber
- Links: Features, Sound Library, Presets
- CTA button: `Open App →` in amber, links to `app.elasticgroove.app`

### 2. Hero
- Eyebrow: `Browser Groovebox · No Install Required`
- H1: `Make Beats.` / `Shape Sound.` — second line in amber gradient
- Subtext: one-sentence description, no brand name mentions
- Feature pills: VA Synthesis · Sample Engine · Step Sequencer · 303 Bass Synth · Arrangement · Free
- Two buttons: `Open Elastic Groove` (primary/amber) + `Watch Demo ▶` (secondary/ghost)
- App screenshot in browser chrome (macOS window bar with traffic lights + URL bar showing `elasticgroove.app`)
- Amber glow radiating below screenshot

### 3. Stats strip
- 4 numbers: **24** Factory Kits · **2308** Drum Samples · **64** Step Sequencer · **12** FX & Sends
- Subtle dividers between stats, amber accent on numbers

### 4. Features (6 cards, 3×2 grid)
- 808 / 909 Sound Engine
- Pro Step Sequencer
- 303-Style Bass Synth
- Full Mixer & FX
- Arrangement View
- Export & Share
- Cards get amber border glow on hover
- No references to competitor brand names

### 5. CTA section
- `Ready to groove?`
- `Free forever. No signup. Open and make music.`
- Single amber button

### 6. Footer
- Logo left, `by Elastic Field · elasticgroove.app` right

## File Structure

```
elastic-groove-landing/
├── index.html          # All-in-one: HTML + inline CSS + inline JS
├── og-image.png        # 1200×630 Open Graph image (app screenshot)
├── favicon.ico
└── vercel.json         # Minimal: just sets Cache-Control headers
```

Single `index.html` — no build step, no bundler. Screenshot embedded as `<img src="...">` referencing `/og-image.png`.

## Deployment

1. Create repo `elastic-groove-landing` on GitHub
2. Add `index.html`, `og-image.png`, `favicon.ico`, `vercel.json`
3. Connect to Vercel → auto-deploys on push
4. In Vercel project settings: add domain `elasticgroove.app`
5. In Cloudflare: point `elasticgroove.app` CNAME → Vercel
6. In existing Elastic Groove Vercel project: add domain `app.elasticgroove.app`
7. In Cloudflare: point `app.elasticgroove.app` CNAME → existing Vercel deployment

## `vercel.json`

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }]
    }
  ]
}
```

## Open Graph / SEO

```html
<meta property="og:title" content="Elastic Groove — Browser Drum Machine" />
<meta property="og:description" content="Professional drum machine and sequencer in your browser. VA synthesis, real samples, 303 bass synth. Free. No install." />
<meta property="og:image" content="https://elasticgroove.app/og-image.png" />
<meta property="og:url" content="https://elasticgroove.app" />
<meta name="twitter:card" content="summary_large_image" />
```

## Out of Scope

- No animations (can add later)
- No contact form
- No newsletter signup
- No German language toggle (can add later)
- No blog or changelog
