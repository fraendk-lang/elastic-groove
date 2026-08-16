/**
 * Import chord progressions from Elastic Composer (#c= hash or ?from=composer).
 */

import type { ChordsStep } from "../audio/ChordsEngine";
import { DEFAULT_CHORDS_PARAMS, type ChordsParams } from "../audio/ChordsEngine";
import { ROOT_NOTES } from "../audio/BassEngine";

export interface ComposerHandoffChord {
  r: number;
  q: string;
  b: number;
  g?: number;
  t?: number;
}

export interface ComposerHandoffPayload {
  b: number;
  k?: { t: number; m: string };
  p: ComposerHandoffChord[];
}

const MODE_TO_SCALE: Record<string, string> = {
  major: "Major",
  minor: "Minor",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  locrian: "Diminished",
};

const MODE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

const QUALITY_TO_TYPE: Record<string, string> = {
  maj: "Maj",
  m: "Min",
  min: "Min",
  dom7: "7th",
  "7": "7th",
  maj7: "Maj7",
  m7: "Min7",
  min7: "Min7",
  m9: "Min9",
  min9: "Min9",
  dim: "Dim",
  aug: "Aug",
  sus2: "Sus2",
  sus4: "Sus4",
  add9: "Add9",
  dom9: "9th",
  "9": "9th",
  m7b5: "Dim",
  dim7: "Dim",
  dom13: "7th",
  dom7alt: "7th",
  dom7b9: "7th",
  dom7s9: "7th",
  dom7s11: "7th",
  dom7b13: "7th",
  six: "Maj",
  m6: "Min",
  m11: "Min9",
  m13: "Min9",
};

function emptyStep(): ChordsStep {
  return {
    active: false,
    note: 0,
    chordType: "Min",
    octave: 0,
    accent: false,
    velocity: 0.8,
    tie: false,
    gateLength: 1,
  };
}

function rootPcToDegree(rootPc: number, tonicPc: number, mode: string): number {
  const intervals = MODE_INTERVALS[mode] ?? MODE_INTERVALS.major!;
  const scalePcs = intervals.map((iv) => (tonicPc + iv) % 12);
  const idx = scalePcs.indexOf(((rootPc % 12) + 12) % 12);
  return idx >= 0 ? idx : ((rootPc - tonicPc) % 12 + 12) % 12;
}

function mapQuality(q: string): string {
  return QUALITY_TO_TYPE[q] ?? QUALITY_TO_TYPE[q.toLowerCase()] ?? "Maj";
}

export function parseComposerHandoffHash(hash: string): ComposerHandoffPayload | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith("c=")) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw.slice(2))) as ComposerHandoffPayload;
    if (!data?.p?.length) return null;
    return data;
  } catch {
    return null;
  }
}

export function composerHandoffToChordsPattern(payload: ComposerHandoffPayload): {
  steps: ChordsStep[];
  length: number;
  params: ChordsParams;
  rootNote: number;
  rootName: string;
  scaleName: string;
  bpm: number;
} {
  const mode = payload.k?.m ?? "minor";
  const tonicPc = payload.k?.t ?? payload.p[0]?.r ?? 0;
  const scaleName = MODE_TO_SCALE[mode] ?? "Minor";
  const rootNote = 48 + tonicPc;
  const rootName = ROOT_NOTES[tonicPc] ?? "C";

  const steps: ChordsStep[] = Array.from({ length: 256 }, () => emptyStep());
  let stepIdx = 0;

  for (const chord of payload.p) {
    if (stepIdx >= 256) break;
    const beats = chord.t && chord.t > 0 ? chord.t : 4;
    const gateSteps = Math.max(1, Math.min(256 - stepIdx, Math.round(beats * 4)));
    const degree = rootPcToDegree(chord.r, tonicPc, mode);
    const octave = chord.g ? Math.max(-1, Math.min(1, chord.g)) : 0;

    steps[stepIdx] = {
      active: true,
      note: degree,
      chordType: mapQuality(chord.q),
      octave,
      accent: false,
      velocity: 0.72,
      tie: gateSteps > 1,
      gateLength: gateSteps,
    };
    stepIdx += gateSteps;
  }

  const length = Math.max(16, Math.min(256, Math.ceil(stepIdx / 16) * 16));

  return {
    steps,
    length,
    params: { ...DEFAULT_CHORDS_PARAMS },
    rootNote,
    rootName,
    scaleName,
    bpm: Math.min(240, Math.max(40, Math.round(payload.b || 100))),
  };
}

export function loadComposerHandoffFromLocation(): {
  steps: ChordsStep[];
  length: number;
  params: ChordsParams;
  rootNote: number;
  rootName: string;
  scaleName: string;
  bpm: number;
} | null {
  const payload = parseComposerHandoffHash(window.location.hash);
  if (!payload) return null;
  return composerHandoffToChordsPattern(payload);
}

/** Clear #c= after import so refresh does not re-apply. */
export function clearComposerHandoffHash(): void {
  if (!window.location.hash.startsWith("#c=")) return;
  const params = new URLSearchParams(window.location.search);
  const qs = params.toString();
  history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
}
