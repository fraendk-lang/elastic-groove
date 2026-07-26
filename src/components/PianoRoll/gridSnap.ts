/**
 * Grid snap helpers — hard / soft / off, straight / triplet / dotted divisions.
 */

export type SnapMode = "hard" | "soft" | "off";

export interface GridPreset {
  label: string;
  beats: number;
  group: "straight" | "triplet" | "dotted";
}

/** Beat duration per grid option (in quarter-note beats). */
export const GRID_PRESETS: GridPreset[] = [
  { label: "1/32", beats: 0.125, group: "straight" },
  { label: "1/16", beats: 0.25, group: "straight" },
  { label: "1/8", beats: 0.5, group: "straight" },
  { label: "1/4", beats: 1, group: "straight" },
  { label: "1/16T", beats: 0.25 / 3, group: "triplet" },
  { label: "1/8T", beats: 0.5 / 3, group: "triplet" },
  { label: "1/4T", beats: 1 / 3, group: "triplet" },
  { label: "1/16D", beats: 0.375, group: "dotted" },
  { label: "1/8D", beats: 0.75, group: "dotted" },
  { label: "1/4D", beats: 1.5, group: "dotted" },
];

const PRESET_BY_BEATS = new Map(
  GRID_PRESETS.map((p) => [p.beats.toFixed(6), p]),
);

/** Snap a beat position to the grid. Soft = magnetic within ~22% of a cell. */
export function snapBeatValue(beat: number, gridRes: number, mode: SnapMode): number {
  if (mode === "off" || gridRes <= 0) return beat;
  const nearest = Math.round(beat / gridRes) * gridRes;
  if (mode === "hard") return Math.max(0, nearest);
  const dist = Math.abs(beat - nearest);
  return dist <= gridRes * 0.22 ? Math.max(0, nearest) : beat;
}

/** Quantize always uses hard snap regardless of soft/off mode. */
export function quantizeBeat(beat: number, gridRes: number): number {
  if (gridRes <= 0) return beat;
  return Math.max(0, Math.round(beat / gridRes) * gridRes);
}

export function formatGridLabel(gridRes: number): string {
  return PRESET_BY_BEATS.get(gridRes.toFixed(6))?.label ?? gridRes.toFixed(3);
}

export function cycleSnapMode(mode: SnapMode): SnapMode {
  if (mode === "hard") return "soft";
  if (mode === "soft") return "off";
  return "hard";
}

export function snapModeLabel(mode: SnapMode): string {
  if (mode === "hard") return "HARD";
  if (mode === "soft") return "SOFT";
  return "OFF";
}

export function gridLineResolution(gridRes: number): number {
  return Math.min(0.125, gridRes);
}
