import { describe, it, expect, beforeEach } from "vitest";
import {
  drumPatternToPianoRollNotes,
  pianoRollNotesToDrumPattern,
  pullDrumsToPianoRoll,
  applyPianoRollToDrums,
  DRUM_MIDI_BASE,
} from "./drumSync";
import { useDrumStore, type PatternData } from "../../store/drumStore";

function emptyPattern(): PatternData {
  return useDrumStore.getState().pattern;
}

describe("drumSync", () => {
  beforeEach(() => {
    const pattern = emptyPattern();
    const tracks = pattern.tracks.map((t) => ({
      ...t,
      steps: t.steps.map((s) => ({ ...s, active: false })),
      length: 16,
    }));
    tracks[0]!.steps[0] = { ...tracks[0]!.steps[0]!, active: true, velocity: 110, gateLength: 1 };
    useDrumStore.setState({ pattern: { ...pattern, tracks, length: 16 } });
  });

  it("converts active drum steps to piano roll notes", () => {
    const notes = drumPatternToPianoRollNotes(useDrumStore.getState().pattern);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.midi).toBe(DRUM_MIDI_BASE);
    expect(notes[0]?.track).toBe("drums");
  });

  it("pulls drums lane from drum pattern", () => {
    const merged = pullDrumsToPianoRoll([]);
    expect(merged.filter((n) => n.track === "drums")).toHaveLength(1);
  });

  it("applies piano roll drum notes to pattern", () => {
    applyPianoRollToDrums([{
      id: "d1",
      midi: DRUM_MIDI_BASE + 2,
      start: 0.25,
      duration: 0.25,
      velocity: 0.9,
      track: "drums",
    }]);
    const step = useDrumStore.getState().pattern.tracks[2]!.steps[1];
    expect(step?.active).toBe(true);
    expect(step?.velocity).toBeGreaterThan(100);
  });

  it("round-trips voice mapping via pattern conversion", () => {
    const pattern = useDrumStore.getState().pattern;
    const notes = drumPatternToPianoRollNotes(pattern);
    const next = pianoRollNotesToDrumPattern(notes, pattern);
    expect(next.tracks[0]!.steps[0]?.active).toBe(true);
  });
});
