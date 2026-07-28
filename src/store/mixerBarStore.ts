// src/store/mixerBarStore.ts
/**
 * Mixer Bar Store — persistent channel state for MixerBar + MixerPanel.
 * 28 channels (0-11 drums/hats/perc, 12-15 synths, 16-23 loops, 24-26 layers, 27 audio).
 * State persists via autosave / scenes (fader, pan, EQ, sends, mute, solo).
 */

import { create } from "zustand";

export const NUM_MIXER_CHANNELS = 28;

/** Fader position 0-1000 (750 = 0dB unity) */
export type FaderPos = number;
export const FADER_UNITY = 750;
export const FADER_MAX = 1000;

export function clampFaderPos(v: number): number {
  return Math.max(0, Math.min(FADER_MAX, Math.round(v)));
}

export interface ChannelMixState {
  fader:   FaderPos;   // 0-1000, 750 = unity
  muted:   boolean;
  soloed:  boolean;
  pan:     number;     // -1 to +1
  eqOn:    boolean;
  eqLo:    number;     // -12 to +12 dB
  eqMid:   number;     // -12 to +12 dB
  eqHi:    number;     // -12 to +12 dB
  sendRev: number;     // 0-100
  sendDly: number;     // 0-100
  sendCh:  number;     // 0-100 chorus
  sendPh:  number;     // 0-100 phaser
}

export const GROUP_BUS_IDS = [
  "drums", "hats", "perc", "bass", "chords", "melody", "sampler", "loops",
] as const;
export type GroupBusId = typeof GROUP_BUS_IDS[number];

export interface GroupBusState {
  fader: number;   // 0-1000, 750 = unity (same scale as channel faders)
  muted: boolean;
}

const DEFAULT_GROUP_FADERS: Record<GroupBusId, number> = {
  drums: 750,
  hats: 750,
  perc: 750,
  bass: 680,
  chords: 750,
  melody: 750,
  sampler: 750,
  loops: 750,
};

const BALANCED_FADERS: readonly number[] = [
  620, 640, 640, 640, 640, 640,  // 0-5: drums (ch0=kick loudest)
  580, 580, 580, 580,             // 6-9: hats
  630, 630,                       // 10-11: perc
  500,                            // 12: bass (sits under drums — sub is loud at source)
  670,                            // 13: chords
  680,                            // 14: melody/lead
  700,                            // 15: sampler
  ...new Array(8).fill(700),      // 16-23: LP 1–8
  670, 660, 650,                  // 24-26: LAY 1–3
  700,                            // 27: audio clips
];

/** Per-channel default sends — subtle wet on musical buses so FX pads respond. */
const DEFAULT_SENDS: ReadonlyArray<Partial<Pick<ChannelMixState, "sendRev" | "sendDly">>> = [
  ...Array(13).fill({ sendRev: 0, sendDly: 0 }),
  { sendRev: 12, sendDly: 6 },   // 13 chords
  { sendRev: 18, sendDly: 8 },   // 14 melody
  { sendRev: 8, sendDly: 4 },     // 15 sampler
  ...Array(8).fill({ sendRev: 0, sendDly: 0 }),
  { sendRev: 14, sendDly: 6 },   // 24 LAY1
  { sendRev: 12, sendDly: 5 },   // 25 LAY2
  { sendRev: 10, sendDly: 4 },   // 26 LAY3
  { sendRev: 6, sendDly: 0 },    // 27 audio
];

const defaultChannel = (ch = 0): ChannelMixState => {
  const sends = DEFAULT_SENDS[ch] ?? {};
  return {
    fader: BALANCED_FADERS[ch] ?? 700,
    muted: false,
    soloed: false,
    pan: 0,
    eqOn: false,
    eqLo: 0,
    eqMid: 0,
    eqHi: 0,
    sendRev: sends.sendRev ?? 0,
    sendDly: sends.sendDly ?? 0,
    sendCh: 0,
    sendPh: 0,
  };
};

/** Merge persisted channel rows (may lack newer fields) onto defaults. */
export function normalizeChannelMixState(raw: Partial<ChannelMixState> | undefined, index: number): ChannelMixState {
  const base = defaultChannel(index);
  if (!raw) return base;
  return {
    fader: raw.fader ?? base.fader,
    muted: raw.muted ?? base.muted,
    soloed: raw.soloed ?? base.soloed,
    pan: raw.pan ?? base.pan,
    eqOn: raw.eqOn ?? base.eqOn,
    eqLo: raw.eqLo ?? base.eqLo,
    eqMid: raw.eqMid ?? base.eqMid,
    eqHi: raw.eqHi ?? base.eqHi,
    sendRev: raw.sendRev ?? base.sendRev,
    sendDly: raw.sendDly ?? base.sendDly,
    sendCh: raw.sendCh ?? base.sendCh,
    sendPh: raw.sendPh ?? base.sendPh,
  };
}

export function normalizeMixerChannels(raw: Partial<ChannelMixState>[] | undefined): ChannelMixState[] {
  return Array.from({ length: NUM_MIXER_CHANNELS }, (_, i) => normalizeChannelMixState(raw?.[i], i));
}

interface MixerBarState {
  channels: ChannelMixState[];
  expandedChannel: number | null;
  setFader:   (ch: number, val: FaderPos) => void;
  setMute:    (ch: number, muted: boolean) => void;
  setSolo:    (ch: number, soloed: boolean) => void;
  setPan:     (ch: number, pan: number) => void;
  setEQ:      (ch: number, band: "lo" | "mid" | "hi", gain: number) => void;
  setEqOn:    (ch: number, on: boolean) => void;
  setSendRev: (ch: number, val: number) => void;
  setSendDly: (ch: number, val: number) => void;
  setSendCh:  (ch: number, val: number) => void;
  setSendPh:  (ch: number, val: number) => void;
  setExpanded:(ch: number | null) => void;
  groupBuses:    Record<GroupBusId, GroupBusState>;
  setGroupFader: (group: GroupBusId, fader: number) => void;
  setGroupMute:  (group: GroupBusId, muted: boolean) => void;
}

export const useMixerBarStore = create<MixerBarState>((set) => ({
  channels: Array.from({ length: NUM_MIXER_CHANNELS }, (_, i) => defaultChannel(i)),
  expandedChannel: null,
  groupBuses: Object.fromEntries(
    GROUP_BUS_IDS.map((id) => [id, { fader: DEFAULT_GROUP_FADERS[id], muted: false }])
  ) as Record<GroupBusId, GroupBusState>,

  setFader: (ch, val) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, fader: val }; return { channels: c }; }),

  setMute: (ch, muted) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, muted }; return { channels: c }; }),

  setSolo: (ch, soloed) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, soloed }; return { channels: c }; }),

  setPan: (ch, pan) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, pan }; return { channels: c }; }),

  setEQ: (ch, band, gain) =>
    set((s) => {
      const c = [...s.channels];
      const field = band === "lo" ? "eqLo" : band === "mid" ? "eqMid" : "eqHi";
      c[ch] = { ...c[ch]!, [field]: gain };
      return { channels: c };
    }),

  setEqOn: (ch, on) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, eqOn: on }; return { channels: c }; }),

  setSendRev: (ch, val) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, sendRev: val }; return { channels: c }; }),

  setSendDly: (ch, val) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, sendDly: val }; return { channels: c }; }),

  setSendCh: (ch, val) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, sendCh: val }; return { channels: c }; }),

  setSendPh: (ch, val) =>
    set((s) => { const c = [...s.channels]; c[ch] = { ...c[ch]!, sendPh: val }; return { channels: c }; }),

  setExpanded: (ch) => set({ expandedChannel: ch }),

  setGroupFader: (group, fader) =>
    set((s) => ({
      groupBuses: { ...s.groupBuses, [group]: { ...s.groupBuses[group]!, fader } },
    })),

  setGroupMute: (group, muted) =>
    set((s) => ({
      groupBuses: { ...s.groupBuses, [group]: { ...s.groupBuses[group]!, muted } },
    })),
}));

/** Logarithmic fader law: position (0..1000) → gain */
export function faderToGain(pos: number): number {
  const p = pos / 1000;
  if (p <= 0) return 0;
  const x = p / 0.75;
  return x < 1 ? x * x * x * 0.5 + 0.5 * x : 1 + (x - 1) * 1.5;
}

/** Fader position → dB (relative to unity at 750). */
export function faderPosToDb(pos: number): number {
  if (pos <= 5) return -Infinity;
  const g = faderToGain(pos);
  return 20 * Math.log10(g);
}

export function formatFaderDb(pos: number, digits = 1): string {
  const db = faderPosToDb(pos);
  if (!isFinite(db)) return "-∞";
  const sign = db >= 0 ? "+" : "";
  return `${sign}${db.toFixed(digits)}`;
}
