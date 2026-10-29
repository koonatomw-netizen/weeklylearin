/**
 * Game Hub model. A plan carries its own games as plain data, so a normal user can add or change a game in the
 * Weekly Planner without code. Kinds: a poll (everyone picks, the room sees the split), a quiz (right answers
 * score points) and open answers (everyone types a short answer for the big screen).
 */

export const GAME_KINDS = ["poll", "quiz", "open"] as const;
export type GameKind = typeof GAME_KINDS[number];

export interface Bilingual { en: string; th: string }
export interface GameQuestion {
  text: Bilingual;
  /** Two to six choices for polls and quizzes; empty for open answers. */
  options: Bilingual[];
  /** Quiz only: index of the right option. */
  correct?: number;
}
export interface GameDef { id: string; kind: GameKind; title: Bilingual; questions: GameQuestion[] }

export const GAME_LIMITS = { games: 10, questions: 20, options: 6, text: 160, title: 80, answer: 140 } as const;
export const QUIZ_POINTS = 100;
export const MIN_OPTIONS = 2;

/** What the game picker needs to list a game without its questions. */
export interface GameSummary { id: string; kind: GameKind; title: Bilingual; questions: number }
export const summarizeGames = (games: readonly GameDef[]): GameSummary[] =>
  games.map((game) => ({ id: game.id, kind: game.kind, title: game.title, questions: game.questions.length }));

export type GameStatus = "open" | "closed" | "revealed";

/** The running game as every screen sees it. Counts, correct answers and scores appear only when the rules allow. */
export interface GameView {
  id: string;
  kind: GameKind;
  title: Bilingual;
  questionIndex: number;
  totalQuestions: number;
  status: GameStatus;
  question: { text: Bilingual; options: Bilingual[] };
  /** People who have answered this question, and everyone who could. */
  answered: number;
  eligible: number;
  /** Votes per option: live for polls, after the reveal for quizzes. Null while hidden. */
  counts: number[] | null;
  /** Quiz only, after the reveal. */
  correct: number | null;
  /** Open answers only: the typed answers, anonymous, newest first. */
  texts: string[] | null;
  /** Quiz only, after the reveal: the leaders of this game so far. */
  top: Array<{ nickname: string; points: number }> | null;
  isLast: boolean;
}

/** A participant's own answer to the current question. */
export interface GameSelf {
  choice: number | null;
  text: string | null;
  /** Quiz after the reveal: whether the answer was right. */
  correct: boolean | null;
  /** Points earned in this game so far. */
  points: number;
}

export interface GameAnswerRow { participant_id: string; game_id: string; question_index: number; choice: number | null; text: string | null }

const clean = (value: unknown) => (typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim() : "");

function bilingual(input: unknown, label: string, max: number): { ok: true; value: Bilingual } | { ok: false; error: string } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const en = clean(raw.en);
  const th = clean(raw.th);
  if (!en) return { ok: false, error: `${label} needs English wording.` };
  if (en.length > max || th.length > max) return { ok: false, error: `${label} must be at most ${max} characters.` };
  return { ok: true, value: { en, th: th || en } };
}

/** Validate a plan's games. null or an empty list means the plan has no games besides Prompt Battle. */
export function validateGames(input: unknown): { ok: true; games: GameDef[] | null } | { ok: false; error: string } {
  if (input === null || input === undefined) return { ok: true, games: null };
  if (!Array.isArray(input)) return { ok: false, error: "Games must be a list." };
  if (input.length > GAME_LIMITS.games) return { ok: false, error: `A plan can have at most ${GAME_LIMITS.games} games.` };
  const seen = new Set<string>();
  const games: GameDef[] = [];
  for (const [gameIndex, item] of input.entries()) {
    const label = `Game ${gameIndex + 1}`;
    const raw = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const kind = raw.kind as GameKind;
    if (!GAME_KINDS.includes(kind)) return { ok: false, error: `${label}: choose a game type.` };
    const title = bilingual(raw.title, `${label} title`, GAME_LIMITS.title);
    if (!title.ok) return title;
    if (!Array.isArray(raw.questions) || !raw.questions.length) return { ok: false, error: `${label} needs at least one question.` };
    if (raw.questions.length > GAME_LIMITS.questions) return { ok: false, error: `${label} can have at most ${GAME_LIMITS.questions} questions.` };
    const questions: GameQuestion[] = [];
    for (const [questionIndex, entry] of raw.questions.entries()) {
      const qLabel = `${label}, question ${questionIndex + 1}`;
      const q = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
      const text = bilingual(q.text, `${qLabel} text`, GAME_LIMITS.text);
      if (!text.ok) return text;
      if (kind === "open") { questions.push({ text: text.value, options: [] }); continue; }
      const rawOptions = Array.isArray(q.options) ? q.options : [];
      if (rawOptions.length < MIN_OPTIONS || rawOptions.length > GAME_LIMITS.options) return { ok: false, error: `${qLabel} needs ${MIN_OPTIONS} to ${GAME_LIMITS.options} options.` };
      const options: Bilingual[] = [];
      for (const [optionIndex, option] of rawOptions.entries()) {
        const parsed = bilingual(option, `${qLabel}, option ${optionIndex + 1}`, GAME_LIMITS.title);
        if (!parsed.ok) return parsed;
        options.push(parsed.value);
      }
      if (kind === "quiz") {
        const correct = Number(q.correct);
        if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return { ok: false, error: `${qLabel}: mark the right answer.` };
        questions.push({ text: text.value, options, correct });
      } else questions.push({ text: text.value, options });
    }
    let id = clean(raw.id).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40);
    if (!id || seen.has(id)) id = `game-${gameIndex + 1}`;
    while (seen.has(id)) id += "x";
    seen.add(id);
    games.push({ id, kind, title: title.value, questions });
  }
  return { ok: true, games: games.length ? games : null };
}

/** Votes per option for one question. */
export function optionCounts(question: GameQuestion, answers: readonly GameAnswerRow[], gameId: string, index: number): number[] {
  const counts = question.options.map(() => 0);
  for (const answer of answers) {
    if (answer.game_id === gameId && answer.question_index === index && answer.choice !== null && answer.choice >= 0 && answer.choice < counts.length) counts[answer.choice] += 1;
  }
  return counts;
}

/** Quiz points per participant, counting questions 0..through (inclusive). */
export function quizScores(game: GameDef, answers: readonly GameAnswerRow[], through: number): Map<string, number> {
  const scores = new Map<string, number>();
  if (game.kind !== "quiz") return scores;
  for (const answer of answers) {
    if (answer.game_id !== game.id || answer.question_index > through) continue;
    if (game.questions[answer.question_index]?.correct === answer.choice) scores.set(answer.participant_id, (scores.get(answer.participant_id) ?? 0) + QUIZ_POINTS);
  }
  return scores;
}
