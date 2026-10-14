import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { connectFirebase } from '../js/firebase-room.js';
import { createPartyRoom, changePartyRoom, encodePartyRoom } from '../js/party-room-state.js';

globalThis.crypto ||= webcrypto;
const flush = () => new Promise(resolve => setImmediate(resolve));
const clone = value => value == null ? null : structuredClone(value);
const snap = value => ({ val: () => clone(value), exists: () => value != null });
function deferred() { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; }

// Controlled service lifecycle fixture. Firebase authorization is tested by the
// separate emulator suite; this checks retained caches, codecs and cancellation.
function fixture(uid = 'host') {
  const records = new Map(), listeners = new Set(), authListeners = new Set();
  const auth = { currentUser: { uid }, async authStateReady() {} }, app = {}, db = {};
  let retryGate = null, readGate = null;
  const transactions = [];
  const read = path => {
    if (records.has(path)) return records.get(path);
    const parts = path.split('/');
    for (let end = parts.length - 1; end > 0; end--) {
      const ancestor = parts.slice(0, end).join('/');
      if (records.has(ancestor)) return parts.slice(end).reduce((item, key) => item?.[key], records.get(ancestor));
    }
    return undefined;
  };
  const emitAuth = user => {
    auth.currentUser = user;
    for (const listener of [...authListeners]) queueMicrotask(() => { if (authListeners.has(listener)) listener(user); });
  };
  const sdk = {
    getDatabase: () => db, ref: (_, path = '') => ({ path }),
    serverTimestamp: () => Date.now(), goOnline() {}, goOffline() {},
    query: reference => reference, orderByChild: value => value, endAt: value => value, limitToFirst: value => value,
    async update() {}, async get(reference) { return snap(read(reference.path)); },
    onValue(reference, callback) {
      const listener = { path: reference.path, callback, ready: false }; listeners.add(listener);
      const gate = readGate; readGate = null;
      queueMicrotask(async () => {
        if (gate) await gate.promise;
        if (!listeners.has(listener)) return;
        listener.ready = true;
        callback(snap(reference.path === '.info/connected' ? true : read(reference.path)));
      });
      return () => listeners.delete(listener);
    },
    async runTransaction(reference, reducer, options) {
      assert.equal(options.applyLocally, false);
      const retained = !reference.path.startsWith('rooms/') || [...listeners].some(listener => listener.ready && listener.path === reference.path);
      let value = reducer(retained ? clone(read(reference.path)) : null);
      const gate = retryGate; retryGate = null;
      if (gate) { await gate.promise; value = reducer(clone(read(reference.path))); }
      transactions.push({ path: reference.path, value: clone(value), committed: value !== undefined });
      if (value === undefined) return { committed: false, snapshot: snap(read(reference.path)) };
      if (value == null) records.delete(reference.path); else records.set(reference.path, clone(value));
      return { committed: true, snapshot: snap(read(reference.path)) };
    },
    onDisconnect() { return { async remove() {}, async cancel() {} }; },
  };
  return { records, listeners, auth, transactions, emitAuth,
    holdRead() { readGate = deferred(); return readGate; }, holdRetry() { retryGate = deferred(); return retryGate; },
    loadSDK: async () => [
      { getApps: () => [app], getApp: () => app },
      { getAuth: () => auth, browserLocalPersistence: {}, async setPersistence() {},
        async signInAnonymously() { return { user: auth.currentUser }; },
        onAuthStateChanged(_, callback) { authListeners.add(callback); queueMicrotask(() => { if (authListeners.has(callback)) callback(auth.currentUser); }); return () => authListeners.delete(callback); },
        async signOut() { emitAuth(null); } }, sdk,
    ],
  };
}
async function open(t, uid) {
  const f = fixture(uid);
  const service = await connectFirebase(() => {}, () => {}, f.loadSDK);
  await flush(); t.after(() => service.dispose()); return { f, service };
}
function room(mode = 'telepathy', count = 2) {
  const result = createPartyRoom({ code: '234567', uid: 'host', name: 'Ada', createdAt: 1234, datasetId: 'futbol', mode });
  for (let index = 2; index <= count; index++) result.players[`p${index}`] = { uid: `guest${index}`, name: `Oyuncu ${index}` };
  return result;
}
const privateListeners = f => [...f.listeners].filter(listener => listener.path.startsWith('privateGames/'));

test('new rooms opt into version two while legacy creation keeps its six-mode contract', async t => {
  const { f, service } = await open(t, 'host');
  const modern = await service.createRoom('Ada', 'futbol', 'telepathy', { version: 2 });
  assert.equal(modern.version, 2); assert.equal(modern.mode, 'telepathy'); assert.equal(modern.status, 'waiting');
  assert.deepEqual(modern.players, { p1: { uid: 'host', name: 'Ada' } });
  const count = f.transactions.length;
  await assert.rejects(service.createRoom('Ada', 'futbol', 'sealed-auction'), /henüz/);
  assert.equal(f.transactions.length, count);
  const legacy = await service.createRoom('Ada', 'futbol', 'auction'); assert.equal(legacy.version, 1);
});

test('party mutations encode only the new wire branch and every service snapshot is decoded', async t => {
  const { f, service } = await open(t, 'host'), waiting = room();
  f.records.set('rooms/234567', waiting);
  const watched = []; const stop = service.watchRoom('234567', value => watched.push(value)); await flush();
  const result = await service.mutateRoom('234567', value => changePartyRoom(value, 'host', value.revision, 'start', { deck: Array.from({ length: 25 }, (_, i) => i + 1) }));
  assert.ok(result.game); assert.equal(result.partyGame, undefined);
  assert.ok(f.records.get('rooms/234567').partyGame); assert.equal(f.records.get('rooms/234567').game, undefined);
  stop();
  const after = []; const stopAfter = service.watchRoom('234567', value => after.push(value)); await flush();
  assert.deepEqual(after[0], result); stopAfter();
  assert.equal(watched[0].version, 2);
});

test('third and fourth players join through a retained full-room cache without overwriting immutable identity', async t => {
  const { f, service } = await open(t, 'guest3');
  f.records.set('rooms/234567', room());
  const joined = await service.joinRoom('234567', 'Deniz');
  assert.deepEqual(joined.players.p3, { uid: 'guest3', name: 'Deniz' }); assert.equal(joined.revision, 1);
  assert.deepEqual(joined.players.p1, { uid: 'host', name: 'Ada' });
  const count = f.transactions.length;
  assert.deepEqual(await service.joinRoom('234567', 'İsim değişmesin'), joined);
  assert.equal(f.transactions.length, count);
  assert.equal([...f.listeners].some(listener => listener.path === 'rooms/234567'), false);
});

test('a same-UID join racing from another tab aborts the rewrite and returns its existing membership', async t => {
  const { f, service } = await open(t, 'guest3');
  const waiting = room(); f.records.set('rooms/234567', waiting);
  const gate = f.holdRetry(); const pending = service.joinRoom('234567', 'Yeni isim'); await flush();
  const winner = { ...waiting, revision: 1, players: { ...waiting.players, p3: { uid: 'guest3', name: 'İlk isim' } } };
  f.records.set('rooms/234567', winner); gate.release();
  assert.deepEqual(await pending, winner); assert.equal(f.transactions.at(-1).committed, false);
  assert.deepEqual(f.records.get('rooms/234567'), winner);
});

test('join races preserve a concurrently started table and refuse an extra active player', async t => {
  const { f, service } = await open(t, 'guest3'); const waiting = room();
  f.records.set('rooms/234567', waiting);
  const gate = f.holdRetry(); const pending = service.joinRoom('234567', 'Deniz'); const rejected = assert.rejects(pending, /Oyun başladı/); await flush();
  const started = changePartyRoom(waiting, 'host', waiting.revision, 'start', { deck: Array.from({ length: 25 }, (_, i) => i + 1) });
  f.records.set('rooms/234567', encodePartyRoom(started)); gate.release(); await rejected;
  assert.deepEqual(f.records.get('rooms/234567'), encodePartyRoom(started));
});

test('a later spectator joins a playing solo tournament while every existing move is retained', async t => {
  const { f, service } = await open(t, 'guest2');
  let solo = room('bracket', 1);
  solo = changePartyRoom(solo, 'host', 0, 'start', { deck: Array.from({ length: 16 }, (_, i) => i + 1) });
  solo = changePartyRoom(solo, 'host', solo.revision, 'choose', { cardId: 1 });
  const previous = structuredClone(solo.game); f.records.set('rooms/234567', solo);
  const joined = await service.joinRoom('234567', 'İzleyici');
  assert.deepEqual(joined.game, previous); assert.equal(joined.status, 'playing'); assert.equal(joined.revision, solo.revision + 1);
  assert.deepEqual(joined.players.p2, { uid: 'guest2', name: 'İzleyici' });
});

test('auth changes and disposal cancel private party watchers and pending retained submissions', async t => {
  for (const end of ['auth', 'dispose', 'signout']) {
    const { f, service } = await open(t, 'host');
    const playing = changePartyRoom(room(), 'host', 0, 'start', { deck: Array.from({ length: 25 }, (_, i) => i + 1) });
    service.watchParty(playing, () => {}); await flush(); assert.ok(privateListeners(f).length > 0);
    if (end === 'auth') f.emitAuth({ uid: 'different' });
    else if (end === 'dispose') service.dispose();
    else await service.signOut();
    await flush(); assert.equal(privateListeners(f).length, 0);
    await assert.rejects(service.submitParty(playing, { cardId: 1 }), /oturumu kapandı/);
  }
});

test('disposal cancels a pending party read before it can write a late choice', async t => {
  const { f, service } = await open(t, 'host');
  const playing = changePartyRoom(room(), 'host', 0, 'start', { deck: Array.from({ length: 25 }, (_, i) => i + 1) });
  const gate = f.holdRead(); const pending = service.submitParty(playing, { cardId: 1 });
  const rejected = assert.rejects(pending, /oturumu kapandı/); service.dispose(); gate.release(); await rejected;
  assert.equal(f.transactions.filter(item => item.path.startsWith('privateGames/')).length, 0);
  assert.equal(privateListeners(f).length, 0);
});
