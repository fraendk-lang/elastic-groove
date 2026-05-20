/**
 * ChaosPad — shared Kaoss-style FX surface.
 *
 * Presentational only: a square XY canvas, a row of FX-mode buttons,
 * and a row of 6 Beat-FX hold buttons. All audio routing is done by
 * the host via the callback props.
 */
import { useRef, useState, useCallback } from "react";
import {
  type FxMode, type FxTarget, FX_MODES, MODE_CONFIG, FX_TARGETS,
} from "../audio/ChaosFxBus";
import { type BeatFxId } from "../audio/BeatFx";

export type { BeatFxId };  // re-export for component consumers

const BEAT_FX_IDS: BeatFxId[] = ["throw", "echo", "choke", "stutter", "roll", "noise"];

const BEAT_FX_LABELS: Record<BeatFxId, string> = {
  throw:   "THROW",
  echo:    "ECHO",
  choke:   "CHOKE",
  stutter: "STUTT",
  roll:    "ROLL",
  noise:   "NOISE",
};

interface ChaosPadProps {
  /** Routing target — read-only when `lockedTarget` is true. */
  target: FxTarget;
  /** Active FX mode for the XY canvas. Host owns the state. */
  mode: FxMode;
  onModeChange: (mode: FxMode) => void;
  /** Continuous XY motion while a finger is on the canvas. */
  onXYMove: (mode: FxMode, x: number, y: number) => void;
  /** XY canvas press/release — host activates / releases the FX. */
  onXYDown: (mode: FxMode, x: number, y: number) => void;
  onXYUp: (mode: FxMode) => void;
  /** Beat-FX hold buttons. */
  onBeatFxDown: (id: BeatFxId) => void;
  onBeatFxUp: (id: BeatFxId) => void;
  /** Compact embedded variant (no target selector, tighter spacing). */
  compact?: boolean;
  /** Hide the target selector — target stays as passed in. */
  lockedTarget?: boolean;
  /** Active Beat-FX set, for visual feedback. */
  activeBeatFx?: ReadonlySet<BeatFxId>;
}

export function ChaosPad({
  target, mode, onModeChange, onXYMove, onXYDown, onXYUp,
  onBeatFxDown, onBeatFxUp, compact = false, lockedTarget = false,
  activeBeatFx,
}: ChaosPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [touchXY, setTouchXY] = useState<{ x: number; y: number } | null>(null);

  const getXY = useCallback((e: React.PointerEvent) => {
    const r = padRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }, []);

  const handleDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const xy = getXY(e);
    setTouchXY(xy);
    onXYDown(mode, xy.x, xy.y);
  }, [getXY, mode, onXYDown]);

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.buttons) return;
    const xy = getXY(e);
    setTouchXY(xy);
    onXYMove(mode, xy.x, xy.y);
  }, [getXY, mode, onXYMove]);

  const handleUp = useCallback(() => {
    setTouchXY(null);
    onXYUp(mode);
  }, [mode, onXYUp]);

  const modeColor = MODE_CONFIG[mode].color;

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
      {!lockedTarget && (
        <div className="flex items-center gap-1 px-2">
          <span className="text-[9px] text-white/40 tracking-wider">TARGET</span>
          {FX_TARGETS.map((t) => (
            <button key={t.id}
              onClick={() => { /* host wires target separately */ }}
              className={`px-2 h-5 text-[9px] font-bold rounded ${
                t.id === target ? "bg-white/15 text-white/90" : "text-white/30 hover:text-white/60"
              }`}
            >{t.label}</button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 px-2">
        <span className="text-[9px] text-white/40 tracking-wider">MODE</span>
        {FX_MODES.map((m) => (
          <button key={m} onClick={() => onModeChange(m)}
            className={`px-2 h-6 text-[9px] font-bold rounded transition-colors ${
              m === mode
                ? "bg-white/15"
                : "text-white/30 hover:text-white/60"
            }`}
            style={{ color: m === mode ? MODE_CONFIG[m].color : undefined }}
          >{m}</button>
        ))}
      </div>

      <div
        ref={padRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onLostPointerCapture={handleUp}
        className="relative flex-1 rounded-lg border overflow-hidden cursor-crosshair select-none touch-none"
        style={{
          minHeight: compact ? 90 : 140,
          borderColor: `${modeColor}40`,
          background: `radial-gradient(circle at 50% 50%, ${modeColor}18, transparent 70%), #0d0a0f`,
        }}
      >
        <div className="absolute top-1 left-2 text-[8px] tracking-wider font-bold" style={{ color: modeColor }}>
          {MODE_CONFIG[mode].xLabel} ◂▸ · {MODE_CONFIG[mode].yLabel} ▴▾
        </div>
        {touchXY && (
          <div
            className="absolute w-3 h-3 rounded-full pointer-events-none"
            style={{
              left: `calc(${touchXY.x * 100}% - 6px)`,
              top: `calc(${touchXY.y * 100}% - 6px)`,
              background: modeColor,
              boxShadow: `0 0 12px ${modeColor}`,
            }}
          />
        )}
      </div>

      <div className="flex gap-1 px-2">
        {BEAT_FX_IDS.map((id) => {
          const isActive = activeBeatFx?.has(id) ?? false;
          return (
            <button
              key={id}
              onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {/*ok*/} onBeatFxDown(id); }}
              onPointerUp={() => onBeatFxUp(id)}
              onPointerCancel={() => onBeatFxUp(id)}
              onLostPointerCapture={() => onBeatFxUp(id)}
              className={`flex-1 h-7 text-[9px] font-bold rounded transition-colors ${
                isActive ? "bg-red-500/40 text-red-100" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >{BEAT_FX_LABELS[id]}</button>
          );
        })}
      </div>
    </div>
  );
}
