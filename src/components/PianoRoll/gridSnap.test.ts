import { describe, it, expect } from "vitest";
import {
  snapBeatValue,
  quantizeBeat,
  formatGridLabel,
  cycleSnapMode,
  GRID_PRESETS,
} from "./gridSnap";

describe("gridSnap", () => {
  it("hard-snaps to nearest grid line", () => {
    expect(snapBeatValue(1.04, 0.25, "hard")).toBe(1);
    expect(snapBeatValue(1.13, 0.25, "hard")).toBe(1.25);
  });

  it("soft-snaps when close to grid line", () => {
    expect(snapBeatValue(1.02, 0.25, "soft")).toBe(1);
    expect(snapBeatValue(1.12, 0.25, "soft")).toBe(1.12);
  });

  it("off mode leaves beat unchanged", () => {
    expect(snapBeatValue(1.037, 0.25, "off")).toBe(1.037);
  });

  it("quantizeBeat always hard-snaps", () => {
    expect(quantizeBeat(1.04, 0.25)).toBe(1);
  });

  it("formats triplet and dotted labels", () => {
    const triplet = GRID_PRESETS.find((p) => p.label === "1/8T")!;
    expect(formatGridLabel(triplet.beats)).toBe("1/8T");
    const dotted = GRID_PRESETS.find((p) => p.label === "1/8D")!;
    expect(formatGridLabel(dotted.beats)).toBe("1/8D");
  });

  it("cycles snap modes", () => {
    expect(cycleSnapMode("hard")).toBe("soft");
    expect(cycleSnapMode("soft")).toBe("off");
    expect(cycleSnapMode("off")).toBe("hard");
  });
});
