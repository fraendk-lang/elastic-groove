/** Curated starter kits — shown with ★ badge in the kit browser. */
export const HERO_KIT_IDS = [
  "lofi-tape",
  "lofi-hiphop",
  "synthwave-80s",
  "deep-house",
  "909-house",
  "dnb-liquid",
  "ambient-organic",
  "trap-hard",
] as const;

export type HeroKitId = (typeof HERO_KIT_IDS)[number];

const HERO_SET = new Set<string>(HERO_KIT_IDS);

export function isHeroKit(kitId: string): boolean {
  return HERO_SET.has(kitId);
}
