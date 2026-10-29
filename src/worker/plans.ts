import { DEFAULT_CHALLENGE, validateChallenge, validateFeedbackQuestions, validateSituations, type Challenge, type PublishedDeck } from "../shared/deck";
import { stepCount, validateSlideDoc, type SlideDoc } from "../shared/slideDoc";
import { HttpError, cleanBlock, cleanLine, json, readBody } from "./http";
import { makeRoomCode, randomSecret, sha256, type Env } from "./room-hub";

/**
 * Weekly Planner API (admin only; the caller has already checked the admin session).
 * Publishing freezes the plan's slides into an immutable snapshot, so later library
 * edits can never change a training that has already been delivered.
 */

type Audit = (action: string, detail?: Record<string, unknown>) => D1PreparedStatement;

interface PlanRow {
  id: string; title: string; week_date: string | null; duration_min: number | null; notes: string; challenge_json: string;
  status: "draft" | "published"; copied_from: string | null; created_at: string; updated_at: string;
  situations_json?: string | null; feedback_json?: string | null;
  slide_count?: number; latest_version?: number | null; latest_snapshot_id?: string | null; published_at?: string | null; stale?: number;
}

const MAX_PLAN_SLIDES = 80;
const MAX_DECK_BYTES = 1_500_000;

function parseChallenge(value: string): Challenge {
  try {
    const result = validateChallenge(JSON.parse(value));
    return result.ok ? result.challenge : DEFAULT_CHALLENGE;
  } catch { return DEFAULT_CHALLENGE; }
}

// Latest snapshot per plan plus whether anything changed since: the plan itself or any slide it uses.
const PLAN_SELECT = `SELECT p.*,
  (SELECT COUNT(*) FROM training_plan_slides x WHERE x.plan_id = p.id) AS slide_count,
  (SELECT MAX(version) FROM training_snapshots t WHERE t.plan_id = p.id) AS latest_version,
  (SELECT id FROM training_snapshots t WHERE t.plan_id = p.id ORDER BY version DESC LIMIT 1) AS latest_snapshot_id,
  (SELECT MAX(published_at) FROM training_snapshots t WHERE t.plan_id = p.id) AS published_at,
  CASE WHEN (SELECT MAX(published_at) FROM training_snapshots t WHERE t.plan_id = p.id) IS NULL THEN 0
       WHEN p.updated_at > (SELECT MAX(published_at) FROM training_snapshots t WHERE t.plan_id = p.id) THEN 1
       WHEN EXISTS (SELECT 1 FROM training_plan_slides x JOIN slides s ON s.id = x.slide_id WHERE x.plan_id = p.id
                    AND s.updated_at > (SELECT MAX(published_at) FROM training_snapshots t WHERE t.plan_id = p.id)) THEN 1
       ELSE 0 END AS stale
  FROM training_plans p`;

function parseStored<T>(value: string | null | undefined, validate: (input: unknown) => T | null): T | null {
  if (!value) return null;
  try { return validate(JSON.parse(value)); } catch { return null; }
}
const parseSituations = (value: string | null | undefined) => parseStored(value, (input) => { const r = validateSituations(input); return r.ok ? r.situations : null; });
const parseFeedback = (value: string | null | undefined) => parseStored(value, (input) => { const r = validateFeedbackQuestions(input); return r.ok ? r.questions : null; });

const planView = (row: PlanRow) => ({
  id: row.id, title: row.title, weekDate: row.week_date, durationMin: row.duration_min, notes: row.notes,
  challenge: parseChallenge(row.challenge_json), situations: parseSituations(row.situations_json), feedbackQuestions: parseFeedback(row.feedback_json), status: row.status, copiedFrom: row.copied_from,
  createdAt: row.created_at, updatedAt: row.updated_at, slideCount: row.slide_count ?? 0,
  latestVersion: row.latest_version ?? null, latestSnapshotId: row.latest_snapshot_id ?? null, publishedAt: row.published_at ?? null, hasUnpublishedChanges: Boolean(row.stale),
});

function cleanDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new HttpError(400, "Use a date like 2026-11-02.");
  return value;
}

function cleanDuration(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) throw new HttpError(400, "Duration must be 5–480 minutes.");
  return minutes;
}

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

async function planDetail(env: Env, id: string) {
  const [plan, slides, snapshots] = await env.DB.batch([
    env.DB.prepare(`${PLAN_SELECT} WHERE p.id = ?`).bind(id),
    env.DB.prepare(`SELECT x.position, x.slide_id, s.title, s.doc_json, s.lesson_id, l.title AS lesson_title
      FROM training_plan_slides x JOIN slides s ON s.id = x.slide_id JOIN lessons l ON l.id = s.lesson_id
      WHERE x.plan_id = ? ORDER BY x.position`).bind(id),
    env.DB.prepare("SELECT id, version, published_at, length(deck_json) AS bytes FROM training_snapshots WHERE plan_id = ? ORDER BY version DESC").bind(id),
  ]);
  const row = (plan.results as PlanRow[])[0];
  if (!row) throw new HttpError(404, "Plan not found.");
  return {
    ...planView(row),
    slides: (slides.results as Array<{ position: number; slide_id: string; title: string; doc_json: string; lesson_id: string; lesson_title: string }>).map((slide) => ({
      slideId: slide.slide_id, position: slide.position, title: slide.title, lessonId: slide.lesson_id, lessonTitle: slide.lesson_title, doc: JSON.parse(slide.doc_json) as SlideDoc,
    })),
    snapshots: (snapshots.results as Array<{ id: string; version: number; published_at: string; bytes: number }>).map((snapshot) => ({
      id: snapshot.id, version: snapshot.version, publishedAt: snapshot.published_at, bytes: snapshot.bytes,
    })),
  };
}

/** Create a live room that presents exactly one frozen published version. `extra` statements (such as an audit row) run in the same batch. */
export async function startRoomFromSnapshot(env: Env, snapshot: { id: string; deck_json: string }, extra: (roomCode: string, deck: PublishedDeck) => D1PreparedStatement[] = () => []) {
  const deck = JSON.parse(snapshot.deck_json) as PublishedDeck;
  let roomCode = "";
  for (let attempt = 0; attempt < 8 && !roomCode; attempt += 1) {
    const candidate = makeRoomCode();
    if (!(await env.DB.prepare("SELECT code FROM rooms WHERE code = ?").bind(candidate).first())) roomCode = candidate;
  }
  if (!roomCode) throw new HttpError(503, "Could not allocate a room code. Please try again.");
  const hostToken = randomSecret();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO rooms
      (code, title, host_token_hash, created_at, template_id, template_version, slides_snapshot, current_slide, phase, scoring_mode, scoring_model, activity, slide_step, snapshot_id)
      VALUES (?, ?, ?, ?, 'training-studio', ?, '[]', 0, 'join', 'none', '', 'waiting', 0, ?)`)
      .bind(roomCode, deck.title.slice(0, 120), await sha256(hostToken), new Date().toISOString(), deck.version, snapshot.id),
    ...extra(roomCode, deck),
  ]);
  return { roomCode, hostToken, title: deck.title };
}

/** The newest published version of every plan, newest week first: what a presenter can start a room from. */
export async function latestPublishedPlans(env: Env) {
  const rows = await env.DB.prepare(`SELECT p.id AS plan_id, p.title, p.week_date, t.id AS snapshot_id, t.version
    FROM training_plans p JOIN training_snapshots t ON t.plan_id = p.id
    WHERE t.version = (SELECT MAX(version) FROM training_snapshots x WHERE x.plan_id = p.id)
    ORDER BY COALESCE(p.week_date, '0000') DESC, p.title LIMIT 100`)
    .all<{ plan_id: string; title: string; week_date: string | null; snapshot_id: string; version: number }>();
  return rows.results.map((row) => ({ planId: row.plan_id, title: row.title, weekDate: row.week_date, snapshotId: row.snapshot_id, version: row.version }));
}

/** Freeze a plan's slides, challenge, cases and feedback wording into its next immutable version. */
export async function publishPlan(env: Env, planId: string, audit: Audit) {
  const db = env.DB;
  const detail = await planDetail(env, planId);
  if (!detail.slides.length) throw new HttpError(409, "Add at least one slide before publishing.");
  const assetIds = new Set((await db.prepare("SELECT id FROM slide_assets").all<{ id: string }>()).results.map((row) => row.id));
  const slides = detail.slides.map((slide, index) => {
    // Re-validate on publish so a snapshot can only ever contain clean, current-schema slides.
    const result = validateSlideDoc(slide.doc, { assetExists: (id) => assetIds.has(id) });
    if (!result.ok) throw new HttpError(409, `Slide ${index + 1} ("${slide.title}") cannot be published: ${result.error}`);
    return { sourceSlideId: slide.slideId, title: slide.title, doc: result.doc };
  });
  const version = (detail.latestVersion ?? 0) + 1;
  const deck: PublishedDeck = {
    schema: 1, planId, version, title: detail.title, weekDate: detail.weekDate, durationMin: detail.durationMin,
    notes: detail.notes, challenge: detail.challenge, slides,
    ...(detail.situations ? { situations: detail.situations } : {}),
    ...(detail.feedbackQuestions ? { feedbackQuestions: detail.feedbackQuestions } : {}),
  };
  const deckJson = JSON.stringify(deck);
  if (deckJson.length > MAX_DECK_BYTES) throw new HttpError(413, "This plan is too large to publish. Split it into two sessions.");
  const snapshotId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await db.batch([
      db.prepare("INSERT INTO training_snapshots (id, plan_id, version, deck_json, published_at) VALUES (?, ?, ?, ?, ?)").bind(snapshotId, planId, version, deckJson, now),
      db.prepare("UPDATE training_plans SET status = 'published' WHERE id = ?").bind(planId),
      audit("plan.publish", { planId, snapshotId, version, slides: slides.length }),
    ]);
  } catch {
    throw new HttpError(409, "Someone else published this plan at the same moment. Reload and try again.");
  }
  return { snapshotId, version, publishedAt: now };
}

export async function handlePlans(path: string, method: string, request: Request, env: Env, audit: Audit): Promise<Response | null> {
  const db = env.DB;

  if (path === "/plans" && method === "GET") {
    const rows = await db.prepare(`${PLAN_SELECT} ORDER BY COALESCE(p.week_date, '9999') DESC, p.updated_at DESC LIMIT 200`).all<PlanRow>();
    return json({ plans: rows.results.map(planView) });
  }

  if (path === "/plans" && method === "POST") {
    const body = await readBody(request, 10_000);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    if (typeof body.copyFrom === "string") {
      // Duplicate a previous week: same slides, notes and challenge; next week's date; back to draft.
      const source = await db.prepare("SELECT * FROM training_plans WHERE id = ?").bind(body.copyFrom).first<PlanRow>();
      if (!source) throw new HttpError(404, "The plan to copy was not found.");
      await db.batch([
        db.prepare(`INSERT INTO training_plans (id, title, week_date, duration_min, notes, challenge_json, situations_json, feedback_json, status, copied_from, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`)
          .bind(id, `${source.title} (copy)`.slice(0, 120), source.week_date ? addDays(source.week_date, 7) : null, source.duration_min, source.notes, source.challenge_json, source.situations_json ?? null, source.feedback_json ?? null, source.id, now, now),
        db.prepare("INSERT INTO training_plan_slides (plan_id, slide_id, position) SELECT ?, slide_id, position FROM training_plan_slides WHERE plan_id = ?").bind(id, source.id),
        audit("plan.duplicate", { planId: id, from: source.id }),
      ]);
    } else {
      const title = cleanLine(body.title, 120, "Plan title", true);
      await db.batch([
        db.prepare(`INSERT INTO training_plans (id, title, week_date, duration_min, notes, challenge_json, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`)
          .bind(id, title, cleanDate(body.weekDate), cleanDuration(body.durationMin), cleanBlock(body.notes, 2000, "Notes"), JSON.stringify(DEFAULT_CHALLENGE), now, now),
        audit("plan.create", { planId: id, title }),
      ]);
    }
    return json({ plan: await planDetail(env, id) }, 201);
  }

  const planMatch = path.match(/^\/plans\/([A-Za-z0-9-]{1,64})(\/publish)?$/);
  if (planMatch) {
    const planId = planMatch[1];
    const plan = await db.prepare("SELECT * FROM training_plans WHERE id = ?").bind(planId).first<PlanRow>();
    if (!plan) throw new HttpError(404, "Plan not found.");

    if (!planMatch[2] && method === "GET") return json({ plan: await planDetail(env, planId) });

    if (!planMatch[2] && method === "PATCH") {
      const body = await readBody(request, 50_000);
      const title = body.title === undefined ? plan.title : cleanLine(body.title, 120, "Plan title", true);
      const weekDate = body.weekDate === undefined ? plan.week_date : cleanDate(body.weekDate);
      const duration = body.durationMin === undefined ? plan.duration_min : cleanDuration(body.durationMin);
      const notes = body.notes === undefined ? plan.notes : cleanBlock(body.notes, 2000, "Notes");
      let challengeJson = plan.challenge_json;
      if (body.challenge !== undefined) {
        const result = validateChallenge(body.challenge);
        if (!result.ok) throw new HttpError(400, result.error);
        challengeJson = JSON.stringify(result.challenge);
      }
      let situationsJson = plan.situations_json ?? null;
      if (body.situations !== undefined) {
        const result = validateSituations(body.situations);
        if (!result.ok) throw new HttpError(400, result.error);
        situationsJson = result.situations === null ? null : JSON.stringify(result.situations);
      }
      let feedbackJson = plan.feedback_json ?? null;
      if (body.feedbackQuestions !== undefined) {
        const result = validateFeedbackQuestions(body.feedbackQuestions);
        if (!result.ok) throw new HttpError(400, result.error);
        feedbackJson = result.questions === null ? null : JSON.stringify(result.questions);
      }
      const statements: D1PreparedStatement[] = [];
      if (body.slideIds !== undefined) {
        if (!Array.isArray(body.slideIds) || body.slideIds.length > MAX_PLAN_SLIDES) throw new HttpError(400, `A plan can hold at most ${MAX_PLAN_SLIDES} slides.`);
        const ids = body.slideIds.map(String);
        const unique = [...new Set(ids)];
        if (unique.length) {
          const found = await db.prepare(`SELECT id FROM slides WHERE id IN (${unique.map(() => "?").join(",")})`).bind(...unique).all<{ id: string }>();
          if (found.results.length !== unique.length) throw new HttpError(400, "One of the chosen slides no longer exists. Reload the plan.");
        }
        statements.push(db.prepare("DELETE FROM training_plan_slides WHERE plan_id = ?").bind(planId));
        ids.forEach((slideId, position) => statements.push(db.prepare("INSERT INTO training_plan_slides (plan_id, slide_id, position) VALUES (?, ?, ?)").bind(planId, slideId, position)));
      }
      statements.push(
        db.prepare("UPDATE training_plans SET title = ?, week_date = ?, duration_min = ?, notes = ?, challenge_json = ?, situations_json = ?, feedback_json = ?, updated_at = ? WHERE id = ?")
          .bind(title, weekDate, duration, notes, challengeJson, situationsJson, feedbackJson, new Date().toISOString(), planId),
        audit("plan.update", { planId, slides: body.slideIds !== undefined }),
      );
      await db.batch(statements);
      return json({ plan: await planDetail(env, planId) });
    }

    if (!planMatch[2] && method === "DELETE") {
      const published = await db.prepare("SELECT COUNT(*) AS count FROM training_snapshots WHERE plan_id = ?").bind(planId).first<{ count: number }>();
      if ((published?.count ?? 0) > 0) throw new HttpError(409, "Published plans are part of training history and cannot be deleted.");
      await db.batch([db.prepare("DELETE FROM training_plans WHERE id = ?").bind(planId), audit("plan.delete", { planId, title: plan.title })]);
      return json({ ok: true });
    }

    if (planMatch[2] === "/publish" && method === "POST") {
      const published = await publishPlan(env, planId, audit);
      return json({ snapshot: { id: published.snapshotId, version: published.version, publishedAt: published.publishedAt }, plan: await planDetail(env, planId) }, 201);
    }
  }

  const snapshotMatch = path.match(/^\/snapshots\/([A-Za-z0-9-]{1,64})(\/session)?$/);
  if (snapshotMatch) {
    const row = await db.prepare("SELECT id, deck_json, published_at FROM training_snapshots WHERE id = ?").bind(snapshotMatch[1]).first<{ id: string; deck_json: string; published_at: string }>();
    if (!row) throw new HttpError(404, "Published version not found.");
    if (!snapshotMatch[2] && method === "GET") return json({ snapshot: { id: row.id, publishedAt: row.published_at, deck: JSON.parse(row.deck_json) as PublishedDeck } });
    if (snapshotMatch[2] === "/session" && method === "POST") {
      // Start a live room that presents exactly this frozen version.
      const started = await startRoomFromSnapshot(env, row, (roomCode, deck) => [audit("session.start", { roomCode, snapshotId: row.id, planId: deck.planId, version: deck.version })]);
      return json(started, 201);
    }
  }

  const pushMatch = path.match(/^\/sessions\/(\d{6})\/push$/);
  if (pushMatch && method === "POST") {
    // Move a running room onto a newer published version of the same plan. Snapshots stay immutable;
    // only the room's pointer changes, and the room is told to re-read its deck.
    const code = pushMatch[1];
    const body = await readBody(request, 1_000);
    const targetId = typeof body.snapshotId === "string" ? body.snapshotId : "";
    const room = await db.prepare("SELECT code, current_slide, slide_step, snapshot_id, ended_at FROM rooms WHERE code = ?").bind(code)
      .first<{ code: string; current_slide: number; slide_step: number; snapshot_id: string | null; ended_at: string | null }>();
    if (!room) throw new HttpError(404, "Training session not found.");
    if (room.ended_at) throw new HttpError(409, "This session has ended, so it can't be updated.");
    if (!room.snapshot_id) throw new HttpError(409, "This room uses the built-in deck, which can't be updated from the studio.");
    const [current, target] = await Promise.all([
      db.prepare("SELECT plan_id, version, deck_json FROM training_snapshots WHERE id = ?").bind(room.snapshot_id).first<{ plan_id: string; version: number; deck_json: string }>(),
      db.prepare("SELECT id, plan_id, version, deck_json FROM training_snapshots WHERE id = ?").bind(targetId).first<{ id: string; plan_id: string; version: number; deck_json: string }>(),
    ]);
    if (!current || !target) throw new HttpError(404, "Published version not found.");
    if (target.plan_id !== current.plan_id) throw new HttpError(409, "That version belongs to a different plan.");
    if (target.version <= current.version) throw new HttpError(409, "The room is already on this version or a newer one.");
    // Keep the presenter on the same slide even if slides were added or removed before it.
    const oldSlides = (JSON.parse(current.deck_json) as PublishedDeck).slides;
    const newSlides = (JSON.parse(target.deck_json) as PublishedDeck).slides;
    const sourceId = oldSlides[room.current_slide]?.sourceSlideId;
    const found = sourceId ? newSlides.findIndex((slide) => slide.sourceSlideId === sourceId) : -1;
    const slide = found >= 0 ? found : Math.min(Math.max(0, room.current_slide), newSlides.length - 1);
    const step = found >= 0 ? Math.min(room.slide_step, stepCount(newSlides[slide].doc)) : 0;
    const moved = await db.prepare("UPDATE rooms SET snapshot_id = ?, current_slide = ?, slide_step = ? WHERE code = ? AND snapshot_id = ? AND ended_at IS NULL")
      .bind(target.id, slide, step, code, room.snapshot_id).run();
    if (!moved.meta.changes) throw new HttpError(409, "The room changed while updating. Reload and try again.");
    await audit("session.push", { roomCode: code, from: current.version, to: target.version, snapshotId: target.id }).run();
    await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch("https://room/refresh", { method: "POST" });
    return json({ ok: true, version: target.version });
  }

  if (path === "/sessions" && method === "GET") {
    const rows = await db.prepare(`SELECT r.code, r.title, r.created_at, r.activity, r.ended_at, r.snapshot_id, t.version, t.plan_id,
        (SELECT COUNT(*) FROM participants p WHERE p.room_code = r.code) AS participants,
        (SELECT COUNT(*) FROM weekly_feedback f WHERE f.session_id = r.code) AS feedback
      FROM rooms r LEFT JOIN training_snapshots t ON t.id = r.snapshot_id ORDER BY r.created_at DESC LIMIT 40`)
      .all<{ code: string; title: string; created_at: string; activity: string; ended_at: string | null; snapshot_id: string | null; version: number | null; plan_id: string | null; participants: number; feedback: number }>();
    return json({
      sessions: rows.results.map((row) => ({
        code: row.code, title: row.title, createdAt: row.created_at, activity: row.activity, endedAt: row.ended_at, snapshotId: row.snapshot_id,
        version: row.version, planId: row.plan_id, participants: row.participants, feedback: row.feedback,
      })),
    });
  }

  return null;
}
