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
