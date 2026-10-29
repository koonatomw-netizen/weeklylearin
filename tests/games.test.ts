import { describe, expect, it } from "vitest";
import { optionCounts, quizScores, validateGames, type GameAnswerRow, type GameDef } from "../src/shared/games";
import { WEEK01_GAMES, WEEK02_GAMES } from "../src/shared/starterGames";
import { buildEnvelope, buildGame } from "../src/worker/view";
import { LEGACY_META } from "../src/shared/deck";
import { snapshot } from "./helpers/snapshot";

const quiz: GameDef = {
  id: "q", kind: "quiz", title: { en: "Quiz", th: "ควิซ" },
  questions: [
    { text: { en: "One", th: "หนึ่ง" }, options: [{ en: "a", th: "a" }, { en: "b", th: "b" }], correct: 1 },
    { text: { en: "Two", th: "สอง" }, options: [{ en: "a", th: "a" }, { en: "b", th: "b" }], correct: 0 },
  ],
};
const poll: GameDef = { id: "p", kind: "poll", title: { en: "Poll", th: "โพล" }, questions: [{ text: { en: "Pick", th: "เลือก" }, options: [{ en: "x", th: "x" }, { en: "y", th: "y" }] }] };
const open: GameDef = { id: "o", kind: "open", title: { en: "Wall", th: "กำแพง" }, questions: [{ text: { en: "Say", th: "พูด" }, options: [] }] };
const answer = (participant: string, game: string, question: number, choice: number | null, text: string | null = null): GameAnswerRow => ({ participant_id: participant, game_id: game, question_index: question, choice, text });
const running = (game: GameDef, question: number, status: string, answers: GameAnswerRow[]) =>
  snapshot({ meta: { ...LEGACY_META, games: [quiz, poll, open] }, gameAnswers: answers, room: { ...snapshot().room, activity: "game", game_id: game.id, game_question: question, game_status: status } });

describe("validateGames", () => {
  it("accepts no games, falls back to English for Thai and ids the games", () => {
    expect(validateGames(undefined)).toEqual({ ok: true, games: null });
    expect(validateGames([])).toEqual({ ok: true, games: null });
    const result = validateGames([{ kind: "poll", title: { en: "Poll" }, questions: [{ text: { en: "Pick" }, options: [{ en: "a" }, { en: "b" }] }] }]);
    expect(result.ok && result.games?.[0].id).toBe("game-1");
    expect(result.ok && result.games?.[0].questions[0].options[0].th).toBe("a");
  });

  it("requires a right answer for quizzes and at least two options", () => {
    const q = (extra: object) => [{ kind: "quiz", title: { en: "Q" }, questions: [{ text: { en: "x" }, options: [{ en: "a" }, { en: "b" }], ...extra }] }];
    expect(validateGames(q({})).ok).toBe(false);
    expect(validateGames(q({ correct: 2 })).ok).toBe(false);
    expect(validateGames(q({ correct: 1 })).ok).toBe(true);
    expect(validateGames([{ kind: "poll", title: { en: "P" }, questions: [{ text: { en: "x" }, options: [{ en: "a" }] }] }]).ok).toBe(false);
  });

  it("rejects unknown kinds, empty games and too many games", () => {
    expect(validateGames([{ kind: "race", title: { en: "R" }, questions: [] }]).ok).toBe(false);
    expect(validateGames([{ kind: "open", title: { en: "O" }, questions: [] }]).ok).toBe(false);
    expect(validateGames(Array.from({ length: 11 }, () => open)).ok).toBe(false);
  });

  it("ships valid starter games", () => {
    expect(validateGames(WEEK01_GAMES).ok).toBe(true);
    expect(validateGames(WEEK02_GAMES).ok).toBe(true);
  });
});

describe("scoring", () => {
  it("counts votes per option and scores quiz answers at 100 each", () => {
    const rows = [answer("p1", "q", 0, 1), answer("p2", "q", 0, 0), answer("p1", "q", 1, 0), answer("p3", "q", 1, 1)];
    expect(optionCounts(quiz.questions[0], rows, "q", 0)).toEqual([1, 1]);
    expect([...quizScores(quiz, rows, 0)]).toEqual([["p1", 100]]);
    expect(quizScores(quiz, rows, 1).get("p1")).toBe(200);
    expect(quizScores(quiz, rows, 1).get("p3")).toBeUndefined();
  });
});

describe("buildGame", () => {
  it("is null unless a game is running", () => {
    expect(buildGame(snapshot())).toBeNull();
  });

  it("shows poll counts live but hides quiz results until the reveal", () => {
    expect(buildGame(running(poll, 0, "open", [answer("p1", "p", 0, 0)]))?.counts).toEqual([1, 0]);
    const hidden = buildGame(running(quiz, 0, "closed", [answer("p1", "q", 0, 1)]))!;
    expect(hidden.counts).toBeNull();
    expect(hidden.correct).toBeNull();
    expect(hidden.top).toBeNull();
    const shown = buildGame(running(quiz, 0, "revealed", [answer("p1", "q", 0, 1), answer("p2", "q", 0, 0)]))!;
    expect(shown.counts).toEqual([1, 1]);
    expect(shown.correct).toBe(1);
    expect(shown.top).toEqual([{ nickname: "User1", points: 100 }]);
  });

  it("never sends names with open answers and never leaks the right answer in the options", () => {
    const view = buildGame(running(open, 0, "open", [answer("p1", "o", 0, null, "invoices")]))!;
    expect(view.texts).toEqual(["invoices"]);
    expect(JSON.stringify(view)).not.toContain("User1");
    expect(JSON.stringify(buildGame(running(quiz, 0, "open", []))!.question)).not.toContain("correct");
  });

  it("gives each participant their own answer, result and points", () => {
    const state = running(quiz, 0, "revealed", [answer("p1", "q", 0, 1), answer("p2", "q", 0, 0)]);
    const mine = buildEnvelope(state, "participant", "p1").me!.game!;
    expect(mine).toMatchObject({ choice: 1, correct: true, points: 100 });
    expect(buildEnvelope(state, "participant", "p2").me!.game).toMatchObject({ choice: 0, correct: false, points: 0 });
    expect(buildEnvelope(state, "host").state).toMatchObject({ games: [{ id: "q" }, { id: "p" }, { id: "o" }] });
  });
});
