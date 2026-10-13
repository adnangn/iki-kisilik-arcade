import test from 'node:test';
import assert from 'node:assert/strict';
import { changeRoom, RoomError, seatFor, hasOptionalSpectator, rematchStarter } from '../js/room-state.js';
import { createPrivateRank, placePrivateRank, CooperativeError } from '../js/cooperative.js';

const HOST = 'cooperative-host';
const GUEST = 'cooperative-guest';
const deck = Array.from({ length: 40 }, (_, index) => index + 1);
function waitingRoom(mode) {
  return { code: '918008', ownerUid: HOST, datasetId: 'futbol', mode, status: 'waiting',
    players: { p1: { uid: HOST, name: 'Ada' }, p2: { uid: GUEST, name: 'Deniz' } },
    starterSeat: 'p1', round: 1, revision: 0 };
}
function startedRoom(mode) { return changeRoom(waitingRoom(mode), HOST, 0, 'start', { deck }); }
function frequencyRound(room, uid = HOST) {
  const cardId = room.game.deck[room.game.roundIndex * 2];
  return changeRoom(room, uid, room.revision, 'frequency-reveal', { choices: { p1: cardId, p2: cardId } });
}
function finishFrequency(room) {
  while (room.status === 'playing') {
    room = frequencyRound(room, room.game.roundIndex % 2 ? GUEST : HOST);
    if (room.status === 'playing') room = changeRoom(room, GUEST, room.revision, 'frequency-next');
  }
  return room;
}
function privateLists(game) {
  let left = createPrivateRank();
  let right = createPrivateRank();
  for (let slot = 1; slot <= 8; slot++) {
    left = placePrivateRank(game.deck, left, slot);
    right = placePrivateRank(game.deck, right, 9 - slot);
  }
  return { p1: left.slots, p2: right.slots };
}

test('both cooperative modes require two seated players and only the owner starts the room', () => {
  for (const mode of ['frequency', 'double-ranking']) {
    const room = waitingRoom(mode);
    const alone = structuredClone(room);
    delete alone.players.p2;
    assert.equal(hasOptionalSpectator(room), false);
    assert.throws(() => changeRoom(alone, HOST, 0, 'start', { deck }), RoomError);
    assert.throws(() => changeRoom(room, GUEST, 0, 'start', { deck }), RoomError);
    assert.throws(() => changeRoom(room, 'outsider', 0, 'start', { deck }), RoomError);
    const started = startedRoom(mode);
    assert.equal(started.status, 'playing');
    assert.equal(started.revision, 1);
    assert.equal(started.game.activeSeat, undefined);
    assert.equal(seatFor(started, HOST), 'p1');
    assert.equal(seatFor(started, GUEST), 'p2');
    assert.throws(() => changeRoom(started, HOST, started.revision, 'start', { deck }), RoomError);
  }
});

test('mode boundaries, unknown actors and stale revisions reject cooperative commands', () => {
  const frequency = startedRoom('frequency');
  const ranking = startedRoom('double-ranking');
  for (const room of [frequency, ranking]) {
    for (const [command, payload] of [['bid', { amount: 3 }], ['pass', {}], ['rank', { slot: 1 }],
      ['choose', { cardId: 1 }], ['assign', { role: 'start', cardId: 1 }]]) {
      assert.throws(() => changeRoom(room, HOST, room.revision, command, payload), RoomError);
    }
    assert.throws(() => changeRoom(room, HOST, room.revision, 'rematch', { deck }), RoomError);
  }
  for (const command of ['frequency-reveal', 'frequency-next']) {
    assert.throws(() => changeRoom(ranking, HOST, ranking.revision, command, { choices: { p1: 1, p2: 1 } }), RoomError);
    assert.throws(() => changeRoom(frequency, 'outsider', frequency.revision, command, { choices: { p1: 1, p2: 1 } }), RoomError);
  }
  assert.throws(() => changeRoom(frequency, HOST, frequency.revision, 'double-reveal', { rankings: privateLists(ranking.game) }), RoomError);
  assert.throws(() => changeRoom(ranking, 'outsider', ranking.revision, 'double-reveal', { rankings: privateLists(ranking.game) }), RoomError);
  assert.throws(() => changeRoom(frequency, HOST, 0, 'frequency-reveal', { choices: { p1: 1, p2: 1 } }), RoomError);
  assert.throws(() => changeRoom(ranking, HOST, 0, 'double-reveal', { rankings: privateLists(ranking.game) }), RoomError);
});

test('two clients revealing the same frequency snapshot award once and cannot skip either private choice', () => {
  const room = startedRoom('frequency');
  assert.throws(() => changeRoom(room, HOST, room.revision, 'frequency-reveal', { choices: { p1: 1 } }), CooperativeError);
  assert.throws(() => changeRoom(room, HOST, room.revision, 'frequency-next'), CooperativeError);
  const next = frequencyRound(room, HOST);
  assert.equal(next.game.score, 100);
  assert.equal(next.game.stage, 'reveal');
  assert.equal(next.revision, 2);
  assert.deepEqual(next.lastAction, { kind: 'frequency-reveal', seat: 'p1' });
  assert.throws(() => changeRoom(next, GUEST, room.revision, 'frequency-reveal', { choices: { p1: 1, p2: 1 } }), RoomError);
  assert.throws(() => changeRoom(next, GUEST, next.revision, 'frequency-reveal', { choices: { p1: 1, p2: 1 } }),
    error => error.code === 'ROUND_LOCKED');
  const advanced = changeRoom(next, GUEST, next.revision, 'frequency-next');
  assert.equal(advanced.game.roundIndex, 1);
  assert.equal(advanced.game.score, 100);
  assert.throws(() => changeRoom(advanced, HOST, next.revision, 'frequency-next'), RoomError);
  assert.equal(room.game.score, 0);
  assert.deepEqual(room.game.results, {});
});

test('frequency completes ten cooperative rounds at 1,500 points and cannot award after finishing', () => {
  const room = finishFrequency(startedRoom('frequency'));
  assert.equal(room.status, 'finished');
  assert.equal(room.revision, 20);
  assert.equal(room.game.roundIndex, 9);
  assert.equal(room.game.matches, 10);
  assert.equal(room.game.bestStreak, 10);
  assert.equal(room.game.score, 1500);
  assert.equal(Object.keys(room.game.results).length, 10);
  assert.throws(() => changeRoom(room, HOST, room.revision, 'frequency-next'), RoomError);
  assert.throws(() => changeRoom(room, GUEST, room.revision, 'frequency-reveal', { choices: { p1: 19, p2: 19 } }), RoomError);
});

test('frequency rematches preserve the room and both active players while resetting every score and cycling the starter', () => {
  const finished = finishFrequency(startedRoom('frequency'));
  const saved = structuredClone(finished);
  const next = changeRoom(finished, GUEST, finished.revision, 'rematch', { deck: [...deck].reverse() });
  assert.equal(next.code, finished.code);
  assert.equal(next.ownerUid, HOST);
  assert.equal(next.datasetId, finished.datasetId);
  assert.deepEqual(next.players, finished.players);
  assert.equal(next.round, 2);
  assert.equal(next.starterSeat, 'p2');
  assert.equal(next.revision, 21);
  assert.equal(next.status, 'playing');
  assert.equal(next.game.deck[0], 40);
  assert.equal(next.game.deck.length, 20);
  assert.equal(next.game.score, 0);
  assert.equal(next.game.streak, 0);
  assert.equal(next.game.bestStreak, 0);
  assert.equal(next.game.matches, 0);
  assert.deepEqual(next.game.results, {});
  assert.equal(next.game.activeSeat, undefined);
  assert.equal(rematchStarter(next), 'p1');
  const third = changeRoom(finishFrequency(next), HOST, 40, 'rematch', { deck });
  assert.equal(third.round, 3);
  assert.equal(third.starterSeat, 'p1');
  assert.deepEqual(finished, saved);
});

test('private double-ranking placements do not publish either list or finish the public game early', () => {
  const room = startedRoom('double-ranking');
  let left = createPrivateRank();
  let right = createPrivateRank();
  for (let slot = 1; slot <= 8; slot++) left = placePrivateRank(room.game.deck, left, slot);
  assert.equal(left.count, 8);
  assert.equal(room.status, 'playing');
  assert.equal(room.revision, 1);
  assert.deepEqual(room.game.rankings, {});
  assert.equal(room.game.result, null);
  assert.throws(() => changeRoom(room, HOST, room.revision, 'double-reveal', { rankings: { p1: left.slots, p2: right.slots } }), CooperativeError);
  for (let slot = 8; slot >= 1; slot--) right = placePrivateRank(room.game.deck, right, slot);
  const finished = changeRoom(room, GUEST, room.revision, 'double-reveal', { rankings: { p1: left.slots, p2: right.slots } });
  assert.equal(finished.status, 'finished');
  assert.equal(finished.revision, 2);
  assert.equal(finished.game.result.compatibility, 0);
  assert.equal(finished.game.result.distance, 32);
  assert.equal(finished.game.result.differences.length, 8);
  assert.deepEqual(finished.lastAction, { kind: 'double-reveal', seat: 'p2' });
  assert.throws(() => changeRoom(finished, HOST, room.revision, 'double-reveal', { rankings: finished.game.rankings }), RoomError);
  assert.throws(() => changeRoom(finished, HOST, finished.revision, 'double-reveal', { rankings: finished.game.rankings }), RoomError);
  assert.deepEqual(room.game.rankings, {});
});

test('double-ranking rematch takes eight fresh cards and preserves two active roles with private lists reset', () => {
  const room = startedRoom('double-ranking');
  const rankings = privateLists(room.game);
  const finished = changeRoom(room, HOST, room.revision, 'double-reveal', { rankings });
  const saved = structuredClone(finished);
  const next = changeRoom(finished, GUEST, finished.revision, 'rematch', { deck: [...deck].reverse() });
  assert.equal(next.code, room.code);
  assert.equal(next.mode, 'double-ranking');
  assert.equal(next.round, 2);
  assert.equal(next.starterSeat, 'p2');
  assert.equal(next.status, 'playing');
  assert.equal(next.revision, 3);
  assert.deepEqual(next.players, room.players);
  assert.deepEqual(next.game.deck, [40, 39, 38, 37, 36, 35, 34, 33]);
  assert.deepEqual(next.game.rankings, {});
  assert.equal(next.game.result, null);
  assert.equal(next.game.activeSeat, undefined);
  for (const [uid, slot] of [[HOST, 1], [GUEST, 8]]) {
    assert.ok(seatFor(next, uid));
    assert.equal(placePrivateRank(next.game.deck, createPrivateRank(), slot).slots[`s${slot}`], 40);
  }
  assert.deepEqual(finished, saved);
});
