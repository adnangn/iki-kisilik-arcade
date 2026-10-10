import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { connectFirebase } from '../js/firebase-room.js';
import { RoomError } from '../js/room-state.js';

globalThis.crypto ||= webcrypto;

// These tests exercise our service's lifecycle with a controlled SDK double.
// They do not simulate Firebase authorization or replace emulator/browser tests.
const clone = value => value === undefined ? null : structuredClone(value);
const snapshot = value => ({ val: () => clone(value) });
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

function sdkFixture(initialUser = { uid: 'session-user' }) {
  const events = [];
  const records = new Map();
  const disconnectRemovals = new Set();
  const dbListeners = new Set();
  const authListeners = new Set();
  const apps = [];
  const auth = { currentUser: initialUser, async authStateReady() { events.push({ type: 'auth-ready' }); } };
  const db = {};
  let connected = true;
  let nextDisconnectGate = null;
  let nextTransactionRetryGate = null;

  function emitAuth(user) {
    auth.currentUser = user;
    for (const listener of [...authListeners]) queueMicrotask(() => {
      if (authListeners.has(listener)) listener(user);
    });
  }
  function emitConnection(online) {
    if (connected && !online) {
      for (const path of disconnectRemovals) records.delete(path);
      disconnectRemovals.clear();
    }
    connected = online;
    for (const listener of [...dbListeners]) if (listener.path === '.info/connected') {
      queueMicrotask(() => { if (dbListeners.has(listener)) listener.callback(snapshot(online)); });
    }
  }
  const appSDK = {
    getApps: () => [...apps],
    initializeApp() { const app = {}; apps.push(app); events.push({ type: 'initialize-app' }); return app; },
    getApp: () => apps[0],
  };
  const authSDK = {
    browserLocalPersistence: 'mock-local-persistence',
    getAuth: () => auth,
    async setPersistence(target, persistence) {
      assert.equal(target, auth); assert.equal(persistence, 'mock-local-persistence');
      events.push({ type: 'persistence' });
    },
    async signInAnonymously() {
      events.push({ type: 'anonymous-sign-in' });
      const user = { uid: 'new-anonymous-user' }; emitAuth(user); return { user };
    },
    onAuthStateChanged(target, callback) {
      assert.equal(target, auth); authListeners.add(callback);
      queueMicrotask(() => { if (authListeners.has(callback)) callback(auth.currentUser); });
      return () => authListeners.delete(callback);
    },
    async signOut() { events.push({ type: 'auth-sign-out' }); emitAuth(null); },
  };
  const dbSDK = {
    getDatabase: () => db,
    ref(target, path) { assert.equal(target, db); return { path }; },
    serverTimestamp: () => ({ '.sv': 'timestamp' }),
    goOnline(target) { assert.equal(target, db); events.push({ type: 'go-online' }); emitConnection(true); },
    goOffline(target) { assert.equal(target, db); events.push({ type: 'go-offline' }); emitConnection(false); },
    async get(reference) { return snapshot(records.get(reference.path)); },
    onValue(reference, callback) {
      const listener = { path: reference.path, callback }; dbListeners.add(listener);
      queueMicrotask(() => {
        if (dbListeners.has(listener)) callback(snapshot(reference.path === '.info/connected' ? connected : records.get(reference.path)));
      });
      return () => dbListeners.delete(listener);
    },
    async runTransaction(reference, reducer, options) {
      assert.equal(options?.applyLocally, false);
      let proposed = reducer(clone(records.get(reference.path)));
      const retryGate = nextTransactionRetryGate; nextTransactionRetryGate = null;
      if (retryGate) {
        await retryGate.promise;
        proposed = reducer(clone(records.get(reference.path)));
      }
      events.push({ type: 'transaction', path: reference.path, value: clone(proposed), aborted: proposed === undefined });
      if (proposed === undefined) return { committed: false, snapshot: snapshot(records.get(reference.path)) };
      if (proposed === null) records.delete(reference.path);
      else records.set(reference.path, clone(proposed));
      return { committed: true, snapshot: snapshot(records.get(reference.path)) };
    },
    onDisconnect(reference) {
      return {
        async remove() {
          events.push({ type: 'disconnect-register-start', path: reference.path });
          const gate = nextDisconnectGate; nextDisconnectGate = null;
          if (gate) await gate.promise;
          disconnectRemovals.add(reference.path);
          events.push({ type: 'disconnect-register-done', path: reference.path });
        },
        async cancel() {
          disconnectRemovals.delete(reference.path);
          events.push({ type: 'disconnect-cancel', path: reference.path });
        },
      };
    },
  };
  return {
    loadSDK: async () => [appSDK, authSDK, dbSDK],
    events, records, auth, emitAuth, emitConnection,
    holdNextDisconnect() { const gate = deferred(); nextDisconnectGate = gate; return gate; },
    retryNextTransaction() { const gate = deferred(); nextTransactionRetryGate = gate; return gate; },
    get connectionSubscriberCount() { return [...dbListeners].filter(item => item.path === '.info/connected').length; },
    get authSubscriberCount() { return authListeners.size; },
  };
}

async function openFixture(t, fixture = sdkFixture()) {
  const connections = [];
  let ended = 0;
  const service = await connectFirebase(value => connections.push(value), () => { ended += 1; }, fixture.loadSDK);
  await flush();
  t.after(() => service.dispose());
  return { fixture, service, connections, get ended() { return ended; } };
}
const presencePaths = fixture => [...fixture.records.keys()].filter(path => path.startsWith('presence/'));

test('the service persists auth, reuses an anonymous UID and brings a disposed database online again', async t => {
  const fixture = sdkFixture(null);
  const first = await openFixture(t, fixture);
  assert.equal(first.service.uid, 'new-anonymous-user');
  assert.equal(first.service.connected, true);
  assert.deepEqual(fixture.events.slice(0, 4).map(event => event.type),
    ['initialize-app', 'persistence', 'auth-ready', 'anonymous-sign-in']);
  first.service.dispose();
  assert.equal(first.service.connected, false);
  const second = await openFixture(t, fixture);
  assert.equal(second.service.uid, first.service.uid);
  assert.equal(second.service.connected, true);
  assert.equal(fixture.events.filter(event => event.type === 'initialize-app').length, 1);
  assert.equal(fixture.events.filter(event => event.type === 'anonymous-sign-in').length, 1);
  assert.equal(fixture.events.filter(event => event.type === 'go-online').length, 2);
  assert.equal(fixture.connectionSubscriberCount, 1);
});

test('UID changes and external sign-out dispose the old service and cannot revive its listeners', async t => {
  for (const user of [{ uid: 'another-user' }, null]) {
    const state = await openFixture(t);
    const { fixture, service } = state;
    const errors = [];
    await service.enterPresence('123456', error => errors.push(error));
    await flush();
    assert.equal(presencePaths(fixture).length, 1);
    fixture.emitAuth(user);
    await flush();
    assert.equal(state.ended, 1);
    assert.equal(service.connected, false);
    assert.equal(fixture.connectionSubscriberCount, 0);
    assert.equal(fixture.authSubscriberCount, 0);
    const count = fixture.events.filter(event => event.type === 'transaction').length;
    await assert.rejects(service.mutateRoom('123456', () => ({ bad: true })), RoomError);
    await assert.rejects(service.react('123456', 'laugh'), RoomError);
    await assert.rejects(service.joinRoom('123456', 'Ada'), RoomError);
    fixture.emitConnection(true); fixture.emitAuth(user);
    await flush();
    assert.equal(state.ended, 1);
    assert.equal(service.connected, false);
    assert.equal(fixture.events.filter(event => event.type === 'transaction').length, count);
    assert.deepEqual(errors, []);
  }
});

test('a transaction retry after UID replacement aborts before applying the old player reducer', async t => {
  const { fixture, service } = await openFixture(t);
  fixture.records.set('rooms/123456', { revision: 1 });
  const gate = fixture.retryNextTransaction();
  let reducerCalls = 0;
  const pending = service.mutateRoom('123456', current => { reducerCalls += 1; return { revision: current.revision + 1 }; });
  const rejected = assert.rejects(pending, RoomError);
  fixture.emitAuth({ uid: 'replacement' }); await flush();
  gate.release(); await rejected;
  assert.equal(reducerCalls, 1);
  assert.deepEqual(fixture.records.get('rooms/123456'), { revision: 1 });
  assert.equal(fixture.events.find(event => event.type === 'transaction').aborted, true);
});

test('same-UID auth refresh retains the connection and valid player mutations', async t => {
  const state = await openFixture(t);
  state.fixture.emitAuth({ uid: state.service.uid, refreshed: true }); await flush();
  assert.equal(state.ended, 0);
  assert.equal(state.service.connected, true);
  await state.service.react('123456', 'laugh');
  await state.service.react('123456', 'heart');
  assert.equal(state.fixture.records.get(`reactions/123456/${state.service.uid}`).seq, 2);
});

test('presence is published only after disconnect cleanup registration, including reconnect', async t => {
  const { fixture, service, connections } = await openFixture(t);
  const firstGate = fixture.holdNextDisconnect();
  const errors = [];
  await service.enterPresence('123456', error => errors.push(error)); await flush();
  assert.equal(presencePaths(fixture).length, 0);
  firstGate.release(); await flush();
  const [path] = presencePaths(fixture);
  assert.ok(path.startsWith(`presence/123456/${service.uid}/`));
  fixture.emitConnection(false); await flush();
  assert.equal(service.connected, false); assert.equal(fixture.records.has(path), false);
  await assert.rejects(service.react('123456', 'laugh'), RoomError);
  const reconnectGate = fixture.holdNextDisconnect();
  fixture.emitConnection(true); await flush();
  assert.equal(service.connected, true); assert.equal(fixture.records.has(path), false);
  reconnectGate.release(); await flush();
  assert.equal(fixture.records.has(path), true);
  const events = fixture.events.filter(event => event.path === path &&
    (event.type === 'disconnect-register-done' || event.type === 'transaction'));
  assert.deepEqual(events.map(event => event.type),
    ['disconnect-register-done', 'transaction', 'disconnect-register-done', 'transaction']);
  assert.deepEqual(connections, [true, false, true]); assert.deepEqual(errors, []);
});

test('two presence IDs remain isolated when one leaves and the other reconnects', async t => {
  const { fixture, service } = await openFixture(t);
  const errors = [];
  const stopFirst = await service.enterPresence('123456', error => errors.push(error)); await flush();
  const [firstPath] = presencePaths(fixture);
  const stopSecond = await service.enterPresence('123456', error => errors.push(error)); await flush();
  const secondPath = presencePaths(fixture).find(path => path !== firstPath);
  assert.ok(secondPath); assert.notEqual(firstPath, secondPath);
  const foreignPath = 'presence/123456/opponent/another-tab'; fixture.records.set(foreignPath, { connectedAt: 1 });
  await stopFirst();
  assert.equal(fixture.records.has(firstPath), false);
  assert.equal(fixture.records.has(secondPath), true); assert.equal(fixture.records.has(foreignPath), true);
  fixture.emitConnection(false); await flush(); fixture.emitConnection(true); await flush();
  assert.equal(fixture.records.has(firstPath), false); assert.equal(fixture.records.has(secondPath), true);
  assert.equal(fixture.records.has(foreignPath), true);
  await stopSecond();
  assert.deepEqual(presencePaths(fixture), [foreignPath]); assert.deepEqual(errors, []);
});

test('leaving during pending disconnect registration prevents a late online presence write', async t => {
  const { fixture, service } = await openFixture(t);
  const gate = fixture.holdNextDisconnect();
  const errors = [];
  const stop = await service.enterPresence('123456', error => errors.push(error)); await flush();
  const stopping = stop(); gate.release(); await stopping;
  assert.equal(presencePaths(fixture).length, 0);
  assert.equal(fixture.events.filter(event => event.type === 'transaction' && event.path.startsWith('presence/') && event.value !== null).length, 0);
  fixture.emitConnection(false); await flush(); fixture.emitConnection(true); await flush();
  assert.equal(presencePaths(fixture).length, 0); assert.deepEqual(errors, []);
});

test('explicit sign-out removes owned presence and cancels its fallback before ending auth', async t => {
  const { fixture, service } = await openFixture(t);
  const errors = [];
  await service.enterPresence('123456', error => errors.push(error)); await flush();
  const [path] = presencePaths(fixture);
  const foreignPath = 'presence/123456/opponent/another-tab'; fixture.records.set(foreignPath, { connectedAt: 1 });
  await service.signOut(); await flush();
  assert.equal(service.connected, false); assert.equal(fixture.auth.currentUser, null);
  assert.deepEqual(presencePaths(fixture), [foreignPath]);
  const remove = fixture.events.findIndex(event => event.type === 'transaction' && event.path === path && event.value === null);
  const cancel = fixture.events.findIndex(event => event.type === 'disconnect-cancel' && event.path === path);
  const signOut = fixture.events.findIndex(event => event.type === 'auth-sign-out');
  assert.ok(remove >= 0 && cancel > remove && signOut > cancel);
  assert.equal(fixture.connectionSubscriberCount, 0); assert.equal(fixture.authSubscriberCount, 0);
  await assert.rejects(service.react('123456', 'heart'), RoomError); assert.deepEqual(errors, []);
});
