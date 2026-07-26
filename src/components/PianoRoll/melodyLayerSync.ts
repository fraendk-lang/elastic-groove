/**
 * Bidirectional sync: Piano Roll ↔ Melody Layers (polymetric layer windows).
 */
import {
  useMelodyLayerStore,
  type MelodyLayer,
  type MelodyLayerNote,
} from "../../store/melodyLayerStore";
import type { MelodyLayerTrack, PianoRollNote, SoundTarget } from "./types";
import { uid } from "./types";

export const MELODY_LAYER_TRACKS = ["melodyLayer0", "melodyLayer1", "melodyLayer2"] as const;

export function isMelodyLayerTrack(track: SoundTarget): track is MelodyLayerTrack {
  return track === "melodyLayer0" || track === "melodyLayer1" || track === "melodyLayer2";
}

export function melodyLayerTrackIndex(track: MelodyLayerTrack): 0 | 1 | 2 {
  if (track === "melodyLayer1") return 1;
  if (track === "melodyLayer2") return 2;
  return 0;
}

export function melodyLayerTrackForIndex(index: number): MelodyLayerTrack {
  if (index === 1) return "melodyLayer1";
  if (index === 2) return "melodyLayer2";
  return "melodyLayer0";
}

function replaceTrackNotes(
  notes: PianoRollNote[],
  track: SoundTarget,
  trackNotes: PianoRollNote[],
): PianoRollNote[] {
  return [...notes.filter((n) => n.track !== track), ...trackNotes];
}

export function melodyLayerNotesToPianoRoll(
  layer: MelodyLayer,
  layerIndex: number,
): PianoRollNote[] {
  const track = melodyLayerTrackForIndex(layerIndex);
  const windowBeats = layer.barLength * 4;
  return layer.notes.map((n) => ({
    id: n.id,
    midi: n.pitch,
    start: Math.max(0, Math.min(windowBeats - 0.125, n.startBeat)),
    duration: Math.max(0.125, n.durationBeats),
    velocity: 0.8,
    track,
  }));
}

export function pianoRollNotesToMelodyLayerNotes(
  notes: PianoRollNote[],
  track: MelodyLayerTrack,
  barLength: MelodyLayer["barLength"],
): MelodyLayerNote[] {
  const windowBeats = barLength * 4;
  return notes
    .filter((n) => n.track === track)
    .map((n) => ({
      id: n.id.startsWith("n") ? n.id : uid(),
      startBeat: Math.max(0, Math.min(windowBeats - 0.125, n.start)),
      durationBeats: Math.max(0.125, n.duration),
      pitch: Math.max(24, Math.min(127, n.midi)),
    }));
}

export function pullMelodyLayerTrack(layerIndex: 0 | 1 | 2): PianoRollNote[] {
  const layers = useMelodyLayerStore.getState().layers;
  const layer = layers[layerIndex];
  if (!layer) return [];
  return melodyLayerNotesToPianoRoll(layer, layerIndex);
}

/** Replace melody-layer lanes from store; keep other tracks. */
export function pullMelodyLayersToPianoRoll(existingNotes: PianoRollNote[]): PianoRollNote[] {
  const { layers } = useMelodyLayerStore.getState();
  let merged = existingNotes.filter((n) => !isMelodyLayerTrack(n.track));
  layers.forEach((layer, i) => {
    if (i > 2) return;
    merged = replaceTrackNotes(
      merged,
      melodyLayerTrackForIndex(i),
      melodyLayerNotesToPianoRoll(layer, i),
    );
  });
  return merged;
}

export function applyPianoRollTrackToMelodyLayer(
  notes: PianoRollNote[],
  track: MelodyLayerTrack,
): void {
  const index = melodyLayerTrackIndex(track);
  const { layers } = useMelodyLayerStore.getState();
  const layer = layers[index];
  if (!layer) return;
  const layerNotes = pianoRollNotesToMelodyLayerNotes(notes, track, layer.barLength);
  useMelodyLayerStore.setState({
    layers: layers.map((l, i) => (i === index ? { ...l, notes: layerNotes } : l)),
  });
}

/** Push melody-layer lanes from piano roll into melodyLayerStore. */
export function applyPianoRollToMelodyLayers(notes: PianoRollNote[]): void {
  const { layers } = useMelodyLayerStore.getState();
  const updated = layers.map((layer, i) => {
    if (i > 2) return layer;
    const track = melodyLayerTrackForIndex(i);
    return {
      ...layer,
      notes: pianoRollNotesToMelodyLayerNotes(notes, track, layer.barLength),
    };
  });
  useMelodyLayerStore.setState({ layers: updated });
}
