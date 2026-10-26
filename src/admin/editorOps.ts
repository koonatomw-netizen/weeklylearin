import { CANVAS_H, CANVAS_W, type ColorToken, type Paragraph, type SlideDoc, type SlideElement, type WidgetKind } from "../shared/slideDoc";

/** Pure, testable operations used by the Slide Builder. Every function returns a new document. */

export interface Rect { x: number; y: number; w: number; h: number }
export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export interface Guide { axis: "x" | "y"; at: number }

export const makeElementId = () => `el-${crypto.randomUUID().slice(0, 12)}`;

export function updateElement(doc: SlideDoc, id: string, patch: Partial<SlideElement>): SlideDoc {
  return { ...doc, elements: doc.elements.map((element) => (element.id === id ? { ...element, ...patch } as SlideElement : element)) };
}

export function updateElements(doc: SlideDoc, ids: readonly string[], change: (element: SlideElement) => SlideElement): SlideDoc {
  const set = new Set(ids);
  return { ...doc, elements: doc.elements.map((element) => (set.has(element.id) ? change(element) : element)) };
}

export function deleteElements(doc: SlideDoc, ids: readonly string[]): SlideDoc {
  const set = new Set(ids);
  return { ...doc, elements: doc.elements.filter((element) => !set.has(element.id)) };
}

/** Copies are placed just above their originals, offset so they are visible. */
export function duplicateElements(doc: SlideDoc, ids: readonly string[], makeId = makeElementId): { doc: SlideDoc; newIds: string[] } {
  const set = new Set(ids);
  const newIds: string[] = [];
  const elements: SlideElement[] = [];
  for (const element of doc.elements) {
    elements.push(element);
    if (set.has(element.id)) {
      const copy = { ...structuredClone(element), id: makeId(), x: element.x + 24, y: element.y + 24, locked: undefined } as SlideElement;
      delete (copy as { locked?: boolean }).locked;
      newIds.push(copy.id);
      elements.push(copy);
    }
  }
  return { doc: { ...doc, elements }, newIds };
}

export function moveElements(doc: SlideDoc, ids: readonly string[], dx: number, dy: number): SlideDoc {
  return updateElements(doc, ids, (element) => (element.locked ? element : { ...element, x: Math.round(element.x + dx), y: Math.round(element.y + dy) }));
}

/** Array order is layer order: the last element is drawn on top. */
export function reorderLayer(doc: SlideDoc, id: string, to: "forward" | "backward" | "front" | "back"): SlideDoc {
  const elements = [...doc.elements];
  const index = elements.findIndex((element) => element.id === id);
  if (index < 0) return doc;
  const [element] = elements.splice(index, 1);
  const target = to === "front" ? elements.length : to === "back" ? 0 : to === "forward" ? Math.min(elements.length, index + 1) : Math.max(0, index - 1);
  elements.splice(target, 0, element);
  return { ...doc, elements };
}

export function boundingBox(rects: readonly Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
}

export function alignElements(doc: SlideDoc, ids: readonly string[], mode: "left" | "center" | "right" | "top" | "middle" | "bottom"): SlideDoc {
  const targets = doc.elements.filter((element) => ids.includes(element.id) && !element.locked);
  if (!targets.length) return doc;
  // A single element aligns to the canvas; several align to their shared bounding box.
  const box = targets.length === 1 ? { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H } : boundingBox(targets);
  return updateElements(doc, targets.map((t) => t.id), (element) => {
    switch (mode) {
      case "left": return { ...element, x: box.x };
      case "center": return { ...element, x: Math.round(box.x + (box.w - element.w) / 2) };
      case "right": return { ...element, x: box.x + box.w - element.w };
      case "top": return { ...element, y: box.y };
      case "middle": return { ...element, y: Math.round(box.y + (box.h - element.h) / 2) };
      case "bottom": return { ...element, y: box.y + box.h - element.h };
    }
  });
}

// ----------------------------------------------------------------- snapping

/** Snap targets: canvas edges and centre, plus edges and centres of the other elements. */
export function snapGuides(doc: SlideDoc, excludeIds: readonly string[]): { x: number[]; y: number[] } {
  const x = [0, CANVAS_W / 2, CANVAS_W];
  const y = [0, CANVAS_H / 2, CANVAS_H];
  for (const element of doc.elements) {
    if (excludeIds.includes(element.id)) continue;
    x.push(element.x, element.x + element.w / 2, element.x + element.w);
    y.push(element.y, element.y + element.h / 2, element.y + element.h);
  }
  return { x, y };
}

function nearest(values: number[], targets: number[], threshold: number): { delta: number; at: number } | null {
  let best: { delta: number; at: number } | null = null;
  for (const value of values) {
    for (const target of targets) {
      const delta = target - value;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, at: target };
    }
  }
  return best;
}

/** Adjust a moving rectangle so its edges or centre land on the nearest guide within `threshold`. */
export function snapRect(rect: Rect, guides: { x: number[]; y: number[] }, threshold: number): { rect: Rect; lines: Guide[] } {
  const sx = nearest([rect.x, rect.x + rect.w / 2, rect.x + rect.w], guides.x, threshold);
  const sy = nearest([rect.y, rect.y + rect.h / 2, rect.y + rect.h], guides.y, threshold);
  const lines: Guide[] = [];
  if (sx) lines.push({ axis: "x", at: sx.at });
  if (sy) lines.push({ axis: "y", at: sy.at });
  return { rect: { ...rect, x: Math.round(rect.x + (sx?.delta ?? 0)), y: Math.round(rect.y + (sy?.delta ?? 0)) }, lines };
}

/** Snap only the edges a resize handle is moving. */
export function snapResize(rect: Rect, handle: Handle, guides: { x: number[]; y: number[] }, threshold: number): { rect: Rect; lines: Guide[] } {
  let { x, y, w, h } = rect;
  const lines: Guide[] = [];
  if (handle.includes("e")) { const s = nearest([x + w], guides.x, threshold); if (s) { w += s.delta; lines.push({ axis: "x", at: s.at }); } }
  if (handle.includes("w")) { const s = nearest([x], guides.x, threshold); if (s) { x += s.delta; w -= s.delta; lines.push({ axis: "x", at: s.at }); } }
  if (handle.includes("s")) { const s = nearest([y + h], guides.y, threshold); if (s) { h += s.delta; lines.push({ axis: "y", at: s.at }); } }
  if (handle.includes("n")) { const s = nearest([y], guides.y, threshold); if (s) { y += s.delta; h -= s.delta; lines.push({ axis: "y", at: s.at }); } }
  return { rect: { x: Math.round(x), y: Math.round(y), w: Math.max(8, Math.round(w)), h: Math.max(8, Math.round(h)) }, lines };
}

/** Resize from a handle. Minimum 8×8; `keepRatio` preserves the starting aspect ratio. */
export function resizeRect(start: Rect, handle: Handle, dx: number, dy: number, keepRatio = false): Rect {
  let { x, y, w, h } = start;
  if (handle.includes("e")) w = start.w + dx;
  if (handle.includes("w")) { w = start.w - dx; x = start.x + dx; }
  if (handle.includes("s")) h = start.h + dy;
  if (handle.includes("n")) { h = start.h - dy; y = start.y + dy; }
  if (keepRatio && start.w > 0 && start.h > 0) {
    const ratio = start.w / start.h;
    if (handle === "n" || handle === "s") w = h * ratio;
    else if (handle === "e" || handle === "w") h = w / ratio;
    else if (Math.abs(w / start.w) > Math.abs(h / start.h)) h = w / ratio;
    else w = h * ratio;
    if (handle.includes("w")) x = start.x + start.w - w;
    if (handle.includes("n")) y = start.y + start.h - h;
  }
  if (w < 8) { if (handle.includes("w")) x -= 8 - w; w = 8; }
  if (h < 8) { if (handle.includes("n")) y -= 8 - h; h = 8; }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

// --------------------------------------------------------------------- text

export function paragraphsToText(paragraphs: readonly Paragraph[]): string {
  return paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join("")).join("\n");
}

/**
 * Apply edited plain text back onto styled paragraphs. Each line becomes a paragraph that keeps
 * the style of the paragraph at the same position (or the last one). Lines whose text did not
 * change keep their original mixed-style runs.
 */
export function textToParagraphs(previous: readonly Paragraph[], text: string): Paragraph[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  return lines.map((line, index) => {
    const template = previous[Math.min(index, previous.length - 1)] ?? { runs: [{ text: "" }], size: 32 as const, font: "sans" as const };
    const original = previous[index];
    if (original && original.runs.map((run) => run.text).join("") === line) return original;
    const { runs, ...style } = template;
    const first = runs[0] ?? { text: "" };
    return { ...style, runs: [{ ...first, text: line }] };
  });
}

/** Apply a run-level style to every run in a text element. */
export function styleAllRuns(paragraphs: readonly Paragraph[], patch: { bold?: boolean; italic?: boolean; color?: ColorToken | null }): Paragraph[] {
  return paragraphs.map((paragraph) => ({
    ...paragraph,
    runs: paragraph.runs.map((run) => {
      const next = { ...run };
      if (patch.bold !== undefined) { if (patch.bold) next.bold = true; else delete next.bold; }
      if (patch.italic !== undefined) { if (patch.italic) next.italic = true; else delete next.italic; }
      if (patch.color !== undefined) { if (patch.color) next.color = patch.color; else delete next.color; }
      return next;
    }),
  }));
}

export function styleAllParagraphs(paragraphs: readonly Paragraph[], patch: Partial<Pick<Paragraph, "size" | "font" | "align" | "bullet">>): Paragraph[] {
  return paragraphs.map((paragraph) => {
    const next = { ...paragraph, ...patch };
    if (next.align === "left") delete next.align;
    if (!next.bullet) delete next.bullet;
    return next;
  });
}

// ---------------------------------------------------------------- factories

export type NewElementKind = "text" | "rect" | "rounded" | "ellipse" | "line" | "window" | WidgetKind;

/** New elements are centred on the canvas with sensible theme defaults. */
export function newElement(kind: NewElementKind, makeId = makeElementId): SlideElement {
  const centred = (w: number, h: number) => ({ id: makeId(), x: Math.round((CANVAS_W - w) / 2), y: Math.round((CANVAS_H - h) / 2), w, h });
  switch (kind) {
    case "text": return { ...centred(640, 90), type: "text", paragraphs: [{ runs: [{ text: "New text" }], size: 40, font: "sans" }] };
    case "rect": case "rounded": case "ellipse":
      return { ...centred(kind === "ellipse" ? 240 : 400, 240), type: "shape", shape: kind, fill: "surface", stroke: "accent", strokeWidth: 2 };
    case "line": return { ...centred(600, 4), type: "shape", shape: "line", stroke: "accent", strokeWidth: 2 };
    case "window": return { ...centred(900, 500), type: "window", title: "window.txt" };
    default: return { ...centred(kind === "battle" || kind === "leaderboard" ? 1200 : 640, kind === "live-stats" ? 140 : 420), type: "widget", widget: kind };
  }
}

export function addElement(doc: SlideDoc, element: SlideElement): SlideDoc {
  return { ...doc, elements: [...doc.elements, element] };
}
