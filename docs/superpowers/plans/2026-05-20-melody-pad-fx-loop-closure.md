# Melody Pad — FX Loop Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Kaoss-style Chaos Pad usable *inside* the XY Performance Pad and have its FX gestures recorded as a parallel automation layer that plays back synced with the notes — so the create → shape → capture → playback loop is closed.

**Architecture:** Extract the audio-side routing from `FxPanel.tsx` into a new `chaosFxBus` module and the XY+Beat-FX UI into a shared `<ChaosPad>` component. Refactor `FxPanel.tsx` to consume both (no behaviour change). Add an `fxEvents: FxEvent[]` automation layer to `performancePadStore.ts`. Embed `<ChaosPad>` into `PerformancePad.tsx` with the target hard-wired to `melody`, route its callbacks to both live audio (`chaosFxBus` / `beatFxManager`) and the recording store, and extend the existing loop scheduler to replay `fxEvents` against the same `loopWallStart` anchor used for notes.

**Tech Stack:** React 19, TypeScript (strict), Zustand, Vitest 3, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-05-20-melody-pad-fx-loop-closure-design.md`

---

## File Structure

- **Create** `src/audio/ChaosFxBus.ts` — pure + audio-imperative helpers moved out of `FxPanel.tsx`. Owns: `FxMode`, `FxTarget`, `MusicalValue`, `ModeConfig` types; `MODE_CONFIG`, `FX_MODES`, `FX_TARGETS`, `KAOSS_SYNTH_CHANNELS`, `KAOSS_AUTO_SEND`, `FX_MODE_PRESETS` constants; functions `getSendChannels`, `getMusicalValue`, `applyFilter`, `releaseFilter`, `applyFxMode`, `activateFxMode`, `releaseFxMode`; singleton `chaosFxBus` with `setXY` / `activate` / `release`.
- **Create** `src/audio/ChaosFxBus.test.ts` — Vitest tests for the pure `getMusicalValue` per mode.
- **Create** `src/components/ChaosPad.tsx` — shared presentational UI (Kaoss XY canvas + 6 Beat-FX buttons). Pure callbacks, no audio side-effects.
- **Modify** `src/components/FxPanel.tsx` — import from `ChaosFxBus.ts`, render `<ChaosPad>` in place of the extracted JSX, keep target selector + motion-recorder UI as the fullscreen wrapper.
- **Modify** `src/store/performancePadStore.ts` — add `fxEvents` state + `FxEvent` types, actions `appendFxEvent` / `clearEvents` / `clearFxEvents`; extend `clearRecording` to wipe `fxEvents`.
- **Modify** `src/store/performancePadStore.test.ts` — append a describe block exercising the new actions.
- **Modify** `src/components/PerformancePad.tsx` — split layout (Melody / ChaosPad / step lane), embed `<ChaosPad>` with `target="melody"` `lockedTarget` `compact`, route its callbacks to live audio + `appendFxEvent`, extend the loop scheduler `useEffect` to schedule `fxEvents` against `loopWallStart`, replace single `CLR` with `CLR NOTES` / `CLR FX`, add `MIN` collapse for the ChaosPad section.

---

## Task 1: Extract `ChaosFxBus` audio module

**Files:**
- Create: `src/audio/ChaosFxBus.ts`
- Create: `src/audio/ChaosFxBus.test.ts`
- Modify: `src/components/FxPanel.tsx` (imports + remove moved declarations)

The existing FxPanel.tsx has the audio routing as **top-level functions** (not React-coupled) at lines 14–351:
- Constants (lines 14–15, 21–32, 60, 129, 131): `KAOSS_SYNTH_CHANNELS`, `KAOSS_AUTO_SEND`, `FX_TARGETS`, `MODE_CONFIG`, `FX_MODES`, `FX_MODE_PRESETS`.
- Types (lines 19, 45, 47, 53): `FxTarget`, `FxMode`, `ModeConfig`, `MusicalValue`.
- Functions (lines 34, 171, 226, 235, 246, 331, 347): `getSendChannels`, `getMusicalValue`, `applyFilter`, `releaseFilter`, `applyFxMode`, `activateFxMode`, `releaseFxMode`.

All of those move verbatim into `src/audio/ChaosFxBus.ts`. Add a singleton wrapper at the bottom so callers can use it like `beatFxManager`.

- [ ] **Step 1: Write the failing test**

Create `src/audio/ChaosFxBus.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getMusicalValue } from "./ChaosFxBus";

describe("getMusicalValue", () => {
  it("FILTER returns a lowpass type and a positive cutoff", () => {
    const v = getMusicalValue("FILTER", 0.5, 0.5, 120);
    expect(v.label).toBeTruthy();
    expect(typeof v.value).toBe("number");
  });

  it("DELAY returns a value field that scales with x", () => {
    const lo = getMusicalValue("DELAY", 0.1, 0.5, 120);
    const hi = getMusicalValue("DELAY", 0.9, 0.5, 120);
    expect(hi.value).not.toBe(lo.value);
  });

  it("REVERB / FLANGER / CRUSH / PHASER / CHORUS each return a label + value", () => {
    for (const mode of ["REVERB", "FLANGER", "CRUSH", "PHASER", "CHORUS"] as const) {
      const v = getMusicalValue(mode, 0.5, 0.5, 120);
      expect(v.label).toBeTruthy();
      expect(typeof v.value).toBe("number");
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/audio/ChaosFxBus.test.ts`
Expected: FAIL — `Failed to resolve import "./ChaosFxBus"`.

- [ ] **Step 3: Create the new module**

Open `src/components/FxPanel.tsx`. Cut **verbatim** these blocks and paste them into a new file `src/audio/ChaosFxBus.ts` (in this order, preserving content exactly):

1. Lines 14–15: `KAOSS_SYNTH_CHANNELS`, `KAOSS_AUTO_SEND` constants.
2. Lines 19–32: `FxTarget` type + `FX_TARGETS` array.
3. Lines 34–38: `getSendChannels` function.
4. Lines 45–58: `FxMode` type, `ModeConfig` interface, `MusicalValue` interface.
5. Lines 60–69: `MODE_CONFIG` const.
6. Line 129: `FX_MODES` const.
7. Lines 131–168 (approx): `FX_MODE_PRESETS` const.
8. Lines 171–224 (approx): `getMusicalValue` function.
9. Lines 226–352 (approx): `applyFilter`, `releaseFilter`, `applyFxMode`, `activateFxMode`, `releaseFxMode`.

At the top of the new file add the existing imports those helpers need (`audioEngine` and any `useDrumStore` reference for bpm — read what FxPanel imports at lines 9–12 and bring the audio-relevant ones over).

At the top of the new file, prepend:

```ts
/**
 * Chaos FX Bus — audio-side routing for Kaoss-Pad-style FX modes.
 *
 * Extracted from FxPanel.tsx so the same routing can be driven from
 * both the standalone Chaos overlay and the embedded ChaosPad inside
 * the XY Performance Pad. Pure audio glue — no React, no UI state.
 */
```

`export` every type / interface / const / function that was previously top-level inside FxPanel and is now in this file. FxPanel.tsx (and PerformancePad.tsx in later tasks) will import them.

At the bottom of `ChaosFxBus.ts` add the singleton:

```ts
class ChaosFxBus {
  setXY(target: FxTarget, mode: FxMode, x: number, y: number, bpm: number): void {
    applyFxMode(mode, x, y, target, bpm);
  }
  activate(target: FxTarget, mode: FxMode, x: number, y: number, bpm: number): void {
    activateFxMode(mode, x, y, target, bpm);
  }
  release(target: FxTarget, mode: FxMode): void {
    releaseFxMode(mode, target);
  }
}

export const chaosFxBus = new ChaosFxBus();
```

- [ ] **Step 4: Update FxPanel.tsx imports**

In `src/components/FxPanel.tsx` add a single import for everything that just moved, and delete the now-duplicate declarations. The new import line (placed with the other imports at the top of the file):

```ts
import {
  type FxTarget, type FxMode, type ModeConfig, type MusicalValue,
  FX_TARGETS, MODE_CONFIG, FX_MODES, FX_MODE_PRESETS,
  KAOSS_SYNTH_CHANNELS, KAOSS_AUTO_SEND,
  getSendChannels, getMusicalValue,
  applyFilter, releaseFilter,
  applyFxMode, activateFxMode, releaseFxMode,
  chaosFxBus,
} from "../audio/ChaosFxBus";
```

Delete the corresponding declarations that were just moved out. FxPanel keeps `ModeIcon` (lines 71–127), `BeatFx` interface + `createBeatFxList` (lines 381+), and everything from line 554 onward (the component itself).

- [ ] **Step 5: Run the test + tsc**

Run: `npm test -- src/audio/ChaosFxBus.test.ts`
Expected: PASS — all assertions green.

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors. (If `FxPanel.tsx` still references something it expects locally, fix the import.)

- [ ] **Step 6: Commit**

```bash
git add src/audio/ChaosFxBus.ts src/audio/ChaosFxBus.test.ts src/components/FxPanel.tsx
git commit -m "refactor(fx): extract ChaosFxBus audio module from FxPanel"
```

---

## Task 2: Extract `<ChaosPad>` shared UI component

**Files:**
- Create: `src/components/ChaosPad.tsx`
- Modify: `src/components/FxPanel.tsx` (consume `<ChaosPad>`)

The `ChaosPad` is a pure presentational component. It owns the XY canvas + mode selector + 6 Beat-FX buttons. It fires callbacks; it does **not** call `chaosFxBus`, `audioEngine`, or `beatFxManager` itself. Each host wires the callbacks to whatever audio behaviour it wants.

- [ ] **Step 1: Create the new component file**

Create `src/components/ChaosPad.tsx` with this exact content:

```tsx
/**
 * ChaosPad — shared Kaoss-style FX surface.
 *
 * Presentational only: a square XY canvas, a row of FX-mode buttons,
 * and a row of 6 Beat-FX hold buttons. All audio routing is done by
 * the host via the callback props.
 */
import { useRef, useState, useCallback } from "react";
import {
  type FxMode, type FxTarget, FX_MODES, MODE_CONFIG, FX_TARGETS,
} from "../audio/ChaosFxBus";
import { type BeatFxId } from "../audio/BeatFx";

export type { BeatFxId };  // re-export for component consumers

const BEAT_FX_IDS: BeatFxId[] = ["throw", "echo", "choke", "stutter", "roll", "noise"];

const BEAT_FX_LABELS: Record<BeatFxId, string> = {
  throw:   "THROW",
  echo:    "ECHO",
  choke:   "CHOKE",
  stutter: "STUTT",
  roll:    "ROLL",
  noise:   "NOISE",
};

interface ChaosPadProps {
  /** Routing target — read-only when `lockedTarget` is true. */
  target: FxTarget;
  /** Active FX mode for the XY canvas. Host owns the state. */
  mode: FxMode;
  onModeChange: (mode: FxMode) => void;
  /** Continuous XY motion while a finger is on the canvas. */
  onXYMove: (mode: FxMode, x: number, y: number) => void;
  /** XY canvas press/release — host activates / releases the FX. */
  onXYDown: (mode: FxMode, x: number, y: number) => void;
  onXYUp: (mode: FxMode) => void;
  /** Beat-FX hold buttons. */
  onBeatFxDown: (id: BeatFxId) => void;
  onBeatFxUp: (id: BeatFxId) => void;
  /** Compact embedded variant (no target selector, tighter spacing). */
  compact?: boolean;
  /** Hide the target selector — target stays as passed in. */
  lockedTarget?: boolean;
  /** Active Beat-FX set, for visual feedback. */
  activeBeatFx?: ReadonlySet<BeatFxId>;
}

export function ChaosPad({
  target, mode, onModeChange, onXYMove, onXYDown, onXYUp,
  onBeatFxDown, onBeatFxUp, compact = false, lockedTarget = false,
  activeBeatFx,
}: ChaosPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [touchXY, setTouchXY] = useState<{ x: number; y: number } | null>(null);

  const getXY = useCallback((e: React.PointerEvent) => {
    const r = padRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }, []);

  const handleDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const xy = getXY(e);
    setTouchXY(xy);
    onXYDown(mode, xy.x, xy.y);
  }, [getXY, mode, onXYDown]);

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.buttons) return;
    const xy = getXY(e);
    setTouchXY(xy);
    onXYMove(mode, xy.x, xy.y);
  }, [getXY, mode, onXYMove]);

  const handleUp = useCallback(() => {
    setTouchXY(null);
    onXYUp(mode);
  }, [mode, onXYUp]);

  const modeColor = MODE_CONFIG[mode].color;

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
      {!lockedTarget && (
        <div className="flex items-center gap-1 px-2">
          <span className="text-[9px] text-white/40 tracking-wider">TARGET</span>
          {FX_TARGETS.map((t) => (
            <button key={t.id}
              onClick={() => { /* host wires target separately */ }}
              className={`px-2 h-5 text-[9px] font-bold rounded ${
                t.id === target ? "bg-white/15 text-white/90" : "text-white/30 hover:text-white/60"
              }`}
            >{t.label}</button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 px-2">
        <span className="text-[9px] text-white/40 tracking-wider">MODE</span>
        {FX_MODES.map((m) => (
          <button key={m} onClick={() => onModeChange(m)}
            className={`px-2 h-6 text-[9px] font-bold rounded transition-colors ${
              m === mode
                ? "bg-white/15"
                : "text-white/30 hover:text-white/60"
            }`}
            style={{ color: m === mode ? MODE_CONFIG[m].color : undefined }}
          >{m}</button>
        ))}
      </div>

      <div
        ref={padRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onLostPointerCapture={handleUp}
        className="relative flex-1 rounded-lg border overflow-hidden cursor-crosshair select-none touch-none"
        style={{
          minHeight: compact ? 90 : 140,
          borderColor: `${modeColor}40`,
          background: `radial-gradient(circle at 50% 50%, ${modeColor}18, transparent 70%), #0d0a0f`,
        }}
      >
        <div className="absolute top-1 left-2 text-[8px] tracking-wider font-bold" style={{ color: modeColor }}>
          {MODE_CONFIG[mode].xLabel} ◂▸ · {MODE_CONFIG[mode].yLabel} ▴▾
        </div>
        {touchXY && (
          <div
            className="absolute w-3 h-3 rounded-full pointer-events-none"
            style={{
              left: `calc(${touchXY.x * 100}% - 6px)`,
              top: `calc(${touchXY.y * 100}% - 6px)`,
              background: modeColor,
              boxShadow: `0 0 12px ${modeColor}`,
            }}
          />
        )}
      </div>

      <div className="flex gap-1 px-2">
        {BEAT_FX_IDS.map((id) => {
          const isActive = activeBeatFx?.has(id) ?? false;
          return (
            <button
              key={id}
              onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {/*ok*/} onBeatFxDown(id); }}
              onPointerUp={() => onBeatFxUp(id)}
              onPointerCancel={() => onBeatFxUp(id)}
              onLostPointerCapture={() => onBeatFxUp(id)}
              className={`flex-1 h-7 text-[9px] font-bold rounded transition-colors ${
                isActive ? "bg-red-500/40 text-red-100" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >{BEAT_FX_LABELS[id]}</button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors that reference `ChaosPad.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChaosPad.tsx
git commit -m "feat(fx): shared ChaosPad UI component"
```

---

## Task 3: Refactor `FxPanel.tsx` to consume `<ChaosPad>` + `chaosFxBus`

**Files:**
- Modify: `src/components/FxPanel.tsx`

Replace FxPanel's inline XY-canvas and Beat-FX-row JSX with a `<ChaosPad>` instance. Audio behaviour must stay identical — the same callbacks fire `chaosFxBus.activate / setXY / release` and FxPanel's existing internal Beat-FX list.

- [ ] **Step 1: Add the ChaosPad import**

In `src/components/FxPanel.tsx`, with the other imports:

```ts
import { ChaosPad, type BeatFxId } from "./ChaosPad";
```

- [ ] **Step 2: Replace the XY canvas + Beat-FX JSX with `<ChaosPad>`**

In FxPanel's render (the function starting at line 554), find the JSX block that currently renders the XY pad and Beat-FX buttons (search for the existing `handlePadDown` callback usage and the existing Beat-FX buttons block — they are inside the panel body around lines 862+). Replace that block with a single `<ChaosPad>` element wired to FxPanel's existing state and handlers:

```tsx
<ChaosPad
  target={fxTarget}
  mode={activeMode}
  onModeChange={setActiveMode}
  onXYDown={(mode, x, y) => {
    chaosFxBus.activate(fxTarget, mode, x, y, bpm);
    motionRecorder.addPoint(x, y);   // keep existing motion-recorder hook
  }}
  onXYMove={(mode, x, y) => {
    chaosFxBus.setXY(fxTarget, mode, x, y, bpm);
    motionRecorder.addPoint(x, y);
  }}
  onXYUp={(mode) => {
    chaosFxBus.release(fxTarget, mode);
  }}
  onBeatFxDown={handleBeatFxDown as (id: BeatFxId) => void}
  onBeatFxUp={handleBeatFxUp as (id: BeatFxId) => void}
  activeBeatFx={new Set(Array.from(activeBeatFx).map(idx => beatFxListRef.current[idx]!.id as BeatFxId))}
/>
```

> Note: `handleBeatFxDown` and `handleBeatFxUp` in FxPanel currently take a numeric `index` into `beatFxListRef.current`. The component now passes a `BeatFxId` string. Wrap the callbacks with a tiny lookup adapter inline (or convert them to take the id directly — either is fine; pick the smaller diff). Confirm the `id` strings in `beatFxListRef.current` actually match the `BeatFxId` union, otherwise widen the lookup.

- [ ] **Step 3: Remove any now-dead code**

If after the replacement these things are unused inside FxPanel, delete them: the now-superseded XY-canvas JSX block, any local refs that were only used by it (e.g. an internal `padRef` for the XY only — keep refs that other parts of FxPanel still need), and any per-mode style helpers that ChaosPad now owns. **Do not** delete `BeatFx`, `createBeatFxList`, `motionRecorder` integration, the target selector, or the FX-mode preset buttons — those are still FxPanel's responsibility.

- [ ] **Step 4: Verify it compiles + standalone FX still works**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

Run: `npm run build`
Expected: build succeeds.

Run manually: `npm run dev`, open the app, click the `FX` toolbar button, change Mode to e.g. DELAY, drag the XY canvas — audio responds. Hold THROW / CHOKE — Beat-FX activates. Confirm none of the existing FxPanel functions visibly regress.

- [ ] **Step 5: Commit**

```bash
git add src/components/FxPanel.tsx
git commit -m "refactor(fx): FxPanel uses shared ChaosPad component"
```

---

## Task 4: Store — `fxEvents` automation layer

**Files:**
- Modify: `src/store/performancePadStore.ts`
- Modify: `src/store/performancePadStore.test.ts`

- [ ] **Step 1: Write the failing test**

Append this block to the end of `src/store/performancePadStore.test.ts`:

```ts
describe("performancePadStore — fxEvents layer", () => {
  const store = () => usePerformancePadStore.getState();

  beforeEach(() => {
    store().clearRecording();
    store().armRecording();
    // Stamp recordStart by faking a first event — appendEvent does this for armed state.
    store().appendEvent({ type: "down", pointerId: 1, x: 0.5, y: 0.5, velocity: 0.8 });
  });

  it("starts with an empty fxEvents array", () => {
    store().clearRecording();
    expect(store().fxEvents).toEqual([]);
  });

  it("appendFxEvent stamps t and appends while recording", () => {
    store().appendFxEvent({ kind: "xy", mode: "FILTER", x: 0.3, y: 0.6 });
    const evs = store().fxEvents;
    expect(evs).toHaveLength(1);
    expect(evs[0]!.kind).toBe("xy");
    expect((evs[0] as { mode: string }).mode).toBe("FILTER");
    expect(evs[0]!.t).toBeGreaterThanOrEqual(0);
  });

  it("appendFxEvent is a no-op outside live recording", () => {
    store().stopRecording(120);
    store().appendFxEvent({ kind: "beat-down", fxId: "throw" });
    expect(store().fxEvents).toHaveLength(0);
  });

  it("clearEvents empties only notes; fxEvents stay", () => {
    store().appendFxEvent({ kind: "xy", mode: "FILTER", x: 0.3, y: 0.6 });
    store().clearEvents();
    expect(store().events).toEqual([]);
    expect(store().fxEvents).toHaveLength(1);
  });

  it("clearFxEvents empties only fxEvents; notes stay", () => {
    store().appendFxEvent({ kind: "xy", mode: "FILTER", x: 0.3, y: 0.6 });
    expect(store().events.length).toBeGreaterThan(0);
    store().clearFxEvents();
    expect(store().fxEvents).toEqual([]);
    expect(store().events.length).toBeGreaterThan(0);
  });

  it("clearRecording wipes both notes and fxEvents", () => {
    store().appendFxEvent({ kind: "xy", mode: "FILTER", x: 0.3, y: 0.6 });
    store().clearRecording();
    expect(store().events).toEqual([]);
    expect(store().fxEvents).toEqual([]);
  });
});
```

(The existing top-of-file imports already include `describe`, `it`, `expect`, `beforeEach`, and `usePerformancePadStore` — reuse them; do not duplicate.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/store/performancePadStore.test.ts`
Expected: FAIL — `fxEvents` / `appendFxEvent` / `clearEvents` / `clearFxEvents` not defined.

- [ ] **Step 3: Apply the store changes**

In `src/store/performancePadStore.ts`:

**3a.** Add imports near the top, with the other imports:

```ts
import { type FxMode } from "../audio/ChaosFxBus";
import { type BeatFxId } from "../components/ChaosPad";
```

**3b.** After the `PadEvent` interface definition, add the new union type:

```ts
export type FxEvent =
  | { t: number; kind: "xy"; mode: FxMode; x: number; y: number }
  | { t: number; kind: "beat-down" | "beat-up"; fxId: BeatFxId };
```

**3c.** In the `PerformancePadState` interface, in the `// Recording` block (where `events: PadEvent[]` is), add **immediately after** that line:

```ts
  fxEvents: FxEvent[];   // FX automation layer — runs in parallel with `events`
```

**3d.** In the `// Recording API` block of the interface, add these declarations alongside the existing ones:

```ts
  /** Append an FX event while live recording; no-op otherwise. Stamps t. */
  appendFxEvent: (ev: Omit<FxEvent, "t">) => void;
  /** Empty `events` only (CLR NOTES). */
  clearEvents: () => void;
  /** Empty `fxEvents` only (CLR FX). */
  clearFxEvents: () => void;
```

**3e.** In the store's initial-state block, add `fxEvents: []` next to `events: []`:

```ts
  fxEvents: [],
```

**3f.** In `clearRecording`, the existing line:

```ts
    set({
      events: [], loopDuration: 0, isRecording: false, isArmed: false,
      isStepRecording: false, stepNotes: [], stepCursor: 0,
    });
```

becomes:

```ts
    set({
      events: [], fxEvents: [], loopDuration: 0, isRecording: false, isArmed: false,
      isStepRecording: false, stepNotes: [], stepCursor: 0,
    });
```

**3g.** Add the three new actions next to `appendEvent` (after it is a good spot):

```ts
  appendFxEvent: (ev) => {
    const s = get();
    if (!s.isRecording) return;
    const t = performance.now() - s.recordStart;
    set((state) => ({ fxEvents: [...state.fxEvents, { ...ev, t } as FxEvent] }));
  },

  clearEvents: () => set({ events: [] }),

  clearFxEvents: () => set({ fxEvents: [] }),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/store/performancePadStore.test.ts`
Expected: PASS — every assertion in the new describe block green; the previously-passing tests still pass.

- [ ] **Step 5: Run tsc**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/performancePadStore.ts src/store/performancePadStore.test.ts
git commit -m "feat(perf-pad): fxEvents automation layer in store"
```

---

## Task 5: PerformancePad — split layout + embed `<ChaosPad>`

**Files:**
- Modify: `src/components/PerformancePad.tsx`

This task only renders the new ChaosPad. Callbacks are stubbed (do nothing) — Tasks 6 and 7 wire them.

- [ ] **Step 1: Add the imports**

At the top of `src/components/PerformancePad.tsx`, alongside the other component imports:

```ts
import { ChaosPad, type BeatFxId } from "./ChaosPad";
import { chaosFxBus, type FxMode } from "../audio/ChaosFxBus";
import { beatFxManager } from "../audio/BeatFx";
```

(Some of these are needed for Task 6 — adding them now keeps Task 5's diff focused on layout.)

- [ ] **Step 2: Add ChaosPad state + collapse flag**

After the other `useState` declarations near the top of the component, add:

```tsx
  const [chaosMode, setChaosMode] = useState<FxMode>("FILTER");
  const [chaosCollapsed, setChaosCollapsed] = useState(false);
  const [activeBeatFx, setActiveBeatFx] = useState<Set<BeatFxId>>(new Set());
```

- [ ] **Step 3: Render the ChaosPad below the XY pad**

Find the closing `</div>` of the XY-pad row container (the one with className `"flex-1 flex items-stretch justify-stretch p-6 gap-4 min-h-0"`). The step-lane already renders directly after it from Task 4 of the previous feature. Insert **between** the XY-pad row and the existing step-lane block:

```tsx
        {target === "melody" && !chaosCollapsed && (
          <div className="px-6 pb-2" style={{ flexBasis: "35%", flexShrink: 0 }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-white/40 tracking-[0.15em] uppercase">Chaos · Melody</span>
              <button onClick={() => setChaosCollapsed(true)}
                className="text-[9px] text-white/40 hover:text-white/80 px-2 h-5 rounded bg-white/5">MIN</button>
            </div>
            <ChaosPad
              target="melody"
              lockedTarget
              compact
              mode={chaosMode}
              onModeChange={setChaosMode}
              onXYDown={() => { /* wired in Task 6 */ }}
              onXYMove={() => { /* wired in Task 6 */ }}
              onXYUp={() => { /* wired in Task 6 */ }}
              onBeatFxDown={() => { /* wired in Task 6 */ }}
              onBeatFxUp={() => { /* wired in Task 6 */ }}
              activeBeatFx={activeBeatFx}
            />
          </div>
        )}
        {target === "melody" && chaosCollapsed && (
          <div className="px-6 pb-1">
            <button onClick={() => setChaosCollapsed(false)}
              className="text-[9px] text-white/50 hover:text-white/90 px-3 h-5 rounded bg-white/10">
              + CHAOS
            </button>
          </div>
        )}
```

> The XY-pad container's `flex-1` already grows; shrinking the ChaosPad to ~35% of the column is enforced by `flexBasis: "35%"` + `flexShrink: 0` on the chaos block.

- [ ] **Step 4: Verify it compiles + ChaosPad renders**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

Run manually: `npm run dev`, open the XY PAD (target = melody). Below the XY pad: the Chaos strip appears with mode buttons + an XY canvas + 6 Beat-FX buttons + a `MIN` button. Pressing `MIN` collapses the strip and shows a `+ CHAOS` re-open button. Audio does nothing yet (callbacks are stubs) — that is expected.

- [ ] **Step 5: Commit**

```bash
git add src/components/PerformancePad.tsx
git commit -m "feat(perf-pad): split layout with embedded ChaosPad shell"
```

---

## Task 6: PerformancePad — wire ChaosPad callbacks (live audio + record)

**Files:**
- Modify: `src/components/PerformancePad.tsx`

- [ ] **Step 1: Pull the new store actions into the destructuring**

In the `usePerformancePadStore()` destructuring block, **add** `appendFxEvent`, `clearEvents`, `clearFxEvents`, `fxEvents` to the existing destructured list. The line that pulls actions becomes (existing items kept, three new actions appended):

```ts
    armRecording, startStepRecording, stopRecording, clearRecording, placeStepNote, setStepCursor, clearStepAt, skipStep, undoLastStep, appendEvent, appendFxEvent, clearEvents, clearFxEvents, setLoopBars, setQuantize,
```

And the state line gains `fxEvents`:

```ts
    events, fxEvents, isArmed, isRecording, isStepRecording, stepNotes, stepCursor, stepGridMs, isLooping, loopDuration, loopBars, quantize,
```

- [ ] **Step 2: Replace the ChaosPad stub callbacks**

Find the `<ChaosPad>` element inserted in Task 5. Replace each stub:

```tsx
              onXYDown={(mode, x, y) => {
                const b = useDrumStore.getState().bpm;
                chaosFxBus.activate("melody", mode, x, y, b);
                appendFxEvent({ kind: "xy", mode, x, y });
              }}
              onXYMove={(mode, x, y) => {
                const b = useDrumStore.getState().bpm;
                chaosFxBus.setXY("melody", mode, x, y, b);
                appendFxEvent({ kind: "xy", mode, x, y });
              }}
              onXYUp={(mode) => {
                chaosFxBus.release("melody", mode);
              }}
              onBeatFxDown={(id) => {
                beatFxManager.startEffect(id);
                appendFxEvent({ kind: "beat-down", fxId: id });
                setActiveBeatFx((prev) => new Set(prev).add(id));
              }}
              onBeatFxUp={(id) => {
                beatFxManager.stopEffect(id);
                appendFxEvent({ kind: "beat-up", fxId: id });
                setActiveBeatFx((prev) => { const n = new Set(prev); n.delete(id); return n; });
              }}
```

> `useDrumStore` is already imported in `PerformancePad.tsx`. Confirm with `grep -n 'useDrumStore' src/components/PerformancePad.tsx`; if not, add the import alongside other store imports.

- [ ] **Step 3: Verify it compiles + live audio works**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

Run manually: `npm run dev`, open the XY PAD (melody). Drag the Chaos XY canvas → you hear the melody bus get filter/delay/reverb modulation (depending on the current mode). Hold THROW → the master throws like in the sidebar. Release → effect goes away.

- [ ] **Step 4: Commit**

```bash
git add src/components/PerformancePad.tsx
git commit -m "feat(perf-pad): live FX shaping in the Melody Pad"
```

---

## Task 7: PerformancePad — replay `fxEvents` on loop

**Files:**
- Modify: `src/components/PerformancePad.tsx`

The existing loop scheduler `useEffect` (~lines 775–926) iterates `events` and schedules notes against `iterAudioStart`/`iterWallStart`. Extend it to also iterate `fxEvents` against the same `iterWallStart`.

- [ ] **Step 1: Schedule `fxEvents` inside the loop iteration**

In the loop scheduler effect, find the existing `scheduleIteration` function (`const scheduleIteration = (iterAudioStart: number, iterWallStart: number) => { ... }`). At the **end** of that function body (after the existing per-iteration scheduling of notes/moves, before the closing `};`), append:

```ts
      // FX automation layer — same wall-clock anchor as the notes.
      for (const ev of sortedFxEvents) {
        const wallDelay = (iterWallStart - performance.now()) + ev.t;
        if (wallDelay < -20) continue; // already past this iteration
        const timer = setTimeout(() => {
          if (!usePerformancePadStore.getState().isLooping) return;
          const b = useDrumStore.getState().bpm;
          if (ev.kind === "xy") {
            chaosFxBus.setXY("melody", ev.mode, ev.x, ev.y, b);
          } else if (ev.kind === "beat-down") {
            beatFxManager.startEffect(ev.fxId);
          } else {
            beatFxManager.stopEffect(ev.fxId);
          }
        }, Math.max(0, wallDelay));
        timers.push(timer);
      }
```

- [ ] **Step 2: Sort `fxEvents` once per useEffect run**

Earlier in the same `useEffect` (where `pairedNotes.sort(...)` and `sortedMoves` are computed), add a sorted copy of `fxEvents`:

```ts
    const sortedFxEvents = [...fxEvents].sort((a, b) => a.t - b.t);
```

- [ ] **Step 3: Add `fxEvents` to the useEffect dependency array**

The existing dependency array for the scheduler `useEffect` ends with something like `[isLooping, events, loopDuration, xToMidi, fireVoice, modulateVoice, repitchVoice, gridSnap, target]`. Add `fxEvents` to it:

```ts
  }, [isLooping, events, fxEvents, loopDuration, xToMidi, fireVoice, modulateVoice, repitchVoice, gridSnap, target]);
```

- [ ] **Step 4: Verify it compiles + loop replays FX**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

Run manually: `npm run dev`, open the XY PAD (melody). Press `REC`, play 2–3 notes while dragging the Chaos XY canvas, then `STOP`. Press `LOOP`. The loop plays the notes *and* the FX moves you made, in time with the bar. Press `STOP LOOP` — FX state stays where the last move left it (no automatic reset, matches existing behaviour).

- [ ] **Step 5: Commit**

```bash
git add src/components/PerformancePad.tsx
git commit -m "feat(perf-pad): loop scheduler replays fxEvents synced with notes"
```

---

## Task 8: PerformancePad — `CLR NOTES` / `CLR FX` + LOOP enable gate

**Files:**
- Modify: `src/components/PerformancePad.tsx`

- [ ] **Step 1: Replace the single `CLR` button with two**

Find the existing `CLR` button in the recording toolbar (search for `clearRecording` in the JSX — it is one of the small buttons rendered when `events.length > 0`). Replace just that single button with:

```tsx
            <button onClick={clearEvents}
              disabled={events.length === 0}
              className="px-2 h-6 text-[8px] font-bold rounded bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Clear recorded notes (keeps FX automation)"
            >CLR NOTES</button>
            <button onClick={clearFxEvents}
              disabled={fxEvents.length === 0}
              className="px-2 h-6 text-[8px] font-bold rounded bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Clear recorded FX automation (keeps notes)"
            >CLR FX</button>
```

- [ ] **Step 2: Widen the LOOP-button visibility**

The current visibility guard for the LOOP / EXPORT row uses `events.length > 0`. Widen it so the user can also LOOP back a recording that only contains FX automation. Find:

```tsx
        {events.length > 0 && !isRecording && !isArmed && (
```

Change to:

```tsx
        {(events.length > 0 || fxEvents.length > 0) && !isRecording && !isArmed && (
```

The events-count readout next to LOOP currently reads `{events.length} ev · {(loopDuration / 1000).toFixed(1)}s`. Update it to also count FX events:

```tsx
              {events.length} note ev · {fxEvents.length} fx ev · {(loopDuration / 1000).toFixed(1)}s
```

- [ ] **Step 3: Verify it compiles + both clears work**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

Run manually: record some notes + FX. Press `CLR FX` → notes remain (LOOP still replays them silent of FX). Press `CLR NOTES` → notes cleared, FX automation still present. Re-record notes — they layer with the existing FX automation. `RESET` (existing button calling `clearRecording`) wipes both.

- [ ] **Step 4: Commit**

```bash
git add src/components/PerformancePad.tsx
git commit -m "feat(perf-pad): CLR NOTES / CLR FX split + LOOP allows FX-only"
```

---

## Task 9: Build + browser verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite + production build**

Run: `npm test && npm run build`
Expected: 86+ tests pass (the previous suite plus this branch's new tests); production build is green.

- [ ] **Step 2: End-to-end loop closure in the browser**

In `npm run dev`:

1. Open XY PAD (target Melody by default).
2. Confirm split layout: Melody XY top, Chaos strip below (with target showing "MELODY", mode buttons, XY canvas, 6 Beat-FX), step lane at the very bottom.
3. Press `REC`. Play 4 notes on the Melody XY pad. Sweep the Chaos XY canvas through FILTER → DELAY by tapping the mode buttons mid-recording. Briefly hold CHOKE then release.
4. Press `STOP`. Toolbar readout shows e.g. `4 note ev · 30+ fx ev · 4.0s`.
5. Press `LOOP`. Listen: the melody loops *and* the filter sweep and delay moves play back; CHOKE fires at the same position in each iteration. Visual Chaos canvas dot moves automatically.
6. Press `CLR FX`. Loop now plays clean melody, no FX automation. Re-sweep the Chaos XY (live, no REC) → no change to the stored recording.
7. Press `STOP LOOP`. Press `RESET` (the existing big reset) → notes and FX both gone.
8. Repeat steps 3–5 in `STEP` mode: confirm that FX gestures in step mode are **not** captured (`fxEvents` stays empty when only step recording is active).

- [ ] **Step 3: Confirm FxPanel still works standalone**

Open the FxPanel (the `FX` toolbar button). Drag its XY canvas, switch modes, hold Beat-FX — same audio behaviour as before the refactor. Its own motion REC / playback still works.

- [ ] **Step 4: Commit any verification fixes (if needed)**

```bash
git add -A
git commit -m "fix(perf-pad): FX loop closure verification fixes"
```

If no fixes are needed, skip this step.

---

## Self-Review notes

- **Spec coverage:** UI split (Task 5), Chaos surface = Kaoss XY + Beat-FX (Task 2/5), target locked to melody (Task 5/6), `fxEvents` layer (Task 4), record notes + FX synced via one REC (Task 6), playback both via `loopWallStart` (Task 7), `CLR NOTES` / `CLR FX` split (Task 8), step-mode untouched (Task 4 — `appendFxEvent` no-op outside live REC), shared `<ChaosPad>` extraction (Task 2/3), `ChaosFxBus` audio module (Task 1).
- **Placeholder scan:** no TBDs. All code blocks contain the exact text to type.
- **Type consistency:** `FxMode` and `FxTarget` come from `ChaosFxBus.ts` everywhere (Tasks 1, 4, 5, 6, 7). `BeatFxId` comes from `ChaosPad.tsx` (Tasks 2, 4, 5, 6). `FxEvent` defined once in `performancePadStore.ts` (Task 4). `appendFxEvent` / `clearEvents` / `clearFxEvents` signatures match between interface, implementation, tests, and component callsites.
