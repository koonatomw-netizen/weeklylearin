import { describe, expect, it } from "vitest";
import { buildEnvelope, finalSummary, type Snapshot } from "../src/worker/view";

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  const participants = ["p1", "p2", "p3", "p4", "p5"].map((id, index) => ({ id, nickname: `User${index + 1}`, joined_at: `2026-01-01T00:00:0${index}Z` }));
  const submissions = participants.map((participant) => ({
    id: `s-${participant.id}`, participant_id: participant.id, attempt: 1, prompt_text: `Prompt by ${participant.id}`,
    request_id: `req-${participant.id}`, checklist_json: "{}", submitted_at: "2026-01-01T00:01:00Z",
  }));
  return {
    room: { code: "123456", title: "t", host_token_hash: "x", created_at: "2026", current_slide: 5, slide_step: 0, activity: "battle", active_battle_id: "b1" },
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

describe("buildEnvelope", () => {
  it("hides authors and counts until reveal", () => {
    const envelope = buildEnvelope(snapshot(), "participant", "p5");
    const battle = envelope.state.battles[0];
    expect(battle.entries.every((entry) => entry.result === undefined)).toBe(true);
    expect(JSON.stringify(envelope)).not.toContain("User1");
    expect(battle.eligibleVoters).toBe(2);
    expect(battle.votesCast).toBe(1);
    expect(battle.canVote).toBe(true);
    expect("submissions" in envelope.state).toBe(false);
  });

  it("marks only the viewer's own entry and blocks competitors from voting", () => {
    const battle = buildEnvelope(snapshot(), "participant", "p2").state.battles[0];
    expect(battle.isCompetitor).toBe(true);
    expect(battle.canVote).toBe(false);
    expect(battle.entries.filter((entry) => entry.isOwn).map((entry) => entry.id)).toEqual(["e-p2"]);
  });

  it("reports a voter as done after voting", () => {
    const battle = buildEnvelope(snapshot(), "participant", "p4").state.battles[0];
    expect(battle.hasVoted).toBe(true);
    expect(battle.canVote).toBe(false);
  });

  it("reveals scores against the frozen eligible count", () => {
    const s = snapshot({
      battles: [{ id: "b1", round: "mini", sequence: 1, status: "revealed", eligible_voters: 2, resolution_note: "" }],
      votes: [{ battle_id: "b1", entry_id: "e-p1", voter_participant_id: "p4" }, { battle_id: "b1", entry_id: "e-p1", voter_participant_id: "p5" }],
    });
    s.entries[0].is_winner = 1;
    const entry = buildEnvelope(s, "participant", "p5").state.battles[0].entries.find((item) => item.id === "e-p1");
    expect(entry?.result).toMatchObject({ votes: 2, score: 100, rank: 1, isWinner: true, nickname: "User1" });
  });

  it("tracks feedback completion for the host without exposing it to other participants", () => {
    const s = snapshot({
      feedback: [
        { participant_id: "p1", training_rating: 4, submitted_at: "2026-01-01T01:00:00Z" },
        { participant_id: "p2", training_rating: 5, submitted_at: "2026-01-01T01:01:00Z" },
      ],
    });
    const host = buildEnvelope(s, "host").state as import("../src/shared/types").HostState;
    expect(host.feedback).toMatchObject({ submitted: 2, pending: 3, completion: 40, averageRating: 4.5 });
    expect(host.feedback.statuses.find((row) => row.participantId === "p3")?.submittedAt).toBeNull();
    const p1 = buildEnvelope(s, "participant", "p1");
    const p3 = buildEnvelope(s, "participant", "p3");
    expect(p1.me?.feedbackSubmittedAt).toBe("2026-01-01T01:00:00Z");
    expect(p3.me?.feedbackSubmittedAt).toBeNull();
    expect("feedback" in p3.state).toBe(false);
  });

  it("detects a tied final and completes once shared winners are accepted", () => {
    const s = snapshot({
      battles: [
        { id: "b1", round: "mini", sequence: 1, status: "revealed", eligible_voters: 2, resolution_note: "" },
        { id: "f1", round: "final", sequence: 1, status: "revealed", eligible_voters: 3, resolution_note: "" },
      ],
      votes: [],
    });
    s.entries.push(
      { id: "f-p1", battle_id: "f1", submission_id: "s-p1", participant_id: "p1", display_order: 1, is_winner: 1 },
      { id: "f-p2", battle_id: "f1", submission_id: "s-p2", participant_id: "p2", display_order: 2, is_winner: 1 },
    );
    expect(finalSummary(s).status).toBe("tie");
    s.battles[1].resolution_note = "Shared winners accepted by the presenter.";
    expect(finalSummary(s).status).toBe("complete");
    const host = buildEnvelope(s, "host");
    expect(host.state.champions.map((champion) => champion.nickname).sort()).toEqual(["User1", "User2"]);
    expect(host.state.leaderboard.filter((row) => row.rank === 1)).toHaveLength(2);
  });
});
