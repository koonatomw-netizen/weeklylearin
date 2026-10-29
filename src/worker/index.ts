import { SESSION_TITLE } from "../shared/challenge";
import { handleAdmin, serveAsset } from "./admin";
import { latestPublishedPlans, startRoomFromSnapshot } from "./plans";
import { RoomHub, makeRoomCode, randomSecret, sha256, type Env } from "./room-hub";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/** Best-effort per-isolate limiter for passphrase attempts. */
const createAttempts = new Map<string, { count: number; reset: number }>();
function allowCreate(ip: string): boolean {
  const now = Date.now();
  const bucket = createAttempts.get(ip);
  if (!bucket || bucket.reset < now) {
    createAttempts.set(ip, { count: 1, reset: now + 60_000 });
    if (createAttempts.size > 1000) for (const [key, value] of createAttempts) if (value.reset < now) createAttempts.delete(key);
    return true;
  }
  bucket.count += 1;
  return bucket.count <= 10;
}

/** Presenter passphrase check shared by the room endpoints. Returns an error response, or null when the caller may continue. */
function checkPresenter(request: Request, env: Env): Response | null {
  if (!env.HOST_PASSPHRASE) {
    return json({ error: "Presenter rooms are locked. Set the HOST_PASSPHRASE secret before the session." }, 503);
  }
  if (!allowCreate(request.headers.get("CF-Connecting-IP") ?? "local")) return json({ error: "Too many attempts. Wait a minute and try again." }, 429);
  if (!secureEqual(request.headers.get("X-Host-Passphrase") ?? "", env.HOST_PASSPHRASE)) return json({ error: "That presenter passphrase is not correct." }, 401);
  return null;
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  if (!env.HOST_PASSPHRASE) {
    return json({ error: "Presenter rooms are locked. Set the HOST_PASSPHRASE secret before the session." }, 503);
  }
  if (!allowCreate(request.headers.get("CF-Connecting-IP") ?? "local")) return json({ error: "Too many attempts. Wait a minute and try again." }, 429);
  const passphrase = request.headers.get("X-Host-Passphrase") ?? "";
  if (!secureEqual(passphrase, env.HOST_PASSPHRASE)) return json({ error: "That presenter passphrase is not correct." }, 401);
  const body = await request.json().catch(() => ({})) as { snapshotId?: unknown; builtIn?: unknown };
  // New rooms present a published plan, so every slide, case and question stays editable in the studio.
  if (typeof body.snapshotId === "string") {
    const snapshot = await env.DB.prepare("SELECT id, deck_json FROM training_snapshots WHERE id = ?").bind(body.snapshotId).first<{ id: string; deck_json: string }>();
    if (!snapshot) return json({ error: "That published plan was not found." }, 404);
    return json(await startRoomFromSnapshot(env, snapshot), 201);
  }
  // The built-in deck is only kept for tests and emergencies; the home page never offers it.
  if (body.builtIn !== true) return json({ error: "Choose a published plan to start from. Publish one in the Training Studio first." }, 400);
  let roomCode = "";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = makeRoomCode();
    const existing = await env.DB.prepare("SELECT code FROM rooms WHERE code = ?").bind(candidate).first<{ code: string }>();
    if (!existing) { roomCode = candidate; break; }
  }
  if (!roomCode) return json({ error: "Could not allocate a room code. Please try again." }, 503);
  const hostToken = randomSecret();
  await env.DB.prepare(`INSERT INTO rooms
    (code, title, host_token_hash, created_at, template_id, template_version, slides_snapshot, current_slide, phase, scoring_mode, scoring_model, activity, slide_step)
    VALUES (?, ?, ?, ?, 'prompt-battle-week01', 1, '[]', 0, 'join', 'none', '', 'waiting', 0)`)
    .bind(roomCode, SESSION_TITLE, await sha256(hostToken), new Date().toISOString()).run();
  return json({ roomCode, hostToken, title: SESSION_TITLE }, 201);
}

const ROOM_ACTIONS: Record<string, string> = {
  join: "POST", state: "GET", ticket: "POST", ws: "GET", submit: "POST",
  checklist: "POST", final: "POST", vote: "POST", control: "POST", export: "GET",
  feedback: "POST", responses: "GET", feedbackcsv: "GET", deck: "GET",
};

async function fetchHandler(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/config" && request.method === "GET") return json({ hostReady: Boolean(env.HOST_PASSPHRASE) });
  if (url.pathname === "/api/rooms" && request.method === "POST") return createRoom(request, env);
  if (url.pathname === "/api/presenter/plans" && request.method === "POST") {
    const refused = checkPresenter(request, env);
    return refused ?? json({ plans: await latestPublishedPlans(env) });
  }
  if (url.pathname.startsWith("/api/admin/")) return handleAdmin(request, env, url);
  const assetMatch = url.pathname.match(/^\/api\/assets\/([^/]+)$/);
  if (assetMatch && (request.method === "GET" || request.method === "HEAD")) return serveAsset(env, assetMatch[1]);
  const roomMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/([a-z]+)$/i);
  if (roomMatch) {
    const roomCode = roomMatch[1].toUpperCase();
    const action = roomMatch[2].toLowerCase();
    const method = ROOM_ACTIONS[action];
    if (!method) return json({ error: "Not found" }, 404);
    if (request.method !== method) return json({ error: "Method not allowed" }, 405);
    if (action === "ws" && request.headers.get("Upgrade") !== "websocket") return json({ error: "WebSocket upgrade required" }, 426);
    const stub = env.ROOMS.get(env.ROOMS.idFromName(roomCode));
    const target = new URL(request.url);
    target.hostname = "room";
    target.pathname = `/${action}`;
    return stub.fetch(new Request(target, request));
  }
  if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
  return env.ASSETS.fetch(request);
}

export { RoomHub };
export default { fetch: fetchHandler };
