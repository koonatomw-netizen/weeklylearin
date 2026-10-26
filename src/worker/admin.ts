import { validateSlideDoc, withFreshIds, type SlideDoc } from "../shared/slideDoc";
import { TEMPLATE_IDS, createFromTemplate, week01Lesson, type TemplateId } from "../shared/templates";
import { randomSecret, sha256, type Env } from "./room-hub";

/** Admin workspace API. Every route except login requires a valid admin session. */

const SESSION_HOURS = 12;
const STARTER_LESSON_ID = "week01-starter";

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function cleanLine(value: unknown, max: number, label: string, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${label} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new HttpError(400, `${label} must be text.`);
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (required && !text) throw new HttpError(400, `${label} is required.`);
  if (text.length > max) throw new HttpError(400, `${label} must be at most ${max} characters.`);
  return text;
}

async function readBody(request: Request, maxBytes = 300_000): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > maxBytes) throw new HttpError(413, "Request is too large.");
  if (!raw) return {};
  try {
    const body = JSON.parse(raw);
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  } catch { throw new HttpError(400, "The request body could not be read."); }
}

const loginAttempts = new Map<string, { count: number; reset: number }>();
function allowLogin(ip: string): boolean {
  const now = Date.now();
  const bucket = loginAttempts.get(ip);
  if (!bucket || bucket.reset < now) {
    loginAttempts.set(ip, { count: 1, reset: now + 60_000 });
    if (loginAttempts.size > 1000) for (const [key, value] of loginAttempts) if (value.reset < now) loginAttempts.delete(key);
    return true;
  }
  bucket.count += 1;
  return bucket.count <= 8;
}

interface LessonRow { id: string; title: string; category: string; description: string; created_at: string; updated_at: string; archived_at: string | null; slide_count?: number }
interface SlideRow { id: string; lesson_id: string; position: number; title: string; doc_json: string; version: number; updated_at: string }

const lessonView = (row: LessonRow) => ({
  id: row.id, title: row.title, category: row.category, description: row.description,
  createdAt: row.created_at, updatedAt: row.updated_at, archived: Boolean(row.archived_at), slideCount: row.slide_count ?? 0,
});
const slideView = (row: SlideRow) => ({
  id: row.id, lessonId: row.lesson_id, position: row.position, title: row.title,
  doc: JSON.parse(row.doc_json) as SlideDoc, version: row.version, updatedAt: row.updated_at,
});

const newElementId = () => `el-${crypto.randomUUID().slice(0, 12)}`;

export async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  try {
    return await route(request, env, url);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("admin request failed", error);
    return json({ error: "The admin request could not be completed." }, 500);
  }
}

async function route(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/admin/, "");
  const method = request.method;
  const db = env.DB;

  if (path === "/login" && method === "POST") return login(request, env);

  const sessionHash = await requireSession(request, env);
  const audit = (action: string, detail: Record<string, unknown> = {}) =>
    db.prepare("INSERT INTO admin_actions (id, action, detail_json, created_at) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), action, JSON.stringify(detail), new Date().toISOString());

  if (path === "/logout" && method === "POST") {
    await db.prepare("UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?").bind(new Date().toISOString(), sessionHash).run();
    return json({ ok: true });
  }
  if (path === "/me" && method === "GET") return json({ ok: true });

  if (path === "/dashboard" && method === "GET") {
    const [lessons, slides, rooms, feedback, recent] = await db.batch([
      db.prepare("SELECT COUNT(*) AS count FROM lessons WHERE archived_at IS NULL"),
      db.prepare("SELECT COUNT(*) AS count FROM slides s JOIN lessons l ON l.id = s.lesson_id WHERE l.archived_at IS NULL"),
      db.prepare("SELECT COUNT(*) AS count FROM rooms"),
      db.prepare("SELECT COUNT(*) AS count FROM weekly_feedback"),
      db.prepare("SELECT action, created_at FROM admin_actions ORDER BY created_at DESC LIMIT 8"),
    ]);
    const count = (result: D1Result) => (result.results[0] as { count: number } | undefined)?.count ?? 0;
    return json({
      lessons: count(lessons), slides: count(slides), sessions: count(rooms), feedback: count(feedback),
      recent: (recent.results as Array<{ action: string; created_at: string }>).map((row) => ({ action: row.action, createdAt: row.created_at })),
    });
  }

  // ------------------------------------------------------------------ lessons
  if (path === "/lessons" && method === "GET") {
    const includeArchived = url.searchParams.get("archived") === "1";
    const rows = await db.prepare(`SELECT l.*, (SELECT COUNT(*) FROM slides s WHERE s.lesson_id = l.id) AS slide_count
      FROM lessons l ${includeArchived ? "" : "WHERE l.archived_at IS NULL"} ORDER BY l.updated_at DESC`).all<LessonRow>();
    return json({ lessons: rows.results.map(lessonView) });
  }
  if (path === "/lessons" && method === "POST") {
    const body = await readBody(request);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const title = cleanLine(body.title, 120, "Lesson title", true);
    await db.batch([
      db.prepare("INSERT INTO lessons (id, title, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(id, title, cleanLine(body.category, 60, "Category"), cleanLine(body.description, 500, "Description"), now, now),
      audit("lesson.create", { lessonId: id, title }),
    ]);
    return json({ lesson: await getLesson(env, id) }, 201);
  }
  if (path === "/seed/week01" && method === "POST") {
    const existing = await db.prepare("SELECT id FROM lessons WHERE id = ?").bind(STARTER_LESSON_ID).first();
    if (existing) return json({ lesson: await getLesson(env, STARTER_LESSON_ID), created: false });
    const now = new Date().toISOString();
    const slides = week01Lesson(newElementId);
    await db.batch([
      db.prepare("INSERT INTO lessons (id, title, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(STARTER_LESSON_ID, "Week 01 · Prompt Engineering", "Prompt Engineering", "Guest Communication challenge with Prompt Battle — imported from the built-in deck.", now, now),
      ...slides.map((slide, index) => db.prepare("INSERT INTO slides (id, lesson_id, position, title, doc_json, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)")
        .bind(crypto.randomUUID(), STARTER_LESSON_ID, index, slide.title, JSON.stringify(slide.doc), now, now)),
      audit("lesson.seed_week01", { slides: slides.length }),
    ]);
    return json({ lesson: await getLesson(env, STARTER_LESSON_ID), created: true }, 201);
  }

  const lessonMatch = path.match(/^\/lessons\/([A-Za-z0-9-]{1,64})(\/slides|\/reorder)?$/);
  if (lessonMatch) {
    const lessonId = lessonMatch[1];
    const sub = lessonMatch[2];
    const lesson = await db.prepare("SELECT * FROM lessons WHERE id = ?").bind(lessonId).first<LessonRow>();
    if (!lesson) throw new HttpError(404, "Lesson not found.");

    if (!sub && method === "GET") return json({ lesson: await getLesson(env, lessonId) });
    if (!sub && method === "PATCH") {
      const body = await readBody(request);
      const title = body.title === undefined ? lesson.title : cleanLine(body.title, 120, "Lesson title", true);
      const category = body.category === undefined ? lesson.category : cleanLine(body.category, 60, "Category");
      const description = body.description === undefined ? lesson.description : cleanLine(body.description, 500, "Description");
      const archivedAt = body.archived === undefined ? lesson.archived_at : body.archived === true ? (lesson.archived_at ?? new Date().toISOString()) : null;
      await db.batch([
        db.prepare("UPDATE lessons SET title = ?, category = ?, description = ?, archived_at = ?, updated_at = ? WHERE id = ?")
          .bind(title, category, description, archivedAt, new Date().toISOString(), lessonId),
        audit(body.archived === true ? "lesson.archive" : body.archived === false ? "lesson.restore" : "lesson.update", { lessonId }),
      ]);
      return json({ lesson: await getLesson(env, lessonId) });
    }
    if (sub === "/slides" && method === "POST") {
      if (lesson.archived_at) throw new HttpError(409, "Restore this lesson before adding slides.");
      const body = await readBody(request);
      const count = await db.prepare("SELECT COUNT(*) AS count FROM slides WHERE lesson_id = ?").bind(lessonId).first<{ count: number }>();
      if ((count?.count ?? 0) >= 80) throw new HttpError(409, "A lesson can have at most 80 slides.");
      let doc: SlideDoc;
      let title = cleanLine(body.title, 120, "Slide title");
      if (typeof body.duplicateOf === "string") {
        const source = await db.prepare("SELECT * FROM slides WHERE id = ?").bind(body.duplicateOf).first<SlideRow>();
        if (!source) throw new HttpError(404, "The slide to duplicate was not found.");
        doc = withFreshIds(JSON.parse(source.doc_json) as SlideDoc, newElementId);
        title ||= `${source.title} (copy)`.slice(0, 120);
      } else {
        const template = (TEMPLATE_IDS as readonly string[]).includes(String(body.template)) ? body.template as TemplateId : "title-content";
        doc = createFromTemplate(template, newElementId);
        title ||= "Untitled slide";
      }
      // Insert after a given slide (or at the end) by shifting later positions.
      const rows = await db.prepare("SELECT id FROM slides WHERE lesson_id = ? ORDER BY position, created_at").bind(lessonId).all<{ id: string }>();
      const ordered = rows.results.map((row) => row.id);
      const afterIndex = typeof body.afterSlideId === "string" ? ordered.indexOf(body.afterSlideId) : -1;
      const insertAt = afterIndex >= 0 ? afterIndex + 1 : ordered.length;
      const id = crypto.randomUUID();
      ordered.splice(insertAt, 0, id);
      const now = new Date().toISOString();
      await db.batch([
        db.prepare("INSERT INTO slides (id, lesson_id, position, title, doc_json, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)")
          .bind(id, lessonId, insertAt, title, JSON.stringify(doc), now, now),
        ...ordered.map((slideId, index) => db.prepare("UPDATE slides SET position = ? WHERE id = ?").bind(index, slideId)),
        db.prepare("UPDATE lessons SET updated_at = ? WHERE id = ?").bind(now, lessonId),
        audit(body.duplicateOf ? "slide.duplicate" : "slide.create", { lessonId, slideId: id, template: body.template ?? null }),
      ]);
      const row = await db.prepare("SELECT * FROM slides WHERE id = ?").bind(id).first<SlideRow>();
      return json({ slide: slideView(row!) }, 201);
    }
    if (sub === "/reorder" && method === "POST") {
      const body = await readBody(request);
      const rows = await db.prepare("SELECT id FROM slides WHERE lesson_id = ?").bind(lessonId).all<{ id: string }>();
      const current = new Set(rows.results.map((row) => row.id));
      const order = Array.isArray(body.slideIds) ? body.slideIds.map(String) : [];
      if (order.length !== current.size || new Set(order).size !== order.length || order.some((id) => !current.has(id))) {
        throw new HttpError(400, "The new order must list every slide in this lesson exactly once.");
      }
      await db.batch([
        ...order.map((slideId, index) => db.prepare("UPDATE slides SET position = ? WHERE id = ? AND lesson_id = ?").bind(index, slideId, lessonId)),
        db.prepare("UPDATE lessons SET updated_at = ? WHERE id = ?").bind(new Date().toISOString(), lessonId),
        audit("slide.reorder", { lessonId }),
      ]);
      return json({ lesson: await getLesson(env, lessonId) });
    }
  }

  // ------------------------------------------------------------------- slides
  const slideMatch = path.match(/^\/slides\/([A-Za-z0-9-]{1,64})$/);
  if (slideMatch) {
    const slide = await db.prepare("SELECT * FROM slides WHERE id = ?").bind(slideMatch[1]).first<SlideRow>();
    if (!slide) throw new HttpError(404, "Slide not found.");
    if (method === "GET") return json({ slide: slideView(slide) });
    if (method === "PATCH") {
      const body = await readBody(request);
      if (!Number.isInteger(body.version)) throw new HttpError(400, "The slide version is required.");
      const title = body.title === undefined ? slide.title : cleanLine(body.title, 120, "Slide title");
      let docJson = slide.doc_json;
      if (body.doc !== undefined) {
        const assetIds = new Set((await db.prepare("SELECT id FROM slide_assets").all<{ id: string }>()).results.map((row) => row.id));
        const result = validateSlideDoc(body.doc, { assetExists: (id) => assetIds.has(id) });
        if (!result.ok) throw new HttpError(400, result.error);
        docJson = JSON.stringify(result.doc);
      }
      const now = new Date().toISOString();
      // Optimistic locking: the write only lands if nobody saved in between.
      const update = await db.prepare("UPDATE slides SET title = ?, doc_json = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
        .bind(title, docJson, now, slide.id, body.version).run();
      if (!update.meta.changes) {
        const latest = await db.prepare("SELECT * FROM slides WHERE id = ?").bind(slide.id).first<SlideRow>();
        return json({ error: "This slide was changed elsewhere. Reload to get the latest version.", slide: latest ? slideView(latest) : null }, 409);
      }
      await db.batch([
        db.prepare("UPDATE lessons SET updated_at = ? WHERE id = ?").bind(now, slide.lesson_id),
        audit("slide.update", { slideId: slide.id, doc: body.doc !== undefined }),
      ]);
      const row = await db.prepare("SELECT * FROM slides WHERE id = ?").bind(slide.id).first<SlideRow>();
      return json({ slide: slideView(row!) });
    }
    if (method === "DELETE") {
      const used = await db.prepare("SELECT COUNT(*) AS count FROM training_plan_slides WHERE slide_id = ?").bind(slide.id).first<{ count: number }>();
      if ((used?.count ?? 0) > 0) throw new HttpError(409, "This slide is used in a training plan. Remove it from the plan first.");
      const now = new Date().toISOString();
      await db.batch([
        db.prepare("DELETE FROM slides WHERE id = ?").bind(slide.id),
        db.prepare(`UPDATE slides SET position = position - 1 WHERE lesson_id = ? AND position > ?`).bind(slide.lesson_id, slide.position),
        db.prepare("UPDATE lessons SET updated_at = ? WHERE id = ?").bind(now, slide.lesson_id),
        audit("slide.delete", { slideId: slide.id, lessonId: slide.lesson_id, title: slide.title }),
      ]);
      return json({ ok: true });
    }
  }

  return json({ error: "Not found" }, 404);
}

async function getLesson(env: Env, id: string) {
  const [lesson, slides] = await env.DB.batch([
    env.DB.prepare("SELECT l.*, (SELECT COUNT(*) FROM slides s WHERE s.lesson_id = l.id) AS slide_count FROM lessons l WHERE l.id = ?").bind(id),
    env.DB.prepare("SELECT * FROM slides WHERE lesson_id = ? ORDER BY position, created_at").bind(id),
  ]);
  const row = (lesson.results as LessonRow[])[0];
  if (!row) throw new HttpError(404, "Lesson not found.");
  return { ...lessonView(row), slides: (slides.results as SlideRow[]).map(slideView) };
}

async function login(request: Request, env: Env): Promise<Response> {
  if (!env.ADMIN_PASSPHRASE) throw new HttpError(503, "The admin workspace is locked. Set the ADMIN_PASSPHRASE secret first.");
  if (!allowLogin(request.headers.get("CF-Connecting-IP") ?? "local")) throw new HttpError(429, "Too many attempts. Wait a minute and try again.");
  const body = await readBody(request, 2_000);
  const passphrase = typeof body.passphrase === "string" ? body.passphrase : "";
  if (!safeEqual(passphrase, env.ADMIN_PASSPHRASE)) throw new HttpError(401, "That admin passphrase is not correct.");
  const token = randomSecret();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3_600_000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at < ?").bind(now.toISOString()),
    env.DB.prepare("INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), now.toISOString(), expiresAt),
    env.DB.prepare("INSERT INTO admin_actions (id, action, detail_json, created_at) VALUES (?, 'admin.login', '{}', ?)").bind(crypto.randomUUID(), now.toISOString()),
  ]);
  return json({ token, expiresAt }, 201);
}

async function requireSession(request: Request, env: Env): Promise<string> {
  const header = request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token.length > 128) throw new HttpError(401, "Admin sign-in required.");
  const hash = await sha256(token);
  const session = await env.DB.prepare("SELECT expires_at, revoked_at FROM admin_sessions WHERE token_hash = ?").bind(hash).first<{ expires_at: string; revoked_at: string | null }>();
  if (!session || session.revoked_at || session.expires_at < new Date().toISOString()) throw new HttpError(401, "Your admin session has ended. Sign in again.");
  return hash;
}
