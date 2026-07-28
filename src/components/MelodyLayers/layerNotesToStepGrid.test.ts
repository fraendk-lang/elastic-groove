import { describe, it, expect } from "vitest";
import { layerNotesToStepGrid, pitchToStepHeight } from "./layerNotesToStepGrid";

describe("layerNotesToStepGrid", () => {
  it("maps notes to 16th steps within the bar window", () => {
    const grid = layerNotesToStepGrid(
      [
        { id: "a", startBeat: 0, durationBeats: 0.25, pitch: 60 },
        { id: "b", startBeat: 1, durationBeats: 0.25, pitch: 64 },
      ],
      2,
    );
    expect(grid).toHaveLength(32);
    expect(grid[0]).toBe(60);
    expect(grid[4]).toBe(64);
  });
});

describe("pitchToStepHeight", () => {
  it("normalises MIDI 48–84 into visual height", () => {
    expect(pitchToStepHeight(48)).toBeCloseTo(0.15);
    expect(pitchToStepHeight(84)).toBeCloseTo(1);
  });
});
