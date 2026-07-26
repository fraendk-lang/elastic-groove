/**
 * Orchestrates pull/push across all MIDI surfaces wired to the Piano Roll.
 */
import { applyPianoRollToDrums, pullDrumsToPianoRoll } from "./drumSync";
import {
  applyPianoRollToMelodyLayers,
  applyPianoRollTrackToMelodyLayer,
  isMelodyLayerTrack,
  melodyLayerTrackIndex,
  MELODY_LAYER_TRACKS,
  pullMelodyLayerTrack,
  pullMelodyLayersToPianoRoll,
} from "./melodyLayerSync";
import {
  applyPianoRollToSequencers,
  applyPianoRollTrackToSequencer,
  isSequencerTrack,
  pullSequencersToPianoRoll,
  pullTrackFromSequencer,
} from "./sequencerSync";
import type { PianoRollNote, SoundTarget } from "./types";

export function isMidiSyncTarget(track: SoundTarget): boolean {
  return isSequencerTrack(track) || track === "drums" || isMelodyLayerTrack(track);
}

/** Pull bass/chords/melody step seq + melody layers + drums into piano roll. */
export function pullAllToPianoRoll(existingNotes: PianoRollNote[]): PianoRollNote[] {
  const preserved = existingNotes.filter(
    (n) => n.track !== "drums" && !isMelodyLayerTrack(n.track),
  );
  let merged = pullSequencersToPianoRoll(preserved.filter((n) => n.track !== "drums"));
  merged = pullMelodyLayersToPianoRoll(merged);
  merged = pullDrumsToPianoRoll(merged);
  return merged;
}

/** Push all piano-roll lanes back to their source stores. */
export function applyAllFromPianoRoll(notes: PianoRollNote[]): void {
  applyPianoRollToSequencers(notes);
  applyPianoRollToMelodyLayers(notes);
  applyPianoRollToDrums(notes);
}

export function applyPianoRollTrack(notes: PianoRollNote[], track: SoundTarget): void {
  if (isSequencerTrack(track)) {
    applyPianoRollTrackToSequencer(notes, track);
    return;
  }
  if (isMelodyLayerTrack(track)) {
    applyPianoRollTrackToMelodyLayer(notes, track);
    return;
  }
  if (track === "drums") {
    applyPianoRollToDrums(notes);
  }
}

export function pullTrackToPianoRoll(track: SoundTarget): PianoRollNote[] {
  if (isSequencerTrack(track)) return pullTrackFromSequencer(track);
  if (isMelodyLayerTrack(track)) return pullMelodyLayerTrack(melodyLayerTrackIndex(track));
  if (track === "drums") {
    return pullDrumsToPianoRoll([]).filter((n) => n.track === "drums");
  }
  return [];
}

export { MELODY_LAYER_TRACKS };
