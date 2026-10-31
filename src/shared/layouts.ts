import type { ColorToken, SlideDoc, SlideElement } from "./slideDoc";
import { card, chrome, doc, para, text, widget, type MakeId } from "./slideKit";

/**
 * Slide layouts for the weekly lessons and the Studio templates. Each one fixes its own geometry so text never
 * runs into a neighbour: content sits between y=290 and y=820, inside the 1600x900 canvas, clear of the chrome.
 * The fit and overlap rules are enforced by tests/curriculum.test.ts.
 */

export interface Bi { en: string; th: string }
export interface CardItem { title: string; body: Bi; tone?: ColorToken }

const GAP = 24;
const FULL = 1472;

/** Eyebrow, English title and Thai subtitle. The title shrinks to 48px when it is long. */
export function head(id: MakeId, eyebrow: string, title: string, titleTh?: string): SlideElement[] {
  const size = title.length > 34 ? 48 : 60;
  return [
    text(id, 64, 104, FULL, 36, [para(`// ${eyebrow}`, 24, { font: "mono", color: "accent" })]),
    text(id, 64, 144, FULL, 84, [para(title, size, { font: "mono", bold: true })]),
    ...(titleTh ? [text(id, 64, 232, FULL, 40, [para(titleTh, 24, { color: "text-2" })])] : []),
  ];
}

const bar = (id: MakeId, y: number, h: number, line: Bi, tone: ColorToken = "accent"): SlideElement[] => [
  { id: id(), type: "shape", shape: "rounded", x: 64, y, w: FULL, h, fill: "surface", stroke: tone, strokeWidth: 2 },
  text(id, 96, y + 8, FULL - 64, h - 16, [para(line.en, 24, { font: "mono", color: tone }), para(line.th, 20, { color: "text-2" })], { valign: "middle" }),
];

// ------------------------------------------------------------------- hero

export interface HeroOptions {
  kicker: string;
  number: string;
  title: string;
  outcome: Bi;
  /** Up to six short lines for the terminal window, for example "learn: tone and format". */
  lines: string[];
  wow: Bi;
  /** Puts the terminal window on the left and the title on the right. */
  mirror?: boolean;
  notes?: string;
}

/** Opening slide: huge week number, title, what people will be able to do, and a teaser for the live demo. */
export function heroLayout(id: MakeId, o: HeroOptions): SlideDoc {
  const left = o.mirror ? 640 : 64;
  const width = o.mirror ? 896 : 900;
  const winX = o.mirror ? 64 : 1000;
  return doc([
    ...chrome(id, o.kicker),
    text(id, left, 128, 420, 170, [para(o.number, 120, { font: "mono", bold: true, color: "accent" })]),
    text(id, left, 312, width, 170, [para(o.title, 60, { font: "mono", bold: true })]),
    text(id, left, 500, width, 160, [para(o.outcome.en, 28), para(o.outcome.th, 28, { color: "text-2" })]),
    { id: id(), type: "window", title: `start --week ${o.number}`, x: winX, y: 130, w: 536, h: 430 },
    text(id, winX + 32, 206, 472, 340, o.lines.map((line) => para(`> ${line}`, 24, { font: "mono", color: "success" }))),
    ...bar(id, 690, 120, { en: `★ Today's wow: ${o.wow.en}`, th: o.wow.th }),
  ], o.notes, "accent-soft");
}

// ------------------------------------------------------------------ cards

export interface CardsOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  cards: CardItem[];
  numbered?: boolean;
  bar?: Bi;
  notes?: string;
}

/** Two to four cards side by side that appear one at a time. */
export function cardsLayout(id: MakeId, o: CardsOptions): SlideDoc {
  const n = o.cards.length;
  const w = Math.floor((FULL - GAP * (n - 1)) / n);
  const height = o.bar ? (n <= 3 ? 360 : 420) : 500;
  const big = n <= 3;
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    ...o.cards.flatMap((item, index): SlideElement[] => {
      const x = 64 + index * (w + GAP);
      const tone = item.tone ?? "accent";
      return [
        card(id, x, 290, w, height, tone === "accent" ? "border" : tone, index + 1),
        text(id, x + 28, 312, w - 56, height - 44, [
          ...(o.numbered ? [para(`0${index + 1}`, 32, { font: "mono", color: tone })] : []),
          para(item.title, big ? 32 : 28, { font: "mono", bold: true, color: o.numbered ? "text" : tone }),
          para(item.body.en, big ? 28 : 24),
          para(item.body.th, big ? 24 : 20, { color: "text-2" }),
        ], { step: index + 1 }),
      ];
    }),
    ...(o.bar ? bar(id, 290 + height + 28, 92, o.bar) : []),
  ], o.notes);
}

// -------------------------------------------------------------- statement

export interface StatementOptions { kicker: string; eyebrow: string; big: Bi; sub?: Bi; notes?: string }

/** One big idea on a quiet background. Good for opening a topic. */
export function statementLayout(id: MakeId, o: StatementOptions): SlideDoc {
  return doc([
    ...chrome(id, o.kicker),
    text(id, 64, 104, FULL, 36, [para(`// ${o.eyebrow}`, 24, { font: "mono", color: "accent" })]),
    { id: id(), type: "shape", shape: "rect", x: 64, y: 200, w: 10, h: 450, fill: "accent" },
    text(id, 110, 200, 1380, 300, [para(o.big.en, o.big.en.length > 60 ? 60 : 72, { font: "mono", bold: true })]),
    text(id, 110, 520, 1380, 110, [para(o.big.th, 32, { color: "text-2" })], { step: 1 }),
    ...(o.sub ? [text(id, 110, 676, 1380, 110, [para(o.sub.en, 28, { font: "mono", color: "accent" }), para(o.sub.th, 24, { color: "text-2" })], { step: 2 })] : []),
  ], o.notes, "surface");
}

// -------------------------------------------------------------- checklist

export interface ChecklistOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  items: Bi[];
  tip: { title: string; body: Bi };
  tone?: ColorToken;
  /** Puts the tip card on the left. */
  flip?: boolean;
  notes?: string;
}

/** Up to five ticked rows that appear one by one, with a tip card on the right. */
export function checklistLayout(id: MakeId, o: ChecklistOptions): SlideDoc {
  const tone = o.tone ?? "success";
  const ox = o.flip ? 540 : 0;
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    ...o.items.flatMap((item, index): SlideElement[] => {
      const y = 290 + index * 98;
      return [
        { id: id(), type: "shape", shape: "ellipse", x: 64 + ox, y: y + 20, w: 44, h: 44, fill: tone, step: index + 1 },
        text(id, 64 + ox, y + 20, 44, 44, [para("✓", 28, { font: "mono", bold: true, color: "on-accent", align: "center" })], { valign: "middle", step: index + 1 }),
        text(id, 132 + ox, y, o.flip ? 872 : 880, 86, [para(item.en, 28), para(item.th, 24, { color: "text-2" })], { step: index + 1 }),
      ];
    }),
    card(id, o.flip ? 64 : 1060, 290, 476, 470, tone),
    text(id, o.flip ? 92 : 1088, 314, 420, 420, [
      para(o.tip.title, 32, { font: "mono", bold: true, color: tone }),
      para(o.tip.body.en, 28),
      para(o.tip.body.th, 24, { color: "text-2" }),
    ]),
  ], o.notes);
}

// ----------------------------------------------------------------- do / don't

export interface DoDontOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  donts: Bi[];
  dos: Bi[];
  dontTitle?: Bi;
  doTitle?: Bi;
  bar?: string;
  /** Puts the green card on the left. */
  flip?: boolean;
  notes?: string;
}

/** Red card on the left, green card on the right. Use for safety and good habits. */
export function doDontLayout(id: MakeId, o: DoDontOptions): SlideDoc {
  const side = (x: number, tone: ColorToken, label: Bi, items: Bi[]): SlideElement[] => [
    card(id, x, 290, 716, 450, tone),
    text(id, x + 32, 316, 652, 400, [
      para(label.en, 40, { font: "mono", bold: true, color: tone }),
      para(label.th, 24, { color: "text-2" }),
      ...items.flatMap((item) => [para(item.en, 28, { bullet: true }), para(item.th, 20, { color: "text-2" })]),
    ]),
  ];
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    ...side(o.flip ? 820 : 64, "danger", o.dontTitle ?? { en: "Don't", th: "ไม่ควร" }, o.donts),
    ...side(o.flip ? 64 : 820, "success", o.doTitle ?? { en: "Do", th: "ควร" }, o.dos),
    ...(o.bar ? [text(id, 64, 762, FULL, 44, [para(o.bar, 24, { font: "mono", color: "accent" })])] : []),
  ], o.notes);
}

// ------------------------------------------------------------ big numbers

export interface BigNumbersOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  stats: Array<{ value: string; label: Bi; tone?: ColorToken }>;
  bar?: Bi;
  notes?: string;
}

/** Two to four huge numbers with a caption each. */
export function bigNumbersLayout(id: MakeId, o: BigNumbersOptions): SlideDoc {
  const n = o.stats.length;
  const w = Math.floor((FULL - GAP * (n - 1)) / n);
  const height = o.bar ? 380 : 480;
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    ...o.stats.flatMap((stat, index): SlideElement[] => {
      const x = 64 + index * (w + GAP);
      const tone = stat.tone ?? "accent";
      return [
        card(id, x, 290, w, height, "border", index + 1),
        text(id, x + 28, 316, w - 56, height - 48, [
          para(stat.value, n <= 3 ? 96 : 72, { font: "mono", bold: true, color: tone }),
          para(stat.label.en, 28),
          para(stat.label.th, 24, { color: "text-2" }),
        ], { step: index + 1 }),
      ];
    }),
    ...(o.bar ? bar(id, 290 + height + 28, 100, o.bar) : []),
  ], o.notes);
}

// ---------------------------------------------------------------- timeline

export interface TimelineOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  steps: Array<{ label: string; body: Bi }>;
  tone?: ColorToken;
  bar?: string;
  notes?: string;
}

/** Three to five numbered stops along a line, revealed in order. */
export function timelineLayout(id: MakeId, o: TimelineOptions): SlideDoc {
  const n = o.steps.length;
  const pitch = Math.floor(FULL / n);
  const tone = o.tone ?? "accent";
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    { id: id(), type: "shape", shape: "line", x: 64 + pitch / 2, y: 380, w: pitch * (n - 1), h: 2, stroke: "border", strokeWidth: 4 },
    ...o.steps.flatMap((step, index): SlideElement[] => {
      const x = 64 + index * pitch;
      const cx = x + pitch / 2;
      return [
        { id: id(), type: "shape", shape: "ellipse", x: cx - 32, y: 348, w: 64, h: 64, fill: tone, step: index + 1 },
        text(id, cx - 32, 348, 64, 64, [para(String(index + 1), 32, { font: "mono", bold: true, color: "on-accent", align: "center" })], { valign: "middle", step: index + 1 }),
        text(id, x + 12, 440, pitch - 24, 80, [para(step.label, 28, { font: "mono", bold: true, align: "center" })], { step: index + 1 }),
        text(id, x + 12, 530, pitch - 24, 230, [para(step.body.en, 24, { align: "center" }), para(step.body.th, 20, { align: "center", color: "text-2" })], { step: index + 1 }),
      ];
    }),
    ...(o.bar ? [text(id, 64, 774, FULL, 44, [para(o.bar, 24, { font: "mono", color: "accent" })])] : []),
  ], o.notes);
}

// ------------------------------------------------------------------- rules

export interface RulesOptions {
  kicker: string;
  title: string;
  titleTh?: string;
  rules: Bi[];
  scoring: Bi;
  /** Puts the join panel on the left. */
  flip?: boolean;
  notes?: string;
}

/** Game introduction with the live join panel on the right so the room can join while it reads the rules. */
export function rulesLayout(id: MakeId, o: RulesOptions): SlideDoc {
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, "game time", o.title, o.titleTh),
    { id: id(), type: "window", title: "game.exe", x: o.flip ? 536 : 64, y: 290, w: 1000, h: 510 },
    text(id, o.flip ? 568 : 96, 362, 936, 420, [
      ...o.rules.flatMap((rule) => [para(rule.en, 28, { bullet: true }), para(rule.th, 20, { color: "text-2" })]),
      para(`Score: ${o.scoring.en}`, 24, { font: "mono", color: "success" }),
      para(o.scoring.th, 20, { color: "text-2" }),
    ]),
    widget(id, o.flip ? 64 : 1104, 290, 432, 510, "join"),
  ], o.notes, "bg");
}

// -------------------------------------------------------------------- demo

export interface DemoOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  windowTitle: string;
  steps: Bi[];
  watch: { title: string; bullets: Bi[] };
  /** Puts the watch-for card on the left. */
  flip?: boolean;
  notes?: string;
}

/** The presenter's live demo: three numbered steps in a window and a "what to notice" card. */
export function demoLayout(id: MakeId, o: DemoOptions): SlideDoc {
  const ox = o.flip ? 572 : 0;
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    { id: id(), type: "window", title: o.windowTitle, x: 64 + ox, y: 290, w: 900, h: 500 },
    ...o.steps.flatMap((step, index): SlideElement[] => {
      const y = 370 + index * 134;
      return [
        { id: id(), type: "shape", shape: "ellipse", x: 96 + ox, y: y + 14, w: 48, h: 48, fill: "accent", step: index + 1 },
        text(id, 96 + ox, y + 14, 48, 48, [para(String(index + 1), 28, { font: "mono", bold: true, color: "on-accent", align: "center" })], { valign: "middle", step: index + 1 }),
        text(id, 166 + ox, y, 770, 120, [para(step.en, 28), para(step.th, 24, { color: "text-2" })], { step: index + 1 }),
      ];
    }),
    card(id, o.flip ? 64 : 1000, 290, 536, 500, "accent"),
    text(id, o.flip ? 92 : 1028, 314, 480, 452, [
      para(o.watch.title, 32, { font: "mono", bold: true, color: "accent" }),
      ...o.watch.bullets.flatMap((bullet) => [para(bullet.en, 24, { bullet: true }), para(bullet.th, 20, { color: "text-2" })]),
    ]),
  ], o.notes);
}

// -------------------------------------------------------------- live slides

/** The three live slides every prompt-writing week ends with. Matches the Week 02 slides. */
export function liveSlides(id: MakeId): Array<{ title: string; doc: SlideDoc }> {
  return [
    {
      title: "Live Prompt Challenge",
      doc: doc([
        ...chrome(id, "live challenge"),
        text(id, 64, 104, FULL, 36, [para("// live activity", 24, { font: "mono", color: "accent" })]),
        text(id, 64, 144, 1000, 84, [para("Live Prompt Challenge", 60, { font: "mono", bold: true })]),
        widget(id, 64, 260, 1000, 400, "challenge"),
        widget(id, 64, 680, 1000, 130, "live-stats"),
        widget(id, 1104, 140, 432, 670, "join"),
      ], "Live slide. Use Open case to draw a case, or skip it and use the plan's challenge. Start prompt submission from the presenter controls."),
    },
    {
      title: "Prompt Battle",
      doc: doc([...chrome(id, "prompt battle"), widget(id, 64, 100, 1472, 710, "battle")], "Live slide: the active battle, vote progress and the presenter's next action button."),
    },
    {
      title: "Final Results",
      doc: doc([
        ...chrome(id, "final results"),
        text(id, 64, 104, FULL, 36, [para("// community vote", 24, { font: "mono", color: "accent" })]),
        text(id, 64, 144, FULL, 84, [para("Final Rankings", 60, { font: "mono", bold: true })]),
        widget(id, 64, 260, 1472, 560, "leaderboard"),
      ], "Live slide: champion and rankings appear once the Grand Final is complete."),
    },
  ];
}

// ----------------------------------------------------------------- compare

export interface CompareOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  left: { title: string; text: Bi };
  right: { title: string; text: Bi };
  caption: Bi;
  notes?: string;
}

/** Weak version in a red window, strong version in a green one, then the lesson in a caption. */
export function compareLayout(id: MakeId, o: CompareOptions): SlideDoc {
  const side = (x: number, tone: ColorToken, win: { title: string; text: Bi }, step?: number): SlideElement[] => [
    { id: id(), type: "window", title: win.title, border: tone, x, y: 290, w: 716, h: 370, ...(step ? { step } : {}) },
    text(id, x + 32, 366, 652, 270, [para(win.text.en, 28), para(win.text.th, 24, { color: "text-2" })], { ...(step ? { step } : {}) }),
  ];
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    ...side(64, "danger", o.left),
    ...side(820, "success", o.right, 1),
    ...bar(id, 690, 120, o.caption).map((element) => ({ ...element, step: 2 })),
  ], o.notes);
}

// ---------------------------------------------------------------- document

export interface DocumentOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  windowTitle: string;
  /** Monospace lines, each at most 58 characters. */
  lines: string[];
  hint: { title: string; bullets: Bi[] };
  notes?: string;
}

/** A practice document or AI answer on screen, with a short "look for" card. Used by the detective and spot-the-mistake games. */
export function documentLayout(id: MakeId, o: DocumentOptions): SlideDoc {
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    { id: id(), type: "window", title: o.windowTitle, x: 64, y: 290, w: 960, h: 510 },
    text(id, 96, 366, 896, 414, o.lines.map((line) => para(line, 24, { font: "mono" }))),
    card(id, 1060, 290, 476, 510, "accent"),
    text(id, 1088, 314, 420, 462, [
      para(o.hint.title, 32, { font: "mono", bold: true, color: "accent" }),
      ...o.hint.bullets.flatMap((bullet) => [para(bullet.en, 24, { bullet: true }), para(bullet.th, 20, { color: "text-2" })]),
    ]),
  ], o.notes);
}

// ---------------------------------------------------------------- sidebar

export interface SidebarOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  /** Two to four rows. */
  items: CardItem[];
  /** A closing line at the bottom of the left panel. */
  foot?: Bi | string;
  notes?: string;
}

/** The title sits in a tall panel on the left and the points stack on the right, so it does not look like the card slides. */
export function sidebarLayout(id: MakeId, o: SidebarOptions): SlideDoc {
  const n = o.items.length;
  const pitch = n <= 3 ? 230 : 178;
  return doc([
    ...chrome(id, o.kicker),
    card(id, 64, 104, 470, 716, "accent"),
    text(id, 96, 136, 406, o.foot ? 480 : 652, [
      para(`// ${o.eyebrow}`, 24, { font: "mono", color: "accent" }),
      para(o.title, o.title.length > 24 ? 40 : 48, { font: "mono", bold: true }),
      ...(o.titleTh ? [para(o.titleTh, 24, { color: "text-2" })] : []),
    ]),
    ...(o.foot ? [text(id, 96, 640, 406, 150, typeof o.foot === "string" ? [para(o.foot, 20, { font: "mono", color: "accent" })] : [para(o.foot.en, 20, { font: "mono", color: "accent" }), para(o.foot.th, 20, { color: "text-2" })], { valign: "bottom" })] : []),
    ...o.items.flatMap((item, index): SlideElement[] => {
      const y = 104 + index * pitch;
      const tone = item.tone ?? "accent";
      return [
        text(id, 580, y, 90, 60, [para(`0${index + 1}`, 40, { font: "mono", bold: true, color: tone })], { step: index + 1 }),
        text(id, 680, y, 856, pitch - 14, [
          para(item.title, 28, { font: "mono", bold: true }),
          para(item.body.en, 24),
          para(item.body.th, 20, { color: "text-2" }),
        ], { step: index + 1 }),
        ...(index < n - 1 ? [{ id: id(), type: "shape", shape: "line", x: 580, y: y + pitch - 8, w: 956, h: 2, stroke: "border", strokeWidth: 1, step: index + 1 } as SlideElement] : []),
      ];
    }),
  ], o.notes, "surface");
}

// ------------------------------------------------------------------- grid

export interface GridOptions {
  kicker: string;
  eyebrow: string;
  title: string;
  titleTh?: string;
  /** Exactly four cells, two by two. */
  cells: CardItem[];
  bar?: Bi;
  notes?: string;
}

/** Four cells in a two by two grid, revealed one at a time. */
export function gridLayout(id: MakeId, o: GridOptions): SlideDoc {
  const w = (FULL - GAP) / 2;
  const h = o.bar ? 196 : 250;
  const gap = o.bar ? 16 : GAP;
  return doc([
    ...chrome(id, o.kicker),
    ...head(id, o.eyebrow, o.title, o.titleTh),
    ...o.cells.flatMap((cell, index): SlideElement[] => {
      const x = 64 + (index % 2) * (w + GAP);
      const y = 290 + Math.floor(index / 2) * (h + gap);
      const tone = cell.tone ?? "accent";
      return [
        card(id, x, y, w, h, tone === "accent" ? "border" : tone, index + 1),
        { id: id(), type: "shape", shape: "rect", x, y: y + 20, w: 8, h: h - 40, fill: tone, step: index + 1 },
        text(id, x + 32, y + 16, w - 56, h - 32, [
          para(cell.title, 28, { font: "mono", bold: true, color: tone }),
          para(cell.body.en, 24),
          para(cell.body.th, 20, { color: "text-2" }),
        ], { step: index + 1 }),
      ];
    }),
    ...(o.bar ? bar(id, 290 + 2 * h + gap + 18, 92, o.bar) : []),
  ], o.notes);
}

// -------------------------------------------------------------- spotlight

/** One big idea on a solid block of colour. */
export function spotlightLayout(id: MakeId, o: StatementOptions): SlideDoc {
  return doc([
    ...chrome(id, o.kicker),
    text(id, 64, 104, FULL, 36, [para(`// ${o.eyebrow}`, 24, { font: "mono", color: "accent" })]),
    { id: id(), type: "shape", shape: "rounded", x: 64, y: 160, w: FULL, h: 500, fill: "accent" },
    text(id, 112, 196, 1376, 280, [para(o.big.en, o.big.en.length > 64 ? 60 : 72, { font: "mono", bold: true, color: "on-accent" })]),
    text(id, 112, 500, 1376, 130, [para(o.big.th, 32, { color: "on-accent" })], { step: 1 }),
    ...(o.sub ? [text(id, 64, 690, FULL, 120, [para(o.sub.en, 28, { font: "mono", color: "accent" }), para(o.sub.th, 24, { color: "text-2" })], { step: 2 })] : []),
  ], o.notes, "bg");
}

// ----------------------------------------------------------------- retone

/** Replaces the default orange accent with another colour token, so each week gets its own colour. */
export function retone(slide: SlideDoc, tone: ColorToken): SlideDoc {
  const swap = (token: ColorToken | undefined): ColorToken | undefined => (token === "accent" ? tone : token);
  return {
    ...slide,
    elements: slide.elements.map((element): SlideElement => {
      switch (element.type) {
        case "text":
          return { ...element, ...(element.color ? { color: swap(element.color) } : {}), paragraphs: element.paragraphs.map((p) => ({ ...p, runs: p.runs.map((run) => (run.color ? { ...run, color: swap(run.color) } : run)) })) };
        case "shape":
          return { ...element, ...(element.fill ? { fill: swap(element.fill) } : {}), ...(element.stroke ? { stroke: swap(element.stroke) } : {}) };
        case "window":
          return { ...element, border: swap(element.border ?? "accent") };
        default:
          return element;
      }
    }),
  };
}
