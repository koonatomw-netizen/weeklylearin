import { describe, expect, it } from "vitest";
import { DEFAULT_CHALLENGE, LEGACY_META, deckMeta, validateChallenge, type PublishedDeck } from "../src/shared/deck";
import { createFromTemplate } from "../src/shared/templates";

let n = 0;
const id = () => `d${++n}`;

describe("deckMeta", () => {
  it("derives step counts and the first slide holding each live widget", () => {
    const deck: PublishedDeck = {
      schema: 1, planId: "p", version: 1, title: "Week 02", weekDate: null, durationMin: null, notes: "", challenge: DEFAULT_CHALLENGE,
      slides: ["title", "step-by-step", "interactive-challenge", "prompt-battle", "prompt-battle", "leaderboard"].map((template, index) => ({
        sourceSlideId: `s${index}`, title: template, doc: createFromTemplate(template as never, id),
      })),
    };
    const meta = deckMeta(deck);
    expect(meta.steps).toEqual([0, 4, 0, 0, 0, 0]);
    expect(meta.widgetSlides).toEqual({ challenge: 2, "live-stats": 2, join: 2, battle: 3, leaderboard: 5 });
  });

  it("keeps the built-in deck layout for legacy rooms", () => {
    expect(LEGACY_META.steps).toHaveLength(13);
    expect(LEGACY_META.widgetSlides.battle).toBe(5);
  });
});

describe("validateChallenge", () => {
  it("requires English fields and falls back to English for Thai", () => {
    expect(validateChallenge({ titleEn: "", scenarioEn: "x", taskEn: "y" }).ok).toBe(false);
    const result = validateChallenge({ titleEn: " Check-out ", scenarioEn: "A guest wants a late check-out.", taskEn: "Write a prompt.\u0007" });
    expect(result.ok && result.challenge).toEqual({
      titleEn: "Check-out", titleTh: "Check-out",
      scenarioEn: "A guest wants a late check-out.", scenarioTh: "A guest wants a late check-out.",
      taskEn: "Write a prompt.", taskTh: "Write a prompt.",
    });
    expect(validateChallenge({ ...DEFAULT_CHALLENGE, taskEn: "x".repeat(601) }).ok).toBe(false);
  });
});
