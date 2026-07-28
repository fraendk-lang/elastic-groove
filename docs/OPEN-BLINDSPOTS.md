# Elastic Groove — Open Blindspots

Living audit of known gaps, workarounds, and recommended fixes.  
Last updated: 2026-07-28.

## Fixed in this pass

| Issue | Fix |
|-------|-----|
| Factory kit load left stale L3/pad melody | `prepareDrumsOnlyKitLoad()` clears L3 + pad steps on kit load |
| Custom kit load only updated IndexedDB, not audio | `applyCustomKitVoiceSamples()` in `KitManager.ts` |
| STUTT/Beat-FX only wired when pad/panel opened | `beatFxManager.connect()` in `App.tsx` `startAudio` |
| Pad step loop loose vs drums | `performancePadStepScheduler.ts` — AudioContext clock when drums play |
| Intermittent crackling | Drum schedule clamp + MelodyEngine pool 8 + softer voice steal |
| No CI | `.github/workflows/ci.yml` — build + vitest |
| Demo `kitId` not validated | `demoSongs.test.ts` |
| Orphan `MelodyLayerL3Hud.tsx` | Removed (QuickStrip replaced it) |

## P0 — Still open

### Demo L3 sync intentionally off
Demo load does **not** push melody into L3/pad (was too busy). Re-enable only behind an explicit UX flag (“Sync pad to demo”).

### Auto-save restores melody independently
Session restore can bring back L1–L3 layers after kit/demo load cleared playback. Consider clearing melody layers on kit load or versioning auto-save with kit id.

## P1 — Should improve

| Area | Notes |
|------|-------|
| **Bass level** | Faders lowered; preset volume + no default sidechain may still feel hot on some systems |
| **E2E coverage** | Only smoke tests; add kit switch + demo load + STUTT hold |
| **UserGuide** | Missing L3, Performance Pad, Kit browser, STUTT sections |
| **FxPanel ROLL vs BeatFx STUTTER** | Two different “stutter” concepts — naming/tooltips confuse users |

## P2 — Nice to have

| Area | Notes |
|------|-------|
| **WASM worklet** | `shouldUseWasmWorklet()` returns false — DSP path inactive |
| **Playwright in CI** | Optional job after `npx playwright install --with-deps` |
| **Custom kit metadata** | Saved kits don’t store BPM/pattern — load is voice-only |

## Testing

```bash
cd "/Users/frankkrumsdorf/Desktop/Claude Code Landingpage Elastic Field/Elastic Drum"
npm test
npm run build
npm run dev   # http://localhost:5173
```

### Manual checks after kit changes
1. Load a demo with melody layers ON → switch factory kit → L3/pad should be empty, layers off.
2. Save custom kit (assign samples) → reload from MY KITS → samples audible on pads.
3. Start audio → open Performance Pad → STUTT works without opening BeatFxPanel first.
