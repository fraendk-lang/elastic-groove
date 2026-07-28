import { describe, it, expect } from "vitest";
import { buildSessionPianoRollNotes } from "./sessionMidiExport";

describe("sessionMidiExport", () => {
  it("returns an array of piano roll notes", () => {
    const notes = buildSessionPianoRollNotes();
    expect(Array.isArray(notes)).toBe(true);
  });
});
