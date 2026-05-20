# Melody Pad — FX Loop Closure (Chaos Pad Integration)

**Date:** 2026-05-20
**Component:** XY Performance Pad (`PerformancePad.tsx`, `performancePadStore.ts`), Kaoss FX Panel (`FxPanel.tsx`, `MotionRecorder`)

## Context

Today you can play melodies on the XY Performance Pad and capture them as a loop — but to shape the sound with the Kaoss-style Chaos Pad (`FxPanel`) you must close the pad and open the FxPanel, which means you can never play *and* shape in the same gesture. Even if you could, FX gestures aren't part of the pad's loop recording, so the next time the loop plays, the FX shaping is gone.

The user calls this an open "music loop": create → shape → capture → play back → iterate. Today the *shape* step can't happen while creating, and isn't captured if it does. This design closes the loop: the Chaos Pad lives inside the Performance Pad while playing melody, and its FX gestures (continuous Kaoss XY + Beat-FX hold triggers) are recorded as a second sync'd automation layer that plays back together with the notes.

Audio routing already supports this: the melody engine runs on mixer channel 14 and `FxPanel` already exposes a `target="melody"` route. The work is UI integration + a parallel recording layer + sharing one component between two hosting panels.

## Decisions (from brainstorming)

- **Scope:** full loop closure — FX gestures are recorded synchronously with the notes and play back automatically on LOOP.
- **FX surface:** full Chaos Pad parity — Kaoss XY modes (FILTER / DELAY / REVERB / FLANGER / CRUSH / PHASER / CHORUS) **and** the 6 Beat-FX hold buttons (THROW / ECHO / CHOKE / STUTTER / ROLL / NOISE).
- **Layout:** split top/bottom inside the Performance Pad — Melody XY above, ChaosPad below, step lane at the bottom.
- **Recording model:** two separate layers — `events` (notes + synth-Y gesture, existing) and a new `fxEvents` (FX automation). One `REC` starts both; clear is split into `CLR NOTES` / `CLR FX`.
- **FX target:** while embedded in the Melody Pad the Chaos Pad is hard-wired to `target = "melody"`. No selector inside the pad.
- **Step mode:** FX recording stays off in step mode (step is per-note placement, not gestural). Notes only.

## Architecture

### 1 — UI: split layout inside `PerformancePad.tsx`

From top to bottom inside the existing fullscreen overlay:

1. Toolbar (unchanged).
2. **Melody XY pad** — ~60% of the available height. Unchanged tap-to-play behaviour.
3. **`<ChaosPad>`** (new shared component) — ~35% height: Kaoss XY canvas with the mode selector + the 6 Beat-FX hold buttons. `target` prop is locked to `"melody"`. A small `MIN` button collapses the ChaosPad to 0 height so the Melody pad can use the full height when the user wants to play without FX.
4. **Step lane** (unchanged, only visible in step mode or when step content exists).

### 2 — Data model: parallel FX automation layer

Add to `performancePadStore.ts`:

```ts
export type FxMode = "FILTER" | "DELAY" | "REVERB" | "FLANGER" | "CRUSH" | "PHASER" | "CHORUS";
export type BeatFxId = "throw" | "echo" | "choke" | "stutter" | "roll" | "noise";

export type FxEvent =
  | { t: number; kind: "xy"; mode: FxMode; x: number; y: number }
  | { t: number; kind: "beat-down" | "beat-up"; fxId: BeatFxId };

// New state
fxEvents: FxEvent[];   // FX automation layer — parallel to `events`
```

Actions:

- `appendFxEvent(ev: Omit<FxEvent, "t">)` — mirrors `appendEvent`: a no-op outside live REC, otherwise stamps `t = performance.now() - recordStart` and appends.
- `clearEvents()` — empties `events` only (used by the new `CLR NOTES` button).
- `clearFxEvents()` — empties `fxEvents` only (used by the new `CLR FX` button).
- `clearRecording()` (existing) — extended to also clear `fxEvents`, so the existing `RESET` path still wipes everything in one call.

Real-time REC is the only writer to `fxEvents`. Step mode does not touch it.

### 3 — Recording flow

- One `REC` button arms both layers. On first input (note tap *or* ChaosPad interaction) `recordStart` is stamped and both `events` and `fxEvents` start receiving timestamped entries.
- **Kaoss XY moves:** `<ChaosPad>` calls `onXYMove(mode, x, y)` continuously while a finger is on the XY canvas. The host (PerformancePad) routes this to `appendFxEvent({ kind: "xy", mode, x, y })` *and* to `chaosFxBus.setXY("melody", mode, x, y)` for live audio. Throttle to ≤ 60 events/sec (one per animation frame) to keep the array small.
- **Beat-FX press:** `onBeatFxDown(id)` → `beatFxManager.startEffect(id)` *and* `appendFxEvent({ kind: "beat-down", fxId: id })`. `onBeatFxUp(id)` does the symmetric `stopEffect` + `beat-up` event.

### 4 — Playback: loop scheduler extension

The existing loop scheduler in `PerformancePad.tsx` (around the `wallStart` block) plays `events` per loop iteration. Extend it: when `fxEvents.length > 0`, schedule one set of timers per `fxEvent` against the same `loopWallStart` anchor so notes and FX share the loop's audio clock:

- `xy` events → at time `iterWallStart + ev.t`, call `chaosFxBus.setXY("melody", ev.mode, ev.x, ev.y)`.
- `beat-down` / `beat-up` → at time `iterWallStart + ev.t`, call `beatFxManager.startEffect(ev.fxId)` / `stopEffect(ev.fxId)`.

`fxEvents` are sorted by `t` once per `useEffect` run (same place `pairedNotes` is sorted). No new sync mechanism — the step-control feature's `loopWallStart` already gives a single, audio-anchored start time.

### 5 — Editing & export

- The current single `CLR` button in the recording toolbar is replaced with two: **`CLR NOTES`** (calls a new `clearEvents()` store action — empties `events` only) and **`CLR FX`** (calls `clearFxEvents()` — empties `fxEvents` only). The store's existing `clearRecording()` action — which now also wipes `fxEvents` — stays as the "wipe everything" path; the existing `RESET` button keeps calling it.
- `→ PIANO ROLL` export is unchanged — notes only. FX automation lives only in the pad recording (matches existing Piano-Roll semantics: MIDI notes).
- Step mode UI is unchanged.

### 6 — Shared component + audio bus extraction

The Kaoss-XY audio routing today lives inline inside `FxPanel.tsx` (per-mode logic that mutates `audioEngine` parameters). To call it from two places (live ChaosPad input *and* the loop scheduler on replay), the audio glue must become a callable module — analogous to `beatFxManager`, which already exposes `startEffect / stopEffect`.

Two new modules:

- **`src/audio/ChaosFxBus.ts`** — exports a small manager with `setXY(target: FxTarget, mode: FxMode, x: number, y: number): void` and `setMode(target, mode)`. Internally holds the per-mode routing currently embedded in FxPanel (filter cutoff/Q, delay time/feedback, reverb size/mix, etc.). Pure audio-side, no UI.
- **`src/components/ChaosPad.tsx`** — pure UI component. Props: `target: FxTarget`, `onXYMove(mode, x, y)`, `onBeatFxDown(id)`, `onBeatFxUp(id)`, optional `compact?: boolean`, optional `lockedTarget?: boolean`. The component itself does **not** apply audio — it only fires callbacks. Both hosts decide what to do with them.

Host responsibilities:

- **`FxPanel.tsx`** wraps `<ChaosPad>` for the fullscreen variant, keeps its target selector + existing motion-recorder UI (the standalone REC for Chaos-only use stays unchanged), and its callbacks call `chaosFxBus.setXY(...)` + the existing `motionRecorder.addPoint`.
- **`PerformancePad.tsx`** embeds `<ChaosPad>` with `target="melody"`, `lockedTarget`, `compact`. Its callbacks call `chaosFxBus.setXY("melody", mode, x, y)` (live audio) **and** `appendFxEvent(...)` (record), and the playback scheduler calls `chaosFxBus.setXY` + `beatFxManager.startEffect/stopEffect` against `loopWallStart`.

The motion-recorder code in `FxPanel.tsx` stays *as-is* for standalone Chaos use. The Performance Pad does **not** route through `motionRecorder` — it has its own loop scheduler and `fxEvents` array, which keeps a single source of truth for the pad's recording lifecycle.

## Files affected

- **Create** `src/components/ChaosPad.tsx` — shared Kaoss-XY + Beat-FX UI extracted from `FxPanel.tsx`.
- **Modify** `src/components/FxPanel.tsx` — consume `<ChaosPad>`, keep target selector + motion-recorder integration as the host wrapper.
- **Modify** `src/store/performancePadStore.ts` — `fxEvents` state, `FxEvent` types, `appendFxEvent`, `clearFxEvents`; extend `clearRecording` to also wipe `fxEvents`.
- **Modify** `src/components/PerformancePad.tsx` — split layout (Melody / ChaosPad / step lane), render `<ChaosPad>` with target locked to `"melody"`, route ChaosPad callbacks to `appendFxEvent` + live engines, extend the loop scheduler effect to schedule `fxEvents` against `loopWallStart`, replace single `CLR` with `CLR NOTES` / `CLR FX`, add `MIN` collapse for the ChaosPad section.
- **Create** `src/audio/ChaosFxBus.ts` — `setXY(target, mode, x, y)` audio-routing manager extracted from FxPanel's inline mode logic.

## Out of scope

- FX automation in step mode (step is deterministic, not gestural — left as future work; would need a per-step FX-lock model).
- Editing FX automation as a visible timeline / curve (no FX-lane UI in this iteration — clear-and-re-record is the editing model).
- Sharing the existing `motionRecorder` between `FxPanel` and `PerformancePad` (intentional; the pad has its own recording lifecycle).
- Exporting FX automation to Piano Roll or arrangement scenes.
- Replacing the always-visible right sidebar `BeatFxPanel` — this design only addresses the Chaos Pad inside the Performance Pad.

## Verification

1. **Layout:** open XY PAD in melody mode. Below the melody XY pad there is a ChaosPad strip with a Kaoss XY canvas, a mode selector, and 6 Beat-FX buttons. The target shows "MELODY" and cannot be changed. A `MIN` button collapses the ChaosPad to give the melody pad full height; pressing it again restores the split.
2. **Recording (notes + FX together):** press `REC`. Tap the melody pad to play a few notes; drag the ChaosPad XY canvas; hold a Beat-FX button briefly. Press `STOP`. Press `LOOP` → the loop plays back: the notes sound *and* the filter / delay / etc. moves the way you moved it, and the Beat-FX trigger fires at the same point in the bar each iteration.
3. **Two layers:** with the recorded loop running, press `CLR FX` → notes keep looping cleanly without any FX automation. Press `LOOP` off; record only ChaosPad gestures (no notes); `LOOP` on → FX moves but no melody. Now record new notes with the existing FX automation in place → notes play and the older FX layer also plays.
4. **Step mode unaffected:** enter `STEP`. Tap melody pad → notes land on cursor steps. ChaosPad gestures in step mode do *not* get recorded (verified: after `STOP STEP`, `fxEvents` is empty regardless of what was done in the Chaos area).
5. **Sync:** with the drum transport playing, press `REC` mid-bar, capture, then `LOOP`. The FX gesture aligns to the same bar boundary as the notes on every loop iteration (single `loopWallStart` anchor).
6. `npm run build` is green; existing FxPanel standalone use (its own REC and motion playback) still works.
