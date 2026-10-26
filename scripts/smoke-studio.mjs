// Training Studio Phase 4 smoke test: plans, publishing, snapshot stability and live rooms
// presenting published decks. Runs against a LOCAL Worker only.
// Usage: SMOKE_ADMIN_PASSPHRASE=... SMOKE_HOST_PASSPHRASE=... node scripts/smoke-studio.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8787';
const adminPass = process.env.SMOKE_ADMIN_PASSPHRASE;
const hostPass = process.env.SMOKE_HOST_PASSPHRASE;
if (!adminPass || !hostPass) throw new Error('Set SMOKE_ADMIN_PASSPHRASE and SMOKE_HOST_PASSPHRASE.');
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('This smoke test creates fixtures and must target a local test server.');

let checks = 0;
const log = (message) => console.log(`  ✓ ${message}`);
const check = (value, message) => { assert.ok(value, message); checks++; };
async function request(path, { method = 'GET', token, data, headers = {}, expected = 200 } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert.ok(allowed.includes(response.status), `${method} ${path}: expected ${allowed} got ${response.status} ${JSON.stringify(body).slice(0, 200)}`);
  checks++;
  return body;
}
const textOf = (doc) => doc.elements.filter((e) => e.type === 'text').map((e) => e.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join(' ')).join(' | ');

// ----------------------------------------------------------------- setup
const { token: admin } = await request('/api/admin/login', { method: 'POST', data: { passphrase: adminPass }, expected: 201 });
const week01 = (await request('/api/admin/seed/week01', { method: 'POST', token: admin, expected: [200, 201] })).lesson;
const live = (title) => week01.slides.find((slide) => slide.title === title);
check(live('Live Prompt Challenge') && live('Prompt Battle') && live('Final Results'), 'Week 01 lesson has the live slides.');
const lesson = (await request('/api/admin/lessons', { method: 'POST', token: admin, data: { title: `Studio smoke ${Date.now()}` }, expected: 201 })).lesson;
const opening = (await request(`/api/admin/lessons/${lesson.id}/slides`, { method: 'POST', token: admin, data: { template: 'title', title: 'Opening' }, expected: 201 })).slide;
const steps = (await request(`/api/admin/lessons/${lesson.id}/slides`, { method: 'POST', token: admin, data: { template: 'step-by-step', title: 'Steps' }, expected: 201 })).slide;
log('setup: admin session, Week 01 lesson, a fresh lesson with two slides');

// ----------------------------------------------------------------- plans
await request('/api/admin/plans', { token: 'nope', expected: 401 });
const { plan: draft } = await request('/api/admin/plans', { method: 'POST', token: admin, data: { title: 'Week 02 · Late check-out', weekDate: '2026-11-02' }, expected: 201 });
check(draft.status === 'draft' && draft.latestVersion === null && draft.challenge.titleEn, 'New plan is a draft with the default challenge.');
const patch = (data, expected = 200) => request(`/api/admin/plans/${draft.id}`, { method: 'PATCH', token: admin, data, expected });
await patch({ weekDate: '02/11/2026' }, 400);
await patch({ durationMin: 3 }, 400);
await patch({ challenge: { titleEn: '', scenarioEn: 'x', taskEn: 'y' } }, 400);
await patch({ slideIds: ['does-not-exist'] }, 400);
const challenge = { titleEn: 'Late Check-out', titleTh: 'เช็กเอาต์ล่าช้า', scenarioEn: 'A guest asks to check out at 3pm. The room is booked from 4pm.', scenarioTh: '', taskEn: 'Write a prompt for a polite reply offering 1pm and luggage storage.', taskTh: '' };
const slideIds = [opening.id, steps.id, live('Live Prompt Challenge').id, live('Prompt Battle').id, live('Final Results').id];
const { plan: saved } = await patch({ durationMin: 45, notes: 'Bring the luggage policy.', challenge, slideIds });
check(saved.slides.map((s) => s.slideId).join() === slideIds.join() && saved.durationMin === 45, 'Plan slides, order and details saved.');
check(saved.challenge.scenarioTh === challenge.scenarioEn, 'Thai challenge fields fall back to English.');
const { plan: empty } = await request('/api/admin/plans', { method: 'POST', token: admin, data: { title: 'Empty plan' }, expected: 201 });
await request(`/api/admin/plans/${empty.id}/publish`, { method: 'POST', token: admin, expected: 409 });
await request(`/api/admin/plans/${empty.id}`, { method: 'DELETE', token: admin });
log('plans: create, validation (date, duration, challenge, slides), save, empty publish refused, draft delete');

// --------------------------------------------------------------- publish
const v1 = await request(`/api/admin/plans/${draft.id}/publish`, { method: 'POST', token: admin, expected: 201 });
check(v1.snapshot.version === 1 && v1.plan.status === 'published' && !v1.plan.hasUnpublishedChanges, 'Published v1.');
const v1Deck = (await request(`/api/admin/snapshots/${v1.snapshot.id}`, { token: admin })).snapshot.deck;
check(v1Deck.slides.length === 5 && v1Deck.challenge.titleEn === 'Late Check-out' && v1Deck.version === 1, 'Snapshot holds the slides and challenge.');
const openingText = textOf(v1Deck.slides[0].doc);
// Edit the library slide after publishing.
const edited = structuredClone(opening.doc);
edited.elements.find((e) => e.type === 'text' && e.paragraphs[0].runs[0].text === 'Lesson Title').paragraphs[0].runs[0].text = 'EDITED AFTER PUBLISH';
await request(`/api/admin/slides/${opening.id}`, { method: 'PATCH', token: admin, data: { version: opening.version, doc: edited } });
const afterEdit = (await request(`/api/admin/plans/${draft.id}`, { token: admin })).plan;
check(afterEdit.hasUnpublishedChanges, 'Editing a library slide marks the plan as having unpublished changes.');
const v1Again = (await request(`/api/admin/snapshots/${v1.snapshot.id}`, { token: admin })).snapshot.deck;
check(textOf(v1Again.slides[0].doc) === openingText && !JSON.stringify(v1Again).includes('EDITED AFTER PUBLISH'), 'Snapshot v1 is unchanged by the library edit.');
log('publish: v1 frozen; library edit flags the plan but does not touch v1');

// ------------------------------------------------- live room from snapshot
const session = await request(`/api/admin/snapshots/${v1.snapshot.id}/session`, { method: 'POST', token: admin, expected: 201 });
const root = `/api/rooms/${session.roomCode}`;
const host = session.hostToken;
let hostState = (await request(`${root}/state`, { token: host })).state;
check(hostState.snapshotId === v1.snapshot.id && hostState.totalSlides === 5 && hostState.slideSteps.join() === '0,4,0,0,0', 'Room presents v1: 5 slides, step counts from the snapshot.');
check(hostState.title === 'Week 02 · Late check-out' && hostState.challenge.titleEn === 'Late Check-out', 'Room uses the plan title and challenge.');
const deckForHost = await request(`${root}/deck`, { token: host });
check(deckForHost.deck.slides.length === 5 && !JSON.stringify(deckForHost).includes('EDITED AFTER PUBLISH'), 'Presenter deck is the frozen v1 content.');
check(deckForHost.deck.slides.some((slide) => slide.doc.notes), 'Presenter deck includes presenter notes.');
const people = [];
for (const name of ['Ann', 'Bo', 'Cy', 'Di', 'Ed']) people.push(await request(`${root}/join`, { method: 'POST', data: { nickname: name }, expected: 201 }));
await request(`${root}/deck`, { token: people[0].participantToken, expected: 401 });
await request(`${root}/deck`, { expected: 401 });
const ctl = (action, expected = 200) => request(`${root}/control`, { method: 'POST', token: host, data: action, expected });
await ctl({ action: 'slide', index: 5, step: 0 }, 400);
await ctl({ action: 'slide', index: 1, step: 5 }, 400);
hostState = (await ctl({ action: 'slide', index: 1, step: 4 })).state;
check(hostState.currentSlide === 1 && hostState.slideStep === 4, 'Navigation is bounded by the snapshot.');
log('room from snapshot: deck, title, challenge, presenter-only deck, bounded navigation');

hostState = (await ctl({ action: 'activity', activity: 'writing' })).state;
check(hostState.currentSlide === 2, 'Starting writing jumps to the slide with the challenge widget.');
const participantView = await request(`${root}/state`, { token: people[0].participantToken });
check(participantView.state.challenge.taskEn.includes('luggage storage') && !('participants' in participantView.state), 'Participants see the plan challenge.');
for (const person of people.slice(0, 4)) {
  await request(`${root}/submit`, { method: 'POST', token: person.participantToken, data: { prompt: `You are a 4Seas receptionist. Reply politely to a late check-out request (${person.nickname}).`, requestId: randomUUID() }, expected: 201 });
}
hostState = (await ctl({ action: 'generate_battles' })).state;
check(hostState.currentSlide === 3 && hostState.battles.length === 1, 'Generating battles jumps to the battle widget slide.');
await ctl({ action: 'open_voting' });
const battle = hostState.battles[0];
await request(`${root}/vote`, { method: 'POST', token: people[4].participantToken, data: { battleId: battle.id, entryId: battle.entries[0].id, requestId: randomUUID() }, expected: 201 });
await ctl({ action: 'close_voting' });
await ctl({ action: 'reveal' });
hostState = (await ctl({ action: 'start_final' })).state;
check(hostState.finalStatus === 'complete', 'Single finalist wins by default.');
hostState = (await ctl({ action: 'show_results' })).state;
check(hostState.currentSlide === 4 && hostState.activity === 'results', 'Showing results jumps to the leaderboard widget slide.');
log('live flow on a snapshot deck: writing → battle → results jump to the right slides');

// -------------------------------------------------- v2 and history safety
const v2 = await request(`/api/admin/plans/${draft.id}/publish`, { method: 'POST', token: admin, expected: 201 });
check(v2.snapshot.version === 2, 'Published v2.');
const v2Deck = (await request(`/api/admin/snapshots/${v2.snapshot.id}`, { token: admin })).snapshot.deck;
check(JSON.stringify(v2Deck).includes('EDITED AFTER PUBLISH'), 'v2 picks up the library edit.');
check(!JSON.stringify((await request(`${root}/deck`, { token: host })).deck).includes('EDITED AFTER PUBLISH'), 'The running v1 room still presents v1.');
const { plan: copy } = await request('/api/admin/plans', { method: 'POST', token: admin, data: { copyFrom: draft.id }, expected: 201 });
check(copy.status === 'draft' && copy.latestVersion === null && copy.weekDate === '2026-11-09' && copy.slides.length === 5 && copy.challenge.titleEn === 'Late Check-out', 'Duplicating a week copies slides and challenge, moves the date +7 days, and starts as a draft.');
await request(`/api/admin/plans/${draft.id}`, { method: 'DELETE', token: admin, expected: 409 });
await request(`/api/admin/slides/${steps.id}`, { method: 'DELETE', token: admin, expected: 409 });
const sessions = (await request('/api/admin/sessions', { token: admin })).sessions;
check(sessions.some((s) => s.code === session.roomCode && s.version === 1 && s.participants === 5), 'Live Sessions lists the room with its version.');
log('v2 published; running room keeps v1; duplicate week; published plan and in-use slides protected');

// ------------------------------------------------------- legacy rooms
const legacy = await request('/api/rooms', { method: 'POST', headers: { 'X-Host-Passphrase': hostPass }, data: {}, expected: 201 });
const legacyState = (await request(`/api/rooms/${legacy.roomCode}/state`, { token: legacy.hostToken })).state;
check(legacyState.snapshotId === null && legacyState.totalSlides === 7 && legacyState.slideSteps.join() === '0,5,2,5,0,0,0', 'Rooms without a snapshot keep the built-in Week 01 deck.');
check((await request(`/api/rooms/${legacy.roomCode}/deck`, { token: legacy.hostToken })).deck === null, 'Legacy rooms have no published deck.');
log('backward compatibility: built-in deck rooms unchanged');

console.log(`\nPASS: ${checks} studio assertions. Fixtures remain in local D1 only.`);
