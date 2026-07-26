// src/store/chordPianoStore.ts

import { create } from "zustand";
import type { ChordSetId } from "../components/ChordPianoRoll/chordSets";

export interface ChordNote {
  id: string;
  pitch: number;         // MIDI 0–127
  startBeat: number;     // float beats, 0-indexed
  durationBeats: number; // min 0.25 (= 1/16 note)
  velocity: number;      // 0–127
  chordGroup: string;    // stable group ID (e.g. "Cneo-soul-7ths@0.00")
}

const MAX_UNDO = 50;
const undoStack: ChordNote[][] = [];
const redoStack: ChordNote[][] = [];

/** Test helper — clears undo history between unit tests. */
export function resetChordPianoUndoStacks(): void {
  undoStack.length = 0;
  redoStack.length = 0;
}

function cloneNotes(notes: ChordNote[]): ChordNote[] {
  return structuredClone(notes);
}

interface ChordPianoState {
  notes: ChordNote[];
  activeChordSet: ChordSetId;
  snapEnabled: boolean;
  snapResolution: 0.25 | 0.5 | 1; // beats: 1/16, 1/8, 1/4
  loopStart: number;               // beats
  loopEnd: number;                 // beats
  totalBeats: number;              // default 16
  chordsSource: "grid" | "piano" | "both";

  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  setNotes: (notes: ChordNote[]) => void;
  addNotes: (notes: ChordNote[]) => void;
  removeNote: (id: string) => void;
  removeGroup: (chordGroup: string) => void;
  updateNote: (id: string, patch: Partial<ChordNote>) => void;
  updateGroup: (chordGroup: string, patch: Partial<ChordNote>) => void;
  moveGroupByDelta: (chordGroup: string, deltaBeat: number, deltaPitch: number, bounds?: { minPitch: number; maxPitch: number; totalBeats: number }) => void;
  setGroupDuration: (chordGroup: string, durationBeats: number) => void;
  setActiveChordSet: (id: ChordSetId) => void;
  setSnapEnabled: (v: boolean) => void;
  setSnapResolution: (v: 0.25 | 0.5 | 1) => void;
  setLoopRange: (start: number, end: number) => void;
  setTotalBeats: (v: number) => void;
  setChordsSource: (v: "grid" | "piano" | "both") => void;
  clear: () => void;
}

export const useChordPianoStore = create<ChordPianoState>((set, get) => ({
  notes: [],
  activeChordSet: "neo-soul-7ths",
  snapEnabled: true,
  snapResolution: 0.25,
  loopStart: 0,
  loopEnd: 16,
  totalBeats: 16,
  chordsSource: "both",

  pushUndo: () => {
    undoStack.push(cloneNotes(get().notes));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  },

  undo: () => {
    const prev = undoStack.pop();
    if (!prev) return;
    redoStack.push(cloneNotes(get().notes));
    set({ notes: prev });
  },

  redo: () => {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(cloneNotes(get().notes));
    set({ notes: next });
  },

  setNotes: (notes) => set({ notes }),

  addNotes: (notes) => {
    get().pushUndo();
    set((s) => ({ notes: [...s.notes, ...notes] }));
  },

  removeNote: (id) => {
    get().pushUndo();
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },

  removeGroup: (chordGroup) => {
    get().pushUndo();
    set((s) => ({ notes: s.notes.filter((n) => n.chordGroup !== chordGroup) }));
  },

  updateNote: (id, patch) =>
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),

  updateGroup: (chordGroup, patch) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.chordGroup === chordGroup ? { ...n, ...patch } : n)),
    })),

  moveGroupByDelta: (chordGroup, deltaBeat, deltaPitch, bounds) => {
    const minPitch = bounds?.minPitch ?? 0;
    const maxPitch = bounds?.maxPitch ?? 127;
    const total = bounds?.totalBeats ?? get().totalBeats;
    set((s) => ({
      notes: s.notes.map((n) => {
        if (n.chordGroup !== chordGroup) return n;
        const startBeat = Math.max(0, Math.min(total - n.durationBeats, n.startBeat + deltaBeat));
        const pitch = Math.max(minPitch, Math.min(maxPitch, n.pitch + deltaPitch));
        return { ...n, startBeat, pitch };
      }),
    }));
  },

  setGroupDuration: (chordGroup, durationBeats) => {
    const dur = Math.max(0.25, durationBeats);
    set((s) => ({
      notes: s.notes.map((n) => (n.chordGroup === chordGroup ? { ...n, durationBeats: dur } : n)),
    }));
  },

  setActiveChordSet: (id) => set({ activeChordSet: id }),
  setSnapEnabled: (v) => set({ snapEnabled: v }),
  setSnapResolution: (v) => set({ snapResolution: v }),
  setLoopRange: (start, end) => set({ loopStart: start, loopEnd: end }),
  setTotalBeats: (v) => set({ totalBeats: v }),
  setChordsSource: (v) => set({ chordsSource: v }),

  clear: () => {
    get().pushUndo();
    set({ notes: [] });
  },
}));

/** Apply a group transform from drag-start snapshots (avoids cumulative drift). */
export function applyGroupMoveFromSnapshot(
  snapshot: ChordNote[],
  deltaBeat: number,
  deltaPitch: number,
  totalBeats: number,
  minPitch: number,
  maxPitch: number,
): ChordNote[] {
  const byId = new Map(snapshot.map((n) => [n.id, n]));
  return useChordPianoStore.getState().notes.map((n) => {
    const orig = byId.get(n.id);
    if (!orig) return n;
    return {
      ...n,
      startBeat: Math.max(0, Math.min(totalBeats - orig.durationBeats, orig.startBeat + deltaBeat)),
      pitch: Math.max(minPitch, Math.min(maxPitch, orig.pitch + deltaPitch)),
    };
  });
}

export function applyGroupResizeFromSnapshot(
  snapshot: ChordNote[],
  durationBeats: number,
): ChordNote[] {
  const group = snapshot[0]?.chordGroup;
  if (!group) return useChordPianoStore.getState().notes;
  const dur = Math.max(0.25, durationBeats);
  return useChordPianoStore.getState().notes.map((n) =>
    n.chordGroup === group ? { ...n, durationBeats: dur } : n,
  );
}
