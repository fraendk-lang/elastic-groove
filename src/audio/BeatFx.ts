/**
 * BeatFxManager — 6 hold-to-activate performance effects.
 *
 * Call connect() once after AudioEngine initialises.
 * Call setContext({ target, bpm }) so effects route to the right bus (melody pad vs master).
 * Call startEffect(id) on pointerdown, stopEffect(id) on pointerup/pointercancel.
 *
 * Effects:
 *   THROW   — Reverb + delay send flood on target bus
 *   ECHO    — BPM-synced delay with feedback build
 *   CHOKE   — LP sweep on target channel(s) or master filter
 *   STUTTER — BPM-synced master gate (SendFx stutter — loops while held)
 *   ROLL    — BPM-synced beat repeat from target source
 *   NOISE   — SendFx noise wash with optional target duck
 */
import { audioEngine } from './AudioEngine';
import { melodyEngine } from './MelodyEngine';
import { bassEngine } from './BassEngine';
import { getSendChannels, type FxTarget } from './ChaosFxBus';

export type BeatFxId = 'throw' | 'echo' | 'choke' | 'noise' | 'stutter' | 'roll';

export interface BeatFxParams {
  throwSize: number;    // 0–1 (reverb size 2–6s), default 0.6
  echoFeedback: number; // 0–1 → 0.5–0.92 feedback, default 0.65
  chokeFreq: number;    // 0–1 → 80–2000 Hz target, default 0.2
  noiseVol: number;     // 0–1 → noise level, default 0.35
  noiseCut: number;     // 0–1 (reserved — SendFx noise uses built-in sweep)
  stutterRate: number;  // 0–1 → 1/8 … 1/32 note grid, default 0.5
  rollLength: number;   // 0–1 → 1/4 … 1/16 slice, default 0.3
}

export interface BeatFxContext {
  target: FxTarget;
  bpm: number;
}

/** Map stutter slider → note divisions per beat (higher = faster). */
export function stutterDivisionFromParam(stutterRate: number): number {
  const divisions = [2, 4, 8, 16];
  const idx = Math.min(divisions.length - 1, Math.floor(stutterRate * divisions.length));
  return divisions[idx]!;
}

/** Gate rate in Hz for SendFx stutter LFO at a given BPM. */
export function stutterHzFromParam(stutterRate: number, bpm: number): number {
  return (Math.max(40, bpm) / 60) * stutterDivisionFromParam(stutterRate);
}

/** Beat-slice length in seconds for ROLL delay time. */
export function rollSliceSecFromParam(rollLength: number, bpm: number): number {
  const beatSec = 60 / Math.max(40, bpm); // quarter note
  const divisors = [1, 2, 4, 8]; // 1/4 → 1/32 note
  const idx = Math.min(divisors.length - 1, Math.floor(rollLength * divisors.length));
  return beatSec / divisors[idx]!;
}

const ECHO_DIVISIONS = ['1/4', '1/8', '1/8T', '1/16'] as const;

class BeatFxManager {
  private _ctx: AudioContext | null = null;
  private _active: BeatFxId | null = null;
  private _target: FxTarget = 'master';
  private _bpm = 120;

  params: BeatFxParams = {
    throwSize: 0.6,
    echoFeedback: 0.65,
    chokeFreq: 0.2,
    noiseVol: 0.35,
    noiseCut: 0.8,
    stutterRate: 0.5,
    rollLength: 0.3,
  };

  // THROW / ECHO send state
  private _savedSends = new Map<number, { rev: number; del: number }>();
  private _throwPreLevel = 0;
  private _throwPreDelayLevel = 0;
  private _throwDidStart = false;

  // ECHO state
  private _echoPreFeedback: number | null = null;
  private _echoPreDelayLevel: number | null = null;
  private _echoPreDivision: string | null = null;
  private _echoRestoreTimer: ReturnType<typeof setTimeout> | null = null;

  // CHOKE state
  private _chokeUsedMaster = false;
  private _chokeChannels: number[] = [];

  // NOISE duck
  private _noiseDucked = false;
  private _noisePrePadVol = 1;

  // ROLL nodes
  private _rollTapGain: GainNode | null = null;
  private _rollDelay: DelayNode | null = null;
  private _rollFeedback: GainNode | null = null;
  private _rollWet: GainNode | null = null;
  private _rollSourceConnected: AudioNode | null = null;

  /** Call once after AudioEngine.init() succeeds. Safe to call multiple times. */
  connect(): void {
    const ctx = audioEngine.getAudioContext();
    if (!ctx || this._ctx) return;
    this._ctx = ctx;
    this._buildRoll(ctx);
  }

  /** Route + tempo for the next held effect (Performance Pad → melody, sidebar → master). */
  setContext(ctx: Partial<BeatFxContext>): void {
    if (ctx.target !== undefined) this._target = ctx.target;
    if (ctx.bpm !== undefined) this._bpm = Math.max(40, Math.min(300, ctx.bpm));
  }

  get activeEffect(): BeatFxId | null { return this._active; }

  startEffect(id: BeatFxId): void {
    if (this._active && this._active !== id) this.stopEffect(this._active);
    this._active = id;
    switch (id) {
      case 'throw':   this._startThrow(); break;
      case 'echo':    this._startEcho(); break;
      case 'choke':   this._startChoke(); break;
      case 'noise':   this._startNoise(); break;
      case 'stutter': this._startStutter(); break;
      case 'roll':    this._startRoll(); break;
    }
  }

  stopEffect(id: BeatFxId): void {
    if (this._active === id) this._active = null;
    switch (id) {
      case 'throw':   this._stopThrow(); break;
      case 'echo':    this._stopEcho(); break;
      case 'choke':   this._stopChoke(); break;
      case 'noise':   this._stopNoise(); break;
      case 'stutter': this._stopStutter(); break;
      case 'roll':    this._stopRoll(); break;
    }
  }

  /** Apply live param changes while an effect is held. */
  setParam(id: BeatFxId, key: keyof BeatFxParams, value: number): void {
    (this.params as unknown as Record<string, number>)[key] = value;
    if (this._active !== id || !this._ctx) return;
    const now = this._ctx.currentTime;
    if (id === 'choke' && key === 'chokeFreq') {
      const hz = 80 + value * 1920;
      if (this._chokeUsedMaster) {
        audioEngine.getChokeFilter()?.frequency.setTargetAtTime(hz, now, 0.02);
      } else {
        for (const ch of this._chokeChannels) {
          audioEngine.setChannelFilter(ch, 'lowpass', hz, 1.4);
        }
        if (this._target === 'melody') {
          melodyEngine.sweepLiveFilter(hz, 0.35);
        } else if (this._target === 'bass') {
          bassEngine.sweepLiveFilter(hz, 0.35);
        }
      }
    }
    if (id === 'stutter' && key === 'stutterRate') {
      audioEngine.stopStutter();
      audioEngine.startStutter(stutterHzFromParam(value, this._bpm));
    }
    if (id === 'roll' && key === 'rollLength') {
      this._rollDelay?.delayTime.setTargetAtTime(rollSliceSecFromParam(value, this._bpm), now, 0.02);
    }
  }

  private _targetChannels(): number[] {
    return getSendChannels(this._target);
  }

  private _saveSends(channels: number[]): void {
    this._savedSends.clear();
    for (const ch of channels) {
      this._savedSends.set(ch, {
        rev: audioEngine.getChannelReverbSend(ch),
        del: audioEngine.getChannelDelaySend(ch),
      });
    }
  }

  private _restoreSends(): void {
    for (const [ch, saved] of this._savedSends) {
      audioEngine.setChannelReverbSend(ch, saved.rev);
      audioEngine.setChannelDelaySend(ch, saved.del);
    }
    this._savedSends.clear();
  }

  private _boostSends(channels: number[], revMin: number, delMin: number): void {
    for (const ch of channels) {
      const saved = this._savedSends.get(ch);
      const rev = saved?.rev ?? audioEngine.getChannelReverbSend(ch);
      const del = saved?.del ?? audioEngine.getChannelDelaySend(ch);
      audioEngine.setChannelReverbSend(ch, Math.min(1, Math.max(rev, revMin)));
      audioEngine.setChannelDelaySend(ch, Math.min(1, Math.max(del, delMin)));
    }
  }

  // ── THROW — Reverb + send flood ────────────────────────────────────────

  private _startThrow(): void {
    const channels = this._targetChannels();
    this._saveSends(channels);
    this._boostSends(channels, 0.82, 0.42);

    this._throwPreLevel = audioEngine.getReverbLevel();
    this._throwPreDelayLevel = audioEngine.getDelayLevel();
    this._throwDidStart = true;

    audioEngine.setReverbSize(2 + this.params.throwSize * 4);
    audioEngine.setReverbPreDelay(40 + this.params.throwSize * 60);
    audioEngine.setReverbLevelSmooth(1.15, 0.06);
    audioEngine.setDelayLevelSmooth(Math.max(this._throwPreDelayLevel, 0.55), 0.08);
  }

  private _stopThrow(): void {
    if (!this._throwDidStart) return;
    this._throwDidStart = false;
    this._restoreSends();
    audioEngine.setReverbLevelSmooth(this._throwPreLevel, 0.45);
    audioEngine.setDelayLevelSmooth(this._throwPreDelayLevel, 0.35);
    audioEngine.setReverbSize(2.5);
    audioEngine.setReverbPreDelay(20);
  }

  // ── ECHO — BPM delay + feedback ────────────────────────────────────────

  private _startEcho(): void {
    if (this._echoRestoreTimer) {
      clearTimeout(this._echoRestoreTimer);
      this._echoRestoreTimer = null;
    }

    const channels = this._targetChannels();
    this._saveSends(channels);
    this._boostSends(channels, 0.25, 0.78);

    const fbGain = audioEngine.getDelayFeedbackGain();
    if (fbGain && this._echoPreFeedback === null) {
      this._echoPreFeedback = fbGain.gain.value;
    }
    if (this._echoPreDelayLevel === null) {
      this._echoPreDelayLevel = audioEngine.getDelayLevel();
    }
    if (this._echoPreDivision === null) {
      this._echoPreDivision = audioEngine.getDelayDivision();
    }

    const divIdx = Math.min(
      ECHO_DIVISIONS.length - 1,
      Math.floor(this.params.echoFeedback * ECHO_DIVISIONS.length),
    );
    audioEngine.setDelayDivision(ECHO_DIVISIONS[divIdx]!, this._bpm);

    const targetFb = 0.52 + this.params.echoFeedback * 0.38;
    const now = this._ctx?.currentTime ?? 0;
    if (fbGain && this._ctx) {
      fbGain.gain.cancelScheduledValues(now);
      fbGain.gain.setValueAtTime(fbGain.gain.value, now);
      fbGain.gain.linearRampToValueAtTime(targetFb, now + 0.12);
    }
    audioEngine.setDelayLevelSmooth(0.9, 0.08);
  }

  private _stopEcho(): void {
    this._restoreSends();

    const fbGain = audioEngine.getDelayFeedbackGain();
    const now = this._ctx?.currentTime ?? 0;
    if (fbGain && this._ctx) {
      fbGain.gain.cancelScheduledValues(now);
      fbGain.gain.setValueAtTime(fbGain.gain.value, now);
      fbGain.gain.linearRampToValueAtTime(0, now + 0.35);
    }

    const restoreFb = this._echoPreFeedback ?? 0.35;
    const restoreLevel = this._echoPreDelayLevel ?? 0;
    const restoreDiv = this._echoPreDivision ?? '1/8';

    this._echoRestoreTimer = setTimeout(() => {
      const fb = audioEngine.getDelayFeedbackGain();
      if (fb) fb.gain.value = restoreFb;
      audioEngine.setDelayLevelSmooth(restoreLevel, 0.2);
      audioEngine.setDelayDivision(restoreDiv, this._bpm);
      this._echoPreFeedback = null;
      this._echoPreDelayLevel = null;
      this._echoPreDivision = null;
      this._echoRestoreTimer = null;
    }, 2200);
  }

  // ── CHOKE — target LP sweep ───────────────────────────────────────────

  private _startChoke(): void {
    const targetHz = 80 + this.params.chokeFreq * 1920;
    const channels = this._targetChannels();
    const useMaster = this._target === 'master' || this._target === 'drums' || channels.length > 4;

    this._chokeUsedMaster = useMaster;
    this._chokeChannels = useMaster ? [] : [...channels];

    if (useMaster) {
      const filter = audioEngine.getChokeFilter();
      if (!filter || !this._ctx) return;
      const now = this._ctx.currentTime;
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(20000, now);
      filter.frequency.linearRampToValueAtTime(targetHz, now + 0.16);
      return;
    }

    for (const ch of this._chokeChannels) {
      audioEngine.setChannelFilter(ch, 'lowpass', 20000, 0.8);
      audioEngine.setChannelFilter(ch, 'lowpass', targetHz, 1.6);
    }
    if (this._target === 'melody') {
      melodyEngine.sweepLiveFilter(targetHz, 0.45);
    } else if (this._target === 'bass') {
      bassEngine.sweepLiveFilter(targetHz, 0.45);
    }
  }

  private _stopChoke(): void {
    if (this._chokeUsedMaster) {
      const filter = audioEngine.getChokeFilter();
      if (!filter || !this._ctx) return;
      const now = this._ctx.currentTime;
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(20000, now + 0.12);
    } else {
      for (const ch of this._chokeChannels) {
        audioEngine.bypassChannelFilter(ch);
      }
      if (this._target === 'melody') {
        melodyEngine.sweepLiveFilter(14000, 0.2);
      } else if (this._target === 'bass') {
        bassEngine.sweepLiveFilter(8000, 0.2);
      }
    }
    this._chokeChannels = [];
    this._chokeUsedMaster = false;
  }

  // ── NOISE — SendFx wash + duck ─────────────────────────────────────────

  private _startNoise(): void {
    const vol = 0.06 + this.params.noiseVol * 0.24;
    audioEngine.startNoise(vol);

    if (this._target === 'melody' || this._target === 'bass') {
      this._noiseDucked = true;
      this._noisePrePadVol = 0.75;
      if (this._target === 'melody') melodyEngine.sweepLiveVolume(0.42);
      else bassEngine.sweepLiveVolume(0.42);
    }
  }

  private _stopNoise(): void {
    audioEngine.stopNoise();
    if (this._noiseDucked) {
      if (this._target === 'melody') melodyEngine.sweepLiveVolume(this._noisePrePadVol);
      else if (this._target === 'bass') bassEngine.sweepLiveVolume(this._noisePrePadVol);
      this._noiseDucked = false;
    }
  }

  // ── STUTTER — BPM-synced master gate ──────────────────────────────────

  private _startStutter(): void {
    audioEngine.startStutter(stutterHzFromParam(this.params.stutterRate, this._bpm));
  }

  private _stopStutter(): void {
    audioEngine.stopStutter();
  }

  // ── ROLL — BPM beat repeat ────────────────────────────────────────────

  private _buildRoll(ctx: AudioContext): void {
    const chokeFilter = audioEngine.getChokeFilter();
    if (!chokeFilter) return;

    this._rollTapGain = ctx.createGain();
    this._rollTapGain.gain.value = 1;

    this._rollDelay = ctx.createDelay(2);
    this._rollDelay.delayTime.value = 0.125;

    this._rollFeedback = ctx.createGain();
    this._rollFeedback.gain.value = 0;

    this._rollWet = ctx.createGain();
    this._rollWet.gain.value = 0;

    this._rollTapGain.connect(this._rollDelay);
    this._rollDelay.connect(this._rollFeedback);
    this._rollFeedback.connect(this._rollDelay);
    this._rollDelay.connect(this._rollWet);
    this._rollWet.connect(chokeFilter);
  }

  private _resolveRollSource(): AudioNode | null {
    if (this._target === 'melody') return melodyEngine.getOutput();
    if (this._target === 'bass') return bassEngine.getOutput();
    return audioEngine.getPumpGain();
  }

  private _connectRollSource(): void {
    const source = this._resolveRollSource();
    if (!source || !this._rollTapGain) return;
    if (this._rollSourceConnected === source) return;
    if (this._rollSourceConnected) {
      try { this._rollSourceConnected.disconnect(this._rollTapGain); } catch { /* ok */ }
    }
    source.connect(this._rollTapGain);
    this._rollSourceConnected = source;
  }

  private _startRoll(): void {
    if (!this._rollDelay || !this._rollFeedback || !this._rollWet || !this._ctx) return;
    this._connectRollSource();
    const now = this._ctx.currentTime;
    const slice = rollSliceSecFromParam(this.params.rollLength, this._bpm);
    this._rollDelay.delayTime.setValueAtTime(slice, now);
    this._rollFeedback.gain.setValueAtTime(0.72, now);
    this._rollWet.gain.cancelScheduledValues(now);
    this._rollWet.gain.setValueAtTime(0, now);
    this._rollWet.gain.linearRampToValueAtTime(0.82, now + 0.025);
  }

  private _stopRoll(): void {
    if (!this._rollFeedback || !this._rollWet || !this._ctx) return;
    const now = this._ctx.currentTime;
    const curFb = this._rollFeedback.gain.value;
    this._rollFeedback.gain.cancelScheduledValues(now);
    this._rollFeedback.gain.setValueAtTime(curFb, now);
    this._rollFeedback.gain.linearRampToValueAtTime(0, now + 0.04);

    this._rollWet.gain.cancelScheduledValues(now);
    this._rollWet.gain.setValueAtTime(this._rollWet.gain.value, now);
    this._rollWet.gain.linearRampToValueAtTime(0, now + 0.12);
  }
}

export const beatFxManager = new BeatFxManager();
