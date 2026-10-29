// End-to-end Prompt Battle smoke test against a LOCAL Worker (wrangler dev).
// Usage: SMOKE_HOST_PASSPHRASE=... node scripts/smoke-room.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8787';
const passphrase = process.env.SMOKE_HOST_PASSPHRASE;
if (!passphrase) throw new Error('Set SMOKE_HOST_PASSPHRASE to the local test host passphrase.');
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('This smoke test creates fixtures and must target a local test server.');

let checks = 0;
const log = (message) => console.log(`  ✓ ${message}`);
function check(value, message) { assert.ok(value, message); checks++; }

async function request(path, { method = 'GET', token, data, headers = {}, expected = 200 } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(15000),
  });
  const body = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert.ok(allowed.includes(response.status), `${method} ${path}: expected ${allowed.join('/')} got ${response.status} ${JSON.stringify(body)}`);
  checks++;
  return body;
}

// ---------------------------------------------------------------- 1. room
const config = await request('/api/config');
check(config.hostReady === true, 'Host passphrase must be configured.');
await request('/api/rooms', { method: 'POST', data: {}, expected: 401 });
const created = await request('/api/rooms', { method: 'POST', headers: { 'X-Host-Passphrase': passphrase }, data: {}, expected: 201 });
check(/^\d{6}$/.test(created.roomCode), 'Room code must be six digits.');
const root = `/api/rooms/${created.roomCode}`;
const host = created.hostToken;
const ctl = (action, expected = 200) => request(`${root}/control`, { method: 'POST', token: host, data: action, expected });
await request(`${root}/state`, { expected: 401 });
log(`1. presenter created room ${created.roomCode}`);

// -------------------------------------------------------------- 2. join
const names = ['=Formula', 'Bee', 'Cat', 'Dao', 'Eve', 'Fon', 'Gun'];
const people = {};
for (const name of names) people[name] = await request(`${root}/join`, { method: 'POST', data: { nickname: name }, expected: 201 });
await request(`${root}/join`, { method: 'POST', data: { nickname: 'bee' }, expected: 409 });
await request(`${root}/join`, { method: 'POST', data: { nickname: 'x' }, expected: 400 });
const tokenOf = (name) => people[name].participantToken;
const stateOf = (name) => request(`${root}/state`, { token: tokenOf(name) });
check((await request(`${root}/state`, { token: host })).state.participantCount === 7, 'Seven participants joined.');
log('2. seven participants joined; duplicate/invalid names rejected');

// Participants cannot use presenter endpoints.
await request(`${root}/control`, { method: 'POST', token: tokenOf('Bee'), data: { action: 'activity', activity: 'writing' }, expected: 401 });
await request(`${root}/export`, { token: tokenOf('Bee'), expected: 401 });
const beeView = await stateOf('Bee');
check(!('participants' in beeView.state) && !('submissions' in beeView.state), 'Participant envelope must not contain host data.');
check(!JSON.stringify(beeView).includes('Cat'), 'Other names are private.');
log('   presenter-only actions refused for participant tokens');

// WebSocket listener.
const { ticket } = await request(`${root}/ticket`, { method: 'POST', token: tokenOf('Gun'), data: {} });
const ws = new WebSocket(`${base.replace('http:', 'ws:')}${root}/ws?ticket=${encodeURIComponent(ticket)}`);
const frames = [];
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('No initial WebSocket frame')), 10000);
  ws.addEventListener('message', ({ data }) => { if (data === 'pong') return; frames.push(JSON.parse(data)); clearTimeout(timer); resolve(); });
  ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebSocket connect failed')); }, { once: true });
});

try {
  // -------------------------------------------------- 3–4. submissions
  const submit = (name, prompt, requestId = randomUUID(), expected = 201) =>
    request(`${root}/submit`, { method: 'POST', token: tokenOf(name), data: { prompt, requestId }, expected });
  const prompt = (who, n) => `You are a receptionist at 4Seas Nimman. Write a polite English message (${who} v${n}) explaining a 30-minute room delay and offering a complimentary drink. Under 80 words.`;

  await submit('Bee', prompt('Bee', 0), randomUUID(), 409);
  await ctl({ action: 'activity', activity: 'writing' });
  log('3. presenter started prompt submission (early submit rejected)');

  const doubleClick = randomUUID();
  const [first, second] = await Promise.all([
    submit('=Formula', prompt('A', 1), doubleClick, [200, 201]),
    submit('=Formula', prompt('A', 1), doubleClick, [200, 201]),
  ]);
  check(first.me.submissions.length === 1 && second.me.submissions.length === 1, 'Double-click must create one submission.');
  await submit('=Formula', prompt('A', 1), randomUUID(), 409);
  await submit('=Formula', prompt('A', 2));
  const third = await submit('=Formula', prompt('A', 3));
  check(third.me.submissions.map((s) => s.attempt).join() === '1,2,3', 'Three attempts stored in order.');
  await submit('=Formula', prompt('A', 4), randomUUID(), 409);
  await submit('Bee', 'too short', randomUUID(), 400);
  await Promise.all(['Bee', 'Cat', 'Dao', 'Eve', 'Fon'].map((name) => submit(name, prompt(name, 1))));
  // Simultaneous different submissions from one participant must not exceed the limit.
  const racers = await Promise.allSettled([1, 2, 3].map((n) => fetch(`${base}${root}/submit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOf('Fon')}` },
    body: JSON.stringify({ prompt: prompt('Fon-race', n), requestId: randomUUID() }),
  }).then((r) => r.status)));
  const fon = await stateOf('Fon');
  check(fon.me.submissions.length === 3, `Concurrent submissions capped at 3 (got ${fon.me.submissions.length}, statuses ${racers.map((r) => r.value)}).`);
  log('4. up to three attempts per participant; duplicates, 4th attempt, and races rejected');

  // Self-check + final selection.
  const formulaState = await stateOf('=Formula');
  const aSecond = formulaState.me.submissions[1];
  const checked = await request(`${root}/checklist`, { method: 'POST', token: tokenOf('=Formula'), data: { submissionId: aSecond.id, checklist: { context: true, goal: true, bogus: true } } });
  check(JSON.stringify(checked.me.submissions[1].checklist) === '{"context":true,"goal":true}', 'Checklist stores only known keys.');
  await request(`${root}/final`, { method: 'POST', token: tokenOf('=Formula'), data: { submissionId: aSecond.id } });
  await request(`${root}/final`, { method: 'POST', token: tokenOf('Bee'), data: { submissionId: aSecond.id }, expected: 404 });
  const bee = await stateOf('Bee');
  await request(`${root}/final`, { method: 'POST', token: tokenOf('Bee'), data: { submissionId: bee.me.submissions[0].id } });
  log('5. self-check saved; final prompts selected (cannot pick someone else\'s)');

  await ctl({ action: 'activity', activity: 'writing_closed' });
  await submit('Cat', prompt('Cat', 2), randomUUID(), 409);

  // ------------------------------------------------------ 6. battle groups
  const generated = await ctl({ action: 'generate_battles' });
  const minis = generated.state.battles.filter((b) => b.round === 'mini');
  check(minis.map((b) => b.entries.length).sort().join() === '3,3', `Six prompts form 3+3 groups (got ${minis.map((b) => b.entries.length)}).`);
  check(generated.state.participants.filter((p) => p.finalAuto).length === 4, 'Participants without a pick get their latest prompt automatically.');
  check(minis.every((b) => b.entries.every((e) => !e.result)), 'Authors hidden before reveal.');
  const again = await request(`${root}/state`, { token: host });
  check(JSON.stringify(again.state.battles.map((b) => b.entries.map((e) => e.id))) === JSON.stringify(generated.state.battles.map((b) => b.entries.map((e) => e.id))), 'Refreshing keeps the same groups.');
  await request(`${root}/final`, { method: 'POST', token: tokenOf('Bee'), data: { submissionId: bee.me.submissions[0].id }, expected: 409 });
  await ctl({ action: 'activity', activity: 'writing' }, 409);
  log('6. groups of three generated, persisted, finals locked; Gun (no prompt) excluded');

  // Map who competes where using each participant's own view.
  const views = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await stateOf(name)])));
  const competitorsIn = (battleId) => names.filter((name) => views[name].state.battles.find((b) => b.id === battleId).isCompetitor);
  const votersIn = (battleId) => names.filter((name) => !competitorsIn(battleId).includes(name));
  const vote = (name, battleId, entryId, requestId = randomUUID(), expected = 201) =>
    request(`${root}/vote`, { method: 'POST', token: tokenOf(name), data: { battleId, entryId, requestId }, expected });

  // ------------------------------------------------------ 7–9. battle 1
  const b1 = minis.find((b) => b.id === generated.state.activeBattleId);
  const b2 = minis.find((b) => b.id !== b1.id);
  check(votersIn(b1.id).length === 4 && competitorsIn(b1.id).length === 3, 'Battle 1 has 3 competitors and 4 eligible voters.');
  await vote(votersIn(b1.id)[0], b1.id, b1.entries[0].id, randomUUID(), 409);
  await ctl({ action: 'open_voting' });
  await vote(competitorsIn(b1.id)[0], b1.id, b1.entries[0].id, randomUUID(), 403);
  await request(`${root}/vote`, { method: 'POST', token: host, data: { battleId: b1.id, entryId: b1.entries[0].id, requestId: randomUUID() }, expected: 401 });
  await vote(votersIn(b2.id)[0], b2.id, b2.entries[0].id, randomUUID(), 409); // battle 2 not open yet
  const [v1, v2, v3, v4] = votersIn(b1.id);
  const retryId = randomUUID();
  await vote(v1, b1.id, b1.entries[0].id, retryId);
  await vote(v1, b1.id, b1.entries[0].id, retryId, 200);
  await vote(v1, b1.id, b1.entries[1].id, randomUUID(), 409);
  await Promise.all([vote(v2, b1.id, b1.entries[0].id), vote(v3, b1.id, b1.entries[1].id)]);
  const hidden = await request(`${root}/state`, { token: host });
  check(hidden.state.battles.find((b) => b.id === b1.id).entries.every((e) => !e.result), 'Counts hidden from everyone until reveal.');
  await ctl({ action: 'reveal' }, 409);
  await ctl({ action: 'close_voting' });
  await vote(v4, b1.id, b1.entries[2].id, randomUUID(), 409);
  const r1 = await ctl({ action: 'reveal' });
  const rb1 = r1.state.battles.find((b) => b.id === b1.id);
  const top = rb1.entries.find((e) => e.id === b1.entries[0].id).result;
  check(rb1.eligibleVoters === 4 && rb1.votesCast === 3, 'Battle 1: 3 of 4 eligible votes cast.');
  check(top.votes === 2 && top.score === 50 && top.isWinner && top.rank === 1, `Score = 2/4×100 = 50 (got ${JSON.stringify(top)}).`);
  check(top.nickname && rb1.entries.filter((e) => e.result.isWinner).length === 1, 'Single winner revealed with author.');
  log('7–9. battle 1: competitor/host/duplicate/late votes rejected; reveal shows 2 votes = 50');

  // ------------------------------------------------------ battle 2 (tie)
  await ctl({ action: 'start_final' }, 409);
  await ctl({ action: 'next_battle' });
  await ctl({ action: 'open_voting' });
  const b2Voters = votersIn(b2.id);
  await Promise.all(b2Voters.map((name, index) => vote(name, b2.id, b2.entries[index % 2].id)));
  await ctl({ action: 'close_voting' });
  const r2 = await ctl({ action: 'reveal' });
  const rb2 = r2.state.battles.find((b) => b.id === b2.id);
  check(rb2.tie && rb2.entries.filter((e) => e.result.isWinner).length === 2, 'Battle 2 tie: both leaders advance.');
  await ctl({ action: 'next_battle' }, 409);
  log('   battle 2: 2–2 tie, both tied prompts advance');

  // ------------------------------------------------------ 10. grand final
  await ctl({ action: 'resolve', battleId: b2.id, winnerEntryIds: [b2.entries[0].id], reason: 'x' }, 400);
  const final = await ctl({ action: 'start_final' });
  const f1 = final.state.battles.find((b) => b.round === 'final');
  check(f1.entries.length === 3, 'Three finalists (1 + 2 tied).');
  await ctl({ action: 'resolve', battleId: b2.id, winnerEntryIds: [b2.entries[0].id], reason: 'too late now' }, 409);
  const finalViews = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await stateOf(name)])));
  const finalVoters = names.filter((name) => !finalViews[name].state.battles.find((b) => b.id === f1.id).isCompetitor);
  check(finalVoters.length === 4 && f1.eligibleVoters === 4, 'Finalists cannot vote in the Grand Final.');
  await ctl({ action: 'open_voting' });
  await vote(names.find((name) => !finalVoters.includes(name)), f1.id, f1.entries[0].id, randomUUID(), 403);
  await Promise.all(finalVoters.map((name, index) => vote(name, f1.id, f1.entries[index % 2].id)));
  await ctl({ action: 'close_voting' });
  const rf1 = await ctl({ action: 'reveal' });
  check(rf1.state.finalStatus === 'tie', 'Grand Final 2–2 tie detected.');
  await ctl({ action: 'show_results' }, 409);
  const tiebreak = await ctl({ action: 'start_tiebreak' });
  const f2 = tiebreak.state.battles.find((b) => b.round === 'final' && b.sequence === 2);
  check(f2.entries.length === 2 && f2.eligibleVoters === 5, 'Tie-break between the two tied finalists; 5 eligible voters.');
  const tbViews = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await stateOf(name)])));
  const tbVoters = names.filter((name) => !tbViews[name].state.battles.find((b) => b.id === f2.id).isCompetitor);
  await ctl({ action: 'open_voting' });
  await Promise.all(tbVoters.map((name, index) => vote(name, f2.id, f2.entries[index < 3 ? 0 : 1].id)));
  await ctl({ action: 'close_voting' });
  const rf2 = await ctl({ action: 'reveal' });
  check(rf2.state.finalStatus === 'complete' && rf2.state.champions.length === 1, 'Tie-break produced one champion.');
  log('10. grand final tied 2–2 → tie-break 3–2 → champion');

  // Manual override on the latest final round is recorded with a reason.
  const resolved = await ctl({ action: 'resolve', battleId: f2.id, winnerEntryIds: f2.entries.map((e) => e.id), reason: 'Presenter declared joint winners after discussion' });
  check(resolved.state.champions.length === 2 && resolved.state.champions[0].shared, 'Manual resolution can declare shared winners.');
  check(resolved.state.actions.some((a) => a.action === 'resolve' && a.detail.includes('joint winners')), 'Manual decision logged with reason.');

  // ------------------------------------------------------ 11. leaderboard
  check((await stateOf('Gun')).state.leaderboard.length === 0, 'Participants see no leaderboard before it is shown.');
  await ctl({ action: 'show_results' });
  const results = await stateOf('Gun');
  check(results.state.activity === 'results' && results.state.leaderboard.length === 6, 'Leaderboard shows all six competitors.');
  check(results.state.leaderboard.filter((row) => row.rank === 1).length === 2, 'Shared champions share rank 1.');
  log('11. final leaderboard displayed to participants');

  // ------------------------------------------------- 11b. weekly feedback
  const fb = (name, data, expected = 201) => request(`${root}/feedback`, { method: 'POST', token: tokenOf(name), data, expected });
  const answers = { trainingRating: 4, workChallenges: 'Check-in queue at 3pm', supportNeeded: 'One more person at peak', trainingRequests: 'Handling complaints', otherComments: '' };
  await fb('Gun', answers, 409); // not open yet
  await request(`${root}/control`, { method: 'POST', token: tokenOf('Gun'), data: { action: 'start_feedback' }, expected: 401 });
  await ctl({ action: 'start_feedback' });
  await ctl({ action: 'start_feedback' }, 409);
  check((await stateOf('Gun')).state.activity === 'feedback', 'Participants move to weekly feedback.');
  await fb('Gun', { ...answers, trainingRating: undefined }, 400);
  await fb('Gun', { ...answers, trainingRating: 6 }, 400);
  await fb('Gun', { ...answers, workChallenges: '   ' }, 400);
  await fb('Gun', { ...answers, supportNeeded: undefined }, 400);
  await fb('Gun', { ...answers, trainingRequests: 'x'.repeat(1001) }, 400);
  const secret = `secret-answer-${randomUUID()}`;
  const gunDone = await fb('Gun', { ...answers, workChallenges: 'None', supportNeeded: 'None', trainingRequests: secret, nickname: '=Formula', participantId: people['Bee'].participantId });
  check(gunDone.me.feedbackSubmittedAt, '"None" answers accepted; confirmation state returned.');
  await fb('Gun', answers, 409);
  await fb('Cat', { ...answers, workChallenges: 'ไม่มี', supportNeeded: 'ไม่มี', trainingRequests: 'ไม่มี' });
  const race = await Promise.all([1, 2].map(() => fetch(`${base}${root}/feedback`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOf('Bee')}` },
    body: JSON.stringify({ ...answers, workChallenges: '=SUM(A1:A9)' }),
  }).then((r) => r.status)));
  check(race.sort().join() === '201,409', `Simultaneous duplicate feedback: one accepted (got ${race}).`);
  check((await stateOf('Gun')).me.feedbackSubmittedAt === gunDone.me.feedbackSubmittedAt, 'Submission state restored after refresh.');
  check((await stateOf('Dao')).me.feedbackSubmittedAt === null, 'Pending participant still sees the form.');
  const hostFb = await request(`${root}/state`, { token: host });
  check(hostFb.state.feedback.submitted === 3 && hostFb.state.feedback.pending === 4 && hostFb.state.feedback.completion === 43, `Presenter completion tracking (got ${JSON.stringify(hostFb.state.feedback).slice(0, 80)}).`);
  check(hostFb.state.feedback.averageRating === 4, 'Average rating computed.');
  check(!JSON.stringify(hostFb).includes(secret), 'Broadcast presenter/projector state never contains answers.');
  check(!JSON.stringify(await stateOf('Dao')).includes(secret), 'Other participants never see answers.');
  await request(`${root}/responses`, { token: tokenOf('Gun'), expected: 401 });
  await request(`${root}/responses`, { expected: 401 });
  await request(`${root}/feedbackcsv`, { token: tokenOf('Gun'), expected: 401 });
  const { responses } = await request(`${root}/responses`, { token: host });
  const gunRow = responses.find((row) => row.trainingRequests === secret);
  check(gunRow?.nickname === 'Gun', 'Identity comes from the token, not the submitted name.');
  check(responses.length === 3 && !('battleScore' in gunRow) && !('rank' in gunRow), 'Responses are separate from battle scores.');
  const fbCsv = await request(`${root}/feedbackcsv`, { token: host });
  const fbLines = fbCsv.split('\r\n');
  check(fbLines.length === 8 && fbLines.filter((line) => line.includes('"pending"')).length === 4, 'Feedback CSV lists everyone with status.');
  check(fbCsv.includes(secret) && fbCsv.includes("'=SUM(A1:A9)") && fbCsv.includes('ไม่มี'), 'Feedback CSV content, Thai text and formula escaping.');
  log('11b. weekly feedback: validation, "None"/"ไม่มี", duplicates, identity, tracking, access control, CSV');

  // ------------------------------------------------------ 12. export
  const csv = await request(`${root}/export`, { token: host });
  check(csv.includes("'=Formula"), 'CSV escapes formula-like names.');
  check(csv.split('\r\n').length === 8, 'CSV has a header plus one row per participant.');
  check(csv.includes('battle_score') && csv.includes('joint winners'), 'CSV includes scores and resolution notes.');
  log('12. CSV export (formula-safe)');

  // ------------------------------------------------------ 13. end session
  await request(`${root}/control`, { method: 'POST', token: tokenOf('Bee'), data: { action: 'end_room' }, expected: 401 });
  check((await request(`${root}/state`, { token: host })).state.endedAt === null, 'Room is running before it is ended.');
  const ended = await ctl({ action: 'end_room' });
  check(typeof ended.state.endedAt === 'string', 'end_room sets endedAt.');
  const endedAgain = await ctl({ action: 'end_room' });
  check(endedAgain.state.endedAt === ended.state.endedAt, 'Ending twice is a harmless no-op.');
  check((await stateOf('Bee')).state.endedAt === ended.state.endedAt, 'Participants see the room as ended.');
  await ctl({ action: 'activity', activity: 'waiting' }, 409);
  await request(`${root}/join`, { method: 'POST', data: { nickname: 'Latecomer' }, expected: 409 });
  await request(`${root}/submit`, { method: 'POST', token: tokenOf('Bee'), data: { prompt: 'x'.repeat(40), requestId: randomUUID() }, expected: 409 });
  await request(`${root}/feedback`, { method: 'POST', token: tokenOf('Bee'), data: {}, expected: 409 });
  check((await request(`${root}/export`, { token: host })).includes('battle_score'), 'Results stay exportable after the room ends.');
  log('13. end session: presenter-only, idempotent, room read-only afterwards, results kept');

  check(frames.some((frame) => frame.state?.activity === 'battle') && frames.some((frame) => frame.state?.activity === 'results'), 'WebSocket pushed live state changes.');
  log(`   WebSocket delivered ${frames.length} live frames`);
  console.log(`\nPASS: ${checks} assertions. Synthetic fixtures remain in local D1 only.`);
} finally { ws.close(); }
