/**
 * Factory kit polish — fills missing patterns/mix and replaces overly dense
 * starter grooves with balanced, genre-appropriate patterns.
 */
import type { DrumKit } from "./KitManager";

type KitPattern = NonNullable<DrumKit["pattern"]>;
type KitPatch = {
  pattern?: KitPattern;
  mix?: DrumKit["mix"];
  masterFx?: DrumKit["masterFx"];
};

// ─── Reusable groove templates (16 steps, musical hygiene) ───────────────────

const HATS_8TH = [0, 2, 4, 6, 8, 10, 12, 14] as const;
const HATS_8TH_SOFT = { steps: [...HATS_8TH], vel: [82, 48, 72, 48, 82, 48, 72, 48] };
const HATS_8TH_MED = { steps: [...HATS_8TH], vel: [88, 52, 76, 52, 88, 52, 76, 52] };
const HATS_OFFBEAT = { steps: [2, 6, 10, 14], vel: [78, 68, 78, 68] };

const P = {
  boomBap: {
    length: 16, swing: 58,
    tracks: {
      0: { steps: [0, 6, 10], vel: [115, 78, 92] },
      1: { steps: [4, 12], vel: [108, 98] },
      6: HATS_8TH_SOFT,
      7: { steps: [3, 11], vel: [58, 52] },
    },
  } satisfies KitPattern,

  fourOnFloor: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 4, 8, 12], vel: [120, 115, 120, 115] },
      2: { steps: [4, 12], vel: [88, 82] },
      6: HATS_8TH_MED,
      7: HATS_OFFBEAT,
    },
  } satisfies KitPattern,

  trap808: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 3, 7, 10], vel: [127, 92, 102, 85] },
      1: { steps: [4, 12], vel: [115, 105] },
      6: HATS_8TH_SOFT,
    },
  } satisfies KitPattern,

  trapRolls: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 4, 7, 11], vel: [127, 98, 108, 88] },
      1: { steps: [4, 12], vel: [118, 108] },
      6: {
        steps: [0, 2, 4, 5, 6, 8, 10, 12, 13, 14],
        vel: [85, 42, 72, 55, 78, 85, 42, 72, 58, 82],
        ratchets: { 5: 2, 13: 3 },
      },
      7: { steps: [6, 14], vel: [62, 58] },
    },
  } satisfies KitPattern,

  dnbLiquid: {
    length: 16, swing: 52,
    tracks: {
      0: { steps: [0, 4, 9, 10], vel: [108, 82, 92, 68] },
      1: { steps: [4, 12], vel: [102, 96] },
      6: HATS_8TH_SOFT,
      10: { steps: [2, 6, 14], vel: [48, 42, 46] },
    },
  } satisfies KitPattern,

  dnbNeuro: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 4, 9, 10], vel: [120, 95, 105, 75] },
      1: { steps: [4, 12], vel: [115, 108] },
      6: { steps: [0, 2, 4, 6, 8, 10, 12, 14], vel: [78, 44, 65, 44, 78, 44, 65, 44] },
    },
  } satisfies KitPattern,

  dembow: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 7], vel: [120, 95] },
      1: { steps: [3, 7, 11, 15], vel: [110, 72, 100, 72] },
      6: HATS_8TH_SOFT,
    },
  } satisfies KitPattern,

  afroSync: {
    length: 16, swing: 55,
    tracks: {
      0: { steps: [0, 5, 10], vel: [118, 88, 98] },
      1: { steps: [4, 12], vel: [105, 95] },
      6: HATS_8TH_SOFT,
      10: { steps: [2, 6, 10, 14], vel: [72, 58, 68, 55] },
      11: { steps: [1, 5, 9, 13], vel: [52, 42, 50, 40] },
    },
  } satisfies KitPattern,

  amapiano: {
    length: 16, swing: 52,
    tracks: {
      0: { steps: [0, 4, 8, 12], vel: [115, 108, 115, 108] },
      3: { steps: [2, 6, 10, 14], vel: [82, 65, 78, 65] },
      6: HATS_8TH_SOFT,
      10: { steps: [3, 7, 11, 15], vel: [70, 55, 68, 52] },
    },
  } satisfies KitPattern,

  minimalTechno: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 4, 8, 12], vel: [127, 118, 127, 118] },
      2: { steps: [4, 12], vel: [78, 72] },
      6: HATS_OFFBEAT,
      8: { steps: [2, 14], vel: [55, 48] },
    },
  } satisfies KitPattern,

  dubTechno: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 4, 8, 12], vel: [118, 112, 118, 112] },
      6: HATS_OFFBEAT,
      10: { steps: [0, 8], vel: [48, 42] },
    },
  } satisfies KitPattern,

  electroBreak: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 3, 8, 11], vel: [120, 92, 112, 88] },
      1: { steps: [4, 12], vel: [110, 102] },
      6: HATS_8TH_MED,
      2: { steps: [7, 15], vel: [72, 68] },
    },
  } satisfies KitPattern,

  ebmIndustrial: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 4, 8, 12], vel: [127, 122, 127, 122] },
      1: { steps: [4, 12], vel: [115, 108] },
      6: HATS_OFFBEAT,
      2: { steps: [2, 10], vel: [85, 78] },
    },
  } satisfies KitPattern,

  italoDisco: {
    length: 16, swing: 52,
    tracks: {
      0: { steps: [0, 4, 8, 12], vel: [122, 118, 122, 118] },
      1: { steps: [4, 12], vel: [112, 105] },
      6: HATS_8TH_MED,
      7: { steps: [2, 6, 10, 14], vel: [62, 72, 62, 72] },
    },
  } satisfies KitPattern,

  jazzSwing: {
    length: 16, swing: 64,
    tracks: {
      0: { steps: [0, 8], vel: [105, 92] },
      1: { steps: [4, 12], vel: [82, 78] },
      9: { steps: [0, 3, 4, 7, 8, 11, 12, 15], vel: [100, 68, 92, 68, 98, 68, 92, 72] },
      11: { steps: [2, 6, 10, 14], vel: [52, 48, 52, 48] },
    },
  } satisfies KitPattern,

  cinematicImpact: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0], vel: [115] },
      1: { steps: [8], vel: [105] },
      8: { steps: [0], vel: [72] },
      10: { steps: [4, 12], vel: [55, 50] },
    },
  } satisfies KitPattern,

  cinematicTension: {
    length: 16, swing: 52,
    tracks: {
      0: { steps: [0, 8], vel: [88, 72] },
      10: { steps: [2, 6, 10, 14], vel: [38, 34, 38, 34] },
      11: { steps: [1, 5, 9, 13], vel: [32, 28, 32, 28] },
    },
  } satisfies KitPattern,

  idmSparse: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 8, 11], vel: [105, 78, 85] },
      1: { steps: [4, 12], vel: [88, 72] },
      6: { steps: [2, 6, 10, 14], vel: [62, 48, 58, 45] },
      10: { steps: [3, 9], vel: [52, 48] },
    },
  } satisfies KitPattern,

  latinGroove: {
    length: 16, swing: 55,
    tracks: {
      0: { steps: [0, 8], vel: [108, 92] },
      1: { steps: [4, 12], vel: [100, 92] },
      3: { steps: [0, 3, 6, 10, 12], vel: [88, 62, 78, 68, 85] },
      11: { steps: [1, 5, 9, 13], vel: [48, 38, 45, 38] },
    },
  } satisfies KitPattern,

  footwork: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 2, 4, 8, 10, 12], vel: [127, 88, 108, 115, 82, 100] },
      1: { steps: [4, 12], vel: [108, 102] },
      6: HATS_8TH_MED,
    },
  } satisfies KitPattern,

  futureBass: {
    length: 16, swing: 50,
    tracks: {
      0: { steps: [0, 10], vel: [127, 100] },
      1: { steps: [4, 12], vel: [110, 102] },
      2: { steps: [4, 12], vel: [88, 82] },
      6: HATS_8TH_SOFT,
      8: { steps: [3, 15], vel: [62, 55] },
    },
  } satisfies KitPattern,

  jungleAmen: {
    length: 16, swing: 52,
    tracks: {
      0: { steps: [0, 6, 10], vel: [120, 78, 98] },
      1: { steps: [4, 12], vel: [112, 95] },
      6: { steps: [0, 2, 4, 6, 8, 10, 12, 14], vel: [72, 42, 58, 42, 72, 42, 58, 42] },
      7: { steps: [2, 9], vel: [58, 48] },
    },
  } satisfies KitPattern,

  garage2step: {
    length: 16, swing: 62,
    tracks: {
      0: { steps: [0, 5, 8, 13], vel: [120, 85, 112, 78] },
      2: { steps: [4, 12], vel: [102, 95] },
      6: { steps: [0, 2, 3, 6, 8, 10, 11, 14], vel: [88, 45, 62, 88, 45, 62, 88, 45] },
      7: { steps: [4, 12], vel: [68, 62] },
    },
  } satisfies KitPattern,

  ambientSparse: {
    length: 16, swing: 54,
    tracks: {
      0: { steps: [0, 8], vel: [65, 50] },
      10: { steps: [2, 6, 10, 14], vel: [36, 32, 36, 32] },
      11: { steps: [1, 5, 9, 13], vel: [30, 26, 30, 26] },
    },
  } satisfies KitPattern,
};

// ─── Default mix / master — tames harsh VA-only kits ─────────────────────────

const BALANCED_MIX: NonNullable<DrumKit["mix"]> = {
  0: { pan: 0, reverbSend: 0.06, insertDrive: 0.08 },
  1: { pan: 0, reverbSend: 0.14, delaySend: 0.04 },
  2: { pan: 0.08, reverbSend: 0.18 },
  6: { pan: -0.18, filterType: "highpass", filterFreq: 7200 },
  7: { pan: 0.18, reverbSend: 0.08 },
  8: { pan: -0.28, reverbSend: 0.15 },
  9: { pan: 0.28, reverbSend: 0.12 },
};

const WARM_MASTER: NonNullable<DrumKit["masterFx"]> = {
  reverbLevel: 0.22,
  saturation: 0.1,
  eqLow: 1.5,
  eqMid: -0.5,
  eqHigh: -1,
};

const CATEGORY_DEFAULTS: Record<string, KitPatch> = {
  "808": { pattern: P.boomBap, mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, eqLow: 2.5 } },
  "909": { pattern: P.fourOnFloor, mix: BALANCED_MIX, masterFx: WARM_MASTER },
  Trap: { pattern: P.trap808, mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, eqLow: 2 } },
  DnB: { pattern: P.dnbLiquid, mix: BALANCED_MIX, masterFx: WARM_MASTER },
  Electro: { pattern: P.electroBreak, mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, saturation: 0.14 } },
  World: { pattern: P.afroSync, mix: BALANCED_MIX, masterFx: WARM_MASTER },
  Ambient: { pattern: P.ambientSparse, mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, reverbLevel: 0.32 } },
  Retro: { pattern: P.fourOnFloor, mix: BALANCED_MIX, masterFx: WARM_MASTER },
  Acoustic: { pattern: P.jazzSwing, mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, reverbLevel: 0.28 } },
  Cinematic: { pattern: P.cinematicTension, mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, reverbLevel: 0.35 } },
  Garage: { pattern: P.garage2step, mix: BALANCED_MIX, masterFx: WARM_MASTER },
  Footwork: { pattern: P.footwork, mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, saturation: 0.15 } },
  Club: { pattern: P.trap808, mix: BALANCED_MIX, masterFx: WARM_MASTER },
  Grime: { pattern: P.trap808, mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, eqHigh: 1 } },
  Samples: { pattern: P.fourOnFloor, mix: BALANCED_MIX, masterFx: WARM_MASTER },
};

/** Explicit overrides for kits that need a cleaner groove or were missing patterns. */
const KIT_PATCHES: Record<string, KitPatch> = {
  // Missing patterns
  "808-distorted": { pattern: P.trap808, masterFx: { ...WARM_MASTER, saturation: 0.22, eqLow: 2 } },
  "trap-melodic": { pattern: P.trap808, masterFx: { ...WARM_MASTER, reverbLevel: 0.28 } },
  "ebm-industrial": { pattern: P.ebmIndustrial, masterFx: { ...WARM_MASTER, saturation: 0.18 } },
  "italo-disco": { pattern: P.italoDisco },
  "jazz-brush": { pattern: P.jazzSwing },
  "cinematic-impact": { pattern: P.cinematicImpact, masterFx: { reverbLevel: 0.38, saturation: 0.08, eqLow: 2 } },
  "cinematic-tension": { pattern: P.cinematicTension },

  // Overloaded → simplified
  "trap-hard": { pattern: P.trap808 },
  "drill-uk": { pattern: P.trap808 },
  "trap-drill-rolls": { pattern: P.trapRolls },
  "samples-trap-banger": { pattern: P.trap808 },
  "dnb-neurofunk": { pattern: P.dnbNeuro },
  "idm-glitch": { pattern: P.idmSparse, masterFx: { reverbLevel: 0.18, saturation: 0.12, eqHigh: -2 } },
  "afrobeats": { pattern: P.afroSync },
  "afrobeat-modern": { pattern: P.amapiano },
  "amapiano": { pattern: P.amapiano },
  "latin-perc": { pattern: P.latinGroove },
  "latin-cumbia": { pattern: P.latinGroove },
  "minimal-techno": { pattern: P.minimalTechno },
  "minimal-techno-kit": { pattern: P.minimalTechno },
  "samples-minimal-techno": { pattern: P.minimalTechno },
  "dub-techno": { pattern: P.dubTechno },
  "future-bass": { pattern: P.futureBass },
  "footwork-juke": { pattern: P.footwork },
  "jungle-amen": { pattern: P.jungleAmen },
  "jungle-break": { pattern: P.jungleAmen },
  "breakbeat": {
    pattern: {
      length: 16, swing: 50,
      tracks: {
        0: { steps: [0, 3, 8, 10], vel: [120, 85, 108, 75] },
        1: { steps: [4, 12], vel: [112, 100] },
        6: HATS_8TH_SOFT,
        9: { steps: [0, 8], vel: [48, 42] },
      },
    },
  },
  "reggaeton": { pattern: P.dembow },
  "909-house": { mix: BALANCED_MIX, masterFx: WARM_MASTER },
  "909-techno": { mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, saturation: 0.14 } },
  "electro-classic": { mix: BALANCED_MIX, masterFx: WARM_MASTER },
  "synthwave-80s": { mix: BALANCED_MIX, masterFx: { ...WARM_MASTER, reverbLevel: 0.3 } },
};

function mergeMix(
  base: DrumKit["mix"] | undefined,
  extra: DrumKit["mix"] | undefined,
): DrumKit["mix"] | undefined {
  if (!base && !extra) return undefined;
  const out: NonNullable<DrumKit["mix"]> = { ...base };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      const ch = Number(k);
      out[ch] = { ...out[ch], ...v };
    }
  }
  return out;
}

export function polishFactoryKit(kit: DrumKit): DrumKit {
  const cat = CATEGORY_DEFAULTS[kit.category];
  const patch = KIT_PATCHES[kit.id];

  const pattern = patch?.pattern ?? kit.pattern ?? cat?.pattern;
  const mix = mergeMix(mergeMix(cat?.mix, kit.mix), patch?.mix);
  const masterFx = { ...cat?.masterFx, ...kit.masterFx, ...patch?.masterFx };

  return {
    ...kit,
    ...(pattern ? { pattern } : {}),
    ...(mix ? { mix } : {}),
    ...(Object.keys(masterFx).length > 0 ? { masterFx } : {}),
  };
}

export function polishFactoryKits(kits: DrumKit[]): DrumKit[] {
  return kits.map(polishFactoryKit);
}

/** Exported for tests */
export const _KIT_PATTERN_TEMPLATES = P;
