import { validateSituations } from "../shared/deck";
import { SITUATIONS, type Situation } from "../shared/situations";
import { WEEK02_SITUATIONS } from "../shared/week02";
import { HttpError, cleanLine, json, readBody } from "./http";
import type { Env } from "./room-hub";

/**
 * Case sets (admin only): reusable pools of case-opening situations, edited in the studio.
 * A plan copies a set into its own pool, so editing a set never changes a plan or a published version.
 */

type Audit = (action: string, detail?: Record<string, unknown>) => D1PreparedStatement;

const MAX_SETS = 50;
const STARTER_SETS: Array<{ id: string; title: string; situations: Situation[] }> = [
  { id: "week01-cases", title: "Week 01 · Guest and resident cases", situations: SITUATIONS.map((item) => ({ ...item, challenge: { ...item.challenge } })) },
  { id: "week02-cases", title: "Week 02 · Everyday chores", situations: WEEK02_SITUATIONS },
];

interface SetRow { id: string; title: string; situations_json: string; created_at: string; updated_at: string }

function view(row: SetRow) {
  let situations: Situation[] = [];
  try { const result = validateSituations(JSON.parse(row.situations_json)); if (result.ok && result.situations) situations = result.situations; } catch { /* corrupt row: show it empty */ }
  return { id: row.id, title: row.title, situations, createdAt: row.created_at, updatedAt: row.updated_at };
}

const list = async (env: Env) => (await env.DB.prepare("SELECT * FROM case_sets ORDER BY title LIMIT ?").bind(MAX_SETS).all<SetRow>()).results.map(view);

function cleanSituations(input: unknown): Situation[] {
  const result = validateSituations(input);
  if (!result.ok) throw new HttpError(400, result.error);
  return result.situations ?? [];
}

export async function handleCaseSets(path: string, method: string, request: Request, env: Env, audit: Audit): Promise<Response | null> {
  const db = env.DB;

  if (path === "/case-sets" && method === "GET") return json({ sets: await list(env) });

  if (path === "/seed/cases" && method === "POST") {
    const now = new Date().toISOString();
    await db.batch([
      ...STARTER_SETS.map((set) => db.prepare("INSERT OR IGNORE INTO case_sets (id, title, situations_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .bind(set.id, set.title, JSON.stringify(set.situations), now, now)),
      audit("case_sets.seed"),
    ]);
    return json({ sets: await list(env) });
  }

  if (path === "/case-sets" && method === "POST") {
    const count = await db.prepare("SELECT COUNT(*) AS count FROM case_sets").first<{ count: number }>();
    if ((count?.count ?? 0) >= MAX_SETS) throw new HttpError(409, `You can keep at most ${MAX_SETS} case sets.`);
    const body = await readBody(request, 200_000);
    const title = cleanLine(body.title, 120, "Set title", true);
    const situations = cleanSituations(body.situations ?? []);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("INSERT INTO case_sets (id, title, situations_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(id, title, JSON.stringify(situations), now, now),
      audit("case_sets.create", { id, title }),
    ]);
    return json({ set: view((await db.prepare("SELECT * FROM case_sets WHERE id = ?").bind(id).first<SetRow>())!) }, 201);
  }

  const match = path.match(/^\/case-sets\/([A-Za-z0-9-]{1,64})$/);
  if (match) {
    const row = await db.prepare("SELECT * FROM case_sets WHERE id = ?").bind(match[1]).first<SetRow>();
    if (!row) throw new HttpError(404, "Case set not found.");
    if (method === "PATCH") {
      const body = await readBody(request, 200_000);
      const title = body.title === undefined ? row.title : cleanLine(body.title, 120, "Set title", true);
      const situations = body.situations === undefined ? row.situations_json : JSON.stringify(cleanSituations(body.situations));
      await db.batch([
        db.prepare("UPDATE case_sets SET title = ?, situations_json = ?, updated_at = ? WHERE id = ?").bind(title, situations, new Date().toISOString(), row.id),
        audit("case_sets.update", { id: row.id, title }),
      ]);
      return json({ set: view((await db.prepare("SELECT * FROM case_sets WHERE id = ?").bind(row.id).first<SetRow>())!) });
    }
    if (method === "DELETE") {
      await db.batch([db.prepare("DELETE FROM case_sets WHERE id = ?").bind(row.id), audit("case_sets.delete", { id: row.id, title: row.title })]);
      return json({ ok: true });
    }
  }

  return null;
}
