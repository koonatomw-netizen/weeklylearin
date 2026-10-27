import { describe, expect, it } from "vitest";
import { LANDING_INDEX, REEL_LENGTH, buildReelStrip, shouldAnimate } from "../src/case/reel";
import { SITUATIONS } from "../src/shared/situations";

function lcg(seed: number) { let state = seed; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; }; }
const coupon = { situationId: "coupon", roll: 1, rarity: "common" as const };

describe("buildReelStrip", () => {
  it("builds a strip of REEL_LENGTH with the winner at LANDING_INDEX", () => {
    for (const winner of SITUATIONS) {
      const strip = buildReelStrip(winner, lcg(3));
      expect(strip).toHaveLength(REEL_LENGTH);
      expect(strip[LANDING_INDEX]).toBe(winner);
    }
  });

  it("never repeats a situation back to back", () => {
    const rng = lcg(11);
    for (let run = 0; run < 100; run += 1) {
      const strip = buildReelStrip(SITUATIONS[run % SITUATIONS.length], rng);
      for (let i = 1; i < strip.length; i += 1) expect(strip[i].id, `run ${run} index ${i}`).not.toBe(strip[i - 1].id);
    }
  });

  it("still avoids back-to-back repeats with a constant random source", () => {
    const strip = buildReelStrip(SITUATIONS[0], () => 0);
    for (let i = 1; i < strip.length; i += 1) expect(strip[i].id).not.toBe(strip[i - 1].id);
  });
});

describe("shouldAnimate", () => {
  it("only animates when the roll increased", () => {
    expect(shouldAnimate(0, coupon, false)).toBe("spin");
    expect(shouldAnimate(1, coupon, false)).toBe("none");
    expect(shouldAnimate(0, null, false)).toBe("none");
    expect(shouldAnimate(0, coupon, true)).toBe("fade");
  });

  it("does not animate on first load of an already-rolled room", () => {
    // The overlay seeds its seen-roll from the room's current roll on mount.
    const loaded = { ...coupon, roll: 4 };
    expect(shouldAnimate(loaded.roll, loaded, false)).toBe("none");
    expect(shouldAnimate(loaded.roll, { ...loaded, roll: 5 }, false)).toBe("spin");
  });
});
