export type Language = "en" | "th";
export type Role = "host" | "participant";

/** What participants are currently asked to do. Slides are independent of this. */
export type Activity = "waiting" | "writing" | "writing_closed" | "battle" | "results" | "feedback";
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

export interface SessionState {
  code: string;
  title: string;
  createdAt: string;
  activity: Activity;
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
  | { action: "start_feedback" };
