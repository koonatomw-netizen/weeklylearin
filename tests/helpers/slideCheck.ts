import { CANVAS_H, CANVAS_W, type SlideDoc, type SlideElement, type TextElement } from "../../src/shared/slideDoc";

/**
 * Static layout checks for slide documents: nothing leaves the canvas, no two pieces of content overlap, and the text
 * fits its box. Text fit is an estimate (average glyph widths), so it is deliberately a little pessimistic; the real
 * renderer is checked separately in the browser.
 */

interface Box { x: number; y: number; w: number; h: number }
const right = (b: Box) => b.x + b.w;
const bottom = (b: Box) => b.y + b.h;
const TOL = 1;

const overlaps = (a: Box, b: Box) => a.x < right(b) - TOL && b.x < right(a) - TOL && a.y < bottom(b) - TOL && b.y < bottom(a) - TOL;
const contains = (outer: Box, inner: Box) => inner.x >= outer.x - TOL && inner.y >= outer.y - TOL && right(inner) <= right(outer) + TOL && bottom(inner) <= bottom(outer) + TOL;

const isContainer = (element: SlideElement) => element.type === "window" || (element.type === "shape" && element.shape !== "line");
const isLine = (element: SlideElement) => element.type === "shape" && element.shape === "line";

/** Height of the window title bar: the first content may start below it. */
const WINDOW_HEAD = 60;

const THAI_MARK = /[ัิ-ฺ็-๎]/;
const THAI = /[฀-๿]/;

function textWidth(content: string, size: number, mono: boolean, bold: boolean): number {
  let total = 0;
  for (const char of content) {
    if (THAI_MARK.test(char)) continue;
    // JetBrains Mono is exactly 0.6em wide whether bold or not; the proportional fonts are estimated and padded.
    const factor = mono ? 0.6 : THAI.test(char) ? 0.6 : /[A-Z]/.test(char) ? 0.62 : 0.54;
    total += size * factor * (bold && !mono ? 1.05 : 1);
  }
  return total;
}

/** Estimated rendered height of a text element, in pixels. */
export function estimateTextHeight(element: TextElement): number {
  let height = 0;
  element.paragraphs.forEach((paragraph, index) => {
    const content = paragraph.runs.map((run) => run.text).join("");
    const bold = paragraph.runs.some((run) => run.bold);
    const width = Math.max(10, element.w - (paragraph.bullet ? paragraph.size * 1.1 : 0));
    let lines = 0;
    for (const part of content.split("\n")) lines += Math.max(1, Math.ceil((textWidth(part, paragraph.size, paragraph.font === "mono", bold) * (paragraph.font === "mono" ? 1 : 1.06)) / width));
    height += lines * paragraph.size * 1.32 + (index < element.paragraphs.length - 1 ? paragraph.size * 0.35 : 0);
  });
  return height;
}

export function checkSlide(slide: { title: string; doc: SlideDoc }): string[] {
  const problems: string[] = [];
  const name = slide.title;
  const elements = slide.doc.elements;
  const label = (element: SlideElement, index: number) => `#${index + 1} ${element.type}${element.type === "text" ? ` "${element.paragraphs[0].runs[0].text.slice(0, 28)}"` : ""}`;

  elements.forEach((element, index) => {
    if (element.x < 0 || element.y < 0 || right(element) > CANVAS_W || bottom(element) > CANVAS_H) problems.push(`${name}: ${label(element, index)} leaves the canvas`);
    if (element.type === "text") {
      const needed = estimateTextHeight(element);
      if (needed > element.h) problems.push(`${name}: ${label(element, index)} needs about ${Math.round(needed)}px but its box is ${element.h}px`);
    }
  });

  for (let i = 0; i < elements.length; i += 1) {
    for (let j = i + 1; j < elements.length; j += 1) {
      const a = elements[i];
      const b = elements[j];
      if (isLine(a) || isLine(b) || !overlaps(a, b)) continue;
      const aContainer = isContainer(a);
      const bContainer = isContainer(b);
      // Content may sit fully inside a container (text on a card, a number on a circle, a widget in a window), never straddle it.
      if (aContainer && contains(a, b)) {
        if (a.type === "window" && b.y < a.y + WINDOW_HEAD) problems.push(`${name}: ${label(b, j)} runs into the title bar of ${label(a, i)}`);
        continue;
      }
      if (bContainer && contains(b, a)) {
        if (b.type === "window" && a.y < b.y + WINDOW_HEAD) problems.push(`${name}: ${label(a, i)} runs into the title bar of ${label(b, j)}`);
        continue;
      }
      problems.push(`${name}: ${label(a, i)} overlaps ${label(b, j)}`);
    }
  }
  return problems;
}
