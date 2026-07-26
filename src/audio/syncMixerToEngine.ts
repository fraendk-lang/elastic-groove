/**
 * Push mixerBarStore state → Web Audio engine (single sync path).
 */
import { audioEngine } from "./AudioEngine";
import {
  faderToGain,
  GROUP_BUS_IDS,
  type ChannelMixState,
  type GroupBusId,
  type GroupBusState,
} from "../store/mixerBarStore";

/** Effective channel gain respecting mute + solo (AFL-style: solo wins, muted solo = silent). */
export function channelAudibleGain(
  ch: ChannelMixState,
  channelIndex: number,
  soloedIndices: ReadonlySet<number>,
): number {
  if (soloedIndices.size > 0) {
    if (!soloedIndices.has(channelIndex) || ch.muted) return 0;
    return faderToGain(ch.fader);
  }
  return ch.muted ? 0 : faderToGain(ch.fader);
}

/** Apply full mixer state to audioEngine. Safe to call after session restore or any store update. */
export function syncMixerToEngine(
  channels: ChannelMixState[],
  groupBuses: Record<GroupBusId, GroupBusState>,
): void {
  const soloed = new Set<number>();
  channels.forEach((ch, i) => {
    if (ch.soloed) soloed.add(i);
  });

  channels.forEach((ch, i) => {
    audioEngine.setChannelVolume(i, channelAudibleGain(ch, i, soloed));
    audioEngine.setChannelPan(i, ch.pan);
    audioEngine.setChannelReverbSend(i, ch.sendRev / 100);
    audioEngine.setChannelDelaySend(i, ch.sendDly / 100);
    audioEngine.setChannelChorusSend(i, (ch.sendCh ?? 0) / 100);
    audioEngine.setChannelPhaserSend(i, (ch.sendPh ?? 0) / 100);

    if (ch.eqOn) {
      audioEngine.setChannelEQ(i, "lo", ch.eqLo);
      audioEngine.setChannelEQ(i, "mid", ch.eqMid);
      audioEngine.setChannelEQ(i, "hi", ch.eqHi);
    } else {
      audioEngine.resetChannelEQ(i);
    }
  });

  for (const id of GROUP_BUS_IDS) {
    const bus = groupBuses[id];
    if (!bus) continue;
    audioEngine.setGroupVolume(id, bus.muted ? 0 : faderToGain(bus.fader));
  }
}
