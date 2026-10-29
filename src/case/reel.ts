import { SITUATIONS, pickSituation, type Situation } from "../shared/situations";
import type { CaseRollInfo } from "../shared/types";

export const REEL_LENGTH = 40;
/** Tile the reel stops on; the stored winner is always placed here. */
export const LANDING_INDEX = 32;
export const REEL_MS = 5200;

/** A reel of weighted decoys with the winner at LANDING_INDEX and no tile repeated next to itself. */
export function buildReelStrip(winner: Situation, random: () => number, pool: readonly Situation[] = SITUATIONS): Situation[] {
  const strip: Situation[] = [];
  for (let index = 0; index < REEL_LENGTH; index += 1) {
    if (index === LANDING_INDEX) { strip.push(winner); continue; }
    const previous = strip[index - 1];
    const upcoming = index + 1 === LANDING_INDEX ? winner : undefined;
    let pick = pickSituation(random, previous?.id, pool);
    if (upcoming && pick.id === upcoming.id) pick = pool.find((item) => item.id !== previous?.id && item.id !== upcoming.id) ?? pick;
    strip.push(pick);
  }
  return strip;
}

/**
 * What this screen should do about a case state. `seenRoll` is the last roll this screen has handled and is
 * seeded from the room's current roll on mount, so a reload or a late-opened projector never replays the spin.
 */
export function shouldAnimate(seenRoll: number, current: CaseRollInfo | null, reducedMotion: boolean): "spin" | "fade" | "none" {
  if (!current || current.roll <= seenRoll) return "none";
  return reducedMotion ? "fade" : "spin";
}
