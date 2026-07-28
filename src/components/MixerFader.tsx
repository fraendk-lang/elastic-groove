// src/components/MixerFader.tsx
/** Vertical mixer fader — pointer drag + wheel for 1-step precision (avoids coarse native range on short tracks). */

import React, { useCallback, useRef } from "react";
import {
  FADER_UNITY,
  clampFaderPos,
  formatFaderDb,
  faderToGain,
} from "../store/mixerBarStore";

export interface MixerFaderProps {
  value: number;
  onChange: (v: number) => void;
  height: number;
  width?: number;
  showDb?: boolean;
  dbClassName?: string;
  /** Double-click resets to this position (default: unity). */
  resetValue?: number;
  className?: string;
}

export function MixerFader({
  value,
  onChange,
  height,
  width = 8,
  showDb = false,
  dbClassName = "text-[5px] font-mono text-white/25 tabular-nums",
  resetValue = FADER_UNITY,
  className = "",
}: MixerFaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);

  const posFromClientY = useCallback(
    (clientY: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      const ratio = 1 - (clientY - rect.top) / rect.height;
      return clampFaderPos(Math.round(ratio * 1000));
    },
    [value],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onChange(posFromClientY(e.clientY));
      dragRef.current = { startY: e.clientY, startVal: value };
    },
    [onChange, posFromClientY, value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const fine = e.shiftKey ? 0.25 : 1;
      const delta = (dragRef.current.startY - e.clientY) * fine;
      onChange(clampFaderPos(Math.round(dragRef.current.startVal + delta)));
    },
    [onChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const step = e.shiftKey ? 0.5 : 2;
      const next = e.deltaY > 0 ? value - step : value + step;
      onChange(clampFaderPos(Math.round(next)));
    },
    [onChange, value],
  );

  const onDoubleClick = useCallback(() => {
    onChange(clampFaderPos(resetValue));
  }, [onChange, resetValue]);

  const thumbTop = `calc(${(1 - value / 1000)} * (100% - 8px))`;

  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`}>
      <div
        ref={trackRef}
        className="relative touch-none select-none cursor-ns-resize"
        style={{ width, height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        title={`${formatFaderDb(value)} · ${(faderToGain(value) * 100).toFixed(0)}% · Shift = fein · Doppelklick = Reset`}
      >
        <div className="absolute inset-0 rounded bg-[var(--ed-bg-primary)] border border-white/[0.06]" />
        <div
          className="absolute left-0 right-0 h-px bg-white/20 pointer-events-none"
          style={{ top: `${(1 - FADER_UNITY / 1000) * 100}%` }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-2 rounded-sm bg-[#3a3a3a] border border-white/20 pointer-events-none"
          style={{ top: thumbTop }}
        />
      </div>
      {showDb && (
        <span className={dbClassName}>{formatFaderDb(value)}</span>
      )}
    </div>
  );
}
