import { describe, it, expect } from "vitest";
import {
  clampFaderPos,
  faderPosToDb,
  faderToGain,
  FADER_UNITY,
  normalizeChannelMixState,
} from "../store/mixerBarStore";

describe("mixerBarStore fader helpers", () => {
  it("clamps fader positions to 0–1000", () => {
    expect(clampFaderPos(-10)).toBe(0);
    expect(clampFaderPos(1000)).toBe(1000);
    expect(clampFaderPos(1001)).toBe(1000);
    expect(clampFaderPos(501.6)).toBe(502);
  });

  it("maps unity fader to ~0 dB gain", () => {
    expect(faderToGain(FADER_UNITY)).toBeCloseTo(1, 2);
    expect(faderPosToDb(FADER_UNITY)).toBeCloseTo(0, 1);
  });

  it("defaults bass channel lower than chords", () => {
    const bass = normalizeChannelMixState(undefined, 12);
    const chords = normalizeChannelMixState(undefined, 13);
    expect(bass.fader).toBeLessThan(chords.fader);
    expect(bass.fader).toBeLessThanOrEqual(520);
  });
});
