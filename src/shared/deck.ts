import { SESSION_TITLE, SLIDE_STEPS, WEEK01_CHALLENGE } from "./challenge";
import { stepCount, type SlideDoc, type WidgetKind } from "./slideDoc";

/** The Prompt Battle challenge shown to participants. Thai fields fall back to English. */
export interface Challenge {
  titleEn: string; titleTh: string;
  scenarioEn: string; scenarioTh: string;
  taskEn: string; taskTh: string;
}

export const DEFAULT_CHALLENGE: Challenge = { ...WEEK01_CHALLENGE };

/** A frozen, published deck. Stored once in training_snapshots and never edited. */
export interface PublishedDeck {
  schema: 1;
  planId: string;
  version: number;
  title: string;
  weekDate: string | null;
  durationMin: number | null;
  notes: string;
  challenge: Challenge;
  slides: Array<{ sourceSlideId: string; title: string; doc: SlideDoc }>;
}

/** What the room engine needs to navigate a deck without loading the slides themselves. */
export interface DeckMeta {
  title: string;
  steps: number[];
  /** First slide that contains each live widget, so presenter actions can jump to it. */
  widgetSlides: Partial<Record<WidgetKind, number>>;
  challenge: Challenge;
}

/** Built-in Week 01 deck used by rooms without a snapshot (every room created before Phase 4). */
export const LEGACY_META: DeckMeta = {
  title: SESSION_TITLE,
  steps: [...SLIDE_STEPS],
  widgetSlides: { join: 4, "live-stats": 4, challenge: 4, battle: 5, leaderboard: 6 },
  challenge: DEFAULT_CHALLENGE,
};

export function deckMeta(deck: PublishedDeck): DeckMeta {
  const widgetSlides: Partial<Record<WidgetKind, number>> = {};
  deck.slides.forEach((slide, index) => {
    for (const element of slide.doc.elements) {
      if (element.type === "widget" && widgetSlides[element.widget] === undefined) widgetSlides[element.widget] = index;
    }
  });
  return { title: deck.title, steps: deck.slides.map((slide) => stepCount(slide.doc)), widgetSlides, challenge: deck.challenge };
}

const LIMITS = { title: 80, body: 600 };

/** Validate an untrusted challenge. English fields are required; Thai is optional. */
export function validateChallenge(input: unknown): { ok: true; challenge: Challenge } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "The challenge is missing." };
  const raw = input as Record<string, unknown>;
  const clean = (value: unknown) => (typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim() : "");
  const challenge: Challenge = {
    titleEn: clean(raw.titleEn), titleTh: clean(raw.titleTh),
    scenarioEn: clean(raw.scenarioEn), scenarioTh: clean(raw.scenarioTh),
    taskEn: clean(raw.taskEn), taskTh: clean(raw.taskTh),
  };
  if (!challenge.titleEn || !challenge.scenarioEn || !challenge.taskEn) return { ok: false, error: "The challenge needs an English title, scenario and task." };
  if (challenge.titleEn.length > LIMITS.title || challenge.titleTh.length > LIMITS.title) return { ok: false, error: `Challenge titles must be at most ${LIMITS.title} characters.` };
  for (const key of ["scenarioEn", "scenarioTh", "taskEn", "taskTh"] as const) {
    if (challenge[key].length > LIMITS.body) return { ok: false, error: `Challenge scenario and task must be at most ${LIMITS.body} characters.` };
  }
  if (!challenge.titleTh) challenge.titleTh = challenge.titleEn;
  if (!challenge.scenarioTh) challenge.scenarioTh = challenge.scenarioEn;
  if (!challenge.taskTh) challenge.taskTh = challenge.taskEn;
  return { ok: true, challenge };
}
