import { describe, expect, it } from "vitest";
import { WEEK01_CHALLENGE } from "../src/shared/challenge";
import { validateChallenge } from "../src/shared/deck";
import { ICON_PALETTE, SITUATION_ICONS } from "../src/shared/pixelIcons";
import { pickSituation, SITUATIONS, type Rarity } from "../src/shared/situations";

const seq = (...numbers: number[]) => { let index = 0; return () => numbers[Math.min(index++, numbers.length - 1)]; };
function lcg(seed: number) { let state = seed; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; }; }
const count = (rarity: Rarity) => SITUATIONS.filter((situation) => situation.rarity === rarity).length;

describe("situation pool", () => {
  it("has 15 situations with unique ids and the spec's rarity counts", () => {
    expect(SITUATIONS).toHaveLength(15);
    expect(new Set(SITUATIONS.map((situation) => situation.id)).size).toBe(15);
    expect([count("common"), count("rare"), count("epic"), count("legendary")]).toEqual([6, 4, 3, 2]);
    expect(SITUATIONS.map((situation) => situation.id).sort()).toEqual([
      "coupon", "double-booking", "error-message", "menu-change", "poster-brief", "rainy-day", "room-not-ready", "run-sheet",
      "sort-the-facts", "three-captions", "upset-partner", "wellness-plan", "wifi-panic", "workshop-2-days", "wrong-room-photo",
    ]);
  });

  it("gives every situation complete Thai and English text", () => {
    for (const { id, challenge } of SITUATIONS) {
      expect(validateChallenge(challenge).ok, id).toBe(true);
      for (const key of ["titleEn", "titleTh", "scenarioEn", "scenarioTh", "taskEn", "taskTh"] as const) expect(challenge[key].trim(), `${id}.${key}`).not.toBe("");
      expect(challenge.titleTh, id).not.toBe(challenge.titleEn);
      expect(challenge.scenarioTh, id).not.toBe(challenge.scenarioEn);
      expect(challenge.taskTh, id).not.toBe(challenge.taskEn);
    }
  });

  it("keeps the original challenge text for room-not-ready", () => {
    const original = SITUATIONS.find((situation) => situation.id === "room-not-ready")!;
    expect(original.challenge.scenarioEn).toBe(WEEK01_CHALLENGE.scenarioEn);
    expect(original.challenge.taskEn).toBe(WEEK01_CHALLENGE.taskEn);
  });

  it("never shows a department or role label", () => {
    for (const { challenge } of SITUATIONS) {
      expect(challenge.titleEn).not.toContain(" · ");
      expect(challenge.titleTh).not.toContain(" · ");
    }
  });
});

describe("pixel icons", () => {
  it("has a valid 12x12 icon for every situation", () => {
    expect(Object.keys(SITUATION_ICONS).sort()).toEqual(SITUATIONS.map((situation) => situation.id).sort());
    for (const [id, rows] of Object.entries(SITUATION_ICONS)) {
      expect(rows, id).toHaveLength(12);
      for (const row of rows) {
        expect(row.length, `${id}: "${row}"`).toBe(12);
        for (const ch of row) expect(ch === "." || ch in ICON_PALETTE, `${id}: ${ch}`).toBe(true);
      }
    }
  });
});

describe("pickSituation", () => {
  it("picks the rarity by the first random number", () => {
    expect(pickSituation(seq(0.49, 0)).rarity).toBe("common");
    expect(pickSituation(seq(0.5, 0)).rarity).toBe("rare");
    expect(pickSituation(seq(0.8, 0)).rarity).toBe("epic");
    expect(pickSituation(seq(0.95, 0)).rarity).toBe("legendary");
    expect(pickSituation(seq(0.999, 0)).rarity).toBe("legendary");
  });

  it("picks within the rarity by the second random number", () => {
    expect(pickSituation(seq(0, 0))).toBe(SITUATIONS.find((situation) => situation.rarity === "common"));
    expect(pickSituation(seq(0.999, 0.999))).toBe([...SITUATIONS].reverse().find((situation) => situation.rarity === "legendary"));
  });

  it("never returns the excluded situation", () => {
    const rng = lcg(7);
    for (const { id } of SITUATIONS) for (let i = 0; i < 200; i += 1) expect(pickSituation(rng, id).id).not.toBe(id);
  });

  it("follows the odds over many draws", () => {
    const rng = lcg(42);
    const tally: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const draws = 20000;
    for (let i = 0; i < draws; i += 1) tally[pickSituation(rng).rarity] += 1;
    const pct = (rarity: Rarity) => (tally[rarity] / draws) * 100;
    expect(Math.abs(pct("common") - 50)).toBeLessThan(2);
    expect(Math.abs(pct("rare") - 30)).toBeLessThan(2);
    expect(Math.abs(pct("epic") - 15)).toBeLessThan(2);
    expect(Math.abs(pct("legendary") - 5)).toBeLessThan(2);
  });
});
