/**
 * Copy demo / sequencer melody steps into Melody Layer L3 (pad slot).
 */
import type { MelodyStep } from "../audio/MelodyEngine";
import {
  melodyStepsToPianoRollNotes,
} from "../components/PianoRoll/sequencerSync";
import {
  pianoRollNotesToMelodyLayerNotes,
} from "../components/PianoRoll/melodyLayerSync";
import { useMelodyLayerStore } from "../store/melodyLayerStore";
import {
  padLayerSynthPatch,
} from "../components/PerformancePad/performancePadMelodyLayerSync";
import { MELODY_PAD_LAYER_INDEX } from "../components/MelodyLayers/layerNotesToStepGrid";
import { MELODY_PAD_PRESET_INDEX } from "../store/melodyStore";
import { melodyLayerTrackForIndex } from "../components/PianoRoll/melodyLayerSync";

function stepsToBarLength(length: number): 1 | 2 | 4 | 8 {
  const bars = Math.max(1, Math.round(length / 16));
  if (bars <= 1) return 1;
  if (bars <= 2) return 2;
  if (bars <= 4) return 4;
  return 8;
}

export function applyMelodyStepsToPadLayer(options: {
  steps: MelodyStep[];
  length: number;
  rootNote: number;
  scaleName: string;
  globalOctave?: number;
  presetIndex?: number;
}): { noteCount: number; barLength: 1 | 2 | 4 | 8 } | null {
  const filled = options.steps.some((s) => s.active);
  if (!filled) return null;

  const barLength = stepsToBarLength(options.length);
  const layerTrack = melodyLayerTrackForIndex(MELODY_PAD_LAYER_INDEX);
  const prNotes = melodyStepsToPianoRollNotes(
    options.steps,
    options.length,
    options.rootNote,
    options.scaleName,
    options.globalOctave ?? 0,
  ).map((n) => ({ ...n, track: layerTrack }));
  const layerNotes = pianoRollNotesToMelodyLayerNotes(
    prNotes,
    layerTrack,
    barLength,
  );
  if (layerNotes.length === 0) return null;

  const layerStore = useMelodyLayerStore.getState();
  let layers = layerStore.layers;
  while (layers.length <= MELODY_PAD_LAYER_INDEX) {
    layerStore.addLayer();
    layers = useMelodyLayerStore.getState().layers;
  }
  const target = layers[MELODY_PAD_LAYER_INDEX]!;
  const presetIndex = options.presetIndex ?? MELODY_PAD_PRESET_INDEX;

  layerStore.setEnabled(true);
  layerStore.updateLayer(target.id, { barLength, muted: false });
  layerStore.replaceNotes(target.id, layerNotes);
  layerStore.setSynth(target.id, {
    presetIndex: presetIndex >= 0 ? presetIndex : MELODY_PAD_PRESET_INDEX,
    ...padLayerSynthPatch(presetIndex >= 0 ? presetIndex : MELODY_PAD_PRESET_INDEX),
  });
  layerStore.setActiveLayer(target.id);

  return { noteCount: layerNotes.length, barLength };
}
