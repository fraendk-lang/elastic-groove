import { describe, it, expect, beforeEach } from "vitest";
import { useChordPianoStore, resetChordPianoUndoStacks } from "./chordPianoStore";
import type { ChordNote } from "./chordPianoStore";

const sampleNote = (id: string, group = "g1"): ChordNote => ({
  id,
  pitch: 60,
  startBeat: 0,
  durationBeats: 1,
  velocity: 90,
  chordGroup: group,
});

describe("chordPianoStore undo/redo", () => {
  beforeEach(() => {
    resetChordPianoUndoStacks();
    useChordPianoStore.setState({ notes: [] });
  });

  it("undoes addNotes", () => {
    useChordPianoStore.getState().addNotes([sampleNote("a")]);
    expect(useChordPianoStore.getState().notes).toHaveLength(1);
    useChordPianoStore.getState().undo();
    expect(useChordPianoStore.getState().notes).toHaveLength(0);
  });

  it("redoes after undo", () => {
    useChordPianoStore.getState().addNotes([sampleNote("a")]);
    useChordPianoStore.getState().undo();
    useChordPianoStore.getState().redo();
    expect(useChordPianoStore.getState().notes).toHaveLength(1);
  });

  it("undoes removeGroup", () => {
    useChordPianoStore.setState({ notes: [sampleNote("a"), sampleNote("b", "g1")] });
    useChordPianoStore.getState().removeGroup("g1");
    expect(useChordPianoStore.getState().notes).toHaveLength(0);
    useChordPianoStore.getState().undo();
    expect(useChordPianoStore.getState().notes).toHaveLength(2);
  });
});
