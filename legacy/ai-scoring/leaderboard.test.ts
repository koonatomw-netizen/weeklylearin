import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "../src/shared/leaderboard";
import type { Participant } from "../src/shared/types";

const participant = (id: string, nickname: string, scores: number[]): Participant => ({
  id,
  nickname,
  joinedAt: "2026-10-26T00:00:00.000Z",
  attempts: scores.map((total, index) => ({
    attempt: index + 1,
    total,
    rubric: { context: total, goal: total, audience: total, constraints: total, format: total },
    submittedAt: "2026-10-26T00:00:00.000Z",
  })),
});

describe("buildLeaderboard", () => {
  it("ranks by the second attempt and preserves competition ties", () => {
    const { rows } = buildLeaderboard([
      participant("a", "A", [40, 88]),
      participant("b", "B", [60, 88]),
      participant("c", "C", [80, 76]),
      participant("d", "D", [80]),
    ]);
    expect(rows.map(({ nickname, rank, attempt2Score }) => [nickname, rank, attempt2Score])).toEqual([
      ["A", 1, 88], ["B", 1, 88], ["C", 3, 76],
    ]);
  });

  it("awards the largest improvement and shares the award on a tie", () => {
    const { improvementAward } = buildLeaderboard([
      participant("a", "A", [40, 70]),
      participant("b", "B", [60, 90]),
      participant("c", "C", [70]),
    ]);
    expect(improvementAward).toEqual([{ nickname: "A", points: 30 }, { nickname: "B", points: 30 }]);
  });

  it("does not give an improvement award when nobody improves", () => {
    const { improvementAward } = buildLeaderboard([
      participant("a", "A", [80, 80]),
      participant("b", "B", [90, 70]),
    ]);
    expect(improvementAward).toEqual([]);
  });
});
