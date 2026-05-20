/**
 * FxPanel — Fullscreen Performance FX Overlay
 *
 * Kaoss Pad-style XY controller + Beat FX buttons.
 * Completely rewritten with musical parameter mapping, BPM sync, and proper audio algorithms.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { audioEngine } from "../audio/AudioEngine";
import { useDrumStore } from "../store/drumStore";
import { motionRecorder, type MotionRecording } from "../audio/MotionRecorder";
import {
  type FxTarget, type FxMode,
  FX_TARGETS, MODE_CONFIG, FX_MODES, FX_MODE_PRESETS,
  KAOSS_AUTO_SEND,
  getSendChannels, getMusicalValue,
  applyFxMode, activateFxMode, releaseFxMode,
  chaosFxBus,
} from "../audio/ChaosFxBus";
import { ChaosPad } from "./ChaosPad";

interface FxPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Compact SVG icons — each tells you at a glance what the FX does
function ModeIcon({ mode, color }: { mode: FxMode; color: string }) {
  const stroke = color;
  const strokeWidth = 1.6;
  const common = { fill: "none", stroke, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (mode) {
    case "FILTER": // Lowpass curve rolling off on the right
      return (
        <svg viewBox="0 0 28 14" className="w-5 h-[12px]" aria-hidden>
          <path d="M 1 7 L 13 7 Q 17 7 19 4 T 27 13" {...common} />
        </svg>
      );
    case "DELAY": // Repeating echoes — decreasing amplitude
      return (
        <svg viewBox="0 0 28 14" className="w-5 h-[12px]" aria-hidden>
          <line x1="3" y1="3" x2="3" y2="11" {...common} />
          <line x1="10" y1="4" x2="10" y2="10" {...common} />
          <line x1="16" y1="5" x2="16" y2="9" {...common} />
          <line x1="21" y1="6" x2="21" y2="8" {...common} />
          <line x1="25" y1="6.5" x2="25" y2="7.5" {...common} />
        </svg>
      );
    case "REVERB": // Exponential decay curve
      return (
        <svg viewBox="0 0 28 14" className="w-5 h-[12px]" aria-hidden>
          <path d="M 2 11 Q 2 2 4 2 L 26 11" {...common} />
          <path d="M 6 11 Q 6 6 8 6" {...common} opacity="0.5" />
        </svg>
      );
    case "FLANGER": // Zig-zag comb-sweep
      return (
        <svg viewBox="0 0 28 14" className="w-5 h-[12px]" aria-hidden>
          <path d="M 2 7 Q 5 2 8 7 T 14 7 T 20 7 T 26 7" {...common} />
        </svg>
      );
    case "CRUSH": // Stepped staircase (bit reduction)
      return (
        <svg viewBox="0 0 28 14" className="w-5 h-[12px]" aria-hidden>
          <path d="M 1 11 L 5 11 L 5 8 L 11 8 L 11 5 L 17 5 L 17 8 L 23 8 L 23 11 L 27 11" {...common} />
        </svg>
      );
    case "PHASER": // Phase-shifted double wave
      return (
        <svg viewBox="0 0 28 14" className="w-5 h-[12px]" aria-hidden>
          <path d="M 1 7 Q 5 1 9 7 T 17 7 T 25 7" {...common} />
          <path d="M 1 7 Q 5 13 9 7 T 17 7 T 25 7" {...common} opacity="0.4" />
        </svg>
      );
    case "CHORUS": // Three parallel waves
      return (
        <svg viewBox="0 0 28 14" className="w-5 h-[12px]" aria-hidden>
          <path d="M 1 4 Q 7 1 13 4 T 25 4" {...common} />
          <path d="M 1 7 Q 7 4 13 7 T 25 7" {...common} opacity="0.65" />
          <path d="M 1 10 Q 7 7 13 10 T 25 10" {...common} opacity="0.35" />
        </svg>
      );
  }
}

// ─── Beat FX Definitions ─────────────────────────────────

interface BeatFx {
  label: string;
  color: string;
  activate: (bpm: number) => void;
  deactivate: (bpm: number) => void;
  _savedGain?: number;
  _sweepTimer?: ReturnType<typeof setInterval> | null;
  _divIndex?: number;
}

function createBeatFxList(): BeatFx[] {
  return [
    {
      label: "ROLL",
      color: "#f59e0b",
      _divIndex: 0,
      activate: function (bpm: number) {
        const divisions = [2, 4, 8];
        const rate = (bpm / 60) * divisions[this._divIndex! % divisions.length]!;
        this._divIndex = (this._divIndex ?? 0) + 1;
        audioEngine.startStutter(rate);
      },
      deactivate: () => {
        audioEngine.stopStutter();
      },
    },
    {
      label: "BRAKE",
      color: "#ef4444",
      _savedGain: 0.85,
      activate: function (bpm: number) {
        // Classic tape-stop brake: lowpass closes + gain dips, over 2 bars.
        // Not a full mute — leaves enough signal that the "crash-into-silence"
        // moment is audible as a dramatic slowdown rather than a dead cut.
        const masterGain = audioEngine.getMasterGainNode();
        if (masterGain) {
          this._savedGain = masterGain.gain.value;
          const now = audioEngine.currentTime;
          const rampTime = (60 / bpm) * 2; // 2 beats = classic brake length
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setValueAtTime(masterGain.gain.value, now);
          masterGain.gain.linearRampToValueAtTime(0.12, now + rampTime);
        }
        // Close the master lowpass to simulate the "tape slowing down" tonal loss
        audioEngine.setMasterFilter("lowpass", 8000, 0.7);
        const sweepBeats = (60 / bpm) * 2;
        let freq = 8000;
        const stepMs = 60;
        const decayFactor = Math.pow(180 / 8000, stepMs / (sweepBeats * 1000));
        this._sweepTimer = setInterval(() => {
          freq = Math.max(180, freq * decayFactor);
          audioEngine.setMasterFilter("lowpass", freq, 0.7);
        }, stepMs);
      },
      deactivate: function () {
        if (this._sweepTimer) {
          clearInterval(this._sweepTimer);
          this._sweepTimer = null;
        }
        audioEngine.bypassMasterFilter();
        const masterGain = audioEngine.getMasterGainNode();
        if (masterGain) {
          const now = audioEngine.currentTime;
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setValueAtTime(masterGain.gain.value, now);
          masterGain.gain.linearRampToValueAtTime(this._savedGain ?? 0.85, now + 0.15);
        }
      },
    },
    {
      label: "BUILD",
      color: "#06b6d4",
      _sweepTimer: null,
      activate: function (bpm: number) {
        // Softer noise bed that benefits from the envelope in startNoise.
        // Filter now uses a smooth linear ramp via interval polling, but the
        // noise itself has its own attack sweep so the first beat isn't jarring.
        audioEngine.startNoise(0.10);
        audioEngine.setMasterFilter("highpass", 180, 1.2);
        const sweepDuration = (60 / bpm) * 16;
        let filterFreq = 180;
        const stepMs = 80;
        const step = (7500 - 180) / (sweepDuration * 1000 / stepMs);
        this._sweepTimer = setInterval(() => {
          filterFreq = Math.min(7500, filterFreq + step);
          // Resonance only near the top so build has tension but doesn't peak early
          const prog = (filterFreq - 180) / (7500 - 180);
          const q = 1 + prog * prog * 6;
          audioEngine.setMasterFilter("highpass", filterFreq, q);
        }, stepMs);
      },
      deactivate: function () {
        if (this._sweepTimer) {
          clearInterval(this._sweepTimer);
          this._sweepTimer = null;
        }
        audioEngine.stopNoise();
        audioEngine.bypassMasterFilter();
      },
    },
    {
      label: "NOISE",
      color: "#ffffff",
      activate: () => {
        // Use the engine's default (0.14) which includes filter envelope whoosh
        audioEngine.startNoise();
      },
      deactivate: () => {
        audioEngine.stopNoise();
      },
    },
    {
      label: "TAPE",
      color: "#a855f7",
      _savedGain: 0.85,
      activate: function (bpm: number) {
        // Faster than BRAKE — half-beat tape-stop feel. Gain dips to 0.18,
        // lowpass sweeps 8k → 400 Hz. Signal stays audible = dramatic "zip".
        const masterGain = audioEngine.getMasterGainNode();
        if (masterGain) {
          this._savedGain = masterGain.gain.value;
          const now = audioEngine.currentTime;
          const stopTime = (60 / bpm) * 0.75;
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setValueAtTime(masterGain.gain.value, now);
          masterGain.gain.linearRampToValueAtTime(0.18, now + stopTime);
        }
        audioEngine.setMasterFilter("lowpass", 8000, 0.8);
        const sweepMs = (60 / bpm) * 0.75 * 1000;
        let freq = 8000;
        const stepMs = 40;
        const decayFactor = Math.pow(400 / 8000, stepMs / sweepMs);
        this._sweepTimer = setInterval(() => {
          freq = Math.max(400, freq * decayFactor);
          audioEngine.setMasterFilter("lowpass", freq, 0.8);
        }, stepMs);
      },
      deactivate: function () {
        if (this._sweepTimer) {
          clearInterval(this._sweepTimer);
          this._sweepTimer = null;
        }
        audioEngine.bypassMasterFilter();
        const masterGain = audioEngine.getMasterGainNode();
        if (masterGain) {
          const now = audioEngine.currentTime;
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setValueAtTime(masterGain.gain.value, now);
          masterGain.gain.linearRampToValueAtTime(this._savedGain ?? 0.85, now + 0.15);
        }
      },
    },
    {
      label: "ECHO",
      color: "#3b82f6",
      activate: (bpm: number) => {
        // Dotted 8th delay with musical feedback amount + rolled-off filter
        // Previous 0.9/0.8 was borderline runaway — now 0.6/0.65 with
        // damped highs so repeats decay naturally instead of harsh.
        const beatSec = 60 / bpm;
        audioEngine.setDelayLevel(0.6);
        audioEngine.setDelayParams(beatSec * 0.75, 0.65, 3500);
      },
      deactivate: () => {
        audioEngine.setDelayLevel(0.3);
        audioEngine.setDelayParams(0.375, 0.4, 4000);
      },
    },
  ];
}

// ─── Component ───────────────────────────────────────────

export function FxPanel({ isOpen, onClose }: FxPanelProps) {
  const bpm = useDrumStore((s) => s.bpm);

  const [activeMode, setActiveMode] = useState<FxMode>("FILTER");
  const [fxTarget, setFxTarget] = useState<FxTarget>("master");
  const [holdMode, setHoldMode] = useState(false);
  const [holdLocked, setHoldLocked] = useState(false);
  const [padX, setPadX] = useState(0.5);
  const [padY, setPadY] = useState(0.5);
  const [activeBeatFx, setActiveBeatFx] = useState<Set<number>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingMotion, setIsPlayingMotion] = useState(false);
  const [recordings, setRecordings] = useState<MotionRecording[]>([]);

  const beatFxListRef = useRef(createBeatFxList());
  const savedSendsRef = useRef<{ channels: number[]; reverb: number[]; delay: number[] } | null>(null);

  const applyPadState = useCallback((x: number, y: number, latch = false) => {
    setPadX(x);
    setPadY(y);
    activateFxMode(activeMode, x, y, fxTarget, bpm);
    if (latch) {
      setHoldMode(true);
      setHoldLocked(true);
    }
  }, [activeMode, bpm, fxTarget]);

  const resetFxState = useCallback(() => {
    releaseFxMode(activeMode, fxTarget);
    beatFxListRef.current.forEach((fx, index) => {
      if (activeBeatFx.has(index)) fx.deactivate(bpm);
    });
    motionRecorder.stopPlayback();
    setIsPlayingMotion(false);
    setActiveBeatFx(new Set());
    setHoldLocked(false);
    setHoldMode(false);
    setPadX(0.5);
    setPadY(0.5);
  }, [activeBeatFx, activeMode, bpm, fxTarget]);

  // ─── XY Pad Handlers (ChaosPad adapters) ──────────────
  //
  // ChaosPad reports XY in raw canvas coordinates (y=0 at top, y=1 at bottom).
  // FxPanel's parameter mapping was originally written with the Kaoss
  // convention (y=0 at bottom, y=1 at top), so we invert here once.
  // The `padX` / `padY` state below is in FxPanel-space (y inverted from raw).

  const handleChaosDown = useCallback(
    (mode: FxMode, rawX: number, rawY: number) => {
      const x = rawX;
      const y = 1 - rawY;
      setPadX(x);
      setPadY(y);
      // Auto-open channel sends for REVERB/DELAY modes so the Kaoss Pad
      // actually routes signal through the send buses (they start at 0 by default).
      if ((mode === "REVERB" || mode === "DELAY") && savedSendsRef.current === null) {
        const sendChs = getSendChannels(fxTarget);
        const savedReverb = sendChs.map((ch) => audioEngine.getChannelReverbSend(ch));
        const savedDelay  = sendChs.map((ch) => audioEngine.getChannelDelaySend(ch));
        savedSendsRef.current = { channels: sendChs, reverb: savedReverb, delay: savedDelay };
        for (const ch of sendChs) {
          audioEngine.setChannelReverbSend(ch, KAOSS_AUTO_SEND);
          audioEngine.setChannelDelaySend(ch, KAOSS_AUTO_SEND);
        }
      }
      chaosFxBus.activate(fxTarget, mode, x, y, bpm);
      if (isRecording) {
        motionRecorder.addPoint(x, y);
      }
    },
    [fxTarget, bpm, isRecording]
  );

  const handleChaosMove = useCallback(
    (mode: FxMode, rawX: number, rawY: number) => {
      const x = rawX;
      const y = 1 - rawY;
      setPadX(x);
      setPadY(y);
      chaosFxBus.setXY(fxTarget, mode, x, y, bpm);
      if (isRecording) {
        motionRecorder.addPoint(x, y);
      }
    },
    [fxTarget, bpm, isRecording]
  );

  const handleChaosUp = useCallback(
    (mode: FxMode) => {
      if (holdMode) {
        setHoldLocked(true);
      } else {
        chaosFxBus.release(fxTarget, mode);
        // Restore auto-opened sends when releasing without hold
        if (savedSendsRef.current !== null) {
          const saved = savedSendsRef.current;
          savedSendsRef.current = null;
          saved.channels.forEach((ch, i) => {
            audioEngine.setChannelReverbSend(ch, saved.reverb[i] ?? 0);
            audioEngine.setChannelDelaySend(ch, saved.delay[i] ?? 0);
          });
        }
      }
    },
    [fxTarget, holdMode]
  );

  const releaseHold = useCallback(() => {
    setHoldLocked(false);
    releaseFxMode(activeMode, fxTarget);
    // Restore auto-opened sends when hold is released
    if (savedSendsRef.current !== null) {
      const saved = savedSendsRef.current;
      savedSendsRef.current = null;
      saved.channels.forEach((ch, i) => {
        audioEngine.setChannelReverbSend(ch, saved.reverb[i] ?? 0);
        audioEngine.setChannelDelaySend(ch, saved.delay[i] ?? 0);
      });
    }
  }, [activeMode, fxTarget]);

  // ─── Beat FX Handlers ───────────────────────────────

  const handleBeatFxDown = useCallback(
    (index: number) => {
      beatFxListRef.current[index]?.activate(bpm);
      setActiveBeatFx((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    },
    [bpm]
  );

  const handleBeatFxUp = useCallback(
    (index: number) => {
      beatFxListRef.current[index]?.deactivate(bpm);
      setActiveBeatFx((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    },
    [bpm]
  );

  // ─── ESC closes the panel ─────────────────────────────
  // Useful on iPad with a connected keyboard, and as a safety net when the
  // header overflows on narrow viewports.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (holdLocked) releaseHold();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, holdLocked, releaseHold, onClose]);

  // ─── Render ─────────────────────────────────────────

  if (!isOpen) return null;

  const modeConfig = MODE_CONFIG[activeMode];
  const modeColor = modeConfig.color;
  const musicalValue = getMusicalValue(activeMode, padX, padY, bpm);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#08080a]">
      {/* Always-reachable floating CLOSE — sits above header, can't be hidden
          by overflow when the viewport is narrow (iPad, mobile). The header
          BACK / RESET buttons may overflow and that's fine because of this. */}
      <button
        onClick={() => {
          if (holdLocked) releaseHold();
          onClose();
        }}
        aria-label="Close FX panel"
        className="fixed top-2 right-2 z-[60] w-9 h-9 flex items-center justify-center rounded-full bg-black/70 backdrop-blur text-white/80 hover:bg-black/90 hover:text-white border border-white/15 text-lg leading-none shadow-lg"
        style={{ touchAction: "manipulation" }}
      >
        ✕
      </button>

      {/* Header — horizontally scrollable when content overflows so the mode
          tiles stay reachable on narrow viewports. */}
      <div className="flex items-center h-10 px-4 border-b border-[var(--ed-border)] overflow-x-auto overflow-y-hidden gap-3" style={{ scrollbarWidth: "none" }}>
        {/* Left: Title */}
        <span className="font-bold text-sm tracking-wider text-[var(--ed-text-primary)] shrink-0">
          FX PAD
        </span>

        {/* Center: Mode tiles with icons (no longer flex-1 — let row scroll) */}
        <div className="flex items-center justify-start gap-1.5 shrink-0">
          {FX_MODES.map((mode) => {
            const cfg = MODE_CONFIG[mode];
            const isActive = activeMode === mode;
            return (
              <button
                key={mode}
                onClick={() => {
                  if (holdLocked) releaseHold();
                  setActiveMode(mode);
                }}
                className="group relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[10px] font-black tracking-[0.14em] transition-all overflow-hidden"
                style={{
                  backgroundColor: isActive
                    ? `${cfg.color}`
                    : "rgba(255,255,255,0.025)",
                  color: isActive ? "#000" : cfg.color,
                  border: `1px solid ${isActive ? cfg.color : cfg.color + "30"}`,
                  boxShadow: isActive
                    ? `0 0 16px ${cfg.color}55, inset 0 0 12px rgba(255,255,255,0.15)`
                    : "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                {/* Subtle shimmer on active */}
                {isActive && (
                  <span
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
                    }}
                  />
                )}
                <ModeIcon mode={mode} color={isActive ? "#000" : cfg.color} />
                <span>{mode}</span>
              </button>
            );
          })}
        </div>

        {/* Right: REC + HOLD + RESET. In the now-scrollable header these flow
            after the mode tiles. No ml-auto (doesn't work in scroll containers)
            and reserved space (mr-12) on the right for the floating × close. */}
        <div className="flex items-center gap-2 shrink-0 mr-12">
          <button
            onClick={() => {
              if (isRecording) {
                const rec = motionRecorder.stopRecording(activeMode, fxTarget, bpm);
                setIsRecording(false);
                if (rec) setRecordings(motionRecorder.allRecordings);
              } else {
                motionRecorder.startRecording();
                setIsRecording(true);
              }
            }}
            style={{
              backgroundColor: isRecording ? "#ef4444" : "transparent",
              color: isRecording ? "#fff" : "rgba(255,255,255,0.35)",
              border: `1px solid ${isRecording ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
            }}
            className="px-3 py-1 rounded text-xs font-bold tracking-wider transition-all"
          >
            {isRecording ? "● STOP" : "REC"}
          </button>
          <button
            onClick={() => {
              if (holdMode && holdLocked) releaseHold();
              setHoldMode(!holdMode);
            }}
            className="px-3 py-1 rounded text-xs font-bold tracking-wider transition-all"
            style={{
              backgroundColor: holdMode ? (holdLocked ? modeColor : "#ffffff20") : "transparent",
              color: holdMode ? (holdLocked ? "#000" : "#fff") : "rgba(255,255,255,0.35)",
              border: `1px solid ${holdMode ? (holdLocked ? modeColor : "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.1)"}`,
              boxShadow: holdLocked ? `0 0 12px ${modeColor}40` : "none",
            }}
          >
            HOLD
          </button>
          <button
            onClick={resetFxState}
            className="px-3 py-1 rounded text-xs font-bold tracking-wider text-[var(--ed-text-muted)] border border-white/10 hover:text-[var(--ed-text-primary)] hover:bg-white/5 transition-colors"
          >
            RESET
          </button>
          {/* (BACK button removed — replaced by the always-visible floating × in the
              top-right corner, which works at every viewport width including iPad.) */}
        </div>
      </div>

      {/* Target selector */}
      <div className="flex items-center h-8 px-4 border-b border-[var(--ed-border)]/50 gap-1">
        <span className="text-[8px] font-bold text-white/25 tracking-wider mr-2">TARGET</span>
        {FX_TARGETS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFxTarget(t.id)}
            className={`px-2.5 py-0.5 text-[9px] font-bold tracking-wider rounded transition-all ${
              fxTarget === t.id
                ? "bg-white/10 text-white border border-white/20"
                : "text-white/30 hover:text-white/60 border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* XY Pad */}
        <div className="flex-1 flex flex-col p-3 min-w-0">
          {/* Parameter display — always visible */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-bold tracking-wider" style={{ color: modeColor + "90" }}>
                X: {modeConfig.xLabel}
              </span>
              <span className="text-[9px] font-bold tracking-wider" style={{ color: modeColor + "90" }}>
                Y: {modeConfig.yLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <span className="text-sm font-black font-mono tracking-wider" style={{ color: modeColor, textShadow: `0 0 20px ${modeColor}60` }}>
                {musicalValue.text}
              </span>
              <span className="text-[10px] font-medium" style={{ color: modeColor + "80" }}>
                {musicalValue.description}
              </span>
              {recordings.length > 0 && (
                <button
                  onClick={() => {
                    if (isPlayingMotion) {
                      motionRecorder.stopPlayback();
                      setIsPlayingMotion(false);
                      releaseFxMode(activeMode, fxTarget);
                    } else {
                      const lastRec = recordings[recordings.length - 1]!;
                      // First activate the FX mode
                      activateFxMode(lastRec.mode as FxMode, 0.5, 0.5, lastRec.target as FxTarget, bpm);
                      motionRecorder.startPlayback(lastRec, (x, y) => {
                        setPadX(x);
                        setPadY(y);
                        applyFxMode(lastRec.mode as FxMode, x, y, lastRec.target as FxTarget, bpm);
                      });
                      setIsPlayingMotion(true);
                    }
                  }}
                  className="px-3 py-1 rounded text-xs font-bold tracking-wider transition-all"
                  style={{
                    backgroundColor: isPlayingMotion ? "#10b981" : "transparent",
                    color: isPlayingMotion ? "#000" : "#10b981",
                    border: `1px solid ${isPlayingMotion ? "#10b981" : "#10b98140"}`,
                  }}
                >
                  {isPlayingMotion ? "■ STOP" : "▶ PLAY"}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
            {FX_MODE_PRESETS[activeMode].map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPadState(preset.x, preset.y, true)}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.14em] border transition-colors"
                style={{
                  color: modeColor,
                  borderColor: `${modeColor}35`,
                  backgroundColor: `${modeColor}10`,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Shared ChaosPad — XY canvas + Beat-FX hold buttons.
              FxPanel passes its 6 internal beat-FX (ROLL/BRAKE/BUILD/NOISE/TAPE/ECHO)
              as opaque numeric-index ids; ChaosPad only needs id+label. */}
          <div className="flex-1 min-h-0">
            <ChaosPad
              target={fxTarget}
              mode={activeMode}
              onModeChange={(m) => {
                if (holdLocked) releaseHold();
                setActiveMode(m);
              }}
              onXYDown={handleChaosDown}
              onXYMove={handleChaosMove}
              onXYUp={handleChaosUp}
              beatFx={beatFxListRef.current.map((b, i) => ({ id: String(i), label: b.label }))}
              onBeatFxDown={(id) => handleBeatFxDown(Number(id))}
              onBeatFxUp={(id) => handleBeatFxUp(Number(id))}
              activeBeatFx={new Set(Array.from(activeBeatFx).map((idx) => String(idx)))}
            />
          </div>
        </div>

        {/* Right: Performance state + macro readouts.
            (Beat-FX hold buttons now live inside the shared ChaosPad component.) */}
        <div className="w-52 flex flex-col p-3 pl-0 gap-2">
          <div className="rounded-2xl border border-[var(--ed-border)] bg-[var(--ed-bg-surface)]/35 p-3 space-y-2">
            <div className="text-[9px] font-bold tracking-[0.2em] text-[var(--ed-text-muted)]">
              PERFORMANCE STATE
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--ed-text-muted)]">Mode</span>
              <span className="font-bold" style={{ color: modeColor }}>{activeMode}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--ed-text-muted)]">Target</span>
              <span className="font-bold text-[var(--ed-text-primary)]">{fxTarget.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--ed-text-muted)]">Hold</span>
              <span className={holdLocked ? "font-bold text-[var(--ed-accent-green)]" : "text-[var(--ed-text-muted)]"}>
                {holdLocked ? "Latched" : holdMode ? "Armed" : "Off"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--ed-text-muted)]">Motion</span>
              <span className={isRecording ? "font-bold text-[#ef4444]" : isPlayingMotion ? "font-bold text-[var(--ed-accent-green)]" : "text-[var(--ed-text-muted)]"}>
                {isRecording ? "Recording" : isPlayingMotion ? "Playing" : "Idle"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--ed-border)] bg-[var(--ed-bg-surface)]/35 p-3 space-y-2">
            <div className="text-[9px] font-bold tracking-[0.2em] text-[var(--ed-text-muted)]">
              MACRO VALUES
            </div>
            <div className="text-[11px] text-[var(--ed-text-primary)] flex items-center justify-between">
              <span>X</span>
              <span className="font-mono">{Math.round(padX * 100)}%</span>
            </div>
            <div className="text-[11px] text-[var(--ed-text-primary)] flex items-center justify-between">
              <span>Y</span>
              <span className="font-mono">{Math.round(padY * 100)}%</span>
            </div>
            <div className="text-[10px] leading-4 text-[var(--ed-text-muted)]">
              Presets above drop the pad into musical sweet spots and latch them automatically.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
