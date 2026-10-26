// Admin workspace API smoke test against a LOCAL Worker (wrangler dev).
// Usage: SMOKE_ADMIN_PASSPHRASE=... node scripts/smoke-admin.mjs
import assert from 'node:assert/strict';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8787';
const passphrase = process.env.SMOKE_ADMIN_PASSPHRASE;
if (!passphrase) throw new Error('Set SMOKE_ADMIN_PASSPHRASE to the local admin passphrase.');
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('This smoke test creates fixtures and must target a local test server.');

let checks = 0;
const log = (message) => console.log(`  ✓ ${message}`);
const check = (value, message) => { assert.ok(value, message); checks++; };
async function request(path, { method = 'GET', token, data, raw, expected = 200 } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(raw !== undefined ? { body: raw } : data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert.ok(allowed.includes(response.status), `${method} ${path}: expected ${allowed} got ${response.status} ${JSON.stringify(body).slice(0, 200)}`);
  checks++;
  return body;
}

// ------------------------------------------------------------------ auth
await request('/api/admin/lessons', { expected: 401 });
await request('/api/admin/lessons', { token: 'not-a-real-token', expected: 401 });
await request('/api/admin/login', { method: 'POST', data: { passphrase: 'wrong' }, expected: 401 });
// The presenter passphrase must not open the admin area.
if (process.env.SMOKE_HOST_PASSPHRASE) await request('/api/admin/login', { method: 'POST', data: { passphrase: process.env.SMOKE_HOST_PASSPHRASE }, expected: 401 });
const { token, expiresAt } = await request('/api/admin/login', { method: 'POST', data: { passphrase }, expected: 201 });
check(token && new Date(expiresAt) > new Date(), 'Login returns a session with an expiry.');
await request('/api/admin/me', { token });
log('auth: anonymous, bad token, wrong and presenter passphrases refused; admin session issued');

// --------------------------------------------------------------- lessons
await request('/api/admin/lessons', { method: 'POST', token, data: { title: '   ' }, expected: 400 });
const { lesson } = await request('/api/admin/lessons', { method: 'POST', token, data: { title: 'Smoke Lesson', category: 'Test' }, expected: 201 });
check(lesson.slideCount === 0 && lesson.slides.length === 0, 'New lesson is empty.');
const renamed = await request(`/api/admin/lessons/${lesson.id}`, { method: 'PATCH', token, data: { title: 'Smoke Lesson Renamed' } });
check(renamed.lesson.title === 'Smoke Lesson Renamed', 'Lesson renamed.');
log('lessons: create, validation, rename');

// ---------------------------------------------------------------- slides
const add = (data) => request(`/api/admin/lessons/${lesson.id}/slides`, { method: 'POST', token, data, expected: 201 });
const s1 = (await add({ template: 'title' })).slide;
const s2 = (await add({ template: 'prompt-battle' })).slide;
const s3 = (await add({ template: 'comparison', afterSlideId: s1.id })).slide;
let detail = (await request(`/api/admin/lessons/${lesson.id}`, { token })).lesson;
check(detail.slides.map((s) => s.id).join() === [s1.id, s3.id, s2.id].join(), 'Insert-after places the slide in the middle.');
check(s2.doc.elements.some((e) => e.type === 'widget' && e.widget === 'battle'), 'Prompt Battle template contains the live battle widget.');
const dup = (await add({ duplicateOf: s1.id })).slide;
check(dup.title.endsWith('(copy)') && dup.doc.elements[0].id !== s1.doc.elements[0].id, 'Duplicate gets fresh element ids.');
log('slides: create from templates, insert-after, duplicate');

// ------------------------------------------------------------- editing
const edited = structuredClone(s1.doc);
edited.elements.push({ id: 'smoke-text', type: 'text', x: 100, y: 100, w: 400, h: 80, paragraphs: [{ runs: [{ text: 'สวัสดี <script>alert(1)</script>' }], size: 32, font: 'sans' }], onclick: 'alert(1)' });
const saved = (await request(`/api/admin/slides/${s1.id}`, { method: 'PATCH', token, data: { version: s1.version, title: 'Opening', doc: edited } })).slide;
check(saved.version === s1.version + 1 && saved.title === 'Opening', 'Save bumps the version.');
const savedText = saved.doc.elements.find((e) => e.id === 'smoke-text');
check(savedText && !('onclick' in savedText), 'Unknown keys are stripped server-side.');
check(savedText.paragraphs[0].runs[0].text.includes('<script>'), 'Text is stored as literal plain text (rendered as text, never HTML).');
const reloaded = (await request(`/api/admin/slides/${s1.id}`, { token })).slide;
check(JSON.stringify(reloaded.doc) === JSON.stringify(saved.doc), 'Reload returns exactly the saved document.');
const conflict = await request(`/api/admin/slides/${s1.id}`, { method: 'PATCH', token, data: { version: s1.version, title: 'stale' }, expected: 409 });
check(conflict.slide?.version === saved.version, 'Stale save is rejected with the latest version.');
await request(`/api/admin/slides/${s1.id}`, { method: 'PATCH', token, data: { version: saved.version, doc: { ...edited, elements: [{ id: 'x', type: 'html', x: 0, y: 0, w: 1, h: 1 }] } }, expected: 400 });
await request(`/api/admin/slides/${s1.id}`, { method: 'PATCH', token, data: { version: saved.version, doc: { schema: 1, elements: [{ id: 'img', type: 'image', assetId: 'missing-asset-1', fit: 'cover', alt: '', x: 0, y: 0, w: 10, h: 10 }] } }, expected: 400 });
await request(`/api/admin/slides/${s1.id}`, { method: 'PATCH', token, data: { version: saved.version, doc: { ...edited, elements: [{ ...edited.elements[0], color: 'red' }] } }, expected: 400 });
await request(`/api/admin/slides/${s1.id}`, { method: 'PATCH', token, raw: 'x'.repeat(400_000), expected: 413 });
log('editing: save, strip, round-trip, version conflict, invalid type/asset/color, oversize');

// ----------------------------------------------------- reorder & delete
await request(`/api/admin/lessons/${lesson.id}/reorder`, { method: 'POST', token, data: { slideIds: [s2.id, s1.id] }, expected: 400 });
const order = [s2.id, dup.id, s1.id, s3.id];
detail = (await request(`/api/admin/lessons/${lesson.id}/reorder`, { method: 'POST', token, data: { slideIds: order } })).lesson;
check(detail.slides.map((s) => s.id).join() === order.join(), 'Reorder persisted.');
await request(`/api/admin/slides/${dup.id}`, { method: 'DELETE', token });
detail = (await request(`/api/admin/lessons/${lesson.id}`, { token })).lesson;
check(detail.slides.length === 3 && detail.slides.map((s) => s.position).join() === '0,1,2', 'Delete closes the position gap.');
await request(`/api/admin/slides/${dup.id}`, { token, expected: 404 });
log('reorder (must list every slide once) and delete');

// ----------------------------------------------------- archive & seed
await request(`/api/admin/lessons/${lesson.id}`, { method: 'PATCH', token, data: { archived: true } });
const list = (await request('/api/admin/lessons', { token })).lessons;
check(!list.some((l) => l.id === lesson.id), 'Archived lessons are hidden by default.');
check((await request('/api/admin/lessons?archived=1', { token })).lessons.some((l) => l.id === lesson.id), 'Archived lessons are still kept.');
await request(`/api/admin/lessons/${lesson.id}/slides`, { method: 'POST', token, data: { template: 'title' }, expected: 409 });
const seed = await request('/api/admin/seed/week01', { method: 'POST', token, expected: [200, 201] });
check(seed.lesson.slides.length >= 7, 'Week 01 starter lesson exists with its slides.');
const seedAgain = await request('/api/admin/seed/week01', { method: 'POST', token });
check(seedAgain.created === false && seedAgain.lesson.id === seed.lesson.id, 'Seeding is idempotent.');
const dashboard = await request('/api/admin/dashboard', { token });
check(dashboard.lessons >= 1 && dashboard.recent.some((r) => r.action === 'slide.update'), 'Dashboard counts and audit log.');
log('archive/restore rules, Week 01 seed (idempotent), dashboard + audit');

// ------------------------------------------------------------- images
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const unique = Buffer.concat([png, Buffer.from(`smoke-${Date.now()}`)]); // bytes after IEND: still a PNG, new hash
async function upload(body, type, { auth = token, expected = 201 } = {}) {
  const response = await fetch(`${base}/api/admin/assets`, { method: 'POST', headers: { 'Content-Type': type, ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body, signal: AbortSignal.timeout(15000) });
  const result = await response.json().catch(() => ({}));
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert.ok(allowed.includes(response.status), `upload ${type}: expected ${allowed} got ${response.status} ${JSON.stringify(result)}`);
  checks++;
  return result;
}
await upload(unique, 'image/png', { auth: null, expected: 401 });
await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml', { expected: 415 });
await upload(Buffer.from('<html><script>alert(1)</script></html>'), 'image/png', { expected: 415 });
await upload(Buffer.alloc(5 * 1024 * 1024 + 10, 1), 'image/png', { expected: 413 });
const first = await upload(unique, 'application/octet-stream');
check(first.asset.mime === 'image/png' && first.asset.width === 1 && first.asset.height === 1, 'Type and size come from the bytes, not the declared type.');
const again = await upload(unique, 'image/png', { expected: 200 });
check(again.deduplicated && again.asset.id === first.asset.id, 'Identical uploads are de-duplicated.');
const served = await fetch(`${base}/api/assets/${first.asset.id}`);
check(served.status === 200 && served.headers.get('content-type') === 'image/png', 'Image served with its stored type.');
check(served.headers.get('x-content-type-options') === 'nosniff' && served.headers.get('content-security-policy')?.includes('sandbox'), 'Image served with nosniff and a sandbox CSP.');
check(Buffer.from(await served.arrayBuffer()).equals(unique), 'Served bytes match the upload.');
check((await fetch(`${base}/api/assets/img-doesnotexist000000`)).status === 404, 'Unknown image ids return 404.');
check((await fetch(`${base}/api/assets/..%2F..%2Fwrangler.jsonc`)).status === 404, 'Path tricks return 404.');
const assetList = (await request('/api/admin/assets', { token })).assets;
check(assetList.some((a) => a.id === first.asset.id), 'Uploaded image appears in the admin library.');
// Use it on a slide (passes the server-side "asset exists" check), then try to delete it.
const imageSlide = (await request(`/api/admin/lessons/${seed.lesson.id}/slides`, { method: 'POST', token, data: { template: 'title' }, expected: 201 })).slide;
const withImage = { ...imageSlide.doc, background: { assetId: first.asset.id }, elements: [...imageSlide.doc.elements, { id: 'smoke-img', type: 'image', assetId: first.asset.id, fit: 'contain', alt: 'test', x: 100, y: 100, w: 200, h: 200 }] };
const savedImage = (await request(`/api/admin/slides/${imageSlide.id}`, { method: 'PATCH', token, data: { version: imageSlide.version, doc: withImage } })).slide;
check(savedImage.doc.elements.some((e) => e.type === 'image') && savedImage.doc.background.assetId === first.asset.id, 'Image element and background image saved.');
await request(`/api/admin/assets/${first.asset.id}`, { method: 'DELETE', token, expected: 409 });
await request(`/api/admin/slides/${imageSlide.id}`, { method: 'DELETE', token });
await request(`/api/admin/assets/${first.asset.id}`, { method: 'DELETE', token });
check((await fetch(`${base}/api/assets/${first.asset.id}`)).status === 404, 'Deleted image is no longer served.');
log('images: auth, SVG/HTML/oversize refused, byte sniffing, dedupe, safe delivery headers, in-use delete blocked, delete');

// ------------------------------------------------------------- logout
await request('/api/admin/logout', { method: 'POST', token });
await request('/api/admin/lessons', { token, expected: 401 });
log('logout revokes the session');

console.log(`\nPASS: ${checks} admin assertions. Fixtures remain in local D1 only.`);
