import test from 'node:test';
import assert from 'node:assert/strict';
import { createCooperativeOnline } from '../js/cooperative-online.js';
import { createCooperative } from '../js/cooperative.js';
import { RoomError } from '../js/room-state.js';

const HOST = 'private-host';
const GUEST = 'private-guest';
const clone = value => value == null ? null : structuredClone(value);
const snapshot = value => ({ val: () => clone(value) });
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}
function room(mode = 'frequency') {
  return { code: '918012', round: 1, status: 'playing', mode,
    players: { p1: { uid: HOST }, p2: { uid: GUEST } },
    game: createCooperative(mode, Array.from({ length: 30 }, (_, index) => index + 1)) };
}
const rootFor = current => `privateGames/${current.code}/r${current.round}/${current.mode === 'frequency'
  ? `frequency/q${current.game.roundIndex}` : 'ranking'}`;
const slots = ids => Object.fromEntries(ids.map((id, index) => [`s${index + 1}`, id]));

// Controlled listeners exercise our client adapter, not RTDB authorization.
// Real rules, including forbidden parent reads, have separate emulator checks.
function fixture(uid = HOST) {
  const db = {};
  const stops = new Set();
  const listeners = new Set();
  const listenerHistory = [];
  const records = new Map();
  const transactions = [];
  let closed = false;
  let transactionGate = null;
  const assertOnline = () => {
    if (closed) throw new RoomError('Oyuncu oturumu kapandı.');
  };
  const dependencies = {
    uid, db, stops, assertOnline,
    ref(target, path) { assert.equal(target, db); return { path }; },
    onValue(reference, callback, onError) {
      const listener = { path: reference.path, callback, onError, ready: false };
      listeners.add(listener); listenerHistory.push(listener);
      return () => listeners.delete(listener);
    },
    async transact(path, reducer) {
      assertOnline();
      // Mimic the cold SDK cache: only a live, synchronized listener retains it.
      const retained = () => [...listeners].some(listener => listener.path === path && listener.ready);
      assert.equal(retained(), true, 'The protected read must survive into its transaction.');
      const transaction = { path, committed: false }; transactions.push(transaction);
      let proposed = reducer(clone(records.get(path)));
      const gate = transactionGate; transactionGate = null;
      if (gate) {
        await gate.promise;
        assertOnline();
        assert.equal(retained(), true, 'The cache listener must survive until the write settles.');
        proposed = reducer(clone(records.get(path)));
      }
      records.set(path, clone(proposed));
      transaction.committed = true;
      return clone(proposed);
    },
  };
  return {
    service: createCooperativeOnline(dependencies), stops, records, transactions, listenerHistory,
    emit(path, value = records.get(path)) {
      for (const listener of [...listeners]) if (listener.path === path) {
        listener.ready = true;
        listener.callback(snapshot(value));
      }
    },
    cancel(path, error) {
      for (const listener of [...listeners]) if (listener.path === path) {
        // Permission cancellation removes the SDK listener before its callback.
        listeners.delete(listener);
        listener.onError?.(error);
      }
    },
    count(path) { return [...listeners].filter(listener => !path || listener.path === path).length; },
    holdTransaction() { const gate = deferred(); transactionGate = gate; return gate; },
    dispose() { closed = true; for (const stop of [...stops]) stop(); },
  };
}

test('partner progress can load first without enabling actions or revealing private selections', () => {
  const state = fixture(), current = room(), base = rootFor(current), values = [];
  const stop = state.service.watchCooperative(current, value => values.push(value));
  assert.deepEqual(state.listenerHistory.map(listener => listener.path), [`${base}/p1`, `${base}/p2/locked`]);
  assert.equal(values.length, 0);
  state.emit(`${base}/p2/locked`, true);
  assert.deepEqual(values.at(-1), { mine: null, opponentProgress: 1, revealed: null, loaded: false });
  assert.equal(state.count(`${base}/p2`), 0);
  state.emit(`${base}/p1`, null);
  assert.equal(values.at(-1).loaded, true);
  assert.equal(values.at(-1).revealed, null);
  assert.equal(state.count(`${base}/p2`), 0);
  stop();
  assert.equal(state.count(), 0);
  assert.equal(state.stops.size, 0);
});

test('frequency reads the opponent choice only after both locks and maps seats for either client', () => {
  for (const [uid, own, opponent] of [[HOST, 'p1', 'p2'], [GUEST, 'p2', 'p1']]) {
    const state = fixture(uid), current = room(), base = rootFor(current), values = [];
    const stop = state.service.watchCooperative(current, value => values.push(value));
    state.emit(`${base}/${own}`, { cardId: 1, locked: true });
    assert.equal(values.at(-1).loaded, true);
    assert.equal(values.at(-1).mine.cardId, 1);
    assert.equal(values.at(-1).revealed, null);
    assert.equal(state.count(`${base}/${opponent}`), 0);
    state.emit(`${base}/${opponent}/locked`, true);
    assert.equal(state.count(`${base}/${opponent}`), 1);
    assert.equal(values.at(-1).revealed, null, 'A ready flag cannot stand in for the actual protected snapshot.');
    state.emit(`${base}/${opponent}`, { cardId: 2, locked: true });
    assert.deepEqual(values.at(-1).revealed, {
      [own]: { cardId: 1, locked: true }, [opponent]: { cardId: 2, locked: true },
    });
    stop();
  }
});

test('double ranking publishes progress while protecting every opponent slot until both finish', () => {
  const state = fixture(), current = room('double-ranking'), base = rootFor(current), values = [];
  const stop = state.service.watchCooperative(current, value => values.push(value));
  const own = { count: 8, slots: slots(current.game.deck) };
  const opponent = { count: 8, slots: slots([...current.game.deck].reverse()) };
  state.emit(`${base}/p1`, own);
  state.emit(`${base}/p2/count`, 7);
  assert.equal(values.at(-1).opponentProgress, 7);
  assert.equal(values.at(-1).revealed, null);
  assert.equal(state.count(`${base}/p2`), 0);
  state.emit(`${base}/p2/count`, 8);
  assert.equal(state.count(`${base}/p2`), 1);
  state.emit(`${base}/p2`, opponent);
  assert.deepEqual(values.at(-1).revealed, { p1: own, p2: opponent });
  stop();
});

test('two ranking clicks from one private count commit one next card and reject the stale frame', async () => {
  const state = fixture(), current = room('double-ranking'), path = `${rootFor(current)}/p1`;
  const first = state.service.rankCooperative(current, 1, 0);
  const second = state.service.rankCooperative(current, 8, 0);
  const stale = assert.rejects(second, /Bu kart zaten yerleştirildi/);
  assert.equal(state.count(path), 2);
  state.emit(path, null);
  assert.deepEqual(await first, { count: 1, slots: { s1: 1 } });
  await stale;
  assert.deepEqual(state.records.get(path), { count: 1, slots: { s1: 1 } });
  assert.equal(state.transactions.filter(transaction => transaction.committed).length, 1);
  assert.equal(state.count(), 0);
  const next = state.service.rankCooperative(current, 8, 1);
  state.emit(path);
  assert.deepEqual(await next, { count: 2, slots: { s1: 1, s8: 2 } });
  assert.equal(state.stops.size, 0);
});

test('a locked frequency selection stays immutable when another tab chooses a different card', async () => {
  const state = fixture(), current = room(), path = `${rootFor(current)}/p1`;
  const first = state.service.chooseFrequency(current, 1);
  state.emit(path, null);
  assert.deepEqual(await first, { cardId: 1, locked: true });
  const second = state.service.chooseFrequency(current, 2);
  const refused = assert.rejects(second, /Seçiminiz zaten kilitlendi/);
  state.emit(path);
  await refused;
  assert.deepEqual(state.records.get(path), { cardId: 1, locked: true });
  assert.equal(state.transactions.filter(transaction => transaction.committed).length, 1);
  assert.equal(state.count(), 0);
  assert.equal(state.stops.size, 0);
});

test('private transactions retain synchronized listeners until the write resolves and release them afterward', async () => {
  const state = fixture(), current = room(), path = `${rootFor(current)}/p1`;
  const gate = state.holdTransaction();
  const pending = state.service.chooseFrequency(current, 1);
  state.emit(path, null);
  await flush();
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].committed, false);
  assert.equal(state.count(path), 1);
  assert.equal(state.stops.size, 1);
  gate.release();
  assert.deepEqual(await pending, { cardId: 1, locked: true });
  assert.equal(state.count(path), 0);
  assert.equal(state.stops.size, 0);
});

test('a private transaction retry rejects a card already placed by another tab', async () => {
  const state = fixture(), current = room('double-ranking'), path = `${rootFor(current)}/p1`;
  const gate = state.holdTransaction();
  const pending = state.service.rankCooperative(current, 1, 0);
  const rejected = assert.rejects(pending, /Bu kart zaten yerleştirildi/);
  state.emit(path, null);
  await flush();
  state.records.set(path, { count: 1, slots: { s8: 1 } });
  gate.release();
  await rejected;
  assert.deepEqual(state.records.get(path), { count: 1, slots: { s8: 1 } });
  assert.equal(state.transactions.filter(transaction => transaction.committed).length, 0);
  assert.equal(state.count(), 0);
  assert.equal(state.stops.size, 0);
});

test('ending a session while a protected transaction is pending cannot commit the old identity', async () => {
  const state = fixture(), current = room(), path = `${rootFor(current)}/p1`;
  const gate = state.holdTransaction();
  const pending = state.service.chooseFrequency(current, 1);
  const rejected = assert.rejects(pending, /Oyuncu oturumu kapandı/);
  state.emit(path, null);
  await flush();
  state.dispose();
  gate.release();
  await rejected;
  assert.equal(state.transactions.filter(transaction => transaction.committed).length, 0);
  assert.equal(state.records.size, 0);
  assert.equal(state.count(), 0);
  assert.equal(state.stops.size, 0);
});

test('private clicks keep their captured round and card while the caller moves to a newer room snapshot', async () => {
  for (const mode of ['frequency', 'double-ranking']) {
    const state = fixture(), current = room(mode), path = `${rootFor(current)}/p1`;
    const pending = mode === 'frequency' ? state.service.chooseFrequency(current, 1)
      : state.service.rankCooperative(current, 6, 0);
    current.round = 2;
    if (mode === 'frequency') current.game.roundIndex = 1;
    current.game.deck[0] = 900;
    state.emit(path, null);
    await pending;
    assert.equal(state.transactions[0].path, path);
    assert.deepEqual(state.records.get(path), mode === 'frequency' ? { cardId: 1, locked: true }
      : { count: 1, slots: { s6: 1 } });
  }
});

test('permission cancellation frees the opponent listener for a later synchronized retry', () => {
  const state = fixture(), current = room(), base = rootFor(current), values = [], errors = [];
  const stop = state.service.watchCooperative(current, value => values.push(value), error => errors.push(error));
  state.emit(`${base}/p1`, { cardId: 1, locked: true });
  state.emit(`${base}/p2/locked`, true);
  const denied = Object.assign(new Error('permission denied'), { code: 'PERMISSION_DENIED' });
  state.cancel(`${base}/p2`, denied);
  assert.deepEqual(errors, [denied]);
  assert.equal(state.count(`${base}/p2`), 0);
  state.emit(`${base}/p2/locked`, true);
  assert.equal(state.count(`${base}/p2`), 1);
  assert.equal(state.listenerHistory.filter(listener => listener.path === `${base}/p2`).length, 2);
  state.emit(`${base}/p2`, { cardId: 2, locked: true });
  assert.deepEqual(values.at(-1).revealed, { p1: { cardId: 1, locked: true }, p2: { cardId: 2, locked: true } });
  stop();
});

test('stopping or signing out cancels all watchers and suppresses delayed value and error callbacks', () => {
  const state = fixture(), current = room(), base = rootFor(current), values = [], errors = [];
  const stop = state.service.watchCooperative(current, value => values.push(value), error => errors.push(error));
  state.emit(`${base}/p1`, { cardId: 1, locked: true });
  state.emit(`${base}/p2/locked`, true);
  state.emit(`${base}/p2`, { cardId: 2, locked: true });
  assert.equal(state.count(), 3);
  const before = values.length;
  state.dispose();
  stop();
  assert.equal(state.count(), 0);
  assert.equal(state.stops.size, 0);
  for (const listener of state.listenerHistory) {
    listener.callback(snapshot(listener.path.endsWith('/locked') ? true : { cardId: 2, locked: true }));
    listener.onError?.(new Error('late cancelled callback'));
  }
  assert.equal(values.length, before);
  assert.deepEqual(errors, []);
  assert.throws(() => state.service.watchCooperative(current, () => {}), /Oyuncu oturumu kapandı/);
});

test('session cleanup during the initial private read rejects pending actions before any transaction', async () => {
  for (const mode of ['frequency', 'double-ranking']) {
    const state = fixture(), current = room(mode);
    const pending = mode === 'frequency' ? state.service.chooseFrequency(current, 1)
      : state.service.rankCooperative(current, 4, 0);
    const refused = assert.rejects(pending, /Oyuncu oturumu kapandı/);
    assert.equal(state.count(), 1);
    state.dispose();
    assert.equal(state.count(), 0);
    assert.equal(state.stops.size, 0);
    for (const listener of state.listenerHistory) listener.callback(snapshot(null));
    await refused;
    assert.equal(state.transactions.length, 0);
    assert.equal(state.records.size, 0);
  }
});

test('a denied private read closes its temporary listener without attempting a write', async () => {
  const state = fixture(), current = room(), path = `${rootFor(current)}/p1`;
  const pending = state.service.chooseFrequency(current, 1);
  const denied = Object.assign(new Error('permission denied'), { code: 'PERMISSION_DENIED' });
  const refused = assert.rejects(pending, error => error === denied);
  state.cancel(path, denied);
  await refused;
  assert.equal(state.transactions.length, 0);
  assert.equal(state.count(), 0);
  assert.equal(state.stops.size, 0);
});

test('invalid mode, role, pair, slot, count and completed frames cannot create protected writes', async () => {
  const state = fixture(), frequency = room(), double = room('double-ranking');
  await assert.rejects(state.service.chooseFrequency(frequency, 3), RoomError);
  await assert.rejects(state.service.chooseFrequency({ ...frequency, status: 'finished' }, 1), RoomError);
  await assert.rejects(state.service.chooseFrequency({ ...frequency, game: { ...frequency.game, stage: 'reveal' } }, 1), RoomError);
  await assert.rejects(state.service.chooseFrequency(double, 1), RoomError);
  for (const [slot, count] of [[0, 0], [9, 0], ['1', 0], [1, -1], [1, 8], [1, '0']]) {
    await assert.rejects(state.service.rankCooperative(double, slot, count), RoomError);
  }
  await assert.rejects(state.service.rankCooperative(frequency, 1, 0), RoomError);
  const outsider = fixture('unseated-user');
  assert.throws(() => outsider.service.watchCooperative(frequency, () => {}), RoomError);
  await assert.rejects(outsider.service.chooseFrequency(frequency, 1), RoomError);
  await assert.rejects(outsider.service.rankCooperative(double, 1, 0), RoomError);
  assert.equal(state.count(), 0);
  assert.equal(state.transactions.length, 0);
  assert.equal(outsider.transactions.length, 0);
});
