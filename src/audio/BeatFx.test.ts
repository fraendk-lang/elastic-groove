import { describe, it, expect } from "vitest";
import {
  stutterDivisionFromParam,
  stutterHzFromParam,
  rollSliceSecFromParam,
} from "./BeatFx";

describe("BeatFx helpers", () => {
  it("maps stutter rate to increasing divisions", () => {
    expect(stutterDivisionFromParam(0)).toBe(2);
    expect(stutterDivisionFromParam(0.5)).toBe(8);
    expect(stutterDivisionFromParam(0.99)).toBe(16);
  });

  it("computes BPM-synced stutter Hz", () => {
    expect(stutterHzFromParam(0.5, 120)).toBe(16); // 120/60 * 8
    expect(stutterHzFromParam(0, 90)).toBe(3);       // 90/60 * 2
  });

  it("computes roll slice length from BPM", () => {
    const quarter = rollSliceSecFromParam(0, 120);
    expect(quarter).toBeCloseTo(0.5, 3); // 1/4 note @ 120 BPM

    const sixteenth = rollSliceSecFromParam(0.5, 120);
    expect(sixteenth).toBeCloseTo(0.125, 3); // 1/16 note @ 120 BPM
  });
});
