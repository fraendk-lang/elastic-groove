import { describe, expect, it } from "vitest";
import {
  composerHandoffToChordsPattern,
  parseComposerHandoffHash,
} from "./composerHandoff";

describe("composerHandoff", () => {
  it("parses #c= hash and maps Cm–G–G#–Fm to chord steps", () => {
    const payload = {
      b: 90,
      k: { t: 0, m: "minor" },
      p: [
        { r: 0, q: "m", b: 0, t: 4 },
        { r: 7, q: "maj", b: 7, t: 4 },
        { r: 8, q: "maj", b: 8, t: 4 },
        { r: 5, q: "m", b: 5, t: 4 },
      ],
    };
    const hash = "#c=" + encodeURIComponent(JSON.stringify(payload));
    expect(parseComposerHandoffHash(hash)?.p.length).toBe(4);

    const pattern = composerHandoffToChordsPattern(payload);
    expect(pattern.bpm).toBe(90);
    expect(pattern.scaleName).toBe("Minor");
    expect(pattern.steps[0]?.active).toBe(true);
    expect(pattern.steps[0]?.note).toBe(0);
    expect(pattern.steps[0]?.chordType).toBe("Min");
    expect(pattern.steps[16]?.active).toBe(true);
    expect(pattern.steps[16]?.note).toBe(4);
    expect(pattern.steps[16]?.chordType).toBe("Maj");
    expect(pattern.length).toBeGreaterThanOrEqual(64);
  });
});
