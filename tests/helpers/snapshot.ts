import { LEGACY_META } from "../../src/shared/deck";
import type { Snapshot } from "../../src/worker/view";

export function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  const participants = ["p1", "p2", "p3", "p4", "p5"].map((id, index) => ({ id, nickname: `User${index + 1}`, joined_at: `2026-01-01T00:00:0${index}Z` }));
  const submissions = participants.map((participant) => ({
    id: `s-${participant.id}`, participant_id: participant.id, attempt: 1, prompt_text: `Prompt by ${participant.id}`,
    request_id: `req-${participant.id}`, checklist_json: "{}", submitted_at: "2026-01-01T00:01:00Z",
  }));
  return {
    room: { code: "123456", title: "t", host_token_hash: "x", created_at: "2026", current_slide: 5, slide_step: 0, activity: "battle", active_battle_id: "b1", snapshot_id: null, case_situation_id: null, case_roll: 0, ended_at: null },
    meta: LEGACY_META,
    participants,
    submissions,
    finals: submissions.map((submission) => ({ participant_id: submission.participant_id, submission_id: submission.id, auto_selected: 0 })),
    battles: [{ id: "b1", round: "mini", sequence: 1, status: "open", eligible_voters: null, resolution_note: "" }],
    entries: ["p1", "p2", "p3"].map((id, index) => ({ id: `e-${id}`, battle_id: "b1", submission_id: `s-${id}`, participant_id: id, display_order: index + 1, is_winner: 0 })),
    votes: [{ battle_id: "b1", entry_id: "e-p1", voter_participant_id: "p4" }],
    actions: [],
    feedback: [],
    ...overrides,
  };
}
