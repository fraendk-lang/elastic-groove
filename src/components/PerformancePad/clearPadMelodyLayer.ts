/**
 * Clear Melody Layer L3 (pad slot) and optionally the Performance Pad step grid.
 */
import { useMelodyLayerStore } from "../../store/melodyLayerStore";
import { usePerformancePadStore } from "../../store/performancePadStore";
import { panicAllMelodyEngines } from "../../utils/stopMelodyPlayback";
import { MELODY_PAD_LAYER_INDEX } from "../MelodyLayers/layerNotesToStepGrid";

export function clearL3PadPattern(clearPadSteps = true): boolean {
  const layerStore = useMelodyLayerStore.getState();
  const l3 = layerStore.layers[MELODY_PAD_LAYER_INDEX];
  let cleared = false;
  if (l3 && l3.notes.length > 0) {
    layerStore.clearNotes(l3.id);
    cleared = true;
  }
  if (clearPadSteps) {
    const pad = usePerformancePadStore.getState();
    if (pad.stepNotes.some((n) => n !== null)) {
      pad.clearStepPattern();
      cleared = true;
    } else if (pad.stepNotes.length > 0) {
      pad.clearStepPattern();
    }
  }

  panicAllMelodyEngines();
  usePerformancePadStore.getState().stopLoop();

  const after = useMelodyLayerStore.getState();
  const anyNotesLeft = after.layers.some((l) => l.notes.length > 0);
  if (!anyNotesLeft) {
    after.setEnabled(false);
  }

  return cleared;
}
