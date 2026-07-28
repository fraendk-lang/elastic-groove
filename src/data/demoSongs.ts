/**
 * Demo Songs — curated genre starter projects.
 *
 * Each demo is a complete loop: kit + drums + bass + chords + melody hook.
 * Patterns are intentionally musical (syncopation, ghost notes, lead motifs)
 * so first-time users hear something worth keeping, not a placeholder sketch.
 */

import type { BassStep } from "../audio/BassEngine";
import type { ChordsStep } from "../audio/ChordsEngine";
import type { MelodyStep } from "../audio/MelodyEngine";
import type { DrumKit } from "../kits/KitManager";
import {
  MELODY_PAD_BELLS_PRESET_INDEX,
  MELODY_PAD_DEEP_PRESET_INDEX,
  MELODY_PAD_PLUCK_PRESET_INDEX,
  MELODY_PAD_SYNTH_PRESET_INDEX,
} from "../store/melodyStore";

export interface DemoSong {
  id: string;
  name: string;
  genre: string;
  description: string;
  bpm: number;
  swing?: number;

  kitId: string;
  bassPresetName: string | null;
  chordsPresetName: string | null;
  melodyPresetName?: string | null;
  /** Preset index for Melody Layer L3 / Performance Pad sound. */
  melodyPadPresetIndex?: number;

  rootName: string;
  scaleName: string;

  bassSteps?: BassStep[];
  bassLength?: number;
  chordsSteps?: ChordsStep[];
  chordsLength?: number;
  melodySteps?: MelodyStep[];
  melodyLength?: number;

  /** Used when the kit has no built-in pattern (e.g. DnB Liquid, Ambient Organic). */
  drumPattern?: DrumKit["pattern"];

  faderOverrides?: Record<number, number>;
}

export const NOTE_CLASS: Record<string, number> = {
  "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
  "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8,
  "A": 9, "A#": 10, "Bb": 10, "B": 11,
};

// ─── Step builders ───────────────────────────────────────────────────────────

const X = (): BassStep => ({ active: false, note: 0, octave: 0, accent: false, slide: false, tie: false });
const B = (note: number, opts: Partial<BassStep> = {}): BassStep => ({
  active: true, note, octave: 0, accent: false, slide: false, tie: false, ...opts,
});

const XC = (): ChordsStep => ({ active: false, note: 0, chordType: "Min", octave: 0, accent: false, tie: false });
const C = (note: number, type: string, opts: Partial<ChordsStep> = {}): ChordsStep => ({
  active: true, note, chordType: type, octave: 0, accent: false, tie: false, ...opts,
});

const M = (): MelodyStep => ({ active: false, note: 0, octave: 0, accent: false, slide: false, tie: false });
const N = (note: number, opts: Partial<MelodyStep> = {}): MelodyStep => ({
  active: true, note, octave: 0, accent: false, slide: false, tie: false, ...opts,
});

type MelCell = MelodyStep | null;
const melBar = (cells: MelCell[]): MelodyStep[] => cells.map((c) => c ?? M());

const concat = <T,>(bars: T[][]): T[] => bars.flat();

function padBar(deg: number, type: string, hits: number[], vel = 0.62): ChordsStep[] {
  const bar = Array.from({ length: 16 }, () => XC());
  for (const step of hits) {
    bar[step] = C(deg, type, { velocity: vel, tie: step === hits[0] });
  }
  return bar;
}

// ─── 1. VELVET STAIRS — Lo-Fi Hip Hop in C minor ─────────────────────────────
// i – VI – III – V  (Cm – Ab – Eb – G)

const velvetStairs: DemoSong = {
  id: "velvet-stairs",
  name: "Velvet Stairs",
  genre: "Lo-Fi Hip Hop",
  description: "Dusty shuffle, jazzy Rhodes voicings and a mellow piano hook",
  bpm: 78,
  swing: 60,
  kitId: "lofi-tape",
  bassPresetName: "Lo-Fi Tape Sub",
  chordsPresetName: "Lo-Fi Velvet",
  melodyPresetName: "★ Piano Keys",
  melodyPadPresetIndex: MELODY_PAD_DEEP_PRESET_INDEX,
  rootName: "C",
  scaleName: "Minor",
  chordsSteps: concat([
    padBar(0, "Min7", [0, 10], 0.58),
    padBar(5, "Maj7", [0, 10], 0.52),
    padBar(2, "Maj7", [0, 10], 0.55),
    padBar(4, "Min7", [0, 10], 0.54),
  ]),
  chordsLength: 64,
  bassSteps: concat([
    (() => { const b = Array(16).fill(null).map(X); b[0] = B(0, { octave: -1, accent: true, velocity: 0.9 }); b[3] = B(0, { octave: -1, velocity: 0.38 }); b[7] = B(0, { octave: -1, velocity: 0.52 }); b[10] = B(0, { octave: -1, velocity: 0.48, slide: true }); b[13] = B(0, { octave: -1, velocity: 0.42 }); return b; })(),
    (() => { const b = Array(16).fill(null).map(X); b[0] = B(5, { octave: -1, accent: true, velocity: 0.88 }); b[6] = B(5, { octave: -1, velocity: 0.45 }); b[9] = B(3, { octave: -1, velocity: 0.5, slide: true }); b[12] = B(5, { octave: -1, velocity: 0.55 }); return b; })(),
    (() => { const b = Array(16).fill(null).map(X); b[0] = B(2, { octave: -1, accent: true, velocity: 0.9 }); b[4] = B(2, { octave: -1, velocity: 0.4 }); b[8] = B(2, { octave: -1, velocity: 0.55 }); b[11] = B(0, { octave: -1, velocity: 0.48, slide: true }); return b; })(),
    (() => { const b = Array(16).fill(null).map(X); b[0] = B(4, { octave: -1, accent: true, velocity: 0.86 }); b[5] = B(4, { octave: -1, velocity: 0.44 }); b[10] = B(2, { octave: -1, velocity: 0.5 }); b[14] = B(0, { octave: -1, velocity: 0.46, slide: true }); return b; })(),
  ]),
  bassLength: 64,
  melodySteps: concat([
    melBar([N(3, { octave: 1, velocity: 0.68 }), null, N(2, { octave: 1, velocity: 0.52 }), null, N(0, { octave: 1, velocity: 0.62 }), null, N(2, { octave: 1, velocity: 0.48 }), null, N(3, { octave: 1, velocity: 0.58 }), null, N(5, { octave: 1, velocity: 0.5 }), null, N(3, { octave: 1, velocity: 0.46 }), null, N(2, { octave: 1, velocity: 0.44 }), null]),
    melBar([N(5, { octave: 1, velocity: 0.65 }), null, N(3, { octave: 1, velocity: 0.5 }), null, N(2, { octave: 1, velocity: 0.6 }), null, N(3, { octave: 1, velocity: 0.48 }), null, N(5, { octave: 1, velocity: 0.55 }), null, N(6, { octave: 1, velocity: 0.52 }), null, N(5, { octave: 1, velocity: 0.48 }), null, N(3, { octave: 1, velocity: 0.45 }), null]),
    melBar([N(2, { octave: 1, velocity: 0.64 }), null, N(0, { octave: 1, velocity: 0.55 }), null, N(2, { octave: 1, velocity: 0.58 }), null, N(3, { octave: 1, velocity: 0.5 }), null, N(5, { octave: 1, velocity: 0.54 }), null, N(3, { octave: 1, velocity: 0.48 }), null, N(2, { octave: 1, velocity: 0.52 }), null, N(0, { octave: 1, velocity: 0.46 }), null]),
    melBar([N(4, { octave: 1, velocity: 0.66 }), null, N(3, { octave: 1, velocity: 0.52 }), null, N(2, { octave: 1, velocity: 0.6 }), null, N(0, { octave: 1, velocity: 0.58 }), null, N(2, { octave: 1, velocity: 0.5 }), null, N(4, { octave: 1, velocity: 0.55 }), null, N(3, { octave: 1, velocity: 0.48 }), null, N(2, { octave: 1, velocity: 0.44 }), null]),
  ]),
  melodyLength: 64,
  faderOverrides: { 12: 490, 13: 660, 14: 650 },
};

// ─── 2. SUNSET DRIVE — Synthwave in A minor ─────────────────────────────────
// i – VI – III – VII

const synthwaveBassBar = (deg: number): BassStep[] => {
  const bar = Array.from({ length: 16 }, () => X());
  for (const i of [0, 2, 4, 6, 8, 10, 12, 14]) {
    bar[i] = B(deg, {
      accent: i % 4 === 0,
      velocity: i % 4 === 0 ? 0.92 : 0.62,
      slide: i === 6 || i === 14,
    });
  }
  bar[8] = B(deg, { octave: 1, accent: true, velocity: 0.82 });
  return bar;
};

const sunsetDrive: DemoSong = {
  id: "sunset-drive",
  name: "Sunset Drive",
  genre: "Synthwave",
  description: "Driving octave bass, gated snare and a neon brass lead",
  bpm: 108,
  kitId: "synthwave-80s",
  bassPresetName: "Synthwave Drive",
  chordsPresetName: "Synthwave Pad",
  melodyPresetName: "★ Synthwave Brass",
  melodyPadPresetIndex: MELODY_PAD_SYNTH_PRESET_INDEX,
  rootName: "A",
  scaleName: "Minor",
  chordsSteps: concat([
    padBar(0, "Min", [0, 8], 0.6),
    padBar(5, "Maj", [0, 8], 0.55),
    padBar(2, "Maj", [0, 8], 0.58),
    padBar(6, "Maj", [0, 8], 0.56),
  ]),
  chordsLength: 64,
  bassSteps: concat([
    synthwaveBassBar(0),
    synthwaveBassBar(5),
    synthwaveBassBar(2),
    synthwaveBassBar(6),
  ]),
  bassLength: 64,
  melodySteps: concat([
    melBar([N(0, { octave: 1, accent: true, velocity: 0.75 }), null, N(2, { octave: 1, velocity: 0.58 }), N(3, { octave: 1, velocity: 0.62 }), N(4, { octave: 1, velocity: 0.68 }), null, N(3, { octave: 1, velocity: 0.55 }), null, N(2, { octave: 1, velocity: 0.6 }), N(0, { octave: 1, velocity: 0.58 }), null, N(2, { octave: 1, velocity: 0.52 }), N(4, { octave: 1, accent: true, velocity: 0.72 }), null, N(3, { octave: 1, velocity: 0.58 }), null]),
    melBar([N(5, { octave: 1, accent: true, velocity: 0.74 }), null, N(3, { octave: 1, velocity: 0.58 }), N(2, { octave: 1, velocity: 0.62 }), N(0, { octave: 1, velocity: 0.66 }), null, N(2, { octave: 1, velocity: 0.55 }), null, N(3, { octave: 1, velocity: 0.6 }), N(5, { octave: 1, velocity: 0.58 }), null, N(3, { octave: 1, velocity: 0.52 }), N(2, { octave: 1, accent: true, velocity: 0.7 }), null, N(0, { octave: 1, velocity: 0.56 }), null]),
    melBar([N(2, { octave: 1, accent: true, velocity: 0.76 }), null, N(4, { octave: 1, velocity: 0.6 }), N(5, { octave: 1, velocity: 0.64 }), N(6, { octave: 1, velocity: 0.7 }), null, N(5, { octave: 1, velocity: 0.56 }), null, N(4, { octave: 1, velocity: 0.6 }), N(2, { octave: 1, velocity: 0.58 }), null, N(4, { octave: 1, velocity: 0.54 }), N(6, { octave: 1, accent: true, velocity: 0.74 }), null, N(5, { octave: 1, velocity: 0.58 }), null]),
    melBar([N(6, { octave: 1, accent: true, velocity: 0.75 }), null, N(4, { octave: 1, velocity: 0.58 }), N(3, { octave: 1, velocity: 0.62 }), N(2, { octave: 1, velocity: 0.66 }), null, N(0, { octave: 1, velocity: 0.55 }), null, N(2, { octave: 1, velocity: 0.6 }), N(4, { octave: 1, velocity: 0.58 }), null, N(6, { octave: 1, velocity: 0.54 }), N(4, { octave: 1, accent: true, velocity: 0.72 }), null, N(2, { octave: 1, velocity: 0.56 }), null]),
  ]),
  melodyLength: 64,
  faderOverrides: { 12: 500, 13: 650, 14: 670 },
};

// ─── 3. LIQUID HOURS — Liquid DnB in F minor ────────────────────────────────

const dnbBassBar = (deg: number): BassStep[] => {
  const bar = Array.from({ length: 16 }, () => X());
  for (let i = 0; i < 16; i += 2) {
    bar[i] = B(deg, {
      octave: -1,
      velocity: i % 4 === 0 ? 0.88 : 0.68,
      slide: i % 4 === 2,
      accent: i === 0,
    });
  }
  bar[14] = B(deg, { octave: -1, velocity: 0.75, slide: true });
  return bar;
};

const liquidHours: DemoSong = {
  id: "liquid-hours",
  name: "Liquid Hours",
  genre: "Liquid DnB",
  description: "Rolling break, reese sub and glass-bell topline",
  bpm: 174,
  kitId: "dnb-liquid",
  bassPresetName: "Liquid DnB",
  chordsPresetName: "Lush Pad",
  melodyPresetName: "★ Glass Bells",
  melodyPadPresetIndex: MELODY_PAD_BELLS_PRESET_INDEX,
  rootName: "F",
  scaleName: "Minor",
  drumPattern: {
    length: 16,
    swing: 52,
    tracks: {
      0: { steps: [0, 4, 9, 10], vel: [110, 85, 95, 70] },
      1: { steps: [4, 12], vel: [105, 100] },
      2: { steps: [12], vel: [65] },
      6: { steps: [0, 2, 4, 6, 8, 10, 12, 14], vel: [75, 45, 65, 45, 75, 45, 65, 45] },
      10: { steps: [2, 6, 14], vel: [50, 45, 50] },
    },
  },
  chordsSteps: concat([
    padBar(0, "Min9", [0], 0.52),
    padBar(5, "Maj7", [0], 0.48),
    padBar(3, "Min7", [0], 0.5),
    padBar(6, "Maj7", [0], 0.49),
  ]),
  chordsLength: 64,
  bassSteps: concat([
    dnbBassBar(0),
    dnbBassBar(5),
    dnbBassBar(3),
    dnbBassBar(6),
  ]),
  bassLength: 64,
  melodySteps: concat([
    melBar([N(3, { octave: 1, velocity: 0.62, tie: false }), null, null, null, N(5, { octave: 1, velocity: 0.55 }), null, null, null, N(6, { octave: 1, velocity: 0.58 }), null, null, null, N(5, { octave: 1, velocity: 0.52 }), null, N(3, { octave: 1, velocity: 0.48 }), null]),
    melBar([N(5, { octave: 1, velocity: 0.6 }), null, null, null, N(3, { octave: 1, velocity: 0.54 }), null, null, null, N(2, { octave: 1, velocity: 0.56 }), null, null, null, N(3, { octave: 1, velocity: 0.5 }), null, N(5, { octave: 1, velocity: 0.46 }), null]),
    melBar([N(3, { octave: 1, velocity: 0.61 }), null, null, null, N(2, { octave: 1, velocity: 0.54 }), null, null, null, N(0, { octave: 1, velocity: 0.57 }), null, null, null, N(2, { octave: 1, velocity: 0.51 }), null, N(3, { octave: 1, velocity: 0.47 }), null]),
    melBar([N(6, { octave: 1, velocity: 0.63 }), null, null, null, N(5, { octave: 1, velocity: 0.55 }), null, null, null, N(3, { octave: 1, velocity: 0.58 }), null, null, null, N(2, { octave: 1, velocity: 0.52 }), null, N(0, { octave: 1, velocity: 0.48 }), null]),
  ]),
  melodyLength: 64,
  faderOverrides: { 12: 520, 13: 630, 14: 640 },
};

// ─── 4. NIGHT BLOOM — Deep House in A minor ─────────────────────────────────

const houseBassBar = (deg: number): BassStep[] => {
  const bar = Array.from({ length: 16 }, () => X());
  for (const i of [0, 4, 8, 12]) {
    bar[i] = B(deg, { accent: true, velocity: 0.9 });
  }
  for (const i of [2, 6, 10, 14]) {
    bar[i] = B(deg, { octave: 1, velocity: 0.55, slide: true });
  }
  return bar;
};

const houseStabBar = (deg: number, type: string): ChordsStep[] => {
  const bar = Array.from({ length: 16 }, () => XC());
  for (const i of [2, 6, 10, 14]) {
    bar[i] = C(deg, type, { velocity: 0.72, accent: i === 2 });
  }
  bar[0] = C(deg, type, { velocity: 0.38, tie: true });
  return bar;
};

const nightBloom: DemoSong = {
  id: "night-bloom",
  name: "Night Bloom",
  genre: "Deep House",
  description: "Four-on-the-floor groove, off-beat Rhodes and plucked stabs",
  bpm: 122,
  kitId: "deep-house",
  bassPresetName: "DH Moog Bass",
  chordsPresetName: "DH Rhodes Warm",
  melodyPresetName: "DH Soft Pluck",
  melodyPadPresetIndex: MELODY_PAD_PLUCK_PRESET_INDEX,
  rootName: "A",
  scaleName: "Minor",
  chordsSteps: concat([
    houseStabBar(0, "Min7"),
    houseStabBar(5, "Maj7"),
    houseStabBar(6, "Maj"),
    houseStabBar(4, "Min7"),
  ]),
  chordsLength: 64,
  bassSteps: concat([
    houseBassBar(0),
    houseBassBar(5),
    houseBassBar(6),
    houseBassBar(4),
  ]),
  bassLength: 64,
  melodySteps: concat([
    melBar([null, null, N(0, { octave: 1, velocity: 0.7 }), null, null, null, N(2, { octave: 1, velocity: 0.62 }), null, null, null, N(3, { octave: 1, velocity: 0.66 }), null, null, null, N(2, { octave: 1, velocity: 0.58 }), null]),
    melBar([null, null, N(5, { octave: 1, velocity: 0.68 }), null, null, null, N(3, { octave: 1, velocity: 0.6 }), null, null, null, N(2, { octave: 1, velocity: 0.64 }), null, null, null, N(0, { octave: 1, velocity: 0.56 }), null]),
    melBar([null, null, N(6, { octave: 1, velocity: 0.7 }), null, null, null, N(5, { octave: 1, velocity: 0.62 }), null, null, null, N(4, { octave: 1, velocity: 0.66 }), null, null, null, N(2, { octave: 1, velocity: 0.58 }), null]),
    melBar([null, null, N(4, { octave: 1, velocity: 0.68 }), null, null, null, N(2, { octave: 1, velocity: 0.6 }), null, null, null, N(0, { octave: 1, velocity: 0.64 }), null, null, null, N(2, { octave: 1, velocity: 0.56 }), null]),
  ]),
  melodyLength: 64,
  faderOverrides: { 12: 480, 13: 660, 14: 660 },
};

// ─── 5. COSMIC DRIFT — Ambient in D minor (8 bars) ──────────────────────────

const cosmicDrift: DemoSong = {
  id: "cosmic-drift",
  name: "Cosmic Drift",
  genre: "Ambient / Cinematic",
  description: "Slow pads, breathing drone bass and a distant vocal lead",
  bpm: 76,
  kitId: "ambient-organic",
  bassPresetName: "Ambient Drone",
  chordsPresetName: "Cinematic Sweep",
  melodyPresetName: "★ Vocal Lead",
  melodyPadPresetIndex: MELODY_PAD_DEEP_PRESET_INDEX,
  rootName: "D",
  scaleName: "Minor",
  drumPattern: {
    length: 16,
    swing: 54,
    tracks: {
      0: { steps: [0, 8], vel: [68, 52] },
      10: { steps: [2, 6, 10, 14], vel: [38, 34, 38, 34] },
      11: { steps: [1, 5, 9, 13], vel: [32, 28, 32, 28] },
    },
  },
  chordsSteps: concat([
    padBar(0, "Min9", [0], 0.48),
    padBar(0, "Min9", [0], 0.46),
    padBar(5, "Maj7", [0], 0.44),
    padBar(5, "Maj7", [0], 0.42),
    padBar(2, "Maj7", [0], 0.45),
    padBar(2, "Maj7", [0], 0.43),
    padBar(6, "Min7", [0], 0.44),
    padBar(6, "Min7", [0], 0.42),
  ]),
  chordsLength: 128,
  bassSteps: concat([
    (() => { const b = Array(16).fill(null).map(X); b[0] = B(0, { octave: -1, velocity: 0.7, tie: true }); return b; })(),
    Array.from({ length: 16 }, () => X()),
    (() => { const b = Array(16).fill(null).map(X); b[0] = B(5, { octave: -1, velocity: 0.65, tie: true }); return b; })(),
    Array.from({ length: 16 }, () => X()),
    (() => { const b = Array(16).fill(null).map(X); b[0] = B(2, { octave: -1, velocity: 0.68, tie: true }); return b; })(),
    Array.from({ length: 16 }, () => X()),
    (() => { const b = Array(16).fill(null).map(X); b[0] = B(6, { octave: -1, velocity: 0.64, tie: true }); return b; })(),
    Array.from({ length: 16 }, () => X()),
  ]),
  bassLength: 128,
  melodySteps: concat([
    melBar([N(3, { octave: 1, velocity: 0.42, slide: true }), null, null, null, null, null, null, null, null, null, null, null, N(2, { octave: 1, velocity: 0.38 }), null, null, null]),
    melBar([null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]),
    melBar([N(5, { octave: 1, velocity: 0.4, slide: true }), null, null, null, null, null, null, null, N(3, { octave: 1, velocity: 0.36 }), null, null, null, null, null, null, null]),
    melBar([null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]),
    melBar([N(2, { octave: 1, velocity: 0.41, slide: true }), null, null, null, null, null, N(0, { octave: 1, velocity: 0.37 }), null, null, null, null, null, null, null, null, null]),
    melBar([null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]),
    melBar([N(6, { octave: 1, velocity: 0.4, slide: true }), null, null, null, null, null, null, null, N(4, { octave: 1, velocity: 0.36 }), null, null, null, N(2, { octave: 1, velocity: 0.34 }), null, null, null]),
    melBar([null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]),
  ]),
  melodyLength: 128,
  faderOverrides: { 12: 450, 13: 700, 14: 610 },
};

export const DEMO_SONGS: DemoSong[] = [
  velvetStairs,
  sunsetDrive,
  liquidHours,
  nightBloom,
  cosmicDrift,
];
