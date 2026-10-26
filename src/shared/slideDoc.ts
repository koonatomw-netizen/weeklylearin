/**
 * Structured slide document. Slides are data only — never HTML or script — and every
 * value is constrained to the 4Seas theme. The same validator runs in the browser and
 * on the server; the server's result is the one that is stored.
 */

export const CANVAS_W = 1600;
export const CANVAS_H = 900;

export const COLOR_TOKENS = [
  "text", "text-2", "accent", "success", "danger", "on-accent",
  "bg", "surface", "surface-2", "border",
  "context", "goal", "audience", "constraints", "format",
] as const;
export type ColorToken = typeof COLOR_TOKENS[number];

export const FONT_SIZES = [16, 20, 24, 28, 32, 40, 48, 60, 72, 96, 120] as const;
export type FontSize = typeof FONT_SIZES[number];

export const WIDGET_KINDS = ["join", "live-stats", "challenge", "battle", "leaderboard", "feedback-status"] as const;
export type WidgetKind = typeof WIDGET_KINDS[number];

export const BACKGROUND_TOKENS = ["bg", "surface", "accent-soft"] as const;

export interface TextRun { text: string; bold?: boolean; italic?: boolean; color?: ColorToken }
export interface Paragraph {
  runs: TextRun[];
  size: FontSize;
  font: "sans" | "mono";
  align?: "left" | "center" | "right";
  bullet?: boolean;
}

interface ElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Reveal step: the element appears once the presenter reaches this step (0 = always visible). */
  step?: number;
  locked?: boolean;
}
export interface TextElement extends ElementBase { type: "text"; paragraphs: Paragraph[]; color?: ColorToken; valign?: "top" | "middle" | "bottom" }
export interface ImageElement extends ElementBase { type: "image"; assetId: string; fit: "cover" | "contain"; alt: string }
export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: "rect" | "rounded" | "ellipse" | "line";
  fill?: ColorToken;
  stroke?: ColorToken;
  strokeWidth?: 1 | 2 | 4;
  opacity?: number;
}
export interface WindowElement extends ElementBase { type: "window"; title: string; border?: ColorToken }
export interface WidgetElement extends ElementBase { type: "widget"; widget: WidgetKind }
export type SlideElement = TextElement | ImageElement | ShapeElement | WindowElement | WidgetElement;

export interface SlideDoc {
  schema: 1;
  background: { token: typeof BACKGROUND_TOKENS[number] } | { assetId: string };
  elements: SlideElement[];
  notes?: string;
}

export const LIMITS = { elements: 60, paragraphs: 30, runs: 40, runText: 2000, totalText: 12000, title: 120, notes: 4000, steps: 20, docBytes: 200_000 };

export type ValidationResult = { ok: true; doc: SlideDoc } | { ok: false; error: string };

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const ASSET_ID = /^[A-Za-z0-9_-]{8,80}$/;

class Invalid extends Error {}
const fail = (message: string): never => { throw new Invalid(message); };
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const oneOf = <T extends string>(value: unknown, options: readonly T[], label: string): T =>
  (typeof value === "string" && (options as readonly string[]).includes(value) ? value as T : fail(`${label} must be one of: ${options.join(", ")}.`));
const optionalOneOf = <T extends string>(value: unknown, options: readonly T[], label: string): T | undefined =>
  value === undefined || value === null ? undefined : oneOf(value, options, label);
const number = (value: unknown, min: number, max: number, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${label} must be a number.`);
  return Math.round(Math.min(max, Math.max(min, value as number)));
};
/** Strip control characters (keeps newlines/tabs) so stored text is plain. */
const plain = (value: unknown, max: number, label: string): string => {
  if (typeof value !== "string") fail(`${label} must be text.`);
  const text = (value as string).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  if (text.length > max) fail(`${label} is longer than ${max} characters.`);
  return text;
};

/**
 * Validate and normalise an untrusted slide document. Unknown keys are dropped, numbers are
 * clamped to the canvas, and anything outside the schema is rejected with a readable message.
 */
export function validateSlideDoc(input: unknown, options: { assetExists?: (id: string) => boolean } = {}): ValidationResult {
  try {
    if (!isObject(input)) fail("Slide document must be an object.");
    const raw = input as Record<string, unknown>;
    if (raw.schema !== 1) fail("Unsupported slide schema version.");
    const asset = (value: unknown, label: string) => {
      const id = typeof value === "string" && ASSET_ID.test(value) ? value : fail(`${label} is not a valid image reference.`);
      if (options.assetExists && !options.assetExists(id)) fail(`${label} refers to an image that does not exist.`);
      return id;
    };

    let background: SlideDoc["background"] = { token: "bg" };
    if (raw.background !== undefined) {
      if (!isObject(raw.background)) fail("Background is invalid.");
      const bg = raw.background as Record<string, unknown>;
      background = bg.assetId !== undefined ? { assetId: asset(bg.assetId, "Background image") } : { token: oneOf(bg.token, BACKGROUND_TOKENS, "Background") };
    }

    if (!Array.isArray(raw.elements)) fail("Elements must be a list.");
    const list = raw.elements as unknown[];
    if (list.length > LIMITS.elements) fail(`A slide can have at most ${LIMITS.elements} elements.`);
    const ids = new Set<string>();
    let totalText = 0;

    const elements = list.map((item, index): SlideElement => {
      const label = `Element ${index + 1}`;
      if (!isObject(item)) fail(`${label} is invalid.`);
      const e = item as Record<string, unknown>;
      const id = typeof e.id === "string" && ID.test(e.id) ? e.id : fail(`${label} has an invalid id.`);
      if (ids.has(id)) fail(`${label} repeats id "${id}".`);
      ids.add(id);
      const base: ElementBase = {
        id,
        x: number(e.x, -CANVAS_W / 2, CANVAS_W, `${label} x`),
        y: number(e.y, -CANVAS_H / 2, CANVAS_H, `${label} y`),
        w: number(e.w, 4, CANVAS_W * 1.5, `${label} width`),
        h: number(e.h, 2, CANVAS_H * 1.5, `${label} height`),
      };
      if (e.step !== undefined && e.step !== 0) base.step = number(e.step, 0, LIMITS.steps, `${label} step`);
      if (e.locked === true) base.locked = true;

      switch (e.type) {
        case "text": {
          if (!Array.isArray(e.paragraphs) || e.paragraphs.length === 0) fail(`${label} needs at least one paragraph.`);
          if ((e.paragraphs as unknown[]).length > LIMITS.paragraphs) fail(`${label} has too many paragraphs.`);
          const paragraphs = (e.paragraphs as unknown[]).map((p, pi): Paragraph => {
            if (!isObject(p)) fail(`${label} paragraph ${pi + 1} is invalid.`);
            const para = p as Record<string, unknown>;
            if (!Array.isArray(para.runs) || para.runs.length > LIMITS.runs) fail(`${label} paragraph ${pi + 1} runs are invalid.`);
            const runs = (para.runs as unknown[]).map((r): TextRun => {
              if (!isObject(r)) fail(`${label} contains an invalid text run.`);
              const run = r as Record<string, unknown>;
              const text = plain(run.text, LIMITS.runText, `${label} text`);
              totalText += text.length;
              const out: TextRun = { text };
              if (run.bold === true) out.bold = true;
              if (run.italic === true) out.italic = true;
              const color = optionalOneOf(run.color, COLOR_TOKENS, `${label} text color`);
              if (color) out.color = color;
              return out;
            });
            const size = typeof para.size === "number" && (FONT_SIZES as readonly number[]).includes(para.size) ? para.size as FontSize : fail(`${label} font size must be one of ${FONT_SIZES.join(", ")}.`);
            const out: Paragraph = { runs, size, font: oneOf(para.font, ["sans", "mono"] as const, `${label} font`) };
            const align = optionalOneOf(para.align, ["left", "center", "right"] as const, `${label} alignment`);
            if (align && align !== "left") out.align = align;
            if (para.bullet === true) out.bullet = true;
            return out;
          });
          const out: TextElement = { ...base, type: "text", paragraphs };
          const color = optionalOneOf(e.color, COLOR_TOKENS, `${label} color`);
          if (color) out.color = color;
          const valign = optionalOneOf(e.valign, ["top", "middle", "bottom"] as const, `${label} vertical alignment`);
          if (valign && valign !== "top") out.valign = valign;
          return out;
        }
        case "image":
          return { ...base, type: "image", assetId: asset(e.assetId, `${label} image`), fit: oneOf(e.fit ?? "cover", ["cover", "contain"] as const, `${label} fit`), alt: plain(e.alt ?? "", 200, `${label} alt text`) };
        case "shape": {
          const out: ShapeElement = { ...base, type: "shape", shape: oneOf(e.shape, ["rect", "rounded", "ellipse", "line"] as const, `${label} shape`) };
          const fill = optionalOneOf(e.fill, COLOR_TOKENS, `${label} fill`);
          const stroke = optionalOneOf(e.stroke, COLOR_TOKENS, `${label} stroke`);
          if (fill) out.fill = fill;
          if (stroke) out.stroke = stroke;
          if (e.strokeWidth !== undefined) out.strokeWidth = [1, 2, 4].includes(e.strokeWidth as number) ? e.strokeWidth as 1 | 2 | 4 : fail(`${label} stroke width must be 1, 2 or 4.`);
          if (e.opacity !== undefined) {
            if (typeof e.opacity !== "number" || !Number.isFinite(e.opacity)) fail(`${label} opacity must be a number.`);
            const opacity = Math.round(Math.min(1, Math.max(0.05, e.opacity as number)) * 100) / 100;
            if (opacity < 1) out.opacity = opacity;
          }
          return out;
        }
        case "window": {
          const out: WindowElement = { ...base, type: "window", title: plain(e.title ?? "", 80, `${label} title`) };
          const border = optionalOneOf(e.border, COLOR_TOKENS, `${label} border`);
          if (border) out.border = border;
          return out;
        }
        case "widget":
          return { ...base, type: "widget", widget: oneOf(e.widget, WIDGET_KINDS, `${label} widget`) };
        default:
          return fail(`${label} has an unknown type.`);
      }
    });
    if (totalText > LIMITS.totalText) fail(`A slide can hold at most ${LIMITS.totalText} characters of text.`);

    const doc: SlideDoc = { schema: 1, background, elements };
    if (raw.notes !== undefined && raw.notes !== "") doc.notes = plain(raw.notes, LIMITS.notes, "Presenter notes");
    if (JSON.stringify(doc).length > LIMITS.docBytes) fail("Slide is too large.");
    return { ok: true, doc };
  } catch (error) {
    if (error instanceof Invalid) return { ok: false, error: error.message };
    throw error;
  }
}

/** Number of presenter reveal steps on a slide (highest element step). */
export function stepCount(doc: SlideDoc): number {
  return doc.elements.reduce((max, element) => Math.max(max, element.step ?? 0), 0);
}

/** Copy of a document with every element given a fresh id (for duplicating slides). */
export function withFreshIds(doc: SlideDoc, makeId: () => string): SlideDoc {
  return { ...doc, elements: doc.elements.map((element) => ({ ...element, id: makeId() })) };
}

/** Plain text of a slide, for search and fallback titles. */
export function slidePlainText(doc: SlideDoc): string {
  return doc.elements.flatMap((element) => element.type === "text" ? element.paragraphs.map((p) => p.runs.map((r) => r.text).join("")) : element.type === "window" ? [element.title] : []).join(" ").trim();
}
