import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PerformancePadStepScheduler } from "./performancePadStepScheduler";

const mockCtx = { currentTime: 10.0 };
const scheduled: { midi: number; atTime: number; dur: number }[] = [];

vi.mock("../../audio/SchedulerClock", () => ({
  schedulerClock: {
    addListener: (fn: () => void) => {
      tickFn = fn;
      return () => { tickFn = null; };
    },
  },
}));

vi.mock("../../audio/AudioEngine", () => ({
  audioEngine: {
    getAudioContext: () => mockCtx,
  },
}));

vi.mock("../../store/drumStore", () => ({
  getDrumTransportStartTime: () => 8.0,
}));

let tickFn: (() => void) | null = null;

describe("PerformancePadStepScheduler", () => {
  beforeEach(() => {
    scheduled.length = 0;
    mockCtx.currentTime = 10.0;
  });

  afterEach(() => {
    new PerformancePadStepScheduler().stop();
  });

  it("schedules step notes on the audio clock within lookahead", () => {
    const sched = new PerformancePadStepScheduler();
    // loop = 2000ms, grid = 500ms → 4 steps; transport at 8s → next loop at 10s
    sched.start({
      stepNotes: [{ x: 0.5, y: 0.5, velocity: 0.8 }, null, null, null],
      gridMs: 500,
      loopDurationMs: 2000,
      xToMidi: () => 60,
      onNote: (midi, atTime, dur) => scheduled.push({ midi, atTime, dur }),
    });

    expect(sched.isRunning).toBe(true);
    tickFn?.();
    expect(scheduled.length).toBeGreaterThan(0);
    expect(scheduled[0]!.atTime).toBeGreaterThanOrEqual(10.005);
    sched.stop();
  });
});
