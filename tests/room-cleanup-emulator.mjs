import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ROOM_RETENTION_MS, cleanupCutoff, purgePaths } from '../js/room-lifecycle.js';
import { createCooperative } from '../js/cooperative.js';
const ORIGIN = 'http://127.0.0.1:9000', PROJECT = 'demo-iki-kisilik';
const CODES = ['947001', '947002', '947003'];
const now = Date.now(), old = now - ROOM_RETENTION_MS - 10800000, stamp = { '.sv': 'timestamp' };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(uid) { const seconds = Math.floor(Date.now() / 1000); return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: uid, uid, user_id: uid, iat: seconds, exp: seconds + 3600, auth_time: seconds, firebase: { identities: {}, sign_in_provider: 'anonymous' } })}.`; }
async function request(node, { method = 'GET', uid = 'stranger', admin = false, value, headers = {}, params = {} } = {}) {
  const url = new URL(`${node}.json`, ORIGIN + '/'); url.searchParams.set('ns', PROJECT);
  if (!admin) url.searchParams.set('auth', token(uid));
  for (const [key, item] of Object.entries(params)) url.searchParams.set(key, JSON.stringify(item));
  const result = await fetch(url, { method, headers: { ...headers, ...(admin ? { Authorization: 'Bearer owner' } : {}), ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(value !== undefined ? { body: JSON.stringify(value) } : {}), signal: AbortSignal.timeout(20000) });
  return { status: result.status, value: await result.json(), etag: result.headers.get('etag') };
}
const ok = result => { assert.equal(result.status, 200, JSON.stringify(result.value).slice(0, 300)); return result.value; };
const denied = result => assert.ok([401, 403].includes(result.status), JSON.stringify(result));
const put = (node, value, uid = 'p1') => request(node, { method: 'PUT', uid, value });
const room = (code, createdAt = old) => ({ version: 1, code, createdAt, ownerUid: 'p1', datasetId: 'futbol', mode: 'frequency', round: 1, starterSeat: 'p1', revision: 1, status: 'playing', players: { p1: { uid: 'p1', name: 'Ada' }, p2: { uid: 'p2', name: 'Efe' } }, game: createCooperative('frequency', Array.from({ length: 20 }, (_, i) => i + 1)), lastAction: { kind: 'start', seat: 'p1' } });
const entry = (instance = old, lastActivityAt = old) => ({ instance, lastActivityAt, state: 'active' });
async function seed(code, createdAt = old, lastActivityAt = old) { ok(await request(`rooms/${code}`, { method: 'PUT', admin: true, value: room(code, createdAt) })); ok(await request(`cleanupIndex/${code}`, { method: 'PUT', admin: true, value: entry(createdAt, lastActivityAt) })); }
async function cleanup() { for (const code of CODES) for (const node of Object.keys(purgePaths(code))) ok(await request(node, { method: 'DELETE', admin: true })); }
let passed = 0;
async function check(label, action) { await action(); passed++; console.log('PASS', label); }
try {
  ok(await request('.settings/rules', { method: 'PUT', admin: true, value: JSON.parse(await readFile(new URL('../firebase.rules.json', import.meta.url), 'utf8')) }));
  await cleanup();
  const code = CODES[0], freshCode = CODES[1];
  await seed(code); await seed(freshCode, now, now);
  await check('active room codes cannot be enumerated or read from the cleanup index', async () => {
    denied(await request('cleanupIndex')); denied(await request(`cleanupIndex/${freshCode}`));
    denied(await request('cleanupIndex', { params: { orderBy: 'lastActivityAt', endAt: now, limitToFirst: 100 } }));
    denied(await request('cleanupIndex', { params: { orderBy: 'lastActivityAt', endAt: cleanupCutoff(now) } }));
    denied(await request('cleanupIndex', { params: { orderBy: 'lastActivityAt', endAt: cleanupCutoff(now), limitToFirst: 101 } }));
    const list = ok(await request('cleanupIndex', { params: { orderBy: 'lastActivityAt', endAt: cleanupCutoff(now), limitToFirst: 100 } }));
    assert.deepEqual(Object.keys(list), [code]);
  });
  await check('recent rooms cannot be claimed, backdated or directly deleted', async () => {
    denied(await put(`cleanupIndex/${freshCode}`, { ...entry(now, now), state: 'deleting' }, 'stranger'));
    denied(await put(`cleanupIndex/${freshCode}`, entry(now, old), 'p1'));
    denied(await request('', { method: 'PATCH', value: purgePaths(freshCode) }));
  });
  await check('an active presence protects an otherwise expired room', async () => {
    ok(await request(`presence/${code}/p1/tab`, { method: 'PUT', admin: true, value: { connectedAt: old } }));
    denied(await put(`cleanupIndex/${code}`, { ...entry(), state: 'deleting' }, 'stranger'));
    ok(await request(`presence/${code}`, { method: 'DELETE', admin: true }));
  });
  await check('a concurrent member heartbeat invalidates an old cleanup transaction', async () => {
    const snapshot = await request(`cleanupIndex/${code}`, { headers: { 'X-Firebase-ETag': 'true' } });
    ok(await put(`cleanupIndex/${code}`, { instance: old, lastActivityAt: stamp, state: 'active' }, 'p1'));
    const stale = await request(`cleanupIndex/${code}`, { method: 'PUT', value: { ...entry(), state: 'deleting' }, headers: { 'if-match': snapshot.etag } });
    assert.ok([401, 403, 412].includes(stale.status));
    denied(await request('', { method: 'PATCH', value: purgePaths(code) }));
    await seed(code);
  });
  await check('an old index cannot lock a newer room instance', async () => {
    ok(await request(`cleanupIndex/${freshCode}`, { method: 'PUT', admin: true, value: entry(old) }));
    denied(await put(`cleanupIndex/${freshCode}`, { ...entry(), state: 'deleting' }, 'stranger'));
    await seed(freshCode, now, now);
  });
  await check('a cleanup lock does not expose unfinished private choices', async () => {
    ok(await request(`privateGames/${code}/r1/frequency/q0/p1`, { method: 'PUT', admin: true, value: { cardId: 1, locked: true } }));
    denied(await request(`privateGames/${code}`));
    ok(await put(`cleanupIndex/${code}`, { ...entry(), state: 'deleting' }, 'stranger'));
    denied(await request(`privateGames/${code}`));
  });
  await check('locked rooms reject every lower writer and cannot be revived', async () => {
    denied(await put(`cleanupIndex/${code}`, { instance: old, lastActivityAt: stamp, state: 'active' }, 'p1'));
    denied(await put(`privateGames/${code}/r1/frequency/q0/p2`, { cardId: 1, locked: true }, 'p2'));
    denied(await put(`presence/${code}/p1/newtab`, { connectedAt: stamp }, 'p1'));
    denied(await put(`reactions/${code}/p1`, { seq: 1, type: 'heart', sentAt: stamp }, 'p1'));
  });
  await check('partial deletion is denied; one atomic purge removes all five branches', async () => {
    denied(await request(`rooms/${code}`, { method: 'DELETE' }));
    denied(await request(`privateGames/${code}`, { method: 'DELETE' }));
    ok(await request('', { method: 'PATCH', value: purgePaths(code) }));
    for (const node of Object.keys(purgePaths(code))) assert.equal(ok(await request(node, { admin: true })), null);
  });
  await check('a reserved code and instance are required when creating a new room', async () => {
    const waiting = { ...room(code, stamp), mode: 'auction', status: 'waiting', revision: 0, players: { p1: { uid: 'p1', name: 'Ada' } } }; delete waiting.game; delete waiting.lastAction;
    denied(await put(`rooms/${code}`, waiting));
    denied(await put(`cleanupIndex/${code}`, { instance: old, lastActivityAt: stamp, state: 'reserved', reserverUid: 'p1' }));
    denied(await put(`cleanupIndex/${code}`, { instance: now + 3600000, lastActivityAt: stamp, state: 'reserved', reserverUid: 'p1' }));
    const reserved = ok(await put(`cleanupIndex/${code}`, { instance: now - 60000, lastActivityAt: stamp, state: 'reserved', reserverUid: 'p1' }));
    const created = ok(await put(`rooms/${code}`, { ...waiting, createdAt: reserved.instance }));
    ok(await put(`cleanupIndex/${code}`, { instance: created.createdAt, lastActivityAt: stamp, state: 'active' }));
    denied(await request(`cleanupIndex/${code}`));
  });
  await check('legacy rooms get a full retention grace period without leaking their state', async () => {
    const legacy = CODES[2]; ok(await request(`rooms/${legacy}`, { method: 'PUT', admin: true, value: room(legacy) }));
    ok(await put(`cleanupIndex/${legacy}`, { instance: old, lastActivityAt: stamp, state: 'active' }, 'stranger'));
    denied(await put(`cleanupIndex/${legacy}`, { ...entry(), state: 'deleting' }, 'stranger'));
    denied(await request(`rooms/${legacy}`));
  });
  await check('abandoned reservations expire without needing a room record', async () => {
    const orphan = CODES[2]; ok(await request(`rooms/${orphan}`, { method: 'DELETE', admin: true }));
    ok(await request(`cleanupIndex/${orphan}`, { method: 'PUT', admin: true, value: { ...entry(), state: 'reserved', reserverUid: 'p1' } }));
    ok(await put(`cleanupIndex/${orphan}`, { ...entry(), state: 'deleting' }, 'stranger'));
    ok(await request('', { method: 'PATCH', value: purgePaths(orphan) }));
  });
  console.log(`Room cleanup integration: ${passed} checks passed, 0 skipped.`);
} finally { await cleanup(); }
