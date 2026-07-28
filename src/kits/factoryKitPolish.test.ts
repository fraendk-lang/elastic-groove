import { describe, it, expect } from "vitest";
import { FACTORY_KITS, RAW_FACTORY_KITS } from "./factoryKits";
import { polishFactoryKit } from "./factoryKitPolish";

describe("polishFactoryKits", () => {
  it("gives every kit a pattern", () => {
    for (const kit of FACTORY_KITS) {
      expect(kit.pattern, kit.id).toBeTruthy();
      expect(kit.pattern!.length).toBe(16);
      expect(Object.keys(kit.pattern!.tracks).length).toBeGreaterThan(0);
    }
  });

  it("adds mix and masterFx when missing", () => {
    const raw = RAW_FACTORY_KITS.find((k) => k.id === "808-distorted")!;
    expect(raw.pattern).toBeFalsy();
    const polished = polishFactoryKit(raw);
    expect(polished.pattern).toBeTruthy();
    expect(polished.mix).toBeTruthy();
    expect(polished.masterFx).toBeTruthy();
  });

  it("replaces chaotic trap-hard hat grid with 8th notes", () => {
    const trap = FACTORY_KITS.find((k) => k.id === "trap-hard")!;
    const hat = trap.pattern!.tracks[6]!;
    expect(hat.steps.length).toBe(8);
  });

  it("polishes same count as raw", () => {
    expect(FACTORY_KITS.length).toBe(RAW_FACTORY_KITS.length);
  });
});
