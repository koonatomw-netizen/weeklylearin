// Local-only room capacity check: 60 unique participants join, then poll concurrently.
// Usage: SMOKE_HOST_PASSPHRASE=... node scripts/load-check.mjs
import assert from 'node:assert/strict';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8787';
const passphrase = process.env.SMOKE_HOST_PASSPHRASE;
if (!passphrase) throw new Error('Set SMOKE_HOST_PASSPHRASE to the local presenter passphrase.');
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('This check creates a room and participants; it only runs against a local Worker.');

async function timed(label, operation) {
  const started = performance.now();
  const value = await operation();
  return { label, ms: performance.now() - started, value };
}
async function request(path, { method = 'GET', token, data, headers = {}, expected = 200 } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(30000),
  });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, expected, `${method} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}
const started = await timed('create room', () => request('/api/rooms', { method: 'POST', headers: { 'X-Host-Passphrase': passphrase }, data: { builtIn: true }, expected: 201 }));
const { roomCode, hostToken } = started.value;
assert.ok(roomCode && hostToken, 'Room creation returns host credentials.');
const joinTimes = [];
const participants = await Promise.all(Array.from({ length: 60 }, async (_, index) => {
  const result = await timed(`join ${index + 1}`, () => request(`/api/rooms/${roomCode}/join`, {
    method: 'POST', data: { nickname: `Load ${String(index + 1).padStart(2, '0')}` }, expected: 201,
  }));
  joinTimes.push(result.ms);
  return result.value;
}));
const stateTimes = await Promise.all(participants.map(async (person) => {
  const result = await timed('participant state', () => request(`/api/rooms/${roomCode}/state`, { token: person.participantToken }));
  assert.equal(result.value.state.participantCount, 60, 'State includes all 60 participants.');
  return result.ms;
}));
const host = await request(`/api/rooms/${roomCode}/state`, { token: hostToken });
assert.equal(host.state.participantCount, 60, 'Presenter state includes all 60 participants.');
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
console.log(`PASS: 60 participants joined room ${roomCode}; 60 concurrent participant state reads completed.`);
console.log(`Join latency ms: median ${percentile(joinTimes, .5).toFixed(0)}, p95 ${percentile(joinTimes, .95).toFixed(0)}, max ${Math.max(...joinTimes).toFixed(0)}`);
console.log(`State latency ms: median ${percentile(stateTimes, .5).toFixed(0)}, p95 ${percentile(stateTimes, .95).toFixed(0)}, max ${Math.max(...stateTimes).toFixed(0)}`);
console.log('Local-only result; does not model real phones, Wi-Fi contention, or Cloudflare production traffic.');
