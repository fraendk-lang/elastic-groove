/**
 * Preview a factory kit groove for ~1 bar without permanently leaving the browser.
 */
import { useDrumStore } from "../store/drumStore";
import { applyKit, kitToPattern, type DrumKit } from "./KitManager";
import { stopMelodyPlayback } from "../utils/stopMelodyPlayback";

let previewTimer: ReturnType<typeof setTimeout> | null = null;
let previewRestore: (() => void) | null = null;

export function cancelKitPreview(): void {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  if (previewRestore) {
    previewRestore();
    previewRestore = null;
  }
}

/** Audition kit voices + pattern for one bar, then restore prior drum state. */
export function previewKitGroove(kit: DrumKit): void {
  cancelKitPreview();
  stopMelodyPlayback();

  const snap = {
    pattern: structuredClone(useDrumStore.getState().pattern),
    bpm: useDrumStore.getState().bpm,
    wasPlaying: useDrumStore.getState().isPlaying,
  };

  applyKit(kit);
  const pattern = kitToPattern(kit);
  if (!pattern) return;

  const bpm = Math.round((kit.bpmRange[0] + kit.bpmRange[1]) / 2);
  useDrumStore.setState({ pattern, bpm, currentPatternIndex: -1 });

  if (!useDrumStore.getState().isPlaying) {
    useDrumStore.getState().togglePlay();
  }

  previewRestore = () => {
    const { isPlaying, togglePlay } = useDrumStore.getState();
    if (isPlaying && !snap.wasPlaying) togglePlay();
    useDrumStore.setState({ pattern: snap.pattern, bpm: snap.bpm });
    if (snap.wasPlaying && !useDrumStore.getState().isPlaying) togglePlay();
  };

  previewTimer = setTimeout(() => {
    previewTimer = null;
    cancelKitPreview();
  }, (60000 / bpm) * 4);
}
