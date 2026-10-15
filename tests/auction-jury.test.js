import test from 'node:test';
import assert from 'node:assert/strict';
import { auctionJuryContext, auctionJuryBallot, auctionJuryResult, createAuctionJury } from '../js/auction-jury.js';

const room = (count = 4, mode = 'auction') => {
  const seats = ['p1', 'p2', 'p3', 'p4'].slice(0, count);
  return { version: 2, code: '957701', createdAt: 123, round: 7, status: 'finished', mode,
    players: Object.fromEntries(seats.map(seat => [seat, { uid: seat, name: seat }])),
    game: { mode, phase: 'finished', seats } };
};
const ballot = (targetSeat, instance = 123) => ({ targetSeat, instance, locked: true });
function fake(uid = 'p1') {
  const listeners = [], values = new Map(), transactions = [], stops = new Set(); let online = true;
  const snapshot = value => ({ val: () => value ?? null });
  const service = createAuctionJury({ uid, db: {}, ref: (_db, path) => path, stops,
    assertOnline() { if (!online) throw new Error('closed'); },
    onValue(path, callback, error) { const entry = { path, callback, error, active: true }; listeners.push(entry); return () => { entry.active = false; }; },
    async transact(path, reducer) { transactions.push(path); const next = reducer(values.get(path)); values.set(path, next); return next; },
  });
  return { service, listeners, values, transactions, stops, snapshot,
    emit(path, value) { values.set(path, value); for (const entry of [...listeners]) if (entry.active && entry.path === path) entry.callback(snapshot(value)); },
    close() { online = false; for (const stop of [...stops]) stop(); },
  };
}

test('jury is scoped to a finished auction participant, current instance and round', () => {
  for (const mode of ['auction', 'sealed-auction']) assert.equal(auctionJuryContext(room(2, mode), 'p2').path, 'privateGames/957701/r7/jury');
  for (const mutate of [r => { r.status = 'playing'; }, r => { r.version = 1; }, r => { r.game.phase = 'playing'; },
    r => { r.mode = 'telepathy'; }, r => { r.game.seats = ['p1', 'p1']; }, r => { r.game.seats = ['p1', 'p5']; },
    r => { r.round = 0; }, r => { r.createdAt = NaN; }, r => { r.code = '../bad'; }]) {
    const value = room(); mutate(value); assert.throws(() => auctionJuryContext(value, 'p1'));
  }
  const value = room(2); value.players.p3 = { uid: 'new-player' };
  assert.throws(() => auctionJuryContext(value, 'new-player'));
  assert.throws(() => auctionJuryContext(value, 'stranger'));
});

test('a vote targets exactly one eligible group; own group is a legal two-player vote', () => {
  assert.deepEqual(auctionJuryBallot(room(2), 'p1', { targetSeat: 'p1' }), ballot('p1'));
  assert.deepEqual(auctionJuryBallot(room(2), 'p1', { targetSeat: 'p2', ignored: 42 }), ballot('p2'));
  for (const value of [null, [], {}, Object.create({ targetSeat: 'p2' }), { targetSeat: 'p3' }, { targetSeat: 1 }]) assert.throws(() => auctionJuryBallot(room(2), 'p1', value));
});

test('complete valid ballots count every participant once, preserving genuine ties', () => {
  assert.deepEqual(auctionJuryResult(['p1', 'p2'], { p1: ballot('p1'), p2: ballot('p2') }, 123),
    { counts: { p1: 1, p2: 1 }, leaders: ['p1', 'p2'], highest: 1, total: 2 });
  const votes = { p1: ballot('p2'), p2: ballot('p2'), p3: ballot('p4'), p4: ballot('p3') };
  assert.deepEqual(auctionJuryResult(['p1', 'p2', 'p3', 'p4'], votes, 123),
    { counts: { p1: 0, p2: 2, p3: 1, p4: 1 }, leaders: ['p2'], highest: 2, total: 4 });
  for (const value of [null, ballot('p2', 124), { ...ballot('p2'), locked: false }, ballot('p5'), { ...ballot('p2'), extra: 1 }]) {
    assert.equal(auctionJuryResult(['p1', 'p2'], { p1: ballot('p1'), p2: value }, 123), null);
  }
});

test('watcher reads only own choice and rival locks before all voters commit', () => {
  const value = room(), env = fake(), states = [], { path } = auctionJuryContext(value, 'p1');
  env.service.watchJury(value, state => states.push(state));
  env.emit(`${path}/p1`, null);
  for (const seat of value.game.seats) env.emit(`${path}/${seat}/locked`, seat !== 'p4');
  assert.equal(states.at(-1).loaded, true); assert.equal(states.at(-1).allLocked, false); assert.equal(states.at(-1).result, null);
  assert.equal(env.listeners.some(entry => entry.path === `${path}/p2`), false);
  env.emit(`${path}/p4/locked`, true);
  assert.equal(env.listeners.some(entry => entry.path === `${path}/p2`), true);
  for (const seat of ['p1', 'p2', 'p3']) env.emit(`${path}/${seat}`, ballot('p2'));
  assert.equal(states.at(-1).allLocked, true); assert.equal(states.at(-1).result, null); assert.equal(states.at(-1).votes, null);
  env.emit(`${path}/p4`, ballot('p1'));
  assert.equal(states.at(-1).result.counts.p2, 3);
  assert.deepEqual(states.at(-1).result.leaders, ['p2']);
});

test('reconnect restores the immutable own vote; a repeat cannot overwrite it', async () => {
  const current = room(2), env = fake(), { path } = auctionJuryContext(current, 'p1'), states = [];
  env.values.set(`${path}/p1`, ballot('p2'));
  env.service.watchJury(current, state => states.push(state));
  env.emit(`${path}/p1`, ballot('p2')); assert.equal(states.at(-1).mine.targetSeat, 'p2');
  const attempt = env.service.submitJury(current, { targetSeat: 'p1' });
  env.emit(`${path}/p1`, ballot('p2')); await assert.rejects(attempt, /kilitledin/);
  assert.equal(env.values.get(`${path}/p1`).targetSeat, 'p2');
});

test('submission captures its room scope before a later game replaces the caller snapshot', async () => {
  const current = room(2), env = fake(), { path } = auctionJuryContext(current, 'p1');
  const pending = env.service.submitJury(current, { targetSeat: 'p2' }); current.round++; current.createdAt++;
  env.emit(`${path}/p1`, null); const saved = await pending;
  assert.deepEqual(saved, ballot('p2')); assert.deepEqual(env.transactions, [`${path}/p1`]);
});

test('teardown and permission loss detach listeners, clear secrets and suppress delayed callbacks', () => {
  for (const fail of [false, true]) {
    const current = room(2), env = fake(), states = [], errors = [], { path } = auctionJuryContext(current, 'p1');
    const stop = env.service.watchJury(current, state => states.push(state), error => errors.push(error));
    env.emit(`${path}/p1`, ballot('p1'));
    const delayed = env.listeners[0].callback;
    if (fail) env.listeners[0].error(new Error('permission denied')); else stop();
    const count = states.length; delayed(env.snapshot(ballot('p2')));
    assert.equal(states.length, count); assert.ok(env.listeners.every(entry => !entry.active)); assert.equal(env.stops.size, 0);
    if (fail) { assert.equal(states.at(-1).votes, null); assert.equal(states.at(-1).mine, null); assert.equal(errors.length, 1); }
  }
});

test('closing the signed-in session cancels a pending vote before its transaction', async () => {
  const env = fake(), pending = env.service.submitJury(room(), { targetSeat: 'p2' }); env.close();
  await assert.rejects(pending, /oturumu kapandı/); assert.equal(env.transactions.length, 0); assert.equal(env.stops.size, 0);
});

test('synchronous subscription callbacks cannot create duplicate reveal listeners', () => {
  const current = room(2), stops = new Set(), paths = [];
  const { path } = auctionJuryContext(current, 'p1');
  const service = createAuctionJury({ uid: 'p1', stops, db: {}, ref: (_db, value) => value, assertOnline() {}, transact() {},
    onValue(key, callback) { paths.push(key); callback({ val: () => key.endsWith('/locked') ? true : ballot('p2') }); return () => {}; } });
  const states = [], stop = service.watchJury(current, state => states.push(state));
  assert.equal(paths.filter(key => key === `${path}/p2`).length, 1);
  assert.equal(states.at(-1).result.counts.p2, 2); stop(); assert.equal(stops.size, 0);
});
