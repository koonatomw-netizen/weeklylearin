import type { ColorToken, FontSize, Paragraph, SlideDoc, SlideElement, TextElement, WidgetKind } from "./slideDoc";

/** Small builders shared by every slide template and lesson. Kept free of lesson content so layouts can use them without import cycles. */

export type MakeId = () => string;

export const para = (text: string, size: FontSize, options: Partial<Omit<Paragraph, "runs" | "size">> & { color?: ColorToken; bold?: boolean } = {}): Paragraph => {
  const { color, bold, ...rest } = options;
  return { font: "sans", ...rest, size, runs: [{ text, ...(color ? { color } : {}), ...(bold ? { bold } : {}) }] };
};

export const text = (id: MakeId, x: number, y: number, w: number, h: number, paragraphs: Paragraph[], extra: Partial<TextElement> = {}): TextElement =>
  ({ id: id(), type: "text", x, y, w, h, paragraphs, ...extra });

export const widget = (id: MakeId, x: number, y: number, w: number, h: number, kind: WidgetKind): SlideElement =>
  ({ id: id(), type: "widget", widget: kind, x, y, w, h });

/** Brand line and footer shared by every template, matching the built-in deck. */
export const chrome = (id: MakeId, kicker: string): SlideElement[] => [
  text(id, 64, 40, 700, 36, [para("4Seas · live training", 20, { font: "mono", color: "text-2" })]),
  text(id, 1136, 40, 400, 36, [para(kicker, 20, { font: "mono", color: "accent", align: "right" })]),
  { id: id(), type: "shape", shape: "line", x: 64, y: 832, w: 1472, h: 2, stroke: "border", strokeWidth: 1 },
  text(id, 64, 844, 900, 32, [para("4Seas Nimman · Chiang Mai", 16, { font: "mono", color: "text-2" })]),
];

/** Eyebrow and title. Pass a narrower width on slides that put a live panel beside the heading. */
export const heading = (id: MakeId, eyebrow: string, title: string, width = 1472): SlideElement[] => [
  text(id, 64, 104, width, 40, [para(`// ${eyebrow}`, 24, { font: "mono", color: "accent" })]),
  text(id, 64, 146, width, 84, [para(title, 60, { font: "mono", bold: true })]),
];

export const doc = (elements: SlideElement[], notes?: string, background: "bg" | "surface" | "accent-soft" = "bg"): SlideDoc =>
  ({ schema: 1, background: { token: background }, elements, ...(notes ? { notes } : {}) });

/** A bordered card; `step` makes it appear on that presenter step. */
export const card = (id: MakeId, x: number, y: number, w: number, h: number, stroke: ColorToken, step?: number): SlideElement =>
  ({ id: id(), type: "shape", shape: "rounded", x, y, w, h, fill: "surface", stroke, strokeWidth: 2, ...(step ? { step } : {}) });
