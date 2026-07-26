import { useEffect, useRef } from "react";
import type { PianoRollNote } from "./types";
import { TARGET_COLORS, midiNoteName } from "./types";

export const CANVAS_NOTE_THRESHOLD = 180;

interface NoteCanvasProps {
  notes: PianoRollNote[];
  selectedNoteIds: ReadonlySet<string>;
  cellW: number;
  rowHeight: number;
  visibleRows: number;
  gridW: number;
  gridH: number;
  rowForMidi: (midi: number) => number;
  playheadBeat: number;
  isPlaying: boolean;
  target: PianoRollNote["track"];
}

/** Canvas layer for bulk note rendering (DOM notes kept for selected / small sets). */
export function PianoRollNoteCanvas({
  notes,
  selectedNoteIds,
  cellW,
  rowHeight,
  visibleRows,
  gridW,
  gridH,
  rowForMidi,
  playheadBeat,
  isPlaying,
  target,
}: NoteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(gridW, 800);
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(gridH * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${gridH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, gridH);

    for (const note of notes) {
      if (selectedNoteIds.has(note.id)) continue;
      const row = rowForMidi(note.midi);
      if (row < 0 || row >= visibleRows) continue;

      const x = note.start * cellW;
      const y = row * rowHeight + 1;
      const nw = Math.max(12, note.duration * cellW);
      const nh = rowHeight - 2;
      const color = TARGET_COLORS[note.track];
      const velBrightness = 0.55 + note.velocity * 0.55;
      const isActive =
        isPlaying &&
        playheadBeat >= note.start &&
        playheadBeat < note.start + note.duration;
      const isTarget = note.track === target;

      ctx.save();
      if (isActive) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }

      const r = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, nw, nh, r);
      if (isActive) {
        const grad = ctx.createLinearGradient(x, y, x, y + nh);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
      } else {
        ctx.globalAlpha = isTarget ? velBrightness : velBrightness * 0.55;
        ctx.fillStyle = color;
      }
      ctx.fill();

      ctx.strokeStyle = isActive ? "rgba(255,255,255,0.9)" : `${color}88`;
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.stroke();

      if (nw > 24 && isTarget) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 8px system-ui,sans-serif";
        ctx.fillText(midiNoteName(note.midi), x + 4, y + 10);
      }
      ctx.restore();
    }
  }, [
    notes, selectedNoteIds, cellW, rowHeight, visibleRows, gridW, gridH,
    rowForMidi, playheadBeat, isPlaying, target,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-none z-[1]"
      style={{ width: Math.max(gridW, 800), height: gridH }}
    />
  );
}
