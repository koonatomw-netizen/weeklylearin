import { describe, expect, it } from "vitest";
import {
  addElement, alignElements, deleteElements, duplicateElements, moveElements, newElement, paragraphsToText,
  reorderLayer, resizeRect, snapGuides, snapRect, styleAllRuns, textToParagraphs,
} from "../src/admin/editorOps";
import { validateSlideDoc, type Paragraph, type SlideDoc } from "../src/shared/slideDoc";

let n = 0;
const id = () => `t${++n}`;
const base = (): SlideDoc => ({
  schema: 1, background: { token: "bg" },
  elements: [
    { id: "a", type: "shape", shape: "rect", x: 100, y: 100, w: 200, h: 100 },
    { id: "b", type: "shape", shape: "rect", x: 500, y: 300, w: 100, h: 100 },
    { id: "c", type: "shape", shape: "rect", x: 900, y: 600, w: 100, h: 50, locked: true },
  ],
});

describe("element operations", () => {
  it("moves unlocked elements only", () => {
    const doc = moveElements(base(), ["a", "c"], 10.4, -5);
    expect(doc.elements[0]).toMatchObject({ x: 110, y: 95 });
    expect(doc.elements[2]).toMatchObject({ x: 900, y: 600 });
  });

  it("duplicates above the original with fresh ids and no lock", () => {
    const { doc, newIds } = duplicateElements(base(), ["c"], id);
    expect(doc.elements).toHaveLength(4);
    expect(doc.elements[3]).toMatchObject({ id: newIds[0], x: 924, y: 624 });
    expect("locked" in doc.elements[3]).toBe(false);
  });

  it("reorders layers", () => {
    expect(reorderLayer(base(), "a", "front").elements.map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(reorderLayer(base(), "c", "back").elements.map((e) => e.id)).toEqual(["c", "a", "b"]);
    expect(reorderLayer(base(), "a", "forward").elements.map((e) => e.id)).toEqual(["b", "a", "c"]);
    expect(reorderLayer(base(), "a", "backward").elements.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("aligns one element to the canvas and several to their bounding box", () => {
    expect(alignElements(base(), ["a"], "center").elements[0].x).toBe(700);
    const doc = alignElements(base(), ["a", "b"], "right");
    expect(doc.elements[0].x + doc.elements[0].w).toBe(600);
    expect(doc.elements[1].x + doc.elements[1].w).toBe(600);
  });

  it("deletes and adds", () => {
    expect(deleteElements(base(), ["a", "b"]).elements.map((e) => e.id)).toEqual(["c"]);
    const added = addElement(base(), newElement("text", id));
    expect(added.elements.at(-1)?.type).toBe("text");
  });

  it("produces documents the server validator accepts", () => {
    let doc = base();
    for (const kind of ["text", "rect", "rounded", "ellipse", "line", "window", "join", "battle", "leaderboard", "live-stats", "challenge", "feedback-status"] as const) doc = addElement(doc, newElement(kind, id));
    doc = duplicateElements(doc, doc.elements.map((e) => e.id), id).doc;
    expect(validateSlideDoc(doc).ok).toBe(true);
  });
});

describe("snapping and resizing", () => {
  it("snaps to canvas centre and other elements", () => {
    const guides = snapGuides(base(), ["a"]);
    const { rect, lines } = snapRect({ x: 697, y: 10, w: 200, h: 100 }, guides, 6);
    expect(rect.x).toBe(700); // element centre (797) snaps onto the canvas centre line (800)
    expect(lines.some((line) => line.axis === "x")).toBe(true);
    const far = snapRect({ x: 650, y: 10, w: 10, h: 10 }, guides, 6);
    expect(far.lines).toHaveLength(0);
  });

  it("resizes from each handle with a minimum size and optional aspect ratio", () => {
    const start = { x: 100, y: 100, w: 200, h: 100 };
    expect(resizeRect(start, "se", 50, 20)).toEqual({ x: 100, y: 100, w: 250, h: 120 });
    expect(resizeRect(start, "nw", 50, 20)).toEqual({ x: 150, y: 120, w: 150, h: 80 });
    expect(resizeRect(start, "w", 500, 0)).toMatchObject({ w: 8 });
    expect(resizeRect(start, "se", 200, 0, true)).toEqual({ x: 100, y: 100, w: 400, h: 200 });
  });
});

describe("text editing", () => {
  const styled: Paragraph[] = [
    { runs: [{ text: "Hello " }, { text: "world", color: "accent", bold: true }], size: 60, font: "mono" },
    { runs: [{ text: "Second" }], size: 24, font: "sans", bullet: true },
  ];

  it("round-trips plain text", () => {
    expect(paragraphsToText(styled)).toBe("Hello world\nSecond");
  });

  it("keeps mixed runs on unchanged lines and paragraph styles by position", () => {
    const next = textToParagraphs(styled, "Hello world\nSecond line\nThird");
    expect(next[0]).toBe(styled[0]);
    expect(next[1]).toMatchObject({ size: 24, bullet: true, runs: [{ text: "Second line" }] });
    expect(next[2]).toMatchObject({ size: 24, font: "sans", runs: [{ text: "Third" }] });
  });

  it("styles every run", () => {
    const bold = styleAllRuns(styled, { bold: true, color: null });
    expect(bold.flatMap((p) => p.runs).every((r) => r.bold && !r.color)).toBe(true);
  });
});
