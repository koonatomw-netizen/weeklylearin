import { formGroups, shuffle, topEntryIds } from "../shared/battle";
import { GAME_LIMITS } from "../shared/games";
import { LEGACY_META, deckMeta, type DeckMeta, type PublishedDeck } from "../shared/deck";
import type { WidgetKind } from "../shared/slideDoc";
import { SITUATIONS, pickSituation } from "../shared/situations";
import {
  FEEDBACK_TEXT_MAX, MAX_ATTEMPTS, MAX_PARTICIPANTS, PROMPT_MAX, PROMPT_MIN,
  type ChecklistKey, type ControlAction, type FeedbackResponse, type Role,
} from "../shared/types";
import {
  buildEnvelope, caseBlockReason, entriesOf, eligibleVoters, finalSummary, orderedBattles, voteCounts,
  type ActionRow, type BattleRow, type EntryRow, type FeedbackStatusRow, type FinalRow, type ParticipantRow, type RoomRow,
  type Snapshot, type SubmissionRow, type VoteRow,
} from "./view";
import type { GameAnswerRow } from "../shared/games";

export interface Env {
  DB: D1Database;
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
  HOST_PASSPHRASE?: string;
  ADMIN_PASSPHRASE?: string;
  ASSET_BUCKET?: R2Bucket;
}

interface Ticket { role: Role; participantId?: string; expiresAt: number }
interface Connection { role: Role; participantId?: string }
type Caller = { role: "host" } | { role: "participant"; participant: ParticipantRow };

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function randomSecret(bytes = 32): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Uniform random number in [0, 1) from the platform CSPRNG. */
function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function bearer(request: Request): string | null {
  const value = request.headers.get("Authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** Normalise user text: unify newlines and drop control characters other than tab/newline. */
function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}

function requestId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(value)) throw new HttpError(400, "A valid request id is required.");
  return value;
}

async function readBody<T>(request: Request): Promise<Partial<T>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body as Partial<T> : {};
  } catch { throw new HttpError(400, "The request body could not be read."); }
}

const CHECKLIST_KEYS: ChecklistKey[] = ["context", "goal", "audience", "constraints", "format"];

export class RoomHub {
  private readonly ctx: DurableObjectState;
  private readonly env: Env;
  private readonly code: string;
  private readonly locks = new Map<string, Promise<unknown>>();
  private readonly rate = new Map<string, { count: number; reset: number }>();
  private broadcasting: Promise<void> | null = null;
  private dirty = false;
  private deck: { id: string; deck: PublishedDeck; meta: DeckMeta } | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
    this.code = ctx.id.name ?? "";
  }

  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === "/ws") return await this.connectSocket(request);
      // Internal only (the public router has no "refresh" action): the studio moved this room to a newer deck.
      if (pathname === "/refresh" && request.method === "POST") { await this.broadcast(); return json({ ok: true }); }
      const room = await this.getRoom();
      if (!room) return json({ error: "Room not found. Check the six-digit room code." }, 404);
      // An ended room is read-only: state, deck and exports still work; everything that changes the room is refused.
      if (room.ended_at && request.method === "POST" && pathname !== "/control" && pathname !== "/ticket") {
        return json({ error: "This session has ended." }, 409);
      }
      let response: Response;
      if (pathname === "/join" && request.method === "POST") response = await this.join(request, room);
      else if (pathname === "/state" && request.method === "GET") response = await this.getState(request, room);
      else if (pathname === "/ticket" && request.method === "POST") response = await this.createTicket(request, room);
      else if (pathname === "/submit" && request.method === "POST") response = await this.submit(request, room);
      else if (pathname === "/checklist" && request.method === "POST") response = await this.saveChecklist(request, room);
      else if (pathname === "/final" && request.method === "POST") response = await this.selectFinal(request, room);
      else if (pathname === "/vote" && request.method === "POST") response = await this.vote(request, room);
      else if (pathname === "/answer" && request.method === "POST") response = await this.answerGame(request, room);
      else if (pathname === "/control" && request.method === "POST") response = await this.control(request, room);
      else if (pathname === "/export" && request.method === "GET") response = await this.exportCsv(request, room);
      else if (pathname === "/feedback" && request.method === "POST") response = await this.submitFeedback(request, room);
      else if (pathname === "/responses" && request.method === "GET") response = await this.feedbackResponses(request, room);
      else if (pathname === "/feedbackcsv" && request.method === "GET") response = await this.exportFeedbackCsv(request, room);
      else if (pathname === "/deck" && request.method === "GET") response = await this.getDeck(request, room);
      else response = json({ error: "Not found" }, 404);
      return response;
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error("room request failed", error);
      return json({ error: "The room request could not be completed. Please retry." }, 500);
    } finally {
      if (request.body && !request.bodyUsed) {
        try { await request.arrayBuffer(); } catch { /* drain unread request data */ }
      }
    }
  }

  // ---------------------------------------------------------------- helpers

  private limit(key: string, max: number, windowMs = 60_000): void {
    const now = Date.now();
    const bucket = this.rate.get(key);
    if (!bucket || bucket.reset < now) {
      this.rate.set(key, { count: 1, reset: now + windowMs });
      if (this.rate.size > 2000) for (const [name, value] of this.rate) if (value.reset < now) this.rate.delete(name);
      return;
    }
    bucket.count += 1;
    if (bucket.count > max) throw new HttpError(429, "Too many requests. Please wait a moment and try again.");
  }

  /** Serialise work per key inside this object so double-clicks cannot interleave. */
  private async withLock<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(work);
    this.locks.set(key, next);
    try { return await next; }
    finally { if (this.locks.get(key) === next) this.locks.delete(key); }
  }

  /** The room row. D1 occasionally fails a read with a transient "session commit token" error, so it is retried a couple of times. */
  private async getRoom(): Promise<RoomRow | null> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.env.DB.prepare("SELECT code, title, host_token_hash, created_at, current_slide, slide_step, activity, active_battle_id, snapshot_id, case_situation_id, case_roll, ended_at, game_id, game_question, game_status FROM rooms WHERE code = ?")
          .bind(this.code).first<RoomRow>();
      } catch (error) {
        if (attempt >= 2 || !String(error).includes("session commit token")) throw error;
      }
    }
  }

  private async caller(request: Request, room: RoomRow): Promise<Caller | null> {
    const token = bearer(request);
    if (!token || token.length > 128) return null;
    const hash = await sha256(token);
    if (safeEqual(hash, room.host_token_hash)) return { role: "host" };
    const participant = await this.env.DB.prepare("SELECT id, nickname, joined_at FROM participants WHERE room_code = ? AND participant_token_hash = ?")
      .bind(room.code, hash).first<ParticipantRow>();
    return participant ? { role: "participant", participant } : null;
  }

  private async requireParticipant(request: Request, room: RoomRow): Promise<ParticipantRow> {
    const caller = await this.caller(request, room);
    if (!caller || caller.role !== "participant") throw new HttpError(401, "Your session has expired. Rejoin with the room code.");
    return caller.participant;
  }

  private async snapshot(includeActions = false): Promise<Snapshot> {
    const db = this.env.DB;
    const [room, participants, submissions, finals, battles, entries, votes, actions, feedback, gameAnswers] = await db.batch([
      db.prepare("SELECT code, title, host_token_hash, created_at, current_slide, slide_step, activity, active_battle_id, snapshot_id, case_situation_id, case_roll, ended_at, game_id, game_question, game_status FROM rooms WHERE code = ?").bind(this.code),
      db.prepare("SELECT id, nickname, joined_at FROM participants WHERE room_code = ? ORDER BY joined_at, nickname").bind(this.code),
      db.prepare("SELECT id, participant_id, attempt, prompt_text, request_id, checklist_json, submitted_at FROM prompt_submissions WHERE room_code = ? ORDER BY submitted_at").bind(this.code),
      db.prepare("SELECT participant_id, submission_id, auto_selected FROM final_selections WHERE room_code = ?").bind(this.code),
      db.prepare("SELECT id, round, sequence, status, eligible_voters, resolution_note FROM battles WHERE room_code = ?").bind(this.code),
      db.prepare(`SELECT e.id, e.battle_id, e.submission_id, e.participant_id, e.display_order, e.is_winner
        FROM battle_entries e JOIN battles b ON b.id = e.battle_id WHERE b.room_code = ?`).bind(this.code),
      db.prepare(`SELECT v.battle_id, v.entry_id, v.voter_participant_id FROM votes v JOIN battles b ON b.id = v.battle_id WHERE b.room_code = ?`).bind(this.code),
      db.prepare("SELECT action, detail_json, created_at FROM presenter_actions WHERE room_code = ? AND ? = 1 ORDER BY created_at DESC LIMIT 40").bind(this.code, includeActions ? 1 : 0),
      // Status columns only: free-text answers never enter the broadcast snapshot.
      db.prepare("SELECT participant_id, training_rating, submitted_at FROM weekly_feedback WHERE session_id = ?").bind(this.code),
      db.prepare("SELECT participant_id, game_id, question_index, choice, text FROM game_answers WHERE room_code = ? ORDER BY created_at").bind(this.code),
    ]);
    const roomRow = (room.results as RoomRow[])[0];
    if (!roomRow) throw new HttpError(404, "Room not found.");
    return {
      room: roomRow,
      participants: participants.results as ParticipantRow[],
      submissions: submissions.results as SubmissionRow[],
      finals: finals.results as FinalRow[],
      battles: battles.results as BattleRow[],
      entries: entries.results as EntryRow[],
      votes: votes.results as VoteRow[],
      actions: actions.results as ActionRow[],
      feedback: feedback.results as FeedbackStatusRow[],
      gameAnswers: gameAnswers.results as GameAnswerRow[],
      meta: (await this.loadDeck(roomRow))?.meta ?? LEGACY_META,
    };
  }

  /** The published deck for this room (cached: snapshots never change), or null for the built-in deck. */
  private async loadDeck(room: RoomRow): Promise<{ deck: PublishedDeck; meta: DeckMeta } | null> {
    if (!room.snapshot_id) return null;
    if (this.deck?.id === room.snapshot_id) return this.deck;
    const row = await this.env.DB.prepare("SELECT deck_json FROM training_snapshots WHERE id = ?").bind(room.snapshot_id).first<{ deck_json: string }>();
    if (!row) throw new HttpError(500, "This session's published slides could not be found.");
    const deck = JSON.parse(row.deck_json) as PublishedDeck;
    this.deck = { id: room.snapshot_id, deck, meta: deckMeta(deck) };
    return this.deck;
  }

  /** Presenter/projector only: the frozen slides, including presenter notes. */
  private async getDeck(request: Request, room: RoomRow): Promise<Response> {
    const caller = await this.caller(request, room);
    if (!caller || caller.role !== "host") return json({ error: "Presenter access is required." }, 401);
    const loaded = await this.loadDeck(room);
    return Response.json({ snapshotId: room.snapshot_id, deck: loaded?.deck ?? null }, { headers: { "Cache-Control": "private, max-age=3600" } });
  }

  private async envelopeFor(caller: Caller): Promise<Response> {
    const snapshot = await this.snapshot(caller.role === "host");
    return json(buildEnvelope(snapshot, caller.role, caller.role === "participant" ? caller.participant.id : undefined));
  }

  private logAction(action: string, detail: Record<string, unknown> = {}): D1PreparedStatement {
    return this.env.DB.prepare("INSERT INTO presenter_actions (id, room_code, action, detail_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), this.code, action, JSON.stringify(detail), new Date().toISOString());
  }

  // ------------------------------------------------------------- endpoints

  private async getState(request: Request, room: RoomRow): Promise<Response> {
    const caller = await this.caller(request, room);
    if (!caller) return json({ error: "Your session has expired. Rejoin with the room code." }, 401);
    return this.envelopeFor(caller);
  }

  private async join(request: Request, room: RoomRow): Promise<Response> {
    this.limit(`join:${request.headers.get("CF-Connecting-IP") ?? "local"}`, 60);
    const body = await readBody<{ nickname: string }>(request);
    const nickname = cleanText(body.nickname).replace(/\s+/g, " ");
    if (nickname.length < 2 || nickname.length > 24) return json({ error: "Your name must be 2â€“24 characters." }, 400);
    const count = await this.env.DB.prepare("SELECT COUNT(*) AS count FROM participants WHERE room_code = ?").bind(room.code).first<{ count: number }>();
    if ((count?.count ?? 0) >= MAX_PARTICIPANTS) return json({ error: `This room is full (${MAX_PARTICIPANTS} participants).` }, 409);
    const id = crypto.randomUUID();
    const token = randomSecret();
    try {
      await this.env.DB.prepare("INSERT INTO participants (id, room_code, nickname, participant_token_hash, joined_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, room.code, nickname, await sha256(token), new Date().toISOString()).run();
    } catch {
      return json({ error: "That name is already taken in this room. Please add an initial or choose another." }, 409);
    }
    await this.broadcast();
    return json({ participantId: id, participantToken: token, nickname }, 201);
  }

  private async submit(request: Request, room: RoomRow): Promise<Response> {
    const participant = await this.requireParticipant(request, room);
    this.limit(`submit:${participant.id}`, 20);
    const body = await readBody<{ prompt: string; requestId: string }>(request);
    const id = requestId(body.requestId);
    const prompt = cleanText(body.prompt);
    return this.withLock(`participant:${participant.id}`, async () => {
      const existing = await this.env.DB.prepare("SELECT id, attempt, prompt_text, request_id FROM prompt_submissions WHERE participant_id = ? ORDER BY attempt")
        .bind(participant.id).all<{ id: string; attempt: number; prompt_text: string; request_id: string }>();
      // Same request retried (double-click, network retry): return the saved result.
      if (existing.results.some((row) => row.request_id === id)) return this.envelopeFor({ role: "participant", participant });
      const current = await this.getRoom();
      if (current?.activity !== "writing") throw new HttpError(409, "Prompt submission is closed right now.");
      if (prompt.length < PROMPT_MIN || prompt.length > PROMPT_MAX) throw new HttpError(400, `Your prompt must be ${PROMPT_MIN}â€“${PROMPT_MAX} characters.`);
      if (existing.results.length >= MAX_ATTEMPTS) throw new HttpError(409, `You have used all ${MAX_ATTEMPTS} attempts.`);
      const same = existing.results.find((row) => row.prompt_text === prompt);
      if (same) throw new HttpError(409, `This prompt is identical to attempt ${same.attempt}. Change something before submitting again.`);
      try {
        await this.env.DB.prepare(`INSERT INTO prompt_submissions (id, room_code, participant_id, attempt, prompt_text, request_id, submitted_at)
          VALUES (?, ?, ?, (SELECT COUNT(*) + 1 FROM prompt_submissions WHERE participant_id = ?), ?, ?, ?)`)
          .bind(crypto.randomUUID(), room.code, participant.id, participant.id, prompt, id, new Date().toISOString()).run();
      } catch {
        throw new HttpError(409, "That submission could not be saved because your attempts changed. Refresh and try again.");
      }
      await this.broadcast();
      const response = await this.envelopeFor({ role: "participant", participant });
      return new Response(response.body, { status: 201, headers: response.headers });
    });
  }

  private async saveChecklist(request: Request, room: RoomRow): Promise<Response> {
    const participant = await this.requireParticipant(request, room);
    this.limit(`checklist:${participant.id}`, 60);
    const body = await readBody<{ submissionId: string; checklist: Record<string, unknown> }>(request);
    const checklist: Record<string, boolean> = {};
    for (const key of CHECKLIST_KEYS) if (body.checklist && body.checklist[key] === true) checklist[key] = true;
    const result = await this.env.DB.prepare("UPDATE prompt_submissions SET checklist_json = ? WHERE id = ? AND participant_id = ?")
      .bind(JSON.stringify(checklist), String(body.submissionId ?? ""), participant.id).run();
    if (!result.meta.changes) return json({ error: "That submission was not found." }, 404);
    return this.envelopeFor({ role: "participant", participant });
  }

  private async selectFinal(request: Request, room: RoomRow): Promise<Response> {
    const participant = await this.requireParticipant(request, room);
    this.limit(`final:${participant.id}`, 30);
    const body = await readBody<{ submissionId: string }>(request);
    return this.withLock(`participant:${participant.id}`, async () => {
      const battles = await this.env.DB.prepare("SELECT COUNT(*) AS count FROM battles WHERE room_code = ?").bind(room.code).first<{ count: number }>();
      if ((battles?.count ?? 0) > 0) throw new HttpError(409, "Battle groups are already set. Your final prompt is locked.");
      const submission = await this.env.DB.prepare("SELECT id FROM prompt_submissions WHERE id = ? AND participant_id = ?")
        .bind(String(body.submissionId ?? ""), participant.id).first<{ id: string }>();
      if (!submission) throw new HttpError(404, "Choose one of your own submitted prompts.");
      await this.env.DB.prepare(`INSERT INTO final_selections (participant_id, room_code, submission_id, auto_selected, selected_at)
        VALUES (?, ?, ?, 0, ?) ON CONFLICT(participant_id) DO UPDATE SET submission_id = excluded.submission_id, auto_selected = 0, selected_at = excluded.selected_at`)
        .bind(participant.id, room.code, submission.id, new Date().toISOString()).run();
      await this.broadcast();
      return this.envelopeFor({ role: "participant", participant });
    });
  }

  private async vote(request: Request, room: RoomRow): Promise<Response> {
    const participant = await this.requireParticipant(request, room);
    this.limit(`vote:${participant.id}`, 30);
    const body = await readBody<{ battleId: string; entryId: string; requestId: string }>(request);
    const id = requestId(body.requestId);
    const battleId = String(body.battleId ?? "");
    const entryId = String(body.entryId ?? "");
    return this.withLock(`participant:${participant.id}`, async () => {
      const battle = await this.env.DB.prepare("SELECT id, status FROM battles WHERE id = ? AND room_code = ?").bind(battleId, room.code).first<{ id: string; status: string }>();
      if (!battle) throw new HttpError(404, "That battle was not found.");
      const previous = await this.env.DB.prepare("SELECT entry_id, request_id FROM votes WHERE battle_id = ? AND voter_participant_id = ?")
        .bind(battleId, participant.id).first<{ entry_id: string; request_id: string }>();
      if (previous) {
        if (previous.request_id === id && previous.entry_id === entryId) return this.envelopeFor({ role: "participant", participant });
        throw new HttpError(409, "You have already voted in this battle. Votes cannot be changed.");
      }
      if (battle.status !== "open") throw new HttpError(409, "Voting is not open for this battle.");
      const entries = await this.env.DB.prepare("SELECT id, participant_id FROM battle_entries WHERE battle_id = ?").bind(battleId).all<{ id: string; participant_id: string }>();
      if (entries.results.some((entry) => entry.participant_id === participant.id)) throw new HttpError(403, "Your own prompt is in this battle, so you cannot vote here.");
      if (!entries.results.some((entry) => entry.id === entryId)) throw new HttpError(400, "Choose one of the prompts in this battle.");
      try {
        await this.env.DB.prepare("INSERT INTO votes (id, battle_id, entry_id, voter_participant_id, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), battleId, entryId, participant.id, id, new Date().toISOString()).run();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("battle_not_open")) throw new HttpError(409, "Voting closed before your vote arrived.");
        if (message.includes("competitor_cannot_vote")) throw new HttpError(403, "Your own prompt is in this battle, so you cannot vote here.");
        throw new HttpError(409, "You have already voted in this battle. Votes cannot be changed.");
      }
      await this.broadcast();
      const response = await this.envelopeFor({ role: "participant", participant });
      return new Response(response.body, { status: 201, headers: response.headers });
    });
  }

  /** A participant's answer to the running game's current question. One answer per person per question. */
  private async answerGame(request: Request, room: RoomRow): Promise<Response> {
    const participant = await this.requireParticipant(request, room);
    this.limit(`game:${participant.id}`, 60);
    const body = await readBody<{ gameId: string; questionIndex: number; choice: number; text: string }>(request);
    return this.withLock(`participant:${participant.id}`, async () => {
      const current = await this.getRoom();
      if (!current || current.activity !== "game" || !current.game_id || current.game_id !== String(body.gameId ?? "")) throw new HttpError(409, "This game is not running right now.");
      if (current.game_status !== "open" || current.game_question !== Number(body.questionIndex)) throw new HttpError(409, "Answers are closed for this question.");
      const game = (await this.loadDeck(current))?.meta.games.find((item) => item.id === current.game_id);
      const question = game?.questions[current.game_question];
      if (!game || !question) throw new HttpError(409, "This game is not running right now.");
      let choice: number | null = null;
      let text: string | null = null;
      if (game.kind === "open") {
        text = cleanText(body.text).replace(/\s+/g, " ");
        if (!text || text.length > GAME_LIMITS.answer) throw new HttpError(400, `Type an answer of 1 to ${GAME_LIMITS.answer} characters.`);
      } else {
        choice = Number(body.choice);
        if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) throw new HttpError(400, "Choose one of the options.");
      }
      const existing = await this.env.DB.prepare("SELECT choice, text FROM game_answers WHERE participant_id = ? AND game_id = ? AND question_index = ?")
        .bind(participant.id, game.id, current.game_question).first<{ choice: number | null; text: string | null }>();
      if (existing) {
        if (existing.choice === choice && existing.text === text) return this.envelopeFor({ role: "participant", participant });
        throw new HttpError(409, "You have already answered this question.");
      }
      try {
        await this.env.DB.prepare("INSERT INTO game_answers (id, room_code, participant_id, game_id, question_index, choice, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), room.code, participant.id, game.id, current.game_question, choice, text, new Date().toISOString()).run();
      } catch { throw new HttpError(409, "You have already answered this question."); }
      await this.broadcast();
      const response = await this.envelopeFor({ role: "participant", participant });
      return new Response(response.body, { status: 201, headers: response.headers });
    });
  }

  // ------------------------------------------------------- presenter control

  private async control(request: Request, room: RoomRow): Promise<Response> {
    const caller = await this.caller(request, room);
    if (!caller || caller.role !== "host") return json({ error: "Presenter access is required." }, 401);
    const body = await readBody<ControlAction>(request) as ControlAction;
    // Ending twice is harmless; anything else on an ended room is refused (re-checked under the lock).
    if (room.ended_at) {
      if (body.action !== "end_room") throw new HttpError(409, "This session has ended.");
      return this.envelopeFor({ role: "host" });
    }
    await this.withLock("control", () => this.applyControl(body));
    await this.broadcast();
    return this.envelopeFor({ role: "host" });
  }

  private async applyControl(body: ControlAction): Promise<void> {
    const db = this.env.DB;
    const s = await this.snapshot();
    const room = s.room;
    const now = new Date().toISOString();
    const active = s.battles.find((battle) => battle.id === room.active_battle_id) ?? null;
    const setRoom = (sql: string, ...values: unknown[]) => db.prepare(`UPDATE rooms SET ${sql} WHERE code = ?`).bind(...values, this.code);
    // Move the projector to the slide holding a live widget; decks without one stay where they are.
    const jumpTo = (kind: WidgetKind) => {
      const index = s.meta.widgetSlides[kind];
      return Number.isInteger(index) ? `current_slide = ${Number(index)}, slide_step = 0` : "current_slide = current_slide";
    };

    if (room.ended_at) {
      if (body.action === "end_room") return;
      throw new HttpError(409, "This session has ended.");
    }

    switch (body.action) {
      case "end_room": {
        await db.batch([setRoom("ended_at = ?", now), this.logAction("end_room", { participants: s.participants.length, activity: room.activity })]);
        return;
      }
      case "game_start": {
        const game = s.meta.games.find((item) => item.id === body.gameId);
        if (!game) throw new HttpError(404, "That game was not found in this session.");
        if (room.activity === "writing" || room.activity === "battle" || room.activity === "feedback") throw new HttpError(409, "Close the current activity before starting a game.");
        await db.batch([
          db.prepare("DELETE FROM game_answers WHERE room_code = ? AND game_id = ?").bind(this.code, game.id),
          setRoom("activity = 'game', game_id = ?, game_question = 0, game_status = 'open'", game.id),
          this.logAction("game_start", { game: game.id, kind: game.kind }),
        ]);
        return;
      }
      case "game_close":
      case "game_reveal":
      case "game_next":
      case "game_stop": {
        const game = room.activity === "game" ? s.meta.games.find((item) => item.id === room.game_id) : undefined;
        if (!game) throw new HttpError(409, "No game is running.");
        const index = room.game_question;
        const status = room.game_status;
        if (body.action === "game_stop") {
          await db.batch([setRoom("activity = 'waiting', game_id = NULL, game_question = 0, game_status = 'idle'"), this.logAction("game_stop", { game: game.id })]);
          return;
        }
        if (body.action === "game_close") {
          if (status !== "open") throw new HttpError(409, "Answers are already closed.");
          await db.batch([setRoom("game_status = 'closed'"), this.logAction("game_close", { game: game.id, question: index })]);
          return;
        }
        if (body.action === "game_reveal") {
          if (status !== "closed") throw new HttpError(409, status === "open" ? "Close the answers before revealing." : "Already revealed.");
          await db.batch([setRoom("game_status = 'revealed'"), this.logAction("game_reveal", { game: game.id, question: index })]);
          return;
        }
        if (status === "open") throw new HttpError(409, "Close the answers before moving on.");
        if (game.kind === "quiz" && status !== "revealed") throw new HttpError(409, "Reveal the answer before moving on.");
        if (index + 1 >= game.questions.length) throw new HttpError(409, "That was the last question. Stop the game to go back to the slides.");
        await db.batch([setRoom("game_question = ?, game_status = 'open'", index + 1), this.logAction("game_next", { game: game.id, question: index + 1 })]);
        return;
      }
      case "slide": {
        const index = Number(body.index);
        const step = Number(body.step ?? 0);
        if (!Number.isInteger(index) || index < 0 || index >= s.meta.steps.length) throw new HttpError(400, "Slide number is out of range.");
        if (!Number.isInteger(step) || step < 0 || step > s.meta.steps[index]) throw new HttpError(400, "Slide step is out of range.");
        await setRoom("current_slide = ?, slide_step = ?", index, step).run();
        return;
      }
      case "activity": {
        if (!["waiting", "writing", "writing_closed"].includes(body.activity)) throw new HttpError(400, "Unknown activity.");
        if (s.battles.length) throw new HttpError(409, "Battles have started. Prompt writing can no longer be reopened.");
        const statements = [setRoom("activity = ?", body.activity), this.logAction(`activity:${body.activity}`)];
        if (body.activity === "writing") statements.push(setRoom(jumpTo("challenge")));
        await db.batch(statements);
        return;
      }
      case "open_case": {
        const blocked = caseBlockReason(s);
        if (blocked) throw new HttpError(409, blocked);
        const pick = pickSituation(secureRandom, room.case_situation_id ?? undefined, s.meta.situations ?? SITUATIONS);
        await db.batch([
          setRoom("case_situation_id = ?, case_roll = case_roll + 1", pick.id),
          this.logAction("open_case", { situation: pick.id, rarity: pick.rarity }),
        ]);
        return;
      }
      case "generate_battles": {
        if (s.battles.some((battle) => battle.status !== "pending")) throw new HttpError(409, "Voting has already started, so groups can no longer be regenerated.");
        const finals = new Map(s.finals.map((final) => [final.participant_id, final.submission_id]));
        const autoSelections: Array<{ participantId: string; submissionId: string }> = [];
        for (const participant of s.participants) {
          if (finals.has(participant.id)) continue;
          const latest = s.submissions.filter((submission) => submission.participant_id === participant.id).sort((a, b) => b.attempt - a.attempt)[0];
          if (latest) { finals.set(participant.id, latest.id); autoSelections.push({ participantId: participant.id, submissionId: latest.id }); }
        }
        if (finals.size < 2) throw new HttpError(409, "At least two participants need a submitted prompt before battles can start.");
        const groups = formGroups([...finals.entries()].map(([participantId, submissionId]) => ({ participantId, submissionId })), secureRandom);
        const statements: D1PreparedStatement[] = [
          db.prepare("DELETE FROM battles WHERE room_code = ? AND status = 'pending'").bind(this.code),
          ...autoSelections.map((auto) => db.prepare(`INSERT INTO final_selections (participant_id, room_code, submission_id, auto_selected, selected_at)
            VALUES (?, ?, ?, 1, ?) ON CONFLICT(participant_id) DO NOTHING`).bind(auto.participantId, this.code, auto.submissionId, now)),
        ];
        let firstBattle = "";
        groups.forEach((group, groupIndex) => {
          const battleId = crypto.randomUUID();
          if (!firstBattle) firstBattle = battleId;
          statements.push(db.prepare("INSERT INTO battles (id, room_code, round, sequence, status, created_at) VALUES (?, ?, 'mini', ?, 'pending', ?)")
            .bind(battleId, this.code, groupIndex + 1, now));
          group.forEach((item, order) => statements.push(db.prepare(`INSERT INTO battle_entries (id, battle_id, submission_id, participant_id, display_order)
            VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), battleId, item.submissionId, item.participantId, order + 1)));
        });
        statements.push(setRoom(`activity = 'battle', active_battle_id = ?, ${jumpTo("battle")}`, firstBattle));
        statements.push(this.logAction("generate_battles", { prompts: finals.size, groups: groups.map((group) => group.length), autoSelected: autoSelections.length }));
        await db.batch(statements);
        return;
      }
      case "open_voting": {
        if (!active || active.status !== "pending") throw new HttpError(409, "There is no battle waiting to open.");
        await db.batch([
          db.prepare("UPDATE battles SET status = 'open', opened_at = ? WHERE id = ? AND status = 'pending'").bind(now, active.id),
          setRoom(jumpTo("battle")),
          this.logAction("open_voting", { battle: `${active.round}-${active.sequence}` }),
        ]);
        return;
      }
      case "close_voting": {
        if (!active || active.status !== "open") throw new HttpError(409, "Voting is not open.");
        const eligible = eligibleVoters(s, { ...active, eligible_voters: null });
        await db.batch([
          db.prepare("UPDATE battles SET status = 'closed', closed_at = ?, eligible_voters = ? WHERE id = ? AND status = 'open'").bind(now, eligible, active.id),
          this.logAction("close_voting", { battle: `${active.round}-${active.sequence}`, eligible, votes: s.votes.filter((vote) => vote.battle_id === active.id).length }),
        ]);
        return;
      }
      case "reveal": {
        if (!active || active.status !== "closed") throw new HttpError(409, "Close voting before revealing results.");
        const counts = voteCounts(s, active.id);
        const winners = topEntryIds(entriesOf(s, active.id).map((entry) => ({ id: entry.id, votes: counts.get(entry.id) ?? 0 })));
        await db.batch([
          db.prepare("UPDATE battles SET status = 'revealed', revealed_at = ? WHERE id = ? AND status = 'closed'").bind(now, active.id),
          db.prepare("UPDATE battle_entries SET is_winner = 0 WHERE battle_id = ?").bind(active.id),
          ...winners.map((entryId) => db.prepare("UPDATE battle_entries SET is_winner = 1 WHERE id = ?").bind(entryId)),
          this.logAction("reveal", { battle: `${active.round}-${active.sequence}`, winners: winners.length }),
        ]);
        return;
      }
      case "next_battle": {
        if (active && active.status !== "revealed") throw new HttpError(409, "Reveal the current battle before moving on.");
        const next = orderedBattles(s.battles).find((battle) => battle.round === "mini" && battle.status === "pending");
        if (!next) throw new HttpError(409, "All mini battles are complete. Start the Grand Final next.");
        await db.batch([setRoom(`active_battle_id = ?, ${jumpTo("battle")}`, next.id), this.logAction("next_battle", { battle: `mini-${next.sequence}` })]);
        return;
      }
      case "start_final": {
        const summary = finalSummary(s);
        if (summary.status !== "ready") throw new HttpError(409, summary.status === "not_ready" ? "Reveal every mini battle before the Grand Final." : "The Grand Final has already started.");
        const finalists = s.entries.filter((entry) => entry.is_winner === 1 && s.battles.find((battle) => battle.id === entry.battle_id)?.round === "mini");
        await db.batch(this.createFinalBattle(finalists, 1, now, "start_final", jumpTo("battle")));
        return;
      }
      case "start_tiebreak": {
        const summary = finalSummary(s);
        if (summary.status !== "tie" || !summary.latest) throw new HttpError(409, "A tie-break is only available after a tied Grand Final.");
        await db.batch(this.createFinalBattle(summary.winners, summary.latest.sequence + 1, now, "start_tiebreak", jumpTo("battle")));
        return;
      }
      case "accept_shared": {
        const summary = finalSummary(s);
        if (summary.status !== "tie" || !summary.latest) throw new HttpError(409, "There is no tie to share.");
        await db.batch([
          db.prepare("UPDATE battles SET resolution_note = ? WHERE id = ?").bind("Shared winners accepted by the presenter.", summary.latest.id),
          this.logAction("accept_shared", { winners: summary.winners.length }),
        ]);
        return;
      }
      case "resolve": {
        const battle = s.battles.find((item) => item.id === body.battleId);
        if (!battle) throw new HttpError(404, "Battle not found.");
        if (battle.status !== "revealed") throw new HttpError(409, "Only revealed battles can be resolved manually.");
        if (battle.round === "mini" && s.battles.some((item) => item.round === "final")) throw new HttpError(409, "The Grand Final has started, so mini battle results are locked.");
        const latestFinal = finalSummary(s).latest;
        if (battle.round === "final" && latestFinal?.id !== battle.id) throw new HttpError(409, "Only the latest Grand Final round can be resolved.");
        const reason = cleanText(body.reason);
        if (reason.length < 3 || reason.length > 300) throw new HttpError(400, "Give a reason of 3â€“300 characters for the manual decision.");
        const entryIds = new Set(entriesOf(s, battle.id).map((entry) => entry.id));
        const winners = Array.isArray(body.winnerEntryIds) ? [...new Set(body.winnerEntryIds.map(String))] : [];
        if (!winners.length || winners.some((id) => !entryIds.has(id))) throw new HttpError(400, "Choose at least one winner from this battle.");
        await db.batch([
          db.prepare("UPDATE battle_entries SET is_winner = 0 WHERE battle_id = ?").bind(battle.id),
          ...winners.map((id) => db.prepare("UPDATE battle_entries SET is_winner = 1 WHERE id = ?").bind(id)),
          db.prepare("UPDATE battles SET resolution_note = ? WHERE id = ?").bind(`Presenter decision: ${reason}`, battle.id),
          this.logAction("resolve", { battle: `${battle.round}-${battle.sequence}`, winners: winners.length, reason }),
        ]);
        return;
      }
      case "show_results": {
        if (finalSummary(s).status !== "complete") throw new HttpError(409, "Finish the Grand Final (or resolve its tie) before showing the leaderboard.");
        await db.batch([setRoom(`activity = 'results', ${jumpTo("leaderboard")}`), this.logAction("show_results")]);
        return;
      }
      case "start_feedback": {
        if (room.activity === "feedback") throw new HttpError(409, "Weekly feedback is already open.");
        if (s.battles.some((battle) => battle.status === "open")) throw new HttpError(409, "Close the current vote before opening weekly feedback.");
        await db.batch([setRoom("activity = 'feedback'"), this.logAction("start_feedback")]);
        return;
      }
      default:
        throw new HttpError(400, "Unknown presenter action.");
    }
  }

  private createFinalBattle(finalists: EntryRow[], sequence: number, now: string, action: string, slideSql: string): D1PreparedStatement[] {
    const db = this.env.DB;
    if (!finalists.length) throw new HttpError(409, "No finalists were found.");
    const battleId = crypto.randomUUID();
    const single = finalists.length === 1;
    const ordered = shuffle(finalists, secureRandom);
    return [
      db.prepare(`INSERT INTO battles (id, room_code, round, sequence, status, resolution_note, created_at, revealed_at)
        VALUES (?, ?, 'final', ?, ?, ?, ?, ?)`)
        .bind(battleId, this.code, sequence, single ? "revealed" : "pending", single ? "Only one finalist, so they win by default." : "", now, single ? now : null),
      ...ordered.map((entry, index) => db.prepare(`INSERT INTO battle_entries (id, battle_id, submission_id, participant_id, display_order, is_winner)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), battleId, entry.submission_id, entry.participant_id, index + 1, single ? 1 : 0)),
      db.prepare(`UPDATE rooms SET active_battle_id = ?, ${slideSql} WHERE code = ?`).bind(battleId, this.code),
      this.logAction(action, { finalists: finalists.length, sequence }),
    ];
  }

  // ------------------------------------------------------------------ export

  private async exportCsv(request: Request, room: RoomRow): Promise<Response> {
    const caller = await this.caller(request, room);
    if (!caller || caller.role !== "host") return json({ error: "Presenter access is required." }, 401);
    const s = await this.snapshot();
    const envelope = buildEnvelope(s, "host");
    const ranks = new Map(envelope.state.leaderboard.map((row) => [row.participantId, row]));
    const columns = ["nickname", "joined_at", "attempts", "attempt_1", "attempt_2", "attempt_3", "final_prompt", "final_auto_selected",
      "mini_battle", "battle_votes", "battle_eligible_votes", "battle_votes_cast", "battle_score", "advanced_to_final",
      "grand_final_votes", "grand_final_eligible_votes", "grand_final_score", "stage", "rank", "resolution_notes"];
    const rows = s.participants.map((participant) => {
      const attempts = s.submissions.filter((submission) => submission.participant_id === participant.id).sort((a, b) => a.attempt - b.attempt);
      const final = s.finals.find((item) => item.participant_id === participant.id);
      const miniEntry = s.entries.find((entry) => entry.participant_id === participant.id && s.battles.find((battle) => battle.id === entry.battle_id)?.round === "mini");
      const miniBattle = miniEntry ? s.battles.find((battle) => battle.id === miniEntry.battle_id) : undefined;
      const miniView = miniBattle ? envelope.state.battles.find((battle) => battle.id === miniBattle.id) : undefined;
      const miniResult = miniView?.entries.find((entry) => entry.id === miniEntry?.id)?.result;
      const row = ranks.get(participant.id);
      const notes = s.battles.filter((battle) => battle.resolution_note && s.entries.some((entry) => entry.battle_id === battle.id && entry.participant_id === participant.id))
        .map((battle) => `${battle.round} ${battle.sequence}: ${battle.resolution_note}`).join(" | ");
      return [participant.nickname, participant.joined_at, attempts.length,
        attempts[0]?.prompt_text ?? "", attempts[1]?.prompt_text ?? "", attempts[2]?.prompt_text ?? "",
        s.submissions.find((submission) => submission.id === final?.submission_id)?.prompt_text ?? "", final ? (final.auto_selected ? "yes" : "no") : "",
        miniBattle ? miniBattle.sequence : "", miniResult?.votes ?? "", miniView && miniBattle?.status === "revealed" ? miniView.eligibleVoters : "",
        miniView?.votesCast ?? "", miniResult?.score ?? "", miniResult ? (miniResult.isWinner ? "yes" : "no") : "",
        row?.finalVotes ?? "", row?.finalEligible ?? "", row?.finalScore ?? "", row?.stage ?? "", row?.rank ?? "", notes];
    });
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(`ï»¿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="4seas-${room.code.toLowerCase()}-prompt-battle.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // ----------------------------------------------------------- weekly feedback

  private async submitFeedback(request: Request, room: RoomRow): Promise<Response> {
    // Identity comes from the participant token only; any name in the body is ignored.
    const participant = await this.requireParticipant(request, room);
    this.limit(`feedback:${participant.id}`, 10);
    const body = await readBody<Record<string, unknown>>(request);
    const rating = Number(body.trainingRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Choose a training rating from 1 to 5.");
    const required = { workChallenges: "work challenges", supportNeeded: "support needed", trainingRequests: "training requests" } as const;
    const answers: Record<string, string> = {};
    for (const [key, label] of Object.entries(required)) {
      const value = cleanText(body[key]);
      if (!value) throw new HttpError(400, `Answer the ${label} question. Type "None" or "à¹„à¸¡à¹ˆà¸¡à¸µ" if nothing applies.`);
      if (value.length > FEEDBACK_TEXT_MAX) throw new HttpError(400, `Keep each answer under ${FEEDBACK_TEXT_MAX} characters.`);
      answers[key] = value;
    }
    const other = cleanText(body.otherComments);
    if (other.length > FEEDBACK_TEXT_MAX) throw new HttpError(400, `Keep each answer under ${FEEDBACK_TEXT_MAX} characters.`);
    return this.withLock(`participant:${participant.id}`, async () => {
      const current = await this.getRoom();
      const existing = await this.env.DB.prepare("SELECT id FROM weekly_feedback WHERE session_id = ? AND participant_id = ?")
        .bind(room.code, participant.id).first<{ id: string }>();
      if (existing) throw new HttpError(409, "You have already submitted feedback for this session.");
      if (current?.activity !== "feedback") throw new HttpError(409, "Weekly feedback is not open yet.");
      try {
        await this.env.DB.prepare(`INSERT INTO weekly_feedback
          (id, session_id, participant_id, training_rating, work_challenges, support_needed, training_requests, other_comments, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), room.code, participant.id, rating, answers.workChallenges, answers.supportNeeded, answers.trainingRequests, other, new Date().toISOString()).run();
      } catch {
        throw new HttpError(409, "You have already submitted feedback for this session.");
      }
      await this.broadcast();
      const response = await this.envelopeFor({ role: "participant", participant });
      return new Response(response.body, { status: 201, headers: response.headers });
    });
  }

  private async readFeedback(room: RoomRow): Promise<Array<FeedbackResponse & { participantId: string }>> {
    const rows = await this.env.DB.prepare(`SELECT f.participant_id, p.nickname, f.training_rating, f.work_challenges, f.support_needed,
      f.training_requests, f.other_comments, f.submitted_at
      FROM weekly_feedback f JOIN participants p ON p.id = f.participant_id WHERE f.session_id = ? ORDER BY f.submitted_at`)
      .bind(room.code).all<{ participant_id: string; nickname: string; training_rating: number; work_challenges: string; support_needed: string; training_requests: string; other_comments: string; submitted_at: string }>();
    return rows.results.map((row) => ({
      participantId: row.participant_id,
      nickname: row.nickname,
      trainingRating: row.training_rating,
      workChallenges: row.work_challenges,
      supportNeeded: row.support_needed,
      trainingRequests: row.training_requests,
      otherComments: row.other_comments,
      submittedAt: row.submitted_at,
    }));
  }

  /** Management view: individual answers, presenter token only, fetched on demand (never broadcast). */
  private async feedbackResponses(request: Request, room: RoomRow): Promise<Response> {
    const caller = await this.caller(request, room);
    if (!caller || caller.role !== "host") return json({ error: "Presenter access is required." }, 401);
    return json({ responses: await this.readFeedback(room) });
  }

  private async exportFeedbackCsv(request: Request, room: RoomRow): Promise<Response> {
    const caller = await this.caller(request, room);
    if (!caller || caller.role !== "host") return json({ error: "Presenter access is required." }, 401);
    const responses = new Map((await this.readFeedback(room)).map((row) => [row.participantId, row]));
    const participants = await this.env.DB.prepare("SELECT id, nickname, joined_at FROM participants WHERE room_code = ? ORDER BY joined_at")
      .bind(room.code).all<ParticipantRow>();
    const columns = ["session", "nickname", "status", "submitted_at", "training_rating", "work_challenges", "support_needed", "training_requests", "other_comments"];
    const rows = participants.results.map((participant) => {
      const row = responses.get(participant.id);
      return [room.code, participant.nickname, row ? "submitted" : "pending", row?.submittedAt ?? "", row?.trainingRating ?? "",
        row?.workChallenges ?? "", row?.supportNeeded ?? "", row?.trainingRequests ?? "", row?.otherComments ?? ""];
    });
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(`ï»¿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="4seas-${room.code.toLowerCase()}-weekly-feedback.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // --------------------------------------------------------------- realtime

  private async createTicket(request: Request, room: RoomRow): Promise<Response> {
    const caller = await this.caller(request, room);
    if (!caller) return json({ error: "Your session has expired. Rejoin with the room code." }, 401);
    this.limit(`ticket:${caller.role === "host" ? "host" : caller.participant.id}`, 30);
    const ticket: Ticket = caller.role === "host"
      ? { role: "host", expiresAt: Date.now() + 60_000 }
      : { role: "participant", participantId: caller.participant.id, expiresAt: Date.now() + 60_000 };
    const value = randomSecret(20);
    await this.ctx.storage.put(`ticket:${value}`, ticket);
    return json({ ticket: value });
  }

  private async connectSocket(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return json({ error: "WebSocket upgrade required" }, 426);
    const ticketValue = new URL(request.url).searchParams.get("ticket");
    if (!ticketValue) return json({ error: "A one-time room ticket is required." }, 401);
    const ticket = await this.ctx.storage.get<Ticket>(`ticket:${ticketValue}`);
    await this.ctx.storage.delete(`ticket:${ticketValue}`);
    if (!ticket || ticket.expiresAt < Date.now()) return json({ error: "Room connection ticket expired. Reconnect." }, 401);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role: ticket.role, participantId: ticket.participantId } satisfies Connection);
    const snapshot = await this.snapshot(ticket.role === "host");
    server.send(JSON.stringify({ type: "room", ...buildEnvelope(snapshot, ticket.role, ticket.participantId) }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message === "ping") socket.send("pong");
  }

  async webSocketClose(_socket: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    // The client may omit a code (1005), which is not valid to send to close().
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    try { socket.close(1011, "Room connection error"); } catch { /* already closed */ }
  }

  /** Coalesces bursts (e.g. many votes at once) into as few snapshot rebuilds as possible. */
  private broadcast(): Promise<void> {
    this.dirty = true;
    if (!this.broadcasting) {
      this.broadcasting = (async () => {
        while (this.dirty) {
          this.dirty = false;
          await this.sendAll();
        }
      })().finally(() => { this.broadcasting = null; });
    }
    return this.broadcasting;
  }

  private async sendAll(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (!sockets.length) return;
    const snapshot = await this.snapshot(true);
    let hostFrame = "";
    for (const socket of sockets) {
      try {
        const connection = socket.deserializeAttachment() as Connection | null;
        if (!connection) continue;
        if (connection.role === "host") {
          hostFrame ||= JSON.stringify({ type: "room", ...buildEnvelope(snapshot, "host") });
          socket.send(hostFrame);
        } else {
          socket.send(JSON.stringify({ type: "room", ...buildEnvelope(snapshot, "participant", connection.participantId) }));
        }
      } catch {
        try { socket.close(1011, "Unable to refresh room state"); } catch { /* already closed */ }
      }
    }
  }
}

/** Six-digit numeric room code, uniformly distributed. */
export function makeRoomCode(): string {
  const limit = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;
  let value = 0;
  do value = crypto.getRandomValues(new Uint32Array(1))[0]; while (value >= limit);
  return String(value % 1_000_000).padStart(6, "0");
}
