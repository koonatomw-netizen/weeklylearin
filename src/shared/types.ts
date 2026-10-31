import type { Challenge, FeedbackQuestions } from "./deck";
import type { GameSelf, GameSummary, GameView } from "./games";
import type { Rarity } from "./situations";

export type { Challenge, FeedbackQuestions };
export type Language = "en" | "th";
export type Role = "host" | "participant";

/** What participants are currently asked to do. Slides are independent of this. */
export type Activity = "waiting" | "writing" | "writing_closed" | "battle" | "results" | "feedback" | "game";
export type BattleRound = "mini" | "final";
export type BattleStatus = "pending" | "open" | "closed" | "revealed";
export type ChecklistKey = "context" | "goal" | "audience" | "constraints" | "format";
export type Checklist = Partial<Record<ChecklistKey, boolean>>;

export const MAX_ATTEMPTS = 3;
export const PROMPT_MIN = 20;
export const PROMPT_MAX = 1200;
export const MAX_PARTICIPANTS = 80;
export const FEEDBACK_TEXT_MAX = 1000;

/** Answers a participant submits. Only the presenter's management endpoints ever return them. */
export interface FeedbackAnswers {
  trainingRating: number;
  workChallenges: string;
  supportNeeded: string;
  trainingRequests: string;
  otherComments: string;
}

/** Completion tracking only — no answers — so it is safe in the broadcast host state. */
export interface FeedbackSummary {
  submitted: number;
  pending: number;
  completion: number;
  averageRating: number | null;
  statuses: Array<{ participantId: string; nickname: string; submittedAt: string | null }>;
}

export interface FeedbackResponse extends FeedbackAnswers {
  nickname: string;
  submittedAt: string;
}

export interface OwnSubmission {
  id: string;
  attempt: number;
  promptText: string;
  submittedAt: string;
  checklist: Checklist;
}

export interface BattleEntryView {
  id: string;
  label: string;
  displayOrder: number;
  promptText: string;
  /** Only ever set for the participant who wrote this entry. */
  isOwn?: boolean;
  /** Present only after the battle is revealed. */
  result?: {
    nickname: string;
    participantId: string;
    votes: number;
    score: number;
    rank: number;
    isWinner: boolean;
  };
}

export interface BattleView {
  id: string;
  round: BattleRound;
  sequence: number;
  status: BattleStatus;
  entries: BattleEntryView[];
  eligibleVoters: number;
  votesCast: number;
  resolutionNote: string;
  tie: boolean;
  /** Participant-only fields. */
  isCompetitor?: boolean;
  hasVoted?: boolean;
  canVote?: boolean;
}

export interface LeaderboardRow {
  rank: number;
  participantId: string;
  nickname: string;
  stage: "champion" | "finalist" | "battle";
  promptText: string;
  battleVotes: number;
  battleEligible: number;
  battleScore: number;
  finalVotes: number | null;
  finalEligible: number | null;
  finalScore: number | null;
}

export type FinalStatus = "not_ready" | "ready" | "running" | "tie" | "complete";

/** The case the presenter last opened. `roll` increases on every open so screens can tell a new draw from a reload. */
export interface CaseRollInfo { situationId: string; roll: number; rarity: Rarity }

/** Title and rarity of one case in a plan's own pool, enough to draw the reel. */
export interface CasePoolTile { id: string; rarity: Rarity; titleEn: string; titleTh: string }

export interface SessionState {
  code: string;
  title: string;
  createdAt: string;
  activity: Activity;
  /** Set once the presenter ends the session for everyone; the room is then read-only. */
  endedAt: string | null;
  /** Published deck this room presents; null = the built-in Week 01 deck. */
  snapshotId: string | null;
  totalSlides: number;
  slideSteps: number[];
  challenge: Challenge;
  /** Set once the presenter has opened a case; `challenge` is then that case's situation. */
  caseRoll: CaseRollInfo | null;
  /** The plan's own case pool (titles only); null = the built-in pool; [] = case opening is off. */
  casePool: CasePoolTile[] | null;
  /** The Game Hub game running right now, or null. */
  game: GameView | null;
  /** Wording of the feedback questions for this session. */
  feedbackQuestions: FeedbackQuestions;
  currentSlide: number;
  slideStep: number;
  participantCount: number;
  submittedCount: number;
  totalSubmissions: number;
  finalSelectedCount: number;
  battles: BattleView[];
  activeBattleId: string | null;
  finalStatus: FinalStatus;
  champions: Array<{ nickname: string; promptText: string; shared: boolean }>;
  leaderboard: LeaderboardRow[];
}

export interface HostParticipant {
  id: string;
  nickname: string;
  joinedAt: string;
  attempts: number;
  finalSubmissionId: string | null;
  finalAuto: boolean;
}

export interface HostSubmission {
  id: string;
  participantId: string;
  nickname: string;
  attempt: number;
  promptText: string;
  submittedAt: string;
  isFinal: boolean;
}

export interface PresenterActionView { action: string; detail: string; createdAt: string }

export interface HostState extends SessionState {
  /** Every Game Hub game this session can run. */
  games: GameSummary[];
  participants: HostParticipant[];
  submissions: HostSubmission[];
  actions: PresenterActionView[];
  feedback: FeedbackSummary;
}

export interface ParticipantSelf {
  id: string;
  nickname: string;
  submissions: OwnSubmission[];
  finalSubmissionId: string | null;
  finalLocked: boolean;
  feedbackSubmittedAt: string | null;
  /** My answer to the current game question, or null when no game is running. */
  game: GameSelf | null;
}

export interface RoomEnvelope {
  role: Role;
  state: SessionState | HostState;
  me?: ParticipantSelf;
}

export type ControlAction =
  | { action: "slide"; index: number; step: number }
  | { action: "activity"; activity: "waiting" | "writing" | "writing_closed" }
  | { action: "generate_battles" }
  | { action: "open_voting" }
  | { action: "close_voting" }
  | { action: "reveal" }
  | { action: "next_battle" }
  | { action: "start_final" }
  | { action: "start_tiebreak" }
  | { action: "accept_shared" }
  | { action: "resolve"; battleId: string; winnerEntryIds: string[]; reason: string }
  | { action: "show_results" }
  | { action: "start_feedback" }
  | { action: "open_case" }
  | { action: "end_room" }
  | { action: "game_start"; gameId: string }
  | { action: "game_close" }
  | { action: "game_reveal" }
  | { action: "game_next" }
  | { action: "game_stop" };

/** Private AI feedback on one prompt. It is a learning aid for that participant only and never feeds a score or a vote. */
export interface AiFeedback {
  total: number;
  rubric: Record<ChecklistKey, number>;
  feedbackEn: string;
  feedbackTh: string;
  strengths: string[];
  nextSteps: string[];
}
