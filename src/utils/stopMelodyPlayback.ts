/**
 * Stop all melody audio paths — main synth, L1–L3 layers, SoundFont, pad loop.
 * Does not erase sequencer patterns unless callers clear stores separately.
 */
import { audioEngine } from "../audio/AudioEngine";
import { melodyEngine } from "../audio/MelodyEngine";
import { melodyLayerEngines } from "../audio/melodyLayerEngines";
import { soundFontEngine } from "../audio/SoundFontEngine";
import { stopPianoRollPlayback } from "../components/PianoRoll/scheduler";
import { useMelodyLayerStore } from "../store/melodyLayerStore";
import { usePerformancePadStore } from "../store/performancePadStore";

export function panicAllMelodyEngines(): void {
  const ctx = audioEngine.getAudioContext();
  const t = ctx?.currentTime;
  melodyEngine.panic(t);
  for (let i = 1; i < melodyLayerEngines.length; i++) {
    melodyLayerEngines[i]!.panic(t);
  }
  if (soundFontEngine.isLoaded("melody")) {
    soundFontEngine.stopAll("melody");
  }
  stopPianoRollPlayback();
}

export interface StopMelodyPlaybackOptions {
  /** Turn off L1–L3 scheduler (patterns stay in store). Default true. */
  disableMelodyLayers?: boolean;
  /** Stop Performance Pad background loop. Default true. */
  stopPadLoop?: boolean;
}

export function stopMelodyPlayback(options: StopMelodyPlaybackOptions = {}): void {
  const { disableMelodyLayers = true, stopPadLoop = true } = options;
  panicAllMelodyEngines();
  if (stopPadLoop) {
    usePerformancePadStore.getState().stopLoop();
  }
  if (disableMelodyLayers) {
    useMelodyLayerStore.getState().setEnabled(false);
  }
}
