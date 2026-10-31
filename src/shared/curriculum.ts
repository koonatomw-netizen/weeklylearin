import type { Challenge } from "./deck";
import type { GameDef } from "./games";
import {
  bigNumbersLayout, cardsLayout, checklistLayout, compareLayout, demoLayout, doDontLayout, documentLayout, heroLayout, liveSlides,
  gridLayout, retone, rulesLayout, sidebarLayout, spotlightLayout, statementLayout, timelineLayout,
  type BigNumbersOptions, type Bi, type CardsOptions, type ChecklistOptions, type CompareOptions, type DemoOptions, type DoDontOptions,
  type DocumentOptions, type StatementOptions, type TimelineOptions,
} from "./layouts";
import type { ColorToken, SlideDoc } from "./slideDoc";
import type { MakeId } from "./slideKit";
import { aiFeedbackSlide } from "./templates";

/**
 * Data-driven lessons for the 12-week course (weeks 3 to 12). Every week follows the same rhythm so presenters
 * always know where they are, while the layouts change from slide to slide so the deck never looks the same twice:
 *   opener, check-in, 3-4 concept slides, live demo, safety, game rules, [game material], [live round], take-home.
 */

type Without<T> = Omit<T, "kicker">;

export type Concept =
  | ({ layout: "statement" } & Without<StatementOptions>)
  | ({ layout: "cards" } & Without<CardsOptions>)
  | ({ layout: "compare" } & Without<CompareOptions>)
  | ({ layout: "checklist" } & Without<ChecklistOptions>)
  | ({ layout: "numbers" } & Without<BigNumbersOptions>)
  | ({ layout: "timeline" } & Without<TimelineOptions>);

export interface WeekSpec {
  number: number;
  title: string;
  /** What staff will be able to do, in English and Thai. */
  outcome: Bi;
  category: string;
  durationMin: number;
  lines: string[];
  wow: Bi;
  /** The take-home question from last week, asked at the start. */
  checkIn: Bi;
  concepts: Concept[];
  demo: Without<DemoOptions>;
  safety: Without<DoDontOptions>;
  game: { title: string; titleTh: string; rules: Bi[]; scoring: Bi };
  /** Practice documents or AI answers the game refers to, shown after the rules. */
  gameSlides?: Array<Without<DocumentOptions>>;
  /** Prompt-writing weeks: the Prompt Battle challenge (adds the AI feedback slide and the three live slides). */
  challenge?: Challenge;
  games: GameDef[];
  takeHome: { cards: Array<{ title: string; body: Bi }>; next: Bi };
  /** Presenter notes for the plan. */
  planNotes: string;
  notes: { opener: string; checkIn: string; demo: string; safety: string; game: string; takeHome: string };
}

export const weekId = (number: number) => `week${String(number).padStart(2, "0")}-starter`;
export const weekPlanId = (number: number) => `${weekId(number)}-plan`;
export const weekTitle = (spec: WeekSpec) => `Week ${String(spec.number).padStart(2, "0")} · ${spec.title}`;

/** Each week has its own colour so the weeks look different from each other. */
const WEEK_TONES: ColorToken[] = ["goal", "constraints", "audience", "format", "accent"];
export const weekTone = (number: number): ColorToken => WEEK_TONES[(number - 3) % WEEK_TONES.length];

export function weekLesson(spec: WeekSpec, id: MakeId): Array<{ title: string; doc: SlideDoc }> {
  const kicker = `week ${String(spec.number).padStart(2, "0")}`;
  const slides: Array<{ title: string; doc: SlideDoc }> = [];
  const tone = weekTone(spec.number);
  const mirror = spec.number % 2 === 0;
  const add = (title: string, doc: SlideDoc) => slides.push({ title, doc });

  add(spec.title, heroLayout(id, { kicker, number: String(spec.number).padStart(2, "0"), title: spec.title, outcome: spec.outcome, lines: spec.lines, wow: spec.wow, mirror, notes: spec.notes.opener }));
  add("Check-in", (spec.number % 3 === 0 ? spotlightLayout : statementLayout)(id, {
    kicker, eyebrow: "two-minute check-in", big: { en: spec.checkIn.en, th: spec.checkIn.th },
    sub: { en: "Tell a neighbour. Practice stories only, no real names.", th: "เล่าให้เพื่อนข้างๆ ฟัง เป็นเรื่องฝึกเท่านั้น ไม่ใส่ชื่อจริง" },
    notes: spec.notes.checkIn,
  }));

  for (const concept of spec.concepts) {
    switch (concept.layout) {
      case "statement": { const { layout: _, ...options } = concept; add(`Idea: ${options.big.en.slice(0, 60)}`, spotlightLayout(id, { kicker, ...options })); break; }
      case "cards": {
        const { layout: _, ...options } = concept;
        const n = options.cards.length;
        // Rotate the card slides between three looks: plain cards, a title sidebar, and a two by two grid.
        const look = (spec.number + slides.length) % 2 === 0 ? 1 : 2;
        if (look === 1 && n >= 2 && n <= 4) {
          add(options.title, sidebarLayout(id, { kicker, eyebrow: options.eyebrow, title: options.title, titleTh: options.titleTh, items: options.cards, foot: options.bar, notes: options.notes }));
        } else if (look === 2 && n === 4) {
          add(options.title, gridLayout(id, { kicker, eyebrow: options.eyebrow, title: options.title, titleTh: options.titleTh, cells: options.cards, bar: options.bar, notes: options.notes }));
        } else add(options.title, cardsLayout(id, { kicker, ...options }));
        break;
      }
      case "compare": { const { layout: _, ...options } = concept; add(options.title, compareLayout(id, { kicker, ...options })); break; }
      case "checklist": { const { layout: _, ...options } = concept; add(options.title, checklistLayout(id, { kicker, ...options, flip: (spec.number + slides.length) % 2 === 1 })); break; }
      case "numbers": { const { layout: _, ...options } = concept; add(options.title, bigNumbersLayout(id, { kicker, ...options })); break; }
      case "timeline": {
        const { layout: _, ...options } = concept;
        const n = options.steps.length;
        if (n >= 2 && n <= 4) {
          add(options.title, sidebarLayout(id, { kicker, eyebrow: options.eyebrow, title: options.title, titleTh: options.titleTh, items: options.steps.map((step) => ({ title: step.label, body: step.body })), foot: options.bar, notes: options.notes }));
        } else add(options.title, timelineLayout(id, { kicker, ...options }));
        break;
      }
    }
  }

  add(spec.demo.title, demoLayout(id, { kicker, ...spec.demo, flip: spec.number % 3 === 0, notes: spec.demo.notes ?? spec.notes.demo }));
  add(spec.safety.title, doDontLayout(id, { kicker, ...spec.safety, flip: spec.number % 2 === 1, notes: spec.safety.notes ?? spec.notes.safety }));
  add(spec.game.title, rulesLayout(id, { kicker, title: spec.game.title, titleTh: spec.game.titleTh, rules: spec.game.rules, scoring: spec.game.scoring, flip: spec.number % 2 === 0, notes: spec.notes.game }));
  for (const material of spec.gameSlides ?? []) add(material.title, documentLayout(id, { kicker, ...material }));

  if (spec.challenge) {
    add(aiFeedbackSlide(id).title, aiFeedbackSlide(id).doc);
    for (const live of liveSlides(id)) add(live.title, live.doc);
  }

  const { cards, next } = spec.takeHome;
  add("Take It to Work", cardsLayout(id, {
    kicker, eyebrow: "your challenge this week", title: "Take It to Work", titleTh: "เอาไปใช้ที่ทำงาน", numbered: true,
    cards: cards.map((card, index) => ({ ...card, tone: index === cards.length - 1 ? "success" as const : "accent" as const })),
    bar: next, notes: spec.notes.takeHome,
  }));
  // Colour band: along the top on odd weeks, down the left edge on even weeks.
  return slides.map(({ title, doc }) => {
    const band = { id: id(), type: "shape" as const, shape: "rect" as const, fill: "accent" as const, ...(mirror ? { x: 0, y: 0, w: 12, h: 900 } : { x: 0, y: 0, w: 1600, h: 12 }) };
    return { title, doc: retone({ ...doc, elements: [band, ...doc.elements] }, tone) };
  });
}
