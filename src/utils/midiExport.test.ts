import { describe, it, expect } from "vitest";
import { beatNotesToMidi } from "./midiExport";
import { stepNotesToBeatMidiNotes } from "../components/PerformancePad/performancePadMidiExport";

describe("beatNotesToMidi", () => {
  it("writes a valid SMF header", () => {
    const bytes = beatNotesToMidi(
      [{ midi: 60, startBeat: 0, durationBeats: 0.25, velocity: 0.8 }],
      120,
      "Test",
    );
    expect(bytes[0]).toBe(0x4d); // M
    expect(bytes[1]).toBe(0x54); // T
    expect(bytes[2]).toBe(0x68); // h
    expect(bytes[3]).toBe(0x64); // d
  });
});

describe("stepNotesToBeatMidiNotes", () => {
  it("converts filled steps to beat-based notes", () => {
    const notes = stepNotesToBeatMidiNotes(
      [{ x: 0.5, y: 0.5, velocity: 0.9 }, null],
      125,
      120,
      { scaleName: "Major", rootNote: 60, scaleLowestOct: 0, scaleOctaves: 2, gridSnap: true },
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]!.startBeat).toBe(0);
  });
});
