import { describe, it, expect } from "vitest";
import { applyPadToneAmountPercent, getPadToneAmountPercent, LAYER3_TONE_FOLLOW } from "./MelodyPadToneFx";

describe("applyPadToneAmountPercent", () => {
  it("clamps percent to 0–100", () => {
    applyPadToneAmountPercent(150);
    expect(getPadToneAmountPercent()).toBe(100);
    applyPadToneAmountPercent(-12);
    expect(getPadToneAmountPercent()).toBe(0);
    applyPadToneAmountPercent(78);
    expect(getPadToneAmountPercent()).toBe(78);
  });

  it("exports L3 follow scale below 1", () => {
    expect(LAYER3_TONE_FOLLOW).toBeGreaterThan(0);
    expect(LAYER3_TONE_FOLLOW).toBeLessThan(1);
  });
});
