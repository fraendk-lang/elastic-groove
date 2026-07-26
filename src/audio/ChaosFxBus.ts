/**
 * Chaos FX Bus — audio-side routing for Kaoss-Pad-style FX modes.
 *
 * Extracted from FxPanel.tsx so the same routing can be driven from
 * both the standalone Chaos overlay and the embedded ChaosPad inside
 * the XY Performance Pad. Pure audio glue — no React, no UI state.
 */

import { audioEngine } from "./AudioEngine";
import { melodyEngine } from "./MelodyEngine";
import { bassEngine } from "./BassEngine";

// Synth channels that get auto-sends when Kaoss Pad uses REVERB/DELAY modes (master/drums fallback)
export const KAOSS_SYNTH_CHANNELS = [12, 13, 14] as const;
export const KAOSS_AUTO_SEND = 0.38;

// ─── Types ───────────────────────────────────────────────

export type FxTarget = "master" | "drums" | "bass" | "chords" | "melody" | "sampler" | "loops" | "layers";

export const FX_TARGETS: { id: FxTarget; label: string; channels: number[] }[] = [
  { id: "master",  label: "MASTER",  channels: [] },
  { id: "drums",   label: "DRUMS",   channels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: "bass",    label: "BASS",    channels: [12] },
  { id: "chords",  label: "CHORDS",  channels: [13] },
  { id: "melody",  label: "MELODY",  channels: [14] },
  { id: "sampler", label: "SAMPLER", channels: [15] },
  { id: "loops",   label: "LOOPS",   channels: [16, 17, 18, 19, 20, 21, 22, 23] },
  { id: "layers",  label: "LAYERS",  channels: [24, 25, 26] },
];

/** Returns which channels to route sends/phaser/chorus to for a given target.
 *  Master and Drums have no dedicated send buses — fall back to all synth channels. */
export function getSendChannels(target: FxTarget): number[] {
  const t = FX_TARGETS.find((t) => t.id === target);
  if (!t || t.id === "master" || t.id === "drums") return [...KAOSS_SYNTH_CHANNELS];
  return t.channels;
}

export type FxMode = "FILTER" | "DELAY" | "REVERB" | "FLANGER" | "CRUSH" | "PHASER" | "CHORUS";

export interface ModeConfig {
  color: string;
  xLabel: string;
  yLabel: string;
}

interface MusicalValue {
  text: string;        // Display text shown in the UI (e.g. "1/8 ↻", "550 Hz")
  description: string; // Secondary text below `text`
}

// ─── Constants ───────────────────────────────────────────

export const MODE_CONFIG: Record<FxMode, ModeConfig> = {
  FILTER: { color: "#f59e0b", xLabel: "Frequency", yLabel: "Resonance" },
  DELAY: { color: "#3b82f6", xLabel: "Division", yLabel: "Feedback" },
  REVERB: { color: "#8b5cf6", xLabel: "Brightness", yLabel: "Level" },
  FLANGER: { color: "#06b6d4", xLabel: "Rate", yLabel: "Depth + Feedback" },
  CRUSH:   { color: "#ef4444", xLabel: "Filter Mode", yLabel: "Drive" },
  PHASER:  { color: "#22d3ee", xLabel: "Rate",        yLabel: "Depth + Feedback" },
  CHORUS:  { color: "#a3e635", xLabel: "Rate",        yLabel: "Depth" },
};

export const FX_MODES: FxMode[] = ["FILTER", "DELAY", "REVERB", "FLANGER", "CRUSH", "PHASER", "CHORUS"];

export const FX_MODE_PRESETS: Record<FxMode, { label: string; x: number; y: number }[]> = {
  FILTER: [
    { label: "Warm LP", x: 0.18, y: 0.42 },
    { label: "Sweep Peak", x: 0.48, y: 0.84 },
    { label: "Thin HP", x: 0.82, y: 0.38 },
  ],
  DELAY: [
    { label: "Dub 1/8", x: 0.56, y: 0.64 },
    { label: "Ping 1/4", x: 0.82, y: 0.55 },
    { label: "Tight Slap", x: 0.24, y: 0.28 },
  ],
  REVERB: [
    { label: "Wide Hall", x: 0.32, y: 0.8 },
    { label: "Dark Wash", x: 0.76, y: 0.72 },
    { label: "Short Room", x: 0.18, y: 0.3 },
  ],
  FLANGER: [
    { label: "Slow Jet", x: 0.22, y: 0.6 },
    { label: "Fast Metal", x: 0.84, y: 0.88 },
    { label: "Soft Chorus", x: 0.34, y: 0.36 },
  ],
  CRUSH: [
    { label: "Telephone", x: 0.2,  y: 0.48 },
    { label: "Dusty Drive", x: 0.62, y: 0.54 },
    { label: "Hard Smash", x: 0.88, y: 0.92 },
  ],
  PHASER: [
    { label: "Slow",   x: 0.15, y: 0.35 },
    { label: "Medium", x: 0.45, y: 0.55 },
    { label: "Fast",   x: 0.75, y: 0.70 },
  ],
  CHORUS: [
    { label: "Subtle", x: 0.25, y: 0.30 },
    { label: "Lush",   x: 0.50, y: 0.65 },
    { label: "Wide",   x: 0.70, y: 0.85 },
  ],
};

// ─── Musical Value Formatters ────────────────────────────

export function getMusicalValue(mode: FxMode, x: number, y: number, _bpm: number): MusicalValue {
  switch (mode) {
    case "FILTER": {
      if (x < 0.5) {
        const norm = 1 - x * 2;
        const freq = Math.round(80 * Math.pow(20000 / 80, 1 - norm));
        const q = Math.round((0.5 + y * 25) * 10) / 10;
        return { text: `LP ${freq}Hz`, description: `Q: ${q}` };
      } else {
        const norm = (x - 0.5) * 2;
        const freq = Math.round(20 * Math.pow(12000 / 20, norm));
        const q = Math.round((0.5 + y * 25) * 10) / 10;
        return { text: `HP ${freq}Hz`, description: `Q: ${q}` };
      }
    }
    case "DELAY": {
      const divisions = [0.125, 0.167, 0.25, 0.333, 0.5, 0.667, 1.0, 2.0];
      const divNames = ["1/32", "1/16T", "1/16", "1/8T", "1/8", "1/4T", "1/4", "1/2"];
      const divIdx = Math.min(divisions.length - 1, Math.floor(x * divisions.length));
      const feedback = Math.round(Math.pow(y, 1.5) * 88);
      return { text: `${divNames[divIdx]}`, description: `FB: ${feedback}%` };
    }
    case "REVERB": {
      const damping = Math.round(16000 * Math.pow(500 / 16000, x));
      const level = Math.round(Math.pow(y, 0.8) * 120);
      return { text: `${damping}Hz`, description: `${level}%` };
    }
    case "FLANGER": {
      const rate = Math.round((0.05 * Math.pow(4 / 0.05, x)) * 100) / 100;
      const depth = Math.round(Math.min(1.0, y * 1.5) * 100);
      const hasFeedback = y > 0.3 ? "+" : "";
      return { text: `${rate}Hz${hasFeedback}`, description: `Depth: ${depth}%` };
    }
    case "CRUSH": {
      if (x < 0.4) {
        return { text: "TEL", description: `Drive: ${Math.round(Math.pow(y, 1.3) * 100)}%` };
      } else {
        return { text: "CRUSH", description: `Drive: ${Math.round(Math.pow(y, 1.3) * 100)}%` };
      }
    }
    case "PHASER": {
      const rate = Math.round((0.05 * Math.pow(6 / 0.05, x)) * 100) / 100;
      const depth = Math.round(y * 100);
      return { text: `${rate}Hz`, description: `Depth: ${depth}%` };
    }
    case "CHORUS": {
      const rate  = Math.round((0.5 + x * 3.5) * 10) / 10;
      const width = Math.round(y * 100);
      return { text: `${rate}Hz`, description: `Width: ${width}%` };
    }
  }
}

// ─── FX Parameter Application ────────────────────────────

export function applyFilter(target: FxTarget, type: BiquadFilterType, freq: number, q: number): void {
  const t = FX_TARGETS.find((t) => t.id === target);
  if (!t || target === "master") {
    audioEngine.setMasterFilter(type, freq, q);
  } else {
    for (const ch of t.channels) audioEngine.setChannelFilter(ch, type, freq, q);
  }
  // Also sweep live synth voices so the pad hears the filter immediately
  const resNorm = Math.min(1, q / 25);
  if (target === "melody") melodyEngine.sweepLiveFilter(freq, resNorm);
  else if (target === "bass") bassEngine.sweepLiveFilter(freq, resNorm);
}

export function releaseFilter(target: FxTarget): void {
  const t = FX_TARGETS.find((t) => t.id === target);
  if (!t || target === "master") {
    audioEngine.bypassMasterFilter();
  } else {
    for (const ch of t.channels) audioEngine.bypassChannelFilter(ch);
  }
  if (target === "melody") melodyEngine.sweepLiveFilter(12000, 0.15);
  else if (target === "bass") bassEngine.sweepLiveFilter(8000, 0.15);
}

// ─── FX Application ─────────────────────────────────────

export function applyFxMode(mode: FxMode, x: number, y: number, target: FxTarget, bpm: number): void {
  switch (mode) {
    case "FILTER": {
      const q = 0.5 + y * 25;
      if (x < 0.5) {
        // Left half: LOWPASS sweep 20kHz → 80Hz
        const norm = 1 - x * 2;
        const freq = 80 * Math.pow(20000 / 80, 1 - norm);
        applyFilter(target, "lowpass", freq, q);
      } else {
        // Right half: HIGHPASS sweep 20Hz → 12kHz
        const norm = (x - 0.5) * 2;
        const freq = 20 * Math.pow(12000 / 20, norm);
        applyFilter(target, "highpass", freq, q);
      }
      break;
    }
    case "DELAY": {
      const beatSec = 60 / bpm;
      const divisions = [0.125, 0.167, 0.25, 0.333, 0.5, 0.667, 1.0, 2.0];
      const divIdx = Math.min(divisions.length - 1, Math.floor(x * divisions.length));
      const time = Math.min(2.0, beatSec * divisions[divIdx]!);
      const feedback = Math.pow(y, 1.5) * 0.88;
      const filterFreq = 8000 - feedback * 5000;
      audioEngine.setDelayParams(time, feedback, filterFreq);
      audioEngine.setDelayLevel(0.3 + y * 0.5);
      break;
    }
    case "REVERB": {
      // X: bright↔dark damping
      const damping = 16000 * Math.pow(500 / 16000, x);
      audioEngine.setReverbDamping(damping);
      // Also adjust pre-delay for spatial effect
      audioEngine.setReverbPreDelay(x * 60);
      // Y: wet level with smooth curve
      const level = Math.pow(y, 0.8) * 1.2;
      audioEngine.setReverbLevel(Math.min(level, 1.5));
      break;
    }
    case "FLANGER": {
      // X = sweep rate: 0.05→4 Hz
      const rate = 0.05 * Math.pow(4 / 0.05, x);
      // Y = depth + feedback (bottom half depth, top half feedback)
      const depth = Math.min(1.0, y * 1.5);
      const feedback = y > 0.3 ? 0.3 + (y - 0.3) * 0.93 : 0.3;
      audioEngine.setFlangerParams(rate, depth, feedback);
      break;
    }
    case "CRUSH": {
      // X: left = telephone/bandpass, center = normal, right = bright
      if (x < 0.4) {
        // Telephone: bandpass 300-3kHz
        const bpFreq = 300 + (x / 0.4) * 2700;
        applyFilter(target, "bandpass", bpFreq, 2 + (0.4 - x) * 15);
      } else {
        // Low-pass with resonance peak
        const freq = 800 + ((x - 0.4) / 0.6) * 14000;
        applyFilter(target, "lowpass", freq, 1 + y * 6);
      }
      // Y = saturation/distortion intensity
      const drive = Math.pow(y, 1.3);
      audioEngine.setMasterSaturation(drive);
      break;
    }
    case "PHASER": {
      // X: rate 0.05–6Hz (exponential), Y: depth 0–1 + feedback 0–0.7
      const rate     = 0.05 * Math.pow(6 / 0.05, x);
      const feedback = y * 0.7;
      audioEngine.setPhaserRate(rate);
      audioEngine.setPhaserFeedback(feedback);
      audioEngine.setPhaserLevel(0.35 + y * 0.4);
      break;
    }
    case "CHORUS": {
      // X: rate 0.5–4Hz, Y: depth/width 0–1
      const rate  = 0.5 + x * 3.5;
      const depth = y;
      audioEngine.setChorusRate(rate);
      audioEngine.setChorusDepth(depth);
      audioEngine.setChorusLevel(0.3 + y * 0.5);
      break;
    }
  }
}

// ─── Saved FX state (send levels + global wet params) ────

interface SavedSendLevels {
  channels: number[];
  reverb: number[];
  delay: number[];
}

interface SavedGlobalFx {
  reverbLevel: number;
  reverbDamping: number;
  reverbPreDelay: number;
  delayLevel: number;
  delayTime: number;
  delayFeedback: number;
}

let _savedSends: SavedSendLevels | null = null;
let _savedGlobals: SavedGlobalFx | null = null;
let _sendBoostTarget: FxTarget | null = null;

function _saveGlobalsIfNeeded(): void {
  if (_savedGlobals) return;
  _savedGlobals = {
    reverbLevel: audioEngine.getReverbLevel(),
    reverbDamping: 8000,
    reverbPreDelay: 0,
    delayLevel: audioEngine.getDelayLevel(),
    delayTime: 0.375,
    delayFeedback: 0.4,
  };
}

function _boostSendsForTarget(target: FxTarget, mode: FxMode): void {
  if (mode !== "REVERB" && mode !== "DELAY") return;
  if (_savedSends !== null && _sendBoostTarget === target) return;

  const channels = getSendChannels(target);
  _savedSends = {
    channels: [...channels],
    reverb: channels.map((ch) => audioEngine.getChannelReverbSend(ch)),
    delay: channels.map((ch) => audioEngine.getChannelDelaySend(ch)),
  };
  _sendBoostTarget = target;

  const sendLevel = target === "melody" || target === "bass" ? 0.55 : KAOSS_AUTO_SEND;
  for (const ch of channels) {
    audioEngine.setChannelReverbSend(ch, Math.max(audioEngine.getChannelReverbSend(ch), sendLevel));
    audioEngine.setChannelDelaySend(ch, Math.max(audioEngine.getChannelDelaySend(ch), sendLevel));
  }
}

export function restoreSavedSends(): void {
  if (!_savedSends) return;
  _savedSends.channels.forEach((ch, i) => {
    audioEngine.setChannelReverbSend(ch, _savedSends!.reverb[i] ?? 0);
    audioEngine.setChannelDelaySend(ch, _savedSends!.delay[i] ?? 0);
  });
  _savedSends = null;
  _sendBoostTarget = null;
}

function _restoreGlobals(): void {
  if (!_savedGlobals) return;
  const g = _savedGlobals;
  audioEngine.setReverbLevel(g.reverbLevel);
  audioEngine.setReverbDamping(g.reverbDamping);
  audioEngine.setReverbPreDelay(g.reverbPreDelay);
  audioEngine.setDelayLevel(g.delayLevel);
  audioEngine.setDelayParams(g.delayTime, g.delayFeedback, 4000);
  _savedGlobals = null;
}

export function activateFxMode(mode: FxMode, x: number, y: number, target: FxTarget, bpm: number): void {
  _saveGlobalsIfNeeded();
  _boostSendsForTarget(target, mode);
  if (mode === "FLANGER") {
    const rate = 0.05 * Math.pow(4 / 0.05, x);
    const depth = Math.min(1.0, y * 1.5);
    const feedback = y > 0.3 ? 0.3 + (y - 0.3) * 0.93 : 0.3;
    audioEngine.startFlanger(rate, depth, feedback);
  }
  if (mode === "PHASER") {
    getSendChannels(target).forEach((ch) => audioEngine.setChannelPhaserSend(ch, 0.38));
  }
  if (mode === "CHORUS") {
    getSendChannels(target).forEach((ch) => audioEngine.setChannelChorusSend(ch, 0.38));
  }
  applyFxMode(mode, x, y, target, bpm);
}

export function releaseFxMode(mode: FxMode, target: FxTarget): void {
  switch (mode) {
    case "FILTER":
      releaseFilter(target);
      break;
    case "DELAY":
      _restoreGlobals();
      restoreSavedSends();
      break;
    case "REVERB":
      _restoreGlobals();
      restoreSavedSends();
      break;
    case "FLANGER":
      audioEngine.stopFlanger();
      break;
    case "CRUSH":
      releaseFilter(target);
      audioEngine.setMasterSaturation(0);
      break;
    case "PHASER":
      audioEngine.setPhaserLevel(0);
      getSendChannels(target).forEach((ch) => audioEngine.setChannelPhaserSend(ch, 0));
      break;
    case "CHORUS":
      audioEngine.setChorusLevel(0);
      getSendChannels(target).forEach((ch) => audioEngine.setChannelChorusSend(ch, 0));
      break;
  }
}

// ─── Singleton wrapper (parallels beatFxManager in BeatFx.ts) ────────────

class ChaosFxBus {
  setXY(target: FxTarget, mode: FxMode, x: number, y: number, bpm: number): void {
    if (mode === "REVERB" || mode === "DELAY") _boostSendsForTarget(target, mode);
    applyFxMode(mode, x, y, target, bpm);
  }
  activate(target: FxTarget, mode: FxMode, x: number, y: number, bpm: number): void {
    activateFxMode(mode, x, y, target, bpm);
  }
  release(target: FxTarget, mode: FxMode): void {
    releaseFxMode(mode, target);
  }
  /** Force-restore sends + globals (panel close / panic). */
  resetAll(): void {
    restoreSavedSends();
    _restoreGlobals();
    audioEngine.bypassMasterFilter();
    audioEngine.stopFlanger();
    audioEngine.setMasterSaturation(0);
    audioEngine.setPhaserLevel(0);
    audioEngine.setChorusLevel(0);
  }
}

export const chaosFxBus = new ChaosFxBus();
