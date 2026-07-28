/**
 * Export Performance Pad step patterns into Melody Layers (L3 = pad slot).
 * Keeps step-sequenced melodies playing via melodyLayerScheduler after the pad closes.
 */
import { SCALES } from "../../audio/BassEngine";
import type { StepNote } from "../../store/performancePadStep";
import type { MelodyLayerNote } from "../../store/melodyLayerStore";
import type { LayerSynth } from "../../store/melodyLayerStore";
import { useMelodyLayerStore } from "../../store/melodyLayerStore";
import { usePerformancePadStore } from "../../store/performancePadStore";
import {
  MELODY_PAD_PRESET_INDEX,
  MELODY_PAD_BELLS_PRESET_INDEX,
  MELODY_PAD_PLUCK_PRESET_INDEX,
  MELODY_PAD_SYNTH_PRESET_INDEX,
  MELODY_PAD_DEEP_PRESET_INDEX,
} from "../../store/melodyStore";
import { MELODY_PAD_LAYER_INDEX } from "../MelodyLayers/layerNotesToStepGrid";

export interface PadPitchMap {
  scaleName: string;
  rootNote: number;
  scaleLowestOct: number;
  scaleOctaves: number;
  gridSnap: boolean;
}

/** Same pitch mapping as PerformancePad xToMidi — shared for export/tests. */
export function padXToMidi(x: number, map: PadPitchMap): number {
  const scale = SCALES[map.scaleName] ?? SCALES["Chromatic"]!;
  const baseMidi = map.rootNote + map.scaleLowestOct * 12;
  if (map.gridSnap) {
    const totalSteps = scale.length * map.scaleOctaves;
    const stepIdx = Math.floor(x * totalSteps);
    const clamped = Math.max(0, Math.min(totalSteps - 1, stepIdx));
    const octave = Math.floor(clamped / scale.length);
    const degree = clamped % scale.length;
    return baseMidi + octave * 12 + (scale[degree] ?? 0);
  }
  return Math.round(baseMidi + x * map.scaleOctaves * 12);
}

export function loopBarsToBarLength(
  loopBars: 0 | 1 | 2 | 4 | 8,
  loopDurationMs: number,
  bpm: number,
): 1 | 2 | 4 | 8 {
  if (loopBars === 1) return 1;
  if (loopBars === 2) return 2;
  if (loopBars === 4) return 4;
  if (loopBars === 8) return 8;
  const msPerBar = (60000 / bpm) * 4;
  const bars = Math.max(1, Math.round(loopDurationMs / msPerBar));
  if (bars <= 1) return 1;
  if (bars <= 2) return 2;
  if (bars <= 4) return 4;
  return 8;
}

export function stepNotesToMelodyLayerNotes(
  stepNotes: (StepNote | null)[],
  stepGridMs: number,
  bpm: number,
  xToMidi: (x: number) => number,
  totalBeats: number,
): MelodyLayerNote[] {
  const msPerBeat = 60000 / bpm;
  const stepBeats = stepGridMs / msPerBeat;
  const durBeats = Math.max(0.125, stepBeats * 0.92);
  const notes: MelodyLayerNote[] = [];

  for (let i = 0; i < stepNotes.length; i++) {
    const sn = stepNotes[i];
    if (!sn) continue;
    const startBeat = i * stepBeats;
    if (startBeat >= totalBeats) continue;
    notes.push({
      id: crypto.randomUUID(),
      startBeat,
      durationBeats: Math.min(durBeats, totalBeats - startBeat),
      pitch: Math.max(48, Math.min(84, xToMidi(sn.x))),
    });
  }
  return notes;
}

/** Layer synth sends tuned per pad sound preset. */
export function padLayerSynthPatch(presetIndex: number): Partial<LayerSynth> {
  if (presetIndex === MELODY_PAD_BELLS_PRESET_INDEX) {
    return { reverbSend: 0.36, delaySend: 0.16, cutoff: 0.62, envMod: 0.35, release: 220, volume: 0.72 };
  }
  if (presetIndex === MELODY_PAD_PLUCK_PRESET_INDEX) {
    return { reverbSend: 0.16, delaySend: 0.08, cutoff: 0.65, envMod: 0.40, release: 120, volume: 0.70 };
  }
  if (presetIndex === MELODY_PAD_SYNTH_PRESET_INDEX) {
    return { reverbSend: 0.24, delaySend: 0.14, cutoff: 0.56, envMod: 0.50, release: 180, volume: 0.74 };
  }
  if (presetIndex === MELODY_PAD_DEEP_PRESET_INDEX) {
    return { reverbSend: 0.32, delaySend: 0.10, cutoff: 0.48, envMod: 0.42, release: 240, volume: 0.76 };
  }
  return { reverbSend: 0.28, delaySend: 0.12, cutoff: 0.58, envMod: 0.48, release: 160, volume: 0.74 };
}

export interface ApplyStepToMelodyLayerOptions {
  stepNotes: (StepNote | null)[];
  stepGridMs: number;
  loopDurationMs: number;
  loopBars: 0 | 1 | 2 | 4 | 8;
  bpm: number;
  pitchMap: PadPitchMap;
  presetIndex: number;
  /** Stop Performance Pad loop to avoid double playback. Default true. */
  stopPadLoop?: boolean;
}

export interface ApplyStepToMelodyLayerResult {
  layerIndex: number;
  noteCount: number;
  barLength: 1 | 2 | 4 | 8;
}

/** Push step pattern to Melody Layer L3 (pad slot), enable layers, copy preset. */
export function applyStepPatternToMelodyLayer(
  options: ApplyStepToMelodyLayerOptions,
): ApplyStepToMelodyLayerResult | null {
  const filled = options.stepNotes.some((n) => n !== null);
  if (!filled || options.bpm <= 0) return null;

  const xToMidi = (x: number) => padXToMidi(x, options.pitchMap);
  const barLength = loopBarsToBarLength(options.loopBars, options.loopDurationMs, options.bpm);
  const totalBeats = barLength * 4;
  const notes = stepNotesToMelodyLayerNotes(
    options.stepNotes,
    options.stepGridMs,
    options.bpm,
    xToMidi,
    totalBeats,
  );
  if (notes.length === 0) return null;

  const layerStore = useMelodyLayerStore.getState();
  let layers = layerStore.layers;
  while (layers.length <= MELODY_PAD_LAYER_INDEX) {
    layerStore.addLayer();
    layers = useMelodyLayerStore.getState().layers;
  }
  const targetLayer = layers[MELODY_PAD_LAYER_INDEX]!;

  if (options.stopPadLoop !== false) {
    usePerformancePadStore.getState().stopLoop();
  }

  layerStore.setEnabled(true);
  layerStore.updateLayer(targetLayer.id, { barLength, muted: false });
  layerStore.replaceNotes(targetLayer.id, notes);
  const padPreset = options.presetIndex >= 0 ? options.presetIndex : MELODY_PAD_PRESET_INDEX;
  layerStore.setSynth(targetLayer.id, {
    presetIndex: padPreset >= 0 ? padPreset : MELODY_PAD_PRESET_INDEX,
    ...padLayerSynthPatch(padPreset),
  });
  layerStore.setActiveLayer(targetLayer.id);

  return { layerIndex: MELODY_PAD_LAYER_INDEX, noteCount: notes.length, barLength };
}
