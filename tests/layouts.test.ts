import { describe, expect, it } from "vitest";
import { TEMPLATE_IDS, TEMPLATE_INFO, createFromTemplate } from "../src/shared/templates";
import { validateSlideDoc } from "../src/shared/slideDoc";
import { checkSlide } from "./helpers/slideCheck";

let n = 0;
const id = () => `l${++n}`;

describe("templates", () => {
  it("lists every template with an English and a Thai name", () => {
    for (const template of TEMPLATE_IDS) {
      expect(TEMPLATE_INFO[template].name, template).toBeTruthy();
      expect(TEMPLATE_INFO[template].nameTh, template).toBeTruthy();
    }
  });

  it("builds valid slides for every template", () => {
    for (const template of TEMPLATE_IDS) expect(validateSlideDoc(createFromTemplate(template, id)).ok, template).toBe(true);
  });

  it("new layouts have no overlap, nothing off canvas and text that fits", () => {
    const fresh = TEMPLATE_IDS.filter((template) => ["hero", "three-cards", "big-statement", "checklist", "do-dont", "big-numbers", "timeline", "game-rules"].includes(template));
    const problems = fresh.flatMap((template) => checkSlide({ title: template, doc: createFromTemplate(template, id) }));
    expect(problems).toEqual([]);
  });
});

describe("slide checker", () => {
  const base = { schema: 1 as const, background: { token: "bg" as const } };
  const box = (x: number, y: number, w: number, h: number, content = "Hello") =>
    ({ id: `t${x}${y}`, type: "text" as const, x, y, w, h, paragraphs: [{ runs: [{ text: content }], size: 28 as const, font: "sans" as const }] });

  it("flags two text boxes that overlap", () => {
    expect(checkSlide({ title: "t", doc: { ...base, elements: [box(100, 100, 400, 100), box(300, 150, 400, 100)] } })).toHaveLength(1);
  });

  it("flags text that cannot fit its box and anything that leaves the canvas", () => {
    const long = "word ".repeat(80);
    expect(checkSlide({ title: "t", doc: { ...base, elements: [box(100, 100, 300, 60, long)] } }).join()).toContain("needs about");
    expect(checkSlide({ title: "t", doc: { ...base, elements: [box(1500, 100, 300, 60)] } }).join()).toContain("leaves the canvas");
  });

  it("allows text inside a card and flags text that straddles one", () => {
    const card = { id: "c1", type: "shape" as const, shape: "rounded" as const, x: 100, y: 100, w: 400, h: 200 };
    expect(checkSlide({ title: "t", doc: { ...base, elements: [card, box(120, 120, 300, 60)] } })).toEqual([]);
    expect(checkSlide({ title: "t", doc: { ...base, elements: [card, box(400, 120, 300, 60)] } })).toHaveLength(1);
  });

  it("flags content that runs into a window title bar", () => {
    const window = { id: "w1", type: "window" as const, title: "x", x: 100, y: 100, w: 400, h: 300 };
    expect(checkSlide({ title: "t", doc: { ...base, elements: [window, box(120, 110, 300, 60)] } }).join()).toContain("title bar");
  });
});

describe("every lesson we ship", () => {
  it("has no overlap, nothing off the canvas and text that fits", async () => {
    const { aiFeedbackSlide, headToHeadLesson, week01Lesson } = await import("../src/shared/templates");
    const { week02Lesson } = await import("../src/shared/week02");
    const slides = [
      ...week01Lesson(id).map((slide) => ({ ...slide, title: `W1 ${slide.title}` })),
      ...week02Lesson(id).map((slide) => ({ ...slide, title: `W2 ${slide.title}` })),
      ...headToHeadLesson(id).map((slide) => ({ ...slide, title: `H2H ${slide.title}` })),
      aiFeedbackSlide(id),
      ...TEMPLATE_IDS.map((template) => ({ title: `template ${template}`, doc: createFromTemplate(template, id) })),
    ];
    expect(slides.flatMap((slide) => checkSlide(slide))).toEqual([]);
  });
});
