import { describe, it, expect, beforeEach } from "vitest";
import {
  midiToScaleDegree,
  bassStepsToPianoRollNotes,
  pianoRollNotesToBassSteps,
  pullSequencersToPianoRoll,
  applyPianoRollTrackToSequencer,
} from "./sequencerSync";
import type { PianoRollNote } from "./types";
import { useBassStore } from "../../store/bassStore";

describe("sequencerSync", () => {
  beforeEach(() => {
    useBassStore.setState({
      steps: Array.from({ length: 16 }, () => ({
        active: false, note: 0, octave: 0, accent: false, slide: false, tie: false,
      })),
      length: 16,
      rootNote: 36,
      rootName: "C",
      scaleName: "Chromatic",
      globalOctave: 0,
    });
  });

  it("round-trips MIDI via scale degree on chromatic scale", () => {
    const { degree, octave } = midiToScaleDegree(36, "Chromatic", 48, 0);
    const steps = pianoRollNotesToBassSteps(
      [{
        id: "n1", midi: 48, start: 1, duration: 0.25, velocity: 0.8, track: "bass",
      }],
      16,
      36,
      "Chromatic",
      0,
    );
    expect(steps[4]?.active).toBe(true);
    expect(steps[4]?.note).toBe(degree);
    expect(steps[4]?.octave).toBe(octave);
  });

  it("pulls bass lane from step sequencer into piano roll", () => {
    const steps = useBassStore.getState().steps.map((s, i) =>
      i === 0 ? { ...s, active: true, note: 0, octave: 0, gateLength: 1 } : s,
    );
    useBassStore.setState({ steps, length: 16 });

    const merged = pullSequencersToPianoRoll([]);
    const bassNotes = merged.filter((n) => n.track === "bass");
    expect(bassNotes).toHaveLength(1);
    expect(bassNotes[0]?.start).toBe(0);
    expect(bassNotes[0]?.midi).toBe(36);
  });

  it("applies piano roll bass notes back to the step sequencer", () => {
    const notes: PianoRollNote[] = [{
      id: "n1", midi: 38, start: 0.5, duration: 0.25, velocity: 0.9, track: "bass",
    }];
    applyPianoRollTrackToSequencer(notes, "bass");
    const step = useBassStore.getState().steps[2];
    expect(step?.active).toBe(true);
  });

  it("converts bass steps to piano roll notes", () => {
    const notes = bassStepsToPianoRollNotes(
      [{ active: true, note: 2, octave: 0, accent: false, slide: false, tie: false, gateLength: 2 }],
      16,
      36,
      "Chromatic",
      0,
    );
    expect(notes[0]?.midi).toBe(38);
    expect(notes[0]?.duration).toBe(0.5);
  });
});
