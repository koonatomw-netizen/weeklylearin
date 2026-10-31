import { describe, expect, it } from "vitest";
import { weekId, weekLesson, weekPlanId, weekTitle } from "../src/shared/curriculum";
import { CURRICULUM } from "../src/shared/curriculumWeeks";
import { validateChallenge } from "../src/shared/deck";
import { validateGames } from "../src/shared/games";
import { slidePlainText, validateSlideDoc } from "../src/shared/slideDoc";
import { checkSlide } from "./helpers/slideCheck";

const THAI = /[฀-๿]/;

const idFor = () => { let n = 0; return () => `c${++n}`; };

describe("curriculum", () => {
  it("covers weeks 3 to 12 in order with unique ids", () => {
    expect(CURRICULUM.map((week) => week.number)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(new Set(CURRICULUM.map((week) => weekId(week.number))).size).toBe(10);
    expect(weekTitle(CURRICULUM[0])).toBe("Week 03 · Make AI Write Like You");
    expect(weekPlanId(12)).toBe("week12-starter-plan");
  });

  it("matches the roadmap lesson and game for every week", () => {
    const roadmap: Record<number, [string, string]> = {
      3: ["Make AI Write Like You", "Tone Battle"], 4: ["AI Can Read That!", "Document Detective"], 5: ["Think Better with AI", "Decision Challenge"],
      6: ["One Prompt, Many Results", "Format Race"], 7: ["Plan Anything with AI", "Planning Mission"], 8: ["AI as Your Second Pair of Eyes", "Spot the Mistake"],
      9: ["Create Better Visuals", "Poster Prompt Duel"], 10: ["Can You Trust AI?", "AI Fact or Fiction"], 11: ["Build Your Own AI Workflow", "Workflow Builder"], 12: ["AI Skills Championship", "Team Mission"],
    };
    for (const week of CURRICULUM) {
      expect(week.title).toBe(roadmap[week.number][0]);
      expect(week.game.title).toBe(`Game: ${roadmap[week.number][1]}`);
    }
  });

  for (const week of CURRICULUM) {
    describe(weekTitle(week), () => {
      const slides = weekLesson(week, idFor());

      it("has between 10 and 16 slides that open with the week and close with the take-home", () => {
        expect(slides.length).toBeGreaterThanOrEqual(10);
        expect(slides.length).toBeLessThanOrEqual(16);
        expect(slides[0].title).toBe(week.title);
        expect(slides[slides.length - 1].title).toBe("Take It to Work");
        expect(new Set(slides.map((slide) => slide.title)).size).toBe(slides.length);
      });

      it("uses at least four different layouts so the deck never looks the same", () => {
        const shapes = new Set(slides.map((slide) => `${slide.doc.background && "token" in slide.doc.background ? slide.doc.background.token : "image"}:${slide.doc.elements.map((element) => element.type).join("").length % 17}`));
        expect(shapes.size).toBeGreaterThanOrEqual(4);
      });

      it("has only valid slide documents, with Thai next to the English", () => {
        for (const slide of slides) {
          const result = validateSlideDoc(slide.doc);
          expect(result.ok, `${slide.title}: ${result.ok ? "" : result.error}`).toBe(true);
          if (slide.doc.elements.some((element) => element.type === "widget")) continue;
          if (/AI Answer|Document \d/.test(slide.title) && !THAI.test(slidePlainText(slide.doc))) continue;
          expect(THAI.test(slidePlainText(slide.doc)), `${slide.title} has Thai`).toBe(true);
        }
      });

      it("has no overlapping content, nothing off the canvas and text that fits", () => {
        expect(slides.flatMap((slide) => checkSlide(slide))).toEqual([]);
      });

      it("has presenter notes on the opener, demo, safety and game slides", () => {
        for (const slide of [slides[0], slides.find((s) => s.title === week.demo.title)!, slides.find((s) => s.title === week.safety.title)!, slides.find((s) => s.title === week.game.title)!]) {
          expect((slide.doc.notes ?? "").length, slide.title).toBeGreaterThan(20);
        }
      });

      it("has valid Game Hub games with unique ids", () => {
        const result = validateGames(week.games);
        expect(result.ok, result.ok ? "" : result.error).toBe(true);
        expect(new Set(week.games.map((game) => game.id)).size).toBe(week.games.length);
      });

      it("ships a valid challenge only for prompt-writing weeks, with the live slides and AI feedback slide", () => {
        const live = slides.some((slide) => slide.title === "Prompt Battle");
        expect(live).toBe(Boolean(week.challenge));
        if (week.challenge) {
          expect(validateChallenge(week.challenge).ok).toBe(true);
          expect(slides.some((slide) => slide.title === "Check Your Prompt (Privately)")).toBe(true);
          expect(slides.map((slide) => slide.title).indexOf("Check Your Prompt (Privately)")).toBeLessThan(slides.map((slide) => slide.title).indexOf("Live Prompt Challenge"));
        }
      });
    });
  }
});
