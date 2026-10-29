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
// Admin history must follow the live room's rule: nothing about authors or votes before Reveal.
const openHistory = (await request(`/api/admin/sessions/${session.roomCode}`, { token: admin })).session.battles.find((item) => item.id === battle.id);
check(openHistory.status === 'open' && !openHistory.revealed && openHistory.entries.length === 4, 'History lists the open battle and its prompts.');
check(openHistory.entries.every((entry) => entry.nickname === null && entry.votes === null && entry.winner === false), 'History hides authors, votes and winners while voting is open.');
check(!JSON.stringify(openHistory).match(/"(Ann|Bo|Cy|Di)"/), 'No participant names leak through the open battle in history.');
await ctl({ action: 'close_voting' });
const closedHistory = (await request(`/api/admin/sessions/${session.roomCode}`, { token: admin })).session.battles.find((item) => item.id === battle.id);
check(closedHistory.status === 'closed' && closedHistory.entries.every((entry) => entry.nickname === null && entry.votes === null), 'History still hides results after voting closes, until Reveal.');
await ctl({ action: 'reveal' });
const revealedHistory = (await request(`/api/admin/sessions/${session.roomCode}`, { token: admin })).session.battles.find((item) => item.id === battle.id);
check(revealedHistory.revealed && revealedHistory.entries.every((entry) => typeof entry.nickname === 'string') && revealedHistory.entries.reduce((sum, entry) => sum + entry.votes, 0) === 1, 'After Reveal, history shows authors and the vote count.');
hostState = (await ctl({ action: 'start_final' })).state;
check(hostState.finalStatus === 'complete', 'Single finalist wins by default.');
hostState = (await ctl({ action: 'show_results' })).state;
check(hostState.currentSlide === 4 && hostState.activity === 'results', 'Showing results jumps to the leaderboard widget slide.');
log('live flow on a snapshot deck: writing → battle → results jump to the right slides');

// --------------------------------------------------------- feedback/history
await ctl({ action: 'start_feedback' });
await request(`${root}/feedback`, { method: 'POST', token: people[0].participantToken, data: {
  trainingRating: 5, workChallenges: 'Late check-in requests', supportNeeded: 'A clear policy card',
  trainingRequests: 'Handling difficult requests', otherComments: '=HYPERLINK("https://example.com")',
}, expected: 201 });
const feedbackReport = (await request('/api/admin/feedback/report', { token: admin })).sessions.find((item) => item.code === session.roomCode);
check(feedbackReport.responses === 1 && feedbackReport.participants === 5 && feedbackReport.averageRating === 5, 'Cross-session feedback report aggregates completion and ratings.');
const history = (await request(`/api/admin/sessions/${session.roomCode}`, { token: admin })).session;
check(history.deck.slides.length === 5 && history.feedback[0].workChallenges === 'Late check-in requests' && history.battles.find((battle) => battle.round === 'mini').entries.length === 4, 'History returns frozen slides, named feedback and battle outcomes to admins.');
const tag = (await request(`/api/admin/sessions/${session.roomCode}/tags`, { method: 'POST', token: admin, data: { tag: 'check-in policy', note: 'Needs a clearer staff reference.' }, expected: 201 })).tags[0];
check(tag.tag === 'check-in policy', 'History supports recurring-issue tags.');
check((await request('/api/admin/issue-tags', { token: admin })).issues.some((issue) => issue.tag === 'check-in policy' && issue.sessions.some((item) => item.code === session.roomCode)), 'History groups manually tagged issues across sessions.');
await request(`/api/admin/sessions/${session.roomCode}/tags`, { method: 'POST', token: admin, data: { tag: 'CHECK-IN POLICY' }, expected: 409 });
await request(`/api/admin/sessions/${session.roomCode}/tags?id=${tag.id}`, { method: 'DELETE', token: admin });
const csvResponse = await fetch(`${base}/api/admin/feedback.csv`, { headers: { Authorization: `Bearer ${admin}` } });
const csv = await csvResponse.text();
check(csvResponse.ok && csv.includes('Late check-in requests') && csv.includes('snapshot_version') && csv.includes("'=HYPERLINK"), 'Combined CSV contains session metadata, individual answers and formula-safe text.');
await request('/api/admin/feedback/report', { token: 'nope', expected: 401 });
log('Phase 5 reports: cross-session feedback, protected detail, snapshot replay data, outcomes, issue tags and combined CSV');

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

// ------------------------------------------- push a newer version to the live room
const beforePush = (await request(`${root}/state`, { token: host })).state;
const pushUrl = `/api/admin/sessions/${session.roomCode}/push`;
await request(pushUrl, { method: 'POST', data: { snapshotId: v2.snapshot.id }, expected: 401 });
await request(pushUrl, { method: 'POST', token: host, data: { snapshotId: v2.snapshot.id }, expected: 401 });
await request(pushUrl, { method: 'POST', token: admin, data: { snapshotId: v1.snapshot.id }, expected: 409 });
await request(pushUrl, { method: 'POST', token: admin, data: { snapshotId: 'does-not-exist' }, expected: 404 });
await request('/api/admin/sessions/000000/push', { method: 'POST', token: admin, data: { snapshotId: v2.snapshot.id }, expected: 404 });
await request(pushUrl, { method: 'POST', token: admin, data: { snapshotId: v2.snapshot.id } });
const afterPush = (await request(`${root}/state`, { token: host })).state;
check(afterPush.snapshotId === v2.snapshot.id, 'The room now points at v2.');
check(afterPush.currentSlide === beforePush.currentSlide && afterPush.activity === beforePush.activity, 'Push keeps the presenter on the same slide and the activity untouched.');
check(JSON.stringify((await request(`${root}/deck`, { token: host })).deck).includes('EDITED AFTER PUBLISH'), 'The presenter deck now has the edit.');
check(afterPush.participantCount === 5 && afterPush.battles.length === beforePush.battles.length, 'Participants and battles survive the push.');
await request(pushUrl, { method: 'POST', token: admin, data: { snapshotId: v2.snapshot.id }, expected: 409 });
const pushed = (await request('/api/admin/sessions', { token: admin })).sessions.find((s) => s.code === session.roomCode);
check(pushed.version === 2, 'Live Sessions shows the room on v2.');
log('push to live room: admin-only, same plan and newer version only, slide kept, state intact');

// ------------------------------------- content that used to be fixed in code
const lessonsAfterSeed = (await request('/api/admin/lessons', { token: admin })).lessons;
const skillsLesson = lessonsAfterSeed.find((item) => item.title === 'Week 01 · Part 2: Skills');
check(skillsLesson && skillsLesson.slideCount === 6, 'The Skills segment is importable as its own editable lesson.');

const caseA = { rarity: 'common', challenge: { titleEn: 'Slow report', scenarioEn: 'The weekly report takes two hours.', taskEn: 'Write a prompt that drafts it from notes.' } };
const caseB = { rarity: 'rare', challenge: { titleEn: 'Inbox flood', scenarioEn: '80 unread emails after a holiday.', taskEn: 'Write a prompt that sorts them by urgency.' } };
const feedbackWording = { trainingRating: { en: 'How useful was this automation session?' }, workChallenges: { en: 'Which chore takes you longest each week?' }, supportNeeded: { en: 'What would help you automate it?' }, trainingRequests: { en: 'Which task should we automate next?' }, otherComments: { en: 'Anything else?' } };
await request(`/api/admin/plans/${copy.id}`, { method: 'PATCH', token: admin, data: { situations: [{ rarity: 'mythic', challenge: caseA.challenge }] }, expected: 400 });
await request(`/api/admin/plans/${copy.id}`, { method: 'PATCH', token: admin, data: { feedbackQuestions: { ...feedbackWording, supportNeeded: { en: '' } } }, expected: 400 });
const customised = (await request(`/api/admin/plans/${copy.id}`, { method: 'PATCH', token: admin, data: { situations: [caseA, caseB], feedbackQuestions: feedbackWording } })).plan;
check(customised.situations.length === 2 && customised.feedbackQuestions.workChallenges.th === 'Which chore takes you longest each week?', 'A plan stores its own cases and feedback wording (Thai falls back to English).');
const pub = await request(`/api/admin/plans/${copy.id}/publish`, { method: 'POST', token: admin, expected: 201 });

// A presenter starts the room from the home page: passphrase check, plan list, then the chosen plan.
await request('/api/presenter/plans', { method: 'POST', expected: 401 });
await request('/api/presenter/plans', { method: 'POST', headers: { 'X-Host-Passphrase': 'wrong' }, expected: 401 });
const offered = (await request('/api/presenter/plans', { method: 'POST', headers: { 'X-Host-Passphrase': hostPass } })).plans;
check(offered.some((item) => item.snapshotId === pub.snapshot.id && item.version === 1), 'The presenter list offers the newest published version of each plan.');
await request('/api/rooms', { method: 'POST', headers: { 'X-Host-Passphrase': hostPass }, data: { snapshotId: 'nope' }, expected: 404 });
await request('/api/rooms', { method: 'POST', headers: { 'X-Host-Passphrase': hostPass }, data: {}, expected: 400 });
const custom = await request('/api/rooms', { method: 'POST', headers: { 'X-Host-Passphrase': hostPass }, data: { snapshotId: pub.snapshot.id }, expected: 201 });
const customState = (await request(`/api/rooms/${custom.roomCode}/state`, { token: custom.hostToken })).state;
check(customState.snapshotId === pub.snapshot.id && customState.casePool.length === 2, 'A room from the home page presents the plan and carries its own case pool.');
check(customState.feedbackQuestions.trainingRequests.en === 'Which task should we automate next?', 'The room carries the plan\'s feedback wording.');
const drawn = (await request(`/api/rooms/${custom.roomCode}/control`, { method: 'POST', token: custom.hostToken, data: { action: 'open_case' } })).state;
check(['case-1', 'case-2'].includes(drawn.caseRoll.situationId) && ['Slow report', 'Inbox flood'].includes(drawn.challenge.titleEn), 'Opening a case draws only from the plan\'s own pool.');

// Turning case opening off keeps the plan's challenge and refuses the draw.
await request(`/api/admin/plans/${copy.id}`, { method: 'PATCH', token: admin, data: { situations: [] } });
const off = await request(`/api/admin/plans/${copy.id}/publish`, { method: 'POST', token: admin, expected: 201 });
const offRoom = await request('/api/rooms', { method: 'POST', headers: { 'X-Host-Passphrase': hostPass }, data: { snapshotId: off.snapshot.id }, expected: 201 });
check((await request(`/api/rooms/${offRoom.roomCode}/state`, { token: offRoom.hostToken })).state.casePool.length === 0, 'A plan can turn case opening off.');
await request(`/api/rooms/${offRoom.roomCode}/control`, { method: 'POST', token: offRoom.hostToken, data: { action: 'open_case' }, expected: 409 });
log('content in the studio: Skills lesson import, per-plan cases and feedback wording, rooms started from the home page');

// -------------------------------------------------- Week 02 starter plan
const week02 = await request('/api/admin/seed/week02', { method: 'POST', token: admin, expected: [200, 201] });
check(week02.lesson.slides.length === 13 && week02.planId === 'week02-starter-plan', 'Week 02 starter imports as a 13-slide lesson plus a draft plan.');
const again = await request('/api/admin/seed/week02', { method: 'POST', token: admin, expected: 200 });
check(again.created === false, 'Importing Week 02 twice is a no-op.');
const week02Plan = (await request('/api/admin/plans/week02-starter-plan', { token: admin })).plan;
check(week02Plan.slides.length === 13 && week02Plan.situations.length === 6 && week02Plan.challenge.titleEn === 'Messy Notes to Action List', 'The draft plan has its slides, six cases and challenge.');
check(week02Plan.feedbackQuestions.workChallenges.en.includes('chore'), 'The draft plan has its own feedback wording.');
const week02Pub = await request('/api/admin/plans/week02-starter-plan/publish', { method: 'POST', token: admin, expected: 201 });
const week02Room = await request(`/api/admin/snapshots/${week02Pub.snapshot.id}/session`, { method: 'POST', token: admin, expected: 201 });
const week02State = (await request(`/api/rooms/${week02Room.roomCode}/state`, { token: week02Room.hostToken })).state;
check(week02State.totalSlides === 13 && week02State.casePool.length === 6 && week02State.title.startsWith('Week 02'), 'A room from the Week 02 starter presents 13 slides with its own case pool.');
log('Week 02 starter: lesson, draft plan, publish and a live room');

// ------------------------------------------------------------ case sets
await request('/api/admin/case-sets', { expected: 401 });
const seeded = (await request('/api/admin/seed/cases', { method: 'POST', token: admin })).sets;
check(seeded.find((s) => s.id === 'week01-cases')?.situations.length === 15 && seeded.find((s) => s.id === 'week02-cases')?.situations.length === 6, 'Starter case sets import the 15 built-in cases and the 6 Week 02 chore cases.');
check((await request('/api/admin/seed/cases', { method: 'POST', token: admin })).sets.length === seeded.length, 'Importing the starter sets twice is a no-op.');
await request('/api/admin/case-sets', { method: 'POST', token: admin, data: { title: '' }, expected: 400 });
await request('/api/admin/case-sets', { method: 'POST', token: admin, data: { title: 'Bad', situations: [{ rarity: 'mythic', challenge: caseA.challenge }] }, expected: 400 });
const mine = (await request('/api/admin/case-sets', { method: 'POST', token: admin, data: { title: 'Week 03 · Check the work', situations: [caseA, caseB] }, expected: 201 })).set;
check(mine.situations.length === 2 && mine.situations[0].challenge.titleTh === 'Slow report', 'A new set validates its cases and falls back to English for Thai.');
const renamed = (await request(`/api/admin/case-sets/${mine.id}`, { method: 'PATCH', token: admin, data: { title: 'Week 03 cases', situations: [caseB] } })).set;
check(renamed.title === 'Week 03 cases' && renamed.situations.length === 1, 'A set can be renamed and its cases replaced.');
await request(`/api/admin/case-sets/${mine.id}`, { method: 'PATCH', token: admin, data: { situations: 'nope' }, expected: 400 });
// A plan copies a set; editing the set afterwards never changes the plan.
const planWithSet = (await request(`/api/admin/plans/${copy.id}`, { method: 'PATCH', token: admin, data: { situations: renamed.situations } })).plan;
await request(`/api/admin/case-sets/${mine.id}`, { method: 'PATCH', token: admin, data: { situations: [caseA, caseB] } });
check((await request(`/api/admin/plans/${copy.id}`, { token: admin })).plan.situations.length === planWithSet.situations.length, 'Editing a set does not change plans that copied it.');
await request(`/api/admin/case-sets/${mine.id}`, { method: 'DELETE', token: admin });
await request(`/api/admin/case-sets/${mine.id}`, { method: 'PATCH', token: admin, data: { title: 'x' }, expected: 404 });
log('case sets: starter import, validation, edit, copy-not-link, delete');

// ------------------------------------------------------- legacy rooms
const legacy = await request('/api/rooms', { method: 'POST', headers: { 'X-Host-Passphrase': hostPass }, data: { builtIn: true }, expected: 201 });
const legacyState = (await request(`/api/rooms/${legacy.roomCode}/state`, { token: legacy.hostToken })).state;
check(legacyState.snapshotId === null && legacyState.totalSlides >= 7 && legacyState.slideSteps.slice(0, 7).join() === '0,5,2,5,0,0,0', 'Rooms without a snapshot keep the built-in Week 01 deck.');
check((await request(`/api/rooms/${legacy.roomCode}/deck`, { token: legacy.hostToken })).deck === null, 'Legacy rooms have no published deck.');
await request(`/api/admin/sessions/${legacy.roomCode}/push`, { method: 'POST', token: admin, data: { snapshotId: v2.snapshot.id }, expected: 409 });
log('backward compatibility: built-in deck rooms unchanged');

console.log(`\nPASS: ${checks} studio assertions. Fixtures remain in local D1 only.`);
