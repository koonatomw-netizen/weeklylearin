import { describe, expect, it } from "vitest";
import { battleScore, buildLeaderboard, formGroups, groupSizes, rankByVotes, topEntryIds } from "../src/shared/battle";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe("groupSizes", () => {
  it("keeps every group at 3 or 4 from six prompts upward", () => {
    for (let count = 6; count <= 80; count += 1) {
      const sizes = groupSizes(count);
      expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(count);
      expect(sizes.every((size) => size === 3 || size === 4)).toBe(true);
    }
  });

  it("handles small counts explicitly", () => {
    expect(groupSizes(0)).toEqual([]);
    expect(groupSizes(1)).toEqual([1]);
    expect(groupSizes(2)).toEqual([2]);
    expect(groupSizes(3)).toEqual([3]);
    expect(groupSizes(4)).toEqual([4]);
    expect(groupSizes(5)).toEqual([3, 2]);
    expect(groupSizes(7)).toEqual([4, 3]);
  });
});

describe("formGroups", () => {
  it("includes every prompt exactly once", () => {
    const items = Array.from({ length: 11 }, (_, index) => index);
    const groups = formGroups(items, seeded(42));
    expect(groups.flat().sort((a, b) => a - b)).toEqual(items);
    expect(groups.map((group) => group.length)).toEqual([4, 4, 3]);
  });

  it("randomises allocation", () => {
    const items = Array.from({ length: 12 }, (_, index) => index);
    expect(formGroups(items, seeded(1))).not.toEqual(formGroups(items, seeded(2)));
  });
});

describe("scoring", () => {
  it("computes votes / eligible × 100 to one decimal", () => {
    expect(battleScore(2, 3)).toBe(66.7);
    expect(battleScore(0, 5)).toBe(0);
    expect(battleScore(3, 0)).toBe(0);
  });

  it("ranks ties together and reports every tied leader", () => {
    const ranked = rankByVotes([{ id: "a", votes: 2 }, { id: "b", votes: 2 }, { id: "c", votes: 1 }]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 1, 3]);
    expect(topEntryIds([{ id: "a", votes: 2 }, { id: "b", votes: 2 }, { id: "c", votes: 1 }])).toEqual(["a", "b"]);
    expect(topEntryIds([{ id: "a", votes: 0 }, { id: "b", votes: 0 }])).toEqual(["a", "b"]);
  });
});

describe("buildLeaderboard", () => {
  const base = { promptText: "p", finalVotes: null, finalEligible: null, isFinalist: false, isChampion: false };
  it("orders champion, finalists, then battle scores", () => {
    const rows = buildLeaderboard([
      { ...base, participantId: "1", nickname: "Ann", battleVotes: 1, battleEligible: 4 },
      { ...base, participantId: "2", nickname: "Ben", battleVotes: 3, battleEligible: 4, isFinalist: true, finalVotes: 2, finalEligible: 6 },
      { ...base, participantId: "3", nickname: "Cat", battleVotes: 2, battleEligible: 4, isFinalist: true, isChampion: true, finalVotes: 4, finalEligible: 6 },
      { ...base, participantId: "4", nickname: "Dan", battleVotes: 1, battleEligible: 4 },
    ]);
    expect(rows.map((row) => [row.nickname, row.rank, row.stage])).toEqual([
      ["Cat", 1, "champion"], ["Ben", 2, "finalist"], ["Ann", 3, "battle"], ["Dan", 3, "battle"],
    ]);
    expect(rows[0].finalScore).toBe(66.7);
  });

  it("shares rank 1 between shared champions", () => {
    const rows = buildLeaderboard([
      { ...base, participantId: "1", nickname: "A", battleVotes: 1, battleEligible: 2, isFinalist: true, isChampion: true, finalVotes: 1, finalEligible: 2 },
      { ...base, participantId: "2", nickname: "B", battleVotes: 2, battleEligible: 2, isFinalist: true, isChampion: true, finalVotes: 1, finalEligible: 2 },
    ]);
    expect(rows.map((row) => row.rank)).toEqual([1, 1]);
  });
});
