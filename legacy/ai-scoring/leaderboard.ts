import type { LeaderboardRow, Participant } from "./types";

export function buildLeaderboard(participants: Participant[]): {
  rows: LeaderboardRow[];
  improvementAward: Array<{ nickname: string; points: number }>;
} {
  const scored = participants.flatMap((participant) => {
    const first = participant.attempts.find((attempt) => attempt.attempt === 1)?.total;
    const second = participant.attempts.find((attempt) => attempt.attempt === 2)?.total;
    return second === undefined
      ? []
      : [{ participant, first, second, improvement: first === undefined ? null : second - first }];
  }).sort((a, b) => b.second - a.second || a.participant.nickname.localeCompare(b.participant.nickname));

  let priorScore: number | undefined;
  let rank = 0;
  const rows = scored.map((entry, index) => {
    if (entry.second !== priorScore) rank = index + 1;
    priorScore = entry.second;
    return {
      rank,
      participantId: entry.participant.id,
      nickname: entry.participant.nickname,
      attempt2Score: entry.second,
      improvement: entry.improvement,
    };
  });

  const eligible = rows.filter((row): row is LeaderboardRow & { improvement: number } => row.improvement !== null && row.improvement > 0);
  const best = eligible.reduce<number | null>((current, row) => current === null ? row.improvement : Math.max(current, row.improvement), null);
  const improvementAward = best === null ? [] : eligible
    .filter((row) => row.improvement === best)
    .map((row) => ({ nickname: row.nickname, points: best }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  return { rows, improvementAward };
}
