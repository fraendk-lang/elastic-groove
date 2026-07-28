import { describe, it, expect, beforeEach } from "vitest";
import { applyMelodyStepsToPadLayer } from "./demoMelodyLayerSync";
import { useMelodyLayerStore } from "../store/melodyLayerStore";

describe("applyMelodyStepsToPadLayer", () => {
  beforeEach(() => {
    useMelodyLayerStore.setState({
      enabled: false,
      layers: [],
      activeLayerId: null,
    });
  });

  it("returns null when no active steps", () => {
    const result = applyMelodyStepsToPadLayer({
      steps: [{
        active: false, note: 0, octave: 0, accent: false, slide: false, tie: false,
      }],
      length: 16,
      rootNote: 60,
      scaleName: "Major",
    });
    expect(result).toBeNull();
  });

  it("writes notes into melody layer L3", () => {
    const steps = Array.from({ length: 16 }, (_, i) => ({
      active: i % 4 === 0,
      note: 0,
      octave: 0,
      accent: false,
      slide: false,
      tie: false,
      velocity: 0.9,
      gateLength: 1,
    }));
    const result = applyMelodyStepsToPadLayer({
      steps,
      length: 16,
      rootNote: 60,
      scaleName: "Major",
      presetIndex: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.noteCount).toBeGreaterThan(0);
    expect(useMelodyLayerStore.getState().enabled).toBe(true);
    expect(useMelodyLayerStore.getState().layers.length).toBeGreaterThanOrEqual(3);
  });
});
