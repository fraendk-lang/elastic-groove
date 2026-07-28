import type { MelodyLayerNote } from "../../store/melodyLayerStore";

/** Melody layer slot used for Performance Pad step export (L3). */
export const MELODY_PAD_LAYER_INDEX = 2;

/** Build a 16th-note grid from layer notes for mini step-lane UI. Value = MIDI pitch or null. */
export function layerNotesToStepGrid(
  notes: MelodyLayerNote[],
  barLength: 1 | 2 | 4 | 8,
): (number | null)[] {
  const steps = barLength * 16;
  const grid: (number | null)[] = new Array(steps).fill(null);
  for (const n of notes) {
    if (n.startBeat < 0) continue;
    const idx = Math.round(n.startBeat * 4) % steps;
    if (idx >= 0 && idx < steps) grid[idx] = n.pitch;
  }
  return grid;
}

/** Normalise pitch 48–84 → 0–1 for step cell height. */
export function pitchToStepHeight(pitch: number): number {
  return Math.max(0.15, Math.min(1, (pitch - 48) / 36));
}
