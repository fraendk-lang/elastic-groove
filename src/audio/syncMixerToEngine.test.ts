import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncMixerToEngine, channelAudibleGain } from "./syncMixerToEngine";
import { audioEngine } from "./AudioEngine";
import type { ChannelMixState } from "../store/mixerBarStore";
import { faderToGain, GROUP_BUS_IDS } from "../store/mixerBarStore";

vi.mock("./AudioEngine", () => ({
  audioEngine: {
    setChannelVolume: vi.fn(),
    setChannelPan: vi.fn(),
    setChannelReverbSend: vi.fn(),
    setChannelDelaySend: vi.fn(),
    setChannelChorusSend: vi.fn(),
    setChannelPhaserSend: vi.fn(),
    setChannelEQ: vi.fn(),
    resetChannelEQ: vi.fn(),
    setGroupVolume: vi.fn(),
  },
}));

const baseCh = (over: Partial<ChannelMixState> = {}): ChannelMixState => ({
  fader: 750,
  muted: false,
  soloed: false,
  pan: 0,
  eqOn: false,
  eqLo: 0,
  eqMid: 0,
  eqHi: 0,
  sendRev: 10,
  sendDly: 5,
  sendCh: 0,
  sendPh: 0,
  ...over,
});

describe("channelAudibleGain", () => {
  it("returns 0 when muted with no solo", () => {
    const ch = baseCh({ muted: true });
    expect(channelAudibleGain(ch, 0, new Set())).toBe(0);
  });

  it("respects solo — muted solo channel stays silent", () => {
    const ch = baseCh({ soloed: true, muted: true });
    expect(channelAudibleGain(ch, 1, new Set([1]))).toBe(0);
  });

  it("returns fader gain for soloed unmuted channel", () => {
    const ch = baseCh({ soloed: true, fader: 750 });
    expect(channelAudibleGain(ch, 2, new Set([2]))).toBeCloseTo(faderToGain(750));
  });
});

describe("syncMixerToEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pushes pan, sends, and EQ to audioEngine", () => {
    const channels = [baseCh({ pan: -0.5, sendRev: 40, sendDly: 20, eqOn: true, eqLo: 3 })];
    const groupBuses = Object.fromEntries(
      GROUP_BUS_IDS.map((id) => [id, { fader: 750, muted: false }]),
    ) as Record<(typeof GROUP_BUS_IDS)[number], { fader: number; muted: boolean }>;

    syncMixerToEngine(channels, groupBuses);

    expect(audioEngine.setChannelPan).toHaveBeenCalledWith(0, -0.5);
    expect(audioEngine.setChannelReverbSend).toHaveBeenCalledWith(0, 0.4);
    expect(audioEngine.setChannelDelaySend).toHaveBeenCalledWith(0, 0.2);
    expect(audioEngine.setChannelEQ).toHaveBeenCalledWith(0, "lo", 3);
    expect(audioEngine.resetChannelEQ).not.toHaveBeenCalled();
  });

  it("resets EQ when eqOn is false", () => {
    syncMixerToEngine([baseCh({ eqOn: false })], {} as never);
    expect(audioEngine.resetChannelEQ).toHaveBeenCalledWith(0);
  });
});
