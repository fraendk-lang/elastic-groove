import { describe, it, expect, beforeEach } from "vitest";
import { loadDemoSong } from "./loadDemoSong";
import { DEMO_SONGS } from "./demoSongs";
import { useMelodyLayerStore } from "../store/melodyLayerStore";
import { useMelodyStore } from "../store/melodyStore";
import { useDrumStore } from "../store/drumStore";

describe("loadDemoSong", () => {
  beforeEach(() => {
    useMelodyLayerStore.setState({
      enabled: true,
      layers: useMelodyLayerStore.getState().layers.map((l) => ({
        ...l,
        notes: [{ id: "n1", startBeat: 0, durationBeats: 0.25, pitch: 60 }],
      })),
    });
    useMelodyStore.getState().setStepNoteValue("1/8");
  });

  it("clears melody layers and resets step grid before applying demo", () => {
    loadDemoSong(DEMO_SONGS[0]!, { autoPlay: false });
    expect(useMelodyLayerStore.getState().enabled).toBe(false);
    for (const layer of useMelodyLayerStore.getState().layers) {
      expect(layer.notes).toHaveLength(0);
    }
    expect(useMelodyStore.getState().stepNoteValue).toBe("1/16");
    expect(useDrumStore.getState().bpm).toBe(DEMO_SONGS[0]!.bpm);
  });
});
