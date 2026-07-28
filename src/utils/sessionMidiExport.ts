/**
 * Export full session (drums + bass + chords + melody + melody layers) as MIDI.
 */
import type { PatternData } from "../store/drumStore";
import type { PianoRollNote } from "../components/PianoRoll/types";
import { pullSequencersToPianoRoll } from "../components/PianoRoll/sequencerSync";
import { pullMelodyLayersToPianoRoll } from "../components/PianoRoll/melodyLayerSync";
import { patternToMidi } from "./midiExport";

export function buildSessionPianoRollNotes(): PianoRollNote[] {
  let notes = pullSequencersToPianoRoll([]);
  notes = pullMelodyLayersToPianoRoll(notes);
  return notes;
}

export function downloadSessionMidi(
  pattern: PatternData,
  bpm: number,
  fileName = "elastic-groove-session",
): void {
  const notes = buildSessionPianoRollNotes();
  const midi = patternToMidi(pattern, bpm, notes);
  const blob = new Blob([midi.buffer as ArrayBuffer], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const a = document.createElement("a");
  a.href = url;
  a.download = safe.endsWith(".mid") ? safe : `${safe}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}
