/**
 * Bidirectional sync: Piano Roll drums lane ↔ 12-track step sequencer pattern.
 *
 * Voice mapping: MIDI 36–47 → drum voices 0–11 (matches scheduler.ts).
 */
import { useDrumStore, type PatternData, type StepData } from "../../store/drumStore";
import type { PianoRollNote } from "./types";
import { uid } from "./types";

export const DRUM_MIDI_BASE = 36;
export const DRUM_VOICE_COUNT = 12;

function emptyStep(): StepData {
  return {
    active: false,
    velocity: 100,
    microTiming: 0,
    probability: 100,
    ratchetCount: 1,
    condition: "always",
    gateLength: 1,
    paramLocks: {},
  };
}

function replaceTrackNotes(
  notes: PianoRollNote[],
  track: "drums",
  trackNotes: PianoRollNote[],
): PianoRollNote[] {
  return [...notes.filter((n) => n.track !== track), ...trackNotes];
}

function requiredStepCount(notes: PianoRollNote[], minLength: number): number {
  const drumNotes = notes.filter((n) => n.track === "drums");
  if (drumNotes.length === 0) return minLength;
  const maxStep = drumNotes.reduce(
    (m, n) => Math.max(m, Math.ceil((n.start + n.duration) * 4)),
    0,
  );
  return Math.max(minLength, Math.ceil(maxStep / 16) * 16, 16);
}

export function drumPatternToPianoRollNotes(pattern: PatternData): PianoRollNote[] {
  const notes: PianoRollNote[] = [];
  for (let voice = 0; voice < DRUM_VOICE_COUNT; voice++) {
    const trackData = pattern.tracks[voice];
    if (!trackData) continue;
    const limit = Math.min(trackData.steps.length, trackData.length);
    for (let i = 0; i < limit; i++) {
      const step = trackData.steps[i]!;
      if (!step.active) continue;
      notes.push({
        id: uid(),
        midi: DRUM_MIDI_BASE + voice,
        start: i / 4,
        duration: Math.max(0.25, step.gateLength / 4),
        velocity: step.velocity / 127,
        track: "drums",
      });
    }
  }
  return notes;
}

export function pianoRollNotesToDrumPattern(
  notes: PianoRollNote[],
  pattern: PatternData,
): PatternData {
  const drumNotes = notes.filter((n) => n.track === "drums");
  const stepCount = requiredStepCount(drumNotes, pattern.length);
  const tracks = pattern.tracks.map((trackData, voice) => {
    const steps = trackData.steps.map((s) => ({ ...s, active: false }));
    while (steps.length < stepCount) steps.push(emptyStep());

    for (const n of drumNotes) {
      const v = n.midi - DRUM_MIDI_BASE;
      if (v !== voice || v < 0 || v >= DRUM_VOICE_COUNT) continue;
      const i = Math.round(n.start * 4);
      if (i < 0 || i >= stepCount) continue;
      steps[i] = {
        ...steps[i]!,
        active: true,
        velocity: Math.max(1, Math.min(127, Math.round(n.velocity * 127))),
        gateLength: Math.max(1, Math.round(n.duration * 4)),
      };
    }

    return {
      ...trackData,
      steps,
      length: Math.max(trackData.length, stepCount),
    };
  });

  return { ...pattern, tracks, length: Math.max(pattern.length, stepCount) };
}

export function pullDrumsToPianoRoll(existingNotes: PianoRollNote[]): PianoRollNote[] {
  const pattern = useDrumStore.getState().pattern;
  return replaceTrackNotes(existingNotes, "drums", drumPatternToPianoRollNotes(pattern));
}

export function applyPianoRollToDrums(notes: PianoRollNote[]): void {
  const { pattern } = useDrumStore.getState();
  useDrumStore.setState({
    pattern: pianoRollNotesToDrumPattern(notes, pattern),
  });
}
