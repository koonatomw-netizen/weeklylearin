import { describe, expect, it } from "vitest";
import { SLIDE_STEPS, SLIDE_TITLES, TOTAL_SLIDES } from "../src/shared/challenge";
import { LEGACY_META } from "../src/shared/deck";
import { CANVAS_H, CANVAS_W, slidePlainText, stepCount, validateSlideDoc } from "../src/shared/slideDoc";
import { skillsLesson, week01Lesson } from "../src/shared/templates";

let n = 0;
const id = () => `k${++n}`;
const THAI = /[฀-๿]/;

describe("skillsLesson", () => {
  const slides = skillsLesson(id);
  const text = (index: number) => slidePlainText(slides[index].doc);

  it("has the six skills slides in teaching order", () => {
    expect(slides.map((slide) => slide.title)).toEqual([
      "Skills: Write It Once", "What Is a Skill?", "Example: grill-me", "Live Demo", "Safety: Read Before You Run", "Where to Find More",
    ]);
  });

  it("produces valid slide documents that fit the canvas", () => {
    for (const slide of slides) {
      const result = validateSlideDoc(slide.doc);
      expect(result.ok, slide.title).toBe(true);
      for (const element of slide.doc.elements) {
        expect(element.x + element.w, `${slide.title} width`).toBeLessThanOrEqual(CANVAS_W);
        expect(element.y + element.h, `${slide.title} height`).toBeLessThanOrEqual(CANVAS_H);
      }
    }
  });

  it("shows the real grill-me files, not paraphrases", () => {
    expect(text(2)).toContain("A relentless interview to sharpen a plan or design.");
    expect(text(2)).toContain('Call the Skill tool with "grilling".');
    expect(text(2)).toContain("Interview the user relentlessly until you reach a shared understanding.");
    expect(text(2)).toContain("Do not act on it until the user confirms");
  });

  it("lists the two skill sources and the official install command", () => {
    expect(text(5)).toContain("github.com/mattpocock/skills");
    expect(text(5)).toContain("github.com/anthropics/skills");
    expect(text(5)).toContain("/plugin marketplace add anthropics/skills");
  });

  it("reveals the demo in 3 steps and the safety questions in 4", () => {
    expect(stepCount(slides[3].doc)).toBe(3);
    expect(stepCount(slides[4].doc)).toBe(4);
  });

  it("warns that grill-me calls another skill", () => {
    expect(text(4).toLowerCase()).toContain("grilling");
  });

  it("has Thai text on every slide", () => {
    for (let i = 0; i < slides.length; i += 1) expect(THAI.test(text(i)), slides[i].title).toBe(true);
  });

  it("has no vote slide", () => {
    for (const slide of slides) expect(slide.title.toLowerCase()).not.toContain("vote");
  });
});

describe("skills slides in the decks", () => {
  it("appends them after Final Results in the Studio Week 01 lesson", () => {
    const lesson = week01Lesson(id);
    expect(lesson).toHaveLength(13);
    expect(lesson[6].title).toBe("Final Results");
    expect(lesson.slice(7).map((slide) => slide.title)).toEqual(skillsLesson(id).map((slide) => slide.title));
  });

  it("appends them to the built-in deck without moving existing slides", () => {
    expect(TOTAL_SLIDES).toBe(13);
    expect(SLIDE_STEPS.slice(0, 7)).toEqual([0, 5, 2, 5, 0, 0, 0]);
    expect(SLIDE_STEPS.slice(7)).toEqual([0, 0, 0, 3, 4, 0]);
    expect(SLIDE_TITLES).toHaveLength(13);
    expect(SLIDE_TITLES[7]).toBe("Skills: Write It Once");
    expect(LEGACY_META.steps).toEqual(SLIDE_STEPS);
    expect(LEGACY_META.widgetSlides).toEqual({ join: 4, "live-stats": 4, challenge: 4, battle: 5, leaderboard: 6 });
  });
});
