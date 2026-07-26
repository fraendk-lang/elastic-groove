import { describe, it, expect } from "vitest";
import { generateArpNotes, DEFAULT_ARP_SETTINGS } from "./Arpeggiator";

describe("generateArpNotes pattern continuity", () => {
  it("advances through the scale across globalStepOffset beats", () => {
    const settings = { ...DEFAULT_ARP_SETTINGS, mode: "up" as const, rate: "1/4" as const, octaves: 1 };
    const beat = 0.5;

    const pass1 = generateArpNotes(60, beat, settings, "Major", 60, 0.85, [], 0);
    const pass2 = generateArpNotes(60, beat, settings, "Major", 60, 0.85, [], 1);

    expect(pass1[0]?.note).toBe(60);
    expect(pass2[0]?.note).not.toBe(pass1[0]?.note);
  });
});
