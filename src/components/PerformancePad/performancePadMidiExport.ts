import type { StepNote } from "../../store/performancePadStep";
import type { MelodyLayerNote } from "../../store/melodyLayerStore";
import type { BeatMidiNote } from "../../utils/midiExport";
import { padXToMidi, type PadPitchMap } from "./performancePadMelodyLayerSync";

export function stepNotesToBeatMidiNotes(
  stepNotes: (StepNote | null)[],
  stepGridMs: number,
  bpm: number,
  pitchMap: PadPitchMap,
): BeatMidiNote[] {
  const msPerBeat = 60000 / bpm;
  const stepBeats = stepGridMs / msPerBeat;
  const durBeats = Math.max(0.125, stepBeats * 0.92);
  const notes: BeatMidiNote[] = [];

  for (let i = 0; i < stepNotes.length; i++) {
    const sn = stepNotes[i];
    if (!sn) continue;
    notes.push({
      midi: Math.max(0, Math.min(127, padXToMidi(sn.x, pitchMap))),
      startBeat: i * stepBeats,
      durationBeats: durBeats,
      velocity: sn.velocity,
    });
  }
  return notes;
}

export function melodyLayerNotesToBeatMidi(notes: MelodyLayerNote[]): BeatMidiNote[] {
  return notes.map((n) => ({
    midi: n.pitch,
    startBeat: n.startBeat,
    durationBeats: n.durationBeats,
    velocity: 0.85,
  }));
}
