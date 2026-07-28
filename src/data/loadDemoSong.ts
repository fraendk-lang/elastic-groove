/**
 * Demo Song Loader — applies a DemoSong to all engine stores.
 *
 * Critical: rootName is converted to the right MIDI value per engine
 * (bass uses C2=36 base, chords/melody use C3=48 base) so the patterns
 * play in their natural register. Earlier versions used the 0-11 note
 * class directly, which made the bass play at sub-audible MIDI 9 (A0).
 */

import { useDrumStore } from "../store/drumStore";
import { useBassStore, BASS_PRESETS } from "../store/bassStore";
import { useChordsStore, CHORDS_PRESETS } from "../store/chordsStore";
import { useMelodyStore, MELODY_PRESETS } from "../store/melodyStore";
import { useMelodyLayerStore } from "../store/melodyLayerStore";
import { usePerformancePadStore } from "../store/performancePadStore";
import { useMixerBarStore } from "../store/mixerBarStore";
import { applyKit, kitToPattern } from "../kits/KitManager";
import { FACTORY_KITS } from "../kits/factoryKits";
import { NOTE_CLASS, type DemoSong } from "./demoSongs";

const BASS_OCTAVE_MIDI = 36;    // C2 — matches BassEngine register
const CHORDS_OCTAVE_MIDI = 48;  // C3 — matches ChordsEngine register
const MELODY_OCTAVE_MIDI = 48;  // C3 — matches MelodyEngine default register

export interface LoadDemoSongResult {
  hint?: string;
}

export function loadDemoSong(song: DemoSong, opts: { autoPlay?: boolean } = {}): LoadDemoSongResult {
  const autoPlay = opts.autoPlay ?? true;
  const noteClass = NOTE_CLASS[song.rootName] ?? 0;

  // ── 1. Stop transport ────────────────────────────────────
  const drum = useDrumStore.getState();
  if (drum.isPlaying) drum.togglePlay();

  // ── 1b. Clean pad / melody-layer state (auto-save leftovers) ──
  // Without this, old L3 patterns keep playing on top of the demo — sounds 2× fast/busy.
  const layerStore = useMelodyLayerStore.getState();
  layerStore.setEnabled(false);
  for (const layer of layerStore.layers) {
    layerStore.clearNotes(layer.id);
  }
  usePerformancePadStore.getState().clearStepPattern();
  useMelodyStore.getState().setStepNoteValue("1/16");

  // ── 2. Apply kit (samples + voice params + mixer + master FX) + drum pattern ──
  const kit = FACTORY_KITS.find((k) => k.id === song.kitId);
  if (kit) {
    applyKit(kit);
    const drumPattern = kitToPattern(
      song.drumPattern ? { ...kit, pattern: song.drumPattern } : kit,
    );
    if (drumPattern) {
      useDrumStore.setState({
        pattern: drumPattern,
        bpm: song.bpm,
        currentPatternIndex: -1,
      });
    } else {
      useDrumStore.setState({ bpm: song.bpm });
    }
  } else {
    useDrumStore.setState({ bpm: song.bpm });
    console.warn(`[loadDemoSong] Kit not found: ${song.kitId}`);
  }

  // ── 3. Swing override ────────────────────────────────────
  if (song.swing !== undefined) {
    useDrumStore.getState().setSwing(song.swing);
  }

  // ── 4. Bass — preset + steps with proper bass-register root ──
  if (song.bassPresetName) {
    const idx = BASS_PRESETS.findIndex((p) => p.name === song.bassPresetName);
    if (idx >= 0) {
      const bassState = useBassStore.getState();
      bassState.setLiveTransposeOffset(0);
      bassState.loadPreset(idx);
      if (song.bassSteps) {
        bassState.loadBassPattern({
          steps: song.bassSteps,
          length: song.bassLength ?? song.bassSteps.length,
          params: useBassStore.getState().params,
          rootNote: BASS_OCTAVE_MIDI + noteClass,
          rootName: song.rootName,
          scaleName: song.scaleName,
        });
      }
    } else {
      console.warn(`[loadDemoSong] Bass preset not found: ${song.bassPresetName}`);
    }
  }

  // ── 5. Chords — preset + steps with proper chord-register root ──
  if (song.chordsPresetName) {
    const idx = CHORDS_PRESETS.findIndex((p) => p.name === song.chordsPresetName);
    if (idx >= 0) {
      const chordsState = useChordsStore.getState();
      chordsState.loadPreset(idx);
      if (song.chordsSteps) {
        chordsState.loadChordsPattern({
          steps: song.chordsSteps,
          length: song.chordsLength ?? song.chordsSteps.length,
          params: useChordsStore.getState().params,
          rootNote: CHORDS_OCTAVE_MIDI + noteClass,
          rootName: song.rootName,
          scaleName: song.scaleName,
        });
      }
    } else {
      console.warn(`[loadDemoSong] Chords preset not found: ${song.chordsPresetName}`);
    }
  }

  // ── 6. Melody — preset + hook pattern ───────────────────
  if (song.melodyPresetName) {
    const idx = MELODY_PRESETS.findIndex((p) => p.name === song.melodyPresetName);
    if (idx >= 0) {
      const melodyState = useMelodyStore.getState();
      melodyState.setLiveTransposeOffset(0);
      melodyState.loadPreset(idx);
      if (song.melodySteps) {
        melodyState.loadMelodyPattern({
          steps: song.melodySteps,
          length: song.melodyLength ?? song.melodySteps.length,
          params: useMelodyStore.getState().params,
          rootNote: MELODY_OCTAVE_MIDI + noteClass,
          rootName: song.rootName,
          scaleName: song.scaleName,
        });
      }
    } else {
      console.warn(`[loadDemoSong] Melody preset not found: ${song.melodyPresetName}`);
    }
  }

  // ── 7. Apply mixer fader overrides ──────────────────────
  // Channels: 12 = bass, 13 = chords, 14 = melody/lead
  const { setFader, setGroupFader } = useMixerBarStore.getState();
  setGroupFader("bass", 680);
  if (song.faderOverrides) {
    for (const [chStr, fader] of Object.entries(song.faderOverrides)) {
      setFader(Number(chStr), fader);
    }
  }

  // ── 8. Auto-play after a short settle delay ─────────────
  if (autoPlay) {
    setTimeout(() => {
      if (!useDrumStore.getState().isPlaying) {
        useDrumStore.getState().togglePlay();
      }
    }, 120);
  }

  return {};
}
