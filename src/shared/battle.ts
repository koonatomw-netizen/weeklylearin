import type { LeaderboardRow } from "./types";

export const ENTRY_LABELS = ["A", "B", "C", "D", "E"];

/**
 * Group sizes for `count` prompts: groups of 3 or 4, as even as possible.
 * Every count >= 6 splits cleanly into 3s and 4s. Counts 3–4 form one group.
 * 5 cannot be split into 3s and 4s, so it becomes 3 + 2 (keeps groups at most 4
 * and gives each group outside voters). 1–2 form a single small group.
 */
export function groupSizes(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 4) return [count];
  const groups = Math.ceil(count / 4);
  const base = Math.floor(count / groups);
  const remainder = count % groups;
  return Array.from({ length: groups }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** Randomly allocate items into groups; order inside each group is also random. */
export function formGroups<T>(items: readonly T[], random: () => number): T[][] {
  const shuffled = shuffle(items, random);
  const groups: T[][] = [];
  let offset = 0;
  for (const size of groupSizes(shuffled.length)) {
    groups.push(shuffled.slice(offset, offset + size));
    offset += size;
  }
  return groups;
}

/** Battle Score = votes received / eligible votes × 100, rounded to one decimal. */
export function battleScore(votes: number, eligible: number): number {
  if (eligible <= 0) return 0;
  return Math.round((votes / eligible) * 1000) / 10;
}

/** Standard competition ranking (1, 1, 3) by votes, highest first. */
export function rankByVotes<T extends { id: string; votes: number }>(entries: readonly T[]): Array<T & { rank: number }> {
  const sorted = [...entries].sort((a, b) => b.votes - a.votes);
  let rank = 0;
  let previous: number | null = null;
  return sorted.map((entry, index) => {
    if (entry.votes !== previous) rank = index + 1;
    previous = entry.votes;
    return { ...entry, rank };
  });
}

/** All entries sharing the highest vote count. Several ids means a tie. */
export function topEntryIds(entries: ReadonlyArray<{ id: string; votes: number }>): string[] {
  if (!entries.length) return [];
  const best = Math.max(...entries.map((entry) => entry.votes));
  return entries.filter((entry) => entry.votes === best).map((entry) => entry.id);
}

export interface LeaderboardInput {
  participantId: string;
  nickname: string;
  promptText: string;
  battleVotes: number;
  battleEligible: number;
  finalVotes: number | null;
  finalEligible: number | null;
  isFinalist: boolean;
  isChampion: boolean;
}

const stageOrder = { champion: 0, finalist: 1, battle: 2 } as const;

/** Champions first, then finalists by Grand Final score, then everyone else by battle score. */
export function buildLeaderboard(inputs: readonly LeaderboardInput[]): LeaderboardRow[] {
  const rows = inputs.map((input) => {
    const stage: LeaderboardRow["stage"] = input.isChampion ? "champion" : input.isFinalist ? "finalist" : "battle";
    return {
      rank: 0,
      participantId: input.participantId,
      nickname: input.nickname,
      stage,
      promptText: input.promptText,
      battleVotes: input.battleVotes,
      battleEligible: input.battleEligible,
      battleScore: battleScore(input.battleVotes, input.battleEligible),
      finalVotes: input.finalVotes,
      finalEligible: input.finalEligible,
      finalScore: input.finalVotes === null || input.finalEligible === null ? null : battleScore(input.finalVotes, input.finalEligible),
    } satisfies LeaderboardRow;
  });
  const key = (row: LeaderboardRow): number[] => row.stage === "champion"
    ? [0]
    : [stageOrder[row.stage], -(row.finalScore ?? 0), -row.battleScore, -row.battleVotes];
  const compare = (a: LeaderboardRow, b: LeaderboardRow) => {
    const ka = key(a);
    const kb = key(b);
    for (let index = 0; index < Math.max(ka.length, kb.length); index += 1) {
      const difference = (ka[index] ?? 0) - (kb[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return 0;
  };
  rows.sort((a, b) => compare(a, b) || a.nickname.localeCompare(b.nickname));
  rows.forEach((row, index) => {
    row.rank = index > 0 && compare(rows[index - 1], row) === 0 ? rows[index - 1].rank : index + 1;
  });
  return rows;
}
