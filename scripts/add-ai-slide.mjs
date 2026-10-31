// Adds the "Check Your Prompt (Privately)" slide to Week 01 and Week 02 lessons that were imported before it existed.
// Safe to run twice: lessons that already have it are skipped. Draft plans that use the lesson get the slide too;
// published plans are not touched, so republish them (or add the slide in the Planner) afterwards.
//
// Local:   ADMIN_PASSPHRASE=... node scripts/add-ai-slide.mjs            (or leave it unset to read .dev.vars)
// Remote:  ADMIN_PASSPHRASE=... node scripts/add-ai-slide.mjs --base https://your-worker.example.com --yes
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const base = (args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:8787").replace(/\/$/, "");
const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base);

if (!local && !flag("--yes")) {
  console.error(`This changes the lessons on ${base}. Run again with --yes to confirm.`);
  process.exit(1);
}

let passphrase = process.env.ADMIN_PASSPHRASE;
if (!passphrase && local) {
  try { passphrase = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").match(/^ADMIN_PASSPHRASE=(.+)$/m)?.[1]?.trim(); } catch { /* no local file */ }
}
if (!passphrase) {
  console.error("Set ADMIN_PASSPHRASE (the admin passphrase for that server).");
  process.exit(1);
}

async function call(path, data) {
  const response = await fetch(`${base}/api/admin${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(call.token ? { Authorization: `Bearer ${call.token}` } : {}) },
    body: JSON.stringify(data ?? {}),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path}: ${response.status} ${body.error ?? ""}`.trim());
  return body;
}

try {
  call.token = (await call("/login", { passphrase })).token;
  const { results } = await call("/seed/ai-feedback-slide");
  for (const row of results) {
    const extra = row.status === "added" ? ` (draft plans updated: ${row.draftPlansUpdated}, published plans to republish: ${row.publishedPlansToRepublish})` : "";
    console.log(`${row.lessonId}: ${row.status}${extra}`);
  }
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}
