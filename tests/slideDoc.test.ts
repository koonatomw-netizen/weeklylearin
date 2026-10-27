import { describe, expect, it } from "vitest";
import { slidePlainText, stepCount, validateSlideDoc, withFreshIds, type SlideDoc } from "../src/shared/slideDoc";
import { TEMPLATE_IDS, createFromTemplate, week01Lesson } from "../src/shared/templates";

let counter = 0;
const makeId = () => `e${++counter}`;
const textDoc = (extra: Record<string, unknown> = {}, docExtra: Record<string, unknown> = {}) => ({
  schema: 1,
  elements: [{ id: "a", type: "text", x: 10, y: 10, w: 300, h: 80, paragraphs: [{ runs: [{ text: "Hello" }], size: 32, font: "sans" }], ...extra }],
  ...docExtra,
});

describe("validateSlideDoc", () => {
  it("accepts every template and the Week 01 seed unchanged", () => {
    for (const template of TEMPLATE_IDS) {
      const doc = createFromTemplate(template, makeId);
      const result = validateSlideDoc(doc);
      expect(result.ok, template).toBe(true);
      if (result.ok) expect(result.doc).toEqual(doc);
    }
    const seed = week01Lesson(makeId);
    expect(seed).toHaveLength(13);
    for (const slide of seed) expect(validateSlideDoc(slide.doc).ok, slide.title).toBe(true);
  });

  it("drops unknown keys and never keeps markup-capable fields", () => {
    const result = validateSlideDoc(textDoc({ html: "<img src=x onerror=alert(1)>", style: "color:red", onClick: "x" }, { script: "alert(1)" }));
    expect(result.ok).toBe(true);
    const json = JSON.stringify(result.ok && result.doc);
    expect(json).not.toContain("onerror");
    expect(json).not.toContain("style");
    expect(json).not.toContain("script");
  });

  it("keeps text as plain text (markup stays literal, control characters removed)", () => {
    const result = validateSlideDoc(textDoc({ paragraphs: [{ runs: [{ text: "<b>hi</b>\u0007" }], size: 32, font: "sans" }] }));
    expect(result.ok && (result.doc.elements[0] as { paragraphs: Array<{ runs: Array<{ text: string }> }> }).paragraphs[0].runs[0].text).toBe("<b>hi</b>");
  });

  it("rejects values outside the theme and schema", () => {
    expect(validateSlideDoc(textDoc({ color: "#ff0000" })).ok).toBe(false);
    expect(validateSlideDoc(textDoc({ paragraphs: [{ runs: [{ text: "x" }], size: 33, font: "sans" }] })).ok).toBe(false);
    expect(validateSlideDoc(textDoc({ type: "iframe" })).ok).toBe(false);
    expect(validateSlideDoc({ ...textDoc(), schema: 2 }).ok).toBe(false);
    expect(validateSlideDoc(textDoc({ id: "bad id!" })).ok).toBe(false);
    expect(validateSlideDoc({ schema: 1, elements: [textDoc().elements[0], textDoc().elements[0]] }).ok).toBe(false);
    expect(validateSlideDoc({ schema: 1, elements: Array.from({ length: 61 }, (_, i) => ({ ...textDoc().elements[0], id: `x${i}` })) }).ok).toBe(false);
    expect(validateSlideDoc({ schema: 1, elements: [{ id: "w", type: "widget", widget: "evil", x: 0, y: 0, w: 10, h: 10 }] }).ok).toBe(false);
  });

  it("clamps geometry to the canvas", () => {
    const result = validateSlideDoc(textDoc({ x: 99999, y: -99999, w: 0.5 }));
    expect(result.ok && result.doc.elements[0]).toMatchObject({ x: 1600, y: -450, w: 4 });
  });

  it("only accepts images that exist", () => {
    const image = { schema: 1, elements: [{ id: "i", type: "image", assetId: "asset-12345", fit: "cover", alt: "", x: 0, y: 0, w: 10, h: 10 }] };
    expect(validateSlideDoc(image, { assetExists: () => false }).ok).toBe(false);
    expect(validateSlideDoc(image, { assetExists: () => true }).ok).toBe(true);
    expect(validateSlideDoc({ ...image, elements: [{ ...image.elements[0], assetId: "../../etc/passwd" }] }).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("counts reveal steps and refreshes ids", () => {
    const doc = createFromTemplate("step-by-step", makeId);
    expect(stepCount(doc)).toBe(4);
    const copy = withFreshIds(doc, makeId);
    expect(copy.elements.map((e) => e.id)).not.toEqual(doc.elements.map((e) => e.id));
    expect(slidePlainText(copy as SlideDoc)).toContain("Step-by-Step");
  });
});
