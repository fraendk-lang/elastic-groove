import { describe, it, expect, beforeEach } from "vitest";
import {
  melodyLayerNotesToPianoRoll,
  pianoRollNotesToMelodyLayerNotes,
  pullMelodyLayersToPianoRoll,
  applyPianoRollToMelodyLayers,
} from "./melodyLayerSync";
import { useMelodyLayerStore, type MelodyLayer } from "../../store/melodyLayerStore";

describe("melodyLayerSync", () => {
  beforeEach(() => {
    const synth = useMelodyLayerStore.getState().layers[0]?.synth ?? {
      presetIndex: 0, octaveOffset: 0, cutoff: 0.5, resonance: 0.27, envMod: 0.4,
      filterDecay: 150, attack: 5, decay: 50, sustain: 1, release: 80, distortion: 0.15,
      volume: 0.7, reverbSend: 0, delaySend: 0, shimmerEnabled: false, shimmerDepth: 0.5,
      shimmerFeedback: 0.28, pitchGlide: 0,
    };
    const layer0: MelodyLayer = {
      id: "layer-a",
      colorIndex: 0,
      barLength: 2,
      notes: [{ id: "n1", startBeat: 0, durationBeats: 0.5, pitch: 60 }],
      synth,
      muted: false,
      soloed: false,
    };
    const layer1: MelodyLayer = {
      id: "layer-b",
      colorIndex: 1,
      barLength: 4,
      notes: [],
      synth,
      muted: false,
      soloed: false,
    };
    useMelodyLayerStore.setState({ layers: [layer0, layer1], activeLayerId: layer0.id });
  });

  it("converts layer notes to piano roll lane", () => {
    const layer = useMelodyLayerStore.getState().layers[0]!;
    const notes = melodyLayerNotesToPianoRoll(layer, 0);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.track).toBe("melodyLayer0");
    expect(notes[0]?.midi).toBe(60);
    expect(notes[0]?.start).toBe(0);
  });

  it("pulls melody layers into piano roll", () => {
    const merged = pullMelodyLayersToPianoRoll([]);
    expect(merged.filter((n) => n.track === "melodyLayer0")).toHaveLength(1);
    expect(merged.filter((n) => n.track === "melodyLayer1")).toHaveLength(0);
  });

  it("applies piano roll lane back to melody layer store", () => {
    applyPianoRollToMelodyLayers([{
      id: "x1",
      midi: 62,
      start: 1,
      duration: 0.25,
      velocity: 0.8,
      track: "melodyLayer0",
    }]);
    const layer0 = useMelodyLayerStore.getState().layers[0]!;
    expect(layer0.notes).toHaveLength(1);
    expect(layer0.notes[0]?.pitch).toBe(62);
    expect(layer0.notes[0]?.startBeat).toBe(1);
  });

  it("round-trips through piano roll note conversion", () => {
    const back = pianoRollNotesToMelodyLayerNotes(
      [{ id: "n2", midi: 55, start: 0.5, duration: 0.5, velocity: 0.7, track: "melodyLayer1" }],
      "melodyLayer1",
      4,
    );
    expect(back[0]?.pitch).toBe(55);
    expect(back[0]?.startBeat).toBe(0.5);
  });
});
