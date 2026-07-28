/**
 * L1 / L2 / L3 quick access above the mixer — select layer, mute, L3 pattern preview.
 */
import { useState } from "react";
import { useSyncExternalStore } from "react";
import { useMelodyLayerStore, LAYER_COLORS } from "../../store/melodyLayerStore";
import { useMixerBarStore } from "../../store/mixerBarStore";
import { useDrumStore } from "../../store/drumStore";
import { melodyLayerStepStore, getLayerLocalStep } from "./melodyLayerScheduler";
import { layerNotesToStepGrid, pitchToStepHeight, MELODY_PAD_LAYER_INDEX } from "./layerNotesToStepGrid";
import { downloadBeatNotesMidi } from "../../utils/midiExport";
import { melodyLayerNotesToBeatMidi } from "../PerformancePad/performancePadMidiExport";
import { clearL3PadPattern } from "../PerformancePad/clearPadMelodyLayer";

const LAYER_MIXER_CH = [24, 25, 26] as const;
const MAX_VISIBLE_STEPS = 24;

interface Props {
  onOpenPad?: () => void;
}

export function MelodyLayerQuickStrip({ onOpenPad }: Props) {
  const enabled = useMelodyLayerStore((s) => s.enabled);
  const layers = useMelodyLayerStore((s) => s.layers);
  const activeId = useMelodyLayerStore((s) => s.activeLayerId);
  const setActiveLayer = useMelodyLayerStore((s) => s.setActiveLayer);
  const setEnabled = useMelodyLayerStore((s) => s.setEnabled);
  const updateLayer = useMelodyLayerStore((s) => s.updateLayer);
  const setMute = useMixerBarStore((s) => s.setMute);
  const channels = useMixerBarStore((s) => s.channels);
  const isPlaying = useDrumStore((s) => s.isPlaying);
  const bpm = useDrumStore((s) => s.bpm);
  const stepSnap = useSyncExternalStore(
    melodyLayerStepStore.subscribe,
    melodyLayerStepStore.getSnapshot,
  );

  const padLayer = layers[MELODY_PAD_LAYER_INDEX];
  const hasL3Notes = !!padLayer && padLayer.notes.length > 0;
  const [l3Expanded, setL3Expanded] = useState(true);

  if (layers.length === 0 && !hasL3Notes) return null;

  const l3Color = padLayer ? LAYER_COLORS[padLayer.colorIndex] : "#a78bfa";
  const grid = hasL3Notes ? layerNotesToStepGrid(padLayer!.notes, padLayer!.barLength) : [];
  const visible = grid.length > MAX_VISIBLE_STEPS ? grid.slice(0, MAX_VISIBLE_STEPS) : grid;
  const playhead = isPlaying && padLayer
    ? getLayerLocalStep(MELODY_PAD_LAYER_INDEX, padLayer.barLength)
    : null;
  const playheadVisible = playhead !== null && playhead < visible.length ? playhead : null;

  const exportL3Midi = () => {
    if (!padLayer) return;
    const notes = melodyLayerNotesToBeatMidi(padLayer.notes);
    downloadBeatNotesMidi(notes, bpm, `melody-layer-l3-${Date.now()}`, "Melody Layer L3");
  };

  const handleClearL3 = () => {
    if (!window.confirm("L3 Pattern löschen? Stoppt den Sound — auch nach Neustart weg.")) return;
    clearL3PadPattern(true);
    setL3Expanded(false);
  };

  return (
    <div className="flex flex-col border-b border-white/[0.06] bg-[#0a0a0a]/80">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="text-[8px] font-bold text-white/35 tracking-wider shrink-0">MELODY LAYERS</span>
        {!enabled && (
          <button
            type="button"
            onClick={() => setEnabled(true)}
            className="text-[8px] px-1.5 py-0.5 rounded bg-[#a78bfa]/20 text-[#c4b5fd] hover:bg-[#a78bfa]/30"
          >
            ON
          </button>
        )}
        {[0, 1, 2].map((i) => {
          const layer = layers[i];
          if (!layer) return null;
          const color = LAYER_COLORS[layer.colorIndex];
          const isActive = layer.id === activeId;
          const mixerMuted = channels[LAYER_MIXER_CH[i]!]?.muted ?? false;
          const hasNotes = layer.notes.length > 0;
          const isL3 = i === MELODY_PAD_LAYER_INDEX;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => {
                setEnabled(true);
                setActiveLayer(layer.id);
                if (isL3 && hasNotes) setL3Expanded(true);
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                const next = !layer.muted;
                updateLayer(layer.id, { muted: next });
                setMute(LAYER_MIXER_CH[i]!, next);
              }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                isActive ? "ring-1 ring-white/40" : "opacity-80 hover:opacity-100"
              }`}
              style={{
                background: `${color}${isActive ? "28" : "14"}`,
                color,
              }}
              title={`L${i + 1}${hasNotes ? ` · ${layer.notes.length} Noten` : ""} — Doppelklick: Mute`}
            >
              L{i + 1}
              {mixerMuted || layer.muted ? " M" : hasNotes ? " ●" : ""}
            </button>
          );
        })}

        {hasL3Notes && (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setL3Expanded((v) => !v)}
              className="px-2 py-0.5 text-[8px] font-bold rounded bg-white/5 text-white/50 hover:text-white/75"
              title="L3 Pattern ein-/ausklappen"
            >
              {l3Expanded ? "▾ L3" : "▸ L3"}
            </button>
            {onOpenPad && (
              <button
                type="button"
                onClick={onOpenPad}
                className="px-2 py-0.5 text-[8px] font-bold rounded bg-[#a78bfa]/15 text-[#c4b5fd] hover:bg-[#a78bfa]/25"
              >
                PAD
              </button>
            )}
          </div>
        )}
      </div>

      {hasL3Notes && l3Expanded && padLayer && (
        <div className="px-2 pb-2 flex flex-col gap-1.5">
          <p className="text-[8px] text-white/45 leading-snug">
            L3 spielt mit den Drums mit (auch wenn das Pad zu ist).
            {" "}<span className="text-white/60">↓ MIDI</span> = exportieren · L3 im Mixer = Lautstärke
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-[2px] min-w-0 flex-1">
              {visible.map((pitch, i) => {
                const isPlayhead = i === playheadVisible;
                const isBeat = i % 4 === 0;
                return (
                  <div
                    key={i}
                    className={`relative flex-1 min-w-[4px] max-w-[12px] h-6 rounded-sm ${
                      isPlayhead ? "ring-1 ring-white/70" : ""
                    }`}
                    style={{
                      background: pitch !== null
                        ? `linear-gradient(to top, ${l3Color}90 ${pitchToStepHeight(pitch) * 100}%, rgba(255,255,255,0.06) 0%)`
                        : isBeat ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                    }}
                    title={pitch !== null ? `Step ${i + 1}` : `Step ${i + 1} (Pause)`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={exportL3Midi}
              className="shrink-0 px-2 py-0.5 text-[9px] font-bold rounded bg-[var(--ed-accent-melody)]/15 text-[var(--ed-accent-melody)] hover:bg-[var(--ed-accent-melody)]/25"
            >
              ↓ MIDI
            </button>
            <button
              type="button"
              onClick={handleClearL3}
              className="shrink-0 px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/10 text-red-400/90 hover:bg-red-500/20"
              title="L3 + Pad-Steps löschen"
            >
              ✕ L3
            </button>
          </div>
          {grid.length > MAX_VISIBLE_STEPS && (
            <span className="text-[7px] text-white/35 font-mono">
              +{grid.length - MAX_VISIBLE_STEPS} steps · {padLayer.barLength} bar · {padLayer.notes.length} Noten
            </span>
          )}
          {isPlaying && (
            <span className="sr-only">{stepSnap.steps[MELODY_PAD_LAYER_INDEX]}</span>
          )}
        </div>
      )}
    </div>
  );
}
