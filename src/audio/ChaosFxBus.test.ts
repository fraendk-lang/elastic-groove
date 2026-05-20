import { describe, it, expect } from "vitest";
import { getMusicalValue } from "./ChaosFxBus";

describe("getMusicalValue", () => {
  it("FILTER returns text + description strings", () => {
    const v = getMusicalValue("FILTER", 0.5, 0.5, 120);
    expect(typeof v.text).toBe("string");
    expect(v.text.length).toBeGreaterThan(0);
    expect(typeof v.description).toBe("string");
  });

  it("DELAY text changes as x changes", () => {
    const lo = getMusicalValue("DELAY", 0.1, 0.5, 120);
    const hi = getMusicalValue("DELAY", 0.9, 0.5, 120);
    expect(hi.text).not.toBe(lo.text);
  });

  it("REVERB / FLANGER / CRUSH / PHASER / CHORUS each return text + description", () => {
    for (const mode of ["REVERB", "FLANGER", "CRUSH", "PHASER", "CHORUS"] as const) {
      const v = getMusicalValue(mode, 0.5, 0.5, 120);
      expect(typeof v.text).toBe("string");
      expect(v.text.length).toBeGreaterThan(0);
      expect(typeof v.description).toBe("string");
    }
  });
});
