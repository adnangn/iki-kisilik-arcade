import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_RETENTION_MS, cleanupCutoff, expiredEntry, claimExpired, purgePaths, createRoomLifecycle } from '../js/room-lifecycle.js';
import { cleanupRooms } from '../tools/cleanup-rooms.mjs';
const now = 1800000000000;
const old = { instance: 100, lastActivityAt: now - ROOM_RETENTION_MS - 10800000, state: 'active' };
test('retention is seven days and claims preserve the exact expired instance', () => {
  assert.equal(ROOM_RETENTION_MS, 604800000);
  assert.equal(expiredEntry(old, now), true);
  assert.equal(expiredEntry({ ...old, lastActivityAt: now }, now), false);
  assert.deepEqual(claimExpired(old, 100, now), { ...old, state: 'deleting' });
  assert.throws(() => claimExpired(old, 200, now));
  assert.deepEqual(old.state, 'active');
  assert.equal(expiredEntry(null, now), false);
});
test('purge removes exactly the five room branches and rejects unsafe paths', () => {
  assert.deepEqual(purgePaths('123456'), { 'rooms/123456': null, 'privateGames/123456': null, 'presence/123456': null, 'reactions/123456': null, 'cleanupIndex/123456': null });
  for (const code of ['1', '../rooms', '123456/private', '', 123456]) assert.throws(() => purgePaths(code));
});
function response(status, value, etag = 'tag') { return { status, ok: status === 200, json: async () => value, headers: { get: () => etag } }; }
function cliFixture({ conflict = false, presence = false, failPurge = false, alreadyPurged = false } = {}) {
  const calls = []; let reads = 0;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input); const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path: url.pathname, method: options.method || 'GET', params: Object.fromEntries(url.searchParams), body, headers: options.headers });
    if (url.pathname.endsWith('accounts:signUp')) return response(200, { idToken: 'ephemeral-token', localId: 'job-only' });
    if (url.pathname.endsWith('accounts:delete')) return response(200, {});
    if (url.pathname === '/cleanupIndex.json') return response(200, { '123456': old });
    if (url.pathname === '/cleanupIndex/123456.json' && (options.method || 'GET') === 'GET') {
      reads++; return response(200, alreadyPurged && reads > 1 ? null : conflict && reads > 1 ? { ...old, lastActivityAt: now } : old, `etag-${reads}`);
    }
    if (url.pathname === '/cleanupIndex/123456.json') return response(presence ? 403 : conflict ? 412 : 200, body);
    if (options.method === 'PATCH') return response(failPurge ? 403 : 200, {});
    throw new Error('Unexpected request');
  };
  return { calls, fetchImpl };
}
const config = { apiKey: 'public-test-key', databaseURL: 'https://test.invalid' };
test('scheduled cleanup reads only expired metadata, claims with ETag, purges atomically and closes its own identity', async () => {
  const fixture = cliFixture();
  assert.deepEqual(await cleanupRooms({ config, fetchImpl: fixture.fetchImpl, now }), { removed: 1, skipped: 0 });
  const list = fixture.calls.find(call => call.path === '/cleanupIndex.json');
  assert.equal(JSON.parse(list.params.limitToFirst), 100);
  assert.equal(JSON.parse(list.params.endAt), cleanupCutoff(now));
  const claim = fixture.calls.find(call => call.method === 'PUT');
  assert.equal(claim.headers['if-match'], 'etag-1'); assert.equal(claim.body.state, 'deleting');
  assert.deepEqual(fixture.calls.find(call => call.method === 'PATCH').body, purgePaths('123456'));
  assert.equal(fixture.calls.some(call => /privateGames|rooms\//.test(call.path)), false);
  assert.deepEqual(fixture.calls.at(-1).body, { idToken: 'ephemeral-token' });
});
test('a heartbeat winning an ETag race or an active presence prevents scheduled deletion', async () => {
  for (const options of [{ conflict: true }, { presence: true }]) {
    const fixture = cliFixture(options);
    assert.deepEqual(await cleanupRooms({ config, fetchImpl: fixture.fetchImpl, now }), { removed: 0, skipped: 1 });
    assert.equal(fixture.calls.some(call => call.method === 'PATCH'), false);
    assert.equal(fixture.calls.at(-1).path.endsWith('accounts:delete'), true);
  }
});
test('purge failures retain the deletion lock for a later run and still dispose the job account', async () => {
  const fixture = cliFixture({ failPurge: true });
  await assert.rejects(cleanupRooms({ config, fetchImpl: fixture.fetchImpl, now }), /Sonraki çalıştırma/);
  assert.equal(fixture.calls.at(-1).path.endsWith('accounts:delete'), true);
});

test('concurrent collectors accept a room already purged by the other collector', async () => {
  const fixture = cliFixture({ failPurge: true, alreadyPurged: true });
  assert.deepEqual(await cleanupRooms({ config, fetchImpl: fixture.fetchImpl, now }), { removed: 0, skipped: 1 });
  assert.equal(fixture.calls.at(-1).path.endsWith('accounts:delete'), true);
});
test('browser reservation precedes room creation, activity is private and stops cancel pending reads', async () => {
  const records = new Map(), reads = [], stops = new Set(), listeners = new Set();
  const dbSDK = {
    ref: (db, path = '') => ({ path }), serverTimestamp: () => now,
    onValue(reference, callback) {
      const listener = { path: reference.path, callback }; listeners.add(listener);
      queueMicrotask(() => { if (listeners.has(listener)) callback({ val: () => records.get(reference.path) ?? null }); });
      return () => listeners.delete(listener);
    },
    get: async reference => { reads.push(reference.path); return { val: () => records.get(reference.path) ?? null }; },
  };
  const transact = async (path, reducer) => { const next = reducer(records.get(path) ?? null); records.set(path, next); return next; };
  const helper = createRoomLifecycle({ uid: 'p1', db: {}, dbSDK, transact, assertOnline() {}, stops, clock: () => now });
  const reserved = await helper.reserveRoom('123456');
  assert.deepEqual(reserved, { instance: now - 60000, lastActivityAt: now, state: 'reserved', reserverUid: 'p1' });
  await assert.rejects(helper.reserveRoom('123456'), /CODE_COLLISION/);
  await helper.touchRoom({ code: '123456', createdAt: reserved.instance, players: { p1: { uid: 'p1' } } });
  assert.deepEqual(records.get('cleanupIndex/123456'), { instance: reserved.instance, lastActivityAt: now, state: 'active' });
  await assert.rejects(helper.touchRoom({ code: '123456', createdAt: now + 1, players: { p1: { uid: 'p1' } } }), /süresi doldu/);
  const pending = helper.reserveRoom('654321'); for (const stop of [...stops]) stop();
  await assert.rejects(pending, /oturumu kapandı/);
  assert.equal(listeners.size, 0); assert.deepEqual(reads, []);
});
