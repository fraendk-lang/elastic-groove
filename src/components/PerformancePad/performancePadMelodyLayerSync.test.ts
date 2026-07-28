import { describe, it, expect } from "vitest";
import {
  padXToMidi,
  loopBarsToBarLength,
  stepNotesToMelodyLayerNotes,
} from "./performancePadMelodyLayerSync";
import type { StepNote } from "../../store/performancePadStep";

const pitchMap = {
  scaleName: "Major",
  rootNote: 60,
  scaleLowestOct: 0,
  scaleOctaves: 2,
  gridSnap: true,
};

describe("padXToMidi", () => {
  it("maps x=0 to root in grid-snap mode", () => {
    expect(padXToMidi(0, pitchMap)).toBe(60);
  });
});

describe("loopBarsToBarLength", () => {
  it("uses explicit loopBars when set", () => {
    expect(loopBarsToBarLength(4, 8000, 120)).toBe(4);
  });
  it("derives bar length from duration when loopBars is auto (0)", () => {
    const msPerBar = (60000 / 120) * 4;
    expect(loopBarsToBarLength(0, msPerBar * 2, 120)).toBe(2);
  });
});

describe("stepNotesToMelodyLayerNotes", () => {
  const n = (x: number): StepNote => ({ x, y: 0.5, velocity: 0.8 });

  it("converts filled steps to layer notes on a 16th grid", () => {
    const notes = stepNotesToMelodyLayerNotes(
      [n(0.1), null, n(0.5)],
      125,
      120,
      (x) => padXToMidi(x, pitchMap),
      8,
    );
    expect(notes).toHaveLength(2);
    expect(notes[0]!.startBeat).toBe(0);
    expect(notes[1]!.startBeat).toBeCloseTo(0.5);
    expect(notes[0]!.pitch).toBeGreaterThanOrEqual(48);
    expect(notes[0]!.pitch).toBeLessThanOrEqual(84);
  });

  it("drops steps beyond the layer window", () => {
    const notes = stepNotesToMelodyLayerNotes(
      [n(0.2), n(0.4), n(0.6), n(0.8), n(0.9)],
      125,
      120,
      (x) => padXToMidi(x, pitchMap),
      1,
    );
    for (const note of notes) {
      expect(note.startBeat).toBeLessThan(1);
    }
  });
});
