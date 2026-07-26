/**
 * Bidirectional sync: Piano Roll notes ↔ Bass / Chords / Melody step sequencers.
 */
import { scaleNote, SCALES, type BassStep } from "../../audio/BassEngine";
import { CHORD_TYPES, type ChordsStep } from "../../audio/ChordsEngine";
import type { MelodyStep } from "../../audio/MelodyEngine";
import { useBassStore } from "../../store/bassStore";
import { useChordsStore } from "../../store/chordsStore";
import { useMelodyStore } from "../../store/melodyStore";
import type { PianoRollNote, SoundTarget } from "./types";
import { uid } from "./types";

const SYNC_TRACKS = ["bass", "chords", "melody"] as const;
type SequencerTrack = typeof SYNC_TRACKS[number];

export function isSequencerTrack(track: SoundTarget): track is "bass" | "chords" | "melody" {
  return track === "bass" || track === "chords" || track === "melody";
}

/** Inverse of scaleNote — finds degree/octave that reproduces the given MIDI pitch. */
export function midiToScaleDegree(
  rootMidi: number,
  scaleName: string,
  midi: number,
  globalOctave = 0,
): { degree: number; octave: number } {
  const scale = SCALES[scaleName] ?? SCALES["Chromatic"]!;
  for (let degree = -scale.length * 6; degree < scale.length * 10; degree++) {
    for (let oct = -2; oct <= 2; oct++) {
      if (scaleNote(rootMidi, scaleName, degree, oct + globalOctave) === midi) {
        return { degree, octave: oct };
      }
    }
  }
  return { degree: midi - rootMidi, octave: 0 };
}

function emptyBassStep(): BassStep {
  return { active: false, note: 0, octave: 0, accent: false, slide: false, tie: false };
}

function emptyMelodyStep(): MelodyStep {
  return { active: false, note: 0, octave: 0, accent: false, slide: false, tie: false };
}

function emptyChordsStep(): ChordsStep {
  return { active: false, note: 0, chordType: "min7", octave: 0, accent: false, tie: false };
}

function replaceTrackNotes(
  notes: PianoRollNote[],
  track: SoundTarget,
  trackNotes: PianoRollNote[],
): PianoRollNote[] {
  return [...notes.filter((n) => n.track !== track), ...trackNotes];
}

function requiredStepCount(notes: PianoRollNote[], track: SoundTarget, minLength: number): number {
  const trackNotes = notes.filter((n) => n.track === track);
  if (trackNotes.length === 0) return minLength;
  const maxStep = trackNotes.reduce(
    (m, n) => Math.max(m, Math.ceil((n.start + n.duration) * 4)),
    0,
  );
  return Math.max(minLength, Math.ceil(maxStep / 16) * 16, 16);
}

// ─── Steps → Piano Roll ─────────────────────────────────────────────────────

export function bassStepsToPianoRollNotes(
  steps: BassStep[],
  length: number,
  rootNote: number,
  scaleName: string,
  globalOctave: number,
): PianoRollNote[] {
  const notes: PianoRollNote[] = [];
  const limit = Math.min(steps.length, length);
  for (let i = 0; i < limit; i++) {
    const step = steps[i]!;
    if (!step.active) continue;
    notes.push({
      id: uid(),
      midi: scaleNote(rootNote, scaleName, step.note, step.octave + globalOctave),
      start: i / 4,
      duration: (step.gateLength ?? 1) / 4,
      velocity: step.velocity ?? (step.accent ? 1 : 0.7),
      track: "bass",
    });
  }
  return notes;
}

export function melodyStepsToPianoRollNotes(
  steps: MelodyStep[],
  length: number,
  rootNote: number,
  scaleName: string,
  globalOctave: number,
): PianoRollNote[] {
  const notes: PianoRollNote[] = [];
  const limit = Math.min(steps.length, length);
  for (let i = 0; i < limit; i++) {
    const step = steps[i]!;
    if (!step.active) continue;
    notes.push({
      id: uid(),
      midi: scaleNote(rootNote, scaleName, step.note, step.octave + globalOctave),
      start: i / 4,
      duration: (step.gateLength ?? 1) / 4,
      velocity: step.velocity ?? (step.accent ? 1 : 0.7),
      track: "melody",
    });
  }
  return notes;
}

export function chordsStepsToPianoRollNotes(
  steps: ChordsStep[],
  length: number,
  rootNote: number,
  scaleName: string,
  globalOctave: number,
): PianoRollNote[] {
  const notes: PianoRollNote[] = [];
  const limit = Math.min(steps.length, length);
  for (let i = 0; i < limit; i++) {
    const step = steps[i]!;
    if (!step.active) continue;
    const rootMidi = scaleNote(rootNote, scaleName, step.note, step.octave + globalOctave);
    const intervals = CHORD_TYPES[step.chordType] ?? CHORD_TYPES["min7"] ?? [0, 3, 7];
    const beat = i / 4;
    const duration = (step.gateLength ?? 1) / 4;
    const velocity = step.velocity ?? (step.accent ? 1 : 0.7);
    for (const interval of intervals) {
      notes.push({
        id: uid(),
        midi: rootMidi + interval,
        start: beat,
        duration,
        velocity,
        track: "chords",
      });
    }
  }
  return notes;
}

export function pullTrackFromSequencer(track: "bass" | "chords" | "melody"): PianoRollNote[] {
  if (track === "bass") {
    const s = useBassStore.getState();
    return bassStepsToPianoRollNotes(s.steps, s.length, s.rootNote, s.scaleName, s.globalOctave);
  }
  if (track === "chords") {
    const s = useChordsStore.getState();
    return chordsStepsToPianoRollNotes(s.steps, s.length, s.rootNote, s.scaleName, s.globalOctave);
  }
  const s = useMelodyStore.getState();
  return melodyStepsToPianoRollNotes(s.steps, s.length, s.rootNote, s.scaleName, s.globalOctave);
}

/** Replace bass/chords/melody lanes from live step sequencers; keep drums + other tracks. */
export function pullSequencersToPianoRoll(existingNotes: PianoRollNote[]): PianoRollNote[] {
  let merged = existingNotes.filter((n) => n.track === "drums");
  for (const track of SYNC_TRACKS) {
    merged = replaceTrackNotes(merged, track, pullTrackFromSequencer(track));
  }
  return merged;
}

// ─── Piano Roll → Steps ─────────────────────────────────────────────────────

export function pianoRollNotesToBassSteps(
  notes: PianoRollNote[],
  stepCount: number,
  rootNote: number,
  scaleName: string,
  globalOctave: number,
): BassStep[] {
  const grid: BassStep[] = Array.from({ length: stepCount }, () => emptyBassStep());
  for (const n of notes.filter((note) => note.track === "bass")) {
    const i = Math.round(n.start * 4);
    if (i < 0 || i >= stepCount) continue;
    const { degree, octave } = midiToScaleDegree(rootNote, scaleName, n.midi, globalOctave);
    const gl = Math.max(1, Math.round(n.duration * 4));
    grid[i] = {
      active: true,
      note: degree,
      octave,
      accent: n.velocity > 0.85,
      velocity: n.velocity,
      slide: false,
      tie: gl > 1,
      gateLength: gl,
    };
  }
  return grid;
}

export function pianoRollNotesToMelodySteps(
  notes: PianoRollNote[],
  stepCount: number,
  rootNote: number,
  scaleName: string,
  globalOctave: number,
): MelodyStep[] {
  const grid: MelodyStep[] = Array.from({ length: stepCount }, () => emptyMelodyStep());
  for (const n of notes.filter((note) => note.track === "melody")) {
    const i = Math.round(n.start * 4);
    if (i < 0 || i >= stepCount) continue;
    const { degree, octave } = midiToScaleDegree(rootNote, scaleName, n.midi, globalOctave);
    const gl = Math.max(1, Math.round(n.duration * 4));
    grid[i] = {
      active: true,
      note: degree,
      octave,
      accent: n.velocity > 0.85,
      velocity: n.velocity,
      slide: false,
      tie: gl > 1,
      gateLength: gl,
    };
  }
  return grid;
}

export function pianoRollNotesToChordsSteps(
  notes: PianoRollNote[],
  stepCount: number,
  rootNote: number,
  scaleName: string,
  globalOctave: number,
): ChordsStep[] {
  const grid: ChordsStep[] = Array.from({ length: stepCount }, () => emptyChordsStep());
  const groups = new Map<number, PianoRollNote[]>();
  for (const n of notes.filter((note) => note.track === "chords")) {
    const i = Math.round(n.start * 4);
    if (i < 0 || i >= stepCount) continue;
    if (!groups.has(i)) groups.set(i, []);
    groups.get(i)!.push(n);
  }
  for (const [i, stepNotes] of groups) {
    const root = [...stepNotes].sort((a, b) => a.midi - b.midi)[0]!;
    const { degree, octave } = midiToScaleDegree(rootNote, scaleName, root.midi, globalOctave);
    const gl = Math.max(1, Math.round(root.duration * 4));
    grid[i] = {
      active: true,
      note: degree,
      chordType: root.velocity > 0.85 ? "maj7" : "min7",
      octave,
      accent: root.velocity > 0.85,
      velocity: root.velocity,
      tie: gl > 1,
      gateLength: gl,
    };
  }
  return grid;
}

export function applyPianoRollTrackToSequencer(notes: PianoRollNote[], track: "bass" | "chords" | "melody"): void {
  if (track === "bass") {
    const s = useBassStore.getState();
    const stepCount = requiredStepCount(notes, "bass", s.length);
    useBassStore.setState({
      steps: pianoRollNotesToBassSteps(notes, stepCount, s.rootNote, s.scaleName, s.globalOctave),
      length: Math.max(s.length, stepCount),
    });
    return;
  }
  if (track === "chords") {
    const s = useChordsStore.getState();
    const stepCount = requiredStepCount(notes, "chords", s.length);
    useChordsStore.setState({
      steps: pianoRollNotesToChordsSteps(notes, stepCount, s.rootNote, s.scaleName, s.globalOctave),
      length: Math.max(s.length, stepCount),
    });
    return;
  }
  const s = useMelodyStore.getState();
  const stepCount = requiredStepCount(notes, "melody", s.length);
  useMelodyStore.setState({
    steps: pianoRollNotesToMelodySteps(notes, stepCount, s.rootNote, s.scaleName, s.globalOctave),
    length: Math.max(s.length, stepCount),
  });
}

/** Push piano-roll lanes into their step sequencers (playback source). */
export function applyPianoRollToSequencers(
  notes: PianoRollNote[],
  tracks: SequencerTrack[] = [...SYNC_TRACKS],
): SequencerTrack[] {
  for (const track of tracks) {
    applyPianoRollTrackToSequencer(notes, track);
  }
  return tracks;
}
