/**
 * Tempo-synced step-pattern scheduler for the Performance Pad.
 *
 * When drums are playing, step notes must use the same AudioContext clock as
 * the drum sequencer — setTimeout + performance.now() drifts and sounds loose.
 * This module schedules pad steps on SchedulerClock with a lookahead window,
 * anchored to getDrumTransportStartTime().
 */
import { schedulerClock } from "../../audio/SchedulerClock";
import { audioEngine } from "../../audio/AudioEngine";
import { getDrumTransportStartTime } from "../../store/drumStore";
import type { StepNote } from "../../store/performancePadStep";

const LOOKAHEAD_SEC = 0.2;
const MIN_SCHEDULE_AHEAD_SEC = 0.005;

export interface PadStepSchedulerOptions {
  stepNotes: (StepNote | null)[];
  gridMs: number;
  loopDurationMs: number;
  onNote: (midi: number, atTime: number, durationSec: number, velocity: number, y: number) => void;
  /** Called once at start with wall-clock anchor for the visual playhead. */
  onLoopWallStart?: (wallStartMs: number) => void;
  xToMidi: (x: number) => number;
}

export class PerformancePadStepScheduler {
  private options: PadStepSchedulerOptions | null = null;
  private unsubscribe: (() => void) | null = null;
  private loopStartAudio = 0;
  private scheduledKeys = new Set<string>();
  private _running = false;

  get isRunning(): boolean {
    return this._running;
  }

  start(options: PadStepSchedulerOptions): void {
    this.stop();
    this.options = options;
    this._running = true;
    this.scheduledKeys.clear();

    const ctx = audioEngine.getAudioContext();
    if (!ctx) {
      this._running = false;
      return;
    }

    const loopSec = options.loopDurationMs / 1000;
    const transportStart = getDrumTransportStartTime();
    const elapsed = ctx.currentTime - transportStart;
    const nextLoop = Math.ceil(Math.max(0, elapsed) / loopSec) * loopSec;
    this.loopStartAudio = transportStart + nextLoop;
    if (this.loopStartAudio < ctx.currentTime + MIN_SCHEDULE_AHEAD_SEC) {
      this.loopStartAudio += loopSec;
    }

    options.onLoopWallStart?.(
      performance.now() + (this.loopStartAudio - ctx.currentTime) * 1000,
    );

    this.unsubscribe = schedulerClock.addListener(() => this._tick());
    this._tick();
  }

  stop(): void {
    this._running = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.options = null;
    this.scheduledKeys.clear();
  }

  kick(): void {
    if (this._running) this._tick();
  }

  private _tick(): void {
    if (!this._running || !this.options) return;
    const ctx = audioEngine.getAudioContext();
    if (!ctx) return;

    const { stepNotes, gridMs, loopDurationMs, onNote, xToMidi } = this.options;
    const now = ctx.currentTime;
    const windowEnd = now + LOOKAHEAD_SEC;
    const loopSec = loopDurationMs / 1000;
    const gridSec = gridMs / 1000;
    const noteDur = Math.max(0.02, gridSec * 0.92);

    // Drop keys for iterations that are fully in the past.
    if (this.scheduledKeys.size > 512) {
      this.scheduledKeys.clear();
    }

    const firstIter = Math.floor((now - this.loopStartAudio) / loopSec) - 1;
    const lastIter = Math.ceil((windowEnd - this.loopStartAudio) / loopSec);

    for (let iter = firstIter; iter <= lastIter; iter++) {
      const iterStart = this.loopStartAudio + iter * loopSec;
      for (let i = 0; i < stepNotes.length; i++) {
        const note = stepNotes[i];
        if (!note) continue;

        const atTime = iterStart + i * gridSec;
        if (atTime < now - 0.001 || atTime >= windowEnd) continue;

        const key = `${iter}:${i}`;
        if (this.scheduledKeys.has(key)) continue;
        this.scheduledKeys.add(key);

        const midi = xToMidi(note.x);
        onNote(midi, Math.max(atTime, now + MIN_SCHEDULE_AHEAD_SEC), noteDur, note.velocity, note.y);
      }
    }
  }
}

export const padStepScheduler = new PerformancePadStepScheduler();
