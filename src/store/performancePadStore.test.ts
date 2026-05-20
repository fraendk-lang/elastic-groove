import { describe, it, expect, beforeEach } from "vitest";
import { usePerformancePadStore } from "./performancePadStore";

const store = () => usePerformancePadStore.getState();

describe("performancePadStore — step model", () => {
  beforeEach(() => {
    store().clearRecording();
    store().setQuantize("1/16");
    store().setLoopBars(1);
    store().startStepRecording(120); // 1 bar @120bpm = 2000ms, 125ms grid → 16 steps
  });

  it("startStepRecording initialises 16 empty steps at cursor 0", () => {
    expect(store().stepNotes).toHaveLength(16);
    expect(store().stepNotes.every((s) => s === null)).toBe(true);
    expect(store().stepCursor).toBe(0);
  });

  it("placeStepNote writes the note and advances the cursor", () => {
    store().placeStepNote({ x: 0.5, y: 0.5, velocity: 0.8 });
    expect(store().stepNotes[0]).toEqual({ x: 0.5, y: 0.5, velocity: 0.8 });
    expect(store().stepCursor).toBe(1);
  });

  it("placeStepNote regenerates the derived events array", () => {
    store().placeStepNote({ x: 0.5, y: 0.5, velocity: 0.8 });
    expect(store().events.filter((e) => e.type === "down")).toHaveLength(1);
  });

  it("the cursor wraps at the end of the loop", () => {
    store().setStepCursor(15);
    store().placeStepNote({ x: 0.5, y: 0.5, velocity: 0.8 });
    expect(store().stepCursor).toBe(0);
  });

  it("skipStep advances the cursor without placing a note", () => {
    store().skipStep();
    expect(store().stepCursor).toBe(1);
    expect(store().stepNotes[0]).toBeNull();
  });

  it("setStepCursor jumps to any step, clamped to range", () => {
    store().setStepCursor(7);
    expect(store().stepCursor).toBe(7);
    store().setStepCursor(999);
    expect(store().stepCursor).toBe(15);
  });

  it("clearStepAt deletes a note at any index", () => {
    store().setStepCursor(4);
    store().placeStepNote({ x: 0.3, y: 0.5, velocity: 0.7 });
    store().clearStepAt(4);
    expect(store().stepNotes[4]).toBeNull();
    expect(store().events).toHaveLength(0);
  });

  it("undoLastStep steps back and clears that step", () => {
    store().placeStepNote({ x: 0.5, y: 0.5, velocity: 0.8 }); // step 0 → cursor 1
    store().undoLastStep();
    expect(store().stepCursor).toBe(0);
    expect(store().stepNotes[0]).toBeNull();
  });
});

describe("performancePadStore — startStepRecording pattern preservation", () => {
  const store = () => usePerformancePadStore.getState();

  it("keeps the existing pattern when grid + length are unchanged", () => {
    store().clearRecording();
    store().setQuantize("1/16");
    store().setLoopBars(1);
    store().startStepRecording(120);
    store().placeStepNote({ x: 0.4, y: 0.5, velocity: 0.9 }); // note on step 0
    store().startStepRecording(120); // same quantize + loopBars + bpm
    expect(store().stepNotes[0]).toEqual({ x: 0.4, y: 0.5, velocity: 0.9 });
    expect(store().stepCursor).toBe(0);
  });

  it("starts fresh when the grid changes", () => {
    store().clearRecording();
    store().setQuantize("1/16");
    store().setLoopBars(1);
    store().startStepRecording(120);
    store().placeStepNote({ x: 0.4, y: 0.5, velocity: 0.9 });
    store().setQuantize("1/8"); // grid changes → pattern must be wiped
    store().startStepRecording(120);
    expect(store().stepNotes.every((s) => s === null)).toBe(true);
  });
});

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
