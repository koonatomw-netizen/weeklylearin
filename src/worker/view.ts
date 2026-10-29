import { battleScore, buildLeaderboard, rankByVotes } from "../shared/battle";
import { DEFAULT_FEEDBACK_QUESTIONS, type DeckMeta } from "../shared/deck";
import { optionCounts, quizScores, summarizeGames, type GameAnswerRow, type GameSelf, type GameStatus, type GameView } from "../shared/games";
import { situationById } from "../shared/situations";
import type {
  Activity, BattleRound, BattleStatus, BattleView, Checklist, FeedbackSummary, FinalStatus, HostState,
  ParticipantSelf, Role, RoomEnvelope, SessionState,
} from "../shared/types";

export interface RoomRow {
  code: string;
  title: string;
  host_token_hash: string;
  created_at: string;
  current_slide: number;
  slide_step: number;
  activity: Activity;
  active_battle_id: string | null;
  snapshot_id: string | null;
  /** Situation the presenter's case landed on (see shared/situations.ts); null until a case is opened. */
  case_situation_id: string | null;
  case_roll: number;
  /** The Game Hub game running now (when activity is "game"), its current question, and where that question stands. */
  game_id: string | null;
  game_question: number;
  game_status: string;
  /** Set when the presenter ends the session for everyone; null while it is running. */
  ended_at: string | null;
}
export interface ParticipantRow { id: string; nickname: string; joined_at: string }
export interface SubmissionRow { id: string; participant_id: string; attempt: number; prompt_text: string; request_id: string; checklist_json: string; submitted_at: string }
export interface FinalRow { participant_id: string; submission_id: string; auto_selected: number }
export interface BattleRow { id: string; round: BattleRound; sequence: number; status: BattleStatus; eligible_voters: number | null; resolution_note: string }
export interface EntryRow { id: string; battle_id: string; submission_id: string; participant_id: string; display_order: number; is_winner: number }
export interface VoteRow { battle_id: string; entry_id: string; voter_participant_id: string }
export interface ActionRow { action: string; detail_json: string; created_at: string }
/** Deliberately excludes the free-text answers; those are only read by the management endpoints. */
export interface FeedbackStatusRow { participant_id: string; training_rating: number; submitted_at: string }

export interface Snapshot {
  room: RoomRow;
  participants: ParticipantRow[];
  submissions: SubmissionRow[];
  finals: FinalRow[];
  battles: BattleRow[];
  entries: EntryRow[];
  votes: VoteRow[];
  actions: ActionRow[];
  feedback: FeedbackStatusRow[];
  gameAnswers: GameAnswerRow[];
  /** Navigation info for the deck this room presents (built-in or published snapshot). */
  meta: DeckMeta;
}

/** Why a case cannot be (re)opened right now, or null when it can. Opening one replaces the challenge, so it must not strand written prompts. */
export function caseBlockReason(s: Snapshot): string | null {
  if (s.meta.situations && s.meta.situations.length === 0) return "Case opening is turned off for this session.";
  if (s.battles.length > 0) return "Battles have started, so a new case can no longer be opened.";
  if (s.submissions.length > 0) return "Prompts have already been submitted, so a new case can no longer be opened.";
  return null;
}

export const entryLabel =(index: number) => String.fromCharCode(65 + (index % 26));

export function orderedBattles(battles: readonly BattleRow[]): BattleRow[] {
  return [...battles].sort((a, b) => (a.round === b.round ? a.sequence - b.sequence : a.round === "mini" ? -1 : 1));
}

export function entriesOf(s: Snapshot, battleId: string): EntryRow[] {
  return s.entries.filter((entry) => entry.battle_id === battleId).sort((a, b) => a.display_order - b.display_order);
}

/** Participants allowed to vote: everyone in the room except this battle's competitors. Frozen at close. */
export function eligibleVoters(s: Snapshot, battle: BattleRow): number {
  if (battle.eligible_voters !== null) return battle.eligible_voters;
  const competitors = new Set(entriesOf(s, battle.id).map((entry) => entry.participant_id));
  return s.participants.filter((participant) => !competitors.has(participant.id)).length;
}

export function voteCounts(s: Snapshot, battleId: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const vote of s.votes) if (vote.battle_id === battleId) counts.set(vote.entry_id, (counts.get(vote.entry_id) ?? 0) + 1);
  return counts;
}

export function finalSummary(s: Snapshot): { status: FinalStatus; latest: BattleRow | null; winners: EntryRow[]; first: BattleRow | null } {
  const minis = s.battles.filter((battle) => battle.round === "mini");
  const finals = s.battles.filter((battle) => battle.round === "final").sort((a, b) => a.sequence - b.sequence);
  const first = finals[0] ?? null;
  const latest = finals[finals.length - 1] ?? null;
  if (!minis.length || minis.some((battle) => battle.status !== "revealed")) return { status: "not_ready", latest, winners: [], first };
  if (!latest) return { status: "ready", latest, winners: [], first };
  if (latest.status !== "revealed") return { status: "running", latest, winners: [], first };
  const winners = entriesOf(s, latest.id).filter((entry) => entry.is_winner === 1);
  const status: FinalStatus = winners.length > 1 && !latest.resolution_note ? "tie" : "complete";
  return { status, latest, winners, first };
}

function parseChecklist(value: string): Checklist {
  try {
    const parsed = JSON.parse(value) as Checklist;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

/** The running game as the room sees it. Counts, right answers and leaders appear only when the game's rules allow. */
export function buildGame(s: Snapshot): GameView | null {
  const id = s.room.game_id;
  if (s.room.activity !== "game" || !id) return null;
  const game = s.meta.games.find((item) => item.id === id);
  const index = s.room.game_question;
  const question = game?.questions[index];
  if (!game || !question) return null;
  const status: GameStatus = s.room.game_status === "closed" ? "closed" : s.room.game_status === "revealed" ? "revealed" : "open";
  const revealed = status === "revealed";
  const here = s.gameAnswers.filter((answer) => answer.game_id === id && answer.question_index === index);
  const names = new Map(s.participants.map((participant) => [participant.id, participant.nickname]));
  const top = game.kind === "quiz" && revealed
    ? [...quizScores(game, s.gameAnswers, index)].map(([participantId, points]) => ({ nickname: names.get(participantId) ?? "—", points }))
      .sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname)).slice(0, 5)
    : null;
  return {
    id, kind: game.kind, title: game.title, questionIndex: index, totalQuestions: game.questions.length, status,
    question: { text: question.text, options: question.options },
    answered: here.length, eligible: s.participants.length,
    counts: game.kind === "poll" || (game.kind === "quiz" && revealed) ? optionCounts(question, s.gameAnswers, id, index) : null,
    correct: game.kind === "quiz" && revealed ? question.correct ?? null : null,
    texts: game.kind === "open" ? here.flatMap((answer) => (answer.text ? [answer.text] : [])).reverse().slice(0, 80) : null,
    top,
    isLast: index >= game.questions.length - 1,
  };
}

function gameSelf(s: Snapshot, participantId: string): GameSelf | null {
  const view = buildGame(s);
  if (!view) return null;
  const game = s.meta.games.find((item) => item.id === view.id)!;
  const mine = s.gameAnswers.find((answer) => answer.participant_id === participantId && answer.game_id === view.id && answer.question_index === view.questionIndex);
  const through = view.status === "revealed" ? view.questionIndex : view.questionIndex - 1;
  return {
    choice: mine?.choice ?? null,
    text: mine?.text ?? null,
    correct: game.kind === "quiz" && view.status === "revealed" && mine ? game.questions[view.questionIndex].correct === mine.choice : null,
    points: quizScores(game, s.gameAnswers, through).get(participantId) ?? 0,
  };
}

export function buildEnvelope(s: Snapshot, role: Role, participantId?: string): RoomEnvelope {
  const nicknames = new Map(s.participants.map((participant) => [participant.id, participant.nickname]));
  const submissionsById = new Map(s.submissions.map((submission) => [submission.id, submission]));
  const myVotes = new Set(s.votes.filter((vote) => vote.voter_participant_id === participantId).map((vote) => vote.battle_id));

  const battles: BattleView[] = orderedBattles(s.battles).map((battle) => {
    const entries = entriesOf(s, battle.id);
    const counts = voteCounts(s, battle.id);
    const eligible = eligibleVoters(s, battle);
    const revealed = battle.status === "revealed";
    const ranked = new Map(rankByVotes(entries.map((entry) => ({ id: entry.id, votes: counts.get(entry.id) ?? 0 }))).map((entry) => [entry.id, entry.rank]));
    const isCompetitor = role === "participant" && entries.some((entry) => entry.participant_id === participantId);
    const hasVoted = role === "participant" && myVotes.has(battle.id);
    const view: BattleView = {
      id: battle.id,
      round: battle.round,
      sequence: battle.sequence,
      status: battle.status,
      eligibleVoters: eligible,
      votesCast: s.votes.filter((vote) => vote.battle_id === battle.id).length,
      resolutionNote: battle.resolution_note,
      tie: revealed && entries.filter((entry) => entry.is_winner === 1).length > 1,
      entries: entries.map((entry, index) => ({
        id: entry.id,
        label: entryLabel(index),
        displayOrder: entry.display_order,
        promptText: submissionsById.get(entry.submission_id)?.prompt_text ?? "",
        ...(role === "participant" && entry.participant_id === participantId ? { isOwn: true } : {}),
        ...(revealed ? {
          result: {
            nickname: nicknames.get(entry.participant_id) ?? "—",
            participantId: entry.participant_id,
            votes: counts.get(entry.id) ?? 0,
            score: battleScore(counts.get(entry.id) ?? 0, eligible),
            rank: ranked.get(entry.id) ?? entries.length,
            isWinner: entry.is_winner === 1,
          },
        } : {}),
      })),
    };
    if (role === "participant") {
      view.isCompetitor = isCompetitor;
      view.hasVoted = hasVoted;
      view.canVote = battle.status === "open" && !isCompetitor && !hasVoted;
    }
    return view;
  });

  const summary = finalSummary(s);
  const champions = summary.status === "complete"
    ? summary.winners.map((entry) => ({
      nickname: nicknames.get(entry.participant_id) ?? "—",
      promptText: submissionsById.get(entry.submission_id)?.prompt_text ?? "",
      shared: summary.winners.length > 1,
    }))
    : [];

  const showLeaderboard = summary.status === "complete" && (role === "host" || s.room.activity === "results");
  let leaderboard: SessionState["leaderboard"] = [];
  if (showLeaderboard) {
    const championIds = new Set(summary.winners.map((entry) => entry.participant_id));
    const firstFinalEntries = summary.first ? entriesOf(s, summary.first.id) : [];
    const firstFinalCounts = summary.first ? voteCounts(s, summary.first.id) : new Map<string, number>();
    const finalEligible = summary.first && summary.first.eligible_voters !== null ? summary.first.eligible_voters : null;
    leaderboard = buildLeaderboard(s.battles.filter((battle) => battle.round === "mini").flatMap((battle) => {
      const counts = voteCounts(s, battle.id);
      return entriesOf(s, battle.id).map((entry) => {
        const finalEntry = firstFinalEntries.find((item) => item.participant_id === entry.participant_id);
        return {
          participantId: entry.participant_id,
          nickname: nicknames.get(entry.participant_id) ?? "—",
          promptText: submissionsById.get(entry.submission_id)?.prompt_text ?? "",
          battleVotes: counts.get(entry.id) ?? 0,
          battleEligible: eligibleVoters(s, battle),
          finalVotes: finalEntry && finalEligible !== null ? firstFinalCounts.get(finalEntry.id) ?? 0 : null,
          finalEligible: finalEntry ? finalEligible : null,
          isFinalist: Boolean(finalEntry),
          isChampion: championIds.has(entry.participant_id),
        };
      });
    }));
  }

  const submittedIds = new Set(s.submissions.map((submission) => submission.participant_id));
  const total = Math.max(1, s.meta.steps.length);
  const slide = Math.min(Math.max(0, s.room.current_slide), total - 1);
  const drawn = situationById(s.room.case_situation_id, s.meta.situations ?? undefined);
  const state: SessionState = {
    code: s.room.code,
    title: s.meta.title,
    createdAt: s.room.created_at,
    activity: s.room.activity,
    endedAt: s.room.ended_at ?? null,
    snapshotId: s.room.snapshot_id ?? null,
    totalSlides: total,
    slideSteps: s.meta.steps,
    challenge: drawn?.challenge ?? s.meta.challenge,
    game: buildGame(s),
    casePool: s.meta.situations ? s.meta.situations.map((item) => ({ id: item.id, rarity: item.rarity, titleEn: item.challenge.titleEn, titleTh: item.challenge.titleTh })) : null,
    feedbackQuestions: s.meta.feedbackQuestions ?? DEFAULT_FEEDBACK_QUESTIONS,
    caseRoll: drawn ? { situationId: drawn.id, roll: s.room.case_roll, rarity: drawn.rarity } : null,
    currentSlide: slide,
    slideStep: Math.min(Math.max(0, s.room.slide_step), s.meta.steps[slide] ?? 0),
    participantCount: s.participants.length,
    submittedCount: submittedIds.size,
    totalSubmissions: s.submissions.length,
    finalSelectedCount: s.finals.length,
    battles,
    activeBattleId: s.room.active_battle_id,
    finalStatus: summary.status,
    champions,
    leaderboard,
  };

  if (role === "host") {
    const finalsByParticipant = new Map(s.finals.map((final) => [final.participant_id, final]));
    const finalIds = new Set(s.finals.map((final) => final.submission_id));
    const hostState: HostState = {
      ...state,
      games: summarizeGames(s.meta.games),
      participants: s.participants.map((participant) => ({
        id: participant.id,
        nickname: participant.nickname,
        joinedAt: participant.joined_at,
        attempts: s.submissions.filter((submission) => submission.participant_id === participant.id).length,
        finalSubmissionId: finalsByParticipant.get(participant.id)?.submission_id ?? null,
        finalAuto: finalsByParticipant.get(participant.id)?.auto_selected === 1,
      })),
      submissions: s.submissions.map((submission) => ({
        id: submission.id,
        participantId: submission.participant_id,
        nickname: nicknames.get(submission.participant_id) ?? "—",
        attempt: submission.attempt,
        promptText: submission.prompt_text,
        submittedAt: submission.submitted_at,
        isFinal: finalIds.has(submission.id),
      })),
      actions: s.actions.map((action) => ({ action: action.action, detail: action.detail_json, createdAt: action.created_at })),
      feedback: feedbackSummary(s),
    };
    return { role, state: hostState };
  }

  const me = s.participants.find((participant) => participant.id === participantId);
  const self: ParticipantSelf | undefined = me ? {
    id: me.id,
    nickname: me.nickname,
    submissions: s.submissions.filter((submission) => submission.participant_id === me.id)
      .sort((a, b) => a.attempt - b.attempt)
      .map((submission) => ({
        id: submission.id,
        attempt: submission.attempt,
        promptText: submission.prompt_text,
        submittedAt: submission.submitted_at,
        checklist: parseChecklist(submission.checklist_json),
      })),
    finalSubmissionId: s.finals.find((final) => final.participant_id === me.id)?.submission_id ?? null,
    finalLocked: s.battles.length > 0,
    feedbackSubmittedAt: s.feedback.find((row) => row.participant_id === me.id)?.submitted_at ?? null,
    game: gameSelf(s, me.id),
  } : undefined;
  return { role, state, me: self };
}

export function feedbackSummary(s: Snapshot): FeedbackSummary {
  const byParticipant = new Map(s.feedback.map((row) => [row.participant_id, row]));
  const submitted = s.participants.filter((participant) => byParticipant.has(participant.id)).length;
  const ratings = s.feedback.map((row) => row.training_rating);
  return {
    submitted,
    pending: s.participants.length - submitted,
    completion: s.participants.length ? Math.round((submitted / s.participants.length) * 100) : 0,
    averageRating: ratings.length ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10 : null,
    statuses: s.participants.map((participant) => ({
      participantId: participant.id,
      nickname: participant.nickname,
      submittedAt: byParticipant.get(participant.id)?.submitted_at ?? null,
    })),
  };
}
