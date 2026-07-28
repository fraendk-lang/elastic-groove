import { describe, it, expect } from "vitest";
import { DEMO_SONGS } from "./demoSongs";
import { BASS_PRESETS } from "../store/bassStore";
import { CHORDS_PRESETS } from "../store/chordsStore";
import { MELODY_PRESETS } from "../store/melodyStore";
import { FACTORY_KITS } from "../kits/factoryKits";

describe("DEMO_SONGS", () => {
  it("has consistent pattern lengths and melody on every song", () => {
    for (const song of DEMO_SONGS) {
      expect(song.bassSteps?.length).toBe(song.bassLength);
      expect(song.chordsSteps?.length).toBe(song.chordsLength);
      expect(song.melodySteps?.length).toBe(song.melodyLength);
      expect(song.melodyPresetName).toBeTruthy();
      expect(song.melodyPadPresetIndex).toBeTypeOf("number");
      expect(song.bassSteps?.some((s) => s.active)).toBe(true);
      expect(song.chordsSteps?.some((s) => s.active)).toBe(true);
      expect(song.melodySteps?.some((s) => s.active)).toBe(true);
    }
  });

  it("references existing factory presets", () => {
    for (const song of DEMO_SONGS) {
      if (song.bassPresetName) {
        expect(BASS_PRESETS.some((p) => p.name === song.bassPresetName)).toBe(true);
      }
      if (song.chordsPresetName) {
        expect(CHORDS_PRESETS.some((p) => p.name === song.chordsPresetName)).toBe(true);
      }
      if (song.melodyPresetName) {
        expect(MELODY_PRESETS.some((p) => p.name === song.melodyPresetName)).toBe(true);
      }
    }
  });

  it("references valid factory kit IDs", () => {
    const kitIds = new Set(FACTORY_KITS.map((k) => k.id));
    for (const song of DEMO_SONGS) {
      expect(kitIds.has(song.kitId), `unknown kitId: ${song.kitId}`).toBe(true);
    }
  });

  it("keeps bass fader below chords/melody in demo mix", () => {
    for (const song of DEMO_SONGS) {
      const mix = song.faderOverrides;
      expect(mix).toBeDefined();
      const bass = mix![12]!;
      expect(bass).toBeLessThanOrEqual(540);
      expect(bass).toBeLessThan(mix![13] ?? 1000);
    }
  });
});
