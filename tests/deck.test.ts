import { describe, expect, it } from "vitest";
import { DEFAULT_CHALLENGE, DEFAULT_FEEDBACK_QUESTIONS, LEGACY_META, deckMeta, validateChallenge, validateFeedbackQuestions, validateSituations, type PublishedDeck } from "../src/shared/deck";
import { pickSituation } from "../src/shared/situations";
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

describe("validateSituations", () => {
  const challenge = { titleEn: "Slow report", titleTh: "", scenarioEn: "A weekly report takes two hours.", scenarioTh: "", taskEn: "Write a prompt that drafts it from notes.", taskTh: "" };

  it("treats null as the built-in pool and [] as case opening off", () => {
    expect(validateSituations(null)).toEqual({ ok: true, situations: null });
    expect(validateSituations([])).toEqual({ ok: true, situations: [] });
  });

  it("validates each case, fills Thai from English and makes unique ids", () => {
    const result = validateSituations([{ rarity: "common", challenge }, { id: "case-1", rarity: "rare", challenge }]);
    expect(result.ok && result.situations?.map((item) => item.id)).toEqual(["case-1", "case-2"]);
    expect(result.ok && result.situations?.[0].challenge.titleTh).toBe("Slow report");
  });

  it("rejects a bad rarity, a missing English field and too many cases", () => {
    expect(validateSituations([{ rarity: "mythic", challenge }]).ok).toBe(false);
    expect(validateSituations([{ rarity: "common", challenge: { ...challenge, taskEn: "" } }]).ok).toBe(false);
    expect(validateSituations(Array.from({ length: 31 }, () => ({ rarity: "common", challenge }))).ok).toBe(false);
  });

  it("draws only from the plan's own pool", () => {
    const result = validateSituations([{ rarity: "common", challenge }, { rarity: "rare", challenge: { ...challenge, titleEn: "Other" } }]);
    if (!result.ok || !result.situations) throw new Error("expected a pool");
    for (let run = 0; run < 20; run += 1) {
      expect(result.situations.map((item) => item.id)).toContain(pickSituation(Math.random, undefined, result.situations).id);
    }
  });
});

describe("validateFeedbackQuestions", () => {
  it("uses the defaults when unset and requires English wording", () => {
    expect(validateFeedbackQuestions(undefined)).toEqual({ ok: true, questions: null });
    expect(validateFeedbackQuestions({ ...DEFAULT_FEEDBACK_QUESTIONS, supportNeeded: { en: " ", th: "x" } }).ok).toBe(false);
  });

  it("falls back to English for Thai and caps the length", () => {
    const result = validateFeedbackQuestions({ ...DEFAULT_FEEDBACK_QUESTIONS, workChallenges: { en: "Which task took longest?", th: "" } });
    expect(result.ok && result.questions?.workChallenges.th).toBe("Which task took longest?");
    expect(validateFeedbackQuestions({ ...DEFAULT_FEEDBACK_QUESTIONS, otherComments: { en: "x".repeat(161), th: "" } }).ok).toBe(false);
  });
});
