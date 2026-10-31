import { describe, expect, it } from "vitest";
import { validateGames } from "../src/shared/games";
import { CANVAS_H, CANVAS_W, slidePlainText, stepCount, validateSlideDoc } from "../src/shared/slideDoc";
import { HEAD_TO_HEAD_GAMES } from "../src/shared/starterGames";
import { headToHeadLesson } from "../src/shared/templates";

let n = 0;
const id = () => `h${++n}`;
const THAI = /[฀-๿]/;

describe("headToHeadLesson", () => {
  const slides = headToHeadLesson(id);

  it("has an intro, three rounds and a recap", () => {
    expect(slides.map((slide) => slide.title)).toEqual([
      "Head-to-Head: Which Answer Wins?",
      "Head-to-Head: Round 1", "Head-to-Head: Round 2", "Head-to-Head: Round 3",
      "Head-to-Head: What Did We Learn?",
    ]);
  });

  it("produces valid slides that fit the canvas and carry Thai", () => {
    for (const slide of slides) {
      expect(validateSlideDoc(slide.doc).ok, slide.title).toBe(true);
      for (const element of slide.doc.elements) {
        expect(element.x + element.w, `${slide.title} width`).toBeLessThanOrEqual(CANVAS_W);
        expect(element.y + element.h, `${slide.title} height`).toBeLessThanOrEqual(CANVAS_H);
      }
      expect(THAI.test(slidePlainText(slide.doc)), `${slide.title} has Thai`).toBe(true);
    }
  });

  it("hides who wrote which answer until the reveal step", () => {
    for (const slide of slides.slice(1, 4)) {
      expect(stepCount(slide.doc)).toBe(1);
      const revealed = slide.doc.elements.filter((element) => element.type === "text" && element.step === 1);
      expect(revealed).toHaveLength(1);
      expect(slidePlainText({ ...slide.doc, elements: revealed })).toContain("Reveal");
      const visible = slidePlainText({ ...slide.doc, elements: slide.doc.elements.filter((element) => !revealed.includes(element)) });
      expect(visible).not.toMatch(/ChatGPT|Claude/);
    }
  });
});

describe("HEAD_TO_HEAD_GAMES", () => {
  it("is a valid blind poll with one question per round", () => {
    const result = validateGames(HEAD_TO_HEAD_GAMES);
    expect(result.ok).toBe(true);
    expect(HEAD_TO_HEAD_GAMES).toHaveLength(1);
    expect(HEAD_TO_HEAD_GAMES[0].kind).toBe("poll");
    expect(HEAD_TO_HEAD_GAMES[0].questions).toHaveLength(3);
    for (const question of HEAD_TO_HEAD_GAMES[0].questions) {
      expect(question.options.map((option) => option.en)).toEqual(["Answer A", "Answer B", "Can't tell"]);
    }
  });
});
